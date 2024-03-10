+++
title = "On Kubernetes Certificates"
date = "2024-03-08T04:41:53Z"
draft = true

+++

- [Introduction](#introduction)
- [TLS Certificates](#tls-certificates)
- [Creating A User](#creating-a-user)
- [Conclusion](#conclusion)
- [References](#references)

---

## Introduction

When a Kubernetes cluster is created, the [PKI] (public key infrastructure) is automatically created, with the control plane node creating the certificate authority which self-signs the root certificate, storing it in `/etc/kubernetes/pki/ca.crt` (and the private key in `/etc/kubernetes/pki/ca.key`).  When any worker node is [joined] to the cluster, the control plane will place the self-signed cert on the node in the same directory (`/etc/kubernetes/pki`).  This cert is used by both the [`kubelet`] and the [`kube-proxy`] to authenticate when making any requests to the [`apiserver`].

To authenticate to the server as a client, copy the `kubeconfig` file from the control plane node to a machine outside of the cluster.  In my setup, that is the host on my laptop (I'm using [`kubeadm`], and the cluster is running in several VirtualBox virtual machines).  So, I'll copy `/etc/kubernetes/admin.conf` on the control plane to `$HOME/.kube/config` in my home directory, and this then allows me to use the `kubectl` client access to the cluster (authenticating as the `kubernetes-admin` user, which is fine for testing but probably not what you want).

How does this work?

Well, the `kubeconfig` file, read by `kubectl` before each request, contains the location of the `apiserver` and the following very important bits:

- cluster certificate (signed by the cluster certificate authority and presented by the `apiserver` when the client makes requests to establish trust)
- client certificate (used to authenticate to the `apiserver`)
- client private key

Also, to find the `apiserver` endpoint:

```bash
$ kubectl cluster-info
Kubernetes control plane is running at https://10.0.0.10:6443
CoreDNS is running at https://10.0.0.10:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.
```

Let's take a look the certificates that were created by the PKI when the cluster was created.  I've ssh'd into the control plane and cd'd to `/etc/kubernetes/pki`.  Let's list the contents:

```bash
$ ls -1 /etc/kubernetes/pki
apiserver-etcd-client.crt
apiserver-etcd-client.key
apiserver-kubelet-client.crt
apiserver-kubelet-client.key
apiserver.crt                   - the public certificate for the HTTPS endpoint
apiserver.key
ca.crt                          - the self-signed cert for the Certificate Authority (the trusted entity that issues the certificates)
ca.key                          - the CA's private key
etcd
front-proxy-ca.crt
front-proxy-ca.key
front-proxy-client.crt
front-proxy-client.key
sa.key                          - the Service Account token is seeded from sa.key and sa.pub
sa.pub
```

Let's taking a look at the CA cert:

```bash
$ openssl x509 -in ca.crt -text
Certificate:                                                                                                                                                        [32/174]
    Data:
        Version: 3 (0x2)
        Serial Number: 0 (0x0)
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: CN = kubernetes
        Validity
            Not Before: Apr 21 22:11:01 2021 GMT
            Not After : Apr 19 22:11:01 2031 GMT
        Subject: CN = kubernetes
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                RSA Public-Key: (2048 bit)
                Modulus:
                    00:cd:1a:63:5e:49:27:d6:ce:66:dd:a4:2c:0b:ba:
                    82:05:37:55:74:88:89:ca:70:be:83:cc:f6:f6:11:
                    04:43:6e:52:f9:2b:0f:6c:b6:19:2b:d0:a6:15:86:
                    2d:87:11:1c:40:8e:86:ee:04:7f:30:a2:20:06:cb:
                    97:75:7a:a4:a7:13:5a:d1:2a:21:81:dd:2b:33:b2:
                    67:fe:0c:06:22:e7:c4:7e:c7:98:0b:1d:92:2a:72:
                    03:95:8a:9d:1b:f8:e3:97:d1:21:c5:ea:48:b4:f3:
                    24:b0:c5:4f:25:81:8f:7a:1f:ed:64:4d:12:6c:24:
                    fd:de:24:7c:a6:65:5e:a9:bd:24:42:5a:25:ca:d8:
                    34:58:1b:9c:e0:3e:3f:bc:15:59:5c:cd:8c:2c:a5:
                    2a:cc:55:09:2c:61:07:f8:a4:a4:8c:a1:ad:ba:c5:
                    67:d7:35:76:3b:b3:83:d9:d1:9f:96:6f:9f:e4:58:
                    03:63:60:5b:68:8d:a8:36:dc:f9:02:9b:e6:a3:a6:
                    5d:d9:71:d8:bd:e4:3b:5f:b1:4c:89:8c:d1:1e:67:
                    88:7b:54:9a:e5:a1:03:b9:ca:b2:55:bd:14:0d:18:
                    da:b9:dc:46:de:35:db:42:74:9d:f8:2d:85:57:84:
                    81:98:cc:75:8a:cf:d2:85:75:b5:5c:32:c8:67:7c:
                    17:51
                Exponent: 65537 (0x10001)
        X509v3 extensions:
            X509v3 Key Usage: critical
                Digital Signature, Key Encipherment, Certificate Sign
            X509v3 Basic Constraints: critical
                CA:TRUE
            X509v3 Subject Key Identifier:
                6E:70:84:02:EB:10:3D:2E:95:C6:FF:EA:7A:CF:B0:F6:00:A6:AF:85
	Signature Algorithm: sha256WithRSAEncryption
```

The following information indicate that this is a self-signed cert:

- `Issuer: CN = kubernetes`
- `Subject: CN = kubernetes`
- The `Certificate Sign` and `CA:TRUE` in the extensions block:

        X509v3 extensions:
            X509v3 Key Usage: critical
                Digital Signature, Key Encipherment, Certificate Sign
            X509v3 Basic Constraints: critical
                CA:TRUE

> To view any of the config files in `/etc/kubernetes`, issue the following command targeting the interested file:
>
> ```bash
> $ sudo kubectl config view --kubeconfig /etc/kubernetes/scheduler.conf
> ```

Interestingly, the `kubeconfig` for the `kube-proxy` Pod has its config as data in a ConfigMap that is inside the `kube-system` namespace.  You can view it like this:

```bash
$ kubectl -n kube-system get cm kube-proxy -oyaml
```

This will be exposed as a volume mount inside the `kube-proxy` Pod on a worker node and available for the Pod to read `kubeconfig.conf` whenever it needs to make a request to the `apiserver`.

```bash
$ kubectl -n kube-system get po kube-proxy-529m6 -ojsonpath='{.spec.volumes}' | jq '.[] | select(.name == "kube-proxy")'
{
  "configMap": {
    "defaultMode": 420,
    "name": "kube-proxy"
  },
  "name": "kube-proxy"
}
```

## TLS Certificates

I used [`kubeadm`] to set up the Kubernetes cluster, so this will have done things a particular way.  For example, the core services are deployed as Pods, not as native `systemd` services.  Also, the certificates were generated by `kubeadm`, not by hand, and they will be saved in different locations on the nodes.

So, where are the certificates located?

To start, let's look in the `kube-apiserver` Pod manifest in the `/etc/kubernetes/manifests` directory.  I'll just print the binary command defined in the Pod spec:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --advertise-address=10.0.0.10
    - --allow-privileged=true
    - --authorization-mode=Node,RBAC
    - --client-ca-file=/etc/kubernetes/pki/ca.crt
    - --enable-admission-plugins=NodeRestriction
    - --enable-bootstrap-token-auth=true
    - --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
    - --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt
    - --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
    - --etcd-servers=https://127.0.0.1:2379
    - --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt
    - --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key
    - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
    - --proxy-client-cert-file=/etc/kubernetes/pki/front-proxy-client.crt
    - --proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client.key
    - --requestheader-allowed-names=front-proxy-client
    - --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt
    - --requestheader-extra-headers-prefix=X-Remote-Extra-
    - --requestheader-group-headers=X-Remote-Group
    - --requestheader-username-headers=X-Remote-User
    - --secure-port=6443
    - --service-account-issuer=https://kubernetes.default.svc.cluster.local
    - --service-account-key-file=/etc/kubernetes/pki/sa.pub
    - --service-account-signing-key-file=/etc/kubernetes/pki/sa.key
    - --service-cluster-ip-range=172.17.1.0/18
    - --tls-cert-file=/etc/kubernetes/pki/apiserver.crt
    - --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
```

|**Certificate** |**Location**
|:---|:---
|`--client-ca-file` |`/etc/kubernetes/pki/ca.crt`
|`--etcd-cafile` |`/etc/kubernetes/pki/etcd/ca.crt`
|`--etcd-certfile` |`/etc/kubernetes/pki/apiserver-etcd-client.crt`
|`--etcd-keyfile` |`/etc/kubernetes/pki/apiserver-etcd-client.key`
|`--kubelet-client-certificate` |`/etc/kubernetes/pki/apiserver-kubelet-client.crt`
|`--kubelet-client-key` |`/etc/kubernetes/pki/apiserver-kubelet-client.key`
|`--tls-cert-file` |`/etc/kubernetes/pki/apiserver.crt`
|`--tls-private-key-file` |`/etc/kubernetes/pki/apiserver.key`

To verify that a certificate is correct, we can use the `openssl` tool with the `x509` command:

```bash
$ openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 367863685034009807 (0x51aea129037e4cf)
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: CN = kubernetes
        Validity
            Not Before: Mar  3 01:20:28 2024 GMT
            Not After : Mar  3 01:20:28 2025 GMT
        Subject: CN = kube-apiserver
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (2048 bit)
                Modulus:
                    00:b8:19:60:65:38:51:0c:b7:94:ed:24:c6:ed:86:
                    bc:63:d1:c1:7b:a6:fc:28:8a:8a:f7:f4:a8:15:53:
                    c3:42:67:9c:83:bc:48:8b:f3:08:b9:f8:cd:8e:b2:
                    96:27:fc:a4:30:f1:c4:7c:c4:6d:db:27:1b:21:72:
                    53:11:9c:7e:18:5f:dd:12:e4:bd:bb:29:eb:7b:51:
                    0a:62:72:6f:da:89:a6:2b:12:5c:a5:25:86:26:cc:
                    11:58:ed:5f:93:1d:08:c5:f6:7e:99:49:01:c6:2e:
                    2d:23:90:01:e3:9c:24:9b:6b:e9:7c:cb:d3:54:78:
                    1f:dc:19:4f:b9:ac:07:52:67:64:01:92:5a:27:37:
                    89:16:c2:86:14:90:77:c8:f3:89:23:81:74:42:25:
                    0e:df:a7:f9:e7:31:63:1f:59:b4:1c:af:c2:1f:6c:
                    b3:e5:e1:e0:ef:f1:35:c4:33:9d:24:08:cf:8a:af:
                    56:9f:a8:e1:6e:44:09:0f:50:09:41:2d:15:04:bf:
                    43:47:b3:22:24:ad:13:c1:61:2c:60:bd:b3:4a:dc:
                    ad:6b:2e:11:4e:79:c2:52:21:4b:fb:2b:05:26:b8:
                    05:b3:f3:18:ca:3a:94:7f:d2:4c:0c:36:e7:ef:ce:
                    fe:ef:35:ea:c5:35:27:f6:1c:45:0e:2e:1e:5a:94:
                    6c:f1
                Exponent: 65537 (0x10001)
        X509v3 extensions:
            X509v3 Key Usage: critical
                Digital Signature, Key Encipherment
            X509v3 Extended Key Usage:
                TLS Web Server Authentication
            X509v3 Basic Constraints: critical
                CA:FALSE
            X509v3 Authority Key Identifier:
                57:C3:72:EA:3D:D6:3A:B1:EA:6B:D6:12:A5:FE:1C:93:97:91:DF:27
            X509v3 Subject Alternative Name:
                DNS:kubernetes, DNS:kubernetes.default, DNS:kubernetes.default.svc, DNS:kubernetes.default.svc.cluster.local, DNS:master-node, IP Address:172.17.0.1, IP Address:10.0.0.10
    Signature Algorithm: sha256WithRSAEncryption
    Signature Value:
        34:0c:75:0f:a8:d6:1b:51:78:e7:7c:ca:43:24:7b:0a:2f:d1:
        32:ad:c6:8e:5e:19:82:75:cb:45:e8:8f:8e:f5:55:b1:38:3f:
        80:56:7a:a3:2a:c0:0a:05:4f:f8:39:25:eb:33:f1:17:60:a9:
        a7:4c:53:6b:8d:4e:df:41:e1:58:6d:44:ea:f7:b5:5f:b4:e3:
        b3:e1:ba:97:1f:22:5d:1a:5d:79:76:e0:68:ba:68:7a:63:30:
        df:cb:bd:aa:82:27:c5:05:0a:a7:fc:39:bf:20:ab:cc:8f:97:
        51:31:b8:4d:32:5f:b3:a4:ff:c2:92:5f:50:2e:12:1a:c7:ec:
        25:13:0b:04:e8:5a:5c:f3:b0:79:05:2c:d3:b1:2d:2f:ac:16:
        18:25:37:b0:87:64:c7:26:5b:72:d9:fc:df:86:22:bb:82:30:
        68:6c:ec:d2:c9:07:bd:88:67:42:98:cb:88:97:ed:4d:c4:1b:
        01:57:e4:84:84:a8:b8:a1:4a:6b:6d:26:d6:26:b4:09:84:bf:
        63:2d:f4:f3:d9:bf:ff:38:8e:08:1e:9b:d5:d7:0a:c6:fc:6b:
        6f:7c:a5:03:7e:c4:2d:de:0c:1e:94:e5:2a:0d:e6:2b:f6:5d:
        c2:58:78:c5:a7:a5:ef:17:0f:01:5c:71:e5:f6:b1:69:0c:7a:
        aa:3b:9e:d2
```

Here are some noteworthy things about the output:

- Name of the certificate
    + `Subject: CN = kube-apiserver`

- Alternative names
    + `DNS:kubernetes, DNS:kubernetes.default, DNS:kubernetes.default.svc, DNS:kubernetes.default.svc.cluster.local, DNS:master-node, IP Address:172.17.0.1, IP Address:10.0.0.10`

- Expiry date
    + `Not After : Mar  3 01:20:28 2025 GMT`

- Certificate issuer (the CA)
    + `CN = kubernetes`

> `kubeadm` had named the CA `kubernetes` when it set up the cluster, so that's where the name came from.

- [Certificate Management with kubeadm](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/)
- [PKI certificates and requirements](https://kubernetes.io/docs/setup/best-practices/certificates/)

Remember, you can always view the logs of a Pod:

```bash
$ kubectl -n kube-system logs etcd-master-node
```

---

Meanwhile, on a planet far, far away...

**Q.** What could be a cause of `kubectl` to stop working, i.e., no longer be able to query the `apiserver`?

**A.** A control plane component like `etcd` could be using the wrong certificate.

When this happens, you could use the [`crictl`] tool to debug if the cluster is using a [CRI] runtime.  For instance, you could list the running Pods, containers, images, etc. and inspect their logs.

```bash
$ sudo crictl pods
POD ID              CREATED             STATE               NAME                                       NAMESPACE           ATTEMPT             RUNTIME
85cef61a811cf       4 hours ago         Ready               calico-kube-controllers-786b679988-gqvbd   kube-system         0                   (default)
d1f848ae9bcf7       4 hours ago         Ready               coredns-5d78c9869d-lmj6l                   kube-system         0                   (default)
e05dcf0d45e6b       4 hours ago         Ready               calico-node-bnmxf                          kube-system         0                   (default)
ab64e95896b96       4 hours ago         Ready               coredns-5d78c9869d-xkd9p                   kube-system         0                   (default)
cadf77834c4a1       4 hours ago         Ready               kube-proxy-tsmfj                           kube-system         0                   (default)
e5d8e8b093472       4 hours ago         Ready               kube-scheduler-master-node                 kube-system         0                   (default)
b1185bd6cc059       4 hours ago         Ready               kube-controller-manager-master-node        kube-system         0                   (default)
7c3cf78b6c50e       4 hours ago         Ready               kube-apiserver-master-node                 kube-system         0                   (default)
3e29a644ef683       4 hours ago         Ready               etcd-master-node                           kube-system         0                   (default)
$
$ sudo crictl ps -a
CONTAINER           IMAGE                                                              CREATED             STATE               NAME                      ATTEMPT             POD ID              POD
089d2e54cc9d9       45ae357729e3a6db7de47d4efb04453ac384d5cfec2f062a86523f3482cb1cdb   5 hours ago         Running             calico-kube-controllers   2                   85cef61a811cf       calico-kube-controllers-786b679988-gqvbd
c825a62a99621       ead0a4a53df89fd173874b46093b6e62d8c72967bbf606d672c9e8c9b601a4fc   5 hours ago         Running             coredns                   2                   d1f848ae9bcf7       coredns-5d78c9869d-lmj6l
c62fc1926f357       ead0a4a53df89fd173874b46093b6e62d8c72967bbf606d672c9e8c9b601a4fc   5 hours ago         Running             coredns                   2                   ab64e95896b96       coredns-5d78c9869d-xkd9p
061d25487af9a       44f52c09dececf0d842450cfbdcf6f1ce1e6eaf2d7183d643b9fbf77dde03a38   5 hours ago         Running             calico-node               2                   e05dcf0d45e6b       calico-node-bnmxf
f0f28a9a5ace0       44f52c09dececf0d842450cfbdcf6f1ce1e6eaf2d7183d643b9fbf77dde03a38   5 hours ago         Exited              mount-bpffs               2                   e05dcf0d45e6b       calico-node-bnmxf
a2d0586ae9442       5d6f5c26c655486ee59f7c517dbd383336f4ce2c0db77f7d5ffd015395deee6f   5 hours ago         Exited              install-cni               2                   e05dcf0d45e6b       calico-node-bnmxf
d02ed53df862f       5d6f5c26c655486ee59f7c517dbd383336f4ce2c0db77f7d5ffd015395deee6f   5 hours ago         Exited              upgrade-ipam              2                   e05dcf0d45e6b       calico-node-bnmxf
2649ba63c9266       28cbb8ce8c3cb822ee06cae6552703c7cbda6b2d6a2ff2e843ebb92e12da1831   5 hours ago         Running             kube-proxy                2                   cadf77834c4a1       kube-proxy-tsmfj
81497055ca10f       92c2e92eac8857200efb0c31e63dcf450faa271bbbf48fb304da824d1f888ff8   5 hours ago         Running             kube-scheduler            2                   e5d8e8b093472       kube-scheduler-master-node
6b374b0357929       58ef6d317d8e57d3e5c43cd1a36e04754c28f3014b96d9e1bcc34c8159810d50   5 hours ago         Running             kube-controller-manager   2                   b1185bd6cc059       kube-controller-manager-master-node
a6bc8d7330eb9       86b6af7dd652c1b38118be1c338e9354b33469e69a218f7e290a0ca5304ad681   5 hours ago         Running             etcd                      2                   3e29a644ef683       etcd-master-node
b0abade16fa07       3896b5f1c17ddc19b80720e2fe960633437eff7f6f9ab9dd0325450e2a4930a4   5 hours ago         Running             kube-apiserver            2                   7c3cf78b6c50e       kube-apiserver-master-node
$
$ sudo crictl images
IMAGE                                     TAG                 IMAGE ID            SIZE
docker.io/calico/cni                      v3.26.0             5d6f5c26c6554       210MB
docker.io/calico/kube-controllers         v3.26.0             45ae357729e3a       77.4MB
docker.io/calico/node                     v3.26.0             44f52c09decec       250MB
registry.k8s.io/coredns/coredns           v1.10.1             ead0a4a53df89       53.6MB
registry.k8s.io/etcd                      3.5.7-0             86b6af7dd652c       297MB
registry.k8s.io/kube-apiserver            v1.27.11            3896b5f1c17dd       124MB
registry.k8s.io/kube-controller-manager   v1.27.11            58ef6d317d8e5       116MB
registry.k8s.io/kube-proxy                v1.27.11            28cbb8ce8c3cb       80.5MB
registry.k8s.io/kube-scheduler            v1.27.11            92c2e92eac885       58.9MB
registry.k8s.io/pause                     3.9                 e6f1816883972       750kB
```

> Of course, you can also do all of the things that you're used to doing with higher-level abstractions, such as `exec` into a container, print logs, container lifecycle management, etc.

---

All certificate-related operations are performed by the controller manager component in the control plane.  Among other controllers, it has the CSR Approving and CSR Signing controllers.

In order to sign anything, it of course needs access to the certificate authority's root certificate and private key.

To view the parameters passed on the `kube-controller-manager` binary when its started, you can:

- view the Pod manifest in `/etc/kubernetes/manifests/kube-controller-manager.yaml`
- use `kubectl`
    + `kubectl -n kube-system describe po kube-controller-manager-master-node`
    + `kubectl -n kube-system get po kube-controller-manager-master-node -oyaml`

Here's a fun way:

```bash
$ kubectl -n kube-system get po kube-controller-manager-master-node -ojsonpath='{.spec.containers[0].command}' | jq
[
  "kube-controller-manager",
  "--allocate-node-cidrs=true",
  "--authentication-kubeconfig=/etc/kubernetes/controller-manager.conf",
  "--authorization-kubeconfig=/etc/kubernetes/controller-manager.conf",
  "--bind-address=127.0.0.1",
  "--client-ca-file=/etc/kubernetes/pki/ca.crt",
  "--cluster-cidr=172.16.1.0/16",
  "--cluster-name=kubernetes",
  "--cluster-signing-cert-file=/etc/kubernetes/pki/ca.crt",
  "--cluster-signing-key-file=/etc/kubernetes/pki/ca.key",
  "--controllers=*,bootstrapsigner,tokencleaner",
  "--kubeconfig=/etc/kubernetes/controller-manager.conf",
  "--leader-elect=true",
  "--requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt",
  "--root-ca-file=/etc/kubernetes/pki/ca.crt",
  "--service-account-private-key-file=/etc/kubernetes/pki/sa.key",
  "--service-cluster-ip-range=172.17.1.0/18",
  "--use-service-account-credentials=true"
]
```

The two parameters we're interested in are:

```json
"--cluster-signing-cert-file=/etc/kubernetes/pki/ca.crt",
"--cluster-signing-key-file=/etc/kubernetes/pki/ca.key",
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

Also, we can see the controllers that it's managing via the `--controllers` parameter, but the `*` wilcard doesn't tell us much.  But, we can look at the looks to see what it started when it was launched:

```bash
$ kubectl logs -n kube-system kube-controller-manager-master-node | grep Started
I0309 16:30:59.989046       1 controllermanager.go:638] "Started controller" controller="nodeipam"
I0309 16:30:59.996217       1 controllermanager.go:638] "Started controller" controller="root-ca-cert-publisher"
I0309 16:31:00.001148       1 controllermanager.go:638] "Started controller" controller="endpointslicemirroring"
I0309 16:31:00.005771       1 controllermanager.go:638] "Started controller" controller="replicaset"
I0309 16:31:00.010537       1 controllermanager.go:638] "Started controller" controller="job"
I0309 16:31:00.014191       1 controllermanager.go:638] "Started controller" controller="endpoint"
I0309 16:31:00.017595       1 controllermanager.go:638] "Started controller" controller="endpointslice"
I0309 16:31:00.021250       1 controllermanager.go:638] "Started controller" controller="daemonset"
I0309 16:31:00.028000       1 controllermanager.go:638] "Started controller" controller="disruption"
I0309 16:31:00.030816       1 controllermanager.go:638] "Started controller" controller="csrapproving"
I0309 16:31:00.033480       1 controllermanager.go:638] "Started controller" controller="tokencleaner"
I0309 16:31:00.037025       1 controllermanager.go:638] "Started controller" controller="attachdetach"
I0309 16:31:00.055671       1 controllermanager.go:638] "Started controller" controller="namespace"
I0309 16:31:00.058312       1 controllermanager.go:638] "Started controller" controller="serviceaccount"
I0309 16:31:00.061455       1 controllermanager.go:638] "Started controller" controller="bootstrapsigner"
I0309 16:31:00.063839       1 controllermanager.go:638] "Started controller" controller="replicationcontroller"
I0309 16:31:00.066543       1 controllermanager.go:638] "Started controller" controller="cronjob"
I0309 16:31:00.068969       1 controllermanager.go:638] "Started controller" controller="nodelifecycle"
I0309 16:31:00.071097       1 controllermanager.go:638] "Started controller" controller="persistentvolume-binder"
I0309 16:31:00.073438       1 controllermanager.go:638] "Started controller" controller="pv-protection"
I0309 16:31:00.079561       1 controllermanager.go:638] "Started controller" controller="csrsigning"
I0309 16:31:00.081716       1 controllermanager.go:638] "Started controller" controller="ttl"
I0309 16:31:00.085920       1 controllermanager.go:638] "Started controller" controller="persistentvolume-expander"
I0309 16:31:00.087939       1 controllermanager.go:638] "Started controller" controller="pvc-protection"
I0309 16:31:00.093682       1 controllermanager.go:638] "Started controller" controller="ephemeral-volume"
I0309 16:31:00.095909       1 controllermanager.go:638] "Started controller" controller="deployment"
I0309 16:31:00.097979       1 controllermanager.go:638] "Started controller" controller="statefulset"
I0309 16:31:00.101968       1 controllermanager.go:638] "Started controller" controller="ttl-after-finished"
I0309 16:31:00.317247       1 controllermanager.go:638] "Started controller" controller="resourcequota"
I0309 16:31:00.459401       1 controllermanager.go:638] "Started controller" controller="garbagecollector"
I0309 16:31:00.519731       1 controllermanager.go:638] "Started controller" controller="csrcleaner"
I0309 16:31:00.601568       1 controllermanager.go:638] "Started controller" controller="clusterrole-aggregation"
I0309 16:31:00.700505       1 controllermanager.go:638] "Started controller" controller="podgc"
I0309 16:31:00.896453       1 controllermanager.go:638] "Started controller" controller="horizontalpodautoscaling"
```

Kool Moe Dee.

## Creating A User

I've covered this before in the [Creating A User](/2023/05/17/on-getting-started-with-kubernetes/#creating-a-user) section of my [On Getting Started With Kubernetes](/2023/05/17/on-getting-started-with-kubernetes/) article, so I won't go into it again here.

Here's a fun command:

```bash
$ openssl x509 -in <(k config view --raw -ojsonpath='{.users[1].user.client-certificate-data}' | base64 -d) -text -noout
$
$ curl https://10.0.0.10:6443/api/v1/pods \
--key ~/btoll.key \
--cert ~/btoll.crt \
--cacert /etc/kubernetes/pki/ca.crt
```

---

Next, we'll use our new private key and certificate to create a `kubeconfig` file that we can use to authenticate and interact with the cluster, no longer relying upon the `kubernetes-admin` user!

One common way of authentication in Kubernetes is to use [x.509 certificates] when making API request to the `apiserver`, which presents an encrypted HTTP endpoint to the client.  The `apiserver` will use the Common Name (CN) and Organization (O) defined in the cert to then determine if the user is authorized to perform the requested action.

So, how can one view the information in the certificate?  The certificate can be viewed in the kube-config file and is [Base64]-encoded.  To view the structure of the file, issue the following command:

```bash
$ kubectl config view --raw
```

> Note that the `--raw` flag is needed to print the actual string to the console, otherwise it will appear as "REDACTED".  Not dumping this sensitive information to the console without the `--raw` flag is a security measure to prevent shoulder-surfers from stealing private data.  You know who you are.

Here is a sample output, redacted for brevity:

```bash
$ kubectl config view
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://10.8.8.10:6443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: kubernetes-admin
  name: kubernetes-admin@kubernetes
current-context: kubernetes-admin@kubernetes
kind: Config
preferences: {}
users:
- name: kubernetes-admin
  user:
    client-certificate-data: REDACTED
    client-key-data: REDACTED
```

The certificate is stored in the `users` list under the `kubernetes-admin` user in `user.client-certificate-data` (`user.client-key-data` is the private key).

That's great, but how can you actually see the contents of the actual certificate?  For this, we'll need our friend [`openssl`].

First, extract the value of the `client-certificate-data` key into a file:

```bash
$ kubectl config view --raw -o jsonpath='{.users[0].user.client-certificate-data}' | base64 --decode > admin.crt
```

Then, dump the contents of the certificate to `stdout`:

```bash
$ openssl x509 -in admin.crt -text
...
$
$ openssl x509 -in admin.crt -text | head
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 5637458172924352784 (0x4e3c4656f9475910)
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: CN = kubernetes
        Validity
            Not Before: Apr 21 01:05:15 2021 GMT
            Not After : Apr 21 01:05:17 2022 GMT
        Subject: O = system:masters, CN = kubernetes-admin
```

Note the "CN" and the "O" fields.  This is the information that the `apiserver` will extract from the client certificate after authentication to determine if the user (here, `kubernetes-admin`) is authorized to perform the action.  Of course, the admin is authorized, but here is where one would use a different user with limited permissions to control what can be accessed.

Lastly, if we look at the Pods in the `default` namespace using the increased verbosity, we can see that the location of the `apiserver` has been read from the kube-config file located in `$HOME/.kube/config`.

```bash
$ kubectl get po -v6
I0420 23:05:02.548528   15640 loader.go:379] Config loaded from file:  /home/btoll/.kube/config
I0420 23:05:02.561294   15640 round_trippers.go:445] GET https://10.8.8.10:6443/api/v1/namespaces/default/pods?limit=500 200 OK in 7 milliseconds
No resources found in default namespace.
```

## Just For Fun

The `kubelet` running on one node is not supposed to be able to read any secrets meant for Pods running on a different node.  But, for the purposes of our educational edification, let's imagine that for some reason known only to [The Shadow] that we need to disregard that security layer and have access to any secrets anywhere in the cluster?  How would we do that?

The `kubelets` are part of the `SYSTEM:NODES` group and should have its certificate name prefixed by `system:node`.  The means that they are part of the Node Authorizer group.

```bash
$ ps aux | grep [k]ubelet
root        1010  3.2  0.9 1852960 96684 ?       Ssl  23:01   1:18 /usr/bin/kubelet --bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf --kubeconfig=/etc/kubernetes/kubelet.conf --config=/var/lib/kubelet/config.yaml --container-runtime-endpoint=unix:///var/run/crio/crio.sock --pod-infra-container-image=registry.k8s.io/pause:3.9 --node-ip=10.0.0.12
```

```bash
$ sudo tail /etc/kubernetes/kubelet.conf
    user: default-auth
  name: default-context
current-context: default-context
kind: Config
preferences: {}
users:
- name: default-auth
  user:
    client-certificate: /var/lib/kubelet/pki/kubelet-client-current.pem
    client-key: /var/lib/kubelet/pki/kubelet-client-current.pem
```

```bash
$ sudo kubectl --kubeconfig=/etc/kubernetes/kubelet.conf auth can-i --list
Warning: the list may be incomplete: node authorizer does not support user rule resolution
Resources                                                       Non-Resource URLs   Resource Names   Verbs
selfsubjectreviews.authentication.k8s.io                        []                  []               [create]
selfsubjectaccessreviews.authorization.k8s.io                   []                  []               [create]
selfsubjectrulesreviews.authorization.k8s.io                    []                  []               [create]
certificatesigningrequests.certificates.k8s.io/selfnodeclient   []                  []               [create]
                                                                [/api/*]            []               [get]
                                                                [/api]              []               [get]
                                                                [/apis/*]           []               [get]
                                                                [/apis]             []               [get]
                                                                [/healthz]          []               [get]
                                                                [/healthz]          []               [get]
                                                                [/livez]            []               [get]
                                                                [/livez]            []               [get]
                                                                [/openapi/*]        []               [get]
                                                                [/openapi]          []               [get]
                                                                [/readyz]           []               [get]
                                                                [/readyz]           []               [get]
                                                                [/version/]         []               [get]
                                                                [/version/]         []               [get]
                                                                [/version]          []               [get]
                                                                [/version]          []               [get]
```

```bash
$ sudo kubectl --kubeconfig=/etc/kubernetes/kubelet.conf get secrets -A
Error from server (Forbidden): secrets is forbidden: User "system:node:worker-node01" cannot list resource "secrets" in API group "" at the cluster scope: can only read namespaced object of this type
```

```bash
$ k describe clusterrolebinding system:node
Name:         system:node
Labels:       kubernetes.io/bootstrapping=rbac-defaults
Annotations:  rbac.authorization.kubernetes.io/autoupdate: true
Role:
  Kind:  ClusterRole
  Name:  system:node
```

```bash
$ k edit clusterrolebinding system:node
```

```yaml
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:nodes
```

```bash
$ k describe clusterrolebinding system:node
Name:         system:node
Labels:       kubernetes.io/bootstrapping=rbac-defaults
Annotations:  rbac.authorization.kubernetes.io/autoupdate: true
Role:
  Kind:  ClusterRole
  Name:  system:node
Subjects:
  Kind   Name          Namespace
  ----   ----          ---------
  Group  system:nodes
```

```bash
$ sudo kubectl --kubeconfig=/etc/kubernetes/kubelet.conf get secrets -A
NAMESPACE              NAME                              TYPE                                  DATA   AGE
default                ben-sa-secret                     kubernetes.io/service-account-token   3      4d19h
kubernetes-dashboard   admin-user                        kubernetes.io/service-account-token   3      10d
kubernetes-dashboard   kubernetes-dashboard-certs        Opaque                                0      10d
kubernetes-dashboard   kubernetes-dashboard-csrf         Opaque                                1      10d
kubernetes-dashboard   kubernetes-dashboard-key-holder   Opaque                                2      10d
```

## Conclusion

I support this conclusion.

## References

- [Kubernetes The Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way)
- [Debugging Kubernetes nodes with crictl](https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/)
- [Kubernetes Node Security: The Role of Kubelet Authorization](https://blog.devops.dev/kubernetes-node-security-the-role-of-kubelet-authorization-366220051cb)
- [kind](https://kind.sigs.k8s.io/)

[PKI]: https://en.wikipedia.org/wiki/Public_key_infrastructure
[joined]: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-join/
[`kubelet`]: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
[`kube-proxy`]: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
[`openssl`]: https://www.openssl.org/
[x.509 certificates]: https://en.wikipedia.org/wiki/X.509
[certificate signing request (CSR)]: https://www.ssl.com/faqs/what-is-a-csr/
[Common Name (CN)]: https://www.ssl.com/faqs/common-name/
[CSR object]: https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/
[garbage collector]: https://kubernetes.io/docs/concepts/workloads/controllers/garbage-collection/
[`apiserver`]: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
[Base64]: https://en.wikipedia.org/wiki/Base64
[`openssl`]: /2018/07/17/on-openssl/
[Service Account]: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
[Secret]: https://kubernetes.io/docs/concepts/configuration/secret/
[`kubeadm`]: https://kubernetes.io/docs/reference/setup-tools/kubeadm/
[RBAC]: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
[Node]: https://kubernetes.io/docs/reference/access-authn-authz/node/
[`crictl`]: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md
[CRI]: https://kubernetes.io/docs/concepts/architecture/cri/
[The Shadow]: https://en.wikipedia.org/wiki/The_Shadow

