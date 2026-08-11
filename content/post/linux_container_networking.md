+++
title = "On Linux Container Networking"
date = "2026-08-12T21:29:22-05:00"

+++

> This article was originally published on November 28, 2023.  I'm re-publishing it because I've made massive updates to it (and hopefully improved it).  Also, the bridge section in the original article was absolute rubbish.

This little article is about the [network namespaces] utilities that exist in Linux which lie at the heart of container networking and can be found in container orchestration tools and service meshes.

---

<!--- [Listing the `ARP` Table](#listing-the-arp-table)-->
- [Introduction](#introduction)
- [`veth` pair](#veth-pair)
- [One Container](#one-container)
- [A Quick Note On The Routing Table, While He's Away](#a-quick-note-on-the-routing-table-while-hes-away)
- [Routing](#routing)
- [Multiple Namespaces](#multiple-namespaces)
- [Bridging](#bridging)
- [Conclusion](#conclusion)

## Introduction

As everyone knows, containers are only possible because of the addition of [`namespaces`] and [`cgroups`] to the Linux kernel.  Because of this, we've begun to see a lot of projects that take advantage of these additions to allow for some very cool technologies.

One of these is virtual networking.  Because the `net` network namespace allows for processes (i.e., containers) to have their own network stacks, we can create virtual networks in software that are analogous to their hardware counterparts.

For instance, we can create virtual bridges (more accurately known as multi-port switches) and routers that interface to subnetworks that create domains of containers.  These subnetworks can and usually do exist within their own network namespace, isolated from other network namespaces (such as the root network namespace) and any resources contained therein.

So, what comprises a network stack?  It includes:

- network devices
- routing rules
- [`iptables`] rules (firewall rules)
- [`netfilter`] hooks

This article will be a brief introduction into the bits and bobs needed to create a fully functioning virtual network that will be able to not only access the other containers in its subnetwork but the other network interfaces in the root network namespace and the outside Internet.

We'll become marginally acquainted with the following tools and utilities:

- virtual ethernet interfaces ([`veth`])
- virtual bridges
- enabling routing functionality
- [`iptables`]

Let's get started!

> I **highly** suggest doing these steps in a virtual machine or some other environment that won't affect the network stack on your host machine.  But do what you want, you always do.

## `veth` pair

`veth` pairs are virtual devices that reside in the host's network namespace.  We can think of them as two ends of a tunnel, where traffic sent from one end will automatically appear on the other.

Here is the command to create a `veth` pair, with one end named `veth0` and the other `ceth0` ("c" will indicate the end that will be in the container):

```bash
$ sudo ip link add veth0 type veth peer name ceth0
```

Even though they have been created, they are in the `DOWN` state and do not have an assigned `IP` address.

```bash
$ ip address
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 08:00:27:8d:c0:4d brd ff:ff:ff:ff:ff:ff
    altname enp0s3
    inet 10.0.2.15/24 brd 10.0.2.255 scope global dynamic eth0
       valid_lft 84821sec preferred_lft 84821sec
    inet6 fe80::a00:27ff:fe8d:c04d/64 scope link
       valid_lft forever preferred_lft forever
3: ceth0@veth0: <BROADCAST,MULTICAST,M-DOWN> mtu 1500 qdisc noop state DOWN group default qlen 1000
    link/ether 72:45:4d:cb:0b:b8 brd ff:ff:ff:ff:ff:ff
4: veth0@ceth0: <BROADCAST,MULTICAST,M-DOWN> mtu 1500 qdisc noop state DOWN group default qlen 1000
    link/ether 1a:b9:5e:69:61:53 brd ff:ff:ff:ff:ff:ff
```

You can also list the devices in the [`sysfs`] directory:

```bash
$ ls -l !$
ls -l /sys/class/net
total 0
lrwxrwxrwx 1 root root 0 Aug 11 03:43 ceth0 -> ../../devices/virtual/net/ceth0
lrwxrwxrwx 1 root root 0 Aug 11 03:09 enp2s0 -> ../../devices/pci0000:00/0000:00:01.1/0000:02:00.0/virtio1/net/enp2s0
lrwxrwxrwx 1 root root 0 Aug 11 03:09 lo -> ../../devices/virtual/net/lo
lrwxrwxrwx 1 root root 0 Aug 11 03:43 veth0 -> ../../devices/virtual/net/veth0
```

Let's now assign an `IPv4` address to the `veth0` interface and bring it up:

```bash
$ sudo ip addr add 172.18.0.10/12 dev veth0
$ sudo ip link set veth0 up
$ ip a show veth0
4: veth0@ceth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether ce:72:8c:c9:87:3c brd ff:ff:ff:ff:ff:ff
    inet 172.18.0.10/12 scope global veth0
       valid_lft forever preferred_lft forever
    inet6 fe80::cc72:8cff:fec9:873c/64 scope link
       valid_lft forever preferred_lft forever
```

Interestingly, once the interface is assigned an address **and** is brought up, the kernel creates a routing rule based on the [`CIDR`] address that was given when the virtual Ethernet device was created.

> By the way, what is the network range for the [`CIDR`] address `172.18.0.10/12`?
>
> To get the start of the range:
>
> ```bash
> 11111111 11110000 00000000 00000000 <-- netmask /12
> 10101100 00010010 00000000 00001010 <-- 172.18.0.10 in binary
> ----------------------------------- <-- logical AND
> 10101100 00010000 00000000 00000000 <--- start of range (`172.16.0.0`)
> ```
>
> To get the end of the range, simply take the host bits of the second octet, which are the last four bits, and change them from all 0s to all 1s.  What is `00001111` in decimal? Well, it's 15, and you add that to the beginning of the range (16).
>
> The network range is then:
>
> `172.16.0.0` - `172.31.255.255`
>
> Consider this a little refresher, but you should really know how to do this stuff.

Here was the state of the routing table before the `veth` pair was created and at least one end brought `UP`:

```bash
$ ip r
default via 10.0.2.2 dev eth0
10.0.2.0/24 dev eth0 proto kernel scope link src 10.0.2.15
```

Now, we see that the kernel has helpfully created a new rule for us:

```bash
$ ip r
default via 10.0.2.2 dev eth0
10.0.2.0/24 dev eth0 proto kernel scope link src 10.0.2.15
172.16.0.0/12 dev veth0 proto kernel scope link src 172.18.0.10 linkdown
```

> Note that the new rule contains the start of the network range that we had just calculated above.

This new derived routing rule was able to be created by the kernel in the root namespace because the `veth0` device was given a `CIDR` address when created (this is what `proto kernel` means in the output).

However, if you were to add that device without the netmask information (the decimal suffix `/12`, in this case), the kernel would be unable to create a routing rule, as it would not have been given enough information to do so.

In addition, if you were to delete the device after creating it, you'd see that the kernel would also then remove the routing rule (if it had been automatically created by the kernel).

> The routing table will report `linkdown` in the new rule because the other end of the veth pair in the new `net0` namespace is down.

We'll also assign an `IPv4` address to the other end of the `veth` pair:

```bash
$ sudo ip link set ceth0 up
$ sudo ip addr add 172.18.0.20/12 dev ceth0
```

Let's check the state of things now:

```bash
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 08:00:27:8d:c0:4d brd ff:ff:ff:ff:ff:ff
    altname enp0s3
    inet 10.0.2.15/24 brd 10.0.2.255 scope global dynamic eth0
       valid_lft 85380sec preferred_lft 85380sec
    inet6 fe80::a00:27ff:fe8d:c04d/64 scope link
       valid_lft forever preferred_lft forever
       valid_lft forever preferred_lft forever
3: ceth0@veth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 52:56:bc:1c:58:c0 brd ff:ff:ff:ff:ff:ff
    inet 172.18.0.20/12 scope global ceth0
       valid_lft forever preferred_lft forever
    inet6 fe80::5056:bcff:fe1c:58c0/64 scope link
       valid_lft forever preferred_lft forever
4: veth0@ceth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether ce:72:8c:c9:87:3c brd ff:ff:ff:ff:ff:ff
    inet 172.18.0.10/12 scope global veth0
       valid_lft forever preferred_lft forever
    inet6 fe80::cc72:8cff:fec9:873c/64 scope link
       valid_lft forever preferred_lft forever
```

And, the routing table:

```bash
$ ip r
default via 10.0.2.2 dev eth0
10.0.2.0/24 dev eth0 proto kernel scope link src 10.0.2.15
172.16.0.0/12 dev veth0 proto kernel scope link src 172.18.0.10
172.16.0.0/12 dev ceth0 proto kernel scope link src 172.18.0.20
```

Notice that the last rule was just added by the kernel when the other virtual ethernet device was assigned an IP address with a `CIDR` just like the first one.

Now, we can ping each interface, but that's not very useful or interesting because they are in the same (root) network namespace:

```bash
~$ ping -c2 172.18.0.10
PING 172.18.0.10 (172.18.0.10) 56(84) bytes of data.
64 bytes from 172.18.0.10: icmp_seq=1 ttl=64 time=0.049 ms
64 bytes from 172.18.0.10: icmp_seq=2 ttl=64 time=0.082 ms

--- 172.18.0.10 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1014ms
rtt min/avg/max/mdev = 0.049/0.065/0.082/0.016 ms
$ ping -c2 172.18.0.20
PING 172.18.0.20 (172.18.0.20) 56(84) bytes of data.
64 bytes from 172.18.0.20: icmp_seq=1 ttl=64 time=0.042 ms
64 bytes from 172.18.0.20: icmp_seq=2 ttl=64 time=0.123 ms

--- 172.18.0.20 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1029ms
rtt min/avg/max/mdev = 0.042/0.082/0.123/0.040 ms
```

In the next section, we'll move one end of the `veth` pair into another (new) network namespace to enable communication between the namespaces.  This will liven things up, and you'll start to understand the useful it is to have endpoints of the same `veth` pair in different network namespaces and how that plays a significant role in container communication and isolation.

Before we move on, though, here are all the commands we ran in this section in a handy little script:

`1_linux_networking.sh`

```bash
#!/bin/bash

set -eo pipefail

LANG=C
umask 0022

if [ -z "$1" ]
then
    printf "Usage: %s add|delete\n" "$0"
    exit 1
fi

if [ "$1" = "delete" ]
then
    # Deleting one end of the pair will also remove the other one from both
    # the network device config and the routing table.
    sudo ip link delete veth0
elif [ "$1" = "add" ]
then
    sudo ip link add veth0 type veth peer name ceth0

    sudo ip link set veth0 up
    sudo ip link set ceth0 up

    sudo ip addr add 172.18.0.10/12 dev veth0
    sudo ip addr add 172.18.0.20/12 dev ceth0

    printf "ping %s\n" 172.18.0.10
    printf "ping %s\n" 172.18.0.20
else
    printf "Unrecognized parameter \`%s\`.\n" "$1"
    exit 1
fi

```

To use this script, simply:

```bash
$ bash 1_linux_networking.sh add
ping 172.18.0.10
ping 172.18.0.20
```

This establishes a `veth` pair in the same default root `net` namespace.  By providing the `CIDR` when adding an IP address to the virtual devices, we don't need to explicitly add a route.

The command will echo to `stdout` the ping.

To cleanup:

```bash
$ bash 1_linux_networking.sh delete
```

## One Container

Let's now turn our furrowed brow towards how we can begin building a container.  We touched on this at the end of the last section when metioning that the next step would be to put one end of a new `veth` pair in a new network namespace.  Now, we'll see that in action.

> For this exercise, you will need tools that come with the [`iproute2`] package.  Most distributions will have them installed by default unless you're running a bare-bones installation.

Start by removing the links and routes that were created in the last section.  If you are using the script `1_linux_networking.sh` (see above), simply run this command to perform a cleanup.  This enables us to start from a clean slate.

```bash
$ ./1_linux_networking.sh delete
```

Begin by creating our new friends again, the `veth` pair, assigning one end an IP address and bringing it up.  Nothing new here.

```bash
$ sudo ip link add veth0 type veth peer name ceth0
$ sudo ip addr add 172.18.0.10/12 dev veth0
$ sudo ip link set veth0 up
```

However, this time we're going to create a new network namespace.  This is an essential part of creating a container that is isolated from not only the host but other containers and is an absolutely crucial step.  Without this we are lost and adrift, our efforts pointless and fruitless, just like MAGA but without the stupidity and racism.

In order to begin isolating one process from another, there needs to be separation.  Namespaces facilitate that.

Now, create the new network namespace called `net0` using the [`ip-netns`] tool and then list the namespace:

```bash
$ sudo ip netns add net0
$ ip netns list
net0
```

There is only one namespace other than the default root namespace, which, of course, is the little fella we just birthed into existence.

Once the new network namespace is created, you have two options for running commands in it:

- Run a command from outside the namespace.  Use the [`ip-netns`] object with the `exec` command from the [`ip`] suite of tools.  The following commands are functionally equivalent:
    + `sudo ip netns exec net0 ip link`
    + `sudo ip --netns net0 link`
        - However, this shorthand only works for objects and commands of the `ip` tool.  In other words, trying to list a directory will fail.
- Enter the namespace, which is useful when there are many commands to run from within the namespace.  Again, these are functionally equivalent:
    + `sudo ip netns exec net0 bash`
    + `sudo nsenter --net=/run/netns/net0 bash`
        - This command uses the [`nsenter`] utility from the `util-linux` package, which of course is another dependency.  It's also more powerful and operates at a lower-level which allows you to isolate a process in more than one namespace at a time (for example, you also want `bash` to run in its own `pid` namespace):
            + `nsenter --net=/var/run/netns/myns --pid=/var/run/netns/myns bash`
                - Of course, all eight namespaces (as of kernel 5.6) can be used.  See the [`nsenter`] manpage for details.
        - If no command is given (i.e., `bash` is excluded from the proceeding command, `nsenter` will use the default shell (re: the value of the `SHELL` environment variable).

> Let's evaluate one of those claims and look at it a bit more to help with our understanding of what is happening.  When running:
>
> ```bash
> sudo nsenter --net=/run/netns/net0 bash
> ```
>
> `bash` will **not** run inside its own `pid` namespace.  Instead, it runs in the default `pid` namespace.
>
> We can see this from inside the container after running the above command:
>
> ```bash
> # ps -1
>     PID TTY      STAT   TIME COMMAND
>       1 ?        Ss     0:11 /lib/systemd/systemd --system --deserialize=22
> ```
>
> What does this mean?  Well, if the process had its own `pid` namespace, then `systemd` would not be PID 1, it would be `bash`, which was listed as the program in the command above.
>
> Also, notice that we're not running in a [rootless container], as the `UID`s and `GID`s don't map to a non-privileged user on the host.
>
> ```bash
> # cat /proc/$$/[u,g]id_map
>          0          0 4294967295
>          0          0 4294967295
> ```
>
> If this had been created as a rootless container, then the `UID` in the second column would be that of a non-privileged user on the host, like:
>
> ```bash
> # cat /proc/$$/[u,g]id_map
>          0       1000          1
>          0       1000          1
> ```

While we're still in the new `net0` network namespace, let's see what network devices we have access to:

```bash
# ip link list
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

We can see that it does indeed have its own network stack as evidenced by the fact that there are no other devices listed except for the [loopback].

Additionally, there are no routing rules:

```bash
# ip route list
Error: ipv4: FIB table does not exist.
Dump terminated
```

Issue the `exit` command to leave the `net0` namespace.

As mentioned previously, if you don't want to enter the namespace, you can use the `exec` subcommand of the `ip-netns` command:

```bash
$ sudo ip netns exec net0 ip l
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

> From here on, we'll be using `ip-netns` instead of `nsenter` in the examples since we can do everything we need to do without needing to download that extra dependency.  Also, running it as `sudo` will drop you into a `root` prompt, but that's ok because the user and its permissions won't impact any of the operations we'll be doing.

Next, we'll move one of the devices into the `net0` namespace, leaving the other in the host (root) namespace.

```bash
$ sudo ip link set ceth0 netns net0
```

If we list the network devices again, we'll see that the `ceth0` device is no longer listed in the root namespace because of it having been moved into the `net0` namespace:

```bash
$ ip l
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP mode DEFAULT group default qlen 1000
    link/ether 08:00:27:8d:c0:4d brd ff:ff:ff:ff:ff:ff
    altname enp0s3
4: veth0@if3: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether 16:c9:69:a9:8b:90 brd ff:ff:ff:ff:ff:ff link-netns net0
```

Let's run the same command in the `net0` namespace to view `veth0'`s peer:

```bash
$ sudo ip --netns net0 l
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
3: ceth0@if4: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether 82:90:89:29:74:4a brd ff:ff:ff:ff:ff:ff link-netnsid 0
```

> What's up with `veth0@if3` and `ceth0@if4`?  Previous to moving `ceth` into the `net0` `net` namespace, it was `veth0@ceth0` and `ceth0@veth0`, repectively.  The interface name was simply replaced with the index of the interface in its respective `net` namespace.

Now that each end of the `veth` pair is in a different namespace, we are on our way to creating a container.

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

In order to send traffic between these devices, we must bring the `ceth0` interface up and assign it an address (we already did the same for `veth0`):

```bash
$ sudo ip -n net0 addr add 172.18.0.10/12 dev ceth0
$ sudo ip addr add 172.18.0.11/16 dev veth0
$ ip address show veth0
4: veth0@if3: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state LOWERLAYERDOWN group default qlen 1000
    link/ether 16:c9:69:a9:8b:90 brd ff:ff:ff:ff:ff:ff link-netns net0
    inet 172.18.0.11/16 scope global veth0
       valid_lft forever preferred_lft forever
```

Do the same in the `net0` namespace:

```bash
$ sudo ip netns exec net0 bash
# ip addr add 172.18.0.20/12 dev ceth0
# ip a show ceth0
3: ceth0@if4: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN group default qlen 1000
    link/ether ca:5e:03:6d:7b:6d brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.18.0.20/12 scope global ceth0
       valid_lft forever preferred_lft forever
# ip link set ceth0 up
# ip a s ceth0
3: ceth0@if4: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether ca:5e:03:6d:7b:6d brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.18.0.20/12 scope global ceth0
       valid_lft forever preferred_lft forever
    inet6 fe80::c85e:3ff:fe6d:7b6d/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
```

> If it's not already up, bring up the loopback device, as well:
>
> ```bash
> # ip link set lo up
> ```

It's go time (still in the `net0` namespace):

```bash
# ping -c2 172.18.0.10
PING 172.18.0.10 (172.18.0.10) 56(84) bytes of data.
64 bytes from 172.18.0.10: icmp_seq=1 ttl=64 time=0.091 ms
64 bytes from 172.18.0.10: icmp_seq=2 ttl=64 time=0.069 ms

--- 172.18.0.10 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1022ms
rtt min/avg/max/mdev = 0.069/0.080/0.091/0.011 ms
```

Nice, that worked.

> Unfortunately, we can't (yet) ping the physical network device on the host nor the outside Internet.

And, if we exit back to the host root namespace, we can also ping the `ceth` device in the `net0` namespace:

```bash
$ ping -c2 172.18.0.20
PING 172.18.0.20 (172.18.0.20) 56(84) bytes of data.
64 bytes from 172.18.0.20: icmp_seq=1 ttl=64 time=0.063 ms
64 bytes from 172.18.0.20: icmp_seq=2 ttl=64 time=0.086 ms

--- 172.18.0.20 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1002ms
rtt min/avg/max/mdev = 0.063/0.074/0.086/0.011 ms
```

So, if we step back, we essentially have the makings of a "container".  Yes, it's too simplistic and not very functional, but it should give you an idea of how a container and its isolation can be achieved.

Here are all the commands we ran in this section in a handy little script:

`2_linux_networking.sh`

```bash
#!/bin/bash

set -eo pipefail

LANG=C
umask 0022

if [ -z "$1" ]
then
    printf "Usage: %s add|delete\n" "$0"
    exit 1
fi

if [ "$1" = "delete" ]
then
    # Deleting the namespace will remove the interface(s) within it and
    # the other end of the pair, both in the network device config and
    # the routing table.
    sudo ip netns delete net0
elif [ "$1" = "add" ]
then
    sudo ip netns add net0

    sudo ip link add veth0 type veth peer name ceth0

    sudo ip link set veth0 up
    sudo ip addr add 172.18.0.10/12 dev veth0

    sudo ip link set ceth0 netns net0
    sudo ip netns exec net0 ip addr add 172.18.0.20/12 dev ceth0
    sudo ip netns exec net0 ip link set ceth0 up
    sudo ip netns exec net0 ip link set lo up

    printf "ping %s\n" 172.18.0.10
    printf "ping %s\n" 172.18.0.20
    printf "ip netns list\n"
else
    printf "Unrecognized parameter \`%s\`.\n" "$1"
    exit 1
fi

```

To use this script, simply:

```bash
$ bash 2_linux_networking.sh add
ping 172.18.0.10
ping 172.18.0.20
ip netns list
```

This establishes a `veth` pair and moves one end into a new `net` namespace.  By providing the `CIDR` when adding an IP address to the virtual devices, we don't need to explicitly add a route.

The command will echo to `stdout` the ping and `netns-list` commands.

To cleanup:

```bash
$ bash 2_linux_networking.sh delete
```

## A Quick Note On The Routing Table, While He's Away

Let's now revisit the derived routing rule that was created for us in the `net0` network namespace.  If you've already done the cleanup described at the end of the last section, just create everything again by running the following command:

```bash
$ bash 2_linux_networking.sh add
ping 172.18.0.10
ping 172.18.0.20
ip netns list
```

Enter the `net0` `net` namespace:

```bash
$ sudo ip netns exec net0 bash
```

Again, here is the routing rule:

```bash
# ip r
172.16.0.0/12 dev ceth0 proto kernel scope link src 172.18.0.20
```

What is this doing?  It's sending any packets destined for the `172.16.0.0/12` network through the `ceth0`, discarding any packet that isn't bound for that network address.  This is why we cannot reach the host network or the Internet.

Can we fix this?  No.

Psych!  Yes, yes we can!

## Routing

To enable traffic to flow to and from the outside world, there are two things that need to happen.

The first is to turn the machine into a router:

```bash
$ echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward
1
```

> Of course, this setting won't survive a reboot.  To persist this value, edit the `/etc/sysctl.conf` configuration file or add it to [`/etc/sysctl.d/`].

The second is to enable [network address translation] (NAT) so that the router can swap its own IP address with that of the private IP addresses of the containers.  In the case of the two network stacks created in the last section, we need to add a rule that says anything that has its source within 172.16.0.0/12 the network range coming from the `enp2s0` interface should be masqueraded (have its source rewritten to that of the `enp2s0` interface, the outgoing interface):

```bash
$ sudo iptables -t nat -A POSTROUTING -s 172.16.0.0/12 -o enp2s0 -j MASQUERADE
```

> If you would like to remove the `iptables` rule:
>
> ```bash
> $ sudo iptables -t nat -L POSTROUTING -n --line-numbers
> Chain POSTROUTING (policy ACCEPT)
> num  target     prot opt source               destination
> 1    MASQUERADE  all  --  172.16.0.0/12        0.0.0.0/0
> $ sudo iptables -t nat -D POSTROUTING 1
> $ sudo iptables -t nat -L POSTROUTING -n --line-numbers
> Chain POSTROUTING (policy ACCEPT)
> num  target     prot opt source               destination
> $
> ```

Practically speaking, this means that a packet coming from 172.18.0.20 in the `net0` `net` namespace will have its IP address rewritten to (masqueraded) the IP of the `enp2s0` interface, which is 192.168.122.31.

```bash
$ sudo ip netns exec net0 ping -c2 1.1.1.1
PING 1.1.1.1 (1.1.1.1) 56(84) bytes of data.
64 bytes from 1.1.1.1: icmp_seq=1 ttl=57 time=176 ms
64 bytes from 1.1.1.1: icmp_seq=2 ttl=57 time=175 ms

--- 1.1.1.1 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1002ms
rtt min/avg/max/mdev = 175.250/175.818/176.386/0.568 ms
```

Two of the most useful commands in the [`ip-route`] object are `show` and `get`.

From the man page:

- `get`
    + Get a single route.  This command gets a single route to a destination and prints its contents exactly as the kernel sees it.
- `show`
    + List routes.  The command displays the contents of the routing tables or the route(s) selected by some criteria.

Let's see what route does a packet travel from inside the `net0` `net` namespace in the VM to the host gateway router:

```bash
$ sudo ip -n net0 route get 192.168.1.1
192.168.1.1 via 172.18.0.10 dev ceth0 src 172.18.0.20 uid 0
    cache
```

If you're curious about what route is applied to an address:

```bash
$ ip route show 172.18.0.10/12
172.16.0.0/12 dev veth0 proto kernel scope link src 172.18.0.10
```

## Multiple Namespaces

After running cleanup on `2_linux_networking.sh`, we'll now run a new script that will set up two new `net` namespaces (`net0`, `net1`) and do the plumbing so a `veth` pair is connected from each one to the root `net` namespace.

As usual, run the new script with the `add` parameter:

```bash
$ bash /mnt/shared/networking-scripts/3_linux_networking.sh add
```

`3_linux_networking.sh`

```bash
#!/bin/bash

set -eo pipefail

LANG=C
umask 0022

if [ -z "$1" ]
then
    printf "Usage: %s add|delete\n" "$0"
    exit 1
fi

if [ "$1" = "delete" ]
then
    for i in {0..1}
    do
        # Removing the namespace will also remove the interfaces within it,
        # which subsequently also removes the other end of the pair in the
        # root network namespace.
        sudo ip netns delete "net$i"
    done
elif [ "$1" = "add" ]
then
    for i in {0..1}
    do
        sudo ip netns add "net$i"
        sudo ip link add "veth$i" type veth peer name "ceth$i"
        sudo ip address add 172.18.0."$((100 + "$i"))"/12 dev "veth$i"
        sudo ip link set "veth$i" up
        sudo ip link set "ceth$i" netns "net$i"

        INCREMENT=$((10 + 10 * "$i"))
        sudo ip netns exec "net$i" ip address add "172.18.0.$INCREMENT/12" dev "ceth$i"
        sudo ip netns exec "net$i" ip link set "ceth$i" up
    done
else
    printf "Unrecognized parameter \`%s\`.\n" "$1"
    exit 1
fi
```

Let's check out the addresses:

```bash
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host noprefixroute
       valid_lft forever preferred_lft forever
2: enp2s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 52:54:00:56:75:17 brd ff:ff:ff:ff:ff:ff
    altname enx525400567517
    inet 192.168.122.28/24 brd 192.168.122.255 scope global dynamic noprefixroute enp2s0
       valid_lft 2004sec preferred_lft 1352sec
    inet6 fe80::e6c9:e89:49fe:f6d4/64 scope link
       valid_lft forever preferred_lft forever
10: veth0@if9: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 9a:3a:33:b7:b5:21 brd ff:ff:ff:ff:ff:ff link-netns net0
    inet 172.18.0.100/12 scope global veth0
       valid_lft forever preferred_lft forever
    inet6 fe80::983a:33ff:feb7:b521/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
12: veth1@if11: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether be:d4:c6:90:b8:5d brd ff:ff:ff:ff:ff:ff link-netns net1
    inet 172.18.0.101/12 scope global veth1
       valid_lft forever preferred_lft forever
    inet6 fe80::bcd4:c6ff:fe90:b85d/64 scope link proto kernel_ll
       valid_lft forever preferred_lft forever
```

And, the routing table:

```bash
$ ip r
default via 192.168.122.1 dev enp2s0 proto dhcp src 192.168.122.28 metric 1002
172.16.0.0/12 dev veth0 proto kernel scope link src 172.18.0.100
172.16.0.0/12 dev veth1 proto kernel scope link src 172.18.0.101
192.168.122.0/24 dev enp2s0 proto dhcp scope link src 192.168.122.28 metric 1002
```

Right away, we see there's a problem.  There are two routes created by the kernel when the interfaces were given an address and brought up, and these are going to cause a problem:

```bash
172.16.0.0/12 dev veth0 proto kernel scope link src 172.18.0.100
172.16.0.0/12 dev veth1 proto kernel scope link src 172.18.0.101
```

Why is this a problem?  Well, both routes apply to an IP address within the `172.16.0.0/12` network range, which is `172.16.0.0` - `172.31.255.255`.  So, the kernel will read the routing table and use the first route (at least that's the behavior that I've consistently seen) and then use the `veth0` interface to forward the packet.  The source IP of the packet will be written as `172.18.0.100`.

The `net1` namespace will not be accessible, and attempting to reach any address via the `veth1` interface will hang.

> Incidentally:
>
> - `proto kernel` - indicates that the route was created by the kernel
> - `scope link` -indicates that the addresses are reachable on the local link via that interface (i.e., no gateway is needed)

We can confirm this using our new friends.

`ip-route show` confirms that the ordering of the routes matters.  The first one will be used by the kernel:

```bash
$ ip route show 172.16.0.0/12
172.16.0.0/12 dev veth0 proto kernel scope link src 172.18.0.100
172.16.0.0/12 dev veth1 proto kernel scope link src 172.18.0.101
```

`ip-route get` confirms which interface the kernel actually uses:

```bash
btoll@dane-brass:~$ ip route get 172.16.5.5
172.16.5.5 dev veth0 src 172.18.0.100 uid 1000
    cache
```

We need to fix this, and to do this, we'll use a (virtual) network bridge.

## Bridging

Here's what we need to do.

- remove the IP addresses from both `veth` interfaces in the host network space
- add a bridge device and give it an IP address
- add each `veth` interface to the bridge
- add a route to the bridge in each `net` namespace

We're going to do the same thing, only this time we're going to plug both ends of the `veth` pair that are in the default root `net` namespace into a virtual bridge which will allow for all traffic bound to the `172.16.0.0/12` to be handled correctly.

```bash
$ sudo ip a del 172.18.0.100/12 dev veth0
$ sudo ip a del 172.18.0.101/12 dev veth1
$ sudo ip l add name br0 type bridge
$ sudo ip a add 172.18.0.1/12 dev br0
$ sudo ip l set br0 up
$ sudo ip l set dev veth0 master br0
$ sudo ip l set dev veth1 master br0
```

After running all of the above commands, the routing table looks correct.  Any packet sent to the `172.16.0.0/12` network will be routed through the virtual bridge at `172.18.0.1/12`:

```bash
$ ip r
default via 192.168.122.1 dev enp2s0 proto dhcp src 192.168.122.28 metric 1002
172.16.0.0/12 dev br0 proto kernel scope link src 172.18.0.1
192.168.122.0/24 dev enp2s0 proto dhcp scope link src 192.168.122.28 metric 1002
```

To list all of the interfaces attached to the bridge:

```bash
$ sudo bridge link show
16: veth0@if15: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 master br0 state forwarding priority 32 cost 2
18: veth1@if17: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 master br0 state forwarding priority 32 cost 2
```

> The [`bridge`] command is part of the [`iproute2`] suite of tools.

That's it.  We should now be able to ping both interfaces:

```bash
$ ping -c2 172.18.0.10
PING 172.18.0.10 (172.18.0.10) 56(84) bytes of data.
64 bytes from 172.18.0.10: icmp_seq=1 ttl=64 time=0.084 ms
64 bytes from 172.18.0.10: icmp_seq=2 ttl=64 time=0.067 ms

--- 172.18.0.10 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1014ms
rtt min/avg/max/mdev = 0.067/0.075/0.084/0.008 ms
btoll@dane-brass:~$ ping -c2 172.18.0.20
PING 172.18.0.20 (172.18.0.20) 56(84) bytes of data.
64 bytes from 172.18.0.20: icmp_seq=1 ttl=64 time=0.066 ms
64 bytes from 172.18.0.20: icmp_seq=2 ttl=64 time=0.070 ms

--- 172.18.0.20 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1027ms
rtt min/avg/max/mdev = 0.066/0.068/0.070/0.002 ms
```

As a sanity, we can ensure the traffic is being routed correctly by the bridge by ensuring that we're seeing packets delivered to the interface in each `net` namespace by using `tcpdump`.  To do this, we'll create three terminal windows in `tmux` and then `ssh` into the virtual machine in each session.  Then, we'll start `tcpdump` in each `net` namespace.  The third window will be the one where we `ping` each interface.

Waiting to receive packets on the `ceth0` interface in the `net0` `net` namespace:

```bash
$ sudo ip netns exec net0 tcpdump -li ceth0 ip
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on ceth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
```

Waiting to receive packets on the `ceth1` interface in the `net1` `net` namespace:

```bash
$ sudo ip netns exec net1 tcpdump -li ceth1 ip
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on ceth1, link-type EN10MB (Ethernet), snapshot length 262144 bytes
```

Send two `ICMP` packets to each interface:

```bash
$ ping -c2 172.18.0.20
PING 172.18.0.20 (172.18.0.20) 56(84) bytes of data.
64 bytes from 172.18.0.20: icmp_seq=1 ttl=64 time=0.069 ms
64 bytes from 172.18.0.20: icmp_seq=2 ttl=64 time=0.130 ms

--- 172.18.0.20 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1003ms
rtt min/avg/max/mdev = 0.069/0.099/0.130/0.030 ms
$
$ ping -c2 172.18.0.10
PING 172.18.0.10 (172.18.0.10) 56(84) bytes of data.
64 bytes from 172.18.0.10: icmp_seq=1 ttl=64 time=0.095 ms
64 bytes from 172.18.0.10: icmp_seq=2 ttl=64 time=0.106 ms

--- 172.18.0.10 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1017ms
rtt min/avg/max/mdev = 0.095/0.100/0.106/0.005 ms
```

Below are the results, and now we can go to sleep tonight knowing that each interface is reachable thanks to the addition of the virtual bridge:

```bash
$ sudo ip netns exec net0 tcpdump -li ceth0 ip
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on ceth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
03:28:31.165096 IP 172.18.0.1 > 172.18.0.10: ICMP echo request, id 36, seq 1, length 64
03:28:31.165118 IP 172.18.0.10 > 172.18.0.1: ICMP echo reply, id 36, seq 1, length 64
03:28:32.181801 IP 172.18.0.1 > 172.18.0.10: ICMP echo request, id 36, seq 2, length 64
03:28:32.181839 IP 172.18.0.10 > 172.18.0.1: ICMP echo reply, id 36, seq 2, length 64
Here are all the commands we ran in this section in a handy little script:
```

```bash
$ sudo ip netns exec net1 tcpdump -li ceth1 ip
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on ceth1, link-type EN10MB (Ethernet), snapshot length 262144 bytes
03:28:25.290831 IP 172.18.0.1 > 172.18.0.20: ICMP echo request, id 35, seq 1, length 64
03:28:25.290846 IP 172.18.0.20 > 172.18.0.1: ICMP echo reply, id 35, seq 1, length 64
03:28:26.293752 IP 172.18.0.1 > 172.18.0.20: ICMP echo request, id 35, seq 2, length 64
03:28:26.293802 IP 172.18.0.20 > 172.18.0.1: ICMP echo reply, id 35, seq 2, length 64
```

---

If you want to set all of this up automatically, here's a *nice* script (don't forget to start with a clean slate).

`4_linux_networking.sh`

```bash
#!/bin/bash

set -eo pipefail

LANG=C
umask 0022

if [ -z "$1" ]
then
    printf "Usage: %s add|delete\n" "$0"
    exit 1
fi

BRIDGE=br0

if [ "$1" = "delete" ]
then
    sudo ip link delete "$BRIDGE"

    for i in {0..1}
    do
        # Removing the namespace will also remove the interfaces within it,
        # which subsequently also removes the other end of the pair in the
        # root network namespace.
        sudo ip netns delete "net$i"
    done
elif [ "$1" = "add" ]
then
    sudo ip link add name "$BRIDGE" type bridge
    sudo ip address add 172.18.0.1/12 dev "$BRIDGE"
    sudo ip link set "$BRIDGE" up

    for i in {0..1}
    do
        sudo ip netns add "net$i"
        sudo ip link add "veth$i" type veth peer name "ceth$i"
        sudo ip link set "veth$i" up

        # Attach the new interfaces to the bridge device.
        sudo ip link set dev "veth$i" master "$BRIDGE"
        sudo ip link set "ceth$i" netns "net$i"

        INCREMENT=$((10 + 10 * "$i"))
        sudo ip netns exec "net$i" ip address add "172.18.0.$INCREMENT/12" dev "ceth$i"
        sudo ip netns exec "net$i" ip link set "ceth$i" up

        # Add the route to the bridge interface so the new namespaces can reach the root namespace.
        sudo ip netns exec "net$i" ip route add default via 172.18.0.1
    done
else
    printf "Unrecognized parameter \`%s\`.\n" "$1"
    exit 1
fi

```

<!--
## Listing the `ARP` Table

Check the `arp` tables:

```bash
$ sudo ip netns exec net0 ip neigh
172.18.0.20 dev ceth0 lladdr 7e:31:d1:3d:07:ab REACHABLE
$ sudo ip netns exec net1 ip neigh
172.18.0.10 dev ceth1 lladdr a2:a9:f3:ae:d0:a8 REACHABLE
```
-->

## Conclusion

Ok, for those of you that made it to the very end, I'll let you in on a little secret.  You don't need to do any of these steps in a virtual machine.  Now that you know what namespaces do and, in the case of the `net` namespace, how they isolate network stacks, you can experiment away and then just destroy the `net` namespace after you're finished.

Happy now?

## References

- [How Container Networking Works: a Docker Bridge Network From Scratch](https://labs.iximiuz.com/tutorials/container-networking-from-scratch)
- [Introduction to Linux interfaces for virtual networking](https://developers.redhat.com/blog/2018/10/22/introduction-to-linux-interfaces-for-virtual-networking)
- [Tracing the path of network traffic in Kubernetes](https://learnk8s.io/kubernetes-network-packets)
- [`ip`]
- [Linux list all network namespaces](https://serverfault.com/questions/1074982/linux-list-all-network-namespaces)

[network namespaces]: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
[`ip`]: https://www.man7.org/linux/man-pages/man8/ip.8.html
[`iproute2`]: https://en.wikipedia.org/wiki/Iproute2
[`nsenter`]: https://www.man7.org/linux/man-pages/man1/nsenter.1.html
[`veth`]: https://man7.org/linux/man-pages/man4/veth.4.html
[`CIDR`]: /2021/04/24/on-classless-networks/
[`iptables`]: https://www.man7.org/linux/man-pages/man8/iptables.8.html
[`namespaces`]: https://man7.org/linux/man-pages/man7/namespaces.7.html
[`cgroups`]: https://man7.org/linux/man-pages/man7/cgroups.7.html
[`netfilter`]: https://en.wikipedia.org/wiki/Netfilter
[`sysfs`]: https://en.wikipedia.org/wiki/Sysfs
[`ip-netns`]: https://www.man7.org/linux/man-pages/man8/ip-netns.8.html
[`ip-route`]: https://www.man7.org/linux/man-pages/man8/ip-route.8.html
[rootless container]: https://rootlesscontaine.rs/
[loopback]: /2019/09/23/on-loopback/
[`/etc/sysctl.d/`]: https://www.man7.org/linux/man-pages/man5/sysctl.d.5.html
[network address translation]: https://en.wikipedia.org/wiki/Network_address_translation
[`bridge`]: https://www.man7.org/linux/man-pages/man8/bridge.8.html

