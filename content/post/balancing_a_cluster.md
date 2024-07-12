+++
title = "On Balancing A Cluster"
date = "2024-04-06T12:52:26-04:00"
draft = true

+++

- [Kind](#kind)
- [Cluster Creation](#cluster-creation)
- [`descheduler`](#descheduler)
- [Cluster Deletion](#cluster-deletion)
- [Affinity](#affinity)
    + [Node Affinity](#node-affinity)
    + [Weight](#weight)
- [Pod Topology Spread Constraints](#pod-topology-spread-constraints)
- [Cluster-level Default Constraints](#cluster-level-default-constraints)
- [FAQ](#faq)
- [Vagrantfile](#vagrantfile)
- [References](#references)

The scheduler's decisions, whether or where a Pod can or can not be scheduled, are guided by its configurable policy which comprises of set of rules, called predicates and priorities.

## Kind

## Cluster Creation

```bash
$ kind create cluster --config - << EOF
apiVersion: kind.x-k8s.io/v1alpha4
kind: Cluster
nodes:
- role: control-plane
- role: worker
- role: worker
- role: worker
- role: worker
EOF
```

## `descheduler`

In this section, we're going to take a look at how we can deploy resources into a cluster and then imbalance it.  This will then be remedied by the [`descheduler`] tool.

Deploy:

```bash
$ git clone git@github.com:btoll/kubernetes-manifests.git
$ kubectl apply -f kubernetes-manifests/benjamintoll/deployment.yaml -f kubernetes-manifests/theowlsnestfarm
deployment.apps/benjamintoll created
deployment.apps/theowlsnestfarm created
```

The state should look something like this, spread out across the worker nodes as determined by the scheduler:

```bash
$ k get po -owide
NAME                               READY   STATUS    RESTARTS   AGE   IP           NODE           NOMINATED NODE   READINESS GATES
benjamintoll-54486f469f-7ncjs      1/1     Running   0          29s   10.244.2.3   kind-worker    <none>           <none>
benjamintoll-54486f469f-d7vm2      1/1     Running   0          29s   10.244.3.3   kind-worker3   <none>           <none>
benjamintoll-54486f469f-glrbr      1/1     Running   0          29s   10.244.4.3   kind-worker4   <none>           <none>
benjamintoll-54486f469f-t9kfs      1/1     Running   0          29s   10.244.1.3   kind-worker2   <none>           <none>
benjamintoll-54486f469f-tbpxl      1/1     Running   0          29s   10.244.2.2   kind-worker    <none>           <none>
theowlsnestfarm-5d88cbd54b-22qs9   1/1     Running   0          29s   10.244.4.4   kind-worker4   <none>           <none>
theowlsnestfarm-5d88cbd54b-5jbfj   1/1     Running   0          29s   10.244.2.4   kind-worker    <none>           <none>
theowlsnestfarm-5d88cbd54b-7wz7h   1/1     Running   0          29s   10.244.1.2   kind-worker2   <none>           <none>
theowlsnestfarm-5d88cbd54b-99dxd   1/1     Running   0          29s   10.244.4.2   kind-worker4   <none>           <none>
theowlsnestfarm-5d88cbd54b-nt49s   1/1     Running   0          29s   10.244.3.2   kind-worker3   <none>           <none>
```

Now, drain all the worker nodes except for one so the cluster becomes massively imbalanced:

```bash
$ kubectl drain kind-worker kind-worker2 kind-worker3 --ignore-daemonsets
node/kind-worker cordoned
node/kind-worker2 cordoned
node/kind-worker3 cordoned
Warning: ignoring DaemonSet-managed Pods: kube-system/kindnet-k9zv8, kube-system/kube-proxy-9w4qm
evicting pod default/theowlsnestfarm-5d88cbd54b-5jbfj
evicting pod default/benjamintoll-54486f469f-7ncjs
evicting pod default/benjamintoll-54486f469f-tbpxl
pod/theowlsnestfarm-5d88cbd54b-5jbfj evicted
pod/benjamintoll-54486f469f-tbpxl evicted
pod/benjamintoll-54486f469f-7ncjs evicted
node/kind-worker drained
Warning: ignoring DaemonSet-managed Pods: kube-system/kindnet-n7qf9, kube-system/kube-proxy-67pmg
evicting pod default/theowlsnestfarm-5d88cbd54b-7wz7h
evicting pod default/benjamintoll-54486f469f-t9kfs
pod/theowlsnestfarm-5d88cbd54b-7wz7h evicted
pod/benjamintoll-54486f469f-t9kfs evicted
node/kind-worker2 drained
Warning: ignoring DaemonSet-managed Pods: kube-system/kindnet-tn24j, kube-system/kube-proxy-6rsl8
evicting pod default/theowlsnestfarm-5d88cbd54b-nt49s
evicting pod default/benjamintoll-54486f469f-d7vm2
pod/benjamintoll-54486f469f-d7vm2 evicted
pod/theowlsnestfarm-5d88cbd54b-nt49s evicted
node/kind-worker3 drained
```

> Interestingly, if all nodes are drained the scheduler won't be able to place any of the Pods, and they will all be in a perpetual state of `Pending`.  As soon as a node is uncordoned, the Pods are immediately scheduled to it.

Let's take a look at the state of the cluster:

```bash
$ kubectl get no
NAME                 STATUS                     ROLES           AGE     VERSION
kind-control-plane   Ready                      control-plane   4m19s   v1.29.2
kind-worker          Ready,SchedulingDisabled   <none>          3m59s   v1.29.2
kind-worker2         Ready,SchedulingDisabled   <none>          4m      v1.29.2
kind-worker3         Ready,SchedulingDisabled   <none>          3m59s   v1.29.2
kind-worker4         Ready                      <none>          3m55s   v1.29.2
$
$ kubectl get po -owide
NAME                               READY   STATUS    RESTARTS   AGE     IP            NODE           NOMINATED NODE   READINESS GATES
benjamintoll-54486f469f-5j5n6      1/1     Running   0          3m      10.244.4.5    kind-worker4   <none>           <none>
benjamintoll-54486f469f-8xp9h      1/1     Running   0          2m59s   10.244.4.8    kind-worker4   <none>           <none>
benjamintoll-54486f469f-glrbr      1/1     Running   0          3m54s   10.244.4.3    kind-worker4   <none>           <none>
benjamintoll-54486f469f-kw45g      1/1     Running   0          3m      10.244.4.7    kind-worker4   <none>           <none>
benjamintoll-54486f469f-vr7fl      1/1     Running   0          2m57s   10.244.4.11   kind-worker4   <none>           <none>
theowlsnestfarm-5d88cbd54b-22qs9   1/1     Running   0          3m54s   10.244.4.4    kind-worker4   <none>           <none>
theowlsnestfarm-5d88cbd54b-5s557   1/1     Running   0          3m      10.244.4.6    kind-worker4   <none>           <none>
theowlsnestfarm-5d88cbd54b-99dxd   1/1     Running   0          3m54s   10.244.4.2    kind-worker4   <none>           <none>
theowlsnestfarm-5d88cbd54b-sfslh   1/1     Running   0          2m57s   10.244.4.10   kind-worker4   <none>           <none>
theowlsnestfarm-5d88cbd54b-wn5d4   1/1     Running   0          2m59s   10.244.4.9    kind-worker4   <none>           <none>
```

Bring the other nodes back online:

```bash
$ k uncordon kind-worker kind-worker2 kind-worker3
node/kind-worker uncordoned
node/kind-worker2 uncordoned
node/kind-worker3 uncordoned
$
$ kubectl get no
NAME                 STATUS   ROLES           AGE   VERSION
kind-control-plane   Ready    control-plane   21m   v1.29.2
kind-worker          Ready    <none>          21m   v1.29.2
kind-worker2         Ready    <none>          20m   v1.29.2
kind-worker3         Ready    <none>          21m   v1.29.2
kind-worker4         Ready    <none>          21m   v1.29.2
```

However, the Pods won't be automatically spread over the nodes that just came back "online".  All of the Pods are still deployed on one node (`kind-worker4`), and the cluster is still massively imbalanced.

> Any new subsequent Pod resources **will** be scheduled across all available nodes.

Let's now install the descheduler as a job using Kustomize and watch the cluster become re-balanced:

```bash
$ kubectl apply -k github.com/kubernetes-sigs/descheduler/kubernetes/job?ref=v0.29.0
$
$ watch -n1 kubectl get po -owide
$ k get po -owide
NAME                               READY   STATUS    RESTARTS   AGE     IP            NODE           NOMINATED NODE   READINESS GATES
benjamintoll-54486f469f-4xbtz      1/1     Running   0          27s     10.244.3.5    kind-worker3   <none>           <none>
benjamintoll-54486f469f-5j5n6      1/1     Running   0          7m20s   10.244.4.5    kind-worker4   <none>           <none>
benjamintoll-54486f469f-glrbr      1/1     Running   0          8m14s   10.244.4.3    kind-worker4   <none>           <none>
benjamintoll-54486f469f-kqdtg      1/1     Running   0          28s     10.244.2.5    kind-worker    <none>           <none>
benjamintoll-54486f469f-lgtzx      1/1     Running   0          28s     10.244.1.5    kind-worker2   <none>           <none>
theowlsnestfarm-5d88cbd54b-2xm4w   1/1     Running   0          28s     10.244.3.6    kind-worker3   <none>           <none>
theowlsnestfarm-5d88cbd54b-5bk7l   1/1     Running   0          28s     10.244.1.4    kind-worker2   <none>           <none>
theowlsnestfarm-5d88cbd54b-99dxd   1/1     Running   0          8m14s   10.244.4.2    kind-worker4   <none>           <none>
theowlsnestfarm-5d88cbd54b-c99mg   1/1     Running   0          28s     10.244.2.6    kind-worker    <none>           <none>
theowlsnestfarm-5d88cbd54b-sfslh   1/1     Running   0          7m17s   10.244.4.10   kind-worker4   <none>           <none>
```

You can tell by the age of some of the Pods that some were removed from `kind-worker4` by termination and then re-created on the available nodes while others remained as they were on `kind-worker4`.

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## Cluster Deletion

```bash
$ kind delete cluster
Deleting cluster "kind" ...
Deleted nodes: ["kind-worker4" "kind-control-plane" "kind-worker2" "kind-worker3" "kind-worker"]
```

## Affinity

Before we start, let's create a new cluster with some custom node labels:

```bash
$ kind create cluster --config - << EOF
apiVersion: kind.x-k8s.io/v1alpha4
kind: Cluster
nodes:
- role: control-plane
- role: worker
  labels:
    region: us-east-1
- role: worker
  labels:
    region: eu-west-1
- role: worker
  labels:
    region: eu-central-1
- role: worker
  labels:
    region: us-east-1
    zone: use1-az4
EOF
```

View the labels:

```bash
$ k get no kind-worker4 -ojsonpath='{.metadata.labels}' | jq
{
  "beta.kubernetes.io/arch": "amd64",
  "beta.kubernetes.io/os": "linux",
  "kubernetes.io/arch": "amd64",
  "kubernetes.io/hostname": "kind-worker4",
  "kubernetes.io/os": "linux",
  "region": "us-east-1",
  "zone": "use1-az4"
}
```

Two types:

- node affinity
    + conceptually similar to `nodeSelector`, allowing you to constrain which nodes your Pod can be scheduled on based on node label
    + requiredDuringSchedulingIgnoredDuringExecution
    + preferredDuringSchedulingIgnoredDuringExecution

    > These two types both contain `IgnoredDuringExecution`, which means that the Pods will contain to run on the node even if the labels are changed after having been scheduled.

- inter-pod affinity / anti-affinity

### Node Affinity

Before moving onto more real-world scenarios, let's demonstrate an example of "pinning" all Pods to one node using both node affinity and a node selector to understand how each one works (just the Pod spec portion of the deployment will be shown):

`kubernetes-manifests/theowlsnestfarm/deployment.yaml`

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: kubernetes.io/hostname
            operator: In
            values:
              - kind-worker
  containers:
    - name: theowlsnestfarm
      image: btoll/owlsnestfarm:latest
      ports:
        - name: http-port
          containerPort: 80
```

```bash
$ kubectl apply -f kubernetes-manifests/theowlsnestfarm/deployment.yaml
$ kubectl get po -owide
NAME                               READY   STATUS    RESTARTS   AGE     IP            NODE           NOMINATED NODE   READINESS GATES
theowlsnestfarm-7c44f5b8b4-6lgfq   1/1     Running   0          6s      10.244.2.13   kind-worker    <none>           <none>
theowlsnestfarm-7c44f5b8b4-9qcbb   1/1     Running   0          6s      10.244.2.9    kind-worker    <none>           <none>
theowlsnestfarm-7c44f5b8b4-cdzws   1/1     Running   0          6s      10.244.2.11   kind-worker    <none>           <none>
theowlsnestfarm-7c44f5b8b4-lp5mz   1/1     Running   0          6s      10.244.2.10   kind-worker    <none>           <none>
theowlsnestfarm-7c44f5b8b4-lrcz2   1/1     Running   0          6s      10.244.2.12   kind-worker    <none>           <none>
```

And, using a `nodeSelector`:

```yaml
spec:
  nodeSelector:
    kubernetes.io/hostname: kind-worker
  containers:
    - name: theowlsnestfarm
      image: btoll/owlsnestfarm:latest
      ports:
        - name: http-port
          containerPort: 80
```

Ok, with that out of the way, let's just focus on the node affinity configuration of the Pod spec (`.spec.affinity.nodeAffinity`):

`kubernetes-manifests/theowlsnestfarm/deployment.yaml`

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: region
            operator: In
            values:
              - us-east-1
              - eu-central-1
  containers:
    - name: theowlsnestfarm
      image: btoll/owlsnestfarm:latest
      ports:
        - name: http-port
          containerPort: 80
```

After the deployment is applied, let's see how they were scheduled:

```bash
$ k get po -owide
NAME                              READY   STATUS    RESTARTS   AGE     IP           NODE           NOMINATED NODE   READINESS GATES
theowlsnestfarm-df6f977ff-48bgr   1/1     Running   0          3m39s   10.244.1.3   kind-worker    <none>           <none>
theowlsnestfarm-df6f977ff-jkgvg   1/1     Running   0          3m43s   10.244.1.2   kind-worker    <none>           <none>
theowlsnestfarm-df6f977ff-lxjb2   1/1     Running   0          3m39s   10.244.4.3   kind-worker4   <none>           <none>
theowlsnestfarm-df6f977ff-qskq7   1/1     Running   0          3m43s   10.244.4.2   kind-worker4   <none>           <none>
theowlsnestfarm-df6f977ff-rjfbj   1/1     Running   0          3m43s   10.244.2.2   kind-worker3   <none>           <none>
```

That looks right.  As a sanity, let's list just the nodes that match at least one of the specified labels:

```bash
$ k get no -l region=us-east-1 --no-headers && k get no -l region=eu-central-1 --no-headers
kind-worker    Ready   <none>   13m   v1.29.2
kind-worker4   Ready   <none>   13m   v1.29.2
kind-worker3   Ready   <none>   13m   v1.29.2
```

Let's adjust the affinity terms so that a Pod can only be deployed onto a node that is either in `region` `eu-central-1` or `zone` `use1-az4`:

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: region
            operator: In
            values:
              - eu-central-1
          - key: zone
            operator: In
            values:
              - use1-az4
  containers:
    - name: theowlsnestfarm
      image: btoll/owlsnestfarm:latest
      ports:
        - name: http-port
          containerPort: 80
```

And the result:

```bash
$ k get po -owide
NAME                               READY   STATUS    RESTARTS   AGE   IP       NODE     NOMINATED NODE   READINESS GATES
theowlsnestfarm-74f546cd9d-5vwrd   0/1     Pending   0          6s    <none>   <none>   <none>           <none>
theowlsnestfarm-74f546cd9d-g66kz   0/1     Pending   0          6s    <none>   <none>   <none>           <none>
theowlsnestfarm-74f546cd9d-hhhtj   0/1     Pending   0          6s    <none>   <none>   <none>           <none>
theowlsnestfarm-74f546cd9d-mp79l   0/1     Pending   0          6s    <none>   <none>   <none>           <none>
theowlsnestfarm-74f546cd9d-nmlfm   0/1     Pending   0          6s    <none>   <none>   <none>           <none>
```

What happened?  Well, if there is only one `matchExpressions`, then all terms in it are `AND'd`.  If we want the terms to be `OR'd`, then we need to have multiple `matchExpressions` like the following:

And, now they've only been to deployed to `kind-worker4`, the only node that satisfies the node affinity terms:

```bash
$ k get po -owide
NAME                               READY   STATUS    RESTARTS   AGE   IP            NODE           NOMINATED NODE   READINESS GATES
theowlsnestfarm-7b847c7df7-8l5p9   1/1     Running   0          4s    10.244.4.19   kind-worker4   <none>           <none>
theowlsnestfarm-7b847c7df7-nl668   1/1     Running   0          4s    10.244.4.18   kind-worker4   <none>           <none>
theowlsnestfarm-7b847c7df7-nwx6d   1/1     Running   0          4s    10.244.4.17   kind-worker4   <none>           <none>
theowlsnestfarm-7b847c7df7-qrttl   1/1     Running   0          4s    10.244.2.12   kind-worker3   <none>           <none>
theowlsnestfarm-7b847c7df7-sbcqd   1/1     Running   0          4s    10.244.2.13   kind-worker3   <none>           <none>
```

> Again, notice how the pods now have a different name, as they were terminated and re-created.  Kubernetes does not move Pods from one node to another.

### Weight

The `preferredDuringSchedulingIgnoredDuringExecution` affinity type supports a `weight` between 1 and 100.

```yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: kubernetes.io/os
            operator: In
            values:
            - linux
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 1
        preference:
          matchExpressions:
          - key: label-1
            operator: In
            values:
            - key-1
      - weight: 50
        preference:
          matchExpressions:
          - key: label-2
            operator: In
            values:
            - key-2
```

## Pod Topology Spread Constraints

[`topologySpreadConstraints` field]:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example-pod
spec:
  # Configure a topology spread constraint
  topologySpreadConstraints:
    - maxSkew: <integer>
      minDomains: <integer> # optional; beta since v1.25
      topologyKey: <string>
      whenUnsatisfiable: <string>
      labelSelector: <object>
      matchLabelKeys: <list> # optional; beta since v1.27
      nodeAffinityPolicy: [Honor|Ignore] # optional; beta since v1.26
      nodeTaintsPolicy: [Honor|Ignore] # optional; beta since v1.26
  ### other Pod fields go here
```

The `whenUnsatisfiable` values:
- `DoNotSchedule` (default) tells the scheduler not to schedule it
- `ScheduleAnyway` tells the scheduler to still schedule it while prioritizing nodes that minimize the skew

Create the cluster with the necessary labels.  The label key will be used as the `topologyKey`:

```bash
$ kind create cluster --config - << EOF
apiVersion: kind.x-k8s.io/v1alpha4
kind: Cluster
nodes:
- role: control-plane
- role: worker
  labels:
    region: eu-west-1
    zone: eu-west-1a
- role: worker
  labels:
    region: eu-west-1
    zone: eu-west-1b
- role: worker
  labels:
    region: eu-west-1
    zone: eu-west-1c
- role: worker
EOF
```

## Cluster-level Default Constraints

Defaults:

```yaml
defaultConstraints:
  - maxSkew: 3
    topologyKey: "kubernetes.io/hostname"
    whenUnsatisfiable: ScheduleAnyway
  - maxSkew: 5
    topologyKey: "topology.kubernetes.io/zone"
    whenUnsatisfiable: ScheduleAnyway
```

Example:

```yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration

profiles:
  - schedulerName: default-scheduler
    pluginConfig:
      - name: PodTopologySpread
        args:
          defaultConstraints:
            - maxSkew: 1
              topologyKey: topology.kubernetes.io/zone
              whenUnsatisfiable: ScheduleAnyway
          defaultingType: List
```

```bash
$ kind create cluster --config - << EOF
apiVersion: kind.x-k8s.io/v1alpha4
kind: Cluster
nodes:
- role: control-plane
- role: worker
- role: worker
- role: worker
- role: worker
EOF
```

It is possible to set default topology spread constraints for a cluster.  Default topology spread constraints are applied to a Pod if, and only if:

- it doesn't define any constraints in its `.spec.topologySpreadConstraints`
- it belongs to a `Service`, `ReplicaSet`, `StatefulSet` or `ReplicationController`

## FAQ

**How can nodes become unbalanced?**

Doing a rolling upgrade of nodes or doing a rolling update of a deployment after a node failure can lead to unbalanced situations.

> This issue can be resolved by applying a deployment manifest with one replica. If you then re-apply your original deployment manifest with the correct number of replicas it will be rebalanced.  Not ideal but an easy method.

**How does the descheduler evaluate CPU/memory utilization?**

It is based on the Pod resource requests, just like the scheduler.

## Misc

Drain and delete a node:

```bash
$ kubectl drain kind-worker --ignore-daemonsets
$ kubectl delete no kind-worker
```

Drain and reschedule a node:

```bash
$ kubectl drain kind-worker --ignore-daemonsets
$ kubectl uncordon kind-worker
```

## Vagrantfile

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :

unless Vagrant.has_plugin?("vagrant-disksize")
    raise  Vagrant::Errors::VagrantError.new, "vagrant-disksize plugin is missing. Please install it using 'vagrant plugin install vagrant-disksize' and rerun 'vagrant up'"
end

Vagrant.configure("2") do |config|
    config.vm.box = "debian/bookworm64"
    config.vm.hostname = "vagrant-kind"

    config.vm.synced_folder ".", "/vagrant"
    config.ssh.forward_agent = true

    config.vm.provider "virtualbox" do |vb|
        vb.cpus = 4
        vb.gui = false
        vb.memory = 8192
        vb.name = "kind"
    end

    config.vm.provision "shell", inline: <<-SHELL
        apt-get update && \
        apt-get install -y \
            apt-transport-https \
            build-essential \
            ca-certificates \
            curl \
            git \
            gnupg2 \
            wget

        # Fixes the "-bash: warning: setlocale: LC_ALL: cannot change locale (en_IN.UTF-8)" warning.
        # Also, fixes the same warnings for Perl.
        localedef -i en_US -f UTF-8 en_US.UTF-8

        # Install Docker.
        # https://docs.docker.com/engine/install/debian/
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/debian/gpg \
            | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg

        echo \
          "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] \
          https://download.docker.com/linux/debian \
          "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" \
          | tee /etc/apt/sources.list.d/docker.list > /dev/null

        # Install Docker Engine.
        apt-get update && \
        apt-get install -y \
            containerd.io \
            docker-buildx-plugin \
            docker-ce \
            docker-ce-cli \
            docker-compose-plugin

        usermod -aG docker vagrant

        # Install Kind.
        [ $(uname -m) = x86_64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64
        chmod +x ./kind
        mv ./kind /usr/local/bin/kind

        # Install kubectl.
        curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key \
            | gpg --dearmor -o /usr/share/keyrings/kubernetes-apt-keyring.gpg
        echo "deb [signed-by=/usr/share/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" \
            | tee /etc/apt/sources.list.d/kubernetes.list
        apt-get update
        apt-get install -y kubectl

        # Install Flux.
        curl -o /tmp/flux.tar.gz -sLO https://github.com/fluxcd/flux2/releases/download/v2.2.3/flux_2.2.3_linux_amd64.tar.gz
        tar -C /tmp/ -zxvf /tmp/flux.tar.gz
        mv /tmp/flux /usr/local/bin
    SHELL
end
```

## References

- [`descheduler`]
- [Assigning Pods to Nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Pod Topology Spread Constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- [topology.kubernetes.io/region](https://kubernetes.io/docs/reference/labels-annotations-taints/#topologykubernetesioregion)
- [topology.kubernetes.io/zone](https://kubernetes.io/docs/reference/labels-annotations-taints/#topologykubernetesiozone)
- [Keep your Kubernetes cluster balanced: the secret to High Availability](https://itnext.io/keep-you-kubernetes-cluster-balanced-the-secret-to-high-availability-17edf60d9cb7)
- [Custom Kube-Scheduler: Why And How to Set it Up in Kubernetes](https://cast.ai/blog/custom-kube-scheduler-why-and-how-to-set-it-up-in-kubernetes/)

[`descheduler`]: https://github.com/kubernetes-sigs/descheduler
[`topologySpreadConstraints` field]: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/#topologyspreadconstraints-field

