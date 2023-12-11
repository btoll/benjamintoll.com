+++
title = "On Linux Container Networking"
date = "2023-11-28T21:29:22-05:00"

+++

<!--
This little article is about the [network namespaces] utilities that exist in Linux which lies at the heart of container networking as can be seen in container orchestration tools and service meshes.

[`ip`]

[`iproute2`] package

Create a new network namespace called `net0`:

```bash
$ sudo ip netns add net0
```

Enter the new network namespace:

The first method is using the [`nsenter`] utility from the `util-linux` package.  It will execute a command in the namespace specified in the command-line options.  For example, here we're using the `--net` option to enter the network namespace:

```bash
$ sudo nsenter --net=/run/netns/net0 bash
```

> If no command is given, it will execute the default shell (re: the value of the `SHELL` environment variable).

Of course, all eight namespaces (as of kernel 5.6) can be specified.  Just replace `net` above with the namespace of your choice.  See the [`nsenter`] manpage for details.

> As an aside, for those of you already familiar with Linux namespaces, you will know that the `bash` process doesn't run in its own `pid` namespace, as it wasn't created (or, if it was, it wasn't listed as an option to the `nsenter` command above).
>
> We can see this from inside the container after running the above command:
>
> ```bash
> # ps -1
>     PID TTY      STAT   TIME COMMAND
>       1 ?        Ss     0:11 /lib/systemd/systemd --system --deserialize=22
> ```
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

While we're still in the new `net0` network namespace, see what network devices we have access to:

```bash
# ip link list
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

We can see that it does indeed have its own network stack as evidenced by the fact that there is not an ethernet device listed (the `eth0` device of the host, that is).

Additionally, there are no routing rules:

```bash
# ip route list
#
```

[`veth`]

Create a pair of virtual Ethernet devices named `veth0` and `ceth0`:

```bash
$ sudo ip link add veth0 type veth peer name ceth0
$ $ ip l
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
...
3: ceth0@veth0: <BROADCAST,MULTICAST,M-DOWN> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether ea:11:97:0c:0d:65 brd ff:ff:ff:ff:ff:ff
4: veth0@ceth0: <BROADCAST,MULTICAST,M-DOWN> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether c6:57:d6:10:7e:5d brd ff:ff:ff:ff:ff:ff
```

These virtual devices reside in the host's network namespace.  We can think of them as two ends of a tunnel, where traffic sent from one end will automatically appear on the other.  Next, we'll move one of the devices into the `net0` namespace, leaving the other in the host (root) namespace.

```bash
$ sudo ip link set ceth0 netns net0
```

If we list the network devices again, we'll see that the `ceth0` device is no longer listed in the root namespace because of it having been moved into the `net0` namespace:

```bash
$ ip l
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
...
4: veth0@if3: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether c6:57:d6:10:7e:5d brd ff:ff:ff:ff:ff:ff link-netnsid 0
```

Let's run the same command in the `net0` namespace to view `veth0'`s peer:

```bash
$ sudo nsenter --net=/run/netns/net0 ip l
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
3: ceth0@if4: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether ea:11:97:0c:0d:65 brd ff:ff:ff:ff:ff:ff link-netnsid 0
```

Oh no, you didn't!

In order to send traffic between these devices, we must bring them both up and assign them IP4 or IP6 addresses:

```bash
$ sudo ip link set veth0 up
$ sudo ip addr add 172.18.0.11/16 dev veth0
$ ip address show veth0
4: veth0@if3: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state LOWERLAYERDOWN group default qlen 1000
    link/ether c6:57:d6:10:7e:5d brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.18.0.11/16 scope global veth0
       valid_lft forever preferred_lft forever
```

Do the same in the `net0` namespace:

```bash
$ sudo nsenter --net=/run/netns/net0 bash
# ip link set ceth0 up
# ip addr add 172.18.0.10/16 dev ceth0
# ip l show ceth0
3: ceth0@if4: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether ea:11:97:0c:0d:65 brd ff:ff:ff:ff:ff:ff link-netnsid 0
```

> For good practice, let's bring up the loopback device, as well:
>
> ```bash
> # ip link set lo up
> ```

It's go time (from the `net0` namespace):

```bash
# ping -c2 172.18.0.11
PING 172.18.0.11 (172.18.0.11) 56(84) bytes of data.
64 bytes from 172.18.0.11: icmp_seq=1 ttl=64 time=0.027 ms
64 bytes from 172.18.0.11: icmp_seq=2 ttl=64 time=0.140 ms

--- 172.18.0.11 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1012ms
rtt min/avg/max/mdev = 0.027/0.083/0.140/0.056 ms
```

Unfortunately, we can't (yet) ping the physical network device on the host nor the outside Internet.

#Let's now revisit the derived routing rule that was created for us in the `net0` network namespace.  Again, here is the routing rule:
#
#```bash
## ip r
#172.18.0.0/16 dev ceth0 proto kernel scope link src 172.18.0.10
#```
#
#What is this doing?  It's sending any packets destined for the `172.18.0.0/16` network through the `ceth0`, discarding all others.  This is why we cannot reach the host network or the Internet.

What would happen if we duplicated all of our previous steps?  That is:
1. Created another network namespace.
1. Added a veth pair.
1. Moved one half of the pair into the new namespace.
1. Brought both interfaces up and assigned each one a `CIDR` address, thus automatically also creating the new routing rules.

Well, there would be routing conflicts, because the table would have conflicting routing rules:

```bash
$ ip r
...
172.18.0.0/16 dev veth0 proto kernel scope link src 172.18.0.11
172.18.0.0/16 dev veth1 proto kernel scope link src 172.18.0.21
```

The device in the `net0` namespace would be able to ping its half of the pair (`172.18.0.11`) and the new veth device in the root network namespace (`172.18.0.21`), but the new virtual device in the `net1` namespace (not shown) would not be able to ping either.

As mentioned, there are conflicting routing table rules, and this needs to be addressed.  If we want to keep these devices in the same IP network, then the way to fix this is to introduce a `bridge` device (alternateively, we could introduce a new IP network for each new network namespace and veth pair).
-->














As everyone knows, containers are only possible because of the addition of [`namespaces`] and [`cgroups`] to the Linux kernel.  Because of this, we've begun to see a lot of projects that take advantage of these additions to allow for some very cool technologies.

One of these is virtual networking.  Because the `net` network namespace allows for processes (i.e., containers) to have their own network stacks, we can create virtual networks in software that are analogous to their hardware counterparts.

For instance, we can create virtual bridges (i.e., multi-port switches) and routers that interface to subnetworks that create domains of containers.  These subnetworks can and usually do exist within their own network namespace, isolated from other network namespaces (such as the root network namespace) and any resources contained therein.

So, what comprises a network stack?  It includes:

- network devices
- routing rules
- `iptables` rules
- `netfilter` hooks

This article will be a brief introduction into the bits and bobs needed to create a fully functioning virtual network that will be able to not only access the other containers in its subnetwork but the other network interfaces in the root network namespace and the outside Internet.

We'll become marginally acquainted with the following tools and utilities:

- virtual ethernet interfaces (`veth`)
- virtual bridges
- enabling routing functionality
- [`iptables`]

Let's get started!

weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

---

- `veth` pair
- One Container
- Two Containers
- Bridging
- Routing

---

Let's set up a test environment.  I highly suggest doing these steps in a virtual machine or some other environment that won't affect the network stack on your host machine.  But do what you want, you always do.

Importantly, we'll create a [`veth`] pair.  This will act much like a crossover cable, where anything put into one end will appear at the other.

Let's create a `veth` pair, with one end named `veth0` and the other `ceth0`:

```bash
$ sudo ip link add veth0 type veth peer name ceth0
```

Note that they have created, but are in the `DOWN` state and do not have no assigned `IP` addresses.

```bash
$ ip link
...
11: ceth0@veth0: <BROADCAST,MULTICAST,M-DOWN> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether b2:dd:07:0f:b1:a3 brd ff:ff:ff:ff:ff:ff
12: veth0@ceth0: <BROADCAST,MULTICAST,M-DOWN> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether 06:f8:0f:dd:3d:ce brd ff:ff:ff:ff:ff:ff
$ ip address
...
11: ceth0@veth0: <BROADCAST,MULTICAST,M-DOWN> mtu 1500 qdisc noop state DOWN group default qlen 1000
    link/ether b2:dd:07:0f:b1:a3 brd ff:ff:ff:ff:ff:ff
12: veth0@ceth0: <BROADCAST,MULTICAST,M-DOWN> mtu 1500 qdisc noop state DOWN group default qlen 1000
    link/ether 06:f8:0f:dd:3d:ce brd ff:ff:ff:ff:ff:ff
```

Let's now assign an `IPv4` address to the `veth0` interface and bring it up:

```bash
$ sudo ip addr add 172.18.0.10/16 dev veth0
$ sudo ip link set veth0 up
$ ip a show veth0
12: veth0@ceth0: <NO-CARRIER,BROADCAST,MULTICAST,UP,M-DOWN> mtu 1500 qdisc noqueue state LOWERLAYERDOWN group default qlen 1000
    link/ether 06:f8:0f:dd:3d:ce brd ff:ff:ff:ff:ff:ff
    inet 172.18.0.10/16 scope global veth0
       valid_lft forever preferred_lft forever
```

Interestingly, once the interface is assigned an address **and** is brought up, the kernel creates a routing rule based on the [`CIDR`] address that was given when the virtual Ethernet device was created (recall that before there weren't any rules):

```bash
$ ip route
...
172.18.0.0/16 dev veth0 proto kernel scope link src 172.18.0.10 linkdown
```

> A new derived routing rule was also created by the kernel in the root namespace when the `veth0` device was given a `CIDR` address.

Note, however, if you were to add that device without the netmask information (the decimal suffix `/16`, in this case), the kernel would be unable to create a routing rule, as it would not have been given enough information to do so.

In addition, if you were to delete the device after creating it, you'd see that the kernel would also then remove the routing rule (if it had been automatically created by the kernel).

We'll also assign an `IPv4` address to the other end of the `veth` pair:

```bash
$ sudo ip link set ceth0 up
$ sudo ip addr add 172.16.0.20/12 dev ceth0
```

We can ping each interface, but that's not very useful:

```bash
$ ping -c2 172.16.0.10
PING 172.16.0.10 (172.16.0.10) 56(84) bytes of data.
64 bytes from 172.16.0.10: icmp_seq=1 ttl=64 time=0.085 ms
64 bytes from 172.16.0.10: icmp_seq=2 ttl=64 time=0.065 ms

--- 172.16.0.10 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1017ms
rtt min/avg/max/mdev = 0.065/0.075/0.085/0.010 ms
$
$ ping -c2 172.16.0.20
PING 172.16.0.20 (172.16.0.20) 56(84) bytes of data.
64 bytes from 172.16.0.20: icmp_seq=1 ttl=64 time=0.027 ms
64 bytes from 172.16.0.20: icmp_seq=2 ttl=64 time=0.094 ms

--- 172.16.0.20 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1594ms
rtt min/avg/max/mdev = 0.027/0.060/0.094/0.033 ms
```

These endpoints will be created in the root network namespace, so this is not very interesting.  Let's now move one end into another (new) network namespace to enable communication between the namespaces.

The routing table will report `linkdown` in the new rule because the other end of the veth pair in the new `net0` namespace is down:

```bash
$ ip rdefault via 10.0.2.2 dev eth0
10.0.2.0/24 dev eth0 proto kernel scope link src 10.0.2.15
172.16.0.0/12 dev veth0 proto kernel scope link src 172.16.0.10 linkdown
```

Note that this rule was automatically created for us because we were able to give the kernel enough information when binding (adding) the IP address to the end of the veth pair in the root network namespace.

What was the crucial piece of information that allowed this?  The variable network mask (`/12`).  Without that, the kernel would not have known how to create a route and the rule wouldn't have been automatically added to the table.

```bash
$ sudo ip link delete veth0
```

> We can think of one end as being in a container, and the other as being on the host.

In the `net0` network namespace (although command is executed from the root network namespace):

```bash
$ sudo ip netns exec net0 ip r
172.16.0.0/12 dev ceth0 proto kernel scope link src 172.16.0.20
```

```bash
$ sudo ip netns exec net0 ping -c2 172.16.0.10
PING 172.16.0.10 (172.16.0.10) 56(84) bytes of data.
64 bytes from 172.16.0.10: icmp_seq=1 ttl=64 time=0.042 ms
64 bytes from 172.16.0.10: icmp_seq=2 ttl=64 time=0.053 ms

--- 172.16.0.10 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1023ms
rtt min/avg/max/mdev = 0.042/0.047/0.053/0.005 ms
```

Importantly, the veth interface in the `net0` namespace cannot reach the physical interface on the host machine:

```bash
$ sudo ip netns exec net0 ping -c2 10.0.2.15
ping: connect: Network is unreachable
```

Although, the physical interface on the host machine in the root network namespace can ping the interface in the `net0` namespace:

```bash
$ ping -c2 172.16.0.20
PING 172.16.0.20 (172.16.0.20) 56(84) bytes of data.
64 bytes from 172.16.0.20: icmp_seq=1 ttl=64 time=0.030 ms
64 bytes from 172.16.0.20: icmp_seq=2 ttl=64 time=0.099 ms

--- 172.16.0.20 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 999ms
rtt min/avg/max/mdev = 0.030/0.064/0.099/0.034 ms
```

Will we fix this later.

Now, if we were to add **two** network namespaces and **two** virtual Ethernet devices, then we'd run into a new problem.  There would be two conflicting routing rules, as can be seen by listing the rules:

```bash
$ ip r
default via 10.0.2.2 dev eth0
10.0.2.0/24 dev eth0 proto kernel scope link src 10.0.2.15
172.16.0.0/12 dev veth0 proto kernel scope link src 172.16.0.100
172.16.0.0/12 dev veth1 proto kernel scope link src 172.16.0.101
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
        sudo ip address add 172.16.0."$((100 + "$i"))"/12 dev "veth$i"
        sudo ip link set "veth$i" up
        sudo ip link set "ceth$i" netns "net$i"

        INCREMENT=$((10 + 10 * "$i"))
        sudo ip netns exec "net$i" ip address add "172.16.0.$INCREMENT/12" dev "ceth$i"
        sudo ip netns exec "net$i" ip link set "ceth$i" up
    done
else
    printf "Unrecognized parameter \`%s\`.\n" "$1"
    exit 1
fi
```

Check the `arp` tables:

```bash
$ sudo ip netns exec net1 ip neigh
172.16.0.10 dev ceth1 lladdr a2:a9:f3:ae:d0:a8 REACHABLE
$ sudo ip netns exec net0 ip neigh
172.16.0.20 dev ceth0 lladdr 7e:31:d1:3d:07:ab REACHABLE
```

```bash
$ sudo iptables -t nat -A POSTROUTING -s 172.16.0.0/12 ! -o br0 -j MASQUERADE
$ echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward
1
```

## References

- [Introduction to Linux interfaces for virtual networking](https://developers.redhat.com/blog/2018/10/22/introduction-to-linux-interfaces-for-virtual-networking)

[network namespaces]: https://man7.org/linux/man-pages/man7/network_namespaces.7.html
[`ip`]: https://www.man7.org/linux/man-pages/man8/ip.8.html
[`iproute2`]: https://en.wikipedia.org/wiki/Iproute2
[`nsenter`]: https://www.man7.org/linux/man-pages/man1/nsenter.1.html
[`veth`]: https://man7.org/linux/man-pages/man4/veth.4.html
[`CIDR`]: /2021/04/24/on-classless-networks/
[`iptables`]: https://www.man7.org/linux/man-pages/man8/iptables.8.html
[`namespaces`]: https://man7.org/linux/man-pages/man7/namespaces.7.html
[`cgroups`]: https://man7.org/linux/man-pages/man7/cgroups.7.html

