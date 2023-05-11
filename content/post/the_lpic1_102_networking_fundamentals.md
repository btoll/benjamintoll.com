+++
title = "On the LPIC-1 Exam 102: Networking Fundamentals"
date = "2023-02-03T20:07:57-05:00"

+++

This is a riveting series:

- [On the LPIC-1 Exam 102: Shells and Shell Scripting](/2023/01/22/on-the-lpic-1-exam-102-shells-and-shell-scripting/)
- [On the LPIC-1 Exam 102: User Interfaces and Desktops](/2023/01/25/on-the-lpic-1-exam-102-user-interfaces-and-desktops/)
- [On the LPIC-1 Exam 102: Administrative Tasks](/2023/01/26/on-the-lpic-1-exam-102-administrative-tasks/)
- [On the LPIC-1 Exam 102: Essential System Services](/2023/02/01/on-the-lpic-1-exam-102-essential-system-services/)
- On the LPIC-1 Exam 102: Networking Fundamentals
- [On the LPIC-1 Exam 102: Security](/2023/02/06/on-the-lpic-1-exam-102-security/)

And, so is this one!

- [On the LPIC-1 Exam 101 (101-500), Part One](/2023/01/13/on-the-lpic-1-exam-101-system-architecture/)

---

When studying for the Linux Professional Institute [LPIC-1] certification, I took a bunch of notes when reading the docs and doing an online course.  Note that this is not exhaustive, so do not depend on this article to get you prepared for the exam.

The menu items below are not in any order.

This roughly covers [Topic 109: Networking Fundamentals].

*Caveat emptor*.

---

- [Exam Details](#exam-details)
- [Topic 109: Networking Fundamentals](#topic-109-networking-fundamentals)
    + [`IP` Addresses](#ip-addresses)
        - [Classful](#classful)
        - [Classless](#classless)
    + [Conversions](#conversions)
        - [Decimal to Binary](#decimal-to-binary)
        - [Binary to Decimal](#binary-to-decimal)
    + [Netmask](#netmask)
    + [`CIDR`](#cidr)
        - [Determine Network Address](#determine-network-address)
        - [Determine Broadcast Address](#determine-broadcast-address)
        - [Calculate Total Number of Hosts](#calculate-total-number-of-hosts)
    + [Default Route](#default-route)
    + [Ports](#ports)
    + [Protocols](#protocols)
        - [`TCP`](#tcp)
        - [`UDP`](#udp)
        - [`ICMP`](#icmp)
        - [`IPv6`](#ipv6)
    + [Network Interfaces](#network-interfaces)
        - [Listing](#listing)
        - [Naming](#naming)
        - [Managing](#managing)
    + [`hostname`](#hostname)
        - [Setting](#setting)
        - [Lookups](#lookups)
            + [`/etc/hosts`](#etchosts)
            + [`/etc/resolv.conf`](#etcresolvconf)
    + [`NetworkManager`](#networkmanager)
    + [`systemd-networkd`](#systemd-networkd)
    + [`ip`](#ip)
        - [`address`](#address)
        - [`link`](#link)
    + [Routing Table](#routing-table)
    + [Managing Routes](#managing-routes)
    + [Testing Network Connections](#testing-network-connections)
        - [`ping`](#ping)
        - [`traceroute`](#traceroute)
        - [`tracepath`](#tracepath)
    + [`netcat`](#netcat)
    + [`netstat`](#netstat)
    + [`ss`](#ss)
    + [`systemd-resolved`](#systemd-resolved)
    + [Name Resolution](#name-resolution)
        - [`getent`](#getent)
        - [`host`](#host)
        - [`dig`](#dig)
- [Summary](#summary)
- [References](#references)

---

# Exam Details

[LPIC-1 Exam 102]

- Exam Objectives Version: 5.0
- Exam Code: 102-500

# Topic 109: Networking Fundamentals

## `IP` Addresses

Internet protocol addresses are 32-bits long, divided into four groups of eight bits (1 byte).  These groups are usually called octets or dotted quads and are referred to as being in dotted decimal format.

### Classful

In the old days, `IP` addresses were given out in blocks from different address spaces called [classes], five in all, although the `LPIC-1` only seems to care about the first three.  Not cool, `LPIC-1`, not cool.

- `Class A`
    + `1.0.0.0` - `126.255.255.255`
- `Class B`
    + `128.0.0.0` - `191.255.255.255`
- `Class C`
    + `192.0.0.0` - `223.255.255.255`

These are publicly-routable addresses.

There are also private `IP` addresses that can only be used on private networks.  There is one range for each class:

- `Class A`
    + `10.0.0.0` - `10.255.255.255`
- `Class B`
    + `172.16.0.0` - `172.31.255.255`
- `Class C`
    + `192.168.0.0` - `192.168.255.255`

## Conversions

### Decimal to Binary

Perhaps the easiest way to do this conversion is by hand rather than programmatically.  In this method, the number is halved and the remainder recorded right to left until 0 or 1 is reached.  That's it.

Let's convert the number 105 to binary.

<pre class="math">
105 / 2 = quotient 52, remainder 1

binary = 1

---

52 / 2 = quotient 26, remainder 0

binary = 01

---

26 / 2 = quotient 13, remainder 0

binary = 001

---

13 / 2 = quotient 6, remainder 1

binary = 1001

---

6 / 2 = quotient 3, remainder 0

binary = 01001

---

3 / 2 = quotient 1, remainder 1

binary = 101001

---

Since the quotient is <= 1, we record it as the last of the conversion.

binary = 1101001

Optionally, left pad with zeroes.

binary = 01101001
</pre>

So, decimal 105 is binary 01101001.

Easy peasy.

### Binary to Decimal

Converting from binary to decimal is quite straightforward, as well.

Here is a quick table showing the powers of 2 for 16 bits (2 bytes):

|**Power of 2** |**Decimal** |
|:---|:---|
|2<sup>0</sup> |1 |
|2<sup>1</sup> |2 |
|2<sup>2</sup> |4 |
|2<sup>3</sup> |8 |
|2<sup>4</sup> |16 |
|2<sup>5</sup> |32 |
|2<sup>6</sup> |64 |
|2<sup>7</sup> |128 |
|2<sup>8</sup> |256 |
|2<sup>9</sup> |512 |
|2<sup>10</sup> |1024 |
|2<sup>11</sup> |2048 |
|2<sup>12</sup> |4096 |
|2<sup>13</sup> |8192 |
|2<sup>14</sup> |16,384 |
|2<sup>15</sup> |32,768 |
|2<sup>16</sup> |65,536 |

The conversion begins from left to right, and everywhere there is a 1 it's value is looked up in the table and noted.  Then, all of the number are added together to get the final result, in decimal.

Let's convert the above binary number 01101001 back to decimal:

<pre class="math">
01101001

Remove all of the left padded zeroes.

---

1101001

Look up the decimal value for 2<sup>6</sup>,
since the left-hand number is a 1 and it's in the sixth position (zero-based):

decimal = 64

---

101001

Look up the decimal value for 2<sup>5</sup>,
since the left-hand number is a 1 and it's in the fifth position:

decimal = 64 + 32

---

The next number is a 0, so remove it and continue.

01001

---

1001

Look up the decimal value for 2<sup>3</sup>,
since the left-hand number is a 1 and it's in the third position:

decimal = 64 + 32 + 8

---

The next number is a 0, so remove it and continue.

001

---

The next number is a 0, so remove it and continue.

01

---

1

Look up the decimal value for 2<sup>0</sup>,
since the left-hand number is a 1 and it's in the zeroth position:

decimal = 64 + 32 + 8 + 1
</pre>

Binary 01101001 is decimal 105.

## Netmask

A [netmask] is used to determine what part, i.e., how many bits, of the `IP` address is the network address.  The rest of the address is for the hosts.

In the bad old days, netmasks were straightforward.  You basically just had three masks: 8 bits, 16 bits and 24 bits.  These represented the A, B and C classes, respectively:

- `Class A`
    + `255.0.0.0`
    + `255.0.0.0/8`
- `Class B`
    + `255.255.0.0`
    + `255.255.0.0/16`
- `Class C`
    + `255.255.255.0`
    + `255.255.255.0/24`

The examples above are using `CIDR` notation, where the `IP` address is followed by a forward slash (`/`) and the number of network bits that make up the netmask.  And, just like an `IP` address, a netmask is 32 bits long (well, for `v4`).

Things get much more complicated with the introduction of [`CIDR`] and [classless] networks.

## `CIDR`

Classless Inter-Domain Routing, or [`CIDR`], doesn't conform to the classful networking model.  In fact, it was conceived to address the rapid [`IPv4` address exhaustion] and to slow the growth of Internet [routing tables].

`CIDR` notation allows for variable-length subnet masking ([`VLSM`]) as opposed to the strict 8-bit groupings of the classful network subnet masks.

Here is an example:

```
192.168.6.0/27
```

The network mask, or prefix, is 27 bits in length, and so the host portion is 5 bits.  This allows a system administrator to create a smaller private network where the 254 machines of a legacy Class C network aren't warranted and needed.  In other words, it would simply be too big for the needs of a network that small.

> The `IP` address in the `CIDR` notation above is the network address (because the last dotted quad is 0).

So, how do you determine the network address and the broadcast address from a random `IP`, like `112.56.3.78/10`?  Good question.  At first glimpse, it seems like a non-intuitive task, but it gets easier to determine with practice.

( I'm not sure that you need to know how to do this for the exam, but regardless, it's something you should know how to do. )

Here's an example using [an amazing tool] to calculate the important addresses given an `IP` address in `CIDR` notation:

```
$ cidr 112.56.3.78/10
       IP address: 112.56.3.78
   Network prefix: 10 bits
      Subnet mask: 255.192.0.0
  Network address: 112.0.0.0
Broadcast address: 112.63.255.255
 Total # of hosts: 4194302
```

Determining the network and broadcast addresses use simple [bitwise operations].

### Determine Network Address

To determine the network address:
- `IP` address `AND` (`&`) netmask

For example:

<pre class="math">
112.56.3.78/10

Convert each octet of the IP address to binary:

01110000.00111000.00000011.01001110

Convert the netmask to binary:

11111111.11000000.00000000.00000000

Finally, bitwise AND (&) them:

01110000.00111000.00000011.01001110
11111111.11000000.00000000.00000000
-----------------------------------
01110000.00000000.00000000.00000000

Network address = 112.0.0.0
</pre>

### Determine Broadcast Address

To determine the broadcast address:
- `IP` address `OR` (`|`) the inverse of netmask

For example:

<pre class="math">
112.56.3.78/10

Convert each octet of the IP address to binary:

01110000.00111000.00000011.01001110

Convert the netmask to binary:

11111111.11000000.00000000.00000000

Invert it.  Another way to do it is simply convert the host bits to ones.
Due to the properties of bitwise `OR`, the result will be the same:

00000000.00111111.11111111.11111111

Finally, bitwise OR (|) them:

01110000.00111000.00000011.01001110
00000000.00111111.11111111.11111111
-----------------------------------
01110000.00111111.11111111.11111111

Broadcast address = 112.63.255.255
</pre>

### Calculate Total Number of Hosts

<pre class="math">
4,194,302 = 2<sup>(32-10)</sup>-2
</pre>

> How is that, now?
>
> Well, since the length of an `IPv4` address is 32 bits, we subtract the network prefix from the total.  This is what is then raised as the exponent.
>
> Finally, we need to adjust the total for the network and broadcast addresses, which is why two is subtracted before returning the total.

Weeeeeeeeeeeeeeeeeeeeeeeeee

## Default Route

Two nodes (machines) that are on two different networks cannot talk to each other without the aid of a router.  This router, often called a gateway (i.e., a gateway between two networks), is aware of both networks as it is configured with an `IP` address from both networks, and it knows how to route traffic between them.

For example, let's assume that there are two Class C subnets:

- Network 1
    + 192.168.10.0/24
- Network 2
    + 192.168.200.0/24

Now, the machine with `IP` address `192.168.10.20` clearly cannot send a packet directly to the machine with `IP` address `192.168.200.100` as they are not on the same logical network/subnet.

However, a router that has two interfaces, one configured with the `IP` address `192.168.10.1` and the other with `IP` address `192.168.200.1`, can act as the intermediary and can facilitate the communication between these two nodes on separate and distinct subnetworks.

They key to establishing the communication is to configure the default route for each machine on each network.  This default route indicates the `IP` address to which all packets which are not addressed to the host's local network should be sent.

In the example above, the default route for machines on the `192.168.10.0/24` network will be the `IP` address `192.168.10.1`, which is the router/gateway `IP` address, while the default route for machines on the `192.168.200.0/24` network will be `192.168.200.1`.

To view all routes on a machine:

```
$ ip route
```

or

```
$ sudo route
```

## Ports

The port number is a 16 bit field, which yields a total number of 65,535 possible ports.  Of these, the first 1023 are known as privileged ports, and only root or another privileged user can start services on any of them.

The rest (1024 - 65,535), at least according to `LPI`, are known as non-privileged or socket ports, and they are used as the source port for a socket connection.

Many of the privileged ports have been standardized by the IANA (Internet Assigned Numbers Authority).  For example:

|**Port** |**Service** |
|:---|:---|
|20 |FTP (data) |
|20 |FTP (control) |
|22  |SSH |
|23  |Telnet |
|25  |SMTP |
|53  |DNS |
|80  |HTTP |
|110 |POP3 |
|123 |NTP  |
|139 |Netbios |
|143 |IMAP |
|161 |SNMP |
|162 |SNMPTRAP, SNMP Notifications |
|389 |LDAP |
|443 |HTTPS |
|465 |SMTPS |
|514 |RSH |
|636 |LDAPS |
|993 |IMAPS |
|995 |POP3S |

You can view all of the standard ports in [`/etc/services`].

## Protocols

### `TCP`

- layer 4 (transport layer)
- connection-oriented

### `UDP`

- layer 4 (transport layer)
- connectionless

### `ICMP`

- layer 3 (network layer)
- main function is to analyze and control network elements
    + traffic volume control
    + detection of unreachable destinations
    + route redirection
    + checking the status of remote hosts

### `IPv6`


Here is an example for those of you that are never satisfied:

```
2001:0db8:85a3:08d3:1319:8a2e:0370:7344
```

Everybody makes a big deal about how you can shorten `IPv6` addresses if a grouping includes all zeroes.  Here goes:

This:

`2001:0db8:85a3:0000:0000:0000:0000:7344`

Can be reduced to:

`2001:0db8:85a3::7344`

Note that that particular shorthand can only be done once in an address.  Here is another example:

<pre class="math">
2001:0db8:85a3:0000:0000:1319:0000:7344

2001:0db8:85a3:0:0:1319:0:7344

2001:0db8:85a3::1319:0:7344
</pre>

The fourth and fifth groupings can be reduced to `::`, but the seventh can only be reduced to a single zero.

> If there are non-contiguous zero groupings, they cannot all be reduced using the aformentioned shorthand.

There are three different types of `IPv6` addresses:

- `unicast`
    + send to a single interface
- `multicast`
    + send to multiple interfaces as a group or set (but not to every interface like `broadcast`, which does not exist in `IPv6`)
- `anycast`
    + like `multicast` only in the sense that it identifies a set or group to send to, but unlike `multicast`, it only sends to *one* interface

TODO differences with v4

## Network Interfaces

Let's look at the [`iproute2`] collection of utilities for controlling `TCP/IP` networking and traffic control.

### Listing

```
$ ip link show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: enp0s31f6: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc pfifo_fast state DOWN mode DEFAULT group default qlen 1000
    link/ether e8:6a:64:63:90:6f brd ff:ff:ff:ff:ff:ff
3: wlp3s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DORMANT group default qlen 1000
    link/ether a0:a4:c5:5f:f3:de brd ff:ff:ff:ff:ff:ff
$ ip -brief link show
lo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP>
enp0s31f6        DOWN           e8:6a:64:63:90:6f <NO-CARRIER,BROADCAST,MULTICAST,UP>
wlp3s0           UP             a0:a4:c5:5f:f3:de <BROADCAST,MULTICAST,UP,LOWER_UP>
```

You can also list using [`nmcli`], the command-line tool for controlling [`NetworkManager`].

```
$ nmcli device
DEVICE          TYPE      STATE         CONNECTION
wlp3s0          wifi      connected     derpy
p2p-dev-wlp3s0  wifi-p2p  disconnected  --
enp0s31f6       ethernet  unavailable   --
lo              loopback  unmanaged     --
```

### Naming

In the bad older days before 2009, the Linux kernel would name the interfaces simply in the order that they were detected. The devices were named using an `ethX` naming scheme (for `Ethernet`), so the first was named `eth0`, the second `eth1`, and so on.

To solve this terrible problem, a [predictable network interface naming scheme] was developed to reliably map an interface's name to its physical location on the machine.  For machines that use [`systemd`], by default it follows a policy to name the devices using one of [five different schemes]:

1. name the interface after the index provided by the `BIOS` or by the firmware of embedded devices, e.g. `eno1`
1. name the interface after the PCI express slot index, as given by the BIOS or firmware, e.g. `ens1`
1. name the interface after its address at the corresponding bus, e.g. `enp3s5`
1. name the interface after the interface's `MAC` address, e.g. `enx78e7d1ea46da`
1. name the interface using the legacy convention, e.g. `eth0`

> However, if [`biosdevname`] is installed and enabled (i.e., passed as a kernel command-line parameter -- `biosdevname=1`), it will use that as the naming scheme.

For those machines using a predictable naming scheme, the different types will be identified by a two-character prefix at the start of the name:

|**Prefix** |**Interface Type** |
|:---|:---|
|en |`Ethernet` |
|ib|`InfiniBand` |
|sl|Serial line IP (slip) |
|wl|Wireless local area network (WLAN) |
|ww|Wireless wide area network (WWAN) |

You can use some of our old friends to see the provenance of the interface's name.  For instance, the wireless interface on my machine is named `wlp3s0`:

```
$ ip -brief address show wlp3s0
wlp3s0           UP             192.168.1.96/24 192.168.1.102/24 fe80::8807:e415:225:e49d/64
```

```
$ lspci | ag wireless
03:00.0 Network controller: Intel Corporation Wireless 8265 / 8275 (rev 78)
```

Note the record in the first column, `03:00.0`.  This is known as the `slot` tag, and it defines the bus (8 bits), device (5 bits) and function (3 bits) of the interface in the following format (known as [BDF notation]):

`bus:device.function`

So, we can see here that the name is an amalgamation of the two character prefix followed by the slot tag.

> Just for fun, here's a command that shows verbose information about my wireless card (note that the domain number is not needed, as BDF is sufficient to identify a `PCI` device uniquely):
>
> <pre>
> $ sudo lspci -vDnns 03:00.0
> <span style="color: blue;">0000</span>:03:00.0 Network controller [<span style="color: red;">0280</span>]: Intel Corporation Wireless 8265 / 8275 [<span style="color: tan;">8086</span>:<span style="color: green;">24fd</span>] (rev 78)
>         Subsystem: Intel Corporation Dual Band Wireless-AC 8265 [8086:0010]
>         Flags: bus master, fast devsel, latency 0, IRQ 162, IOMMU group 12
>         Memory at e9100000 (64-bit, non-prefetchable) [size=8K]
>         Capabilities: [c8] Power Management version 3
>         Capabilities: [d0] MSI: Enable+ Count=1/1 Maskable- 64bit+
>         Capabilities: [40] Express Endpoint, MSI 00
>         Capabilities: [100] Advanced Error Reporting
>         Capabilities: [140] Device Serial Number a0-a4-c5-ff-ff-5f-f3-de
>         Capabilities: [14c] Latency Tolerance Reporting
>         Capabilities: [154] L1 PM Substates
>         Kernel driver in use: iwlwifi
>         Kernel modules: iwlwifi
> </pre>
> |**Option** |**Output** |
> |:---|:---|
> |v |verbose |
> |D |show PCI domain number (in <span style="color: blue;">blue</span>) |
> |nn |show PCI vendor and device codes as both numbers and names <br />- class code in <span style="color: red;">red</span><br />- vendor ID in <span style="color: tan;">tan</span><br />- device ID in <span style="color: green;">green</span>|
> |s |specify device by `BDF` |
>
> Here's the same information with the device's [`PCI` configuration space] shown in hex:
>
> <pre>
> $ lspci -vDnnxs 03:00.0
> 0000:03:00.0 Network controller [0280]: Intel Corporation Wireless 8265 / 8275 [8086:24fd] (rev 78)
>         Subsystem: Intel Corporation Dual Band Wireless-AC 8265 [8086:0010]
>         Flags: bus master, fast devsel, latency 0, IRQ 162, IOMMU group 12
>         Memory at e9100000 (64-bit, non-prefetchable) [size=8K]
>         Capabilities: <access denied>
>         Kernel driver in use: iwlwifi
>         Kernel modules: iwlwifi
> 00: <span style="color: tan;">86 80</span> <span style="color: green;">fd 24</span> 06 04 10 00 78 00 <span style="color: red;">80 02</span> 00 00 00 00
> 10: 04 00 10 e9 00 00 00 00 00 00 00 00 00 00 00 00
> 20: 00 00 00 00 00 00 00 00 00 00 00 00 86 80 10 00
> 30: 00 00 00 00 c8 00 00 00 00 00 00 00 ff 01 00 00
> </pre>
>
> You can see the locations for the vendor ID (<span style="color: tan;">tan</span>), device ID (<span style="color: green;">green</span>) and class code (<span style="color: red;">red</span>).  The bytes appear to be backwards, but they are in [little endian] order, as this machine uses an Intel chipset.

### Managing

> Some of the utilities discussed in this section are in the [`net-tools`] package and have been obsoleted by the `iproute2` collection of tools.

The [`ifup`] and [`ifdown`] utilities work on interfaces defined in the [`/etc/network/interfaces`] configuration file (Debian and its derivatives).

> Other distributions may have the configuration file(s) in `/etc/sysconfig/network-scripts/`.  Unfortunately, this is what happens when tools like `ifup` and `ifdown`, et al., are not standardized.


Here's a sample `/etc/network/interfaces` file:

<pre class="math">
auto lo
iface lo inet loopback

auto enp3s5
iface enp3s5 inet dhcp

iface enp0s31f6 inet static
    address 192.168.1.2/24
    gateway 192.168.1.1
</pre>

TODO talk about what the config files are doing

## `hostname`

There are some rules when it comes to choosing a hostname.  For instance, it can only contain the following 7-bit characters:

`[a-zA-Z0-9-]`

In addition, it must begin with an alphabetic character and end with an alphanumeric character.

It can be up to 64 characters in length.

### Setting

You can read out the contents of [`/etc/hostname`] to get the current setting of your hostname.

In addition, for machines using `systemd`, the [`hostnamectl`] command can be used to control the hostname.

To see the current hostname and other settings, simply invoke `hostnamectl`.  You can add the `status` command, however, it's not necessary since it's the default:

```
$ hostnamectl
   Static hostname: kilgore-trout
         Icon name: computer-laptop
           Chassis: laptop
        Machine ID: z7a35d666y154d2112azzcyc3ad3d74z
           Boot ID: 2842e4921a664dbb9e9c6e802899c377
  Operating System: Debian GNU/Linux 11 (bullseye)
            Kernel: Linux 5.10.0-21-amd64
      Architecture: x86-64
```

Note that the `Machine ID` is the [`dbus`] ID which can be read from `/etc/machine-id`.  On some systems, this may be symlinked to `/var/lib/dbus/machine-id`.

Now, to change the hostname to something more appropriate, like `poop`, issue the following command:

```
$ hostnamectl set-hostname poop
```

And, the hostname is automatically updated in `/etc/hostname`.

But, wait, there's more!  `hostnamectl` can also set two other types of hostnames!  That's right, there are three types of hostnames defined on a system.  Will wonders never cease?

First, the one that we've just set is known as the `static` hostname, and it is used to initialize the system's hostname at boot time (note, don't confuse this with [diaper time]).

Second, the `pretty` hostname allows for special characters and can be used to set a more descriptive name than the `static` hostname:

```
$ hostnamectl --pretty set-hostname "Kilgore Trout"
$ hostnamectl
   Static hostname: kilgore-trout
   Pretty hostname: Kilgore Trout
         Icon name: computer-laptop
           Chassis: laptop
        Machine ID: e7a35d989b154d1686aeecbc3ad3d74e
           Boot ID: 2842e4921a664dbb9e9c6e802899c377
  Operating System: Debian GNU/Linux 11 (bullseye)
            Kernel: Linux 5.10.0-21-amd64
      Architecture: x86-64
```

Third, there is a `transient` hostname that is only used when the `static` hostname is not set or when it is the default `localhost` name.

> Note that if none of the three hostname types are specified when setting the hostname, it will default to `static` and use that name for all the types.  To only set the `static` hostname, but not the other two, use the `--static`.
>
> In all cases, only the static hostname is stored in the `/etc/hostname` file.

### Lookups

The machine (and applications) can map hostnames to `IP` addresses using two different methods: a file database and a `DNS` resolver.

We can determine the order in which the machine will do the mapping.  For instance, does it first consult the file and then the resolver?  Or, vice-versa?

To find the answer to that riddle, we'll crack open the [`/etc/nsswitch.conf`] file.

> You may recall this particular file from [a previous lesson], and you'd be right!

To [quote the man page]:

<cite>The Name Service Switch (`NSS`) configuration file, `/etc/nsswitch.conf`, is used by the GNU C Library and certain other applications to determine the sources from which to obtain name-service information in a range of categories, and in what order.  Each category of information is identified by a name database.</cite>

Let's grep for the `hosts` name database:

```
$ ag --nonumbers hosts /etc/nsswitch.conf
hosts:          files mdns4_minimal [NOTFOUND=return] dns myhostname mymachines
```

And there we have it: first `files` is searched and then afterwards `dns`.

### `/etc/hosts`

The [`/etc/hosts`] database file is what is searched when the "files" source is specified for a database name entry in `/etc/nsswitch.conf`.  You can see this for yourself, and the other files that are read when other databases have the "files" source in their line entry by taking a gander at the [`FILES` section of the man page].

In general, the entries of the `hosts` database are retrieved in two common ways:

```
$ cat /etc/hosts
127.0.0.1       localhost
127.0.1.1       kilgore-trout.benjamintoll.com  kilgore-trout

167.114.97.28   onf

# The following lines are desirable for IPv6 capable hosts
::1     localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
```

When the [`getent`] tool is used, it will get entries from `Name Service Switch` libraries according to the particular database provided as an argument.  For our purposes, it uses several different library calls to enumerate the `hosts` database (`/etc/hosts`).

```
$ getent hosts
127.0.0.1       localhost
127.0.1.1       kilgore-trout.benjamintoll.com kilgore-trout
167.114.97.28   onf
127.0.0.1       localhost ip6-localhost ip6-loopback
```

If the hostname isn't able to be resolved using this simple mapping, the kernel will then try the resolver (i.e., specified by the "dns" entry in `/etc/nsswitch.conf`).

### `/etc/resolv.conf`

The `dns` name database that is listed after `files` will have the kernel ask the resolver to query up to three nameservers defined in its configuration file, [`/etc/resolv.conf`]:

```
$ cat /etc/resolv.conf
# Generated by NetworkManager
search home
nameserver 192.168.1.1
```

Note that the `nameserver` has specified my gateway router as the machine to resolve `DNS` queries.  Depending on the machine and the software, you may see `127.0.0.53` as the `nameserver`.  This signifies that the machine is using [`systemd-resolved`](#systemd-resolved) as its resolver, and that daemon will be listening on that address and then forward any requests to the `IP` address configured by `DHCP`.

At this point, the remote names that are being queried are [domain names], **not** hostnames.

> If no nameservers are defined, the default behavior is to use the nameserver on the local machine.

## `NetworkManager`

[`NetworkManager`] is a daemon that sits on top of [`udev`] and provides a high-level abstraction for the configuration of the network interfaces identified by the machine.

For example, when using [`DHCP`], it will handle the use the host information received from the server to configure the adapter.  Also, it will always try to ensure that at least one connection is active at all times, if possible, prioritizing wired over wireless.

The daemon runs in the background with root privileges.  It uses `dbus`, so users will use a client application to configure their network interfaces, and this client application will interact with the daemon.

If you have manually configured your interfaces in `/etc/network/interfaces`, `NetworkManager` will not manage these.  This is nice, as it will stay out of your way and not try to control every single thing.

There are two command-line tools, [`nmcli`] and [`nmtui`] that are client tools to manage `NetworkManager`.  The exam focuses on the former.

> `nmtui` is a [`TUI`] (text user interface) and is [`curses`]-based.  Check it out.

|**Object** |**Description** |
|:---|:---|
|general |NetworkManager’s general status and operations. |
|networking |Overall networking control. |
|radio |NetworkManager radio switches. |
|connection |NetworkManager’s connections. |
|device |Devices managed by NetworkManager. |
|agent |NetworkManager secret agent or polkit agent. |
|monitor |Monitor NetworkManager changes. |

```
$ nmcli general status
STATE      CONNECTIVITY  WIFI-HW  WIFI     WWAN-HW  WWAN
connected  full          enabled  enabled  enabled  enabled
```

```
$ nmcli dev wifi list
IN-USE  BSSID              SSID                 MODE   CHAN  RATE        SIGNAL  BARS  SECURITY
        E8:AD:A6:5D:8B:EE  MySpectrumWiFie8-2G  Infra  11    195 Mbit/s  72      ▂▄▆_  WPA2
*       E8:AD:A6:5D:8B:EF  MySpectrumWiFie8-5G  Infra  149   540 Mbit/s  60      ▂▄▆_  WPA2
        00:CB:51:4E:CD:1E  MySpectrumWiFi18-2G  Infra  1     195 Mbit/s  29      ▂___  WPA2
```

To connect to an interface with a password but not have it appear in the `bash` history (or anywhere visible on the screen), read it from a file:

```
$ nmcli device wifi connect MySpectrumWiFie8-2G password $(< derpy.pwd)
Device 'wlp3s0' successfully activated with '0ce367ad-7e16-4d9d-a20d-08f6a3b91fde'.
```

```
$ nmcli connection show
NAME                 UUID                                  TYPE      DEVICE
MySpectrumWiFie8-2G  0ce367ad-7e16-4d9d-a20d-08f6a3b91fde  wifi      wlp3s0
MySpectrumWiFie8-5G  22318b3c-63fd-4724-a756-72db97988338  wifi      --
Proton VPN CH-UK#1   64e9efeb-57c8-4071-acce-c385e1ef51c0  vpn       --
Wired connection 1   c44c8e71-6b35-4a41-a6a8-0a6c32275343  ethernet  --
```

> According to the `LPI` docs, the following command should have prompted me for a password when in a terminal emulator, but it did not:
>
> ```
> $ nmcli device wifi connect MySpectrumWiFie8-2G
> ```

Connect to a hidden network (the `SSID` name is hidden):

```
$ nmcli device wifi connect Derpy password MyPassword hidden yes
```

If the host has more than one network interface, you can specify the adapter to use when connecting with the `ifname` parameter:

```
$ nmcli device wifi connect Derpy password MyPassword ifname wlo1
```

Where the legacy `ifdown` command was previously used to bring down a network adapter, `nmcli` is preferred:

```
$ nmcli connection down Derpy
```

Legacy:

```
$ sudo ifdown Derpy
```

> The `UUID` will change every time the connection is brought back up, so it's better to rely on the `SSID` name for consistency when referring to the connection.

You can also turn off a wireless adapter to save power.  Use the `radio` object for this action:

```
$ nmcli radio wifi off
```

After a connection is established, it is saved and `NetworkManager` will automatically connect to it in the future.

## `systemd-networkd`

Of course, `systemd` has daemons that can manage not only network interfaces through the [`systemd-networkd`] daemon, but it can also use [`systemd-resolved`] to manage local name resolution.

To setup network interfaces, you can add configuration files to any of the following locations.  Use the `.network` extension.  Note that they are listed in the order of priority:

- `/etc/systemd/network`
    + The local administration network directory.
- `/run/systemd/network`
    + The volatile runtime network directory.
- `/lib/systemd/network`
    + The system network directory.

Like a lot of directories in Linux that store configuration information, the files are processed in lexigraphic order so it is recommended that each one is prefaced with a number.  Note that identically-named files will replace each other.

If you want to make changes to an already-defined file, add it to a location with a higher-priority rather than changing the installed file.  Or, add a "drop-in" directory, as [the man page calls it], (for example, `foo.network.d/`) and add files with the suffix `.conf`.  These will be merged in lexigraphic order and parsed after the main file has been parsed, again saving you from having to edit the main file.

> Drop-in `.d/` directories can also be placed in the main locations listed above, and they take the same priority as the main directories they are within.

There are also configuration files with a `.netdev` suffix (for virtual network devices, such as `bridge` and `tun`) and `.link` (for low-level settings for the corresponding network interface).

Here's what one of the files on my system looks like:

```
$ cat /lib/systemd/network/80-wifi-adhoc.network
[Match]
Type=wifi
WLANInterfaceType=ad-hoc

[Network]
LinkLocalAddressing=yes
```

The `[Match]` section defines the type of interface to which the configuration file refers.  There is also a `Name=` entry that can be used to reference a specific interface or many with shell-style globs, and there is a `MACAddress=` entry.

Here are two files that could be used to define interfaces using a statically-provided `IP` address and gateway and one that uses `DHCP`:

```
[Match]
MACAddress=00:16:3e:8d:2b:5b

[Network]
Address=192.168.0.100/24
Gateway=192.168.0.1
```

```
[Match]
MACAddress=00:16:3e:8d:2b:5b

[Network]
DHCP=yes
```

> The `DHCP=` entry can also have the values `ipv4` and `ipv6`.

Note that it's possible, of course, to use `systemd` for wireless network interface configuration with a password, but it's somewhat convoluted, and I'm not going to cover it here.

Deal with it.

## `ip`

> There are so many options to the `ip` command, but the `LPIC` docs only cover a few.

The [`ip`] command is used to show and manipulate routing, network devices, interfaces and tunnels.

There are many subcommands to the new-ish `ip` command:

- [`ip-address`]
- [`ip-addrlabel`]
- [`ip-l2tp`]
- [`ip-link`]
- [`ip-maddress`]
- [`ip-monitor`]
- [`ip-mroute`]
- [`ip-neighbour`]
- [`ip-netns`]
- [`ip-ntable`]
- [`ip-route`]
- [`ip-rule`]
- [`ip-tcp_metrics`]
- [`ip-token`]
- [`ip-tunnel`]
- [`ip-xfrm`]

To get help about any subcommand, add the `help` verb:

```
$ ip address help
```

### `address`

The [`ip-address`] command is mostly used to list the local interfaces.

```
$ ip address
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: enp0s31f6: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc pfifo_fast state DOWN group default qlen 1000
    link/ether e8:6a:64:63:90:6f brd ff:ff:ff:ff:ff:ff
3: wlp3s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether a0:a4:c5:5f:f3:de brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.96/24 brd 192.168.1.255 scope global dynamic noprefixroute wlp3s0
       valid_lft 251452sec preferred_lft 251452sec
    inet6 fe80::f167:8747:fb33:88bc/64 scope link noprefixroute
       valid_lft forever preferred_lft forever
```

`addr` and `a` are shorthand synonyms for `address` (and the other subcommands have shorthands, too), but I'll always use the long form.

The older, legacy `ifconfig` command can list the same information.  But, if you're still using `ifconfig`, you're a terrible person.

> You can also list the contents of `/sys/class/net/`, if mounted:
>
> ```
> $ ls /sys/class/net/
> enp0s31f6  lo  wlp3s0
> ```

Configure an interface (same command for both IPv4 and IPv6):

```
$ sudo ip addr add 192.168.5.5/24 dev enp0s8
$ sudo ip addr add 2001:db8::10/64 dev enp0s8
```

Legacy method of configuring an interface with `ifconfig`:

```
$ sudo ifconfig eth2 192.168.50.50 netmask 255.255.255.0
$ sudo ifconfig eth2 192.168.50.50 netmask 0xffffff00
$ sudo ifconfig enp0s8 add 2001:db8::10/64
```

### `link`

The `ip-link` command is used to configure low level interface or protocol settings such as `VLAN`s, `ARP`, or `MTU`s or disabling an interface.

You can also use `ip-link` to list out the interfaces on the machine:

```
$ ip link
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000 link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: enp0s31f6: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc pfifo_fast state DOWN mode DEFAULT group default qlen 1000 link/ether e8:6a:64:63:90:6f brd ff:ff:ff:ff:ff:ff
3: wlp3s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DORMANT group default qlen 1000
    link/ether a0:a4:c5:5f:f3:de brd ff:ff:ff:ff:ff:ff
```

To bring an interface down and then back up:

```
$ sudo ip link set dev enp0s8 down
$ sudo ip link show dev enp0s8
3: enp0s8: <BROADCAST,MULTICAST> mtu 1500 qdisc pfifo_fast state DOWN mode DEFAULT group default qlen 1000
    link/ether 08:00:27:ab:11:3e brd ff:ff:ff:ff:ff:ff
$ sudo ip link set dev enp0s8 up
$ sudo ip link show dev enp0s8
3: enp0s8: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP mode DEFAULT group default qlen 1000
    link/ether 08:00:27:ab:11:3e brd ff:ff:ff:ff:ff:ff
```

Of course, the `ifconfig` analog is:

```
$ sudo ifconfig enp0s8 down
$ sudo ifconfig enp0s8 up
```

Adjust the [`MTU`]:

```
$ sudo ip link set enp0s8 mtu 2000
$ sudo ip link show dev enp0s3
2: enp0s3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 2000 qdisc pfifo_fast state UP mode DEFAULT group default qlen 1000
    link/ether 08:00:27:54:53:59 brd ff:ff:ff:ff:ff:ff
```

Using `ifconfig`:

```
$ sudo ifconfig enp0s3 mtu 1500
$ sudo ip link show dev enp0s3
2: enp0s3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP mode DEFAULT group default qlen 1000
    link/ether 08:00:27:54:53:59 brd ff:ff:ff:ff:ff:ff
```

## Routing Table

The following commands will all show the routing table:

- `route`
- `ip route`
- `netstat -r`

```
$ sudo route
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
default         RAC2V1S         0.0.0.0         UG    600    0        0 wlp3s0
link-local      0.0.0.0         255.255.0.0     U     1000   0        0 wlp3s0
192.168.1.0     0.0.0.0         255.255.255.0   U     600    0        0 wlp3s0
$
$ ip route
default via 192.168.1.1 dev wlp3s0 proto dhcp metric 600
169.254.0.0/16 dev wlp3s0 scope link metric 1000
192.168.1.0/24 dev wlp3s0 proto kernel scope link src 192.168.1.96 metric 600
$
$ netstat -r
Kernel IP routing table
Destination     Gateway         Genmask         Flags   MSS Window  irtt Iface
default         RAC2V1S         0.0.0.0         UG        0 0          0 wlp3s0
link-local      0.0.0.0         255.255.0.0     U         0 0          0 wlp3s0
192.168.1.0     0.0.0.0         255.255.255.0   U         0 0          0 wlp3s0
```

Here is how to interpret the `Flags` column:

|**Value** |**Meaning** |
|:---|:---|
|U |route is up |
|G |gateway |
|! |reject the route, it won't be used |
|n |route hasn't been cached |

Other columns:

|**Column** |**Meaning** |
|:---|:---|
|`Met`, `Metric` |the administrative distance to the target (isn't used by the kernel), used by routing protocols to determine dynamic routes |
|`Ref` |reference count, the number of uses of a route (isn't used by the kernel) |
|`Use` |number of lookups for a route |
|`MSS` |maximum segment size for `TCP` connections over that route |
|`Window` |default [`TCP` window size] |
|`irtt` |round trip time for packets on this route |

To view the same information for IPv6:

```
$ sudo route -6
Kernel IPv6 routing table
Destination                    Next Hop                   Flag Met Ref Use If
fe80::/64                      [::]                       U    600 1     0 wlp3s0
[::]/0                         [::]                       !n   -1  1     0 lo
kilgore-trout/128              [::]                       Un   0   3     0 wlp3s0
ff00::/8                       [::]                       U    256 10     0 wlp3s0
[::]/0                         [::]                       !n   -1  1     0 lo
$
$ ip -6 route
fe80::/64 dev wlp3s0 proto kernel metric 600 pref medium
$
$ netstat -6r
Kernel IPv6 routing table
Destination                    Next Hop                   Flag Met Ref Use If
fe80::/64                      [::]                       U    600 1     0 wlp3s0
[::]/0                         [::]                       !n   -1  1     0 lo
kilgore-trout/128              [::]                       Un   0   3     0 wlp3s0
ff00::/8                       [::]                       U    256 10     0 wlp3s0
[::]/0                         [::]                       !n   -1  1     0 lo
```

The output of `ip route` and `ip -6 route` reads as follows:

1. Destination.
1. Optional address followed by interface.
1. The routing protocol used to add the route.
1. The scope of the route. If this is omitted, it is global scope, or a gateway.
1. The route’s metric. This is used by dynamic routing protocols to determine the cost of the route. This isn’t used by most systems.
1. If it is an IPv6 route, the RFC4191 route preference.

For example (IPv4):

```
default via 10.0.2.2 dev enp0s3 proto dhcp metric 100
```

1. The destination is the default route.
1. The gateway address is 10.0.2.2 reachable through interface enp0s3.
1. It was added to the routing table by DHCP.
1. The scope was omitted, so it is global.
1. The route has a cost value of 100.
1. No IPv6 route preference.

## Managing Routes

Use `route` or `ip route` to manage routes.

For example, both can be used to add and remove a route:

```
$ sudo route -6 add 2001:db8:1::/64 gw 2001:db8::3
$ sudo route -6 del 2001:db8:1::/64 gw 2001:db8::3
$
$ sudo ip route add 2001:db8:1::/64 via 2001:db8::3
$ sudo ip route del 2001:db8:1::/64 via 2001:db8::3
```

## Testing Network Connections

### `ping`

The well-known [`ping`] and [`ping6`] utilities send an [`ICMP`] request to a destination `IP` address.  If the destination is reachable, it will send an `ICMP` echo reply message back to the sender with the same data that was sent to it (unless blocked by a firewall or router).

Unless you specify the `-c` count option, the sender will keep sending packets until it's stopped (`CTRL-C`).

How can you block `ping` requests?

```
$ sudo sysctl -ar "icmp_echo"
net.ipv4.icmp_echo_ignore_all = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
```

If the value of `icmp_echo_ignore_all` is 0, then it is **not** blocking the `ping` requests.

You can temporarily block them by using the [`sysctl`] command to modify kernel parameters at runtime:

```
$ sudo sh -c "echo 1 > /proc/sys/net/ipv4/icmp_echo_ignore_all"
```

To block it permanently, open the [`/etc/sysctl.conf`] file and add the following line:

```
net.ipv4.icmp_echo_ignore_all = 1
```

Then apply the changes:

```
$ sudo sysctl -p
```

> Of course, you can also block `ICMP` requests using [`iptables`], but I won't go into that here.

### `traceroute`

The [`traceroute`] and [`traceroute6`] programs can be used to show you the route a packet takes to get to its destination.

They do this by sending multiple packets to the destination, incrementing the [Time to live] (`TTL`) field of the [IP header] with each subsequent packet. Each router along the way will respond with a `TTL` exceeded `ICMP` message.

By default, `traceroute` will send three [`UDP`] packets

### `tracepath`

On Debian, the [`tracepath`] utility is part of the `iputils-tracepath` package, even though its man page says that it's part of the `iputils` package.

For IPv6, use [`tracepath6`].

As with `ping` and `traceroute`, any network device on the path may block its packets.

## `netcat`

The `netcat` implementation on my Debian bullseye system is [from the Nmap Project] and is a "much-improved reimplementation of the venerable `netcat`" and is called [`ncat`].  It can send or receive arbitrary data over a [`TCP`] or [`UDP`] network connection.

The `netcat` and `nc` binaries are simply symlinks to `ncat`:

```
$ readlink -f $(which netcat)
/usr/bin/ncat
$ readlink -f $(which nc)
/usr/bin/ncat
```

You can chat with a pal using `ncat`.  You can establish a connection that listens on port 3000 for incoming `TCP` requests:

```
$ ncat -l -p 3000
```

Then, you bestie across the country can connect to the port on their end:

```
$ ncat 192.168.1.96 3000
```

`ncat` is also great at creating a remote shell (this example uses `UDP` as the transport protocol):

```
$ ncat -u -e /bin/bash -l 3000
```

```
$ ncat 192.168.1.96 3000
uname -a
Linux kilgore-trout 5.10.0-21-amd64 #1 SMP Debian 5.10.162-1 (2023-01-21) x86_64 GNU/Linux
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## `netstat`

The [`netstat`] tool is used to view the status of your current listeners and connections.  It has mainly beenobsoleted and has been replaced by `ss`.  [From the man page]:

<cite>This  program is mostly obsolete.  Replacement for `netstat` is `ss`.  Replacement for `netstat -r` is `ip route`.  Replacement for `netstat -i` is `ip -s link`.  Replacement for `netstat -g` is `ip maddr`.</cite>

Here are some options common to both utilities:

|**Option** |**Description** |
|:---|:---|
|`-a`, `--all` |Shows all sockets. |
|`-l`, `--listening` |Shows listening sockets. |
|`-p`, `--program` |Shows the process associated with the connection. |
|`-n`, `--numeric` |Prevents name lookups for both ports and addresses. |
|`-t`, `--tcp` |Shows `TCP` connections. |
|`-u`, `--udp` |Shows `UDP` connections. |

Here is an example of its use with common switches:

```
$ sudo netstat -tulnp
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 127.0.0.1:631           0.0.0.0:*               LISTEN      1283/cupsd
tcp        0      0 127.0.0.1:5432          0.0.0.0:*               LISTEN      1343/postgres
tcp        0      0 127.0.0.1:25            0.0.0.0:*               LISTEN      4068/master
tcp        0      0 127.0.0.1:9050          0.0.0.0:*               LISTEN      1315/tor
tcp        0      0 0.0.0.0:8000            0.0.0.0:*               LISTEN      868/python
tcp        0      0 127.0.0.1:6379          0.0.0.0:*               LISTEN      1287/redis-server 1
udp        0      0 0.0.0.0:37058           0.0.0.0:*                           867/avahi-daemon: r
udp        0      0 0.0.0.0:5353            0.0.0.0:*                           867/avahi-daemon: r
udp        0      0 0.0.0.0:631             0.0.0.0:*                           1298/cups-browsed
udp6       0      0 :::5353                 :::*                                867/avahi-daemon: r
udp6       0      0 :::43303                :::*                                867/avahi-daemon: r
udp6       0      0 fe80::f167:8747:fb3:546 :::*                                877/NetworkManager
```

> The `Recv-Q` column is the number of packets a socket has received but not passed off to its program.  The `Send-Q` column is the number of packets a socket has sent that have not been acknowledged by the receiver.
>
> The rest of the columns are self explanatory.

## `ss`

Let's now briefly look at the [`ss`] tool, the replacement for `netstat`.

Here is an example of its use with common switches:

```
$ sudo ss -tulnp
Netid State  Recv-Q Send-Q                      Local Address:Port  Peer Address:PortProcess
udp   UNCONN 0      0                                 0.0.0.0:37058      0.0.0.0:*    users:(("avahi-daemon",pid=867,fd=14))
udp   UNCONN 0      0                                 0.0.0.0:5353       0.0.0.0:*    users:(("avahi-daemon",pid=867,fd=12))
udp   UNCONN 0      0                                 0.0.0.0:631        0.0.0.0:*    users:(("cups-browsed",pid=1298,fd=7))
udp   UNCONN 0      0                                    [::]:5353          [::]:*    users:(("avahi-daemon",pid=867,fd=13))
udp   UNCONN 0      0                                    [::]:43303         [::]:*    users:(("avahi-daemon",pid=867,fd=15))
udp   UNCONN 0      0      [fe80::f167:8747:fb33:88bc]%wlp3s0:546           [::]:*    users:(("NetworkManager",pid=877,fd=24))
tcp   LISTEN 0      128                             127.0.0.1:631        0.0.0.0:*    users:(("cupsd",pid=1283,fd=7))
tcp   LISTEN 0      244                             127.0.0.1:5432       0.0.0.0:*    users:(("postgres",pid=1343,fd=5))
tcp   LISTEN 0      100                             127.0.0.1:25         0.0.0.0:*    users:(("master",pid=4068,fd=13))
tcp   LISTEN 0      4096                            127.0.0.1:9050       0.0.0.0:*    users:(("tor",pid=1315,fd=6))
tcp   LISTEN 0      5                                 0.0.0.0:8000       0.0.0.0:*    users:(("python",pid=868,fd=3))
tcp   LISTEN 0      511                             127.0.0.1:6379       0.0.0.0:*    users:(("redis-server",pid=1287,fd=6))
```

## `systemd-resolved`

> Some of this information was covered in the [`systemd-networkd`](#systemd-networkd) section.

This software package may not be installed by default.  It does not provide a full fledged `DNS` server.

It listens on `127.0.0.53`, and you would (probably?) see it listed in `/etc/resolv.conf`.  `systemd-resolved` provides `DNS`, [`mDNS`] and [`LLMNR`].

Any `DNS` requests it receives are looked up by querying servers configured in `/etc/systemd/resolv.conf` or `/etc/resolv.conf`.  If you wish to use this, use `resolve` for the `hosts` name database in `/etc/nsswitch.conf`.

## Name Resolution

Name resolution isn't just for hostnames, it is also used for user and group names, port numbers and more.  I mean, who wants to remember `IP` address, `UID`s, `GID`s, etc.?  Nobody.

Having said all that, we're just going to take a look at hosname resolution below.

There are three [`DNS` record class values], but the one we'll look at is the `IN` record class (the Internet).  This is the record class that is mostly used.

The other two are:
- `CH`
    + the `Chaos` record class
    + refers to [`ChaosNet`], an obsoleted network technology no longer in use
- `HS`
    + the [`Hesiod`] record class
    + uses [`DNS`] functionality to provide access to name databases of information that change infrequently
    + serves to distribute information kept in the [`/etc/passwd`], [`/etc/group`], and [`/etc/printcap files`], et al

> You can see the record class value when using the [`dig`] utility.  Here, I'm limiting the response to only the `ANSWER` section:
>
> ```
> $ dig +noall +answer theowlsnest.farm
> theowlsnest.farm.       521     IN      A       167.114.97.28
> ```

How do utilities do any kind of name resolution?  They call functions in [`libc`] that will read our old friend the [`/etc/nsswitch.conf`] file to determine how to resolve a name.

Recall that each listed name database in the `/etc/nsswitch.conf` file could have several entries which determine the order and method of lookup.

> Here are some other mentions of `nsswitch.conf` in this series and other articles on `benjamintoll.com`:
>
> - [`hostname` - Lookups](#lookups)
> - [`getent` and `nsswitch.conf`](/2023/01/26/on-the-lpic-1-exam-102-administrative-tasks/#getent-and-nsswitchconf)
> - [Namespaces - User - `nswitch.conf`](/2022/12/14/on-unsharing-namespaces-part-two/#nsswitchconf)

The file is organized into columns.  The far left column is the type of name database.  The rest of the columns are the methods the resolution functions should use to lookup a name (such as [`gethostbyname`]).

The methods are followed by the functions from left to right.  Columns with `[]` are used to provide some limited conditional logic to the column immediately to the left of it.

Let's look at the listing for the `hosts` name database in `/etc/nsswitch.conf`:

```
hosts:          files mdns4_minimal [NOTFOUND=return] dns myhostname mymachines
```

You can test the entries in the `nsswitch.conf` file using several methods.  In particular, the following examples are verifying the `file`, `mdns4_minimal` and `dns` entries, respectively.

Using [`getent`]:

```
$ getent hosts localhost
::1             localhost ip6-localhost ip6-loopback
$ getent hosts kilgore-trout.local
127.0.1.1       kilgore-trout.local
$ getent hosts benjamintoll.com
167.114.97.28   benjamintoll.com
```

Using `python`:

```
$ echo -e "import socket\nprint(socket.gethostbyname('www.benjamintoll.com'))" | python
167.114.97.28
```

### `getent`

The [`getent`] utility is used to display entries from name service databases.  It can retrieve records from any source configurable by `/etc/nsswitch.conf`.

It allows you to see how real-world requests will resolve by specifying the `service` that should be used to resolve the name.  Experimenting with this allows you to set the order of the service entries for a particular name database in `nsswitch.conf`.

The `-s` or `--service` lets you override all databases with the specified service.  Here are some examples.

`hosts` name database:

```
$ getent -s files hosts kilgore-trout.local
127.0.1.1       kilgore-trout.local
$ getent -s dns hosts benjamintoll.com
167.114.97.28   benjamintoll.com
```

`protocols` name database:

```
$ getent -s files protocols udp
udp                   17 UDP
$ getent -s db protocols udp
```

`services` name database:

```
$ getent -s files services ssh
ssh                   22/tcp
$ getent -s db services ssh
```

### `host`

The [`host`] utility is a simple program for looking up DNS entries.  It is normally used to convert names to `IP` addresses and vice versa.

With no options, if host is given a name, it returns the A, AAAA, and MX record sets. If given an IPv4 or IPv6 address, it outputs the PTR record if one is available.

`name` is the domain name that is to be looked up.  It can also be a dotted-decimal IPv4 address or a colon-delimited IPv6 address, in which case [`host`] will by default perform a reverse lookup for that address.

`server` is an optional argument which is either the name or `IP` address of the name server that `host` should query instead of the server or servers listed in `/etc/resolv.conf`.

`nameserver` record type:

```
$ host -t NS benjamintoll.com
benjamintoll.com name server ns23.domaincontrol.com.
benjamintoll.com name server ns24.domaincontrol.com.
```

[`start of authority`] record type:

```
$ host -t SOA benjamintoll.com
benjamintoll.com has SOA record ns23.domaincontrol.com. dns.jomax.net. 2023013107 28800 7200 604800 600
```

[`mail exchange`] record type:

```
$ host -t MX benjamintoll.com
benjamintoll.com mail is handled by 10 mail.protonmail.ch.
benjamintoll.com mail is handled by 20 mailsec.protonmail.ch.
```

Query a nameserver other than the one specified in `resolv.conf`:

```
$ host benjamintoll.com 8.8.8.8
Using domain server:
Name: 8.8.8.8
Address: 8.8.8.8#53
Aliases:

benjamintoll.com has address 167.114.97.28
benjamintoll.com mail is handled by 20 mailsec.protonmail.ch.
benjamintoll.com mail is handled by 10 mail.protonmail.ch.
```

### `dig`

The [`dig`] tool queries for [`A` records] by default.

```
$ dig theowlsnest.farm

; <<>> DiG 9.16.37-Debian <<>> theowlsnest.farm
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 53552
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 512
;; QUESTION SECTION:
;theowlsnest.farm.              IN      A

;; ANSWER SECTION:
theowlsnest.farm.       600     IN      A       167.114.97.28

;; Query time: 16 msec
;; SERVER: 192.168.1.1#53(192.168.1.1)
;; WHEN: Mon May 15 23:32:00 EDT 2023
;; MSG SIZE  rcvd: 61

```

Let's look again at just the `ANSWER` section:

```
$ dig +noall +answer benjamintoll.com
benjamintoll.com.       377     IN      A       167.114.97.28
```
Here we can see that the domain `benjamintoll.com` points to the `167.114.97.28` `IP` address, and that the `DNS` record class is `IN` (Internet).  The second column is [the `TTL` in seconds] that controls how long each record is valid and how long it takes for record updates to reach end users.

Also, like the `host` utility, you can specify a record type with the `-t` option:

```
$ dig -t SOA benjamintoll.com

; <<>> DiG 9.16.37-Debian <<>> -t SOA benjamintoll.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 43856
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 512
;; QUESTION SECTION:
;benjamintoll.com.              IN      SOA

;; ANSWER SECTION:
benjamintoll.com.       600     IN      SOA     ns23.domaincontrol.com. dns.jomax.net. 2023013107 28800 7200 604800 600

;; Query time: 36 msec
;; SERVER: 192.168.1.1#53(192.168.1.1)
;; WHEN: Mon May 15 23:42:32 EDT 2023
;; MSG SIZE  rcvd: 113

```

Suppress all of the information but the result with the `+short` option:

```
$ dig -t SOA +short benjamintoll.com
ns23.domaincontrol.com. dns.jomax.net. 2023013107 28800 7200 604800 600
```

> There are a ton of other sweet, sweet options.  See the man page for more information.

# Summary

Continue your journey with the sixth and last installment in this titillating series, [On the LPIC-1 Exam 102: Security](/2023/02/06/on-the-lpic-1-exam-102-security/).

# References

- [LPIC-1 Objectives V5.0](https://wiki.lpi.org/wiki/LPIC-1_Objectives_V5.0#Objectives:_Exam_102)
- [LPIC-1 Learning Materials](https://learning.lpi.org/en/learning-materials/102-500/)
- [`asbits`](https://github.com/btoll/tools/tree/master/c/asbits)
- [Consistent Network Device Naming Using biosdevname](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/networking_guide/sec-consistent_network_device_naming_using_biosdevname)
- [Interpreting the output of lspci](https://diego.assencio.com/?index=649b7a71b35fc7ad41e03b6d0e825f07)
- [IPROUTE2 Utility Suite Howto](http://www.policyrouting.org/iproute2.doc.html)
- [`NetworkManager` Documentation](https://networkmanager.dev/docs/)

[LPIC-1]: https://www.lpi.org/our-certifications/lpic-1-overview
[Topic 109: Networking Fundamentals]: https://learning.lpi.org/en/learning-materials/102-500/109/
[LPIC-1 Exam 102]: https://www.lpi.org/our-certifications/exam-102-objectives
[classes]: /2021/04/18/on-classful-networks/
[netmask]: https://nl.wikipedia.org/wiki/Netmask
[`CIDR`]: https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing
[classless]: /2021/04/24/on-classless-networks/
[`IPv4` address exhaustion]: https://en.wikipedia.org/wiki/IPv4_address_exhaustion
[routing tables]: https://en.wikipedia.org/wiki/Routing_table
[an amazing tool]: https://github.com/btoll/cidr
[bitwise operations]: https://en.wikipedia.org/wiki/Bitwise_operation
[`/etc/services`]: https://man7.org/linux/man-pages/man5/services.5.html
[`iproute2`]: https://wiki.linuxfoundation.org/networking/iproute2
[`nmcli`]: https://linux.die.net/man/1/nmcli
[`NetworkManager`]: https://networkmanager.dev/
[predictable network interface naming scheme]: https://www.freedesktop.org/wiki/Software/systemd/PredictableNetworkInterfaceNames/
[`systemd`]: https://man7.org/linux/man-pages/man1/init.1.html
[five different schemes]: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/networking_guide/ch-consistent_network_device_naming
[`biosdevname`]: https://linux.die.net/man/1/biosdevname
[BDF notation]: https://wiki.xenproject.org/wiki/Bus:Device.Function_(BDF)_Notation
[`PCI` configuration space]: https://en.wikipedia.org/wiki/PCI_configuration_space
[little endian]: https://en.wikipedia.org/wiki/Endianness
[`net-tools`]: https://wiki.linuxfoundation.org/networking/net-tools
[`ifup`]: https://manpages.debian.org/bullseye/ifupdown/ifup.8.en.html
[`ifdown`]: https://manpages.debian.org/bullseye/ifupdown/ifup.8.en.html
[`/etc/network/interfaces`]: https://manpages.debian.org/bullseye/ifupdown/interfaces.5.en.html
[`/etc/hostname`]: https://man7.org/linux/man-pages/man5/hostname.5.html
[`hostnamectl`]: https://man7.org/linux/man-pages/man1/hostnamectl.1.html
[`/etc/machine-id`]: https://man7.org/linux/man-pages/man5/machine-id.5.html
[`dbus`]: https://en.wikipedia.org/wiki/D-Bus
[diaper time]: https://itsalwayssunny.fandom.com/wiki/Public_Access_TV
[`/etc/nsswitch.conf`]: https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html
[a previous lesson]: /2023/01/26/on-the-lpic-1-exam-102-administrative-tasks/#getent-and-nsswitchconf
[quote the man page]: https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html#DESCRIPTION
[`FILES` section of the man page]: https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html#FILES
[`getent`]: https://man7.org/linux/man-pages/man1/getent.1.html
[`/etc/resolv.conf`]: https://www.man7.org/linux/man-pages/man5/resolver.5.html
[domain names]: https://en.wikipedia.org/wiki/Domain_name
[`NetworkManager`]: https://en.wikipedia.org/wiki/NetworkManager
[`udev`]: https://en.wikipedia.org/wiki/Udev
[`nmcli`]: https://networkmanager.dev/docs/api/latest/nmcli.html
[`nmtui`]: https://networkmanager.dev/docs/api/latest/nmtui.html
[`TUI`]: https://en.wikipedia.org/wiki/Text-based_user_interface
[`curses`]: https://en.wikipedia.org/wiki/Curses_(programming_library)
[`systemd-networkd`]: https://man7.org/linux/man-pages/man8/systemd-networkd.service.8.html
[`systemd-resolved`]: https://man7.org/linux/man-pages/man8/systemd-resolved.service.8.html
[the man page calls it]: https://man7.org/linux/man-pages/man5/systemd.network.5.html#DESCRIPTION
[`VLSM`]: https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing#VLSM
[`/etc/hosts`]: https://man7.org/linux/man-pages/man5/hosts.5.html
[`DHCP`]: https://en.wikipedia.org/wiki/Dynamic_Host_Configuration_Protocol
[`ip`]: https://man7.org/linux/man-pages/man8/ip.8.html
[`ip-address`]: https://man7.org/linux/man-pages/man8/ip-address.8.html
[`ip-addrlabel`]: https://man7.org/linux/man-pages/man8/ip-addrlabel.8.html
[`ip-l2tp`]: https://man7.org/linux/man-pages/man8/ip-l2tp.8.html
[`ip-link`]: https://man7.org/linux/man-pages/man8/ip-link.8.html
[`ip-maddress`]: https://man7.org/linux/man-pages/man8/ip-maddress.8.html
[`ip-monitor`]: https://man7.org/linux/man-pages/man8/ip-monitor.8.html
[`ip-mroute`]: https://man7.org/linux/man-pages/man8/ip-mroute.8.html
[`ip-neighbour`]: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
[`ip-netns`]: https://man7.org/linux/man-pages/man8/ip-netns.8.html
[`ip-ntable`]: https://man7.org/linux/man-pages/man8/ip-ntable.8.html
[`ip-route`]: https://man7.org/linux/man-pages/man8/ip-route.8.html
[`ip-rule`]: https://man7.org/linux/man-pages/man8/ip-rule.8.html
[`ip-tcp_metrics`]: https://man7.org/linux/man-pages/man8/ip-tcp_metrics.8.html
[`ip-token`]: https://man7.org/linux/man-pages/man8/ip-token.8.html
[`ip-tunnel`]: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
[`ip-xfrm`]: https://man7.org/linux/man-pages/man8/ip-xfrm.8.html
[`MTU`]: https://en.wikipedia.org/wiki/Maximum_transmission_unit
[`TCP` window size]: https://en.wikipedia.org/wiki/TCP_window_scale_option
[`ping`]: https://man7.org/linux/man-pages/man8/ping.8.html
[`ping6`]: https://linux.die.net/man/8/ping6
[`ICMP`]: https://en.wikipedia.org/wiki/Internet_Control_Message_Protocol
[`/etc/sysctl.conf`]: https://man7.org/linux/man-pages/man5/sysctl.conf.5.html
[`iptables`]: https://man7.org/linux/man-pages/man8/iptables.8.html
[`traceroute`]: https://man7.org/linux/man-pages/man8/traceroute.8.html
[`traceroute6`]: https://linux.die.net/man/8/traceroute6
[Time to live]: https://en.wikipedia.org/wiki/Time_to_live
[`tracepath`]: https://man7.org/linux/man-pages/man8/tracepath.8.html
[`tracepath6`]: https://linux.die.net/man/8/tracepath
[`UDP`]: https://en.wikipedia.org/wiki/User_Datagram_Protocol
[`TCP`]: https://en.wikipedia.org/wiki/Transmission_Control_Protocol
[from the Nmap Project]: https://nmap.org/ncat/
[`ncat`]: https://man7.org/linux/man-pages/man1/ncat.1.html
[`netstat`]: https://man7.org/linux/man-pages/man8/netstat.8.html
[From the man page]: https://man7.org/linux/man-pages/man8/netstat.8.html#NOTES
[`ss`]: https://man7.org/linux/man-pages/man8/ss.8.html
[`DNS`]: https://en.wikipedia.org/wiki/Domain_Name_System
[`DNS` record class values]: https://www.rfc-editor.org/rfc/rfc1035
[`dig`]: https://linux.die.net/man/1/dig
[`Hesiod`]: https://en.wikipedia.org/wiki/Hesiod_(name_service)
[`ChaosNet`]: https://en.wikipedia.org/wiki/Chaosnet
[`/etc/passwd`]: https://man7.org/linux/man-pages/man5/passwd.5.html
[`/etc/group`]: https://man7.org/linux/man-pages/man5/group.5.html
[`/etc/printcap files`]: https://man7.org/linux/man-pages/man5/cups-files.conf.5.html
[`libc`]: https://en.wikipedia.org/wiki/C_standard_library
[`gethostbyname`]: https://man7.org/linux/man-pages/man3/gethostbyname.3.html
[`mDNS`]: https://en.wikipedia.org/wiki/Multicast_DNS
[`LLMNR`]: https://en.wikipedia.org/wiki/Link-Local_Multicast_Name_Resolution
[`host`]: https://linux.die.net/man/1/host
[`start of authority`]: https://en.wikipedia.org/wiki/SOA_record
[`mail exchange`]: https://en.wikipedia.org/wiki/MX_record
[`A` records]: https://www.cloudflare.com/learning/dns/dns-records/dns-a-record/
[the `TTL` in seconds]: https://developers.cloudflare.com/dns/manage-dns-records/reference/ttl/

