+++
title = "On Upgrading A Kubernetes Cluster With kubeadm"
date = "2024-03-30T20:16:31-04:00"

+++

This post is not covering anything unique or groundbreaking.  In fact, you might as well just read the article [Upgrading kubeadm clusters] in the official Kubernetes documentation, as it is mainly taken from that with some other bits sprinkled in.

Go and read it now.  After all, you want to [read the original source], not something that I'm regurgitating where I may have excluded bits that are important to.

> See [Upgrading Linux nodes] for upgrading just the worker nodes.

*Caveat emptor*.

The *raison d'être* of this article is merely to serve as a quick cheat sheet when I need to perform these upgrades.

---

- [Prerequisites](#Prerequisites)
- [Upgrade Strategy](#upgrade-strategy)
- [Upgrading the Package Repository](#upgrading-the-package-repository)
- [Upgrading the Control Plane](#upgrading-the-control-plane)
    + [Upgrading `kubeadm` and Control Plane Components](#upgrading-kubeadm-and-control-plane-components)
    + [Draining the Node](#draining-the-node)
    + [Upgrading `kubelet` and `kubectl`](#upgrading-kubelet-and-kubectl)
- [Upgrading the Worker Nodes](#upgrading-the-worker-nodes)
- [Conclusion](#conclusion)
- [References](#references)

---

## Prerequisites

You might want to backup any of your workloads.  The `kubeadm` tool doesn't touch any workloads, only internal components of Kubernetes (re: the `kube-system` namespace), so any data loss is on you, friend.

Although I've never used them, there are tools on the market that will backup your clusters.  I'm not going to link to any of them.

Of course, you can always backup by doing something like this:

```bash
$ kubectl get all -A -oyaml > workloads_backup.yaml
```

Also, the Kubernetes documentation recommends to [disable swapping] for all nodes.  I'm still unclear on why, possibly for performance reasons and no guarantees for meeting stated pod memory requirements (and account for pod's memory utilization).  See the [References](#references) for a discussion of this in an issue on GitHub.

> In addition, there's also support for enabling swap that's in the works.  See the document [KEP-2400: Node system swap support].

The `kubectl` version on each node doesn't need to be the same as `kubeadm`, although that is recommended.  It does, however, need to be within the skew allowance (within 3 minor release versions).

So, if `kubeadm` is at version `1.29`, the `kubelet` must be at `1.29`, `1.28`, `1.27` or `1.26`.

## Upgrade Strategy

The upgrade strategy is relatively the same for all cluster nodes, regardless of purpose.

1. Drain the node:
    ```bash
    $ kubectl drain node-name --ignore-daemonsets
    ```
1. Cordon the node:
    ```bash
    $ kubectl cordon node-name
    ```
1. Uncordon the node:
    ```bash
    $ kubectl uncordon node-name
    ```

> A node cannot be drained (without `--force`) if it has pods that are not part of a ReplicaSet.

See a comprehensive list of everything `kubeadm` does in the [How it works] section of the docs.

## Upgrading the Package Repository

The official Kubernetes package repositories have recently changed.  You can [view the announcement on their blog] and make sure you read their [Changing The Kubernetes Package Repository] article for the details.

In the meantime, Debian and derivatives will want to add/update the repository to the following in `/etc/apt/sources.list.d/kubernetes.list`:

```
deb [signed-by=/usr/share/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.27/deb/ /
```

Currently, this will only allow us to fetch packages for the `1.27` minor version.  If we want to upgrade to `1.28`, we'll need to modify that.

This is easy-peasy:

```bash
$ sudo sed -i 's/27/28/' /etc/apt/sources.list.d/kubernetes.list
```

After saving the file, synchronize the package index files with their source, as usual:

```bash
$ sudo apt-get update
```

> `update` retrieves and scans the `Packages.gz` files, so that information about new and updated packages is available.

Then, list all the available versions for download and installation:

```bash
$ apt-cache madison kubeadm
   kubeadm | 1.28.8-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.7-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.6-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.5-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.4-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.3-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.2-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.1-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.0-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
```

By the way, what is the `apt-cache madison` operation?  From the [`apt-cache`] man page:

```
apt-cache's madison command attempts to mimic the output format and a subset of the functionality of the Debian archive management tool, madison. It displays available versions of a package in a tabular format. Unlike the original madison, it can only display information for the architecture for which APT has retrieved package lists (APT::Architecture).
```

<!--
Versions:
- nothing can be more recent than the apiserver
- control plane components are N-1
- worker node components (kubelet, kubeproxy) can be N-2
- kubectl can be N+1,N,N-1

Kubernetes only supports latest 3 releases.

If `kubeadm` was used to create the cluster:
- kubeadm upgrade plan
- kubeadm upgrade apply v.1.29.3
    + this pulls and updates the control plane component images
-->

## Upgrading the Control Plane

Whether one or many, the process of updating the master nodes is the same.  According to the docs, the nodes **must** have the `/etc/kubernetes/admin.conf` configuration file.

### Upgrading `kubeadm` and Control Plane Components

I have a local cluster on my laptop that was created by `kubeadm`.  Here is the current version of `kubeadm` on the control plane node (I only have one):

```bash
$ kubeadm version
kubeadm version: &version.Info{Major:"1", Minor:"27", GitVersion:"v1.27.12", GitCommit:"12031002905c0410706974560cbdf2dad9278919", GitTreeState:"clean", BuildDate:"2024-03-15T02:13:35Z", GoVersion:"go1.21.8", Compiler:"gc", Platform:"linux/amd64"}
```

The first thing we need to do is make sure that we have access to the correct `kubeadm` packages.

I'll need to modify the repository definition for the `1.28` version:

```bash
$ sudo sed -i 's/27/28/' /etc/apt/sources.list.d/kubernetes.list
```

Then, I can see the most recent version that is available:

```bash
$ sudo apt-get update
$ apt-cache madison kubeadm
   kubeadm | 1.28.8-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.7-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.6-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.5-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.4-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.3-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.2-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.1-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
   kubeadm | 1.28.0-1.1 | https://pkgs.k8s.io/core:/stable:/v1.28/deb  Packages
```

I'm going to update to the most recent patch version, `1.28.8`.

Now, chances are that the `kubeadm` package is on hold, meaning that when `apt-get upgrade` or `apt-get dist-upgrade` is called it won't be automatically upgraded, which could lead to bad things.

Let's find out:

```bash
$ apt-mark showhold
kubeadm
kubectl
kubelet
```

Ok, we'll need to make that available for upgrade before we can actually do it:

```bash
$ sudo apt-mark unhold kubeadm
Canceled hold on kubeadm.
$ apt-mark showhold
kubectl
kubelet
```

Now, the upgrade:

```bash
$ sudo apt-get install -y kubeadm="1.28.8-1.1"
```

And, put it back on hold:

```bash
$ sudo apt-mark hold kubeadm
kubeadm set on hold.
$ apt-mark showhold
kubeadm
kubectl
kubelet
```

Verify the new version:

```bash
$ kubeadm version
kubeadm version: &version.Info{Major:"1", Minor:"28", GitVersion:"v1.28.8", GitCommit:"fc11ff34c34bc1e6ae6981dc1c7b3faa20b1ac2d", GitTreeState:"clean", BuildDate:"2024-03-15T00:05:37Z", GoVersion:"go1.21.8", Compiler:"gc", Platform:"linux/amd64"}
```

Next, let's take a look at the upgrade plan.  Notably, this won't actually do it, much like a dry run:

```bash
$ sudo kubeadm upgrade plan
[upgrade/config] Making sure the configuration is correct:
[upgrade/config] Reading configuration from the cluster...
[upgrade/config] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -o yaml'
[preflight] Running pre-flight checks.
[upgrade] Running cluster health checks
[upgrade] Fetching available versions to upgrade to
[upgrade/versions] Cluster version: v1.27.12
[upgrade/versions] kubeadm version: v1.28.8
I0331 04:05:43.434413   86984 version.go:256] remote version is much newer: v1.29.3; falling back to: stable-1.28
[upgrade/versions] Target version: v1.28.8
[upgrade/versions] Latest version in the v1.27 series: v1.27.12

Components that must be upgraded manually after you have upgraded the control plane with 'kubeadm upgrade apply':
COMPONENT   CURRENT        TARGET
kubelet     4 x v1.27.12   v1.28.8

Upgrade to the latest stable version:

COMPONENT                 CURRENT    TARGET
kube-apiserver            v1.27.12   v1.28.8
kube-controller-manager   v1.27.12   v1.28.8
kube-scheduler            v1.27.12   v1.28.8
kube-proxy                v1.27.12   v1.28.8
CoreDNS                   v1.10.1    v1.10.1
etcd                      3.5.12-0   3.5.12-0

You can now apply the upgrade by executing the following command:

        kubeadm upgrade apply v1.28.8

_____________________________________________________________________


The table below shows the current state of component configs as understood by this version of kubeadm.
Configs that have a "yes" mark in the "MANUAL UPGRADE REQUIRED" column require manual config upgrade or
resetting to kubeadm defaults before a successful upgrade can be performed. The version to manually
upgrade to is denoted in the "PREFERRED VERSION" column.

API GROUP                 CURRENT VERSION   PREFERRED VERSION   MANUAL UPGRADE REQUIRED
kubeproxy.config.k8s.io   v1alpha1          v1alpha1            no
kubelet.config.k8s.io     v1beta1           v1beta1             no
_____________________________________________________________________

```

Note that `kubeadm` automatically upgrades the following control plane components:

- `kube-apiserver`
- `kube-controller-manager`
- `kube-scheduler`
- `kube-proxy`
- `coredns`
- `etcd`

> Bear in mind that `coredns` and `etcd` may be external to the cluster, in which case they wouldn't be automatically upgraded.  Also, they don't follow the same release numbers as the main control plane components, which are in lock-step (i.e., follow the same release schedule).

In addition, `kubeadm` will also automatically renew all of the certificates for this control plane node.

Now, the big moment, the one we've all been waiting for...the actual upgrade.  Running the command will pull and update the control plane component image, renew certificates, etc.:

```bash
$ sudo kubeadm upgrade apply v1.28.8
$ sudo kubeadm upgrade apply v1.28.8                                                                                                                                                                                                                [0/33709]
[upgrade/config] Making sure the configuration is correct:
[upgrade/config] Reading configuration from the cluster...
[upgrade/config] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -o yaml'
[preflight] Running pre-flight checks.
[upgrade] Running cluster health checks
[upgrade/version] You have chosen to change the cluster version to "v1.28.8"
[upgrade/versions] Cluster version: v1.27.12
[upgrade/versions] kubeadm version: v1.28.8
[upgrade] Are you sure you want to proceed? [y/N]: y
[upgrade/prepull] Pulling images required for setting up a Kubernetes cluster
[upgrade/prepull] This might take a minute or two, depending on the speed of your internet connection
[upgrade/prepull] You can also perform this action in beforehand using 'kubeadm config images pull'
W0331 04:17:42.239663   93449 checks.go:835] detected that the sandbox image "registry.k8s.io/pause:3.6" of the container runtime is inconsistent with that used by kubeadm. It is recommended that using "registry.k8s.io/pause:3.9" as the CRI sandbox image.
[upgrade/apply] Upgrading your Static Pod-hosted control plane to version "v1.28.8" (timeout: 5m0s)...
[upgrade/etcd] Upgrading to TLS for etcd
[upgrade/staticpods] Preparing for "etcd" upgrade
[upgrade/staticpods] Current and new manifests of etcd are equal, skipping upgrade
[upgrade/etcd] Waiting for etcd to become available
[upgrade/staticpods] Writing new Static Pod manifests to "/etc/kubernetes/tmp/kubeadm-upgraded-manifests1462742029"
[upgrade/staticpods] Preparing for "kube-apiserver" upgrade
[upgrade/staticpods] Renewing apiserver certificate
[upgrade/staticpods] Renewing apiserver-kubelet-client certificate
[upgrade/staticpods] Renewing front-proxy-client certificate
[upgrade/staticpods] Renewing apiserver-etcd-client certificate
[upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-apiserver.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2024-03-31-04-17-42/kube-apiserver.yaml"
[upgrade/staticpods] Waiting for the kubelet to restart the component
[upgrade/staticpods] This might take a minute or longer depending on the component/version gap (timeout 5m0s)
[apiclient] Found 1 Pods for label selector component=kube-apiserver
[upgrade/staticpods] Component "kube-apiserver" upgraded successfully!
[upgrade/staticpods] Preparing for "kube-controller-manager" upgrade
[upgrade/staticpods] Renewing controller-manager.conf certificate
[upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-controller-manager.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2024-03-31-04-17-42/kube-controller-manager.yaml"
[upgrade/staticpods] Waiting for the kubelet to restart the component
[upgrade/staticpods] This might take a minute or longer depending on the component/version gap (timeout 5m0s)
[apiclient] Found 1 Pods for label selector component=kube-controller-manager
[upgrade/staticpods] Component "kube-controller-manager" upgraded successfully!
[upgrade/staticpods] Preparing for "kube-scheduler" upgrade
[upgrade/staticpods] Renewing scheduler.conf certificate
[upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-scheduler.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2024-03-31-04-17-42/kube-scheduler.yaml"
[upgrade/staticpods] Waiting for the kubelet to restart the component
[upgrade/staticpods] This might take a minute or longer depending on the component/version gap (timeout 5m0s)
[apiclient] Found 1 Pods for label selector component=kube-scheduler
[upgrade/staticpods] Component "kube-scheduler" upgraded successfully!
[upload-config] Storing the configuration used in ConfigMap "kubeadm-config" in the "kube-system" Namespace
[kubelet] Creating a ConfigMap "kubelet-config" in namespace kube-system with the configuration for the kubelets in the cluster
[upgrade] Backing up kubelet config file to /etc/kubernetes/tmp/kubeadm-kubelet-config523346502/config.yaml
[kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
[bootstrap-token] Configured RBAC rules to allow Node Bootstrap tokens to get nodes
[bootstrap-token] Configured RBAC rules to allow Node Bootstrap tokens to post CSRs in order for nodes to get long term certificate credentials
[bootstrap-token] Configured RBAC rules to allow the csrapprover controller automatically approve CSRs from a Node Bootstrap Token
[bootstrap-token] Configured RBAC rules to allow certificate rotation for all node client certificates in the cluster
[addons] Applied essential addon: CoreDNS
[addons] Applied essential addon: kube-proxy

[upgrade/successful] SUCCESS! Your cluster was upgraded to "v1.28.8". Enjoy!

[upgrade/kubelet] Now that your control plane is upgraded, please proceed with upgrading your kubelets if you haven't already done so.
```

> Since `v1.28`, `kubeadm` defaults to a mode that checks whether all the control plane instances have been upgraded before starting to upgrade the addons (such as `coredns` and `kube-proxy`).

<!--
When using `kubeadm` to create a cluster, `kubelet` does not run in a pod.

When upgrading `kubectl`, you need to drain the nodes first, even the master node!
-->

It's important to know that the `kubelet` service running on the master node reports the version of the node, and this won't show the correct version until the `kubelet` itself has been upgraded.

Observe:

```bash
$ kubectl get no master-node
NAME          STATUS   ROLES           AGE   VERSION
master-node   Ready    control-plane   10d   v1.27.12
```

Next, manually update your `CNI` provider plugin.  Since I installed it as a DaemonSet, I only need to upgrade it once and not for every additional control plane node, if one or more exists.

Speaking of additional master nodes, there are some slight variations between the steps performed on the initial master node and any subsequent ones.

Specifically:

- Call `sudo kubeadm upgrade node` instead of `sudo kubeadm upgrade apply`.
- Calling `sudo kubeadm upgrade plan` and upgrading the `CNI` plugin isn't necessary, as just noted.

<!--
Upgrade `kubeadm` and `kubectl` on every node, including the control plane (and `kubectl`, if you need it).

> `kubeadm upgrade node` upgrades the local `kubelet` config for worker nodes.
-->

### Draining the Node

Draining a node means that it will both evict all workloads and that it will be marked as unschedulable, meaning that any successive calls to the `apiserver` to create a new workload won't result in the pod(s) being scheduled on the node.

```bash
$ kubectl drain master-node --ignore-daemonsets
node/master-node cordoned
Warning: ignoring DaemonSet-managed Pods: kube-system/calico-node-k5lqw, kube-system/kube-proxy-snsvr
evicting pod kube-system/coredns-5d78c9869d-gt45d
evicting pod kube-system/calico-kube-controllers-786b679988-sgvcp
evicting pod kube-system/coredns-5d78c9869d-fv497
pod/calico-kube-controllers-786b679988-sgvcp evicted
pod/coredns-5d78c9869d-fv497 evicted
pod/coredns-5d78c9869d-gt45d evicted
node/master-node drained
$
$ kubectl get no
NAME            STATUS                     ROLES           AGE   VERSION
master-node     Ready,SchedulingDisabled   control-plane   10d   v1.27.12
worker-node01   Ready                      worker          10d   v1.27.12
worker-node02   Ready                      worker          10d   v1.27.12
worker-node03   Ready                      worker          10d   v1.27.12
```

### Upgrading `kubelet` and `kubectl`

As we did for `kubeadm`, we need to release the hold on both `kubelet` and `kubectl`:

```bash
$ sudo apt-mark unhold kubelet kubectl
Canceled hold on kubelet.
Canceled hold on kubectl.
```

We'll need to upgrade them to the same version as `kubeadm`:

```bash
$ sudo apt-get install -y kubelet="1.28.8-1.1" kubectl="1.28.8-1.1"
$
$ kubectl version
Client Version: v1.28.8
Kustomize Version: v5.0.4-0.20230601165947-6ce0bf390ce3
Server Version: v1.28.8
```

And, then re-apply the hold:

```bash
$ sudo apt-mark hold kubelet kubectl
kubelet set on hold.
kubectl set on hold.
```

The `kubelet` runs as a [`systemd`] service, so we'll restart it now:

```bash
$ sudo systemctl daemon-reload
$ sudo systemctl restart kubelet
```

When the service is restarted, you might notice that the `apiserver` can't be queried right away.  After a brief pause, we see that that `kubelet` reports the correct version:

```bash
vagrant@master-node:~$ kubectl get no
NAME            STATUS                     ROLES           AGE   VERSION
master-node     Ready,SchedulingDisabled   control-plane   10d   v1.28.8
worker-node01   Ready                      worker          10d   v1.27.12
worker-node02   Ready                      worker          10d   v1.27.12
worker-node03   Ready                      worker          10d   v1.27.12
```

Lastly, we'll uncordon and bring the node back online so that new workloads can be scheduled on it (the master node may not allow workloads to be deployed onto it, depending on its [taint]):

```bash
$ kubectl uncordon master-node
node/master-node uncordoned
$ kubectl get no master-node
NAME          STATUS   ROLES           AGE   VERSION
master-node   Ready    control-plane   10d   v1.28.8
```

## Upgrading the Worker Nodes

Now that we've already upgraded the control plane node(s), upgrading the worker nodes is pretty simple, as it repeats many of the same steps.

```bash
$ sudo sed -i 's/27/28/' /etc/apt/sources.list.d/kubernetes.list
```

> If you need a deployment for your cluster, you can try the most dangerous website in the world:
> ```bash
> $ kubectl apply \
> -k https://github.com/btoll/gitops/applications/web/benjamintoll/overlays/beta
> ```
> In addition, here's a beautiful debugging application:
> ```
> $ kubectl apply\
> -k https://github.com/btoll/gitops/applications/devops/debug/overlays/beta
> ```
> Love,<br>
> Uncle Ben

Of course, the mandatory update to the package index files:

```bash
$ sudo apt-get update
```

We'll quickly run through the remaining steps, as they'll all now be familiar to you.

Release the hold on `kubeadm`, upgrade it and re-apply the hold:

```bash
$ sudo apt-mark unhold kubeadm && \
sudo apt-get install -y kubeadm="1.28.8-1.1" && \
sudo apt-mark hold kubeadm
```

Just for a sanity check, we can verify that `kubeadm` has indeed been upgraded:

```bash
$ kubeadm version
kubeadm version: &version.Info{Major:"1", Minor:"28", GitVersion:"v1.28.8", GitCommit:"fc11ff34c34bc1e6ae6981dc1c7b3faa20b1ac2d", GitTreeState:"clean", BuildDate:"2024-03-15T00:05:37Z", GoVersion:"go1.21.8", Compiler:"gc", Platform:"linux/amd64"}
```

Next, we need to upgrade the local `kubelet` configuration:

```bash
$ sudo kubeadm upgrade node
[upgrade] Reading configuration from the cluster...
[upgrade] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -o yaml'
[preflight] Running pre-flight checks
[preflight] Skipping prepull. Not a control plane node.
[upgrade] Skipping phase. Not a control plane node.
[upgrade] Backing up kubelet config file to /etc/kubernetes/tmp/kubeadm-kubelet-config2323660758/config.yaml
[kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
[upgrade] The configuration for this node was successfully updated!
[upgrade] Now you should go ahead and upgrade the kubelet package using your package manager.
```

Note, that this is subtly different from how we upgraded the master node.

Before we drain the node, let's see how the pods are spread across the available nodes:

```bash
$ kubectl get po -owide
NAME                            READY   STATUS    RESTARTS   AGE   IP              NODE            NOMINATED NODE   READINESS GATES
benjamintoll-64977f4cc6-brmbc   1/1     Running   0          20m   172.16.158.7    worker-node02   <none>           <none>
benjamintoll-64977f4cc6-h2chv   1/1     Running   0          20m   172.16.158.8    worker-node02   <none>           <none>
benjamintoll-64977f4cc6-p7g5v   1/1     Running   0          20m   172.16.191.73   worker-node03   <none>           <none>
benjamintoll-64977f4cc6-vgl8v   1/1     Running   0          20m   172.16.87.205   worker-node01   <none>           <none>
benjamintoll-64977f4cc6-w29j4   1/1     Running   0          20m   172.16.87.204   worker-node01   <none>           <none>
benjamintoll-64977f4cc6-xmqvj   1/1     Running   0          20m   172.16.191.72   worker-node03   <none>           <none>
```

Evenly.

Now, we'll drain the `worker-node01` node:

```bash
$ kubectl drain worker-node01 --ignore-daemonsets
```

And, then check the pods to view the distribution:

```bash
NAME                            READY   STATUS    RESTARTS   AGE   IP              NODE            NOMINATED NODE   READINESS GATES
benjamintoll-64977f4cc6-9mmql   1/1     Running   0          8s    172.16.158.10   worker-node02   <none>           <none>
benjamintoll-64977f4cc6-brmbc   1/1     Running   0          23m   172.16.158.7    worker-node02   <none>           <none>
benjamintoll-64977f4cc6-h2chv   1/1     Running   0          23m   172.16.158.8    worker-node02   <none>           <none>
benjamintoll-64977f4cc6-p7g5v   1/1     Running   0          23m   172.16.191.73   worker-node03   <none>           <none>
benjamintoll-64977f4cc6-x78st   1/1     Running   0          8s    172.16.191.74   worker-node03   <none>           <none>
benjamintoll-64977f4cc6-xmqvj   1/1     Running   0          23m   172.16.191.72   worker-node03   <none>           <none>
```

The remaining nodes will now have the workloads scheduled on them.  Note that the pods are first destroyed and then recreated, they are never moved.

Of course, draining the node also makes it unschedulable:

```bash
$ kubectl get no
NAME            STATUS                     ROLES           AGE   VERSION
master-node     Ready                      control-plane   11d   v1.28.8
worker-node01   Ready,SchedulingDisabled   worker          11d   v1.27.12
worker-node02   Ready                      worker          11d   v1.27.12
worker-node03   Ready                      worker          11d   v1.27.12
```

We're no safe to upgrade both `kubelet` and `kubectl`, although the latter doesn't need to be (in fact, it may not even be installed on the node).

```bash
$ sudo apt-mark unhold kubelet kubectl && \
sudo apt-get install -y kubelet="1.28.8-1.1" kubectl="1.28.8-1.1" && \
sudo apt-mark hold kubelet kubectl
```

```bash
$ kubectl version
Client Version: v1.28.8
Kustomize Version: v5.0.4-0.20230601165947-6ce0bf390ce3
Server Version: v1.28.8
```

`kubelet` is managed as a service by `systemd`, so we'll need to restart it:

```bash
$ sudo systemctl daemon-reload
$ sudo systemctl restart kubelet
```

> `systemctl daemon-reload` reloads the complete daemon configuration (like `SIGHUP`).

Ok, great.  The last thing we need to do is uncordon the node so it can have workloads scheduled on it again.  For instance, we can see that it's still unavailable:

```bash
$ kubectl get no
NAME            STATUS                     ROLES           AGE   VERSION
master-node     Ready                      control-plane   11d   v1.28.8
worker-node01   Ready,SchedulingDisabled   worker          11d   v1.28.8
worker-node02   Ready                      worker          11d   v1.27.12
worker-node03   Ready                      worker          11d   v1.27.12
```

> We didn't need to explicitly cordon the node (`kubectl cordon node-name`) because `kubectl drain` will also do that.

We'll now make it available and see that it's ready to have new workloads scheduled to it:

```bash
$ kubectl uncordon worker-node01
node/worker-node01 uncordoned
vagrant@worker-node01:~$ kubectl get no
NAME            STATUS   ROLES           AGE   VERSION
master-node     Ready    control-plane   11d   v1.28.8
worker-node01   Ready    worker          11d   v1.28.8
worker-node02   Ready    worker          11d   v1.27.12
worker-node03   Ready    worker          11d   v1.27.12
```

Let's check the distribution of the workloads:

```bash
$ kubectl get po -owide
NAME                            READY   STATUS    RESTARTS   AGE   IP              NODE            NOMINATED NODE   READINESS GATES
benjamintoll-64977f4cc6-9mmql   1/1     Running   0          42m   172.16.158.10   worker-node02   <none>           <none>
benjamintoll-64977f4cc6-brmbc   1/1     Running   0          65m   172.16.158.7    worker-node02   <none>           <none>
benjamintoll-64977f4cc6-h2chv   1/1     Running   0          65m   172.16.158.8    worker-node02   <none>           <none>
benjamintoll-64977f4cc6-p7g5v   1/1     Running   0          65m   172.16.191.73   worker-node03   <none>           <none>
benjamintoll-64977f4cc6-x78st   1/1     Running   0          42m   172.16.191.74   worker-node03   <none>           <none>
benjamintoll-64977f4cc6-xmqvj   1/1     Running   0          65m   172.16.191.72   worker-node03   <none>           <none>
```

Note that the distribution is the same.  This is an important lesson, that is, just because a node was uncordoned and marked as available does not mean that workloads on other nodes will then be terminated and re-scheduled on the newly-uncordoned node.  Rather, it just means that future workloads will be scheduled on the node.

This presents us with a problem.  How do we upgrade a cluster and not have nodes overutilized and underutilized?

This is out of scope for this article, but, in the meantime, you might want to check out the [`descheduler`] project.  In addition, if you are using a managed Kubernetes solution in the cloud, there are options available that can help address this.

So, you'll need to rinse and repeat for each worker node in the cluster.  The bad news is that this can be a tedious process if you've used `kubeadm` to set up your cluster(s).

What's the good news?  There is no good news.

## Conclusion

I was going to also cover backing up and restoring `etcd`, but this was getting pretty long and even I was losing interest.  Perhaps I'll cover it in a future article.

## References

- [Upgrading kubeadm clusters]
- [Kubelet/Kubernetes should work with Swap Enabled](https://github.com/kubernetes/kubernetes/issues/53533)

[Upgrading kubeadm clusters]: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
[read the original source]: /2023/07/03/on-original-sources/
[Upgrading Linux nodes]: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/upgrading-linux-nodes/
[How it works]: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/#how-it-works
[disable swapping]: https://serverfault.com/questions/684771/best-way-to-disable-swap-in-linux
[KEP-2400: Node system swap support]: https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/2400-node-swap
[view the announcement on their blog]: https://kubernetes.io/blog/2023/08/15/pkgs-k8s-io-introduction/
[Changing The Kubernetes Package Repository]: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/change-package-repository/
[`apt-cache`]: https://manpages.debian.org/bookworm/apt/apt-cache.8.en.html
[taint]: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
[`systemd`]: https://en.wikipedia.org/wiki/Systemd
[`descheduler`]: https://github.com/kubernetes-sigs/descheduler

