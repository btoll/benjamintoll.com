+++
title = "On Kubernetes Services"
date = "2021-04-07T12:31:09-04:00"

+++

When I first started learning [Kubernetes], I was confused about the [Service] type.  I was trying to map my experience of using proxies, reverse proxies and load balancers as separate entities into a contained ecosystem such as Kubernetes where they are defined as objects, and it wasn't working.  If Services in Kubernetes are REST objects, what magic happens under the hood to enable the traditional infrastructure to which I was accustomed?

In this post, I want to dip a big toe into the vast ocean of Kubernetes and speak a bit about Services and give some simple examples to show them in action.

---

What is a Service?

It's an abstraction for a logical set of [Pods], and it exposes an application on those Pods as a network service.  It offers the following conveniences:

- [Service discovery], which assigns the following to the Service:
    + An internal stable IP address.
    + A DNS entry.
- Load-balancing across the Pods.
- Maps to a set of Pod objects via the label [selector].

In practice, a (default) Service [ClusterIP] exposes a set of Pods by providing a stable (virtual) IP address that can be used internally by cluster resources to access the service(s) on those Pods.  We'll soon see how the other Service types will provide access outside of the cluster to the internal ClusterIP and by proxy its set of Pods.

By their nature, Pods are ephemeral and are scaled up and down all the time in a [Deployment] (used in the examples here).  They are given an internal IP, but given their transient nature, they should not be relied upon as one never knows how long they will be around (remember, Kubernetes is a self-healing system and will ensure the desired state is achieved).  Services, on the other hand, will be assigned a [virtual IP] that will not change.

This is incredibly useful in many scenarios. One oft-cited example is when one set of Pods composes the application's backend and one set the app's frontend.  In this scenario, the frontend Pods shouldn't have to care if the backend Pods come and go; they only care that they are up and running and available to fulfill whatever tasks they need.  In other words, the services running on the frontend Pods shouldn't need to keep track of the ephemeral IPs of the backend Pods, as this would be a challenging and daunting task and very much out-of-scope for an application.

This Service object then allows for this decoupling by providing a virtual IP that won't change and will round-robin requests to its set of Pods (that were mapped by the selector).  Just imagine having to manage all of this functionality yourself in the absence of Services!

---

Now we come to the part when I'll give a brief summary of the three different types of Services in Kubernetes:

- [ClusterIP](#clusterip)
- [NodePort](#nodeport)
- [LoadBalancer](#loadbalancer)

I'll be using a Deployment resource for each example.  This example defines a [ReplicaSet] that manages three instances of the most disruptive website in the world.

`deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: benjamintoll
  labels:
    app: benjamintoll
spec:
  replicas: 3
  selector:
    matchLabels:
      app: benjamintoll
  template:
    metadata:
      labels:
        app: benjamintoll
    spec:
      containers:
        - name: benjamintoll
          image: btoll/benjamintoll.com:latest
          ports:
            - name: http-port
              containerPort: 80
```

Let's dive in!

---

# ClusterIP

The [ClusterIP] Service type is the default type and is only reachable from within the cluster.

Here is a very simple ClusterIP Service definition:

`cluster_ip.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: benjamintoll
  labels:
    app: benjamintoll
spec:
  selector:
    app: benjamintoll
  ports:
    - port: 8080
      targetPort: 80
```

Note that when a `type` isn't specified that it defaults to `ClusterIP`.

Setup:

We'll publish it and our Deployment resource:

```bash
$ kubectl apply -f cluster_ip.yaml
service/benjamintoll created
$ kubectl apply -f deployment.yaml
deployment.apps/benjamintoll created
```

Let's get a list of Pods managed by the ReplicaSet (remember, the ReplicaSet was defined in the Deployment and it manages the number of Pods):

```bash
$ kubectl get po -owide
NAME                            READY   STATUS    RESTARTS   AGE   IP            NODE          NOMINATED NODE   READINESS GATES
benjamintoll-798fc5b4d4-278qr   1/1     Running   0          52s   172.18.2.12   worker-1   <none>           <none>
benjamintoll-798fc5b4d4-js96r   1/1     Running   0          52s   172.18.1.21   worker-0   <none>           <none>
benjamintoll-798fc5b4d4-n5jlb   1/1     Running   0          52s   172.18.1.22   worker-0   <none>           <none>
```

It's necessary to use the [`port-forward`] command to connect to a Pod from outside of the cluster (I would imagine that most developers are familiar with the concept of [port forwarding]).

```bash
$ kubectl port-forward benjamintoll-798fc5b4d4-278qr 8090:80
Forwarding from 127.0.0.1:8090 -> 80
Forwarding from [::1]:8090 -> 80
```

> Note that if you don't have the `IP` address of the node on which the pod resides in the `/etc/default/kubelet` file, that you'll get the following error when trying to forward the port:
>
> ```bash
> error: error upgrading connection: unable to upgrade connection: pod does not exist
> ```
>
> If you receive this, simply run the following commands:
>
> ```bash
> $ echo "KUBELET_EXTRA_ARGS=--node-ip=10.0.0.21" | sudo tee /etc/default/kubelet
> KUBELET_EXTRA_ARGS=--node-ip=10.0.0.21
> $ sudo systemctl daemon-reload
> $ sudo systemctl restart kubelet
> ```
> > Note that the `IP` address must be that of the node **not** the pod.
>
> [See the issue] in the Kubernetes GitHub project.


This is the magic incantation that exposes a specified Pod to the outside world (you could have chosen any of the three listed above).

Open in default browser:

```bash
$ x-www-browser 127.0.0.1:8090
```

That's it!  Weeeeeeeeeeeeeeeeeeeeeeeeeee

> Out of curiosity, how does one determine the ownership of these resources?  It's fairly simple, but verbose:
>
> ```bash
> $ kubectl get po benjamintoll-798fc5b4d4-278qr \
>     -o jsonpath='{.metadata.ownerReferences}'
> [{"apiVersion":"apps/v1","blockOwnerDeletion":true,"controller":true,"kind":"ReplicaSet","name":"benjamintoll-798fc5b4d4","uid":"0667a86f-4c6f-44cf-90e2-62fabaa90d5b"}]
> $ kubectl get rs -owide
> NAME                      DESIRED   CURRENT   READY   AGE   CONTAINERS     IMAGES                          SELECTOR
> benjamintoll-798fc5b4d4   3         3         3       5d    benjamintoll   btoll/benjamintoll.com:latest   app=benjamintoll,pod-template-hash=798fc5b4d4
> $
> $ kubectl get rs benjamintoll-798fc5b4d4 \
>     -o jsonpath='{.metadata.ownerReferences}'
> [{"apiVersion":"apps/v1","blockOwnerDeletion":true,"controller":true,"kind":"Deployment","name":"benjamintoll","uid":"5b6af142-8b02-487b-8103-607cc0770225"}]
> $
> $ kubectl get deployments benjamintoll -owide
> NAME           READY   UP-TO-DATE   AVAILABLE   AGE   CONTAINERS     IMAGES                          SELECTOR
> benjamintoll   3/3     3            3           5d    benjamintoll   btoll/benjamintoll.com:latest   app=benjamintoll
> ```

When you're done playing around, tearing it down is easy:

```bash
$ kubectl delete -f cluster_ip.yaml
service "benjamintoll" deleted
$ kubectl delete -f deployment.yaml
deployment.apps "benjamintoll" deleted
```

By default, deleting a deployment will also remove its managed resources, i.e., any ReplicaSets and any Pods managed by those ReplicaSets.  If you want to delete the Deployment but still keep its managed resources around, use the `--cascade=orphan` option:

```bash
$ kubectl delete -f deployment.yaml --cascade=orphan
or
$ kubectl delete deployments benjamintoll --cascade=orphan
```

> `po` is just an alias for `pods`, and `rs` is an alias for `replicasets`.

# NodePort

The [NodePort] Service is exposed on each [Node] at a static port.  So, all worker Nodes will be listening on the same exposed port for incoming traffic, which be routed to a ClusterIP Service that was automatically created when the NodePort Service was exposed.

I'll usually create a NodePort Service when I need to contact the Pods from outside of the cluster on a local LAN or even my development machine, since it's simpler than port forwarding to a specific Pod when only using the ClusterIP Service.  Also, the ReplicaSet will ensure that the desired state of Pods is fulfilled, so routing through a Node is much safer in case one or more of the Pods go down and are replaced by others with a different name.

> If you want to understand the syntax and contents of a NodePort Service, a neat trick is to create the deployment and then expose the Service using `kubectl`.  Then get the Service and redirect to a `yaml` file.  Note that Kubernetes will add a lot of information to the resource that usually isn't present when defining the Service by hand.
>
> ```bash
> $ kubectl expose deployment benjamintoll --type=NodePort --name=benjamintoll
> $ kubectl get svc benjamintoll -oyaml > service/node_port.yaml
> ```
>
> You can do this with any resource type in Kubernetes.

`node_port.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: benjamintoll
  labels:
    app: benjamintoll
spec:
  selector:
    app: benjamintoll
  type: NodePort
  ports:
    - port: 8080
      targetPort: 80
      nodePort: 31117
```

Note that if a `nodePort` isn't specified in the `ports` section of the NodePort Service resource file, one will be create in the range of 30000-32767 (although this is configurable).

Setup:

```bash
$ kubectl apply -f deployment.yaml -f node_port.yaml
deployment.apps/benjamintoll created
service/benjamintoll created
```

```bash
$ kubectl get no -owide
NAME          STATUS   ROLES                  AGE   VERSION   INTERNAL-IP   EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION       CONTAINER-RUNTIME
master-0   Ready    control-plane,master   28h   v1.20.5   10.8.8.10     <none>        Ubuntu 18.04.5 LTS   4.15.0-136-generic   docker://20.10.2
worker-0   Ready    <none>                 28h   v1.20.5   10.8.8.20     <none>        Ubuntu 18.04.5 LTS   4.15.0-136-generic   docker://20.10.2
worker-1   Ready    <none>                 28h   v1.20.5   10.8.8.21     <none>        Ubuntu 18.04.5 LTS   4.15.0-136-generic   docker://20.10.2
```

Open in default browser:

```bash
$ x-www-browser 10.8.8.10:31117
```

Test all worker node IPs by connecting to the app in the browser:

```bash
$ for ip in \
    $(kubectl get no -o jsonpath='{.items[1:].status.addresses[0].address}')
> do
> x-www-browser $ip:31117
> done
```

Or:

```bash
$ for ip in
      $(kubectl get no -owide --no-headers | awk '{ if (NR!=1) { print $6 }}')
> do
> x-www-browser $ip:31117
> done
```

`cURL`:

```bash
$ curl 10.8.8.21:31117
```

Again, tear down is easy:

```bash
$ kubectl delete -f deployment.yaml -f node_port.yaml
deployment.apps "benjamintoll" deleted
service "benjamintoll" deleted
```

> `no` is just an alias for `nodes`, and `svc` is an alias for `service`.

# LoadBalancer

Lastly, we'll take a look at the [LoadBalancer] Service.  This Service builds on the NodePort Service by creating a load balancer in the cloud by the cloud provider you're using and directing it at the Nodes in your cluster.  Kubernetes comes with glue code for several native cloud providers to create this load balancer in the cloud when the `type` is set to `LoadBalancer`, and of course, AWS, GCP and Azure are among them.

But, since I'm not a weenie, I don't have a Kubernetes cluster in the cloud.  There must be another way to have a LoadBalancer Service without giving Bezos any money.

So, what does one do when creating a cluster on bare metal with no cloud backing, such as when using `minikube` or a cluster built with `kubeadm`?  For those particular scenarios, we need to bring in the [MetalLB] implementation.  Without it, the LoadBalancer will never get out of the "pending" state.

Because of having to install MetalLB, the steps are more involved than with using a ClusterIP or NodePort Service, but I have a shell script that I use to make this less painful.  It performs the following tasks:

1. Installs [`kube-router`].
1. Installs MetalLB.
1. Creates a `memberlist` secret in the new `metallb-system` namespace.
1. Creates a `ConfigMap` API object of address pools from which MetalLB will choose an IP for the LoadBalancer Service.

Setup:

`support_load_balancing.sh`

```bash
#!/bin/bash

set -ex

IP=${1:-10.8.8.30}
# We're building an IP pool (a range).
# End result is:
#   - 10.8.8.30-10.8.8.40
# TODO: There should be checks for end-of-range, i.e. 254.
LAST_OCTET="${IP##*.}"
ADD_TEN=$(( LAST_OCTET + 10 ))
# String replacement.
IP_ADD_TEN="${IP/$LAST_OCTET/$ADD_TEN}"

# Install kube-router.
# https://github.com/cloudnativelabs/kube-router/blob/master/docs/user-guide.md
kubectl apply \
    -f https://raw.githubusercontent.com/cloudnativelabs/kube-router/master/daemonset/kube-router-all-service-daemonset.yaml

# Install MetalLB.
# https://metallb.universe.tf/installation/
kubectl apply \
    -f https://raw.githubusercontent.com/metallb/metallb/v0.9.5/manifests/namespace.yaml
kubectl apply \
    -f https://raw.githubusercontent.com/metallb/metallb/v0.9.5/manifests/metallb.yaml
# On first install only.
kubectl create secret generic -n metallb-system memberlist --from-literal=secretkey="$(openssl rand -base64 128)"

# Apply config map for address pools.
# https://metallb.universe.tf/configuration/
kubectl apply -f <(cat <<-EOF
apiVersion: v1
kind: ConfigMap
metadata:
  namespace: metallb-system
  name: config
data:
  config: |
    address-pools:
    - name: default
      protocol: layer2
      addresses:
      - ${IP}-${IP_ADD_TEN}
EOF
)
```

```bash
$ ./support_load_balancing.sh 10.8.8.93
+ IP=10.8.8.93
+ LAST_OCTET=93
+ ADD_TEN=103
+ IP_ADD_TEN=10.8.8.103
+ kubectl apply -f https://raw.githubusercontent.com/cloudnativelabs/kube-router/master/daemonset/kube-router-all-service-daemonset.yaml
configmap/kube-router-cfg created
daemonset.apps/kube-router created
+ kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.9.5/manifests/namespace.yaml
namespace/metallb-system created
+ kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.9.5/manifests/metallb.yaml
...
$
```

Let's check out the ConfigMap that the shell script passed to the Kubernetes API server.  Remember that it's in the new `metallb-system` [namespace]:

```bash
$ kubectl describe cm -n metallb-system config
Name:         config
Namespace:    metallb-system
Labels:       <none>
Annotations:  <none>

Data
====
config:
----
address-pools:
- name: default
  protocol: layer2
  addresses:
  - 10.8.8.93-10.8.8.103

Events:  <none>
```

Or:

```bash
$ kubectl get cm \
    -n metallb-system config \
    -o jsonpath='{.data.config}' | tail -1 | awk '{ print $2 }'
10.8.8.93-10.8.8.103
```

> Note that `data.config` is a multi-line string in the ConfigMap, so it's not possible to use [`jsonpath`] to get the addresses (hence the pipeline).

Now, let's see if there's an external IP yet.  It could take a little while to get one, so if it's in a pending state at first, don't panic.

```bash
$ kubectl get svc -owide
NAME           TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE     SELECTOR
benjamintoll   LoadBalancer   10.99.128.123   10.8.8.93     80:32434/TCP   6m47s   app=benjamintoll
kubernetes     ClusterIP      10.96.0.1       <none>        443/TCP        88m     <none>
```

Ok, we have one, and it's the first IP of our range.  Kool Moe Dee.

```bash
$ kubectl apply -f deployment.yaml -f node_port.yaml
deployment.apps/benjamintoll created
service/benjamintoll created
```

> If you want to understand the syntax and contents of a LoadBalancer Service, a neat trick is to create the deployment and then expose the Service using `kubectl`.  Then get the Service and redirect to a `yaml` file.  Note that Kubernetes will add a lot of information to the resource that usually isn't present when defining the Service by hand.
>
> ```bash
> $ kubectl expose deployment benjamintoll --type=LoadBalancer --name=benjamintoll
> $ kubectl get svc benjamintoll -oyaml > service/node_port.yaml
> ```
>
> You can do this with any resource type in Kubernetes.


Open in default browser:

```bash
$ x-www-browser 10.8.8.93
```

`cURL`:

```bash
$ curl 10.8.8.93
```

`telnet`:

```bash
$ telnet 10.8.8.93 80
Trying 10.8.8.93...
Connected to 10.8.8.93.
Escape character is '^]'.
GET / HTTP/1.0

```

Tear down:

```bash
$ kubectl delete -f deployment.yaml -f node_port.yaml
deployment.apps "benjamintoll" deleted
service "benjamintoll" deleted
```

> `cm` is just an alias for `configmap`.

# Conclusion

I glossed over a lot of the inner workings of Kubernetes in regards to the Service objects, including:

1. How the `kube-proxy` runs on each Node and watches the control plane's [`apiserver`] for new Services and opens ports that will proxy requests to one of the Service's Pods.

1. The modes in which `kube-proxy` sets up the routing to the Service's Pods:
    + [User space proxy mode]
    + [`iptables` proxy mode]

However, my goal was mostly to have a crib sheet to refer to getting networking up and running using Kubernetes Services, and I think I accomplished that.  If you feel differently, go ahead and leave a comment below.

# References

- [Service v1 core](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.23/#service-v1-core)
- [Must Read Free Kubernetes Books](http://www.ofbizian.com/2020/09/must-read-free-kubernetes-books.html)

[Kubernetes]: https://kubernetes.io/
[Service]: https://kubernetes.io/docs/concepts/services-networking/service/
[Pods]: https://kubernetes.io/docs/concepts/workloads/pods/
[Service discovery]: https://en.wikipedia.org/wiki/Service_discovery
[Deployment]: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
[virtual IP]: https://kubernetes.io/docs/reference/networking/virtual-ips/
[selector]: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
[ReplicaSet]: https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/
[`port-forward`]: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#port-forward
[port forwarding]: /2018/08/24/on-ssh-port-forwarding/
[`kube-router`]: https://www.kube-router.io/
[Node]: https://kubernetes.io/docs/concepts/architecture/nodes/
[ClusterIP]: https://kubernetes.io/docs/concepts/services-networking/service/#type-clusterip
[NodePort]: https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport
[LoadBalancer]: https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer
[MetalLB]: https://metallb.universe.tf/
[`jsonpath`]: https://kubernetes.io/docs/reference/kubectl/jsonpath/
[namespace]: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
[`apiserver`]: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
[User space proxy mode]: https://kubernetes.io/docs/concepts/services-networking/service/#proxy-mode-userspace
[`iptables` proxy mode]: https://kubernetes.io/docs/concepts/services-networking/service/#proxy-mode-iptables
[See the issue]: https://github.com/kubernetes/kubernetes/issues/63702#issuecomment-474948254

