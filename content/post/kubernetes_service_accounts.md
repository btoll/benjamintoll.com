+++
title = "On Kubernetes Service Accounts"
date = "2024-03-08T04:41:53Z"
draft = true

+++

- [Service Accounts](#service-accounts)

---

## Service Accounts

If a [Service Account] (sa) is not created, the `apiserver` will use the default Service Account that was automatically created when the namespace was created.  In the control plane, the controller manager will see that a Service Account has been created and then will automatically create a [Secret] object holding that information.

The Service Account Secret will be automatically mounted as a volume and accessible to the Pod.

Let's create a new Service Account named `ben-sa`:

```bash
$ kubectl create serviceaccount ben-sa
serviceaccount/ben-sa created
```

Next, we'll create a new Secret and add it to the service account:


```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ben-sa-secret
  annotations:
    kubernetes.io/service-account.name: ben-sa
type: kubernetes.io/service-account-token
```

> It used to be the case (possibly < 1.24, but I'm not certain of that) that a Secret was automatically created when a ServiceAccount was created, but this is no longer the case.  In order to have a Secret automatically created, it's necessary to add an annotation, as seen above.

```bash
$
$ kubectl describe serviceaccounts ben-sa
Name:                ben-sa
Namespace:           default
Labels:              <none>
Annotations:         <none>
Image pull secrets:  <none>
Mountable secrets:   <none>
Tokens:              ben-sa-secret
Events:              <none>
$
$ kubectl get secrets
NAME            TYPE                                  DATA   AGE
ben-sa-secret   kubernetes.io/service-account-token   3      76s
$
$ kubectl describe secrets ben-sa-secret
Name:         ben-sa-secret
Namespace:    default
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: ben-sa
              kubernetes.io/service-account.uid: cbeceee5-20fd-4bf6-a568-013177f3e313

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:     1099 bytes
namespace:  7 bytes
token:      eyJhbGciOiJSUzI1NiIsImtpZCI6IjhxVHcxbFhUc3h2cFNpT0lwc3J0QmlBNjRtYkc1NVNidWhILU5zUEFTNmcifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJkZWZhdWx0Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6ImJlbi1zYS1zZWNyZXQiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiYmVuLXNhIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQudWlkIjoiY2JlY2VlZTUtMjBmZC00YmY2LWE1NjgtMDEzMTc3ZjNlMzEzIiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmRlZmF1bHQ6YmVuLXNhIn0.Qz0P9oY7hRUBg62m4IL3DEig9pk6G8KoiSiBGkKyISwC5bvNqD-HtzcgyuZEcZsMaDpU8TVZW7egvXG0m5AHVXeDEQt06OKJzCjuYQ_sPiJtH3YKSULvvmjVwlS67FsinTtwRyIj09Mu1A-kTS8B3mmFcCGS2g6TPbIpnwDeUYIuTurG4RK1bTYCknoLRaQXE2kRP78e1DGVAL5iIgazSHkmCDcfv4XG2fjpUgWm9sejMqG7fR4o1N8mdiCtq-uYsX3p0KjzDxiysY6XkAvTZOpQ47sgWFON6OB8JfQgzLvDPKMov8gGMgK3SbQsVMETELNAFeAW41PEBipmUAQxsQ
```

Let's jump onto a Pod and then access the `apiserver` using the mounted files from the Secret.

```bash
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

We couldn't list the Pods because we're not authorized by the `ben-sa` Service Account (note that we had already been authenticated by the certificate presented to the `apiserver`).

```bash
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

```bash
$ kubectl get roles
No resources found in default namespace.
```

That's a big no.  Let's remedy that!

```bash
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

```bash
$ kubectl auth can-i list pods --as=system:serviceaccount:default:ben-sa
no
```

And we'll bind it now:

```bash
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

```bash
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

```bash
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

