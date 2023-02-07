+++
title = "On Studying for the LPIC-1 Exam 102 (102-500), Part Five"
date = "2023-02-03T20:07:57-05:00"

+++

This is a riveting series:

- [On Studying for the LPIC-1 Exam 102 (101-500), Part One](/2023/01/22/on-studying-for-the-lpic-1-exam-102-102-500-part-one/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Two](/2023/01/25/on-studying-for-the-lpic-1-exam-102-102-500-part-two/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Three](/2023/01/26/on-studying-for-the-lpic-1-exam-102-102-500-part-three/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Four](/2023/02/01/on-studying-for-the-lpic-1-exam-102-102-500-part-four/)
- On Studying for the LPIC-1 Exam 102 (101-500), Part Five
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Six](/2023/02/06/on-studying-for-the-lpic-1-exam-102-102-500-part-six/)

And, so is this one!

- [On Studying for the LPIC-1 Exam 101 (101-500), Part One](/2023/01/13/on-studying-for-the-lpic-1-exam-101-101-500-part-one/)

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
    + [Netmask](#netmask)
    + [`CIDR`](#cidr)
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
        - [`route`](#route)
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

> Things get much more complicated with the introduction of [`CIDR`] and [classless] networks.

Just like an `IP` address, a netmask is 32 bits long (well, for `v4`).

## `CIDR`

Classless Inter-Domain Routing, or [`CIDR`], doesn't conform to the classful networking model.  In fact, it was conceived to address the rapid [`IPv4` address exhaustion] and to slow the growth of Internet [routing tables].

`CIDR` notation allows for variable-length subnet masking ([`VLSM`]) as opposed to the strict 8-bit groupings of the classful network subnet masks.

Here is an example:

```
192.168.6.0/27
```

The network mask, or prefix, is 27 bits in length, and so the host portion is 5 bits.  This allows a system administrator to create a smaller private network where the 254 machines of a legacy Class C network aren't warranted and needed.

The `IP` address in the `CIDR` notation above is the network address.

So, how do you determine the network address and the broadcast address from a random `IP`, like `112.56.3.78/10`?  Good question.  I've never thought that was easy to do, yo.

I'm not sure that you need to know how to do this for the exam, but regardless, it's something you should know how to do.

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

To determine the network address:
- `IP` address `AND` netmask

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

To determine the broadcast address:
- `IP` address `OR` inverse of netmask

For example:

<pre class="math">
112.56.3.78/10

Convert each octet of the IP address to binary:

01110000.00111000.00000011.01001110

Convert the netmask to binary:

11111111.11000000.00000000.00000000

Invert it.  Another way to do it is simply convert the host bits to ones.  Due to the properties of bitwise `OR`, the result will be the same:

00000000.00111111.11111111.11111111

Finally, bitwise OR (|) them:

01110000.00111000.00000011.01001110
00000000.00111111.11111111.11111111
-----------------------------------
01110000.00111111.11111111.11111111

Broadcast address = 112.63.255.255
</pre>

Calculate the total number of hosts:

<pre class="math">
4,194,302 = 2<sup>(32-10)</sup>-2
</pre>

> How is that, now?
>
> Well, since the length of an `IPv4` address is 32 bits, we subtract the network prefix from the total.  This is what is then raised as the exponent.
>
> Finally, we need to adjust the total for the network and broadcast addresses, which is why two is subtracted before returning the total.

Weeeeeeeeeeeeeeeeeeeeeeeeee

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

# Summary

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

The 4<sup>th</sup> and fifth groupings can be reduced to `::`, but the seventh can only be reduced to a single zero.

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

In the bad older days before 2009, the Linux kernel would name the interfaces simply in the order that they were detected. The devices were name using an `ethX` naming scheme (for `Ethernet`), so the first was named `eth0`, the second `eth1`, and so on.

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

You can use some of our old friends to see where the provenance of the interface's name.  For instance, the wireless interface on my machine is named `wlp3s0`:

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
> ---
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

[`/etc/resolv.conf`]

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

> Note that if none of the three hostname types are specified when setting the hostname, it will default to `static` and use that name for all the types.  To only set the `static` hostname, but not the other two, specify the `--static` option when setting should be used instead.
>
> In all cases, only the static hostname is stored in the `/etc/hostname` file.

### Lookups

The machine (and applications) can map hostnames to `IP` addresses using two different methods: a file database and a `DNS` resolver.

We can determine the order in which the machine will do the mapping.  For instance, does it first consult the file and then the resolver?  Or, vice-versa?

To find the answer to that riddle, we'll crack open the [`/etc/nsswitch.conf`] file.

> You may recall this particular file from [a previous lesson], and you'd be right!

To [quote the man page]:

<cite>The Name Service Switch (`NSS`) configuration file, `/etc/nsswitch.conf`, is used by the GNU C Library and certain other applications to determine the sources from which to obtain name-service information in a range of categories, and in what order.  Each category of information is identified by a database name.</cite>

Let's grep for the `hosts` database name:

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

If the hostname isn't able to be resolved using this simple mapping, the kernel will try the resolver.

### `/etc/resolv.conf`

The `dns` database that is listed after `files` will have the kernel ask the resolver to query up to three nameservers defined in its configuration file, [`/etc/resolv.conf`]:

```
$ cat /etc/resolv.conf
# Generated by NetworkManager
search home
nameserver 192.168.1.1
```

At this point, the remote names that are being queried are [domain names], **not** hostnames.

> If no nameservers are defined, the default behavior is to use the nameserver on the local machine.

## `NetworkManager`

[`NetworkManager`] is a daemon that sits on top of [`udev`] and provides a high-level abstraction for the configuration of the network interfaces identified by the machine.

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
$ sudo nmcli dev wifi list
IN-USE  BSSID              SSID                 MODE   CHAN  RATE        SIGNAL  BARS  SECURITY
        E8:AD:A6:5D:8B:EE  MySpectrumWiFie8-2G  Infra  11    195 Mbit/s  72      ▂▄▆_  WPA2
*       E8:AD:A6:5D:8B:EF  MySpectrumWiFie8-5G  Infra  149   540 Mbit/s  60      ▂▄▆_  WPA2
        00:CB:51:4E:CD:1E  MySpectrumWiFi18-2G  Infra  1     195 Mbit/s  29      ▂___  WPA2
```

To connect to an interface with a password but not have it appear in the `bash` history (or anywhere visible on the screen):

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

## `systemd-networkd`

[`systemd-networkd`]

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
[a previous lesson]: /2023/01/26/on-studying-for-the-lpic-1-exam-102-102-500-part-three/#getent-and-nsswitchconf
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

