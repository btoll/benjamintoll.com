+++
title = "On Kubernetes and DNS"
date = "2024-03-15T19:39:40-04:00"

+++

This post is going to be a ~~brief~~ look at [DNS] for Pods and Services in [Kubernetes].  Its intent is only to provide a good mental model for how DNS is assigned to new resources in the cluster.

Much of this article is jump-started from the [DNS for Services and Pods] documentation on the official Kubernetes site.  Go and read it now.

Of course, there are different DNS configurations that can be given in a Pod depending upon the value for [`.spec.dnsPolicy`], and I'm going to assume it's `ClusterFirst`, which is the default if none is given.  This decision has been made to keep this post to a reasonable length, so if any of the details don't apply to the DNS policy that you're using or interested in, there you go, you've been warned.

> For `ClusterFirst`, any DNS query that does not match the configured cluster domain suffix, such as `www.kubernetes.io`, is forwarded to an upstream nameserver by the DNS server.

---

- [`kubelet`](#kubelet)
- [CoreDNS](#coredns)
    + [`Corefile`](#corefile)
- [Pods](#pods)
    + [Pod A/AAAA Records](#pod-aaaaa-records)
- [Services](#services)
    + [Service A/AAAA Records](#service-aaaaa-records)
    + [Service SRV Records](#service-srv-records)
- [Conclusion](#conclusion)
- [References](#references)

---

It's easy to take DNS and [service discovery] for granted in Kubernetes.  While Kubernetes doesn't provide many things out-of-the-box, it does provide a DNS server that allows for cluster-scoped DNS resolution (usually with [CoreDNS]).

However, how does this process work?  For example, when I deploy a workload into a cluster, whether it being a single Pod or a Deployment, how do the Pods become "DNS aware"?  And, what about Services?

The most important player in this scenario is the [`kubelet`].  It is essentially the supervisor of the Node, i.e., an agent that runs on each Node (sometimes even the master control plane Node), that ensures that the PodSpec(s) that it is given to it by the `apiserver` is created.  Importantly, it will make sure that the container(s) defined in the PodSpec is running and healthy.

## `kubelet`

If we look at the parameters passed to the `kubelet` using [`ps`], we can find the config file that it is using as its configuration and which it writes into every container that it manages.

Here is a dirty pipeline that will help us find the parameter that we're interested in (`--config`), whose value is the aforementioned configuration file:

```bash
$ ps aux | ag [k]ubelet | head -1 | awk '{ for (i=11; i<=NF; ++i) print $i}'
/usr/bin/kubelet
--bootstrap-kubeconfig=/etc/kubernetes/bootstrap-kubelet.conf
--kubeconfig=/etc/kubernetes/kubelet.conf
--config=/var/lib/kubelet/config.yaml
--container-runtime-endpoint=unix:///run/containerd/containerd.sock
--node-ip=172.18.0.5
--node-labels=zone=1
--pod-infra-container-image=registry.k8s.io/pause:3.9
--provider-id=kind://docker/beta/beta-worker
--runtime-cgroups=/system.slice/containerd.service
```

> The [`awk`] command is printing the 11<sup>th</sup> column onwards.

Here 'tis:

```bash
--config=/var/lib/kubelet/config.yaml
```

Accessing the configuration at `/var/lib/kubelet/config.yaml` depends on how you created the cluster.  For example, I used [`kind`], which is "Kubernetes in Docker", and clearly, it uses Docker, which makes me a weenie (although I'm using a virtual machine, because everyone knows to never, ever install Docker on the host).

> In other posts I've used [`kubeadm`] and [`minikube`] to create the cluster.  It's good to know more than one way to locally create a cluster.

We know that every Node has a `kubelet` as its agent, so we should be able to log into any Node in the cluster to view that configuration.  Since we used `kind`, we can simply use Docker commands, since `kind` created all of the Nodes to run in a container.

Let's list the running containers:

```bash
$ docker ps
CONTAINER ID   IMAGE                  COMMAND                  CREATED       STATUS       PORTS                       NAMES
7cb692d8baa9   kindest/node:v1.29.2   "/usr/local/bin/entr…"   2 hours ago   Up 2 hours                               beta-worker3
9e0d20e5f51b   kindest/node:v1.29.2   "/usr/local/bin/entr…"   2 hours ago   Up 2 hours                               beta-worker
2229f2f47381   kindest/node:v1.29.2   "/usr/local/bin/entr…"   2 hours ago   Up 2 hours                               beta-worker2
c0ca7a51bff0   kindest/node:v1.29.2   "/usr/local/bin/entr…"   2 hours ago   Up 2 hours                               beta-worker4
3df3a630ab3c   kindest/node:v1.29.2   "/usr/local/bin/entr…"   2 hours ago   Up 2 hours   127.0.0.1:43511->6443/tcp   beta-control-plane
```

> Just typing the word "[Dd]ocker" makes me feel dirty.

Since the `kubelet` will be running on every Node (possibly even the control plane Node, again, depending on how the cluster was created), we can simply `exec` into any one of them and view the config file:

```bash
$ docker exec -it beta-worker cat /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
authentication:
  anonymous:
    enabled: false
  webhook:
    cacheTTL: 0s
    enabled: true
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: 0s
    cacheUnauthorizedTTL: 0s
cgroupDriver: systemd
cgroupRoot: /kubelet
clusterDNS:
- 10.96.0.10
clusterDomain: cluster.local
containerRuntimeEndpoint: ""
cpuManagerReconcilePeriod: 0s
evictionHard:
  imagefs.available: 0%
  nodefs.available: 0%
  nodefs.inodesFree: 0%
evictionPressureTransitionPeriod: 0s
failSwapOn: false
fileCheckFrequency: 0s
healthzBindAddress: 127.0.0.1
healthzPort: 10248
httpCheckFrequency: 0s
imageGCHighThresholdPercent: 100
imageMaximumGCAge: 0s
imageMinimumGCAge: 0s
kind: KubeletConfiguration
logging:
  flushFrequency: 0
  options:
    json:
      infoBufferSize: "0"
  verbosity: 0
memorySwap: {}
nodeStatusReportFrequency: 0s
nodeStatusUpdateFrequency: 0s
rotateCertificates: true
runtimeRequestTimeout: 0s
shutdownGracePeriod: 0s
shutdownGracePeriodCriticalPods: 0s
staticPodPath: /etc/kubernetes/manifests
streamingConnectionIdleTimeout: 0s
syncFrequency: 0s
volumeStatsAggPeriod: 0s
```

Let's print just the DNS-related configuration:

```bash
$ docker exec -it beta-worker grep -i -A2 dns /var/lib/kubelet/config.yaml
clusterDNS:
- 10.96.0.10
clusterDomain: cluster.local
```

So, what is that IP address?  It is the Kubernetes Service that exposes the CoreDNS Pods, which the cluster uses for service discovery.

Let's turn to it now.

## CoreDNS

CoreDNS is a newer `dns` server written in Go that is modular, meaning that it depends on plugins to build out its functionality, with each plugin performing a DNS function.  Using it at a high-level is very easy, and it's simple to implement most of the use cases that you'll want in a basic, general way with very little up-front work.

As mentioned, the IP address `10.96.0.10` is that of the CoreDNS Service, which is acting as a load balancer to two `coredns` Pods:

```bash
$ kubectl -n kube-system get svc
NAME       TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)                  AGE
kube-dns   ClusterIP   10.96.0.10   <none>        53/UDP,53/TCP,9153/TCP   27h
```

This Service will round-robin the requests to the two pods that were created by default:

```bash
$ kubectl -n kube-system get po -l k8s-app=kube-dns -owide
NAME                       READY   STATUS    RESTARTS       AGE   IP           NODE                 NOMINATED NODE   READINESS GATES
coredns-76f75df574-9lrgf   1/1     Running   1 (126m ago)   27h   10.244.0.2   beta-control-plane   <none>           <none>
coredns-76f75df574-vwwv5   1/1     Running   1 (126m ago)   27h   10.244.0.4   beta-control-plane   <none>           <none>
```

The IP addresses of the `coredns` Pods are the endpoints, of course:

```bash
$ kubectl -n kube-system describe endpoints
Name:         kube-dns
Namespace:    kube-system
Labels:       k8s-app=kube-dns
              kubernetes.io/cluster-service=true
              kubernetes.io/name=CoreDNS
Annotations:  endpoints.kubernetes.io/last-change-trigger-time: 2024-03-17T18:54:04Z
Subsets:
  Addresses:          10.244.0.2,10.244.0.4
  NotReadyAddresses:  <none>
  Ports:
    Name     Port  Protocol
    ----     ----  --------
    dns-tcp  53    TCP
    dns      53    UDP
    metrics  9153  TCP

Events:  <none>
```

So, the `kubelet` will write the IP address of the Service (`10.96.0.10` and which is aware of how to reach every `coredns` Pod through the endpoints abstraction) to every container's [`/etc/resolv.conf`] file:

```bash
$ kubectl exec debug -it -- cat /etc/resolv.conf
search default.svc.cluster.local svc.cluster.local cluster.local home
nameserver 10.96.0.10
options ndots:5
```

Let's also dump the `coredns` Service's `.spec` as `json`:

```bash
$ kubectl -n kube-system get svc kube-dns -ojsonpath='{.spec}' | jq
```

```json
{
  "clusterIP": "10.96.0.10",
  "clusterIPs": [
    "10.96.0.10"
  ],
  "internalTrafficPolicy": "Cluster",
  "ipFamilies": [
    "IPv4"
  ],
  "ipFamilyPolicy": "SingleStack",
  "ports": [
    {
      "name": "dns",
      "port": 53,
      "protocol": "UDP",
      "targetPort": 53
    },
    {
      "name": "dns-tcp",
      "port": 53,
      "protocol": "TCP",
      "targetPort": 53
    },
    {
      "name": "metrics",
      "port": 9153,
      "protocol": "TCP",
      "targetPort": 9153
    }
  ],
  "selector": {
    "k8s-app": "kube-dns"
  },
  "sessionAffinity": "None",
  "type": "ClusterIP"
}
```

> For backwards compatability, the name `kube-dns` is still used, even though Kubernetes no longer users it.

### `Corefile`

Let's briefly look at the configuration for CoreDNS, the [`Corefile`].  This can be found in a ConfigMap in the `kube-system` namespace:

```bash
$ kubectl -n kube-system describe cm coredns
Name:         coredns
Namespace:    kube-system
Labels:       <none>
Annotations:  <none>

Data
====
Corefile:
----
.:53 {
    errors
    health {
       lameduck 5s
    }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
       pods insecure
       fallthrough in-addr.arpa ip6.arpa
       ttl 30
    }
    prometheus :9153
    forward . /etc/resolv.conf {
       max_concurrent 1000
    }
    cache 30
    loop
    reload
    loadbalance
}


BinaryData
====

Events:  <none>
```

> `. { }` is the most minimal `Corefile`.

Each `coredns` Pod will mount a volume to give the underlying container access to the `Corefile`, which the server expects to find at a certain location:

Observe:

```bash
$ kubectl -n kube-system get pod coredns-76f75df574-xdxtt -ojsonpath='{.spec.volumes[0]}' | jq
{
  "configMap": {
    "defaultMode": 420,
    "items": [
      {
        "key": "Corefile",
        "path": "Corefile"
      }
    ],
    "name": "coredns"
  },
  "name": "config-volume"
}
$ kubectl -n kube-system get pod coredns-76f75df574-xdxtt -ojsonpath='{.spec.containers[0].volumeMounts[0]}' | jq
{
  "mountPath": "/etc/coredns",
  "name": "config-volume",
  "readOnly": true
}
$ kubectl -n kube-system get pod coredns-76f75df574-xdxtt -ojsonpath='{.spec.containers[0].args}' | jq
[
  "-conf",
  "/etc/coredns/Corefile"
]
```

If you want to see the logs of the DNS requests, you'll have to add [the `log` plugin].  Simply edit the `coredns` ConfigMap and add it:

```
.:53 {
    log
    errors
    health {
       lameduck 5s
    }
    ready
    ...
```

> `coredns` will reload itself without any service disruption because of [the `reload` plugin].  Simply wait a short amount of time, and then you'll be able to dump the logs.

Ok, so all that is so very, very interesting.  So, we've learned that the `kubelet`, according to its config, will inject the IP address of the `coredns` Service into each container's `/etc/resolv.conf`.  That's nice of it.

## Pods

Here is the Pod manifest that we use to create the Pods in this section:

```yaml
---
apiVersion: v1
kind: Pod
metadata:
  name: debug
  labels:
    name: debug
spec:
  containers:
  - name: debug
    image: btoll/debug:latest
    tty: true
    stdin: true
    imagePullPolicy: Always
    securityContext:
      capabilities:
        add: ["NET_ADMIN"]
  restartPolicy: Always

```

> The `NET_ADMIN` [capability] was added because the `debug` container image contains [`iptables`] which requires escalated privileges.

Let's also see the endpoint that was assigned to each Pod:

```bash
$ kubectl get po -owide
NAME     READY   STATUS    RESTARTS   AGE     IP           NODE           NOMINATED NODE   READINESS GATES
debug    1/1     Running   0          2m14s   10.244.4.2   beta-worker    <none>           <none>
debug2   1/1     Running   0          22s     10.244.2.2   beta-worker4   <none>           <none>
```

### Pod A/AAAA Records

[A] and AAAA records aren't created for Pod names.  Instead, they are based upon the IP address and have the following form:

```
pod-ipv4-address.namespace.pod.cluster-domain.example
```

The `debug` Pod will then have the following A record:

```
10-244-4-2.default.pod.cluster.local
```

So, let's [`ping`] the `debug` Pod from `debug2` to see this in action:

```bash
$ kubectl exec debug2 -it -- ping -c2 10-244-4-2.default.pod
PING 10-244-4-2.default.pod.cluster.local (10.244.4.2) 56(84) bytes of data.
64 bytes from 10.244.4.2 (10.244.4.2): icmp_seq=1 ttl=62 time=0.086 ms
64 bytes from 10.244.4.2 (10.244.4.2): icmp_seq=2 ttl=62 time=0.286 ms

--- 10-244-4-2.default.pod.cluster.local ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1002ms
rtt min/avg/max/mdev = 0.086/0.186/0.286/0.100 ms
```

And, with [`dig`] (not specifying a record defaults to the A record):

```bash
$ kubectl exec debug2 -it -- dig +short +search 10-244-4-2.default.pod
10.244.4.2
```

> Note that `dig` needs the `+search` option to be able to resolve a query that isn't a [`fqdn`].

Interestingly, there is another way to create an A record.  Everybody knows that the `.metadata.name` of the Pod will also be its `hostname` within the Pod.  Similarly, if the optional `.spec.hostname` field is present, this overrides the name of the Pod as the `hostname`.

For example, if the `.spec.hostname: foo`, then:

```yaml

```bash
$ kubectl exec debug -it -- hostname
foo
```

In addition, there is also an optional `.spec.subdomain` field which is used to indicate that the Pod is part of a subgroup of the `namespace`.  If we specify both the `.spec.hostname` and the `.spec.subdomain` in the PodSpec, it will create a [`fqdn`] as the Pod in `/etc/hosts`:

```yaml
spec:
  hostname: foo
  subdomain: bar
  containers:
  - name: debug
    image: btoll/debug:latest
    tty: true
    stdin: true
    imagePullPolicy: Always
    securityContext:
      capabilities:
        add: ["NET_ADMIN"]
  restartPolicy: Always
```

And, in `/etc/hosts`:

```
$ kubectl exec debug -- cat /etc/hosts | tail -1
10.244.4.2      foo.bar.default.svc.cluster.local       foo
$ kubectl exec debug2 -- cat /etc/hosts | tail -1
10.244.2.2      foo2.bar.default.svc.cluster.local       foo
```

So, `foo.bar.default.svc.cluster.local` will be a resolvable name in the same node.  Right now, that's not very helpful, as it can only be resolved in the Pod.

However, if we expose the Pods with a Service that is named the same as the value of `.spec.subdomain`, then an A record will be created with that same `fqdn` that can be used within the cluster.

We'll do just that in the next section.

## Services

Here is the (headless) Service manifest that we'll be using:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: bar
  labels:
    name: svc-bar
spec:
  selector:
    name: debug
  clusterIP: None
  ports:
  - name: foo
    port: 1234
  - name: bar
    port: 5678
```

Some important notes about this manifest:

1. It's name **must** be the same as the PodSpec's `subdomain` (i.e., `bar`).
1. The `label` can be named anything, as usual.
1. The `selector` **must** match the Pod labels, i.e., `name=debug`.

Now, if we look at its endpoints, we can see that it's referencing the two Pods named `debug` and will round-robin the requests to them:

```bash
$ kubectl get ep bar -ojsonpath='{.subsets[0].addresses}' | jq
[
  {
    "hostname": "foo",
    "ip": "10.244.4.2",
    "nodeName": "beta-worker2",
    "targetRef": {
      "kind": "Pod",
      "name": "debug",
      "namespace": "default",
      "uid": "e134e429-34f6-4cde-bed0-cbe16d163dc3"
    }
  },
  {
    "hostname": "foo2",
    "ip": "10.244.2.2",
    "nodeName": "beta-worker3",
    "targetRef": {
      "kind": "Pod",
      "name": "debug2",
      "namespace": "default",
      "uid": "f6134bcf-4a51-4469-be9e-9cda6c2d8cbc"
    }
  }
]
```

Let's check out its services.  This is listing the open ports on both the `debug` and the `debug2` Pods:

```bash
$ kubectl exec debug -it -- dig +short +search bar.default SRV
0 25 5678 foo.bar.default.svc.cluster.local.
0 25 1234 foo.bar.default.svc.cluster.local.
0 25 5678 foo2.bar.default.svc.cluster.local.
0 25 1234 foo2.bar.default.svc.cluster.local.
```

Can we `ping` them?

```bash
$ kubectl exec debug -it -- ping -c2 foo2.bar
PING foo2.bar.default.svc.cluster.local (10.244.4.2) 56(84) bytes of data.
64 bytes from foo2.bar.default.svc.cluster.local (10.244.4.2): icmp_seq=1 ttl=62 time=0.085 ms
64 bytes from foo2.bar.default.svc.cluster.local (10.244.4.2): icmp_seq=2 ttl=62 time=0.188 ms

--- foo2.bar.default.svc.cluster.local ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1024ms
rtt min/avg/max/mdev = 0.085/0.136/0.188/0.051 ms
vagrant🐧vagrant-kind 1:-bash ~~> ~:
$ kubectl exec debug2 -it -- ping -c2 foo.bar
PING foo.bar.default.svc.cluster.local (10.244.2.2) 56(84) bytes of data.
64 bytes from foo.bar.default.svc.cluster.local (10.244.2.2): icmp_seq=1 ttl=62 time=0.218 ms
64 bytes from foo.bar.default.svc.cluster.local (10.244.2.2): icmp_seq=2 ttl=62 time=0.245 ms

--- foo.bar.default.svc.cluster.local ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1001ms
rtt min/avg/max/mdev = 0.218/0.231/0.245/0.013 ms
```

You bet!

As a sanity, let's create one more Pod on the same `subdomain` to see what happens.  We expect that it we be added to the backend Pods of the `bar` Service and be able to be discovered by its `fqdn` like the previous two `debug` pods in the same domain (and in the same `namespace`):

```yaml
---
apiVersion: v1
kind: Pod
metadata:
  name: dnsutils
  labels:
    name: debug
spec:
  hostname: dnsutils
  subdomain: bar
  containers:
  - name: debug
    image: registry.k8s.io/e2e-test-images/jessie-dnsutils:1.3
    tty: true
    stdin: true
    imagePullPolicy: Always
  restartPolicy: Always
```

Notice that this has a different `container` spec, but it shouldn't matter.  The important thing is that it is part of the `bar` subdomain.

After applying the manifest, we check out the Service endpoints:

```json
[
  {
    "hostname": "foo",
    "ip": "10.244.1.2",
    "nodeName": "beta-worker2",
    "targetRef": {
      "kind": "Pod",
      "name": "debug",
      "namespace": "default",
      "uid": "e134e429-34f6-4cde-bed0-cbe16d163dc3"
    }
  },
  {
    "hostname": "dnsutils",
    "ip": "10.244.2.5",
    "nodeName": "beta-worker",
    "targetRef": {
      "kind": "Pod",
      "name": "dnsutils",
      "namespace": "default",
      "uid": "b45f9f0c-51c8-4c4f-bb3b-f33d22e17582"
    }
  },
  {
    "hostname": "foo2",
    "ip": "10.244.4.2",
    "nodeName": "beta-worker3",
    "targetRef": {
      "kind": "Pod",
      "name": "debug2",
      "namespace": "default",
      "uid": "f6134bcf-4a51-4469-be9e-9cda6c2d8cbc"
    }
  }
]
```

That looks promising.  Can we `ping` it?

```bash
$ kubectl exec debug -it -- ping -c2 dnsutils.bar
PING dnsutils.bar.default.svc.cluster.local (10.244.2.5) 56(84) bytes of data.
64 bytes from dnsutils.bar.default.svc.cluster.local (10.244.2.5): icmp_seq=1 ttl=62 time=0.105 ms
64 bytes from dnsutils.bar.default.svc.cluster.local (10.244.2.5): icmp_seq=2 ttl=62 time=0.277 ms

--- dnsutils.bar.default.svc.cluster.local ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1022ms
rtt min/avg/max/mdev = 0.105/0.191/0.277/0.086 ms
```

Kool Moe Dee.

Here is the new Pod container's `/etc/hosts`:

```bash
$ kubectl exec dnsutils -- cat /etc/hosts | tail -1
10.244.2.5      dnsutils.bar.default.svc.cluster.local  dnsutils
```

### Service A/AAAA Records

Both normal and [headless] Service are assigned an A and AAAA record in the form of:

```
service-name.namespace.svc.cluster-domain.example
```

So, for our `bar` Service, it will look like this:

```
bar.default.svc.cluster.local
```

The difference between the two types of Services is what the record resolves to.

For headless Services, i.e., that without a `ClusterIP`, the A record will resolve to the `ClusterIP`.  A headless Service is created with the value `None` being assigned to the `.spec.clusterIP` field, which is what we defined above.

The A record of this headless Service will resolve to the set of IP addresses of all the Pods selected by the Service:

```bash
$ kubectl exec debug -- dig +short bar.default.svc.cluster.local A
10.244.2.2
10.244.1.2
10.244.4.2
```

Now, if we were to change that to a normal Service, i.e, one that has a `ClusterIP` assigned to it and acts as a load balancer, we can observe how the value of the DNS A record changes.

Do the following:

```bash
$ kubectl delete -f service.yaml
$ sed -i '/clusterIP: None/d' service.yaml
$ kubectl apply -f service.yaml
```

This will re-create the Service, but with a `ClusterIP`.  Let's list it:

```bash
$ kubectl get svc -l name=svc-bar
NAME   TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)             AGE
bar    ClusterIP   10.96.67.41   <none>        1234/TCP,5678/TCP   8m40s
```

Now, when we list the A record, it should only list this `ClusterIP`, rather than all of the Pods its selector matched:

```bash
$ kubectl exec debug -- dig +short bar.default.svc.cluster.local A
10.96.67.41
```

That's right, bubba.

### Service SRV Records

For both a normal and a headless Service, SRV records will be created in the form of:

```
_port-name._port-protocol.service-name.namespace.svc.cluster-domain.example
```

Like A and AAAA records, the SRV record will resolve to a different value based upon the kind of Service.  For a headless Service, it will return multiple answers, one for each Pod that is backing the Service, and contains the port number and the domain name of the Pod of the form `hostname.service-name.namespace.svc.cluster-domain.example`.

Let's see what `dig` returns for the headless Service:

```bash
$ kubectl exec debug -- dig _kilgore._tcp.bar.default.svc.cluster.local SRV

; <<>> DiG 9.18.24-1-Debian <<>> kilgore.tcp.bar.default.svc.cluster.local SRV
;; global options: +cmd
;; Got answer:
;; WARNING: .local is reserved for Multicast DNS
;; You are currently testing what happens when an mDNS query is leaked to DNS
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 57268
;; flags: qr aa rd; QUERY: 1, ANSWER: 3, AUTHORITY: 0, ADDITIONAL: 4
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
; COOKIE: 03419e27de6dcc5d (echoed)
;; QUESTION SECTION:
;kilgore.tcp.bar.default.svc.cluster.local. IN SRV

;; ANSWER SECTION:
kilgore.tcp.bar.default.svc.cluster.local. 30 IN SRV 0 33 1234 foo.bar.default.svc.cluster.local.
kilgore.tcp.bar.default.svc.cluster.local. 30 IN SRV 0 33 1234 foo2.bar.default.svc.cluster.local.
kilgore.tcp.bar.default.svc.cluster.local. 30 IN SRV 0 33 1234 dnsutils.bar.default.svc.cluster.local.

;; ADDITIONAL SECTION:
foo2.bar.default.svc.cluster.local. 30 IN A     10.244.4.2
foo.bar.default.svc.cluster.local. 30 IN A      10.244.1.2
dnsutils.bar.default.svc.cluster.local. 30 IN A 10.244.2.2

;; Query time: 0 msec
;; SERVER: 10.96.0.10#53(10.96.0.10) (UDP)
;; WHEN: Mon Mar 18 19:41:51 UTC 2024
;; MSG SIZE  rcvd: 523

```

That was the long form of `dig`.  Let's use the `+short` option for both named ports:

```
$ kubectl exec debug -- dig +short _kilgore._tcp.bar.default.svc.cluster.local SRV
0 33 1234 foo2.bar.default.svc.cluster.local.
0 33 1234 dnsutils.bar.default.svc.cluster.local.
0 33 1234 foo.bar.default.svc.cluster.local.
$ kubectl exec debug -- dig +short _trout._udp.bar.default.svc.cluster.local SRV
0 33 5678 foo2.bar.default.svc.cluster.local.
0 33 5678 dnsutils.bar.default.svc.cluster.local.
0 33 5678 foo.bar.default.svc.cluster.local.
```

> Note that I found the SRV records return the same information regardless of whether the port name and protocol are prefixed by an underscore (`_`) as the docs suggest.

Let's turn it into a normal Service with a `ClusterIP`.  Here are the same instructions as above:

```bash
$ kubectl delete -f service.yaml
$ sed -i '/clusterIP: None/d' service.yaml
$ kubectl apply -f service.yaml
```

Let's see the IP address that has been assigned:

```bash
$ kubectl get svc -l name=svc-bar
NAME   TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)             AGE
bar    ClusterIP   10.96.221.177   <none>        1234/TCP,5678/UDP   5m55s
```

And the SRV record:

```bash
$ kubectl exec debug -- dig _kilgore._tcp.bar.default.svc.cluster.local SRV

; <<>> DiG 9.18.24-1-Debian <<>> _kilgore._tcp.bar.default.svc.cluster.local SRV
;; global options: +cmd
;; Got answer:
;; WARNING: .local is reserved for Multicast DNS
;; You are currently testing what happens when an mDNS query is leaked to DNS
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 39593
;; flags: qr aa rd; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 2
;; WARNING: recursion requested but not available

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
; COOKIE: 566f507c65539ddc (echoed)
;; QUESTION SECTION:
;_kilgore._tcp.bar.default.svc.cluster.local. IN        SRV

;; ANSWER SECTION:
_kilgore._tcp.bar.default.svc.cluster.local. 30 IN SRV 0 100 1234 bar.default.svc.cluster.local.

;; ADDITIONAL SECTION:
bar.default.svc.cluster.local. 30 IN    A       10.96.221.177

;; Query time: 0 msec
;; SERVER: 10.96.0.10#53(10.96.0.10) (UDP)
;; WHEN: Mon Mar 18 19:53:09 UTC 2024
;; MSG SIZE  rcvd: 221

```

You can still query the SRV record by the `_port-name._protocol` form, but it will return that of the `Service`:

```bash
$ kubectl exec debug -- dig +short _kilgore._tcp.bar.default.svc.cluster.local SRV
0 100 1234 bar.default.svc.cluster.local.
$ kubectl exec debug -- dig +short _trout._udp.bar.default.svc.cluster.local SRV
0 100 5678 bar.default.svc.cluster.local.
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

---

What happens when the internal DNS server cannot resolve a hostname?  It will send it upstream, which in this case will be one of the Nodes.  Here is the `beta-worker` Node's `/etc/resolv.conf` with its nameserver listed, which in my case happens to be a `bridge` device to which all of the `veth` pairs have one end connected (the other end is in another `net` namespace).  These requests will then in turn get sent to the next upstream resolver.

> Check out my article on [Linux Container Networking] to learn more about the `net` namespace, virtual ethernet adapters and how container orchestrators will create Pod networking.

```bash
$ docker exec -it beta-worker cat /etc/resolv.conf
search home
nameserver 172.18.0.1
options ndots:0
$
$ ip a show br-a6972fbee62e
5: br-a6972fbee62e: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:45:3c:b2:ca brd ff:ff:ff:ff:ff:ff
    inet 172.18.0.1/16 brd 172.18.255.255 scope global br-a6972fbee62e
       valid_lft forever preferred_lft forever
    inet6 fc00:f853:ccd:e793::1/64 scope global
       valid_lft forever preferred_lft forever
    inet6 fe80::42:45ff:fe3c:b2ca/64 scope link
       valid_lft forever preferred_lft forever
    inet6 fe80::1/64 scope link
       valid_lft forever preferred_lft forever
$
$ ip link list master br-a6972fbee62e
7: veth30ce669@if6: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master br-a6972fbee62e state UP mode DEFAULT group default
    link/ether 82:a7:bb:27:b2:86 brd ff:ff:ff:ff:ff:ff link-netnsid 0
9: veth9b4ec1d@if8: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master br-a6972fbee62e state UP mode DEFAULT group default
    link/ether 96:46:6f:8a:b6:5b brd ff:ff:ff:ff:ff:ff link-netnsid 1
11: veth4366ae6@if10: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master br-a6972fbee62e state UP mode DEFAULT group default
    link/ether 9a:e3:8c:8a:bc:a0 brd ff:ff:ff:ff:ff:ff link-netnsid 3
13: veth31754a5@if12: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master br-a6972fbee62e state UP mode DEFAULT group default
    link/ether ee:9a:5e:ab:ed:06 brd ff:ff:ff:ff:ff:ff link-netnsid 2
15: vethf6d50eb@if14: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master br-a6972fbee62e state UP mode DEFAULT group default
    link/ether f2:a7:5f:79:42:47 brd ff:ff:ff:ff:ff:ff link-netnsid 4
```

## Conclusion

So, there you have it.  We've all learned something, and we've done it *together*, like a couple of *pals*.

## References

- [DNS for Services and Pods]
- [Kubernetes DNS-Based Service Discovery](https://github.com/kubernetes/dns/blob/master/docs/specification.md)
- [Using CoreDNS for Service Discovery](https://kubernetes.io/docs/tasks/administer-cluster/coredns/)
- [Kubernetes CoreDNS](https://4sysops.com/archives/kubernetes-coredns/)
- [Linux Container Networking]

[DNS]: https://en.wikipedia.org/wiki/Domain_Name_System
[Kubernetes]: https://kubernetes.io/
[DNS for Services and Pods]: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
[`.spec.dnsPolicy`]: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#pod-s-dns-policy
[service discovery]: https://en.wikipedia.org/wiki/Service_discovery
[CoreDNS]: https://coredns.io/
[`kubelet`]: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
[`ps`]: https://www.man7.org/linux/man-pages/man1/ps.1.html
[`awk`]: https://www.man7.org/linux/man-pages/man1/awk.1p.html
[`ping`]: https://www.man7.org/linux/man-pages/man8/ping.8.html
[`dig`]: https://man.archlinux.org/man/dig.1
[`kind`]: https://kind.sigs.k8s.io/
[capability]: https://www.man7.org/linux/man-pages/man7/capabilities.7.html
[`iptables`]: https://www.man7.org/linux/man-pages/man8/iptables.8.html
[the `log` plugin]: https://coredns.io/plugins/log/
[the `reload` plugin]: https://coredns.io/plugins/reload/
[`kubeadm`]: https://kubernetes.io/docs/reference/setup-tools/kubeadm/
[`minikube`]: https://minikube.sigs.k8s.io/docs/
[`/etc/resolv.conf`]: https://www.man7.org/linux/man-pages/man5/resolv.conf.5.html
[`Corefile`]: https://coredns.io/2017/07/23/corefile-explained/
[A]: https://www.cloudflare.com/learning/dns/dns-records/dns-a-record/
[AAAA]: https://www.cloudflare.com/learning/dns/dns-records/dns-aaaa-record/
[`fqdn`]: https://en.wikipedia.org/wiki/Fully_qualified_domain_name
[Linux Container Networking]: /2023/11/28/on-linux-container-networking/
[headless]: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services

