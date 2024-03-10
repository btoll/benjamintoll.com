+++
title = "On Getting Started With Kubernetes"
date = "2023-05-17T21:59:07-04:00"

+++

The purpose of this getting started guide is to get a [`Kubernetes`] cluster up and running quickly.  It is **not** a primer on `Kubernetes` itself, although there may be some digressions along the way into some of its twigs and berries.

I'll discuss two ways to accomplish this using [`minikube`] and [`kubeadm`].  After the cluster is up, we'll deploy an astoundingly beautiful application so we can feel good about ourselves.

---

- [For the Impatient](#for-the-impatient)
- [`minikube`](#minikube)
    + [Install](#install)
    + [Start](#start)
    + [Stop](#stop)
    + [Delete](#delete)
    + [Inspecting `minikube`](#inspecting-minikube)
    + [Cluster Management](#cluster-management)
- [`kubeadm`](#kubeadm)
    + [Install](#install-1)
    + [`kubeadm` Commands](#kubeadm-commands)
        - [`kubeadm init`](#kubeadm-init)
        - [`kubeadm join`](#kubeadm-join)
- [`kubeconfig`](#kubeconfig)
- [`kubectl`](#kubectl)
- [Enabling Autocompletion](#enabling-autocompletion)
- [Metrics Server](#metrics-server)
- [`Kubernetes` Dashboard](#kubernetes-dashboard)
- [Creating A User](#creating-a-user)
- [Vagrant](#vagrant)
- [References](#references)
- [Summary](#summary)

---
## For the Impatient

For those [champing at the bit] to get started, head to the section on [Vagrant](#vagrant) where you'll find a link to download a working cluster that I created just for you.

And, for the *really* impatient that can't even be bothered to click another link to get the goods, [here you go].

## `minikube`

[`minikube`] is a tool that allows you to (very) easily set up `Kubernetes` cluster.  It is very versatile as it can be installed on Linux, macOS and Windows.

That versatility extends to the ways it can be deployed, as it can be installed into a virtual machine, container or on bare-metal, supporting many container runtimes, such as `CRI-O`, `containerd` and `Docker`.

But, since this isn't a tutorial on `minikube`, let's just get started with the steps you'll need to download, install and run it.

### Install

```bash
$ curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
$ sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

or, since I run Debian:

```bash
$ curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube_latest_amd64.deb
$ sudo dpkg -i minikube_latest_amd64.deb
```

### Start

```bash
$ minikube start --driver virtualbox
😄  minikube v1.30.1 on Debian 11.7
✨  Using the virtualbox driver based on user configuration
👍  Starting control plane node minikube in cluster minikube
🔥  Creating virtualbox VM (CPUs=2, Memory=6000MB, Disk=20000MB) ...
🐳  Preparing Kubernetes v1.26.3 on Docker 20.10.23 ...
    ▪ Generating certificates and keys ...
    ▪ Booting up control plane ...
    ▪ Configuring RBAC rules ...
🔗  Configuring bridge CNI (Container Networking Interface) ...
...
```

However, `minikube` itself recommends [`qemu2`] as the driver, outputting the following message when using `virtualbox` as the driver:

<cite>You have selected "virtualbox" driver, but there are better options!  For better performance and support consider using a different driver: - qemu2</cite>

```bash
$ minikube start --driver qemu2 --nodes 4 --cpus 6 --memory 8192
😄  minikube v1.30.1 on Debian 11.7
✨  Using the qemu2 driver based on existing profile
👍  Starting control plane node minikube in cluster minikube
...
```

So, let's make `qemu2` the default driver:

```bash
$ minikube config set driver qemu2
```

> <h2>Holy zap!</h2>
>
> When I tried to start `minikube` I got the following error:
>
> ```bash
> OUTPUT:
> ERROR: ioctl(KVM_CREATE_VM) failed: 16 Device or resource busy
> qemu-system-x86_64: -accel kvm: failed to initialize kvm: Device or resource busy
>
> 😿  Failed to start qemu2 VM. Running "minikube delete" may fix it: driver start: ioctl(KVM_CREATE_VM) failed: 16 Device or resource busy qemu-system-x86_64: -accel kvm: failed to initialize kvm: Device or resource busy: exit status 1
> ❌  Exiting due to PR_KVM_CREATE_BUSY: Failed to start host: driver start: ioctl(KVM_CREATE_VM) failed: 16 Device or resource busy qemu-system-x86_64: -accel kvm: failed to initialize kvm: Device or resource busy: exit status 1
> 💡  Suggestion: Another hypervisor, such as VirtualBox, is conflicting with KVM. Please stop the other hypervisor, or use --driver to switch to it.
> 🍿  Related issue: https://github.com/kubernetes/minikube/issues/4913
> ```
>
> I use [`VirtualBox`] as the provider for [`Vagrant`] and apparently some virtual machines were still running.  The error is telling me that I need to stop all those running instances in order to be able to use `minikube`.
>
> Let's see what's running:
>
> ```bash
> $ vboxmanage list runningvms
> "base_worker-1_1684635562437_20054" {b2f02b22-72ee-4e16-9d35-89a2714ca273}
> "base_worker-2_1684635673520_5423" {416c3df8-3cf6-4c6a-8d01-d355a41e1f1a}
> "base_worker-3_1684635786790_34572" {39477a26-793a-4bc7-a171-79369c38fa0c}
> ```
>
> Ok, we'll need to delete them.  Let's start with the first one:
>
> ```bash
> $ vboxmanage unregistervm base_worker-1_1684635562437_20054 --delete
> VBoxManage: error: Cannot unregister the machine 'base_worker-1_1684635562437_20054' while it is locked
> VBoxManage: error: Details: code VBOX_E_INVALID_OBJECT_STATE (0x80bb0007), component MachineWrap, interface IMachine, callee nsISupports
> VBoxManage: error: Context: "Unregister(CleanupMode_DetachAllReturnHardDisksOnly, ComSafeArrayAsOutParam(aMedia))" at line 154 of file VBoxManageMisc.cpp
> ```
>
> Ok, we'll stop each one first before deleting:
>
> ```bash
> $ vboxmanage controlvm base_worker-1_1684635562437_20054 poweroff
> 0%...10%...20%...30%...40%...50%...60%...70%...80%...90%...100%
> $ vboxmanage unregistervm base_worker-1_1684635562437_20054 --delete
> 0%...10%...20%...30%...40%...50%...60%...70%...80%...90%...100%
> $ vboxmanage list runningvms
> "base_worker-2_1684635673520_5423" {416c3df8-3cf6-4c6a-8d01-d355a41e1f1a}
> "base_worker-3_1684635786790_34572" {39477a26-793a-4bc7-a171-79369c38fa0c}
> ```
>
> Now, just rinse and repeat with the remaining virtual machines.

Much like the [Whitman's Sampler], you can view the [`minikube` quick start guide] for a nice sampling of what you can do with the tool.

### Stop

Stopping a running `minikube` cluster is easy-peasy:

```bash
$ minikube stop
✋  Stopping node "minikube"  ...
🛑  1 node stopped.
```

### Delete

Deleting a `minikube` cluster is a piece of cake:

```bash
$ minikube delete
🔥  Deleting "minikube" in virtualbox ...
💀  Removed all traces of the "minikube" cluster.
```

### Inspecting `minikube`

How could you find the container runtime?

Let's look at two different ways.  The first will list all the nodes with the `wide` option which will display additional columns such as `CONTAINER-RUNTIME`, which is what we're interested in:

```bash
$ kubectl get nodes -owide
NAME       STATUS   ROLES           AGE    VERSION   INTERNAL-IP   EXTERNAL-IP   OS-IMAGE               KERNEL-VERSION   CONTAINER-RUNTIME
minikube   Ready    control-plane   3d5h   v1.26.3   10.0.2.15     <none>        Buildroot 2021.02.12   5.10.57          docker://20.10.23
```

and:

```bash
$ kubectl get node \
    -o=jsonpath='{range.items[*]}{.status.nodeInfo.containerRuntimeVersion}{"\n"}{end}'
docker://20.10.23
```

Or, if not using the alias:

```bash
$ minikube kubectl -- get node \
    -o=jsonpath='{range.items[*]}{.status.nodeInfo.containerRuntimeVersion}{"\n"}{end}'
docker://20.10.23
```

Ew, gross, it's using Docker as the container runtime.  Let's get more information about that environment:

```bash
$ minikube docker-env
export DOCKER_TLS_VERIFY="1"
export DOCKER_HOST="tcp://127.0.0.1:46719"
export DOCKER_CERT_PATH="/home/btoll/.minikube/certs"
export MINIKUBE_ACTIVE_DOCKERD="minikube"

# To point your shell to minikube's docker-daemon, run:
# eval $(minikube -p minikube docker-env)
```

By `eval`ing that and exporting those variables into your environment, your local `docker` commands will now be talking to the docker daemon inside `minikube` (essentially, it's "reusing" the host docker daemon to talk to the docker daemon inside the `minikube` cluster instead).

That's pretty cool if you use Docker, as it will improve your workflow tremendously.  For instance, you don't have to build an image on the host system and push to a Docker registry and then figure out how to get that image into the `minikube` cluster.  Instead, after running the above command, you just build as usual since it's now using `minikube`'s docker daemon.

> To revert this and get back to using the `docker` CLI tool to talk to the host docker daemon (`dockerd`), simply log out of your shell and start a new session.

### Cluster Management

This is not an exhaustive list.

|**Command** |**Description**
|:---|:---
|`minikube pause` | Pause `Kubernetes` without impacting deployed applications.
|`minikube unpause` | Unpause a paused instance.
|`minikube stop` | Halt the cluster.
|`minikube config set memory 9001` | Change the default memory limit (requires a restart).
|`minikube addons list` | Browse the catalog of easily installed `Kubernetes` services.
|`minikube start -p aged --kubernetes-version=v1.16.1` | Create a second cluster running an older `Kubernetes` release.
|`minikube delete --all` | Delete all of the minikube clusters.

---

Ok, `minikube` is great to start playing with a cluster and issuing commands using [`kubectl`], but it doesn't teach you much about some of the behind-the-scenes processes of setting up a cluster.

Let's now turn to a tool that gives us a better understanding of those processes.

## `kubeadm`

[`kubeadm`] is a tool to bootstrap a cluster using the commands [`kubeadm init`] and [`kubeadm join`] to quickly create a `Kubernetes` cluster (although not as quickly as `minikube`).  Note that provisioning machines and installing addons is not in scope.

> The `kubeadm` documentation states that `kubeadm` is intended to have tooling built on top of it:
>
> <cite>[W]e expect higher-level and more tailored tooling to be built on top of `kubeadm`, and ideally, using `kubeadm` as the basis of all deployments will make it easier to create conformant clusters.</cite>

### Install

Before installation, there are a number things that must be checked.  Let's take a gander.

First, you must verify that every node in the cluster has [a unique MAC address and `product_uuid`].  To ensure this is the case, simply make the following checks on each node that will be joined into the cluster:

Show all the network adapters:

```bash
$ ip link show
```

Get the `product_uuid`:

```bash
$ sudo cat /sys/class/dmi/id/product_uuid
```

Why is this important?  Well, for starters, they will be networking issues and random failures as each network adapter on a network is supposed to be unique.  Similarly, each node needs to have a unique `product_uuid`.

> <h2>Machine IDs</h2>
>
> Note that [virtual machines that have been cloned or moved] will need to have not only it's machine id changed but its `product_uuid`, as well.
>
> To view the machine id:
>
> ```bash
> $ cat /etc/machine-id
> ```
>
> or, using the [`dbus-uuidgen`] tool:
>
> ```bash
> $ dbus-uuidgen --get
> ```
>
> > Note that if the file [`/etc/machine-id`] is missing that the system may use the `product_uuid` as its machine id.  See this from the man page:
> >
> > <cite>When a machine is booted with `systemd(1)` the ID of the machine will be established.  If `systemd.machine_id=` or `--machine-id=` options are specified, this value will be used. Otherwise, the value in `/etc/machine-id` will be used.  If this file is empty or missing, `systemd` will attempt to use the D-Bus machine ID from `/var/lib/dbus/machine-id`, the value of the kernel command line option `container_uuid`, the KVM DMI `product_uuid` or the devicetree `vm,uuid` (on KVM systems), and finally a randomly generated `UUID`.</cite>

Second, there are [required ports] that need to be open for the cluster to be able to fully communicate.  For instance, the port `6443` must be open, as that is the port that the `Kubernetes` `API` server listens on (`TCP`).

How can you determine if the port is open?  There are a [myriad of ways to do this]:

Using [`netcat`]:

```bash
$ ncat 127.0.0.1 6443
```

Using [`lsof`]:

```bash
$ lsof -i:6443
```

Using [`nmap`]:

```bash
$ nmap -p6443 127.0.0.1
```

Using [`fuser`], although this won't be as granular as the other ones:

```bash
$ fuser .
```

If you're running a firewall like [`ufw`], you've have to open the port(s) manually.  It's good to be aware of [the ports and protocols] used by `Kubernetes` components.

Third, you **must** disable `swap`.

This can be done simply by running:

```bash
$ sudo swapoff -a
```

However, this won't persist across reboots, so you should disable `swap` in [`/etc/fstab`] or in [`systemd.swap`], depending on how it is configured on your machine.

## `kubeadm` Commands

Since the documentation clearly states that <cite>`kubeadm` is a tool built to provide `kubeadm init` and `kubeadm join` as best-practice "fast paths" for creating `Kubernetes` clusters</cite>, it behooves us to look at each subcommand in turn.

## `kubeadm init`

This command initializes a `Kubernetes` [control plane].  It is a command that bootstraps a control plane node composed of the following steps:

1. Runs a series of pre-flight checks.
1. Generates a self-signed CA to set up identities for each component in the cluster.
1. Writes `kubeconfig` files in `/etc/kubernetes/` for the `kubelet`, the controller-manager and the scheduler to use to connect to the `API` server, each with its own identity, as well as an additional `kubeconfig` file for administration named `admin.conf`.
1. Generates static Pod manifests for the `API` server, controller-manager and scheduler (Pod manifests are written to `/etc/kubernetes/manifests`).
1. Apply labels and taints to the control-plane node so that no additional workloads will run there.
1. Generates the token that additional nodes can use to register themselves with a control-plane in the future.
1. Makes all the necessary configurations for allowing node joining with the Bootstrap Tokens and `TLS` Bootstrap mechanism.
1. Installs a `DNS` server (`CoreDNS`) and the `kube-proxy` addon components via the `API` server (although the `DNS` server is deployed, it will not be scheduled until `CNI` is installed).

> The docs have good summations of the [synopsis] and [init workflow] initiated by the `kubeadm init` command.

It's also possible to pick which of these stages to run via the [`kubeadm init phase`] command.

Print the default static configuration that [`kubeadm` uses for `kubeadm init`]:

```bash
$ kubeadm config print init-defaults --component-configs KubeletConfiguration
```

## `kubeadm join`

[`kubeadm join`] bootstraps a `Kubernetes` worker node or a control-plane node and adds it to the cluster.  It does the following for a worker node:

1. `kubeadm` downloads necessary cluster information from the `API` server.
This command initializes a `Kubernetes` worker node and joins it to the cluster and should be run on any machine that you wish to join to the cluster.

As with `kubeadm init`, t's also possible to pick which of these stages to run via the [`kubeadm join phase`] command.

Print the default static configuration that [`kubeadm` uses for `kubeadm join`]:

```bash
$ kubeadm config print init-defaults --component-configs KubeletConfiguration
```

## `kubeconfig`

`kubectl` needs to consult a [`kubeconfig`] file to be able to find and access a `Kubernetes` cluster.  When successfully deploying a cluster with `minikube`, it will create one and put it in its default location at `$HOME/.kube/config`.

However, if you are using `kubeadm` to bootstrap a cluster, you'll need to manage this yourself.

> When installed in its default location, the `kubeconfig` file is renamed to just `config`.

For a getting started guide, it's sufficient to know that it is the default way to authenticate to a `Kubernetes` cluster, and that every node that plans on querying the apiserver in the control plane (or creating services) needs to have the `kubeconfig` file installed.

## `kubectl`

[`kubectl`] is the command line utility to talk to the cluster.

Always install it using the package manager, if possible.

Install packages needed to use the `Kubernetes` `apt` repository:

```bash
$ sudo apt-get update && sudo apt-get install ca-certificates curl -y
```

> I installed this on Debian 11 (bullseye).  I downloaded the public key into the `/usr/share/keyrings` location as usual rather than `/etc/apt/keyrings`, as suggested by the `Kubernetes` docs.
>
> Also, I had changed my [`umask`] to be more restrictive, so `apt-get update` was throwing errors until I changed the permissions on the key to be the same as the others:
> ```bash
> $ sudo chmod 0644 /usr/share/keyrings/kubernetes-archive-keyring.gpg
> ```

Download the Google Cloud public signing key:

```bash
$ sudo curl -fsSLo /usr/share/keyrings/kubernetes-archive-keyring.gpg https://packages.cloud.google.com/apt/doc/apt-key.gpg
$ sudo chmod 0644 /usr/share/keyrings/kubernetes-archive-keyring.gpg

```

Add the `Kubernetes` `apt` repository:

```bash
$ echo "deb [signed-by=/etc/apt/keyrings/kubernetes-archive-keyring.gpg] https://apt.kubernetes.io/ kubernetes-xenial main" \
    | sudo tee /etc/apt/sources.list.d/kubernetes.list
```

Update the package index and install `kubectl`:

```bash
$ sudo apt-get update && sudo apt-get install kubectl -y
```

Verify the install:

```bash
$ kubectl cluster-info
Kubernetes control plane is running at https://localhost:39885
CoreDNS is running at https://localhost:39885/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.
```

If you see an error like the following, make sure that `minikube` has been installed and started:

```bash
The connection to the server <server-name:port> was refused - did you specify the right host or port?
```

Here is more configuration info:

```bash
$ kubectl cluster-info dump
```

> Alternatively, you can use `minikube` to download the correct version of `kubectl` it needs:
> ```bash
> $ minikube kubectl -- get po -A
> ```
> It will only download once if it determines it hasn't yet.
>
> The docs suggest then adding this alias to the appropriate shell config file:
> ```bash
> alias kubectl="minikube kubectl --"
> ```
> Frankly, I'm not sure where it's downloaded on the system, as `which` and `whereis` don't reveal anything.

Does this mean that `kubeadm` is better than `minikube`?  Like most things in life, the answer is:  It Depends.

What is your use case?

- Do you just want to quickly get a `Kubernetes` cluster up and running in a development environment to test something?
- Do you want to create a `Kubernetes` cluster and be able to control the way the control plane node is initiated with your own custom configuration and certs?
- Is this intended for an on-premise production environment?
- [Insert Your Use Case Here]

The important thing is to research each tool and determine what best suits your needs.  Only then will you have your answer, which will probably be different than mine.

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## Enabling Autocompletion

The `kubectl` bash completion script depends on the [`bash-completion`] project, so this must be installed first.

To check if it's already been installed on your machine, run the following command:

```bash
$ type _init_completion
```

If you need to install it, that's easy enough, friend:

```bash
$ sudo apt-get install bash-completion
```

> Only bash completion for filenames and directories is enabled by default.  `bash` completion for options and restricting filenames requires the installation of the `bash-completion` package from `lenny` onwards.
>
> The completion of `apt-get i` to `apt-get install` will work only with the `bash-completion` package installed, unless you have a file called `install` in that directory.
>
> Run the following command for more information about the package:
> ```bash
> $ sudo apt-cache show bash-completion
> ```

This installs the `/etc/bash_completion` and `/usr/share/bash-completion/bash_completion` files.  You can add the following to a `bash` config file to source it when a shell is initialized:

```bash
# https://www.howtoforge.com/how-to-add-bash-completion-in-debian
[[ "$PS1" && -f /etc/bash_completion ]] && source /etc/bash_completion
```

> Note that the `/etc/bash_completion` file sources the main script:
>
> ```bash
> $ cat /etc/bash_completion
> . /usr/share/bash-completion/bash_completion
> ```
> Of the many things that the `bash_completion` shell script does, it will source all files found in `/etc/bash_completion.d/`.  That's nice.

Now that that's been sorted, let's install the `kubectl` bash completion script.  The following command will generate the script and send to `stdout`:

```bash
$ kubectl completion bash
```

So, by itself that doesn't do a lot of good.  But, we can capture that output and source it every time we instance a shell by putting the following in one of the `bash` config files:

```bash
# https://kubernetes.io/docs/reference/kubectl/cheatsheet/#bash
if command -v kubectl > /dev/null
then
    source <(kubectl completion bash)
    alias k="kubectl"
    complete -o default -F __start_kubectl k
fi
```

> Note the `k` alias, so that we can run commands like:
>
> ```bash
> $ k get no
> ```

Finally, source whatever `bash` config file you put all of the above in to have it in the current shell:

```bash
$ . ~/.bashrc
```

## Metrics Server

The [metrics server] isn't installed by default.  Without it, you can't run commands like [`kubctl top`]:

```bash
$ kubectl top pod -n kube-system --sort-by memory
```

However, if you get the following error, you'll need to install the metrics server (it isn't installed by default, yo):

```bash
$ kubectl top pod -n kube-system --sort-by memory
error: Metrics API not available
```

[Install the metrics server] from the official manifest file:

```bash
$ kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
serviceaccount/metrics-server created
clusterrole.rbac.authorization.k8s.io/system:aggregated-metrics-reader created
clusterrole.rbac.authorization.k8s.io/system:metrics-server created
rolebinding.rbac.authorization.k8s.io/metrics-server-auth-reader created
clusterrolebinding.rbac.authorization.k8s.io/metrics-server:system:auth-delegator created
clusterrolebinding.rbac.authorization.k8s.io/system:metrics-server created
service/metrics-server created
deployment.apps/metrics-server created
apiservice.apiregistration.k8s.io/v1beta1.metrics.k8s.io created
```

Order by memory usage:

```bash
$ kubectl top pod -n kube-system --sort-by memory
NAME                                       CPU(cores)   MEMORY(bytes)
kube-apiserver-control-plane               91m          353Mi
calico-node-fwsgs                          56m          184Mi
calico-node-v5vr2                          64m          183Mi
calico-node-6xtdp                          52m          181Mi
etcd-control-plane                         46m          72Mi
kube-controller-manager-control-plane      32m          56Mi
kube-scheduler-control-plane               9m           28Mi
metrics-server-7db4fb59f9-52spx            11m          27Mi
calico-kube-controllers-6c99c8747f-zxkrn   5m           27Mi
kube-proxy-dtdsd                           2m           26Mi
kube-proxy-bcwtd                           1m           26Mi
kube-proxy-v272h                           1m           25Mi
coredns-5d78c9869d-xdjfr                   5m           23Mi
coredns-5d78c9869d-sh6sf                   4m           23Mi
```

> I found that I was still getting the `error: Metrics API not available` error even after applying the metrics server manifest.  I had to fiddle with it, sometimes just waiting, other times deleting and re-applying the manifest until the Pod successfully came up.

## `Kubernetes` Dashboard

There is a tool that runs in your browser, if you're into that.  It's called the [Dashboard].

It's easy to install, either using the `minikube` tool or a manifest:

```bash
$ minikube dashboard
```

Or:

```bash
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
```

This will create a new `kubernetes-dashboard` namespace:

```bash
$ kubectl get ns
NAME                   STATUS   AGE
default                Active   4h26m
kube-node-lease        Active   4h26m
kube-public            Active   4h26m
kube-system            Active   4h26m
kubernetes-dashboard   Active   2m18s
$
$ kubectl get po -n kubernetes-dashboard
NAME                                         READY   STATUS    RESTARTS   AGE
dashboard-metrics-scraper-5cb4f4bb9c-4tdc5   1/1     Running   0          15s
kubernetes-dashboard-6967859bff-rkgqp        1/1     Running   0          15s
```

If you use `minikube`, it may ask you to enable some add-ons.  Mine suggested to enable the metrics server, which I dutifully did:

```bash
$ minikube addons enable metrics-server
💡  metrics-server is an addon maintained by Kubernetes. For any concerns contact minikube on GitHub.
You can view the list of minikube maintainers at: https://github.com/kubernetes/minikube/blob/master/OWNERS
    ▪ Using image registry.k8s.io/metrics-server/metrics-server:v0.6.3
🌟  The 'metrics-server' addon is enabled
```

Starting the dashboard initiated two new pods:

```bash
$ kubectl get po -A
NAMESPACE              NAME                                        READY   STATUS    RESTARTS      AGE
kube-system            coredns-787d4945fb-6nj2h                    1/1     Running   2 (62m ago)   71m
kube-system            etcd-minikube                               1/1     Running   3 (62m ago)   71m
kube-system            kube-apiserver-minikube                     1/1     Running   3 (62m ago)   71m
kube-system            kube-controller-manager-minikube            1/1     Running   3 (62m ago)   71m
kube-system            kube-proxy-lbpxl                            1/1     Running   3 (62m ago)   71m
kube-system            kube-scheduler-minikube                     1/1     Running   2 (62m ago)   71m
kube-system            metrics-server-6588d95b98-vkd7h             1/1     Running   0             102s
kube-system            storage-provisioner                         1/1     Running   2 (62m ago)   71m
kubernetes-dashboard   dashboard-metrics-scraper-5c6664855-gxz9f   1/1     Running   0             3m48s
kubernetes-dashboard   kubernetes-dashboard-55c4cbbc7c-jt9b5       1/1     Running   0             3m48s
```

To access the Dashboard, do the following:

```bash
$ kubectl proxy
Starting to serve on 127.0.0.1:8001
```

`kubectl` makes the Dashboard available at:

```bash
http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

You can only view the Dashboard on the machine where the command was executed.

If you want to expose this publicly, you must do the following things:

1. Edit the Service manifest:
    ```bash
    $ kubectl edit svc kubernetes-dashboard --namespace kubernetes-dashboard
    ```
1. Grep for the line `type: ClusterIP` and change to `type: NodePort`
1. Save and exit.
1. Get the newly-exposed port:
    ```bash
    $ kubectl get svc kubernetes-dashboard --namespace kubernetes-dashboard
	NAME                   TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)         AGE
	kubernetes-dashboard   NodePort   10.96.237.194   <none>        443:32690/TCP   14m
    ```
1. Open your browser and point it to the `IP`s of one of the cluster nodes:
    ```bash
    https://10.0.0.21:32690
    ```

## Creating A User

If you followed these steps, which of course you did, you'll have user called `kubernetes-admin`.  This is because it was copied directly from the configuration on the master node control plane.  This is fine for playing around, but when play time is over, it's important to create one or more users who probably don't or shouldn't have privileged access to the cluster.

You may be surprised to discover that `Kubernetes` has no notion of a user.  For instance, if you list all of the resources it is managing, you won't find anything related to a user:

```bash
$ kubectl api-resources
```

Go ahead and `grep` for yourself if you don't believe me, I'll be waiting right here with a smug "I told you so" look on my face.

1. Create a new key.
1. Have the cluster sign it.
    - Create a `CSR` (Certificate Signing Request)
    - Give it to cluster
    - Have cluster approve it

```bash
$ openssl genpkey -out btoll.key -algorithm ed25519
```

Generate a [certificate signing request (CSR)] using the new private key.  I'll set the [Common Name (CN)] field to be my username:

```bash
$ openssl req -new -key btoll.key -out btoll.csr -subj "/CN=btoll/O=edit"
```

> `CN` stands for Common Name, i.e., the user name, and `O` is what's used for the group to which the user belongs.

Instead of taking the easy way out and using files from the control plane (which you wouldn't have access to in a managed cluster anyway), we'll use `Kubernetes` `API`s to do it.

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: btoll
spec:
  request: $(base64 btoll.csr | tr -d "\n")
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400
  usages:
  - client auth
EOF
certificatesigningrequest.certificates.k8s.io/btoll created
```

> The request will only be for one day.  It's probably not a good idea to grant this request too large of an expiration date.

Sweet, the CSR object was sent to the `apiserver`.  Let's list it:

```bash
$ kubectl get csr
NAME    AGE     SIGNERNAME                            REQUESTOR          REQUESTEDDURATION   CONDITION
btoll   5m10s   kubernetes.io/kube-apiserver-client   kubernetes-admin   24h                 Pending
```

The cluster now only has received the request, it has granted it yet, as we can see from the `Pending` state.  Let's approve it, giving it the same name we gave it in the certificate request:

```bash
$ kubectl certificate approve btoll
certificatesigningrequest.certificates.k8s.io/btoll approved
```

Let's check it out, yo:

```bash
$ kubectl get csr/btoll
NAME    AGE     SIGNERNAME                            REQUESTOR          REQUESTEDDURATION   CONDITION
btoll   5m20s   kubernetes.io/kube-apiserver-client   kubernetes-admin   24h                 Approved,Issued
```

We need the certificate that `Kubernetes` generated for us, which will be in the `yaml` output.  Instead of dumping the whole thing, let's be surgical:

```bash
$ kubectl get csr/btoll -o jsonpath="{.status.certificate}" | base64 -d | tee btoll.crt
-----BEGIN CERTIFICATE-----
MIIB+jCB46ADAgECAhA6dFutCgg5iVxenCGUuL+RMA0GCSqGSIb3DQEBCwUAMBUx
EzARBgNVBAMTCmt1YmVybmV0ZXMwHhcNMjMwOTI0MjEyNDM1WhcNMjQwOTIzMjEy
NDM1WjAQMQ4wDAYDVQQDEwVidG9sbDAqMAUGAytlcAMhAIvoiJezh+Bpk13+tASq
LrmSQ1Qv1KGH4qOOig8REqoao0YwRDATBgNVHSUEDDAKBggrBgEFBQcDAjAMBgNV
HRMBAf8EAjAAMB8GA1UdIwQYMBaAFKdgz8XZNjnVcoxzNGGgrbgzlYKQMA0GCSqG
SIb3DQEBCwUAA4IBAQAYuJW5S9f5hDTYZaTvuYg8IzWOkzSA4T+E+M9h3vQQVxbP
eP9JI9yYBlW5bFMvJWOzkHR/WnCCuqms6LEtb0nXHxYbVYrgj/c07/1NWLR+JbQ0
MWQgp6kgYIyUA+VU1XFBp6Qm2QUOXKxelVek98wwXyIBDJTnRjn2Ny9TtDs3D/8Q
9TZLeyQMCXLv8WB6U9zDQhzCFaHiAscysS++dk9hNsI97XljPBsI6kVZkMn/kNon
v4CKIKX4r0QG3AF7peSWUqqHFS8neOMFlBJVgCYyiN7idVtZvJDRYm1BittDaHZQ
VZlCnJ8J+p6Th7Wcl8IhXgdvQbAdVygvIQhSqQzY
-----END CERTIFICATE-----
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.

```bash
$ cp ~/.kube/config{,.orig}
$ kubectl config set-credentials btoll --client-key=btoll.key --client-certificate=btoll.crt --embed-certs=true
$ kubectl config set-context btoll --cluster=kubernetes --user=btoll
Context "btoll" created.
```

We can now see that the `btoll` user has been successfully created:

```bash
$ kubectl config get-users
NAME
btoll
kubernetes-admin
```

Now, let's change the context and issue commands as the `btoll` user:

```bash
$ kubectl config current-context
kubernetes-admin@kubernetes
$ kubectl config use-context btoll
Switched to context "btoll".
$ kubectl config current-context
btoll
```

```bash
$ kubectl get pods
Error from server (Forbidden): nodes is forbidden: User "btoll" cannot list resource "pods" in API group "" in the namespace "default"
```

Oh noes.

Is that a mistake?  Let's see if I can list the nodes.

```bash
$ kubectl auth can-i list pods
no
```

Ok, so what can I do?

```bash
$ kubectl auth can-i --list
Resources                                       Non-Resource URLs   Resource Names   Verbs
selfsubjectreviews.authentication.k8s.io        []                  []               [create]
selfsubjectaccessreviews.authorization.k8s.io   []                  []               [create]
selfsubjectrulesreviews.authorization.k8s.io    []                  []               [create]
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

Um, not much.

Well, fear not, son.  All we need to do is create a role and bind it to the new `btoll` user.  This is `RBAC`.  First, switch back to the `kubernetes-admin` role, which has the necessary permissions to create the `clusterrolebinding` object:

```bash
$ kubectl config use-context kubernetes-admin@kubernetes
Switched to context "kubernetes-admin@kubernetes".
```

Now, create the binding:

```bash
$ kubectl create clusterrolebinding btoll --user=btoll --clusterrole=view
clusterrolebinding.rbac.authorization.k8s.io/btoll created
```

```bash
$ kubectl get clusterrolebindings/btoll -oyamL
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  creationTimestamp: "2023-09-25T00:12:10Z"
  name: btoll
  resourceVersion: "3628"
  uid: 6d3509a6-03f7-42ab-b48e-4ecc9d3f2a9f
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: btoll
```

Now, we can view the pods of the cluster:

```bash
$ kubectl auth can-i list pods
yes
$ kubectl get pods
No resources found in default namespace.
```

Here's a fun `bash` script that does everything we covered in this section:

```bash
#!/bin/bash

set -eo pipefail

LANG=C
umask 0022

if [ -z "$1" ]
then
    echo "[ERROR] You must provide a user name."
    echo "$0 USERNAME"
    exit 1
fi

NAME="$1"

if kubectl config get-users | grep --quiet "$NAME"
then
    echo "[ERROR] User \`$NAME\` already exists."
    exit 1
fi

read -p "Cluster role for user \`$NAME\`? [admin, edit, view] " ROLE

if ! ( [ "$ROLE" = admin ] || [ "$ROLE" = edit ] || [ "$ROLE" = view ] )
then
    echo "[ERROR] You must select a valid cluster role."
    exit 1
fi

openssl genpkey -out "$NAME.key" -algorithm ed25519
openssl req -new -key "$NAME.key" -out "$NAME.csr" -subj "/CN=$NAME/O=$ROLE"

cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: $NAME
spec:
  request: $(base64 $NAME.csr | tr -d "\n")
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400
  usages:
  - client auth
EOF

kubectl certificate approve "$NAME"
kubectl get csr "$NAME" -o jsonpath="{.status.certificate}" | base64 -d > "$NAME.crt"
kubectl config set-credentials "$NAME" --client-key="$NAME.key" --client-certificate="$NAME.crt" --embed-certs=true
kubectl config set-context "$NAME" --cluster=kubernetes --user="$NAME"

kubectl create clusterrolebinding "$NAME" --user="$NAME" --clusterrole="$ROLE"

kubectl delete csr "$NAME"
rm "$NAME.csr"

```

> There's also a nice script called [`kubernetes-adduser`] that I used as inspiration.

## Vagrant

Vagrant is a great tool, and I use it all the time.  Instead of using the `VirtualBox` GUI or the [`VBoxManage`] command-line tool to create and provision a virtual machine(s), you can write a little Ruby to do so, instead.

This makes setup and tear down a simple command.  Probably everybody already knows this.

Anyway, I created a `Vagrantfile` and several shell scripts in [`Kubernetes` lab repository] on my GitHub that will allow you to bootstrap a cluster using `kubeadm`.  There are values defined at the top of the `Vagrantfile` that configure things such as number of worker nodes, memory, CPUs, et al.  You can change them to whatever suits you (or fork and improve).

Currently, it's not applying any of the manifests, but you can do using the files in `/VAGRANTFILE_LOCATION/manifests/`.  So, after you `ssh` into the machine, run the following commands:

```bash
$ kubectl apply -f /vagrant/manifests/deployment.yaml
deployment.apps/benjamintoll created
$ kubectl apply -f /vagrant/manifests/node_port.yaml
service/benjamintoll created
```

This will install a `Kubernetes` Deployment of the most dangerous website in the world.  To access it, simply point your browser at one of the nodes:

```bash
http://10.0.0.21:31117/
```

You'll be very pleased that you did so.

One should read the shell scripts in `scripts/` to get a better understanding of what is happening.  They are commented with links to appropriate resources for further exploration.

> If you want to interact with the cluster on the host machine, simply copy the `kubeconfig` file in `/VAGRANTFILE_LOCATION/.kube/config` to your home directory or put its location in an environment variable.

---

Sometime between the last time I ran this `Vagrantfile` and this time ~~we managed to get an album out called `Houses of the Holy`~~ the error below was thrown when doing a `vagrant up`:

```bash
The IP address configured for the host-only network is not within the
allowed ranges. Please update the address used to be within the allowed
ranges and run the command again.

  Ranges: 192.168.56.0/21

Valid ranges can be modified in the /etc/vbox/networks.conf file. For
more information including valid format see:

  https://www.virtualbox.org/manual/ch06.html#network_hostonly
```

So, like a good little boy who always does what he's told, I added the `CIDR` `IP` blocks to `/etc/vbox/networks.conf`:

```conf
* 10.0.0.0/8 192.168.0.0/16
* 2001::/64
```

> This configuration came from the link referenced in the `Vagrant` error (https://www.virtualbox.org/manual/ch06.html#network_hostonly).

```bash
$ vagrant status
Current machine states:

control-plane             poweroff (virtualbox)
worker-0                  poweroff (virtualbox)
worker-1                  poweroff (virtualbox)

This environment represents multiple VMs. The VMs are all listed
above with their current state. For more information about a specific
VM, run `vagrant status NAME`.
```

## Summary

There you have it.  It ended up being a longer than I wanted, but that's what happens when you fly by the seat of your pants.

Incidentally, there are online sandboxes that you can play with, but I don't recommend them, as you won't learn anything about setting up `Kubernetes`.  Understanding the core `Kubernetes` components, such as what is installed in the control plane, is absolutely essential.

Of course, the sandboxes do have their place, just not here on `benjamintoll.com`.

## References

- [`Kubernetes` lab repository]
- [CNI - the Container Network Interface](https://github.com/containernetworking/cni)
- [A brief overview of the Container Network Interface (CNI) in Kubernetes](https://www.redhat.com/sysadmin/cni-kubernetes)
- [Kubernetes Security - Best Practice Guide](https://github.com/freach/kubernetes-security-best-practice)
- [How to Monitor Kubernetes With the Official Dashboard](https://www.howtogeek.com/devops/how-to-monitor-kubernetes-with-the-official-dashboard/)
- [Life of a Packet](https://www.youtube.com/watch?v=0Omvgd7Hg1I)

[`Kubernetes`]: https://kubernetes.io/
[`minikube`]: https://minikube.sigs.k8s.io/docs/
<!--[`minikube`]: https://minikube.sigs.k8s.io/docs/start/-->
[`kubeadm`]: https://kubernetes.io/docs/reference/setup-tools/kubeadm/
[`kubectl`]: https://kubernetes.io/docs/reference/kubectl/
<!--[`kubectl`]: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/#install-using-native-package-management-->
[`dbus-uuidgen`]: https://dbus.freedesktop.org/doc/dbus-uuidgen.1.html
[`/etc/machine-id`]: https://man7.org/linux/man-pages/man5/machine-id.5.html
[required ports]: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
[myriad of ways to do this]: /2023/02/06/on-the-lpic-1-exam-102-security/#discovering-open-ports
[`netcat`]: https://man7.org/linux/man-pages/man1/ncat.1.html
[`lsof`]: https://man7.org/linux/man-pages/man8/lsof.8.html
[`nmap`]: https://man7.org/linux/man-pages/man1/nmap.1.html
[`fuser`]: https://man7.org/linux/man-pages/man1/fuser.1.html
[virtual machines that have been cloned or moved]: /2023/01/15/on-the-lpic-1-exam-101-linux-installation-and-package-management/#cloning-a-virtual-machine
[Whitman's Sampler]: https://en.wikipedia.org/wiki/Whitman's#Whitman's_Sampler
[`minikube` quick start guide]: https://minikube.sigs.k8s.io/docs/start/
[`VirtualBox`]: https://www.virtualbox.org/
[`Vagrant`]: https://www.vagrantup.com/
[`kubeadm init`]: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
[`kubeadm join`]: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-join/
[a unique MAC address and `product_uuid`]: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/#verify-mac-address
[`ufw`]: https://help.ubuntu.com/community/UFW
[the ports and protocols]: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
[`/etc/fstab`]: https://man7.org/linux/man-pages/man5/fstab.5.html
[`systemd.swap`]: https://man7.org/linux/man-pages/man5/systemd.swap.5.html
[control plane]: https://kubernetes.io/docs/reference/glossary/?all=true#term-control-plane
[`kubeadm init phase`]: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init-phase/
[`qemu2`]: https://en.wikipedia.org/wiki/QEMU
[metrics server]: https://github.com/kubernetes-sigs/metrics-server
[`kubctl top`]: https://manpages.debian.org/bullseye/kubernetes-client/kubectl-top.1.en.html
[Install the metrics server]: https://github.com/kubernetes-sigs/metrics-server#installation
[Dashboard]: https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
[`VBoxManage`]: /2022/12/29/on-vboxmanage/
[`Kubernetes` lab repository]: https://github.com/btoll/vagrantfiles/tree/main/k8s/labs/base
[`kubeadm` uses for `kubeadm init`]: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-config/#cmd-config-print-init-defaults
[`kubeadm` uses for `kubeadm join`]: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-config/#cmd-config-print-join-defaults
[synopsis]: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/#synopsis
[init workflow]: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/#init-workflow
[`kubeadm join phase`]: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-join-phase/
[`kubeconfig`]: https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/
[`bash-completion`]: https://github.com/scop/bash-completion
[champing at the bit]: https://grammarist.com/usage/champing-chomping-at-the-bit/
[here you go]: https://www.youtube.com/watch?v=nsCIeklgp1M
[`kubernetes-adduser`]: https://github.com/brendandburns/kubernetes-adduser
[certificate signing request (CSR)]: https://www.ssl.com/faqs/what-is-a-csr/
[Common Name (CN)]: https://www.ssl.com/faqs/common-name/

