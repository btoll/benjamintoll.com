+++
title = "On Kubernetes Security"
date = "2022-09-02T04:41:53Z"

+++

When a Kubernetes cluster is created, the [PKI] is automatically created, with the control plane node creating certificate authority which self-signs the root certificate and storing it in `/etc/kubernetes/pki`.  When a worker Node is [joined] to the cluster, the control plane will place the self-signed cert on the node in the same directory.  This cert is used by both the [`kubelet`] and the [`kube-proxy`] when to authenticate when making any requests to the [`apiserver`].

To authenticate to the server using the default configuration, copy the kube-config file from the control plane to a machine outside of the cluster.  In my setup, that is the host on my laptop (I'm using `kubeadm`, and the cluster is running in several VirtualBox virtual machines).  So, I'll copy `/etc/kubernets/admin.conf` on the control plane to `$HOME/.kube/config` in my home directory, and this then allows me to use the `kubectl` client access to the cluster.

Why?

Well, the config file, read by `kubectl` before each request, contains the location of the apiserver and the following very important bits:

- Cluster certificate (signed by the cluster certificate authority and presented by the apiserver when the client makes requests to establish trust)
- Client certificate (used to authenticate to the apiserver)
- Client private key

Let's take a look the certificates that were created by the PKI when the cluster was created.  I've ssh'd into the control plane and cd'd to `/etc/kubernetes/pki`.  Let's list the contents:

```
/etc/kubernetes/pki$ ls -1
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

```
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

The following information indicate that this is *probably* a self-signed cert:

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
>       $ sudo kubectl config view --kubeconfig /etc/kubernetes/scheduler.conf

Interestingly, the kube-config for the `kube-proxy` has its config as data in a ConfigMap that is inside the `kube-system` namespace.  You can view it like this:

```
$ kubectl get cm -n kube-system kube-proxy -oyaml
```

This will be exposed as a volume mount inside the `kube-proxy` Pod on a worker Node and available for the Pod to read `kubeconfig.conf` whenever it needs to make a request to the apiserver.

---

But what if I want to create a new "user"?  How do I do that?

One can use traditional CLI tools like [`openssl`] to create a new user certificate, but I'll use Kubernetes apiserver APIs as much as possible to complete this process.

Here are the steps:

1. Create a new private key:

        $ openssl genrsa -out btoll.key 4096
        Generating RSA private key, 4096 bit long modulus (2 primes)
        ...

1. Generate a [certificate signing request (CSR)] using the new private key.  I'll set the [Common Name (CN)] field to be my username:

        $ openssl req -new -key btoll.key -out btoll.csr -subj "/CN=btoll"

1. Base64 encode the CSR and save to a file, removing any newlines.  This will then be used within the CSR object that is submitted to the apiserver:

        $ base64 btoll.csr | tr -d "\n" > btoll.base64.csr

1. Create a Kubernetes [CSR object]:

        $ cat << EOF | kubectl apply -f -
        > apiVersion: certificates.k8s.io/v1
        > kind: CertificateSigningRequest
        > metadata:
        >   name: btoll-user
        > spec:
        >   groups:
        >     - system:authenticated
        >   request: $(< btoll.base64.csr)
        >   signerName: kubernetes.io/kube-apiserver-client
        >   usages:
        >     - client auth
        > EOF
        certificatesigningrequest.certificates.k8s.io/btoll-user created

Sweet, the CSR object was sent to the apiserver.  Let's list it:

```
$ kubectl get csr
NAME         AGE     SIGNERNAME                            REQUESTOR          CONDITION
btoll-user   8m57s   kubernetes.io/kube-apiserver-client   kubernetes-admin   Pending
```

Note that it's in the "Pending" state.  The Kubernetes [garbage collector] will destroy the CSR object after one hour, so make sure to approve and retrieve it before then!

```
$ kubectl certificate approve btoll-user
certificatesigningrequest.certificates.k8s.io/btoll-user approved
$
$ kubectl get csr
NAME         AGE   SIGNERNAME                            REQUESTOR          CONDITION
btoll-user   23m   kubernetes.io/kube-apiserver-client   kubernetes-admin   Approved,Issued
```

And now we see that state has been changed.  However, we can't rest on our laurels, the object could still be gc-d.  Oh noes!  Let's fly into action:

```
$ kubectl get csr btoll-user -o jsonpath='{.status.certificate}' | base64 --decode > btoll.crt
```

Certificate extracted and downloaded.  The crisis is averted, and the new user certificate is safely nestled in the warmth of the filesystem.

And just like that you're a hero!

Next, we'll use our new private key and certificate to create a kube-config file that we can use to authenticate and interact with the cluster, no longer relying upon the `kubernetes-admin` user!

---

One common way of authentication in Kubernetes is to use [x.509 certificates] when making API request to the apiserver, which presents an encrypted HTTP endpoint to the client.  The apiserver will use the Common Name (CN) and Organization (O) defined in the cert to then determine if the user is authorized to perform the requested action.

So, how can one view the information in the certificate?  The certificate can be viewed in the kube-config file and is [Base64]-encoded.  To view the structure of the file, issue the following command:

```
$ kubectl config view --raw
```

> Note that the `--raw` flag is needed to print the actual string to the console, otherwise it will appear as "REDACTED".  Not dumping this sensitive information to the console without the `--raw` flag is a security measure to prevent shoulder-surfers from stealing private data.  You know who you are.

Here is a sample output, redacted for brevity:

```
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

```
$ kubectl config view --raw -o jsonpath='{.users[0].user.client-certificate-data}' | base64 --decode > admin.crt
```

Then, dump the contents of the certificate to `stdout`:

```
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

Note the "CN" and the "O" fields.  This is the information that the apiserver will extract from the client certificate after authentication to determine if the user (here, `kubernetes-admin`) is authorized to perform the action.  Of course, the admin is authorized, but here is where one would use a different user with limited permissions to control what can be accessed.

Lastly, if we look at the Pods in the `default` namespace using the increased verbosity, we can see that the location of the apiserver has been read from the kube-config file located in `$HOME/.kube/config`.

```
$ kubectl get po -v6
I0420 23:05:02.548528   15640 loader.go:379] Config loaded from file:  /home/btoll/.kube/config
I0420 23:05:02.561294   15640 round_trippers.go:445] GET https://10.8.8.10:6443/api/v1/namespaces/default/pods?limit=500 200 OK in 7 milliseconds
No resources found in default namespace.
```
---

# Service Accounts

If a [Service Account] (sa) is not created, the apiserver will use the default Service Account that was automatically created when the namespace was created.  In the control plane, the controller manager will see that a Service Account has been created and then will automatically create a [Secret] object holding that information.

The Service Account Secret will be automatically mounted as a volume and accessible to the Pod.

Let's create a new Service Account `ben-sa` with no specified authorizations.  Note see that the `ben-sa-token-xhgl5` Secret was automatically created by the controller when it saw that the Service Account had been created:

```
$ kubectl create serviceaccount ben-sa
serviceaccount/ben-sa created
$
$ kubectl describe serviceaccounts ben-sa
Name:                ben-sa
Namespace:           default
Labels:              <none>
Annotations:         <none>
Image pull secrets:  <none>
Mountable secrets:   ben-sa-token-xhgl5
Tokens:              ben-sa-token-xhgl5
Events:              <none>
$
$ kubectl get secrets
NAME                  TYPE                                  DATA   AGE
ben-sa-token-xhgl5    kubernetes.io/service-account-token   3      32m
default-token-4b7mc   kubernetes.io/service-account-token   3      170m
$ kubectl describe secrets ben-sa-token-xhgl5
Name:         ben-sa-token-xhgl5
Namespace:    default
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: ben-sa
              kubernetes.io/service-account.uid: c2826877-fd1d-4ca1-8c8d-b6fc92e190fd

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:     1066 bytes
namespace:  7 bytes
token:      eyJhbGciOiJSUzI1NiIsImtpZCI6InJPTnYxNENmdzZVbGhPZ1FYb1QzblNqWnRZTEtKOTJfWFlWS1JjcnJjR1EifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJkZWZhdWx0Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6ImJlbi1zYS10b2tlbi14aGdsNSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50Lm5hbWUiOiJiZW4tc2EiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC51aWQiOiJjMjgyNjg3Ny1mZDFkLTRjYTEtOGM4ZC1iNmZjOTJlMTkwZmQiLCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6ZGVmYXVsdDpiZW4tc2EifQ.FCacxsiUQ_pKjjCyqjb9F23P3S_g7rlk_qe9hknSKO8auRiHzOZ8kuLSgYrVGXLFmW07MANMYGbjIMX_vQxq4Ak_F9scXElTJvbXSKW0XUZUIYxKfiqlqa3dTMHOOOpOVHVy8dxUx4uPgb1SN77NHFM5_s8iCQluGOEbLMJ2brKgHzFQvMFsQdmMWuJuHxaiuDhw7TYEfNfBizFLjxzgOJq6t0W1UgA6reZuajE05BpLRGBaQ8j2wAy4kf0O2OW8ANDjJY6at1k2Ypgrom2dqySw0KilN1o1YXT2eExnYih7JI2YpF7JZgydLXTeG-lDKlDSR2R9eJGnMVR9VnTj-w
```

Let's jump onto a Pod and then access the apiserver using the mounted files from the Secret.

```
$ kubectl get po
NAME                            READY   STATUS    RESTARTS   AGE
benjamintoll-84b456c644-5l76b   1/1     Running   0          14m
benjamintoll-84b456c644-bsj7k   1/1     Running   0          14m
benjamintoll-84b456c644-d7tb6   1/1     Running   0          14m
$
$ kubectl exec benjamintoll-84b456c644-5l76b -it -- /bin/bash
root@benjamintoll-84b456c644-5l76b:/#
root@benjamintoll-84b456c644-5l76b:/# TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
root@benjamintoll-84b456c644-5l76b:/# CACERT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
root@benjamintoll-84b456c644-5l76b:/#
root@benjamintoll-84b456c644-5l76b:/# curl --cacert $CACERT https://kubernetes.default.svc/api/
{
  "kind": "Status",
  "apiVersion": "v1",
  "metadata": {

  },
  "status": "Failure",
  "message": "forbidden: User \"system:anonymous\" cannot get path \"/api/\"",
  "reason": "Forbidden",
  "details": {

  },
  "code": 403
}root@benjamintoll-84b456c644-5l76b:/#
root@benjamintoll-84b456c644-5l76b:/# curl --cacert $CACERT --header "Authorization: Bearer $TOKEN" https://kubernetes.default.svc/api/
{
  "kind": "APIVersions",
  "versions": [
    "v1"
  ],
  "serverAddressByClientCIDRs": [
    {
      "clientCIDR": "0.0.0.0/0",
      "serverAddress": "10.8.8.10:6443"
    }
  ]
}root@benjamintoll-84b456c644-5l76b:/#
root@benjamintoll-84b456c644-5l76b:/#
root@benjamintoll-84b456c644-5l76b:/# curl --cacert $CACERT --header "Authorization: Bearer $TOKEN" https://kubernetes.default.svc/api/v1/namespaces/default/pods
{
  "kind": "Status",
  "apiVersion": "v1",
  "metadata": {

  },
  "status": "Failure",
  "message": "pods is forbidden: User \"system:serviceaccount:default:ben-sa\" cannot list resource \"pods\" in API group \"\" in the namespace \"default\"",
  "reason": "Forbidden",
  "details": {
    "kind": "pods"
  },
  "code": 403
}
```

We couldn't list the Pods because we're not authorized by the `ben-sa` Service Account (note that we had already been authenticated by the certificate presented to the apiserver).

```
$ kubectl auth can-i list pods --as=system:serviceaccount:default:ben-sa
no
$
$ kubectl get po -v6 --as=system:serviceaccount:default:ben-sa
I0421 00:18:18.059503    9364 loader.go:379] Config loaded from file:  /home/btoll/.kube/config
I0421 00:18:18.071129    9364 round_trippers.go:445] GET https://10.8.8.10:6443/api/v1/namespaces/default/pods?limit=500 403 Forbidden in 7 milliseconds
I0421 00:18:18.071492    9364 helpers.go:216] server response object: [{
  "kind": "Status",
  "apiVersion": "v1",
  "metadata": {},
  "status": "Failure",
  "message": "pods is forbidden: User \"system:serviceaccount:default:ben-sa\" cannot list resource \"pods\" in API group \"\" in the namespace \"default\"",
  "reason": "Forbidden",
  "details": {
    "kind": "pods"
  },
  "code": 403
}]
F0421 00:18:18.071537    9364 helpers.go:115] Error from server (Forbidden): pods is forbidden: User "system:serviceaccount:default:ben-sa" cannot list resource "pods" in A
PI group "" in the namespace "default"
```

Now, let's create some roles to enable us to list the Pods.  Since I created my cluster using [`kubeadm`], I have the [RBAC] and [Node] authorization plugins installed by default.

Let's see if there any any roles defined:

```
$ kubectl get roles
No resources found in default namespace.
```

That's a big no.  Let's remedy that!

```
$ kubectl create role ben-role --verb get,list --resource pods
role.rbac.authorization.k8s.io/ben-role created
$
$ kubectl describe role ben-role
Name:         ben-role
Labels:       <none>
Annotations:  <none>
PolicyRule:
  Resources  Non-Resource URLs  Resource Names  Verbs
  ---------  -----------------  --------------  -----
  pods       []                 []              [get list]
$
$ kubectl get role ben-role -oyaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  creationTimestamp: "2021-04-21T04:46:08Z"
  managedFields:
  - apiVersion: rbac.authorization.k8s.io/v1
    fieldsType: FieldsV1
    fieldsV1:
      f:rules: {}
    manager: kubectl-create
    operation: Update
    time: "2021-04-21T04:46:08Z"
  name: ben-role
  namespace: default
  resourceVersion: "19080"
  uid: 1b5cd1d0-a3b9-4760-91ea-90b5ffe0bb17
rules:
- apiGroups:
  - ""
  resources:
  - pods
  verbs:
  - get
  - list
```

This, however, only defines the role and the functions that the role can perform.  If we were to try and list the Pods (impersonating the `ben-sa` Service Account), we'd still be denied because we haven't bound it to the Service Account:

```
$ kubectl auth can-i list pods --as=system:serviceaccount:default:ben-sa
no
```

And we'll bind it now:

```
$ kubectl create rolebinding ben-role-binding --role ben-role --serviceaccount default:ben-sa
rolebinding.rbac.authorization.k8s.io/ben-role-binding created
$
$ kubectl auth can-i list pods --as=system:serviceaccount:default:ben-sa
yes
$
$ kubectl get pods -v6 --as=system:serviceaccount:default:ben-sa
I0421 01:04:01.718885   24440 loader.go:379] Config loaded from file:  /home/btoll/.kube/config
I0421 01:04:01.741651   24440 round_trippers.go:445] GET https://10.8.8.10:6443/api/v1/namespaces/default/pods?limit=500 200 OK in 17 milliseconds
NAME                            READY   STATUS    RESTARTS   AGE
benjamintoll-84b456c644-5l76b   1/1     Running   0          97m
benjamintoll-84b456c644-bsj7k   1/1     Running   0          97m
benjamintoll-84b456c644-d7tb6   1/1     Running   0          97m
```

Weeeeeeeeeeeeeeeeeeeeee!

```
$ kubectl describe rolebindings.rbac.authorization.k8s.io
Name:         ben-role-binding
Labels:       <none>
Annotations:  <none>
Role:
  Kind:  Role
  Name:  ben-role
Subjects:
  Kind            Name    Namespace
  ----            ----    ---------
  ServiceAccount  ben-sa  default
$
$ kubectl get rolebindings ben-role-binding -oyaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  creationTimestamp: "2021-04-21T04:59:43Z"
  managedFields:
  - apiVersion: rbac.authorization.k8s.io/v1
    fieldsType: FieldsV1
    fieldsV1:
      f:roleRef:
        f:apiGroup: {}
        f:kind: {}
        f:name: {}
      f:subjects: {}
    manager: kubectl-create
    operation: Update
    time: "2021-04-21T04:59:43Z"
  name: ben-role-binding
  namespace: default
  resourceVersion: "20223"
  uid: ad22571c-726f-4619-92e8-280e7068a23b
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: ben-role
subjects:
- kind: ServiceAccount
  name: ben-sa
  namespace: default
```

```
$ kubectl cluster-info
Kubernetes control plane is running at https://10.8.8.10:6443
CoreDNS is running at https://10.8.8.10:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.
```

> An easy way to generate yaml is to run an imperative command with the `--dryrun client` and `-oyaml` options.  Can be very useful to see which `apiVersion` is supported.

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

