+++
title = "On cgroups"
date = "2026-10-09T01:35:00-04:00"

+++

- [Introduction](#introduction)
- [cgroups](#cgroups)
    + [cgroups Demo](#cgroups-demo)
- [`systemd`](#systemd)
    + [`scope` Units](#scope-units)
    + [`systemd` Demo](#systemd-demo)
- [Conclusion](#conclusion)
- [References](#references)

---

> All scripts mentioned in this article can be found in the [`cluster`] repo on my GitHub.

---

## Introduction

Last time we met, we were [building a cluster from Linux primitives] like a couple of old pals.  It was fun, and we shared some big laughs.

However, there is a bit more to do.  For instance, I lobbed a [fork bomb] into one of the pods, and it crashed the entire virtual machine.  Why would an accumulation of running processes consume all of the resources on the virtual machine?  Why doesn't it affect just the container?  After all, isn't it contained?

Recall that containers are very different from virtual machines.  I have written on this topic before (see [On Virtualization And Virtual Machines]), so I won't go into detail here, but the main difference that you should be aware of is that all of the containers running on a (virtual) machine share that machine's kernel (well, traditional Linux containers, so forgive me a bit of hand-waving).  This is different from many virtual machines running on a hypervisor, where each virtual machine has its own (guest) kernel.

That difference is huge though, and it is very important to know when thinking about security and, in our case, resource sharing and consumption.  The latter is what the aforementioned fork bomb exposed:  since traditional Linux containers share the same kernel, that means that, when there are no resource limits on any container, they are all fighting over resources such as CPU, memory and I/O.   The unfettered container can continue to use resources and starve other containers on the same virtual machine.  In other words, left to their own devices, containers don't play well together.

This hogging of resources, like greedy billionaires hoovering up cash at the expense of everyone else, is known as the noisy neighbor problem, and it describes the disruption of [quality of service] (QoS) of all the other workloads on a node that share the same kernel as the one that is consuming all of the resources.  It makes everyone involved sad (after all billionaires are sad people).

The solution to this is to constrain the available resources such as CPU and memory, et al., by limiting the amount of consumption by any group of processes.  The Linux kernel subsystem that allows for this is control groups, or [cgroups].

Conveniently, the processes are organized into hierarchical groups, which allows for easier control and maintainability.  And, to tie a neat bow on the fork bomb example, cgroups can easily solve this issue by setting the maximum number of tasks (processes and threads) that a container and its descendants can spawn.  Easy peasy.

> Note that a container may not be able to spawn a child because it may have inherited a limit that has already been reached.

In this article, we're going to look at adding any process in any pod in the cluster to a cgroup.  We'll first show how to do it manually for learning purposes, and then we'll look at using [`systemd`] units to manage a cgroup hierarchy that makes maintainability easy.

> This article will assume that you've read the previous one, and all shell scripts and commands will have been described there.  See [On Building A Cluster From Linux Primitives].

All examples assume cgroups-v2.

## cgroups

There are currently two versions of cgroups, but we will only be talking about cgroups-v2.  This version contains big improvements over cgroups-v1 (which is now considered legacy), notably a single kernel interface and the ability to organize in hierarchical groups.

The kernel interface is a virtual filesystem called `cgroupfs` and is mounted at `/sys/fs/cgroup`.  Its type is `cgroup2`.

```bash
$ mount | grep cgroup
cgroup2 on /sys/fs/cgroup type cgroup2 (rw,nosuid,nodev,noexec,relatime,nsdelegate,memory_recursiveprot)
```

Here's a listing of `cgroupfs` at `/sys/fs/cgroup`:

```
$ ls -F /sys/fs/cgroup/
cgroup.controllers      cgroup.stat             cpuset.mems.effective  io.cost.model   memory.numa_stat  proc-fs-nfsd.mount/             sys-kernel-tracing.mount/
cgroup.max.depth        cgroup.subtree_control  cpu.stat               io.cost.qos     memory.pressure   proc-sys-fs-binfmt_misc.mount/  system.slice/
cgroup.max.descendants  cgroup.threads          dev-hugepages.mount/   io.pressure     memory.reclaim    sys-fs-fuse-connections.mount/  user.slice/
cgroup.pressure         cpu.pressure            dev-mqueue.mount/      io.stat         memory.stat       sys-kernel-config.mount/
cgroup.procs            cpuset.cpus.effective   init.scope/            machine.slice/  misc.capacity     sys-kernel-debug.mount/
```

Let's introduce and look very briefly at three directories that will become important to our understanding once we move to the [`systemd`](#systemd) section of the post:

- `machine.slice`
    + This is a directory that contains cgroups for any [`systemd-nspawn`] containers and VMs that have been registered with [`systemd-machined`].
        - Programs like `libvirt` have hooks that when used can register virtual machines as machines and will appear in tools like `machinectl`, and they will appear in `/sys/fs/cgroup/machine.slice`.  Note that this registration happens automatically.
        - This enables convenient ways to see what a cgroup slice is managing, etc.
            + `systemctl cgls`
            + `ps -o cgroup`
    + For example, I have a container that calls [`hugo`] to build my website.  When running, it appears in this directory.
    + See these fantastic articles!
        - [On Running systemd-nspawn Containers](/2022/02/04/on-running-systemd-nspawn-containers/)
        - [On systemd-nspawn](/2018/08/20/on-systemd-nspawn/)
- `system.slice`
    + This contains directories for every service that is running.
- `user.slice`
    + This directory will contain services for every user on the system that has relevant user managers, sessions, or processes, delineated by `uid`.
    + For example, my UID is `1000`, and there are cgroups for groups of binaries that are located in `/sys/fs/cgroup/user.slice/user-1000.slice/`.

Luckily, `systemd` is designed to easily create a new cgroup.  All one has to do is create a new directory in `/sys/fs/cgroup`.  For example, here is a new `pod` service:

```bash
/sys/fs/cgroup/node0.slice/node0-pod0.slice/node0-pod0.service$ ls
cgroup.controllers      cgroup.pressure         cpu.pressure    memory.events.local  memory.oom.group     memory.swap.events    memory.zswap.writeback
cgroup.events           cgroup.procs            cpu.stat        memory.high          memory.peak          memory.swap.high      pids.current
cgroup.freeze           cgroup.stat             cpu.stat.local  memory.low           memory.pressure      memory.swap.max       pids.events
cgroup.kill             cgroup.subtree_control  io.pressure     memory.max           memory.reclaim       memory.swap.peak      pids.events.local
cgroup.max.depth        cgroup.threads          memory.current  memory.min           memory.stat          memory.zswap.current  pids.max
cgroup.max.descendants  cgroup.type             memory.events   memory.numa_stat     memory.swap.current  memory.zswap.max      pids.peak
```

Note there are no directories.  They expose cgroup controllers such as `cpu`, `io`, `memory` and `pids`, and you can interface with the kernel by reading and writing to these files.

> `systemd` is discussed later in more depth, but it's difficult to introduce the topic of cgroups and give examples of `cgroupfs` (the cgroup filesystem) without mentioning it.

### cgroups Demo

> Note that I'm using the phrases "container anchor", "`init` process" and "reaper" interchangeably in this article.  They all refer to PID 1 of any given pod.

It's demo time, children.  I referred to a fork bomb in the [Introduction](#introduction) to his fabulous post.  Well, setting up a safe lab is exactly what we're now going to do to demonstrate how the fork bomb can be constrained with crgoups.  Here are the steps:

1. Create the cluster.
1. Get the PID of the container anchor process and move a `bash` process its namespaces.
1. Determine the cgroup in which the container anchor belongs.
1. Get the PID of the `bash` process and move it into the container anchor's cgroup.
1. Invoke the fork bomb in the `bash` shell.

Let's use the shell scripts in the [`cluster`] repository to build a cluster in a local lab.  The scripts are mounted in a VM at `/mnt/shared/cluster`.  I'll leave this up to you to create a virtual machine with that mount point, or just put the scripts wherever you'd like, I can't tell you what to do.

First, build a cluster with two nodes and a pod:

```bash
$ sudo bash /mnt/shared/cluster/cluster.sh --internet
$ sudo bash /mnt/shared/cluster/pod.sh --nodens node0 --pods 1 --property MemoryMax=128M --property TasksMax=50
Running as unit: node0-pod0.service
$ sudo bash /mnt/shared/cluster/ctl.sh --get nodes
NODE    | NODE IP
node1   | 10.0.0.102
node0   | 10.0.0.101
$ sudo bash /mnt/shared/cluster/ctl.sh --get pods
NODE    | NODE IP      | POD          | POD IP
  node0 |   10.0.0.101 |   node0-pod0 |   172.16.0.100
```

Let's get the PID of the reaper (the `init` process).  We need this as the target of the [`nsenter`] command, which enables the listed namespaces of the target process to be entered as the execution context of the process that `nsenter` is launching.

```bash
$ sudo bash /mnt/shared/cluster/ctl.sh --get pids --process sandbox-init
NODE    | NODE IP      | POD          | POD IP         | PIDS       | PROCESS
  node0 |   10.0.0.101 |   node0-pod0 |   172.16.0.100 |     954,1 | sandbox-init
```

The `get pids` command will show all the instances of the given process (`--process sandbox-init`) and where it is running.  This is extremely helpful to get the PID of the `init` process in each pod.

You may be wondering why there are two PIDs listed in the output.  The first is the PID of `sandbox-init` from the view of the default `pid` namespace, and the second is the PID from the view of the pod `pid` namespace.  From the output, we can verify that `sandbox-init` is indeed PID 1 in the pod.

> If you're not using the [`ctl.sh`](https://github.com/btoll/cluster/blob/master/ctl.sh) script, you can find the PID like this:
>
> ```bash
> $ pidof sandbox-init
> 954
> ```
> Note that [`pidof`] only returns one PID in this example, because there is only one `sandbox-init` process currently executing.  `pidof` can return multiple values.
>
> Since it can return more than one PID, it's not the best way tool to use.  You can use the `-s` switch to only return one PID, but which PID?  Best stick to the `ctl.sh` script, little fella.

Great, we can now use PID 954 as the target for our friend `nsenter`.  Again, this will invoke `bash` within all of the listed namespaces of the target process:

```bash
$ sudo nsenter --target 954 --net --pid --mount --cgroup --ipc --uts --time -- bash
root@dane-brass:/#
```

We can now see that the `bash` process is indeed running in the pod's `pid` namespace:

```
$ sudo nsenter --target 954 --pid --mount -- ps -ef
UID          PID    PPID  C STIME TTY          TIME CMD
root           1       0  0 04:47 ?        00:00:00 /mnt/shared/cluster/sandbox-init
root           2       0  0 05:36 pts/1    00:00:00 bash
root           4       0  0 05:38 pts/3    00:00:00 ps -ef
```

> Note that this invocation of `nsenter` doesn't need to include all of the namespaces that previous one did that spawned `bash`.  This is because the first one is invoking a potentially long-running command that will need to be in all of the same namespaces as those of the other process in the pod, and the second `nsenter` command is executing a one-off command that only needs to have the same view of the `pid` and `mount` namespaces as that of the target PID.

However, there is a detail here that should not go unnoticed: the parent of the `bash` process is **not** PID 1 (the `PPID` column is the parent PID).  It is 0, which means that the parent exists outside of the pod's `pid` namespace and cannot be seen.

What does this mean?  Well, it means that the `bash` process one was not reparented to PID 1 (`sandbox-init`) in the pod.  You can also tell just by looking at the `nsenter` command.  The process wasn't put in the background when it was invoked, so the [`nsenter`] process is still its parent.  If it had been put in the background, the `nsenter` process would have exited, and the `bash` process would have been reparented to the process that is PID 1 of the namespace of the target PID in the command above.

> The reason I didn't background it is because I wanted a `pty` in which to run the fork bomb.

So, if a SIGTERM is sent to PID 1, it will not terminate the `bash` process because it is not its parent.  Incidentally, this doesn't have anything to do with cgroups, but it is worth pointing out, as it aids in understanding how pods can operate and aids in understanding (this may not be how Kubernetes works underneath the hood, by the way, but it was a design choice that I made when creating the cluster).

> What does it look like to run it in the background?  Just add an ampersand (`&`) to the end of the command:
>
> ```bash
> $ sudo nsenter --target 954 --net --pid --mount --cgroup --ipc --uts --time -- bash &
> ```

Now that that has been discussed, we need to address the most crucial thing to do, and it has everything to do with cgroups.  You **must** add the PID of the `bash` process to the cgroup to which the `init` process belongs.

You may be asking why this step is necessary, and it's a good question!  After all, `bash` is running in the same `pid` namespace as the other containers in the pod, so wouldn't it have the same resource limits?  No, it doesn't, because it is still part of the cgroup of the parent that spawned it.

<!--This helps demonstrate another reason why it is crucial to reparent a process to PID 1 in the new namespace.  Not only can PID 1 then reap all of its children, but the new process will join the parent's cgroup, meaning that the new process will inherit all of the limits of its new parent, which is exactly what we want!-->

However, how do we get this information?  How can we confirm that the `bash` PID is in another cgroup, i.e., the one in which its parent belongs?

When beginning to learn about cgroups, I found one of the most time-consuming things is to try and discover what PIDs belong to a particular cgroup.  Let's determine that now.

The first thing to do is get the PID of `bash`.  There are many instances of `bash` running on the VM, so we don't know immediately which one it is:

```bash
$ pidof bash
1142 1133 790
$ ps -o pid,ppid,comm -C bash
    PID    PPID COMMAND
    790     789 bash
   1133    1132 bash
   1142    1141 bash
```

We can also get cgroup and namespace information from [`ps`]:

```bash
$ sudo ps -o pid,netns,pidns,cgroup -C bash
    PID      NETNS      PIDNS CGROUP
    790 4026531840 4026531836 0::/user.slice/user-1000.slice/session-1.scope
   1133 4026532605 4026532671 0::/user.slice/user-1000.slice/session-1.scope
   1142 4026531840 4026531836 0::/user.slice/user-1000.slice/session-4.scope
```

The numbers in the `NETNS` (`net` namespace) and `PIDNS` (`pid` namespace) columns are [`inode`] numbers that reference namespaces.  The middle entry looks interesting, because it is has a different `inode` which probably indicates that it is the `bash` process we are looking for.  Let's get the PID and use that to get some more information.

Using [`ip-netns`], we can determine the `net` namespace it is running in:

```bash
$ sudo ip netns identify 1133
node0-pod0
```

That confirms it, as we know that the process is running in the `node0-pod0` namespace.  As designed, it is also the name of the pod.

> Once many pods have been created, loop through all of the `init` process to get a view of them:
> ```bash
> $ for pid in $(pidof sandbox-init)
> > do
> > sudo ip netns identify "$pid"
> > sudo nsenter -t "$pid" -p -m -- ps -ef
> > echo
> > done
> ```

The last one looks like it may be the fella we're interested in.  Let's compare it to the `inode` of the namespace that the `init` process belongs to:

We can also use information from `procfs` to get more information to confirm our findings now that we know the PID.

Get the name of the executable:

```bash
$ sudo ls -l /proc/1133/exe
lrwxrwxrwx 1 root root 0 Oct  7 05:37 /proc/1133/exe -> /usr/bin/bash
```

Get all of the namespaces the PID is in:

```bash
$ sudo ls -l /proc/1133/ns
total 0
lrwxrwxrwx 1 root root 0 Oct  7 06:30 cgroup -> 'cgroup:[4026532672]'
lrwxrwxrwx 1 root root 0 Oct  7 06:30 ipc -> 'ipc:[4026532670]'
lrwxrwxrwx 1 root root 0 Oct  7 06:30 mnt -> 'mnt:[4026532668]'
lrwxrwxrwx 1 root root 0 Oct  7 05:37 net -> 'net:[4026532605]'
lrwxrwxrwx 1 root root 0 Oct  7 06:30 pid -> 'pid:[4026532671]'
lrwxrwxrwx 1 root root 0 Oct  7 06:59 pid_for_children -> 'pid:[4026532671]'
lrwxrwxrwx 1 root root 0 Oct  7 06:30 time -> 'time:[4026532673]'
lrwxrwxrwx 1 root root 0 Oct  7 06:59 time_for_children -> 'time:[4026532673]'
lrwxrwxrwx 1 root root 0 Oct  7 06:30 user -> 'user:[4026531837]'
lrwxrwxrwx 1 root root 0 Oct  7 06:30 uts -> 'uts:[4026532669]'
```

Get the cgroup it belongs to:

```bash
$ sudo cat /proc/1133/cgroup
0::/user.slice/user-1000.slice/session-1.scope
```

<!--
```bash
$ sudo ls -l /proc/$(pidof sandbox-init)/ns/pid | awk '{print $NF}'
pid:[4026532671]
```
-->

We knew the cgroup of the PID would still be that of its parent and **not** PID 1 in the pod, and this confirms it.  If the fork bomb were to be executed in that `bash` shell, it would bring down the whole virtual machine.  Why?  Because, it doesn't have the limits needed to limit the damage.  What are the `pid` and `memory` limits of its current cgroup?

```bash
$ cat /sys/fs/cgroup/user.slice/user-1000.slice/session-1.scope/{pids.max,memory.max}
max
max
```

Note, the process isn't contained at all for these resources.  This is a terrible, horrible, no-good rotten thing, and it must be rectified before we can continue with the demo.

> However, this teaches us a good lesson, children.  When reparenting a process to PID 1, the process that was reparented is *still* a member of the cgroup in which it was created.  Reparenting and cgroup membership are two completely different things.

To make it a member of a new cgroup, you must add it to the `cgroup.procs` file in the correct cgroup:

```bash
$ cd /sys/fs/cgroup/node0.slice/node0-pod0.slice/node0-pod0.service
$ echo 1133 | sudo tee cgroup.procs
1133
$ cat cgroup.procs
953
954
1133
```

Note that if the `bash` process had been spawned by PID 1 in the `node0-pod0` pod, then it would automatically have been a member of the same cgroup as its parent (`sandbox-init`), and manually adding it as we did just now would not have been necessary.

Let's take another look in `procfs` to see what cgroup the `bash` process now belongs to:

```bash
$ sudo cat /proc/1133/cgroup
0::/node0.slice/node0-pod0.slice/node0-pod0.service
```

Nice!  And, its resources limits:

```bash
$ cat /sys/fs/cgroup/node0.slice/node0-pod0.slice/node0-pod0.service/{pids.max,memory.max}
50
134217728
```

Great, that's what we want!  Now, we can safely detonate the fork bomb and know that the damage will be contained and won't affect any container neighbors or the virtual machine itself:

```bash
$ :(){ :|:& };:
$ cat /sys/fs/cgroup/node0.slice/node0-pod0.slice/node0-pod0.service/pids.current
50
$ cat /sys/fs/cgroup/node0.slice/node0-pod0.slice/node0-pod0.service/memory.current
12943360
```

> What is the fork bomb doing?  It is calling itself and piping the results to another invocation and backgrounding itself.  This will keep happening recursively until the resources are completely exhausted, leaving the machine inoperable.

Let's now look to an easier and simpler way to manage our cgroup hierarchies using [`systemd`].

## `systemd`

<!--TODO: talk about how systemctl and systemd registers a cgroup with systemd-->

Ok, now we get to the big guy, [`systemd`].  [`systemd`] is an `init` system.  At one point, it was controversial in the Linux community, and my understanding is because it doesn't follow the Unix philosophy of small tools doing one thing well that are composable.  At the time of this writing, there are some distros that have still not adopted it (or adopted it as the default), such as Alpine Linux and Gentoo.  I have no opinion on this myself, but I respect both sides of the argument.

`systemd` can be a bit overwhelming because it does so much.  I think that most people know it's an `init` system, but not much beyond that because it is software that "just works" and is invisible to most users.  It was much the same for me, until I became very interested in container technology.

> We're only going to look at the bits of `systemd` that container managers and orchestrators hack on, as looking at `systemd` as a whole is a huge topic and way out of the scope of this article.

There are three `sytemd` units, and they expose the low-level kernel cgroups: [`slice`], [`service`] and [`scope`].  Instead of me just repackaging what the official docs say, I'm going to print it here verbatim:

> 1. 💼 **The .service unit type.** This unit type is for units encapsulating processes systemd itself starts. Units of these types have cgroups that are the leaves of the cgroup tree the systemd instance manages (though possibly they might contain a sub-tree of their own managed by something else, made possible by the concept of delegation). Service units are usually instantiated based on a unit file on disk that describes the command line to invoke and other properties of the service. However, service units may also be declared and started programmatically at runtime through a D-Bus API (which is called transient services).
>
> 1. 👓 **The .scope unit type.** This is very similar to .service. The main difference: the processes the units of this type encapsulate are forked off by some unrelated manager process, and that manager asked systemd to expose them as a unit. Unlike services, scopes can only be declared and started programmatically, i.e. are always transient. That’s because they encapsulate processes forked off by something else, i.e. existing runtime objects, and hence cannot really be defined fully in 'offline' concepts such as unit files.
>
> 1. 🔪 **The .slice unit type.** Units of this type do not directly contain any processes. Units of this type are the inner nodes of part of the cgroup tree the systemd instance manages. Much like services, slices can be defined either on disk with unit files or programmatically as transient units.
>
> See [Control Group APIs and Delegation] for more information.

Well, children, we're going to get more familiar with `systemd` and how it can manage cgroups, and these units are the building blocks.  They will greatly simplify managing the nodes and pods in the cluster we built from Linux primitives, as well as giving us easier ways to get information about a particular process and the cgroup it belongs to.

Just like a cluster can be represented as a tree structure, the same can be so with cgroup hierarchies.  For instance, we can model the cgroups after the node and pod hierarchies of the cluster.

Let's take the example of a two-node cluster with two pods on each node:

```
      __ host __
     /          \
   node         node
   / \          /  \
pod   pod    pod    pod
```

Here is the same representation as a cgroup hierarchy:

```
/sys/fs/cgroup/
├── node0.slice
│   ├── node0-pod0.slice
│   │   └── node0-pod0.service
│   └── node0-pod1.slice
│       └── node0-pod1.service
└── node1.slice
    ├── node1-pod2.slice
    │   └── node1-pod2.service
    └── node1-pod3.slice
        └── node1-pod3.service

```

cgroups don't have parent-child relationships, though, and the only way to nest services is to use the `hyphen` when creating a "nested" slice.  For example, when creating adding a new pod slice to a node, the command must be `node0-pod2.slice`.  This would then put that slice within the `node0.slice` branch.

From the docs ([Control Group APIs and Delegation]):

> The naming of slice units directly maps to the cgroup tree path. This is not the case for `service` and `scope` units however. A slice named `foo-bar-baz.slice` maps to a cgroup `/foo.slice/foo-bar.slice/foo-bar-baz.slice/`. A service `quux.service` which is attached to the slice `foo-bar-baz.slice` maps to the cgroup `/foo.slice/foo-bar.slice/foo-bar-baz.slice/quux.service/`.

In my cluster scripts, the shell script [`pod.sh`](https://github.com/btoll/cluster/blob/master/pod.sh) creates transient `slice` and `service` units like this:

```bash
systemctl set-property node0-pod0.slice MemoryMax=1G

systemd-run \
    --no-block \
    --slice=node0-pod0.slice \
    --unit=node0-pod0.service \
    --property MemoryMax=128M \
    --property TasksMax=50 \
    ip netns exec node0-pod0 unshare --fork --pid --mount-proc --cgroup --ipc --uts --time -- "$SOURCE_DIR/sandbox-init"
```
```

The first command will add a new `node0-pod0.slice` within the `node0.slice` cgroup for a new pod (`node0.slice` had already been created), and then the second command will add a new `node0-pod0.service` that holds a process will be created as the following hierarchy in `/sys/fs/cgroup/node1.slice`:

```bash
node0.slice/
└── node0-pod0.slice
    └── node0-pod0.service
```

Both the new `slice` and the new `service` will be transient (a non-transient unit, that is, one that will survive a reboot, will have a `systemd` unit file).  Both `systemctl set-property` and `systemd-run` will create transient `systemd` units, which is fine for my design as a temporary cluster for learning purposes in a lab.  A "real" cluster, though, would need those units to persist.

If the `hyphen` was not included, i.e., `pod0.slice` instead of `node0-pod0.slice`, then the `pod0.slice` would be created within the root slice (i.e., `/sys/fs/cgroup`) *alongside* `node0.slice`, which is not what we want (the `pod0.service` unit would be created within `pod0.slice`, however).

Again, the hyphen is what tells `systemd` to create a nested structure.

`systemd` has units that are perfect for creating hierarchies of cgroups.

`system.slice` is a `systemd` slice unit represented by a cgroup node that can contain other slices or one or more services.  However, a service cannot contain a slice.  A service can only be a leaf node.

> This is *mostly* true.  A delegated service can create and manage child cgroups beneath itself using `Delegate=`, but that is beyond the scope of this article.

### `scope` Units

I wanted to write a bit more about [`scope`] units, because it wasn't clear to me at first under what circumstances they are created.  According to the definition, they are created when a process is forked by an unrelated manager process, meaning a manager process that is not under direct control of `systemd`.

These unrelated manager processes are usually processes that are login processes, such as [`login`], [`ssh`], [`tmux`], [`gdm3`] (GNOME Display Manager), etc..  These logins will create user sessions, and anything forked by processes in those sessions are put into a `scope` unit.  As such, they are transient and will be stopped when the session ends.

Let's see some examples.  First, I'll boot into the `systemd` `multi-user` target (`sudo systemctl isolate multi-user.target`), which is the `systemd` equivalent to the older System V-style [runlevel] 3 initialization.

> I've configured my machine to boot to the `multi-user` target, so I'm actually not running that command anywhere (in other words, I just issued a `reboot` command from command line to get to a system `login` prompt).

Get the PID of the shell:

```bash
$ echo $$
2050
```

We'll use our old friend [`ps`] to get its cgroup and its parent PID:

```bash
$ ps -o pid,ppid,comm,args,cgroup -p $$
    PID    PPID COMMAND         COMMAND                     CGROUP
   2050    1569 bash            -bash                       0::/user.slice/user-1000.slice/session-1.scope
```

Let's now use the same command on the PPID:

```bash
$ ps -o pid,ppid,comm,args,cgroup -p 1569
    PID    PPID COMMAND         COMMAND                     CGROUP
   1569       1 login           login -- btoll              0::/user.slice/user-1000.slice/session-1.scope
```

Here we see the `login` process forked our `bash` shell.  Both are in `session-1.scope` that the `login` process created when logging in.  `login` is not managed by `systemd` and is thus an unrelated manager process.

Now, we'll print the statuses of both processes:

```bash
$ sudo systemctl status $$
● session-1.scope - Session 1 of User btoll
     Loaded: loaded (/run/systemd/transient/session-1.scope; transient)
  Transient: yes
     Active: active (running) since Fri 2026-10-09 01:47:02 EDT; 3min 10s ago
 Invocation: d02809d5eca04bea832bac7271d04b61
      Tasks: 5
     Memory: 196.3M (peak: 205.5M)
        CPU: 857ms
     CGroup: /user.slice/user-1000.slice/session-1.scope
             ├─1569 "login -- btoll"
             ├─2050 -bash
             ├─2189 sudo systemctl status 2050
             ├─2191 sudo systemctl status 2050
             └─2192 systemctl status 2050

Oct 09 01:47:02 kilgore-trout systemd[1]: Started session-1.scope - Session 1 of User btoll.
Oct 09 01:50:05 kilgore-trout sudo[2175]:    btoll : TTY=tty1 ; PWD=/home/btoll ; USER=root ; COMMAND=/usr/bin/systemctl status 2050
Oct 09 01:50:05 kilgore-trout sudo[2175]: pam_unix(sudo:session): session opened for user root(uid=0) by btoll(uid=1000)
Oct 09 01:50:05 kilgore-trout sudo[2175]: pam_unix(sudo:session): session closed for user root
Oct 09 01:50:13 kilgore-trout sudo[2189]:    btoll : TTY=tty1 ; PWD=/home/btoll ; USER=root ; COMMAND=/usr/bin/systemctl status 2050
Oct 09 01:50:13 kilgore-trout sudo[2189]: pam_unix(sudo:session): session opened for user root(uid=0) by btoll(uid=1000)

$ sudo systemctl status 1569
● session-1.scope - Session 1 of User btoll
     Loaded: loaded (/run/systemd/transient/session-1.scope; transient)
  Transient: yes
     Active: active (running) since Fri 2026-10-09 01:47:02 EDT; 4min 28s ago
 Invocation: d02809d5eca04bea832bac7271d04b61
      Tasks: 5
     Memory: 201.1M (peak: 219.2M)
        CPU: 1.251s
     CGroup: /user.slice/user-1000.slice/session-1.scope
             ├─1569 "login -- btoll"
             ├─2050 -bash
             ├─2225 sudo systemctl status 1569
             ├─2227 sudo systemctl status 1569
             └─2228 systemctl status 1569

Oct 09 01:50:05 kilgore-trout sudo[2175]: pam_unix(sudo:session): session opened for user root(uid=0) by btoll(uid=1000)
Oct 09 01:50:05 kilgore-trout sudo[2175]: pam_unix(sudo:session): session closed for user root
Oct 09 01:50:13 kilgore-trout sudo[2189]:    btoll : TTY=tty1 ; PWD=/home/btoll ; USER=root ; COMMAND=/usr/bin/systemctl status 2050
Oct 09 01:50:13 kilgore-trout sudo[2189]: pam_unix(sudo:session): session opened for user root(uid=0) by btoll(uid=1000)
Oct 09 01:50:13 kilgore-trout sudo[2189]: pam_unix(sudo:session): session closed for user root
Oct 09 01:50:53 kilgore-trout sudo[2215]:    btoll : TTY=tty1 ; PWD=/home/btoll ; USER=root ; COMMAND=/usr/bin/systemctl status 1569
Oct 09 01:50:53 kilgore-trout sudo[2215]: pam_unix(sudo:session): session opened for user root(uid=0) by btoll(uid=1000)
Oct 09 01:50:53 kilgore-trout sudo[2215]: pam_unix(sudo:session): session closed for user root
Oct 09 01:51:31 kilgore-trout sudo[2225]:    btoll : TTY=tty1 ; PWD=/home/btoll ; USER=root ; COMMAND=/usr/bin/systemctl status 1569
Oct 09 01:51:31 kilgore-trout sudo[2225]: pam_unix(sudo:session): session opened for user root(uid=0) by btoll(uid=1000)
```

Next, I'll "boot" into the `systemd` `graphical` target (`sudo systemctl isolate graphical.target`), which is the `systemd` equivalent to the older System V-style [runlevel] 5 initialization.

```bash
$ sudo systemctl isolate graphical.target
```

This brings up the GNOME display manager.  I login and then launch [`kitty`], my [terminal emulator].

```bash
$ ps -o pid,ppid,comm,args,cgroup -p 5348
    PID    PPID COMMAND         COMMAND                     CGROUP
   5348    5025 bash            -bash                       0::/user.slice/user-1000.slice/user@1000.service/app.slice/kitty-3808-0.scope
$ ps -o pid,ppid,comm,args,cgroup -p 5025
    PID    PPID COMMAND         COMMAND                     CGROUP
   5025    2020 tmux: server    tmux new-session -s /home/b 0::/user.slice/user-1000.slice/user@1000.service/app.slice/kitty-3808-0.scope
$ ps -o pid,ppid,comm,args,cgroup -p 2020
    PID    PPID COMMAND         COMMAND                     CGROUP
   2020       1 systemd         /usr/lib/systemd/systemd -- 0::/user.slice/user-1000.slice/user@1000.service/init.scope
$ ps -o pid,ppid,comm,args,cgroup -p 1
    PID    PPID COMMAND         COMMAND                     CGROUP
      1       0 systemd         /sbin/init                  0::/init.scope
```

```bash
$ pstree -hp 5025
tmux: server(5025)───bash(5348)─┬─pstree(24194)
                                └─vim(11832)─┬─python3(11835)─┬─{python3}(11838)
                                             │                └─{python3}(11839)
                                             ├─{vim}(11836)
                                             ├─{vim}(11837)
                                             ├─{vim}(11840)
                                             └─{vim}(17008)
```

If you want to see all of the processes in the session started by `systemd` after `kitty` was launched, do the following:

```bash
$ ps -o pid,ppid,comm,args,cgroup -C kitty
    PID    PPID COMMAND         COMMAND                     CGROUP
   3808    3174 kitty           /usr/bin/kitty              0::/user.slice/user-1000.slice/user@1000.service/app.slice/app-gnome-kitty-3808.scope
$ ps -o pid,ppid,comm,args,cgroup -p 3174
    PID    PPID COMMAND         COMMAND                     CGROUP
   3174    2020 gnome-shell     /usr/bin/gnome-shell        0::/user.slice/user-1000.slice/user@1000.service/session.slice/org.gnome.Shell@wayland.service
$ ps -o pid,ppid,comm,args,cgroup -p 2020
    PID    PPID COMMAND         COMMAND                     CGROUP
   2020       1 systemd         /usr/lib/systemd/systemd -- 0::/user.slice/user-1000.slice/user@1000.service/init.scope
$ systemctl --user status kitty-3808-0.scope
● kitty-3808-0.scope - kitty child process: 3829 launched by: 3808
     Loaded: loaded (/run/user/1000/systemd/transient/kitty-3808-0.scope; transient)
  Transient: yes
     Active: active (running) since Fri 2026-10-09 01:53:25 EDT; 56min ago
 Invocation: d1c2ebb7ffd14e78b743b0a63b98b348
      Tasks: 16 (limit: 18672)
     Memory: 647.4M (peak: 674.8M)
        CPU: 2min 21.346s
     CGroup: /user.slice/user-1000.slice/user@1000.service/app.slice/kitty-3808-0.scope
             ├─ 3829 /bin/bash --posix
             ├─ 5025 tmux new-session -s /home/btoll -d
             ├─ 5348 -bash
             ├─ 5350 tmux attach -t /home/btoll
             ├─28198 vim
             ├─28201 /usr/bin/python3 /home/btoll/.vim/plugged/YouCompleteMe/python/ycm/../../third_party/ycmd/ycmd --port=35175 --options_file=/tmp/tmpkaj6imq>
             ├─40629 systemctl --user status kitty-3808-0.scope
             ├─40630 pager
             ├─40631 sh -c /home/btoll/.tmux/plugins/tmux-weather/scripts/forecast.sh
             ├─40632 sh -c "/home/btoll/.tmux/plugins/tmux-battery/scripts/battery_color.sh bg"
             ├─40633 bash /home/btoll/.tmux/plugins/tmux-weather/scripts/forecast.sh
             └─40634 tmux new-session -s /home/btoll -d

Oct 09 02:41:31 kilgore-trout sudo[34313]: pam_unix(sudo:session): session closed for user root
Oct 09 02:48:13 kilgore-trout sudo[39581]:    btoll : TTY=pts/1 ; PWD=/home/btoll/projects/benjamintoll.com ; USER=root ; COMMAND=/usr/bin/systemctl status app>
Oct 09 02:48:13 kilgore-trout sudo[39581]: pam_unix(sudo:session): session opened for user root(uid=0) by btoll(uid=1000)
Oct 09 02:48:13 kilgore-trout sudo[39581]: pam_unix(sudo:session): session closed for user root
Oct 09 02:48:28 kilgore-trout sudo[39780]:    btoll : TTY=pts/1 ; PWD=/home/btoll/projects/benjamintoll.com ; USER=root ; COMMAND=/usr/bin/systemctl --user sta>
Oct 09 02:48:28 kilgore-trout sudo[39780]: pam_unix(sudo:session): session opened for user root(uid=0) by btoll(uid=1000)
Oct 09 02:48:28 kilgore-trout sudo[39780]: pam_unix(sudo:session): session closed for user root
Oct 09 02:49:33 kilgore-trout sudo[40429]:    btoll : TTY=pts/1 ; PWD=/home/btoll/projects/benjamintoll.com ; USER=root ; COMMAND=/usr/bin/systemctl --user sta>
Oct 09 02:49:33 kilgore-trout sudo[40429]: pam_unix(sudo:session): session opened for user root(uid=0) by btoll(uid=1000)
Oct 09 02:49:33 kilgore-trout sudo[40429]: pam_unix(sudo:session): session closed for user root

```

Food for thought.

### `systemd` Demo

So, let's look into how `systemd` can help us simplify both the operations we performed in the first section, as well as how it can aid in our lab cluster (see [On Building A Cluster From Linux Primitives]).

We'll start with a demonstration of how `systemd` can improve your life using the same situation as before.  To begin, we'll build the same cluster and look at the number of `bash` processes that are running.

```bash
$ sudo bash /mnt/shared/cluster/cluster.sh --internet
[SUCCESS] Cluster and network topology created.
[INFO] Run `cluster.sh --status [--verbose]` for details.
$ sudo bash /mnt/shared/cluster/pod.sh --nodens node0 --pods 1 --property MemoryMax=128M --property TasksMax=50
Running as unit: node0-pod0.service
$ sudo bash /mnt/shared/cluster/ctl.sh --get nodes
NODE    | NODE IP
node1   | 10.0.0.102
node0   | 10.0.0.101
$ sudo bash /mnt/shared/cluster/ctl.sh --get pods
NODE    | NODE IP      | POD          | POD IP
  node0 |   10.0.0.101 |   node0-pod0 |   172.16.0.100
```

Let's get the PID of the reaper (the `init` process).  We need this as the target of the [`nsenter`] command, which enables the listed namespaces of the target process to be entered as the execution context of the process that `nsenter` is launching.

```bash
$ sudo bash /mnt/shared/cluster/ctl.sh --get pids --process sandbox-init
NODE    | NODE IP      | POD          | POD IP         | PIDS       | PROCESS
  node0 |   10.0.0.101 |   node0-pod0 |   172.16.0.100 |      957,1 | sandbox-init
$ sudo nsenter --target 957 --net --pid --mount --cgroup --ipc --uts --time -- sh -c bash
root@dane-brass:/#
```

Ok, that's great.  Now that the `bash` process is running, let's get information about it like we did in the [cgroup Demo](#cgroup-demo), but by using `systemd` APIs.

First, though, a little background information about how I designed the cluster will help understand how to get the required information from `systemd`.  There are two things to understand in order to properly use [`systemctl`] to get information about a process.

The name of a pod, like the name of a node, is the same as its `net` namespace.  Open another terminal and run the following command:

```bash
$ ip netns list
node0-pod0
node1 (id: 1)
node0 (id: 0)
```

This shows us that the two nodes `node0` and `node1` map to `net` namespaces of the same name, as does the `node0-pod0` pod.

Then, the pod slice **and** the pod service will have the same base name (the `net` namespace) but different extensions (`.slice` and `.service`, respectively).  For example, `node0-pod0.slice` and `node0-pod0.service`.

Armed with that information, we can simply use the pod name to get the status of both the `slice` and the `service` units:

By `slice`:

```bash
$ sudo systemctl status node0-pod0.slice
$ sudo systemctl status node0-pod0.slice
● node0-pod0.slice - Slice /node0/pod0
     Loaded: loaded
    Drop-In: /etc/systemd/system.control/node0-pod0.slice.d
             └─50-MemoryMax.conf
     Active: active since Mon 2026-10-05 04:07:37 UTC; 6min ago
 Invocation: 0b9073ca824b49aabde04829a51a5031
      Tasks: 2
     Memory: 512K (max: 1G, available: 1023.5M, peak: 1.8M)
        CPU: 34ms
     CGroup: /node0.slice/node0-pod0.slice
             └─node0-pod0.service
               ├─956 unshare --fork --pid --mount-proc --cgroup --ipc --uts --time -- /mnt/shared/cluster/sandbox-init
               └─957 /mnt/shared/cluster/sandbox-init

Oct 05 04:07:37 dane-brass systemd[1]: Created slice node0-pod0.slice - Slice /node0/pod0.
```

By `service`:

```bash
$ sudo systemctl status node0-pod0.service
● node0-pod0.service - [systemd-run] /usr/sbin/ip netns exec node0-pod0 unshare --fork --pid --mount-proc --cgroup --ipc --uts --time -- /mnt/shared/cluster/sa>
     Loaded: loaded (/run/systemd/transient/node0-pod0.service; transient)
  Transient: yes
     Active: active (running) since Mon 2026-10-05 04:07:37 UTC; 7min ago
 Invocation: 4b45d41509d44250b7429b13d11db39c
   Main PID: 956 (unshare)
      Tasks: 2 (limit: 50)
     Memory: 500K (max: 128M, available: 127.5M, peak: 1.8M)
        CPU: 41ms
     CGroup: /node0.slice/node0-pod0.slice/node0-pod0.service
             ├─956 unshare --fork --pid --mount-proc --cgroup --ipc --uts --time -- /mnt/shared/cluster/sandbox-init
             └─957 /mnt/shared/cluster/sandbox-init

Oct 05 04:07:37 dane-brass systemd[1]: Started node0-pod0.service - [systemd-run] /usr/sbin/ip netns exec node0-pod0 unshare --fork --pid --mount-proc --cgroup>
```

And as a bonus, another way to get information about a PID is by using it directly in the command:

```bash
$ sudo systemctl status 957
● node0-pod0.service - [systemd-run] /usr/sbin/ip netns exec node0-pod0 unshare --fork --pid --mount-proc --cgroup --ipc --uts --time -- /mnt/shared/cluster/sa>
     Loaded: loaded (/run/systemd/transient/node0-pod0.service; transient)
  Transient: yes
     Active: active (running) since Mon 2026-10-05 04:07:37 UTC; 8min ago
 Invocation: 4b45d41509d44250b7429b13d11db39c
   Main PID: 956 (unshare)
      Tasks: 2 (limit: 50)
     Memory: 500K (max: 128M, available: 127.5M, peak: 1.8M)
        CPU: 44ms
     CGroup: /node0.slice/node0-pod0.slice/node0-pod0.service
             ├─956 unshare --fork --pid --mount-proc --cgroup --ipc --uts --time -- /mnt/shared/cluster/sandbox-init
             └─957 /mnt/shared/cluster/sandbox-init

Oct 05 04:07:37 dane-brass systemd[1]: Started node0-pod0.service - [systemd-run] /usr/sbin/ip netns exec node0-pod0 unshare --fork --pid --mount-proc --cgroup>
```

As expected, the `bash` process isn't part of the cgroup because it wasn't spawned by PID 1 in the pod, the `sandbox-init` process.  Recall that before we had to list all of the `bash` PIDs on the system and then determine which PID was the one we were interested in.  Let's do that again:

```bash
$ sudo ps -o pid,netns,pidns,cgroup -C bash
    PID      NETNS      PIDNS CGROUP
    789 4026531840 4026531836 0::/user.slice/user-1000.slice/session-1.scope
   1034 4026532605 4026532671 0::/user.slice/user-1000.slice/session-1.scope
   1043 4026531840 4026531836 0::/user.slice/user-1000.slice/session-3.scope
```

Here is where `systemd` makes things easier for us.  Again, we suspect that the PID we're interested in is `1034`, because it is in different `net` and `pid` namespaces as the others.  Let's query by the PID:

```bash
$ sudo systemctl status 1034
● session-1.scope - Session 1 of User btoll
     Loaded: loaded (/run/systemd/transient/session-1.scope; transient)
  Transient: yes
     Active: active (running) since Mon 2026-10-05 04:07:07 UTC; 40min ago
 Invocation: 69f67acf9cf04ce9ab7829c99eaad393
      Tasks: 8
     Memory: 16.5M (peak: 26.7M)
        CPU: 948ms
     CGroup: /user.slice/user-1000.slice/session-1.scope
             ├─ 758 "sshd-session: btoll [priv]"
             ├─ 788 "sshd-session: btoll@pts/0"
             ├─ 789 -bash
             ├─1029 sudo nsenter --target 957 --net --pid --mount --cgroup --ipc --uts --time -- sh -c bash
             ├─1031 sudo nsenter --target 957 --net --pid --mount --cgroup --ipc --uts --time -- sh -c bash
             ├─1032 nsenter --target 957 --net --pid --mount --cgroup --ipc --uts --time -- sh -c bash
             ├─1033 sh -c bash
             └─1034 bash

Oct 05 04:07:56 dane-brass sudo[959]: pam_unix(sudo:session): session opened for user root(uid=0) by btoll(uid=1000)
Oct 05 04:07:56 dane-brass sudo[959]: pam_unix(sudo:session): session closed for user root
Oct 05 04:07:58 dane-brass sudo[971]:    btoll : TTY=pts/0 ; PWD=/home/btoll ; USER=root ; COMMAND=/usr/bin/bash /mnt/shared/cluster/ctl.sh --get pods
Oct 05 04:07:58 dane-brass sudo[971]: pam_unix(sudo:session): session opened for user root(uid=0) by btoll(uid=1000)
Oct 05 04:07:58 dane-brass sudo[971]: pam_unix(sudo:session): session closed for user root
Oct 05 04:08:02 dane-brass sudo[998]:    btoll : TTY=pts/0 ; PWD=/home/btoll ; USER=root ; COMMAND=/usr/bin/bash /mnt/shared/cluster/ctl.sh --get pids --proces>
Oct 05 04:08:02 dane-brass sudo[998]: pam_unix(sudo:session): session opened for user root(uid=0) by btoll(uid=1000)
Oct 05 04:08:02 dane-brass sudo[998]: pam_unix(sudo:session): session closed for user root
Oct 05 04:08:40 dane-brass sudo[1029]:    btoll : TTY=pts/0 ; PWD=/home/btoll ; USER=root ; COMMAND=/usr/bin/nsenter --target 957 --net --pid --mount --cgroup >
Oct 05 04:08:40 dane-brass sudo[1029]: pam_unix(sudo:session): session opened for user root(uid=0) by btoll(uid=1000)
```

This is our fella.  This is a `scope` unit created by `systemd`, and we can easily tell that it's the right one because we can see the `nsenter` command.  If we wanted, we could get the status of the `scope` unit, but it would just give us the same information as above:

```bash
$ sudo systemctl status session-1.scope
```

`systemd` will **not** move the PID into the requisite cgroup, so we must still do this ourselves.  It is the same process as before:

```bash
$ cd /sys/fs/cgroup/node0.slice/node0-pod0.slice/node0-pod0.service
$ cat cgroup.procs
956
957
$ echo 1034 | sudo tee cgroup.procs
1034
$ cat cgroup.procs
956
957
1034
```

Query again by PID:

```bash
$ sudo systemctl status 1034
● node0-pod0.service - [systemd-run] /usr/sbin/ip netns exec node0-pod0 unshare --fork --pid --mount-proc --cgroup --ipc --uts --time -- /mnt/shared/cluster/sa>
     Loaded: loaded (/run/systemd/transient/node0-pod0.service; transient)
  Transient: yes
     Active: active (running) since Mon 2026-10-05 04:07:37 UTC; 1h 5min ago
 Invocation: 4b45d41509d44250b7429b13d11db39c
   Main PID: 956 (unshare)
      Tasks: 3 (limit: 50)
     Memory: 500K (max: 128M, available: 127.5M, peak: 1.8M)
        CPU: 291ms
     CGroup: /node0.slice/node0-pod0.slice/node0-pod0.service
             ├─ 956 unshare --fork --pid --mount-proc --cgroup --ipc --uts --time -- /mnt/shared/cluster/sandbox-init
             ├─ 957 /mnt/shared/cluster/sandbox-init
             └─1034 bash

Oct 05 04:07:37 dane-brass systemd[1]: Started node0-pod0.service - [systemd-run] /usr/sbin/ip netns exec node0-pod0 unshare --fork --pid --mount-proc --cgroup>
```

That's great, it's been moved into the correct cgroup!

The last thing to do now is detonate our old friend, the fork bomb, and then check the status of the pod `service`:

```bash
$ sudo systemctl status 1034
● node0-pod0.service - [systemd-run] /usr/sbin/ip netns exec node0-pod0 unshare --fork --pid --mount-proc --cgroup --ipc --uts --time -- /mnt/shared/cluster/sa>
     Loaded: loaded (/run/systemd/transient/node0-pod0.service; transient)
  Transient: yes
     Active: active (running) since Mon 2026-10-05 04:07:37 UTC; 1h 7min ago
 Invocation: 4b45d41509d44250b7429b13d11db39c
   Main PID: 956 (unshare)
      Tasks: 50 (limit: 50)
     Memory: 11.6M (max: 128M, available: 116.3M, peak: 14.5M)
        CPU: 390ms
     CGroup: /node0.slice/node0-pod0.slice/node0-pod0.service
             ├─ 956 unshare --fork --pid --mount-proc --cgroup --ipc --uts --time -- /mnt/shared/cluster/sandbox-init
             ├─ 957 /mnt/shared/cluster/sandbox-init
             ├─1034 bash
             ├─1209 bash
             ├─1221 bash
             ├─1225 bash
             ├─1228 bash
             ├─1230 bash
             ├─1231 bash
             ├─1232 bash
             ├─1233 bash
             ├─1234 bash
             ├─1235 bash
             ├─1236 bash
             ├─1237 bash
             ├─1238 bash
             ├─1239 bash
             ├─1240 bash
             ├─1241 bash
             ├─1242 bash
             ├─1243 bash
             ├─1244 bash
             ├─1247 bash
             ├─1248 bash
             ├─1249 bash
             ├─1256 bash
             ├─1275 bash
             ├─1276 bash
             ├─1277 bash
             ├─1283 bash
             ...
```

We can see most of the new `bash` processes spawned by the fork bomb, and we see that the `Tasks` and the `Memory` are not exceeding our limits.  This is great, and it verifies that this pod is **not** being a noisy neighbor and that it won't crash the entire virtual memory.

Yay for us.

It's easy to stop this.  Run the following:

```bash
$ sudo systemctl stop node0-pod0.service
```

It may take a while, but `systemd` will signal all process in the cgroup, and eventually it will stop:

```bash
$ sudo systemctl status node0-pod0.service
× node0-pod0.service - [systemd-run] /usr/sbin/ip netns exec node0-pod0 unshare --fork --pid --mount-proc --cgroup --ipc --uts --time -- /mnt/shared/cluster/sa>
     Loaded: loaded (/run/systemd/transient/node0-pod0.service; transient)
  Transient: yes
     Active: failed (Result: timeout) since Mon 2026-10-05 05:17:29 UTC; 11min ago
   Duration: 1h 8min 21.604s
 Invocation: 4b45d41509d44250b7429b13d11db39c
    Process: 956 ExecStart=/usr/sbin/ip netns exec node0-pod0 unshare --fork --pid --mount-proc --cgroup --ipc --uts --time -- /mnt/shared/cluster/sandbox-init>
   Main PID: 956 (code=killed, signal=KILL)
   Mem peak: 16M
        CPU: 1.999s

Oct 05 05:17:29 dane-brass systemd[1]: node0-pod0.service: Killing process 4095 (bash) with signal SIGKILL.
Oct 05 05:17:29 dane-brass systemd[1]: node0-pod0.service: Killing process 4113 (bash) with signal SIGKILL.
Oct 05 05:17:29 dane-brass systemd[1]: node0-pod0.service: Killing process 4114 (bash) with signal SIGKILL.
Oct 05 05:17:29 dane-brass systemd[1]: node0-pod0.service: Killing process 4115 (bash) with signal SIGKILL.
Oct 05 05:17:29 dane-brass systemd[1]: node0-pod0.service: Killing process 4125 (bash) with signal SIGKILL.
Oct 05 05:17:29 dane-brass systemd[1]: node0-pod0.service: Main process exited, code=killed, status=9/KILL
Oct 05 05:17:29 dane-brass ip[957]: Waited for child PID 2405.  Its exit status is
Oct 05 05:17:29 dane-brass systemd[1]: node0-pod0.service: Failed with result 'timeout'.
Oct 05 05:17:29 dane-brass systemd[1]: Stopped node0-pod0.service - [systemd-run] /usr/sbin/ip netns exec node0-pod0 unshare --fork --pid --mount-proc --cgroup>
Oct 05 05:17:29 dane-brass systemd[1]: node0-pod0.service: Consumed 1.999s CPU time, 16M memory peak.
```

The service is now in a `failed` state, and we can clear by using the same command as before:

```bash
$ sudo systemctl reset-failed node0-pod0.service
$ sudo systemctl status node0-pod0.service
Unit node0-pod0.service could not be found.
```

> We could also kill all the spawned by processes by stopping the `slice`.

We can perform the same ooperations by using the `ctl.sh` script:

```bash
$ sudo bash /mnt/shared/cluster/ctl.sh --delete pod --name node0-pod0
```

Stopping a `service` causes `systemd` to stop the processes contained in that `service`.  The exact signal behavior is governed by the following settings of the `service`:
- `KillMode=`
- `KillSignal=`
- `FinalKillSignal=`
- timeout settings
- process tracking

Looking at the output, `systemd` sent [`SIGKILL`] to each process.  This is in contrast to Elon Musk, who sent it a [`SIGHEIL`](https://www.youtube.com/watch?v=-VfYjPzj1Xw).

By the way, to stop an entire node:

```bash
$ sudo systemctl stop node0.slice
```

## Conclusion

I conclude that this article is way too long and, as a consequence, no one will read it.

## References

- [cgroups]
- [Control Groups](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v1/cgroups.html)
- [Control Group APIs and Delegation]
- [Writing VM and Container Managers](https://systemd.io/WRITING_VM_AND_CONTAINER_MANAGERS/)
- [On Building A Cluster From Linux Primitives]
- [On Virtualization And Virtual Machines]

[On Building A Cluster From Linux Primitives]: /2026/09/15/on-building-a-cluster-from-linux-primitives/
[building a cluster from Linux primitives]: /2026/09/15/on-building-a-cluster-from-linux-primitives/
[fork bomb]: /2021/03/18/on-fork-bombs/
[cgroups]: https://www.man7.org/linux/man-pages/man7/cgroups.7.html
[`systemd`]: https://en.wikipedia.org/wiki/Systemd
[On Virtualization And Virtual Machines]: /2026/08/10/on-virtualization-and-virtual-machines/
[quality of service]: https://en.wikipedia.org/wiki/Quality_of_service
[`hugo`]: https://gohugo.io/
[`systemd-nspawn`]: https://www.man7.org/linux/man-pages/man1/systemd-nspawn.1.html
[`pidof`]: https://man7.org/linux/man-pages/man1/pidof.1.html
[`ps`]: https://www.man7.org/linux/man-pages/man1/ps.1.html
[`ip-netns`]: https://www.man7.org/linux/man-pages/man8/ip-netns.8.html
[`inode`]: /2019/11/19/on-inodes/
[`systemd-machined`]: https://www.man7.org/linux/man-pages/man8/systemd-machined.service.8.html
[`systemctl`]: https://www.man7.org/linux/man-pages/man1/systemctl.1.html
[`cluster`]: https://github.com/btoll/cluster
[`nsenter`]: https://www.man7.org/linux/man-pages/man1/nsenter.1.html
[Control Group APIs and Delegation]: https://systemd.io/CGROUP_DELEGATION/
[`SIGKILL`]: https://en.wikipedia.org/wiki/Signal_(IPC)#SIGKILL
[`login`]: https://www.man7.org/linux/man-pages/man1/login.1.html
[`ssh`]: https://en.wikipedia.org/wiki/Secure_Shell
[`tmux`]: https://en.wikipedia.org/wiki/Tmux
[`gdm3`]: https://en.wikipedia.org/wiki/GNOME_Display_Manager
[runlevel]: https://en.wikipedia.org/wiki/Runlevel
[`slice`]: https://man7.org/linux/man-pages/man5/systemd.slice.5.html
[`service`]: https://man7.org/linux/man-pages/man5/systemd.service.5.html
[`scope`]: https://man7.org/linux/man-pages/man5/systemd.scope.5.html
[`kitty`]: https://en.wikipedia.org/wiki/Kitty_(terminal_emulator)
[terminal emulator]: https://en.wikipedia.org/wiki/Terminal_emulator

