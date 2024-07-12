+++
title = "On Service Accounts"
date = "2024-04-14T13:51:44-04:00"
draft = true

+++

This is going to be a quick article about service accounts, JSON Web Tokens (JWT) and IAM Roles for Service Accounts (IRSA).  It is based on the Kubernetes [service accounts] documentation page.  Go and read it now.

---

- [Use Cases](#use-cases)
- [Example](#example)
- [Security](#security)
- [References](#references)

---

So, what are service accounts?  I'm going to refer to [the official Kubernetes documentation], because it's a very good explanation (and much better than I could do):

> A service account is a type of non-human account that, in Kubernetes, provides a distinct identity in a Kubernetes cluster. Application Pods, system components, and entities inside and outside the cluster can use a specific ServiceAccount's credentials to identify as that ServiceAccount. This identity is useful in various situations, including authenticating to the API server or implementing identity-based security policies.
>
> [What are service accounts?](https://kubernetes.io/docs/concepts/security/service-accounts/#what-are-service-accounts)

Service accounts are bound to a namespace, and every namespace gets a `default` service account.  They only have [the default API discovery permissions].

> Service accounts exist as objects in the `api-server`.  Kubernetes has no native mechanism for user accounts.  Some Kubernetes distributions may add user accounts, but they're custom and not part of the actual API.
>
> Also, if you delete the `default` service account, the control plane will simply recreate it.  Nice try, hot shot.

When a pod is created, the `kubelet` will mount a [projected volume], part of which is the default service account JWT (unless you define another, of course).

A projected comprises several volume sources into one location (i.e., the same directory).  It currently supports five sources:

- `secret`
- [`downwardAPI`]
- `configMap`
- `serviceaccounttoken`
    + a `serviceAccountToken` source, that contains a token that the `kubelet` acquires from `kube-apiserver`
    + the `kubelet` fetches time-bound tokens using the `TokenRequest` API
- `clusterTrustBundle`

All sources must be in the same namespace as the pod.

It will mount it in the `/var/run/secrets/kubernetes.io/serviceaccount` directory in the `token` file.  You can easily get the contents like this:

```bash
$ kubectl exec debug-55c9f8c4db-g6t9l -- cat /var/run/secrets/kubernetes.io/serviceaccount/token
```

Of course, the pod name doesn't matter, as every pod will have this JWT available to it by default.  You can add fields to your pod spec that will tell it not to mount this (or a field in the service account itself), so do be aware of that.

Here is what the decoded JWT reveals.  I decoded this at [the official JWT site].

```json
{
  "aud": [
    "https://kubernetes.default.svc.cluster.local"
  ],
  "exp": 1744655738,
  "iat": 1713119738,
  "iss": "https://kubernetes.default.svc.cluster.local",
  "kubernetes.io": {
    "namespace": "default",
    "pod": {
      "name": "debug-55c9f8c4db-g6t9l",
      "uid": "76897854-57de-4752-ab70-8e8576f01dd4"
    },
    "serviceaccount": {
      "name": "default",
      "uid": "65f30d3e-1a66-4138-be73-1b4a202fee85"
    },
    "warnafter": 1713123345
  },
  "nbf": 1713119738,
  "sub": "system:serviceaccount:default:default"
}
```

What else is in that directory?

```bash
$ kubectl exec debug-55c9f8c4db-g6t9l -- ls /var/run/secrets/kubernetes.io/serviceaccount/
ca.crt
namespace
token
```

Let's list the value in the `namespace` file:

```bash
$ kubectl exec debug-55c9f8c4db-g6t9l -- cat /var/run/secrets/kubernetes.io/serviceaccount/namespace
default
```

Request a token to authenticate to the `kube-apiserver` as the service account `default` in the current namespace:

```bash
$ kubectl create token default
eyJhbGciOiJSUzI1NiIsImtpZCI6IlZxYU5Xd0tCZWxFUFZ2NHNOaDVnamdiMVE1VkF3d0hKaE9raVVCZDRhbmcifQ.eyJhdWQiOlsiaHR0cHM6Ly9rdWJlcm5ldGVzLmRlZmF1bHQuc3ZjLmNsdXN0ZXIubG9jYWwiXSwiZXhwIjoxNzEzMTM4OTI3LCJpYXQiOjE3MTMxMzUzMjcsImlzcyI6Imh0dHBzOi8va3ViZXJuZXRlcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsIiwia3ViZXJuZXRlcy5pbyI6eyJuYW1lc3BhY2UiOiJkZWZhdWx0Iiwic2VydmljZWFjY291bnQiOnsibmFtZSI6ImRlZmF1bHQiLCJ1aWQiOiI0YTc1NDU0YS01YWU1LTQwZDQtOGYxYS05ZjA4ZDBiZWNkZjIifX0sIm5iZiI6MTcxMzEzNTMyNywic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmRlZmF1bHQ6ZGVmYXVsdCJ9.i6iWh5FU4m0t_m1V4sMcs0WVx5K268FoFq6imqgi5VNgqziKodKvLe0WMZJhmikE7zhP3k8LuFkt6Na29qwu13TVeFJiaKbwogeJjgnfgdMXucqsbLHo1qoH8sz1vGvYV1qrUhgCVT2ViGpFOzDMdQItO_QLR5Z8utudY0ah9ItD0KxEuFwLdL3_C6xchev1ueUYwGSBMo1barP9-aIoyI6dvOCXKHsiopgpPc-HOfXGUZmipGx1xS_igJutH1xeTJ2VuerdVO5jheLYB-g8kpsBzKXOaeRCuGwFUKk9a5A3txBqvZl-3dY9ctgi26huUXAbaOjuXvbJnalEG7rsfA
```

See the [`kubectl create token`] page for more information.

> There is also a project called [`jwt-cli`] that is a useful command line tool to manage JWTs.  Here's how easy it is to use:
>
> ```bash
> $ kubectl create token default | jwt decode -
>
> Token header
> ------------
> {
>   "alg": "RS256",
>   "kid": "VqaNWwKBelEPVv4sNh5gjgb1Q5VAwwHJhOkiUBd4ang"
> }
>
> Token claims
> ------------
> {
>   "aud": [
>     "https://kubernetes.default.svc.cluster.local"
>   ],
>   "exp": 1713140075,
>   "iat": 1713136475,
>   "iss": "https://kubernetes.default.svc.cluster.local",
>   "kubernetes.io": {
>     "namespace": "default",
>     "serviceaccount": {
>       "name": "default",
>       "uid": "4a75454a-5ae5-40d4-8f1a-9f08d0becdf2"
>     }
>   },
>   "nbf": 1713136475,
>   "sub": "system:serviceaccount:default:default"
> }
> ```
>
> Here we can see that the token was issued at `Sun Apr 14 23:14:35 2024 UTC` and will expire at `Mon Apr 15 00:14:35 2024 UTC`.

For the service account token volume projection to be enabled, it must have been configured to do so when the `kube-apiserver` was launched.  The key fields are the following:

- `--service-account-issuer`
- `--service-account-key-file`
- `--service-account-signing-key-file`

You can see that the `kind` cluster that I created locally has indeed configured the `kube-apiserver` with these fields:

```bash
$ ps aux | ag [a]piserver | awk '{for(i=11;i<=NF;i++)print $i}'
kube-apiserver
--advertise-address=172.18.0.3
--allow-privileged=true
--authorization-mode=Node,RBAC
--client-ca-file=/etc/kubernetes/pki/ca.crt
--enable-admission-plugins=NodeRestriction
--enable-bootstrap-token-auth=true
--etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
--etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt
--etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
--etcd-servers=https://127.0.0.1:2379
--kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt
--kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key
--kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
--proxy-client-cert-file=/etc/kubernetes/pki/front-proxy-client.crt
--proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client.key
--requestheader-allowed-names=front-proxy-client
--requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt
--requestheader-extra-headers-prefix=X-Remote-Extra-
--requestheader-group-headers=X-Remote-Group
--requestheader-username-headers=X-Remote-User
--runtime-config=
--secure-port=6443
--service-account-issuer=https://kubernetes.default.svc.cluster.local
--service-account-key-file=/etc/kubernetes/pki/sa.pub
--service-account-signing-key-file=/etc/kubernetes/pki/sa.key
--service-cluster-ip-range=10.96.0.0/16
--tls-cert-file=/etc/kubernetes/pki/apiserver.crt
--tls-private-key-file=/etc/kubernetes/pki/apiserver.key
```

## Use Cases

- exposing a service to a CI/CD process
- pod(s) need to communicate with a cloud provider
- pod(s) need to communicate with a service in another namespace
- authenticating to a private image registry

## Example

Let's create a service account and then refer to that in a pod spec definition.

First, the service account:

```bash
$ kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: talk-to-strangers
EOF
serviceaccount/talk-to-strangers created
$
$ kubectl get sa talk-to-strangers -oyaml
apiVersion: v1
kind: ServiceAccount
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"v1","kind":"ServiceAccount","metadata":{"annotations":{},"name":"talk-to-strangers","namespace":"default"}}
  creationTimestamp: "2024-04-14T23:24:29Z"
  name: talk-to-strangers
  namespace: default
  resourceVersion: "24431"
  uid: e8a3cda1-8ae2-48a9-ada1-dbe4e49dd26e
```

This will allow us to talk to strangers.

Next, the pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug
  labels:
    app: debug
spec:
  serviceAccountName: talk-to-strangers
  containers:
  - image: btoll/debug:latest
    name: debug
    resources:
      limits:
        cpu: 500m
        memory: 100Mi
      requests:
        cpu: 300m
        memory: 50Mi
    stdin: true
    tty: true
```

After it's deployed, we can look at all of the additional information that the `kube-apiserver` added to the object.  For instance, here's the projected volume that the `kubelet` created and added to the pod spec:

```
volumes:
  - name: kube-api-access-pg69j
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          items:
          - key: ca.crt
            path: ca.crt
          name: kube-root-ca.crt
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace
```

And, here's the the volume mount it added to the container spec:

```yaml
volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: kube-api-access-pg69j
      readOnly: true
```

> Of course, this information is available by `get`ting the pod with the `yaml` output specified.

How can we verify that, i.e., that it is assuming the permissions of the `talk-to-strangers` service account when authenticating with the `kube-apiserver`?  Like a boss:

```bash
$ kubectl exec debug -- cat /var/run/secrets/kubernetes.io/serviceaccount/token | jwt decode -

Token header
------------
{
  "alg": "RS256",
  "kid": "VqaNWwKBelEPVv4sNh5gjgb1Q5VAwwHJhOkiUBd4ang"
}

Token claims
------------
{
  "aud": [
    "https://kubernetes.default.svc.cluster.local"
  ],
  "exp": 1744673367,
  "iat": 1713137367,
  "iss": "https://kubernetes.default.svc.cluster.local",
  "kubernetes.io": {
    "namespace": "default",
    "pod": {
      "name": "debug",
      "uid": "0027144d-4305-416e-be65-c7595d4f3787"
    },
    "serviceaccount": {
      "name": "talk-to-strangers",
      "uid": "e8a3cda1-8ae2-48a9-ada1-dbe4e49dd26e"
    },
    "warnafter": 1713140974
  },
  "nbf": 1713137367,
  "sub": "system:serviceaccount:default:talk-to-strangers"
}
```

## Security

Let's add a layer of security to the equation.  After deleting both the service account and the pod, we'll re-deploy the service account again with an important addition:

```bash
$ kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  annotations:
    kubernetes.io/enforce-mountable-secrets: "true"
  name: talk-to-strangers
EOF
serviceaccount/talk-to-strangers created
```

The `kubernetes.io/enforce-mountable-secrets: "true"` annotation will ensure that the service account's secrets can only be mounted on specified types of resources.

What are these mounting restrictions?  [From the docs](https://kubernetes.io/docs/concepts/security/service-accounts/#enforce-mountable-secrets):

- The name of each Secret that is mounted as a volume in a Pod must appear in the secrets field of the Pod's ServiceAccount.
- The name of each Secret referenced using envFrom in a Pod must also appear in the secrets field of the Pod's ServiceAccount.
- The name of each Secret referenced using imagePullSecrets in a Pod must also appear in the secrets field of the Pod's ServiceAccount.

---

Further, the service account can opt-out of automounting its API credentials into any pod that references it.

```oyaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: talk-to-strangers
automountServiceAccountToken: false
```

Now, it will not automount the API credentials in the pod.  Go ahead, try it for yourself if you don't want to take my word for it.  I'll be here when you get back.

---

Pods can also elect to not automount API credentials by adding the `pods.spec.automountServiceAccountToken: false` field and value.

For example, if the pod spec includes the following fields:

```yaml
spec:
  serviceAccountName: talk-to-strangers
  automountServiceAccountToken: false
```

Then, no volume is attached and mounted to the container, not even the `default` service account token.

Interestingly, the pod's value will win out.  For example, if the service account has chosen not to automount but the pod has opted-in to automount, the pod will take precedence (also for the reverse situation).

To create an IAM Open ID Connect provier for the cluster, specify its name and region:

```bash
$ eksctl utils associate-iam-oidc-provider --cluster kilgore-trout-was-here --region eu-west-1 --approve
```

Easy peasy.  This will create a provider name in your region, something along the lines of `oidc.eks.eu-west-1.amazonaws.com/id/E25888AD6D7E1F651E88605079DE0C66`.

We're golden, as the kids say, and we can create JWT as long as the sun shines, even longer.

The advantage of creating an OIDC provider is that this becomes the trust relationship, and so a pod can assume the identity of a service account which has been annotated to get a token from this provider.  The provider will manage the expiry and rotation of the tokens, create a Persistent Volume and a Persistent Volume Claim, all so we don't have to.  That's kind of nice.

Verify:

```bash
$ aws iam get-role --role-name AmazonEKS_EBS_CSI_DriverRole
```

## References

- [service accounts]
- [JSON Web Token](https://en.wikipedia.org/wiki/JSON_Web_Token)
- [ServiceAccount token volume projection](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#serviceaccount-token-volume-projection)
- [Add ImagePullSecrets to a service account](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#add-imagepullsecrets-to-a-service-account)

[service accounts]: https://kubernetes.io/docs/concepts/security/service-accounts/
[the official Kubernetes documentation]: https://kubernetes.io/docs/home/
[the official JWT site]: https://jwt.io/
[the default API discovery permissions]: https://kubernetes.io/docs/reference/access-authn-authz/rbac/#default-roles-and-role-bindings
[projected volume]: https://kubernetes.io/docs/concepts/storage/projected-volumes/
[`downwardAPI`]: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
[`kubectl create token`]: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
[`jwt-cli`]: https://github.com/mike-engel/jwt-cli

