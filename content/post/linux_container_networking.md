+++
title = "On Linux Container Networking"
date = "2023-11-28T21:29:22-05:00"

+++

> This little article is about the [network namespaces] utilities that exist in Linux which lies at the heart of container networking as can be seen in container orchestration tools and service meshes.

---

- [`veth` pair](#veth-pair)
- [One Container](#one-container)
- [A Quick Note On The Routing Table, While He's Away](#a-quick-note-on-the-routing-table-while-hes-away)
- [Bridging](#bridging)
- [Routing](#routing)
- [Listing the `ARP` Table](#listing-the-arp-table)
- [Conclusion](#conclusion)

---

As everyone knows, containers are only possible because of the addition of [`namespaces`] and [`cgroups`] to the Linux kernel.  Because of this, we've begun to see a lot of projects that take advantage of these additions to allow for some very cool technologies.

One of these is virtual networking.  Because the `net` network namespace allows for processes (i.e., containers) to have their own network stacks, we can create virtual networks in software that are analogous to their hardware counterparts.

For instance, we can create virtual bridges (more accurately known as multi-port switches) and routers that interface to subnetworks that create domains of containers.  These subnetworks can and usually do exist within their own network namespace, isolated from other network namespaces (such as the root network namespace) and any resources contained therein.

So, what comprises a network stack?  It includes:

- network devices
- routing rules
- [`iptables`] rules
- [`netfilter`] hooks

This article will be a brief introduction into the bits and bobs needed to create a fully functioning virtual network that will be able to not only access the other containers in its subnetwork but the other network interfaces in the root network namespace and the outside Internet.

We'll become marginally acquainted with the following tools and utilities:

- virtual ethernet interfaces ([`veth`])
- virtual bridges
- enabling routing functionality
- [`iptables`]

Let's get started!

weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

I highly suggest doing these steps in a virtual machine or some other environment that won't affect the network stack on your host machine.  But do what you want, you always do.

---

## `veth` pair

`veth` pairs are virtual devices that reside in the host's network namespace.  We can think of them as two ends of a tunnel, where traffic sent from one end will automatically appear on the other.

Here is the command to create a `veth` pair, with one end named `veth0` and the other `ceth0` ("c" will indicate the end that will be in the container):

```bash
$ sudo ip link add veth0 type veth peer name ceth0
```

Note that they have created, but are in the `DOWN` state and do not have an assigned `IP` address.

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

Interestingly, once the interface is assigned an address **and** is brought up, the kernel creates a routing rule based on the [`CIDR`] address that was given when the virtual Ethernet device was created (recall that before there weren't any rules):

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

This new derived routing rule was able to be created by the kernel in the root namespace because the `veth0` device was given a `CIDR` address when created.

> Note, however, if you were to add that device without the netmask information (the decimal suffix `/12`, in this case), the kernel would be unable to create a routing rule, as it would not have been given enough information to do so.

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

Notice that the last rule was just added by the kernel when the other virtual ethernet device was assigned an IP address with a `CIDR`.

Now, we can ping each interface, but that's not very useful:

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

These endpoints were created in the root network namespace, so this is not very interesting.  Let's now move one end into another (new) network namespace to enable communication between the namespaces.

Here are all the commands we ran in this section in a handy little script:

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
    # Deleting one end of the pair will remove the other automatically.
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

## One Container

Let's now turn our furrowed brow towards how we can begin building a container.

For this next exercise, you will need tools that come with the [`iproute2`] package.  Most distributions will have them installed by default unless you're running a bare-bones installation.

We'll begin again by creating our new friends, the `veth` pair, assigning one end an IP address and bringing it up.  Nothing new here.

```bash
$ sudo ip link add veth0 type veth peer name ceth0
$ sudo ip addr add 172.18.0.10/12 dev veth0
$ sudo ip link set veth0 up
```

However, this time we're going to create a new network namespace.  This is an essential part of creating the container and is crucial to the success of our endeavor.

```bash
$ sudo ip netns add net0
```

So, why is this necessary for this exercise?

Well, in order to begin isolating one process from another, there needs to be separation.  Namespaces facilitate that, with the `net` namespace the focus of this article, of course.

Once the new network namespace is created, you can use the [`nsenter`] utility from the `util-linux` package to run programs in different namespaces.

For example, here we're using the `--net` option to enter the network namespace and run the `bash` program:

```bash
$ sudo nsenter --net=/run/netns/net0 bash
```

> If no command is given, it will execute the default shell (re: the value of the `SHELL` environment variable).

Of course, all eight namespaces (as of kernel 5.6) can be specified.  Just replace `net` above with the namespace of your choice.  See the [`nsenter`] manpage for details.

> Note that the `bash` process doesn't run in its own `pid` namespace, as it wasn't created (or, if it was, it wasn't listed as an option to the `nsenter` command above).
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
> Also, notice that we're not running in a rootless container, as the `UID`s and `GID`s don't map to a non-privileged user on the host.
>
> ```bash
> # cat /proc/$$/[u,g]id_map
>          0          0 4294967295
>          0          0 4294967295
> ```
>
> If this had been created as a rootless container, then the 0 `UID` in the second column would be that of a non-privileged user on the host, like:
>
> ```bash
> # cat /proc/$$/[u,g]id_map
>          0       1000          1
>          0       1000          1
> ```
>
> Anyway...

While we're still in the new `net0` network namespace, let's see what network devices we have access to:

```bash
# ip link list
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

We can see that it does indeed have its own network stack as evidenced by the fact that there is not an ethernet device listed (the `eth0` device of the host, that is).

Additionally, there are no routing rules:

```bash
# ip route list
Error: ipv4: FIB table does not exist.
Dump terminated
```

Issue the `exit` command to leave return to the host.

If you don't want to enter the namespace, you can use the `exec` subcommand of the `ip-netns` command:

```bash
$ sudo ip netns exec net0 ip l
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

---

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
$ sudo nsenter --net=/run/netns/net0 ip l
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
3: ceth0@if4: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether 82:90:89:29:74:4a brd ff:ff:ff:ff:ff:ff link-netnsid 0
```

Now that each end of the `veth` pair is in a different namespace, we are on our way to creating a container.

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

In order to send traffic between these devices, we must bring them both up and assign them IP4 or IP6 addresses:

```bash
$ sudo ip link set veth0 up
$ sudo ip addr add 172.18.0.11/16 dev veth0
$ ip address show veth0
4: veth0@if3: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state LOWERLAYERDOWN group default qlen 1000
    link/ether 16:c9:69:a9:8b:90 brd ff:ff:ff:ff:ff:ff link-netns net0
    inet 172.18.0.11/16 scope global veth0
       valid_lft forever preferred_lft forever
```

Do the same in the `net0` namespace:

```bash
$ sudo nsenter --net=/run/netns/net0 bash
# ip link set ceth0 up
# ip addr add 172.18.0.10/16 dev ceth0
# ip a show ceth0
3: ceth0@if4: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 82:90:89:29:74:4a brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.18.0.10/16 scope global ceth0
       valid_lft forever preferred_lft forever
    inet6 fe80::8090:89ff:fe29:744a/64 scope link
       valid_lft forever preferred_lft forever
```

> For good practice, let's bring up the loopback device, as well:
>
> ```bash
> # ip link set lo up
> ```

It's go time (still in the `net0` namespace):

```bash
# ping -c2 172.18.0.11
PING 172.18.0.11 (172.18.0.11) 56(84) bytes of data.
64 bytes from 172.18.0.11: icmp_seq=1 ttl=64 time=0.027 ms
64 bytes from 172.18.0.11: icmp_seq=2 ttl=64 time=0.140 ms

--- 172.18.0.11 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1012ms
rtt min/avg/max/mdev = 0.027/0.083/0.140/0.056 ms
```

> Unfortunately, we can't (yet) ping the physical network device on the host nor the outside Internet.

And, if we exit back to the host root namespace, we can also ping the `ceth` device in the `net0` namespace:

```bash
$ ping -c2 172.18.0.10
PING 172.18.0.10 (172.18.0.10) 56(84) bytes of data.
64 bytes from 172.18.0.10: icmp_seq=1 ttl=64 time=0.064 ms
64 bytes from 172.18.0.10: icmp_seq=2 ttl=64 time=0.096 ms

--- 172.18.0.10 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 999ms
rtt min/avg/max/mdev = 0.064/0.080/0.096/0.016 ms
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
    # Removing the namespace will also remove the interfaces within it,
    # which subsequently also removes the other end of the pair in the
    # root network namespace.
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
    printf "sudo ip netns list\n"
else
    printf "Unrecognized parameter \`%s\`.\n" "$1"
    exit 1
fi

```

To use this script, simply:

```bash
$ bash /vagrant/2_linux_networking.sh add
ping 172.18.0.10
ping 172.18.0.20
sudo ip netns list
```

This establishes a `veth` pair and moves one end into a new `net` namespace.  By providing the `CIDR` when adding an IP address to the virtual devices, we don't need to explicitly add a route.

The command will echo to `stdout` the ping and `netns-list` commands.

To cleanup:

```bash
$ bash /vagrant/2_linux_networking.sh delete
```

## A Quick Note On The Routing Table, While He's Away

Let's now revisit the derived routing rule that was created for us in the `net0` network namespace.  Again, here is the routing rule:

```bash
# ip r
172.18.0.0/16 dev ceth0 proto kernel scope link src 172.18.0.10
```

What is this doing?  It's sending any packets destined for the `172.18.0.0/16` network through the `ceth0`, discarding all others.  This is why we cannot reach the host network or the Internet.

## Bridging

Let's now take a look at a more advanced use case.  Specifically, creating two containers and wiring up the bits that will allow them to not only communicate with each other but also with the outside world.

What would happen if we duplicated all of our previous steps?  That is, in addition to what we've already done, we:

1. Create another network namespace.
1. Add a veth pair.
1. Move one half of the pair into the new namespace.
1. Bring both interfaces up and assigned each one a `CIDR` address, thus automatically also creating the new routing rules.

Well, there would be routing conflicts, because the table would have conflicting routing rules:

```bash
$ ip r
default via 10.0.2.2 dev eth0
10.0.2.0/24 dev eth0 proto kernel scope link src 10.0.2.15
172.16.0.0/12 dev veth0 proto kernel scope link src 172.18.0.100
172.16.0.0/12 dev veth1 proto kernel scope link src 172.18.0.101
```

Here's a listing of the network devices and the routing table of the `net0` network namespace:

```bash
$ sudo ip netns exec net0 ip a; echo; ip r
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
13: ceth0@if14: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 22:20:56:8c:2e:83 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.18.0.10/12 scope global ceth0
       valid_lft forever preferred_lft forever
    inet6 fe80::2020:56ff:fe8c:2e83/64 scope link
       valid_lft forever preferred_lft forever

default via 10.0.2.2 dev eth0
10.0.2.0/24 dev eth0 proto kernel scope link src 10.0.2.15
172.16.0.0/12 dev veth0 proto kernel scope link src 172.18.0.100
172.16.0.0/12 dev veth1 proto kernel scope link src 172.18.0.101
```

And, the `net1` network namespace:

```bash
$ sudo ip netns exec net1 ip a; echo; ip r
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
15: ceth1@if16: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether c2:7f:11:fd:44:66 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.18.0.20/12 scope global ceth1
       valid_lft forever preferred_lft forever
    inet6 fe80::c07f:11ff:fefd:4466/64 scope link
       valid_lft forever preferred_lft forever

default via 10.0.2.2 dev eth0
10.0.2.0/24 dev eth0 proto kernel scope link src 10.0.2.15
172.16.0.0/12 dev veth0 proto kernel scope link src 172.18.0.100
172.16.0.0/12 dev veth1 proto kernel scope link src 172.18.0.101
```

The device in the `net0` namespace would be able to ping its half of the pair (`172.18.0.11`) and the new veth device in the root network namespace (`172.18.0.21`), but the new virtual device in the `net1` namespace (not shown) would not be able to ping either.

Ah, success:

```bash
$ sudo ip netns exec net0 ping -c2 172.18.0.101
PING 172.18.0.101 (172.18.0.101) 56(84) bytes of data.
64 bytes from 172.18.0.101: icmp_seq=1 ttl=64 time=0.020 ms
64 bytes from 172.18.0.101: icmp_seq=2 ttl=64 time=0.080 ms

--- 172.18.0.101 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1071ms
rtt min/avg/max/mdev = 0.020/0.050/0.080/0.030 ms
```

Ah, failure:

```bash
$ sudo ip netns exec net1 ping 172.18.0.100
PING 172.18.0.100 (172.18.0.100) 56(84) bytes of data.
^C
--- 172.18.0.100 ping statistics ---
28 packets transmitted, 0 received, 100% packet loss, time 29337ms
```

As mentioned, there are conflicting routing table rules, and this needs to be addressed.  And, the order of the routing rules matters.  For instance, if the rules for the `veth` pairs were reversed, then the `net1` device would have no problem reaching the `net0` device, but the latter would then have issues.

If we want to keep these devices in the same IP network, then the way to fix this is to introduce a `bridge` device (alternatively, we could introduce a new IP network for each new network namespace and veth pair).

Importantly, though, the veth interface in the `net0` namespace **cannot** reach the physical interface on the host machine:

```bash
$ sudo ip netns exec net0 ping -c2 10.0.2.15
ping: connect: Network is unreachable
```

Although, the physical interface on the host machine in the root network namespace can ping the interface in the `net0` namespace:

```bash
$ ping -c2 172.18.0.10
PING 172.18.0.10 (172.18.0.10) 56(84) bytes of data.
64 bytes from 172.18.0.10: icmp_seq=1 ttl=64 time=0.066 ms
64 bytes from 172.18.0.10: icmp_seq=2 ttl=64 time=0.165 ms

--- 172.18.0.10 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1073ms
rtt min/avg/max/mdev = 0.066/0.115/0.165/0.049 ms
```

But not the interface in the `net1` namespace:

```bash
$ ping -c2 172.18.0.20
PING 172.18.0.20 (172.18.0.20) 56(84) bytes of data.
From 172.18.0.100 icmp_seq=1 Destination Host Unreachable
From 172.18.0.100 icmp_seq=2 Destination Host Unreachable

--- 172.18.0.20 ping statistics ---
2 packets transmitted, 0 received, +2 errors, 100% packet loss, time 1305ms
pipe 2
```

There's nothing to be done about this except sit and cry.  Unless...

If we were to create a bridge and connect `veth0` and `veth1` to it instead of the host net namespace, that would immediately fix these connection issues.

Let's do that now.

To start, we'll create a virtual bridge device to which we'll attach one end of all the `veth` pairs that are created:

```bash
$ sudo ip link add name br0 type bridge
$ ip l show br0
7: br0: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether de:b1:9e:51:f9:57 brd ff:ff:ff:ff:ff:ff
```

Next, we'll bring it `UP`:

```bash
$ sudo ip link set br0 up
$ ip l show br0
7: br0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN mode DEFAULT group default qlen 1000
    link/ether de:b1:9e:51:f9:57 brd ff:ff:ff:ff:ff:ff
```

Note that, like the other virtual network devices we've created, the kernel doesn't automatically create a route until an IP address is assigned to the device **with** a `CIDR`:

```bash
$ ip r
default via 10.0.2.2 dev eth0
10.0.2.0/24 dev eth0 proto kernel scope link src 10.0.2.15
$
$ sudo ip address add 172.18.0.1/12 dev br0
$ ip r
default via 10.0.2.2 dev eth0
10.0.2.0/24 dev eth0 proto kernel scope link src 10.0.2.15
172.16.0.0/12 dev br0 proto kernel scope link src 172.18.0.1 linkdown
```

The next bit will look familiar.  Create new `net` namespace, create a new `veth` pair and bring the `veth0` end `UP`:

```bash
$ sudo ip netns add net0
$ sudo ip link add veth0 type veth peer name ceth0
$ sudo ip link set veth0 up
```

Next, we'll execute the crucial command that will attach the `veth0` endpoint to the new master `br0` bridge.  For a sanity check, we'll then list all the devices attached to the bridge:

```bash
$ sudo ip link set dev veth0 master br0
$ ip link show master br0
9: veth0@ceth0: <BROADCAST,MULTICAST,M-DOWN> mtu 1500 qdisc noop master br0 state DOWN mode DEFAULT group default qlen 1000
    link/ether 42:28:24:4e:f9:72 brd ff:ff:ff:ff:ff:ff
```

The other end is attached to the new `net0` namespace.  This will allow the virtual bridge device to act like a multi-port switch.  It will learn where to send any traffic received by it that should be forwarded on to a subdomain:

```bash
$ sudo ip link set ceth0 netns net0
```

Notice that as soon as this endpoint is attached to a different network namespace that it is no longer listed in the root `net` namespace:

```bash
$ ip l
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP mode DEFAULT group default qlen 1000
    link/ether 08:00:27:8d:c0:4d brd ff:ff:ff:ff:ff:ff
    altname enp0s3
7: br0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN mode DEFAULT group default qlen 1000
    link/ether de:b1:9e:51:f9:57 brd ff:ff:ff:ff:ff:ff
9: veth0@if8: <BROADCAST,MULTICAST> mtu 1500 qdisc noop master br0 state DOWN mode DEFAULT group default qlen 1000
    link/ether 42:28:24:4e:f9:72 brd ff:ff:ff:ff:ff:ff link-netns net0
```

```bash
$ sudo ip netns exec net0 ip address add 172.18.0.153/12 dev ceth0
$ sudo ip netns exec net0 ip r
172.16.0.0/12 dev ceth0 proto kernel scope link src 172.18.0.153
```

```bash
$ ping -c2 172.18.0.153
PING 172.18.0.153 (172.18.0.153) 56(84) bytes of data.
64 bytes from 172.18.0.153: icmp_seq=1 ttl=64 time=0.124 ms
64 bytes from 172.18.0.153: icmp_seq=2 ttl=64 time=0.043 ms

--- 172.18.0.153 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 999ms
rtt min/avg/max/mdev = 0.043/0.083/0.124/0.040 ms
```

However, we still can't ping the host's `eth0` device from inside the `net0` namespace:

```bash
$ sudo ip netns exec net0 ping 10.0.2.15
ping: connect: Network is unreachable
```

This problem is easy to diagnose: there's no default route to the bridge device in the `net0` namespace's routing table.  We'll fix that now:

```bash
$ sudo ip netns exec net0 ip route add default via 172.18.0.1
$ sudo ip netns exec net0 ping -c2 10.0.2.15
PING 10.0.2.15 (10.0.2.15) 56(84) bytes of data.
64 bytes from 10.0.2.15: icmp_seq=1 ttl=64 time=0.030 ms
64 bytes from 10.0.2.15: icmp_seq=2 ttl=64 time=0.047 ms

--- 10.0.2.15 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 999ms
rtt min/avg/max/mdev = 0.030/0.038/0.047/0.008 ms
$
$ sudo ip netns exec net0 ip r
default via 172.18.0.1 dev ceth0
172.16.0.0/12 dev ceth0 proto kernel scope link src 172.18.0.153
```

Ok, fantastic.  But, there's still a fairly big issue:  we still can't send or receive traffic from the outside world.  We'll look at resolving that in the next section.

```bash
$ sudo ip netns exec net0 ping -c2 1.1.1.1
PING 1.1.1.1 (1.1.1.1) 56(84) bytes of data.
^C
--- 1.1.1.1 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1005ms
```

---

Here are all the commands we ran in this section in a handy little script:

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

## Routing

To enable traffic to flow to and from the outside world, there are two things that need to happen.

The first is to turn the machine into a router:

```bash
$ echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward
1
```

> Of course, this setting won't survive a reboot.  To persist this value, edit the `/etc/sysctl.conf` configuration file.

The second is to enable network address translation (NAT) so that the router can swap its own IP address with that of the private IP addresses of the containers:

```bash
$ sudo iptables -t nat -A POSTROUTING -s 172.18.0.0/12 ! -o br0 -j MASQUERADE
```

```bash
$ sudo ip netns exec net0 ping -c2 1.1.1.1
PING 1.1.1.1 (1.1.1.1) 56(84) bytes of data.
64 bytes from 1.1.1.1: icmp_seq=1 ttl=61 time=16.5 ms
64 bytes from 1.1.1.1: icmp_seq=2 ttl=61 time=18.3 ms

--- 1.1.1.1 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1008ms
rtt min/avg/max/mdev = 16.492/17.388/18.285/0.896 ms
```

## Listing the `ARP` Table

Check the `arp` tables:

```bash
$ sudo ip netns exec net0 ip neigh
172.18.0.20 dev ceth0 lladdr 7e:31:d1:3d:07:ab REACHABLE
$ sudo ip netns exec net1 ip neigh
172.18.0.10 dev ceth1 lladdr a2:a9:f3:ae:d0:a8 REACHABLE
```

## Conclusion

That's it, Charlie.  It's way too long.

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

