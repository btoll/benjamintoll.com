+++
title = "On Studying For The CKA Exam"
date = "2024-07-10T12:36:40-04:00"

+++

## Deployment Strategies

kubectl rollout status deployment-name
kubectl rollout history deployment-name
kubectl rollout undo deployment-name

kubectl set image deployment-name container-name=image-name:tag

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: foo
spec:
  containers:
    - name: busybox
      image: busybox:latest
      command: ["sleep"]       - analogous to Docker ENTRYPOINT
      args: ["5"]              - analogous to Docker CMD
      env:
        - name: FOO
          value: foo

        - name: BAR            - extract just `bar` from the configmap named `app-cm` and name it `BAR` in the container
          valueFrom:
            configMapKeyRef:
              name: app-cm
              key: bar

        - name: DB_PASS        - extract just `db-pwd` from the secret named `app-secret` and name it `DB_PASS` in the container
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: db-pwd

        envFrom:
          - configMapRef:
              name: app-cm

        envFrom:
          - secretRef:
              name: app-secret
```

```bash
kubectl create configmap app-cm --from-literal=FOO=foo --from-literal=BAR=bar
kubectl create configmap app-cm --from-file=app-cm.properties
```

```bash
kubectl create secret generic db-secrets --from-literal=db-pwd=12345 --from-literal=db-host=mysql
kubectl create secret generic db-secrets --from-file=app-secret.properties
```

Anyone able to create workloads in the same `namespace` as the secrets can access them.

> Secrets are not encrypted at rest by default in `etcd`.
> [Encrypting Confidential Data at Rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)

# Don't emit newline character.

```bash
$ echo -n poop | base64
cG9vcA==
```

```bash
kubectl explain pods --recursive
kubectl create po --help
```

---

When editing a workload, sometimes you get the message that it cannot be edited.  To get around this:

```bash
$ kubectl replace --force -f /tmp/kubectl-edit-13243423.yaml
```

The error message will print to `stdout` where to find the manifest in `/tmp`.

---

## Backing Up

Get a list of all deployed resources (Deployments, Pods, Service, etc.):

```bash
$ kubectl get all -A -oyaml > all_deployed_resources.yaml
```

> Tools like [Velero] can do this.

### `etcd`

For clusters built with `kubeadm`, its manifest is in `/etc/kubernetes/manifests/etcd.yaml`.  To determine where all of its data is stored, look for the `--data-dir` config.

Or, grep the `ps` information for it:

```bash
$ ps aux | grep [e]tcd | head -1 | awk '{for(i=11;i<=NF;i++)print $i}'
etcd
--advertise-client-urls=https://10.0.0.10:2379
--cert-file=/etc/kubernetes/pki/etcd/server.crt
--client-cert-auth=true
--data-dir=/var/lib/etcd
--experimental-initial-corrupt-check=true
--experimental-watch-progress-notify-interval=5s
--initial-advertise-peer-urls=https://10.0.0.10:2380
--initial-cluster=master-node=https://10.0.0.10:2380
--key-file=/etc/kubernetes/pki/etcd/server.key
--listen-client-urls=https://127.0.0.1:2379,https://10.0.0.10:2379
--listen-metrics-urls=http://127.0.0.1:2381
--listen-peer-urls=https://10.0.0.10:2380
--name=master-node
--peer-cert-file=/etc/kubernetes/pki/etcd/peer.crt
--peer-client-cert-auth=true
--peer-key-file=/etc/kubernetes/pki/etcd/peer.key
--peer-trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt
--snapshot-count=10000
--trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt
```

So, all the data is stored in `/var/lib/etcd`.

Most of the commands below require configs for the certs to prove authenticity.  For example:

```bash
ETCDCTL_API=3 etcdctl --endpoints 10.2.0.9:2379 \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  member list
```

Take a snapshot of the database:

```bash
$ ETCDCTL_API=3 etcdctl snapshot save snapshot.db
```

To view its status:

```bash
$ ETCDCTL_API=3 etcdctl snapshot status snapshot.db
```

To restore it, first stop `kube-apiserver` and then:

```bash
$ ETCDCTL_API=3 etcdctl snapshot restore --data-dir /var/lib/etcd-from-backup
```

It's probably a good idea to change ownership from the `root` user:

```bash
$ sudo chown -R etcd: /var/lib/etcd-from-backup
```

Restoring a snapshot doesn't need any of the certificate parameters because it doesn't need to connect to `etcd`.

If the `etcd` server is running as a `systemd` service:

```bash
$ sudo vi /etc/systemd/system/etcd.service
```

And change the location of the `--data-dir`.

```bash
$ sudo systemctl daemon-reload
$ sudo systemctl restart etcd
```

> Some `etcdctl` commands need the `--endpoints`, `--cacert`, `--cert` and `--key` parameters.

Restart some control plane components:

- `kube-controller-manager`
- `kube-scheduler`
- `kubelet`

Just do a `kubectl -n kube-system delete po` for the first two and `systemctl restart` for the latter.

> If the cluster was created using `kubeadm`, the pods will simply be re-spawned.

For a managed service like `eks`, you may not have access to the `etcd` database, so you'll have to backup using the first method.

Get all members of an `etcd` cluster:

```bash
$ ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
> --cacert=/etc/etcd/pki/ca.pem \
> --cert=/etc/etcd/pki/etcd.pem \
> --key=/etc/etcd/pki/etcd-key.pem \
> member list
67e033570209c41, started, etcd-server, https://192.23.30.21:2380, https://192.23.30.21:2379, false
```

> Port 2379 is the port that the `apiserver` connects to.  All `etcd` peers will use port 2380.

Listing default admission controllers:

```bash
$ kubectl -n kube-system exec kube-apiserver-beta-control-plane -- kube-apiserver -h | grep enable-admission-plugins
```

> This is probably more appropriate for the `CSK` exam.

Get info about the cluster:

```bash
$ kubectl cluster-info
Kubernetes control plane is running at https://127.0.0.1:34199
CoreDNS is running at https://127.0.0.1:34199/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.
```

Query the API server:

```bash
$ curl \
    --cert /home/vagrant/.kube/pem/cert.pem \
    --key /home/vagrant/.kube/pem/key.pem \
    --cacert /home/vagrant/.kube/pem/ca.pem \
    https://127.0.0.1:34199/version
```

The `.pem` files in the `pem` directory were created by a shell script that simply extracted the requisite information from the `kubeconfig` file.

```bash
#!/bin/bash

set -exuo pipefail

PEMDIR="$HOME/.kube/pem"
mkdir -p "$PEMDIR"
KUBECONFIG="$HOME/.kube/config"

# This CANNOT precede the `mkdir` command above!
umask 0377

if [ ! -f "$PEMDIR/ca.pem" ]
then
    ag certificate-auth "$KUBECONFIG" \
        | cut -d" " -f6 \
        | base64 -d \
        > "$PEMDIR/ca.pem"
fi

if [ ! -f "$PEMDIR/key.pem" ]
then
    ag client-key "$KUBECONFIG" \
        | cut -d" " -f6 \
        | base64 -d \
        > "$PEMDIR/key.pem"
fi

if [ ! -f "$PEMDIR/cert.pem" ]
then
    ag client-cert "$KUBECONFIG" \
        | cut -d" " -f6 \
        | base64 -d \
        > "$PEMDIR/cert.pem"
fi

#-XPOST -H "Content-Type: application/json" \
#    -d@curlpod.json

curl --cert "$PEMDIR/cert.pem" \
    --key "$PEMDIR/key.pem" \
    --cacert "$PEMDIR/ca.pem" \
    "$@"

```

## `jsonpath`

```bash
$ kubectl get no -ojsonpath='{.items[*].metadata.name}{"\n"}{.items[*].status.capacity.cpu}{"\n"}'
beta-control-plane beta-worker beta-worker2
4 4 4
```

## Custom Columns

```bash
$ kubectl get no -ocustom-columns=NODE:.metadata.name,CPU:.status.capacity.cpu
NODE                 CPU
beta-control-plane   4
beta-worker          4
beta-worker2         4
```

## Sorting

```bash
$ kubectl get no --sort-by=.metadata.name
NAME                 STATUS   ROLES           AGE     VERSION
beta-control-plane   Ready    control-plane   8m43s   v1.29.2
beta-worker          Ready    <none>          8m20s   v1.29.2
beta-worker2         Ready    <none>          8m24s   v1.29.2
$
$ kubectl get no --sort-by=.status.capacity.cpu
NAME                 STATUS   ROLES           AGE     VERSION
beta-control-plane   Ready    control-plane   8m53s   v1.29.2
beta-worker          Ready    <none>          8m30s   v1.29.2
beta-worker2         Ready    <none>          8m34s   v1.29.2
```

## Docker

Docker stores its data in:

```bash
$ sudo ls /var/lib/docker/
buildkit  containers  engine-id  image  network  overlay2  plugins  runtimes  swarm  tmp  volumes
```

### Mounting

#### Volume Mounting

Create a volume and mount it to a running container:

```bash
$ docker volume create VOLUME_NAME
$ docker run -v VOLUME_NAME:/var/lib/mysql mysql
```

> Technically, the first command isn't needed.  If omitted, Docker will automatically create the container and mount it to the container (volume mounting).

#### Bind Mounting

```bash
$ docker run -v /data/mysql:/var/lib/mysql mysql
```

#### `--mount`

This is the newer and preferred way to mount:

```bash
$ docker run --mount type=bind,source=/data/mysql,target=/var/lib/mysql mysql
```

The storage driver is responsible for all the above operations.  Here are some of them:

- `aufs`
- `btrfs`
- `zfs`
- `device mapper`
- `overlay`
- `overlay2`

The selection of the storage driver depends on the host operating system.

## Volume Drivers

```bash
$ docker run -it \
--name mysql \
--volume-drive \
--mount src=ebs-vol,target=/var/lib/mysql \
mysql
```

## Secrets

- A secret is only sent to a node if a pod on that node requires it.
- Kubelet stores the secret into a tmpfs so that the secret is not written to disk storage.
- Once the Pod that depends on the secret is deleted, kubelet will delete its local copy of the secret data as well.

## Scheduling

If a scheduler isn't present in the control plane, use `nodeName` to manually schedule a pod to a node.

### Taints

Add:

```bash
$ kubectl taint nodes node1 key1=value1:NoSchedule
```

Remove:

```bash
$ kubectl taint nodes node1 key1=value1:NoSchedule-
$ kubectl taint no controlplane node-role.kubernetes.io/control-plane:NoSchedule-
```

### Labels

Add a label to a node:

```bash
$ kubectl label no node01 color=blue
```

## Creating Pods With Commands and Args

```bash
$ kubectl run nginx --image=nginx --command -- <cmd> <arg1> ... <argN>
$ kubectl run nginx --image=nginx -- <arg1> <arg2> ... <argN>
```

## Static Pods

Two ways to configure the location of the directory in which the `kubelet` will monitor for pod manifest files:

1. Pass `--pod-manifest-path` to `kubelet`.
1. Pass path to another config file `--config` which would specify the directory.
    ```yaml
    --config=kubeconfig.yaml
    ```
    `kubeconfig.yaml`
    ```yaml
    staticPodPath: /etc/kubernetes/manifests
    ```
    > Clusters created by `kubeadm` do this.

    ```bash
    $ kubectl get po
    NAME                          READY   STATUS    RESTARTS   AGE
    static-busybox-controlplane   1/1     Running   0          15m
    static-greenbox-node01        1/1     Running   0          5m57s
    $ ssh node01
    $ ps aux | grep [k]ubelet | awk '{for(i=11;i<=NF;i++)print $i}'
    /usr/bin/kubelet
    --bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf
    --kubeconfig=/etc/kubernetes/kubelet.conf
    --config=/var/lib/kubelet/config.yaml
    --container-runtime-endpoint=unix:///var/run/containerd/containerd.sock
    --pod-infra-container-image=registry.k8s.io/pause:3.9
    $ grep staticPodPath /var/lib/kubelet/config.yaml
    staticPodPath: /etc/just-to-mess-with-you
    ```

The `kubelet` doesn't need any control plane components to create a pod, so if the control plane goes down a node could still create its own pods.

Only works for pods, not other workloads that would depend upon a controller in the control plane (i.e., deployments or replicasets).

You can also view the containers if the control plane is down (in that case, of course, `kubectl` is useless).

- `docker ps`
- `crictl ps` (`cri-o`)
- `nerdctl ps` (`containerd`)

The static pods are mirrored to the `apiserver` if it exists as read-only objects.  Thus, you cannot edit or delete the pods via `kubectl` or `https` API calls, only via the manifests in `/etc/kubernetes/manifests`.

Also, you can use the `kubelet` to deploy the control plane components on any node:

- simply use the various control plane images in the respective pod definitions in `/etc/kubernetes/manifests`
- again, this is how `kubeadm` sets up a cluster

Lastly, the name of the pod is automatically appended with the node name, hence you can always distinguish between static pods and those created via the `apiserver`.

> Both static pods and pods created by a `daemonset` are ignored by the `kube-scheduler`.  The `kube-scheduler` has no effect on these pods.

> You cannot use `configmaps` or `secrets` or any API objects like `serviceaccounts` with static pods.

## Misc Commands

The easiest way to create a daemon set is to create a deployment and then simply change its `Kind` to `DaemonSet`:

```bash
$ kubectl create deployment elasticsearch --image=registry.k8s.io/fluentd-elasticsearch:1.20 -n kube-system --dry-run=client -o yaml > fluentd.yaml
```

Remove `replicas` and other cruft (`strategy`, `status`, etc.).


Create a new pod and expose it using a service in one command:

```bash
$ kubectl run httpd --image=httpd:alpine --port=80 --expose
```

Get information about the `kube-apiserver` certificate, such as:

- the `CN` (Common Name)
- expiry
- alternative names
- issuer

```bash
$ openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout
```

Show all bridge interfaces:

```bash
$ ip link show bridge
```

## Certificate Signing Request

```
cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: myuser
spec:
  request: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURSBSRVFVRVNULS0tLS0KTUlJQ1ZqQ0NBVDRDQVFBd0VURVBNQTBHQTFVRUF3d0dZVzVuWld4aE1JSUJJakFOQmdrcWhraUc5dzBCQVFFRgpBQU9DQVE4QU1JSUJDZ0tDQVFFQTByczhJTHRHdTYxakx2dHhWTTJSVlRWMDNHWlJTWWw0dWluVWo4RElaWjBOCnR2MUZtRVFSd3VoaUZsOFEzcWl0Qm0wMUFSMkNJVXBGd2ZzSjZ4MXF3ckJzVkhZbGlBNVhwRVpZM3ExcGswSDQKM3Z3aGJlK1o2MVNrVHF5SVBYUUwrTWM5T1Nsbm0xb0R2N0NtSkZNMUlMRVI3QTVGZnZKOEdFRjJ6dHBoaUlFMwpub1dtdHNZb3JuT2wzc2lHQ2ZGZzR4Zmd4eW8ybmlneFNVekl1bXNnVm9PM2ttT0x1RVF6cXpkakJ3TFJXbWlECklmMXBMWnoyalVnald4UkhCM1gyWnVVV1d1T09PZnpXM01LaE8ybHEvZi9DdS8wYk83c0x0MCt3U2ZMSU91TFcKcW90blZtRmxMMytqTy82WDNDKzBERHk5aUtwbXJjVDBnWGZLemE1dHJRSURBUUFCb0FBd0RRWUpLb1pJaHZjTgpBUUVMQlFBRGdnRUJBR05WdmVIOGR4ZzNvK21VeVRkbmFjVmQ1N24zSkExdnZEU1JWREkyQTZ1eXN3ZFp1L1BVCkkwZXpZWFV0RVNnSk1IRmQycVVNMjNuNVJsSXJ3R0xuUXFISUh5VStWWHhsdnZsRnpNOVpEWllSTmU3QlJvYXgKQVlEdUI5STZXT3FYbkFvczFqRmxNUG5NbFpqdU5kSGxpT1BjTU1oNndLaTZzZFhpVStHYTJ2RUVLY01jSVUyRgpvU2djUWdMYTk0aEpacGk3ZnNMdm1OQUxoT045UHdNMGM1dVJVejV4T0dGMUtCbWRSeEgvbUNOS2JKYjFRQm1HCkkwYitEUEdaTktXTU0xMzhIQXdoV0tkNjVoVHdYOWl4V3ZHMkh4TG1WQzg0L1BHT0tWQW9FNkpsYWFHdTlQVmkKdjlOSjVaZlZrcXdCd0hKbzZXdk9xVlA3SVFjZmg3d0drWm89Ci0tLS0tRU5EIENFUlRJRklDQVRFIFJFUVVFU1QtLS0tLQo=
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400  # one day
  usages:
  - client auth
EOF
```

To `base64` encode the CSR without any newlines:

```bash
cat myuser.csr | base64 -w0
```

Approve it:

```bash
$ kubectl certificate approve myuser
certificatesigningrequest.certificates.k8s.io/myuser approved
```

Which account has the role `kube-proxy`?

```bash
$ kubectl  -n kube-system describe rolebindings.rbac.authorization.k8s.io kube-proxy
Name:         kube-proxy
Labels:       <none>
Annotations:  <none>
Role:
  Kind:  Role
  Name:  kube-proxy
Subjects:
  Kind   Name                                             Namespace
  ----   ----                                             ---------
  Group  system:bootstrappers:kubeadm:default-node-token
```

Does the user `dev-user` have permissions to list pods?

```bash
$ kubectl get pod --as dev-user
Error from server (Forbidden): pods is forbidden: User "dev-user" cannot list resource "pods" in API group "" in the namespace "default"
```

## Create Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: developer
rules:
- apiGroups: [""] # "" indicates the core API group
  resources: ["pods"]
  verbs: ["create", "delete", "list"]
```

Add another rule to allow for the user to create deployments:

```yaml
- apiGroups:
  - apps
  resources:
  - deployments
  verbs:
  - create
```

> Note the different syntax.  This is just to demonstrate that either can be used.

## Create Role Binding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-user-binding
  namespace: default
subjects:
- kind: User
  name: dev-user
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

## Create Cluster Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  # "namespace" omitted since ClusterRoles are not namespaced
  name: nodes
rules:
- apiGroups:
  - "*"
  resources:
  - nodes
  verbs:
  - "*"
```

## Create Cluster Role Binding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
# This cluster role binding allows anyone in the "manager" group to read secrets in any namespace.
kind: ClusterRoleBinding
metadata:
  name: nodes
subjects:
- kind: User
  name: michelle
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: nodes
  apiGroup: rbac.authorization.k8s.io
```

```bash
$ kubectl auth can-i list nodes --as michelle
Warning: resource 'nodes' is not namespace scoped

yes
```

## Create a Token for a Service Account

```bash
$ kubectl create token dashboard-sa
eyJhbGciOiJSUzI1NiIsImtpZCI6InctdURBSkRDU0xBT1FDUjlMMXVPd2prZjFTX0dYNDd3Q0YwUzA2TkdnSDAifQ.eyJhdWQiOlsiaHR0cHM6Ly9rdWJlcm5ldGVzLmRlZmF1bHQuc3ZjLmNsdXN0ZXIubG9jYWwiLCJrM3MiXSwiZXhwIjoxNzIwMzk2Mzk4LCJpYXQiOjE3MjAzOTI3OTgsImlzcyI6Imh0dHBzOi8va3ViZXJuZXRlcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsIiwianRpIjoiMTZhZjMzYzUtNGRlNS00ODMzLWEyNzMtNzM0NDc0MDNkOTQyIiwia3ViZXJuZXRlcy5pbyI6eyJuYW1lc3BhY2UiOiJkZWZhdWx0Iiwic2VydmljZWFjY291bnQiOnsibmFtZSI6ImRhc2hib2FyZC1zYSIsInVpZCI6ImY0YTJhZGJiLWU3NjctNGM5OS04NWYyLTEwYzNlNzg0ZTlhZCJ9fSwibmJmIjoxNzIwMzkyNzk4LCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6ZGVmYXVsdDpkYXNoYm9hcmQtc2EifQ.fs1-ADnG4X6nDQ6aJ8x6UrY-U7qUitLPUJP_AqByrAE1cZy7XaZOpw0O8y1K9GHbSqufZEJHymF9NZoyUlSY8_UTpnMYCSfXWbTtur3tDAO2fY4TyewXlhuYiDch4QPlk-otNPNa-Kh0WXyL7RvL21zx4CwmmwiiWmYBGy2x19J5JXFwy1hHOKZ8HkHcm9FY6Uy-zJgPDn1LncuVQ1TGLGOoJxtmuGohSlQ1ia2hWmavZnxA9qZ9ZEOuzvHXDmBNSKtc-7m1cFK5Kf2JERxe-vaFa3_6LZWHPtVJtJzC_BHncyzj_i_GCRe_685ofidI7aBuA1Zc4UtYmb-SNOZZgw
```

Bind the service account to a deployment in the pod `spec` (`deployment.spec.template.spec`):

```yaml
serviceAccountName: foo-service-account
```

## Pull Images From A Private Registry

To pull key/values from a secret in a pod spec, add the following to `pod.spec`:

```yaml
imagePullSecrets:
  - name: private-reg-cred
```

Of course, there must be a secret named `private-reg-cred`.

This secret is a `docker-registry` secret:

```bash
$ kubectl create secret docker-registry private-reg-cred --docker-username=dock_user --docker-password=dock_password --docker-server=myprivateregistry.com:5000 --docker-email=dock_user@myprivateregistry.com
```

## Run Pods With A Security Context

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-pod
spec:
  securityContext:
    runAsUser: 1001
  containers:
  -  image: ubuntu
     name: web
     command: ["sleep", "5000"]
     securityContext:
      capabilities:
        add:
        - NET_ADMIN
        - SYS_TIME
      runAsUser: 1002

  -  image: ubuntu
     name: sidecar
     command: ["sleep", "5000"]
```

## Network Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"networking.k8s.io/v1","kind":"NetworkPolicy","metadata":{"annotations":{},"name":"payroll-policy","namespace":"default"},"spec":{"ingress":[{"from":[{"podSelector":{"matchLabels":{"name":"internal"}}}],"ports":[{"port":8080,"protocol":"TCP"}]}],"podSelector":{"matchLabels":{"name":"payroll"}},"policyTypes":["Ingress"]}}
  creationTimestamp: "2024-07-08T00:49:12Z"
  generation: 1
  name: payroll-policy
  namespace: default
  resourceVersion: "4653"
  uid: a9490f42-b161-44b4-a7a6-5ea3321e524d
spec:
  ingress:
  - from:
    - podSelector:
        matchLabels:
          name: internal
    ports:
    - port: 8080
      protocol: TCP
  podSelector:
    matchLabels:
      name: payroll
  policyTypes:
  - Ingress
```

## What CNI is used by the cluster?

- Try dumping namespaces (`kubectl get ns`).
- Look in `ls /etc/cni/net.d/`.

