+++
title = "On Network Interface Statistics"
date = "2023-06-17T17:29:23-04:00"

+++

I've been recently (more) interested in testing the hardware on my personal device(s).  Admittedly, I'm no expert in this, and I've probably always used the same (small) handful of utilities as everyone else to get a bird's eye view of how the `CPU` and `I/O` and network devices are performing.

However, since I'm always keen on learning more, I'm not satisfied in just copying and pasting a command from some dark and dank place on the Internet to get the information that I'm after.

It's better, in my opinion, to not only understand how to get access to the information (which is undoubtedly important), but also to understand how the kernel exposes the information to the user space tools (arguably, even more important to understand).

So, the purpose of this post is twofold:

1. Determine where user space tools are getting their information.
1. List a number of user space tools and the common commands they use to output this information.

That is all.

---

- [Network Interface Statistics](#network-interface-statistics)
    + [struct](#struct)
    + [Files](#files)
        + [`procfs`](#procfs)
        + [`sysfs`](#sysfs)
- [User Space Tools](#user-space-tools)
    + [`ip`](#ip)
    + [`ethtool`](#ethtool)
    + [`netstat`](#netstat)
    + [`sar`](#sar)
    + [`ifstat`](#ifstat)
    + [`ifconfig`](#ifconfig)
- [Hardware](#hardware)
- [References](#references)

---

## Network Interface Statistics

### struct

When the kernel is installed, many header files and are installed to the `/usr/include/linux/` directory.  One of them is [`/usr/include/linux/if_link.h`], which contains the following struct:

```c
struct rtnl_link_stats64 {
    __u64 rx_packets;
    __u64 tx_packets;
    __u64 rx_bytes;
    __u64 tx_bytes;
    __u64 rx_errors;
    __u64 tx_errors;
    __u64 rx_dropped;
    __u64 tx_dropped;
    __u64 multicast;
    __u64 collisions;
    __u64 rx_length_errors;
    __u64 rx_over_errors;
    __u64 rx_crc_errors;
    __u64 rx_frame_errors;
    __u64 rx_fifo_errors;
    __u64 rx_missed_errors;
    __u64 tx_aborted_errors;
    __u64 tx_carrier_errors;
    __u64 tx_fifo_errors;
    __u64 tx_heartbeat_errors;
    __u64 tx_window_errors;
    __u64 rx_compressed;
    __u64 tx_compressed;
    __u64 rx_nohandler;
    __u64 rx_otherhost_dropped;
};
```

This is the struct that the kernel writes to and exposes to user space through two pseudo-filesystems.  In fact, all of the tools that we'll briefly look at in this article will internally use this struct.

There are many small scripts that use this information to quickly get some insight into the throughput for a particular network interface for a specific period of time.  The following two members especially of the above struct are often used for many [back-of-the-envelope calculations]:

- `rx_packets`
    + Number of good packets received by the interface.  For hardware interfaces counts all good packets received from the device by the host, including packets which host had to drop at various stages of processing (even in the driver).

- `rx_bytes`
    + Number of good received bytes, corresponding to `rx_packets`.
    + For `IEEE` 802.3 devices should count the length of Ethernet Frames excluding the `FCS`.

- `tx_packets`
    + Number of packets successfully transmitted.  For hardware interfaces counts packets which host was able to successfully hand over to the device, which does not necessarily mean that packets had been successfully transmitted out of the device, only that device acknowledged it copied them out of host memory.

- `tx_bytes`
    + Number of good transmitted bytes, corresponding to `tx_packets`.
    + For `IEEE` 802.3 devices should count the length of Ethernet Frames excluding the `FCS`.

Let's now see where the kernel makes this information available.

### Files

As mentioned, there are shell scripts and scripting languages that will use the values in the following files to determine the throughput of a network adapter over time.  The kernel writes the values of the `rtnl_link_stats64` struct to locations in both the [`procfs`] and [`sysfs`] filesystems, exposing the information to a host of user space tools.

Let's now take a look at two pseudo-filesystems that expose this information to user space.

#### `procfs`

[`/proc/net/dev`]

```bash
$ cat /proc/net/dev
Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo: 10802074982 1034488    0    0    0     0          0         0 10802074982 1034488    0    0    0     0       0          0
enp0s31f6:       0       0    0    0    0     0          0         0        0       0    0    0    0     0       0          0
wlp3s0: 14981762338 11585960    0    2    0     0          0         0 4703835446 4963146    0    0    0     0       0          0
```

Here are the columns and their meaning:

|**Column** |**Description** |
|:---|:---|
|`bytes` |The total number of bytes of data transmitted or received by the interface. |
|`packets` |The total number of packets of data transmitted or received by the interface. |
|`errs` |The total number of transmit or receive errors detected by the device driver. |
|`drop` |The total number of packets dropped by the device driver. |
|`fifo` |The number of `FIFO` buffer errors. |
|`frame` |The number of packet framing errors. |
|`colls` |The number of collisions detected on the interface. |
|`compressed` |The number of compressed packets transmitted or received by the device driver. (This appears to be unused in the 2.2.15 kernel.) |
|`carrier` |The number of carrier losses detected by the device driver. |
|`multicast` |The number of multicast frames transmitted or received by the device driver. |

Now, we're only interested in a particular interface and some of its columns, so, let's be more precise:

```bash
$ cat /proc/net/dev | ag wlp3s0 | awk '{ print $2,$3,$10,$11 }'
14981738887 11585797 4703810950 4962952
```

#### `sysfs`

Each device directory in `sysfs` contains a statistics directory (e.g. `/sys/class/net/lo/statistics/`) with files corresponding to members of struct `rtnl_link_stats64`.

These directories are [symlinked] to directories within the `/sys/devices/` directory.

```bash
$ readlink -f /sys/class/net/wlp3s0
/sys/devices/pci0000:00/0000:00:1c.6/0000:03:00.0/net/wlp3s0
```

For example, on my machine, `/sys/class/net/` lists the following:

```bash
$ ls -l /sys/class/net
total 0
lrwxrwxrwx 1 root root 0 Jun 18 00:15 enp0s31f6 -> ../../devices/pci0000:00/0000:00:1f.6/net/enp0s31f6
lrwxrwxrwx 1 root root 0 Jun 18 00:15 lo -> ../../devices/virtual/net/lo
lrwxrwxrwx 1 root root 0 Jun 18 00:15 wlp3s0 -> ../../devices/pci0000:00/0000:00:1c.6/0000:03:00.0/net/wlp3s0
```

This simple interface is convenient especially in constrained/embedded environments without access to tools.  However, it's inefficient when reading multiple stats as it internally performs a full dump of struct `rtnl_link_stats64` and reports only the stat corresponding to the accessed file.

```bash
$ cat /sys/class/net/wlp3s0/statistics/{rx_packets,rx_bytes,tx_packets,tx_bytes}
11583631
14981141094
4960797
4703518718
```

```bash
$ ls /sys/class/net/wlp3s0/statistics
collisions  rx_compressed  rx_errors        rx_length_errors  rx_over_errors     tx_bytes           tx_dropped      tx_heartbeat_errors
multicast   rx_crc_errors  rx_fifo_errors   rx_missed_errors  rx_packets         tx_carrier_errors  tx_errors       tx_packets
rx_bytes    rx_dropped     rx_frame_errors  rx_nohandler      tx_aborted_errors  tx_compressed      tx_fifo_errors  tx_window_errors
```

## User Space Tools

Most of these tools use one or both of the files that were just previously mentioned.

### `ip`

The [`ip`] utility is a tool that does a lot of things (show and manipulate routing, network devices, interfaces and tunnels).  It delegates to subcommands to perform its different tasks, and we're be looking at the [`ip-link`] command.

```bash
$ sudo ip -s -s link show dev wlp3s0
3: wlp3s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DORMANT group default qlen 1000
    link/ether a0:a4:c5:5f:f3:de brd ff:ff:ff:ff:ff:ff
    RX: bytes  packets  errors  dropped missed  mcast
    4298949547 3007618  0       0       0       0
    RX errors: length   crc     frame   fifo    overrun
               0        0       0       0       0
    TX: bytes  packets  errors  dropped carrier collsns
    102049599  348618   0       0       0       0
    TX errors: aborted  fifo   window heartbeat transns
               0        0       0       0       10
```

Output in `json`:

```bash
$ sudo ip -s -s -json link show dev wlp3s0
[{"ifindex":3,"ifname":"wlp3s0","flags":["BROADCAST","MULTICAST","UP","LOWER_UP"],"mtu":1500,"qdisc":"noqueue","operstate":"UP","linkmode":"DORMANT","group":"default","txqlen":1000,"link_type":"ether","address":"a0:a4:c5:5f:f3:de","broadcast":"ff:ff:ff:ff:ff:ff","stats64":{"rx":{"bytes":4298955775,"packets":3007679,"errors":0,"dropped":0,"over_errors":0,"multicast":0,"length_errors":0,"crc_errors":0,"frame_errors":0,"fifo_errors":0,"missed_errors":0},"tx":{"bytes":102057305,"packets":348689,"errors":0,"dropped":0,"carrier_errors":0,"collisions":0,"aborted_errors":0,"fifo_errors":0,"window_errors":0,"heartbeat_errors":0,"carrier_changes":10}}}]
```

Let's only target the objects we're interested in:

```bash
$ sudo ip -s -s -json link show dev wlp3s0 | jq '.[0].stats64'
{
  "rx": {
    "bytes": 4464190536,
    "packets": 3158482,
    "errors": 0,
    "dropped": 2,
    "over_errors": 0,
    "multicast": 0,
    "length_errors": 0,
    "crc_errors": 0,
    "frame_errors": 0,
    "fifo_errors": 0,
    "missed_errors": 0
  },
  "tx": {
    "bytes": 111182166,
    "packets": 400708,
    "errors": 0,
    "dropped": 0,
    "carrier_errors": 0,
    "collisions": 0,
    "aborted_errors": 0,
    "fifo_errors": 0,
    "window_errors": 0,
    "heartbeat_errors": 0,
    "carrier_changes": 22
  }
}
```

> Specifying [`-s`] twice will display all the members of the `struct rtnl_link_stats64` struct.

|**Option** |**Description** |
|:---|:---|
|`-j`, `-json` |Output results in JavaScript Object Notation (`JSON`). |
|`-s`, `-stats`, `-statistics`  |Output more information. If the option appears twice or more, the amount of information increases.  As a rule, the information is statistics or some time values. |

### `ethtool`

Low-level statistics can be accessed by the [`ethtool`] tool, the main utility for controlling network drivers and hardware.

```bash
$ sudo ethtool -S wlp3s0
NIC statistics:
     rx_packets: 16397
     rx_bytes: 19242044
     rx_duplicates: 2
     rx_fragments: 16218
     rx_dropped: 31
     tx_packets: 9054
     tx_bytes: 1871204
     tx_filtered: 0
     tx_retry_failed: 0
     tx_retries: 970
     sta_state: 4
     txrate: 520000000
     rxrate: 351000000
     signal: 180
     channel: 0
     noise: 18446744073709551615
     ch_time: 18446744073709551615
     ch_time_busy: 18446744073709551615
     ch_time_ext_busy: 18446744073709551615
     ch_time_rx: 18446744073709551615
     ch_time_tx: 18446744073709551615
```

Here is some other cool stuff that `ethtool` can do.

Print the current parameters of the network port:

```bash
$ sudo ethtool enp0s31f6
Settings for enp0s31f6:
        Supported ports: [ TP ]
        Supported link modes:   10baseT/Half 10baseT/Full
                                100baseT/Half 100baseT/Full
                                1000baseT/Full
        Supported pause frame use: No
        Supports auto-negotiation: Yes
        Supported FEC modes: Not reported
        Advertised link modes:  10baseT/Half 10baseT/Full
                                100baseT/Half 100baseT/Full
                                1000baseT/Full
        Advertised pause frame use: No
        Advertised auto-negotiation: Yes
        Advertised FEC modes: Not reported
        Speed: Unknown!
        Duplex: Unknown! (255)
        Auto-negotiation: on
        Port: Twisted Pair
        PHYAD: 2
        Transceiver: internal
        MDI-X: Unknown (auto)
        Supports Wake-on: pumbg
        Wake-on: g
        Current message level: 0x00000007 (7)
                               drv probe link
        Link detected: no
```

Print the driver info of the wireless device:

```bash
$ sudo ethtool -i wlp3s0
driver: iwlwifi
version: 5.10.0-23-amd64
firmware-version: 36.ad812ee0.0 8265-36.ucode
expansion-rom-version:
bus-info: 0000:03:00.0
supports-statistics: yes
supports-test: no
supports-eeprom-access: no
supports-register-dump: no
supports-priv-flags: no
```

Just for fun, let the link light of the Ethernet device flash for 30 seconds:

```bash
$ sudo ethtool -p enp0s31f6 30
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

|**Option** |**Description** |
|:---|:---|
|`-i`, `--driver` |Queries the specified network device for associated driver information. |
|`--json` |Output results in JavaScript Object Notation (`JSON`). Only a subset of options support this. Those which do not will continue to output plain text in the presence of this option. |
|`-p`, `--identify` | Initiates adapter-specific action intended to enable an operator to easily identify the adapter by sight.  Typically this involves blinking one or more LEDs on the specific network port. |
|`-S`, `--statistics` | Initiates adapter-specific action intended to enable an operator to easily identify the adapter by sight.  Typically this involves blinking one or more LEDs on the specific network port. |

### `netstat`

The [`netstat`] utility will print network connections, routing tables, interface statistics, masquerade connections, and multicast memberships.  Of course, we're interested in the interface statistics here.

Print all network statistics:

```bash
$ sudo netstat wlp3s0
```

Print statistics for `tcp` protocol:

```bash
$ sudo netstat -st wlp3s0
```

Print statistics for `udp` protocol:

```bash
$ sudo netstat -su wlp3s0
```

### `sar`

View both real-time and historical data with the `sar` utility.  Of course, it allows you to see performance statistics for your network devices.

Interestingly, the [`sar`] man page states that [`/proc` must be mounted for `sar` to work].  This is a sure indication that `sar` gets its data from `procfs` and most likely `/proc/net/dev`.

```bash
$ sar -n DEV 1 3 --iface=wlp3s0
Linux 5.10.0-23-amd64 (kilgore-trout)   06/17/2023      _x86_64_        (8 CPU)

05:42:31 PM   rxpck/s   txpck/s    rxkB/s    txkB/s   rxcmp/s   txcmp/s  rxmcst/s   %ifutil IFACE
05:42:32 PM      1.00      0.00     92.0B      0.0B      0.00      0.00      0.00      0.0% wlp3s0

05:42:32 PM   rxpck/s   txpck/s    rxkB/s    txkB/s   rxcmp/s   txcmp/s  rxmcst/s   %ifutil IFACE
05:42:33 PM      6.00      8.00    685.0B    849.0B      0.00      0.00      0.00      0.0% wlp3s0

05:42:33 PM   rxpck/s   txpck/s    rxkB/s    txkB/s   rxcmp/s   txcmp/s  rxmcst/s   %ifutil IFACE
05:42:34 PM      0.00      0.00      0.0B      0.0B      0.00      0.00      0.00      0.0% wlp3s0

Average:      rxpck/s   txpck/s    rxkB/s    txkB/s   rxcmp/s   txcmp/s  rxmcst/s   %ifutil IFACE
Average:         2.33      2.67    259.0B    283.0B      0.00      0.00      0.00      0.0% wlp3s0
```

### `ifstat`

The `ifstat` command prints network interface statistics. The interface keeps records of the previous data displayed in history files, and, by default, it only displays the difference between the last and current calls.

> It stores history files in `/tmp/.ifstat.u$UID`.

Show statistics for only the wireless device with total bandwidth:

```bash
$ sudo ifstat -i wlp3s0 -T
      wlp3s0              Total
 KB/s in  KB/s out   KB/s in  KB/s out
    0.06      0.09      0.06      0.09
    0.58      0.83      0.58      0.83
    0.48      1.79      0.48      1.79
  268.73      3.76    268.73      3.76
    0.43      0.54      0.43      0.54
 1919.43     10.74   1919.43     10.74
```

Add a timestamp:

```bash
$ sudo ifstat -t 3
  Time        enp0s31f6             wlp3s0
  HH:MM:SS   KB/s in  KB/s out   KB/s in  KB/s out
  21:18:28      0.00      0.00      0.00      0.00
  21:18:31      0.00      0.00      0.19      0.28
  21:18:34      0.00      0.00      1.80      0.54
  21:18:37      0.00      0.00    285.97     30.18
  21:18:40      0.00      0.00    200.09     11.04
  ...
```

Display `loopback` devices and hide interfaces that are up but not used:

```bash
$ sudo ifstat -lz
        lo                wlp3s0
 KB/s in  KB/s out   KB/s in  KB/s out
    0.00      0.00      0.00      0.00
    0.00      0.00      0.58      0.83
    ...
```

|**Option** |**Description** |
|:---|:---|
|`-i` |Specifies the list of interfaces to monitor, separated by commas (if an interface name has a comma, it can be escaped with '\'). Multiple instances of the options are added together. |
|`-l` |Enables monitoring of loopback interfaces for which statistics are available.  By default, `ifstat` monitors all non-loopback interfaces that are up. |
|`-t` |Adds a timestamp at the beginning of each line. |
|`-T` |Reports total bandwidth for all monitored interfaces. |
|`-z` |Hides interface which counters are null, `eg` interfaces that are up but not used. |

### `ifconfig`

Of course, you can always use the older [`ifconfg`], but it is now deprecated in favor of `ip`:  Its information, according to its man page, comes from the following [two files]:

- `/proc/net/dev`
- `/proc/net/if_inet6`

```bash
$ sudo ifconfig wlp3s0
wlp3s0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.96  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::f167:8747:fb33:88bc  prefixlen 64  scopeid 0x20<link>
        ether a0:a4:c5:5f:f3:de  txqueuelen 1000  (Ethernet)
        RX packets 11585859  bytes 14981744806 (13.9 GiB)
        RX errors 0  dropped 2  overruns 0  frame 0
        TX packets 4963028  bytes 4703819297 (4.3 GiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

## Hardware

If you're unsure about the specs of your particular Ethernet network adapter, an easy way to get that information is by using the [`lspci`] utility.

```bash
$ sudo lspci -vs 03:00.0
03:00.0 Network controller: Intel Corporation Wireless 8265 / 8275 (rev 78)
        Subsystem: Intel Corporation Dual Band Wireless-AC 8265
        Flags: bus master, fast devsel, latency 0, IRQ 164, IOMMU group 12
        Memory at e9100000 (64-bit, non-prefetchable) [size=8K]
        Capabilities: [c8] Power Management version 3
        Capabilities: [d0] MSI: Enable+ Count=1/1 Maskable- 64bit+
        Capabilities: [40] Express Endpoint, MSI 00
        Capabilities: [100] Advanced Error Reporting
        Capabilities: [140] Device Serial Number a0-a4-c5-ff-ff-5f-f3-de
        Capabilities: [14c] Latency Tolerance Reporting
        Capabilities: [154] L1 PM Substates
        Kernel driver in use: iwlwifi
        Kernel modules: iwlwifi
```

To see the capabilities, add another `verbose` flag (`-v`):

```bash
$ sudo lspci -vvs 03:00.0
```

```bash
$ sudo lspci -vmmnns 03:00.0
Slot:   03:00.0
Class:  Network controller [0280]
Vendor: Intel Corporation [8086]
Device: Wireless 8265 / 8275 [24fd]
SVendor:        Intel Corporation [8086]
SDevice:        Dual Band Wireless-AC 8265 [0010]
Rev:    78
IOMMUGroup:     12
```

|**Option** |**Description** |
|:---|:---|
|`-mm` |Dump `PCI` device data in a machine readable form for easy parsing by scripts. |
|`-nn` |Show `PCI` vendor and device codes as both numbers and names. |
|`-v` |Be verbose and display detailed information about all devices. |
|`-vv`|Be very verbose and display more details. This level includes everything deemed useful. |

## References

- [Interface statistics](https://www.kernel.org/doc/html/latest/networking/statistics.html)
- [Exploring the /proc/net/ Directory](http://web.archive.org/web/20180522173537/http://www.linuxdevcenter.com/pub/a/linux/2000/11/16/LinuxAdmin.html)
- [ethtool - utility for controlling network drivers and hardware](http://www.kernel.org/pub/software/network/ethtool/)

[`/usr/include/linux/if_link.h`]: https://github.com/torvalds/linux/blob/master/include/uapi/linux/if_link.h
[back-of-the-envelope calculations]: https://en.wikipedia.org/wiki/Back-of-the-envelope_calculation
[`ifconfg`]: https://man7.org/linux/man-pages/man8/ifconfig.8.html
[two files]: https://man7.org/linux/man-pages/man8/ifconfig.8.html#FILES
[symlinked]: https://man7.org/linux/man-pages/man1/readlink.1.html
[`procfs`]: https://www.kernel.org/doc/html/latest/filesystems/proc.html
[`sysfs`]: https://www.kernel.org/doc/html/latest/filesystems/sysfs.html
[`lspci`]: https://man7.org/linux/man-pages/man8/lspci.8.html
[`/proc/net/dev`]: https://www.kernel.org/doc/html/latest/filesystems/proc.html#networking-info-in-proc-net
[`sar`]: https://man7.org/linux/man-pages/man1/sar.1.html
[`/proc` must be mounted for `sar` to work]: https://man7.org/linux/man-pages/man1/sar.1.html#BUGS
[`ethtool`]: https://man7.org/linux/man-pages/man8/ethtool.8.html
[`ip`]: https://man7.org/linux/man-pages/man8/ip.8.html
[`ip-link`]: https://man7.org/linux/man-pages/man8/ip-link.8.html
[`netstat`]: https://man7.org/linux/man-pages/man8/netstat.8.html

