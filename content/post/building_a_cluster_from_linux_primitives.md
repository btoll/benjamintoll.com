+++
title = "On Building A Cluster From Linux Primitives"
date = "2026-09-15T01:34:27-04:00"

+++

- [Introduction](#introduction)
- [Network Topology](#network-topology)
    + [Nodes](#nodes)
    + [Pods](#pods)
    + [Containers](#containers)
    + [Services](#services)
    + [`VXLAN`](#vxlan)
- [`sandbox-init`](#sandbox-init)
- [Service Discovery](#service-discovery)
- [Conclusion](#conclusion)
- [References](#references)

---

> All scripts mentioned in this article can be found in the [`cluster`] repo on my GitHub.

---

## Introduction

Today, children, we're going to do something really fun.  We're going to create our own container cluster!  This isn't going to be anything comparable to production container orchestration systems, but it will teach us the Linux primitives upon which something like that could be built, albeit on a much smaller scale.

I've been attracted to container orchestration systems because they are a perfect storm, so to speak, of several areas of technology that have always greatly interested me:

- Linux
- networking
- security
- programming

Kubernetes can be arguably (dubiously?) used and maintained with only having a surface-level awareness of these foundational technologies.  However, it is worth your while to go as deep as you can, as that will not only make you a better developer but will increase your confidence exponentially.  Then, you can do it all over again, as learning is like the layers of an onion, after all.

In honor of that, I've recently done an exploration of how a container cluster *could* be built.  For the most part, I've modeled it after a simple implementation of Kubernetes using its design and approach, even using its nomenclature of nodes and pods.  Those that know Kubernetes will notice that there are some notable deviations, most notably that all pods are allocated an IP address from a cluster-wide pod network rather than from a per-node pod CIDR and the lack of a container engine and runtime.

I wanted to keep it simple while still building something useful.  My goal was to use the Linux commands that can be used to construct a container cluster from Linux primitives.  I feel that I've achieved that, and this article will explain the topology and the theory behind it.

I've created this cluster on my Debian laptop.  It's created using `KVM` and a virtual machine managed by `libvirt`, so the entire network topology is a software-defined network ([SDN]).

For my demo, there are three logical address spaces:

- The node network is the underlay network and uses the 10.0.0.0/16 address space.  It connects the node namespaces and carries the `VXLAN` encapsulated `UDP` packets.  The nodes are connected via virtual bridges.
- The pods are on a [layer 2] network segment that is reachable via 172.16.0.0/16.  This is also carried over `VXLAN`, allowing pods attached to different node bridges to communicate using pod IP addresses.
- The services, not represented in the topology dump below, are added separately and can be referenced by a pod when it is created.  It is found on the 10.96.0.0/18 network.  It contains virtual IPs (VIP) that are implemented by a packet-processing layer such as `iptables` and `IPVS`.  They will not appear as virtual devices, as they are logical addresses implemented by packet-processing rules.

It was important to me not to use a programming language like Go to do this demo.  The reasons were two-fold:

- I wanted to use Linux utilities to show how anyone, regardless of skill level, could begin to build and understand a cluster.
- I wanted to safeguard against the impulse to recreate the wheel, because I do not trust myself not to do that.

---

> Here are some previous articles I've written related to this topic and that you may find interesting:
> - [On Linux Container Networking](/2026/08/12/on-linux-container-networking/)
> - [On Virtualization And Virtual Machines](/2026/08/10/on-virtualization-and-virtual-machines/)
> - [On Ditching Vagrant](/2026/06/29/on-ditching-vagrant/)
> - [On runc](/2022/01/18/on-runc/)

<!--
todo
A network namespace remains alive while something holds a reference to it, such as:

- a process residing in the namespace,
- an open file descriptor for the namespace,
- a bind mount such as /run/netns/name.

In this experiment, ip netns creates a persistent bind mount under /run/netns, so the namespace remains available even if no process is currently using it. The sandbox-init process is still useful as a stable namespace anchor and as PID 1 for the pod’s PID namespace. In production runtimes, namespace lifetime may instead be managed through namespace file descriptors, bind mounts, or the pod sandbox process.
-->

<!-- Note that there are excellent tools for creating containers like [`bubblewrap`], but we won't be using them.  You should definitely check it out.-->

## Network Topology

Let's create the cluster with two nodes and two pods in each node:

```bash
$ sudo bash /mnt/shared/cluster/cluster.sh --internet
[SUCCESS] Cluster and network topology created.
[INFO] Run `cluster.sh --status [--verbose]` for details.
$
$ sudo bash /mnt/shared/cluster/pod.sh --nodens node0 --pods 2
Running as unit: node0_pod0.service
Running as unit: node0_pod1.service
$ sudo bash /mnt/shared/cluster/pod.sh --nodens node1 --pods 2
Running as unit: node1_pod0.service
Running as unit: node1_pod1.service
$
$ sudo bash /mnt/shared/cluster/cluster.sh --status
[INFO] net namespaces
[INFO]          node1-pod1
[INFO]          node1-pod0
[INFO]          node0-pod1
[INFO]          node0-pod0
[INFO]          node1
[INFO]          node0
[INFO]
[INFO] host
[INFO]          lo               UNKNOWN        127.0.0.1/8 ::1/128
[INFO]          enp2s0           UP             192.168.122.33/24 fe80::5011:99e8:a6fc:15c0/64
[INFO]          host-br0         UP             10.0.0.254/16 fe80::58c6:a3ff:fe27:1cff/64
[INFO]          host-veth0@if4   UP             fe80::98fe:e5ff:fe8b:33/64
[INFO]          host-veth1@if6   UP             fe80::4c0f:f7ff:fea7:2e47/64
[INFO]
[INFO] node1
[INFO]          lo               UNKNOWN        127.0.0.1/8 ::1/128
[INFO]          br0              UP             172.16.0.2/16 fe80::c5e:ceff:fe36:9d2a/64
[INFO]          vxlan100         UNKNOWN        fe80::e8c9:52ff:fe69:4a15/64
[INFO]          veth0@if4        UP             fe80::bc45:2eff:fe23:9050/64
[INFO]          host-ceth1@if7   UP             10.0.0.102/16 fe80::4432:f0ff:fe9d:307c/64
[INFO]          veth1@if7        UP             fe80::d4:96ff:febc:ed79/64
[INFO]
[INFO] node0
[INFO]          lo               UNKNOWN        127.0.0.1/8 ::1/128
[INFO]          br0              UP             172.16.0.1/16 fe80::acf9:11ff:fef5:d2f7/64
[INFO]          vxlan100         UNKNOWN        fe80::dc4f:5fff:fe2a:f34/64
[INFO]          host-ceth0@if5   UP             10.0.0.101/16 fe80::e4cd:fcff:fe6a:fe2/64
[INFO]          veth0@if5        UP             fe80::4cdc:86ff:fe6b:3f40/64
[INFO]          veth1@if7        UP             fe80::2461:9dff:fef3:c489/64
[INFO]
[INFO] node1-pod1
[INFO]          lo               UNKNOWN        127.0.0.1/8 ::1/128
[INFO]          ceth1@if8        UP             172.16.0.103/16 fe80::1011:eff:feb2:e745/64
[INFO]
[INFO] node1-pod0
[INFO]          lo               UNKNOWN        127.0.0.1/8 ::1/128
[INFO]          ceth0@if5        UP             172.16.0.102/16 fe80::30a6:4fff:fedb:32be/64
[INFO]
[INFO] node0-pod1
[INFO]          lo               UNKNOWN        127.0.0.1/8 ::1/128
[INFO]          ceth1@if8        UP             172.16.0.101/16 fe80::9087:42ff:fe79:bf70/64
[INFO]
[INFO] node0-pod0
[INFO]          lo               UNKNOWN        127.0.0.1/8 ::1/128
[INFO]          ceth0@if6        UP             172.16.0.100/16 fe80::a0a4:53ff:fef4:95c5/64
[INFO]
```

> This output comes from running `ip -br address` in each network namespace.  The cluster is only using `IPv4`, but it shows `IPv6` as well because filtering for only `v4` addresses will exclude the `veth` devices from the output (of course, they still exist but with `IPv6` addresses only).

Conceptually, the cluster looks like the following:

```
      __ host __
     /          \
   node         node
   / \          /  \
pod   pod    pod    pod
```

There are three different networks:
- Node Network [CIDR]
    + `10.0.0.0/16`
- Pod CIDR
    + `172.16.0.0/16`
- Service CIDR
    + `10.96.0.0/18`

### Nodes

All the nodes are on the same network with an IP address allocated from the same node [CIDR].  This is a shared [layer 2] network carrying IP traffic and is referred to as the underlay network (in a production system, they would probably be connected via [layer 3]).  So, the pods communicate on a different network called the overlay network which conceptually can be thought of as running on top of the underlay network.  The nodes are not machines but separate network namespaces with their own separate virtual network stack.

Depending upon your background, the conceptual machines that belong to the node network may appear confusing or even unintuitive.  I'm including the root network namespace, which is the only one that is present when logging into a new virtual machine, as just another node in the node network with one notable exception:  I refer to it as the `host` node.  All the other nodes, for instance the two nodes that were created with the `cluster.sh` script, are also referred to nodes, and these are the ones that would directly map to Kubernetes nodes.

The reason for this is that `host` node has the same network plumbing as the other nodes on the node network except for a `VXLAN` device: a virtual bridge and one or more `veth` pairs.  And, its *raison d'être* is the same, i.e., the bridge connects isolated network namespaces and provides layer 2 connectivity among all the nodes on the node network.

> Note that I'm calling the root namespace the `host`.  This may be confusing for some readers, but I like that better than `root` and some other names I've tried.  It could also be conceptually thought of as a simple, limited control plane.
>
> In addition, the devices in its namespace will be prefaced with `host-` to visually distinguish the connections among the nodes (that means that the `veth` peer in each node will also be prefaced with `host-`).

Why is the separation needed for the underlay and overlay networks?  Well, the overlay network is traditionally not reachable from outside the cluster (of course, whether it is reachable is determined by routing and firewall configuration).  So, because the cluster is distributed, another network is needed to carry traffic between the nodes (via the `VXLAN` tunnels) which have wrapped the layer 2 traffic inside its own packets.  We'll get to `VXLAN` in a bit.

The host network (`net`) namespace will have a virtual bridge.  Each `vethN` device is plugged into the `host-br0` bridge and connected to a node network namespace:

```bash
$ ip link show master host-br0
5: host-veth0@if4: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master host-br0 state UP mode DEFAULT group default qlen 1000
    link/ether 9a:fe:e5:8b:00:33 brd ff:ff:ff:ff:ff:ff link-netns node0
7: host-veth1@if6: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master host-br0 state UP mode DEFAULT group default qlen 1000
    link/ether 4e:0f:f7:a7:2e:47 brd ff:ff:ff:ff:ff:ff link-netns node1
```

Notice that each link shows which `net` namespace it's connected to (i.e., `link-netns node0`).

You can then take a peek into `node0`'s network namespace and see the pods that *it* is connected to:

```
$ sudo ip -n node0 link show master br0
3: vxlan100: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue master br0 state UNKNOWN mode DEFAULT group default qlen 1000
    link/ether de:4f:5f:2a:0f:34 brd ff:ff:ff:ff:ff:ff
6: veth0@if5: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master br0 state UP mode DEFAULT group default qlen 1000
    link/ether 4e:dc:86:6b:3f:40 brd ff:ff:ff:ff:ff:ff link-netns node0-pod0
8: veth1@if7: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master br0 state UP mode DEFAULT group default qlen 1000
    link/ether 26:61:9d:f3:c4:89 brd ff:ff:ff:ff:ff:ff link-netns node0-pod1
```

The node `node0` has two `veth` connections, one for each pod (i.e., `link-netns node0-pod0`).

So, if you want to add another pod, you'd create a `veth` pair in the node network namespace in which it should live.  One end stays in the node namespace and is plugged into its bridge and the other is moved into a new pod network namespace and given an IP address from the pod CIDR.

> Of course, this is done for you by the `pods.sh` shell script.

### Pods

Like the nodes, each pod will have its own network namespace.  As mentioned, each pod will be allocated an IP address from the cluster-wide 172.16.0.0/16 network, and all pods will be able to communicate on the same layer 2 segment.

Like Kubernetes, all the pods can communicate with one another, but the implementation is different.  In my design, each node does not have its own pod CIDR, rather it shares the cluster-wide pod network.  With many production container orchestration systems, each node *does* have its own pod CIDR, which means that the pods of a node would be allocated an IP address of a subnetwork and would communicate over layer 3, not layer 2.

This pod network is the overlay network, and it uses the virtual bridge of its node as a switch.  Communication on the same node flows through the bridge, while pod communication between nodes goes first to the bridge and is then handled by the `VXLAN` device plugged into the node's bridge.  `VXLAN`s will be covered in more detail in another section.

The bridge learns of the MAC-to-port mappings of the interface inside the pod network namespace from inspecting the Ethernet frame and also uses ['ARP'] to generate traffic to learn IP-to-MAC mappings, just like any layer 2 network.  The [broadcast domain] could be extended across several nodes.

In a production container orchestration systems like Kubernetes, all of this is set up by the [CNI plugin].

### Containers

So far, we've seen network namespaces that conceptually provide logical roles as nodes and pods in the cluster.  Now, we're going to talk about processes, and their journey to run as a container as most people know them.

Everyone by now has heard of [namespaces] and [`cgroups`], Linux kernel primitives that allow for process isolation and resource control.  Combined, they provide [operating-system-level virtualization], and it is common to think of this as a self-contained box or environment, yet they share the kernel of the host.  This is much different from machine-level virtualization, where the processes are more strongly isolated from the host environment through hardware virtualization and other mechanisms, so they don't share the host's kernel.

In the public's imagination, containers are now synonymous with programs like Docker and Podman, whose popularity is in large part due to their ease of use, but it's important to understand that they don't create the namespaces and `cgroups`, rather they delegate the work to a lower layer in the conceptual container stack.  This is the responsibility of a lower-level tool such as [`runc`], which is an implementation of the [OCI Runtime Specification].  At a high-level, it uses a [`rootfs`], or directory tree, and a `config.json` configuration file defined by the spec that is given to it as an OCI bundle through higher-level abstractions such as the aforementioned Docker and Podman.  The kernel then ultimately creates the namespace isolation and resource control as configured through the OCI bundle by `runc`.  These are the same Linux primitives that we've been seeing in this article.

So, now we've learned that popular production container engines are reliant upon the same foundational technology as we've been using in this article.  That is helpful and goes a long way towards demystifying what these projects do underneath the hood.

The processes used in the cluster are isolated by namespaces, but as of this writing they do not use `cgroups`.  This is primarily because the goal of the cluster was focused on networking, not resource usage and controls.  In addition, the processes do not have their own `rootfs` directory tree, so everything shares the host filesystem.  The reasoning for its omission is the same as that of the `cgroups`.

All orphaned processes are re-parented to the `sandbox-init` `init` reaper in a pod (this reaper process will be PID 1 in every pod).  The `sandbox-init` will then [`wait`] for the child to exit and then reap it so it doesn't remain a [zombie process].  This models one way that Kubernetes will clean up re-parented children.

Further, when a container's workload process enters a pod, it is intentionally orphaned so it will be re-parented by the `sandbox-init` reaper.  The container will have the following isolated namespaces:

- `net`
- `pid`
- `mount`
- `uts`

> These are the namespaces that the process is configured to enter, but it is not the full list of namespaces.

It inherits these from the `sandbox-init` process, which is accomplished using the [`nsenter`] command.  It works because the process will inherit the namespaces of the `target` process (`sandbox-init`) after `nsenter` enters its namespaces.  It is used like this:

```bash
$ sudo nsenter --target "$CONTAINER_ANCHOR" --net --pid --mount --uts -- sh -c "$PROCESS &"
```

The main purpose of `nsenter` isn't to re-parent a child, but it can be accomplished by entering the `pid` namespace of a target process and launching a background process.  `nsenter` will then exit, and the background child process will be re-parented to the `init` process of the `pid` namespace of the target process.

> Note that `nsenter` causes the process to be created in the namespaces of the target.  This is the process by which the child inherits the namespaces.
>
> Launching the child process in the background will cause it to be re-parented to PID 1 of the `pid` namespace (`sandbox-init`).  The re-parenting does **not** cause the process to inherit the target namespaces.

### Services

The service network takes advantage of the packet-filtering subsystems of the Linux kernel like [Netfilter] and [IPVS] to provide firewall and load balancing capabilities to the cluster.  Just as a [Kubernetes Service] object will provide the cluster with a stable IP address to reach ephemeral physical backend servers, [`iptables`] and/or IPVS will transport-layer load balancing to ephemeral processes.  These processes will come and go, but [the virtual IP (VIP) remains the same](https://www.youtube.com/watch?v=Z_-MW3IEAJc).

Incidentally, Kubernetes has several [proxy modes] that services can choose to use, and two of them are [`iptables`] or IPVS.  Using `iptables` (a frontend to Netfilter) may be slower, as a large cluster could have thousands of rules added to chains, and each one needs to be searched until a matching rule can be found for the packet.  IPVS, on the other hand, is built on Netfilter and is much faster as it has a hash table lookup for packets.

> Kubernetes has [deprecated IPVS proxy mode](https://kubernetes.io/docs/reference/networking/virtual-ips/#proxy-mode-ipvs) in favor of [`nftables` proxy mode](https://kubernetes.io/docs/reference/networking/virtual-ips/#proxy-mode-nftables).

The [`kube-proxy`], if used, provides this functionality in Kubernetes.  A [CNI plugin] could provide both the underlay and the overly network connectivity.

When a service is created in the demo cluster, it is added to `ipvsadm`.  Here is an example of adding a `dns` service:

```bash
$ sudo ip netns exec node0 ipvsadm \
    --add-service \
    --udp-service 10.96.64.10:53 \
    --scheduler rr
```

This commmand should only be executed in the network namespace of every node in the cluster (recall that every network namespace gets its own network stack, routes, firewall rules, et al. and this includes the kernel subsystem `IPVS`).  It should **not** be run in any of the pod network namespaces.  Because the VIP is part of the node's network namespace, there does not need to be any Netfilter rules to handle forwarding traffic to the server instances when a query is initiated within the node.

However, this is not the case when the query is executed from a pod.  Because the pods have their own separate network namespaces that are distinct from the nodes, there are rules that needed to be added to the `PREROUTING` hook in [Netfilter] that tells the kernel to handle the traffic so it is not dropped.  If the rule(s) were added to a hook *after* `PREROUTING` then it would be too late; the kernel would see that there is no real or virtual link that would handle the packet (i.e., no valid local destination), and it would be discarded.

Here is an example of a rule that successfully has the kernel handle a packet sent from a pod:

```bash
$ sudo ip netns exec node1 iptables \
    --table nat \
	--append KUBE-SERVICES \
	--destination "$service_ip" \
	--protocol "$service_protocol" \
	--dport "$service_port" \
	--jump DNAT \
	--to-destination "$container_ip:$service_port"
```

> Again, each network namespace gets its own firewall rules, so this **must** be executed in the correct network namespace (a node).

### `VXLAN`

`VXLAN` is defined in [RFC 7348], and it is an improvement on the older [`VLAN`] (Virtual Local Area Network) broadcast domain.  It is used to create overlay networks for distributed systems like container orchestration systems.

It's reason-for-being is to tunnel layer 2 traffic within a layer 3 network packet.  This allows for nodes to forward data to a remote system that is not physically connected to a network bridge, and this enables distributed nodes with potentially many virtual machines or containers to be in the same broadcast domain or in the same layer 2 segment depending upon its `VNI` (more on this in a bit).

The `VTEP` (`VXLAN` Tunnel Endpoint) is the software construct that facilitates the packet forwarding to another device on the same layer 2 segment.  But, you may wonder, how do the `VTEP`s learn the MAC addresses of the hosts that are part of its `VNI`?  The source `VTEP` will send an [`ARP`] broadcast packet asking which `VTEP` knows of the destination MAC address, then a unicast packet is returned to the source `VTEP` from the `VTEP` who fronts for the host.  Everyone will update their `FDB` mapping tables accordingly.

> A `VTEP` can be either software (created by the hypervisor) or hardware, and in our case, it is a software device that was created by `KVM`.

The `FDB` is the mapping table on a `VTEP` that maps `VTEP` IP addresses MAC addresses.  Let's look at its entries:

```bash
$ sudo ip netns exec node1 bridge fdb show dev vxlan100
82:1f:f5:f9:44:52 master br0
ea:7d:59:77:4c:0d master br0
96:8e:ff:18:40:f9 vlan 1 master br0 permanent
96:8e:ff:18:40:f9 master br0 permanent
00:00:00:00:00:00 dst 10.0.0.101 self permanent
ea:7d:59:77:4c:0d dst 10.0.0.101 self
82:1f:f5:f9:44:52 dst 10.0.0.101 self
```

What does this table mean?

- `self` - this was a learned entry
- `permanent` - a static entry that will not expire or be removed
- `self permanent` - was manually defined and what expire (this is the "flood and learn" MAC address)

> Note that a bridge also has an `FDB`, this isn't something unique to `VTEP`s.

The `VTEP` is the device that is responsible for encapsulating the Ethernet frame within the `UDP` datagram on the ingress (source end of the tunnel) and decapsulating the packet on the egress (destination end of the tunnel).  In the case of the demo, each `VTEP` is assigned an IP address from the node network CIDR, i.e., it connects to the underlay network.

It will encapsulate layer 2 Ethernet frames in `UDP` datagrams.

The decapsulated `VXLAN` header contains the `VNI` (the `VXLAN` Network Identifier), and this is used to uniquely identify a layer 2 domain or segment.

It is 24 bits wide and supports 16,777,216 identifiers.  The `VNI` is contained within the `VXLAN` 8 byte header, and when encapsulated, adds 50 bytes of overhead which the [`MTU`] must be adjusted to allow for.

The demo creates a [`VXLAN`] device for each node in the cluster, and the link is plugged into the node's virtual bridge.  It listens on port `4789`, but you may also see it on port `8472`.  A `VTEP`, that is, a `VXLAN` endpoint, is assigned an IP address on the underlay network in order to communicate with its peers, although this is not the only way to configure a `VTEP`.

However, in order for that to happen, the endpoints must be made aware of each other, and this is done in the shell script that builds the cluster and creates static [`FDB`] -> `VTEP` entries.  Here is the function that creates the `VTEP`s:

```bash
setup_vxlan_vteps() {
    local vni=100
    local vtep="vxlan$vni"
    local index
    local local_ip
    local peer_index
    local peer_ip

    for ((index = 0; index < NODES; index++)); do
        local_ip="${NODE_BRIDGE_IP%.*}.$(( ${NODE_BRIDGE_IP##*.} + index ))"

        ip -netns "node$index" link add "$vtep" type vxlan \
            id "$vni" \
            local "$local_ip" \
            dev "host-ceth$index" \
            dstport 4789

        ip -netns "node$index" link set dev "$vtep" master "$BRIDGE"
        # vxlan adds a 50-byte header.
        ip -netns "node$index" link set "$vtep" mtu 1450
        ip -netns "node$index" link set "$vtep" up

        for ((peer_index = 0; peer_index < NODES; peer_index++)); do
            [ "$peer_index" -eq "$index" ] && continue

            peer_ip="${NODE_BRIDGE_IP%.*}.$(( ${NODE_BRIDGE_IP##*.} + peer_index ))"

            ip netns exec "node$index" bridge fdb append \
                00:00:00:00:00:00 \
                dev "$vtep" \
                dst "$peer_ip" \
                self permanent
        done
    done
}
```

The MAC address of `00:00:00:00:00:00` uses "flood and learn" or multicast style to learn about the MAC address on the layer 2 network that are behind each `VTEP`.  There is a simpler method of hard-coding all of the `MAC` addresses in the forwarding database, but this is obviously not something most people want to do (and it doesn't scale).  Essentially, it is telling the kernel to send all unknown Ethernet packets to this `VTEP`.

## `sandbox-init`

The `sandbox-init` is a small `C` program that will be the namespace anchor sandbox for each pod and is analogous to the `pause` container in Kubernetes.  Its purpose is as a long-running process that prevents the kernel from destroying the `net` namespace it is running within because it is holding a reference to it.

> The `sandbox-init`'s reason for being was explained in the [Containers](#containers) section.

For the demo, the `sandbox-init` is not technically needed because the `net` namespaces are created using the [`ip-netns`] tool, and this will create a reference in `/run/netns/` that won't be deleted even if there are no more references to it.  It's being used to emulate behavior in the real-world, and it's an important component to understand.

Incidentally, the name created in `/run/netns/` is an [`inode`]:

```bash
$ ls --inode /run/netns/node0-pod0
4026532542 /run/netns/node0-pod0
$ sudo nsenter --target $(pidof dnsmasq) --net --pid --mount --uts -- ls -l /proc/1/ns/net
lrwxrwxrwx 1 root root 0 sep  5 04:27 /proc/1/ns/net -> 'net:[4026532542]'
```
> It's the same inode number (you'll see this explained later in detail).
>
> Here are the containers, with the `dnsmasq` container shown in the `node0-pod0` container:
>
> ```bash
> $ for pid in $(pidof sandbox-init)
>   do
>   sudo ip netns identify "$pid"
>   sudo nsenter --target "$pid" --net --pid --mount --uts -- ps -ef
>   echo
>   done
>   node1-pod1
>   uid          pid    ppid  c stime tty          time cmd
>   root           1       0  0 04:25 ?        00:00:00 ./sandbox-init
>   root           3       0  0 04:28 pts/2    00:00:00 ps -ef
>
>   node1-pod0
>   uid          pid    ppid  c stime tty          time cmd
>   root           1       0  0 04:25 ?        00:00:00 ./sandbox-init
>   root           3       0  0 04:28 pts/2    00:00:00 ps -ef
>
>   node0-pod1
>   uid          pid    ppid  c stime tty          time cmd
>   root           1       0  0 04:25 ?        00:00:00 ./sandbox-init
>   root           3       0  0 04:28 pts/2    00:00:00 ps -ef
>
>   node0-pod0
>   UID          PID    PPID  C STIME TTY          TIME CMD
>   root           1       0  0 04:25 ?        00:00:00 ./sandbox-init
>   nobody         5       1  0 04:25 ?        00:00:00 dnsmasq
>   root           9       0  0 04:28 pts/2    00:00:00 ps -ef
> ```

And, here is the program:

`sandbox-init.c`

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/wait.h>
#include <errno.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
    int status;
    pid_t pid;

    for (;;) {
        pid = waitpid(-1, &status, 0);

        if (pid == -1) {
            if (errno == EINTR) {
                continue;
            }

            if (errno == ECHILD) {
                sleep(1);
                continue;
            }

            perror("waitpid");
            return EXIT_FAILURE;
        }

        if (WIFEXITED(status)) {
            printf("Waited for child PID %ld.  Its exit status is %d.\n", (long)pid, WEXITSTATUS(status));
        } else if (WIFSIGNALED(status)) {
            printf("Child PID %ld terminated by signal %d\n", (long)pid, WTERMSIG(status));
        }
    }

    return EXIT_SUCCESS;
}
```

## Service Discovery

Service discovery usually encompasses several components, the most important of which are service registration, service lookup and service liveness.

We won't be using traditional service discovery programs like `etcd` or `Consul` that are robust and do all of the aforementioned.  Instead, we'll just be using simple registration and lookup.  Clearly, this is not production-worthy, but it serves our purposes of demonstrating the usefulness of service discovery.

I'm using `dnsmasq` but only for its [`DNS`] listener, not for [`DHCP`].
For example, when a service is registered with the cluster, the following information is captured and written to `/run/cluster/services.d/` as `json`.  The name of the file is the name of the service.

```bash
$ cat /run/cluster/services.d/dnsmasq.json
{
    "name": "dnsmasq",
    "ip": "10.96.64.10",
    "port": 53,
    "protocol": "udp",
    "scheduler": "rr",
    "servers": []
}
```

> Note that a service is created independently of any pods that may use it as a front-end load balancer, just as with Kubernetes.  That is why the `servers` list is empty.

Here are some of the results of DNS queries made possible by service discovery:

```bash
$ sudo ip netns exec node0-pod1 dig @10.96.64.10 +short dnsmasq.service.local
10.96.64.10
$ sudo ip netns exec node1-pod1 dig @10.96.64.10 +short SRV _dns._udp.service.local
10 50 53 dnsmasq.service.local.
```

## Conclusion

There will be another article about applying [`cgroups`] to the nodes and podes in the demo for resource control.  Once a `cgroups` hierarchy is applied to the cluster, it will largely be a working demo of a container orchestrator, albeit on a smaller scale and certainly not ready for production.

## References

- [Introduction to Virtual Extensible LAN (VXLAN)](https://networklessons.com/vxlan/introduction-to-virtual-extensible-lan-vxlan)
- [VXLAN - VNIs, VTEPs, and VXLAN Architecture](https://www.youtube.com/watch?v=bcYtFYVmmgM)
- [VXLAN - Encapsulation, Headers, and the Packet Transmission Process](https://www.youtube.com/watch?v=FgZtkyInHQg)
- [VXLAN - Control Plane Operations](https://www.youtube.com/watch?v=IBcUDxIwfAA)

[`ip-netns`]: https://www.man7.org/linux/man-pages/man8/ip-netns.8.html
[`dnsmasq`]: https://dnsmasq.org/doc.html
[`inode`]: /2019/11/19/on-inodes/
[command substitution]: https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.html
[`pidof`]: https://man7.org/linux/man-pages/man1/pidof.1.html
[`pgrep`]: https://man7.org/linux/man-pages/man1/pgrep.1.html
[`echo`]: https://man7.org/linux/man-pages/man1/echo.1.html
[`bubblewrap`]: https://github.com/containers/bubblewrap
[`nsenter`]: https://www.man7.org/linux/man-pages/man1/nsenter.1.html
[virtual machine]: /2026/08/10/on-virtualization-and-virtual-machines/
[CIDR]: /2021/04/24/on-classless-networks/
[`ARP`]: https://en.wikipedia.org/wiki/Address_Resolution_Protocol
[CNI plugin]: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
[broadcast domain]: https://en.wikipedia.org/wiki/Broadcast_domain
[layer 2]: https://en.wikipedia.org/wiki/Data_link_layer
[layer 3]: https://en.wikipedia.org/wiki/Network_layer
[`init`]: https://en.wikipedia.org/wiki/Init
[Netfilter]: https://en.wikipedia.org/wiki/Netfilter
[IPVS]: https://en.wikipedia.org/wiki/IP_Virtual_Server
[Kubernetes Service]: https://kubernetes.io/docs/concepts/services-networking/service/
[`iptables`]: https://en.wikipedia.org/wiki/Iptables
[`kube-proxy`]: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
[proxy modes]: https://kubernetes.io/docs/reference/networking/virtual-ips/#proxy-modes
[SDN]: https://en.wikipedia.org/wiki/Software-defined_networking
[RFC 7348]: https://datatracker.ietf.org/doc/html/rfc7348
[`MTU`]: https://en.wikipedia.org/wiki/Maximum_transmission_unit
[`FDB`]: https://en.wikipedia.org/wiki/Forwarding_information_base
[`DNS`]: https://en.wikipedia.org/wiki/Domain_Name_System
[`DHCP`]: https://en.wikipedia.org/wiki/Dynamic_Host_Configuration_Protocol
[namespaces]: https://en.wikipedia.org/wiki/Linux_namespaces
[`cgroups`]: https://en.wikipedia.org/wiki/Cgroups
[operating-system-level virtualization]: https://en.wikipedia.org/wiki/OS-level_virtualization
[`rootfs`]: https://en.wikipedia.org/wiki/Root_directory
[OCI Runtime Specification]: https://opencontainers.org/
[zombie process]: /2021/03/17/on-creating-a-zombie-process/
[`runc`]: /2022/01/18/on-runc/
[`wait`]: https://www.man7.org/linux/man-pages/man2/wait.2.html
[`VXLAN`]: https://en.wikipedia.org/wiki/VXLAN
[`cluster`]: https://github.com/btoll/cluster
[`VLAN`]: https://en.wikipedia.org/wiki/VLAN

