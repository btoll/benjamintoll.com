+++
title = "On Studying for the LPIC-1 Exam 101 (101-500), Part One"
date = "2023-01-13T00:25:10-05:00"

+++

When studying for the Linux Professional Institute [LPIC-1] certification, I took a bunch of notes when reading the docs and doing an online course.  Note that this is not exhaustive, so do not depend on this article to get you prepared for the exam.

The menu items below are not in any order.

This roughly covers [Topic 101: System Architecture].

*Caveat emptor*.

---

- [Exam Details](#exam-details)
- [Topic 101: System Architecture](#topic-101-system-architecture)
    + [Block Devices and Hardware Settings](#block-devices-and-hardware-settings)
        - [`blkid`](#blkid)
        - [`lsblk`](#lsblk)
        - [`lscpu`](#lscpu)
        - [`lsdev`](#lsdev)
        - [`lspci`](#lspci)
        - [`lsusb`](#lsusb)
    + [Service Management](#service-management)
        - [`SysV`](#sysv)
            + [runlevels](#runlevels)
            + [`/etc/inittab`](#etcinittab)
        - [`systemd`](#systemd)
            + [Services](#services)
            + [`systemctl`](#systemctl)
            + [Mount Units](#mount-units)
            + [Powering Off](#powering-off)
        - [`Upstart`](#upstart)
    + [Kernel Ring Buffer](#kernel-ring-buffer)
        - [`dmesg`](#dmesg)
        - [`journalctl`](#journalctl)
- [References](#references)

---

# Exam Details

[LPIC-1 Exam 101]

- Exam Objectives Version: 5.0
- Exam Code: 101-500

# Topic 101: System Architecture

## Block Devices and Hardware Settings

These commands can be valuable for getting hardware attributes for a given device that can be used [when creating `udev` rules].

### `blkid`

Prints block device attributes:

```
$ sudo blkid
/dev/nvme0n1p1: UUID="892E-F9C9" BLOCK_SIZE="512" TYPE="vfat" PARTUUID="9cb384f4-1405-4a5d-8fa7-7127549889cb"
/dev/nvme0n1p2: UUID="400bebc0-1270-4c2c-9c0b-255d3e1143e4" BLOCK_SIZE="1024" TYPE="ext2" PARTUUID="a6aa0d1c-b8f9-49c4-a111-317542c3df03"
/dev/nvme0n1p3: UUID="c1334d3a-d586-49ee-b8a9-37a2a36da46c" TYPE="crypto_LUKS" PARTUUID="b0245516-cf6d-4a86-a154-79661b67bb05"
/dev/mapper/nvme0n1p3_crypt: UUID="DIjCje-JxlM-HL0D-9BqL-puZl-x34V-dDFL8U" TYPE="LVM2_member"
/dev/mapper/kilgore--trout--vg-root: UUID="6d4a9ce3-9412-4261-b873-974c29447e79" BLOCK_SIZE="4096" TYPE="ext4"
/dev/mapper/kilgore--trout--vg-swap_1: UUID="3d46ebcb-fd6c-4a94-8f1d-1a945cb4b7ae" TYPE="swap"
```

> Note that it displays the filesystem of a block device as an attribute.

### `lsblk`

The [`lsblk`] system administrator command will list all available block devices, including swap space, but not [RAM disks].  It gets its information from [`sysfs`] and the [`udev db`].

The man page notes that it's safest to call `udevadm settle` before any `lsblk` commands, which watches the `udev` event queue, and exits if all current events are handled.

Print dependencies in reverse order:

```
$ sudo lsblk -s
NAME                      MAJ:MIN RM   SIZE RO TYPE  MOUNTPOINT
kilgore--trout--vg-root   253:1    0 474.9G  0 lvm   /
└─nvme0n1p3_crypt         253:0    0 475.9G  0 crypt
  └─nvme0n1p3             259:3    0   476G  0 part
    └─nvme0n1             259:0    0 476.9G  0 disk
kilgore--trout--vg-swap_1 253:2    0   976M  0 lvm   [SWAP]
└─nvme0n1p3_crypt         253:0    0 475.9G  0 crypt
  └─nvme0n1p3             259:3    0   476G  0 part
    └─nvme0n1             259:0    0 476.9G  0 disk
nvme0n1p1                 259:1    0   512M  0 part  /boot/efi
└─nvme0n1                 259:0    0 476.9G  0 disk
nvme0n1p2                 259:2    0   488M  0 part  /boot
└─nvme0n1                 259:0    0 476.9G  0 disk
```

> A `nvme` device is an `SSD` connected to the [PCI Express bus].

Many commands allow you to specify columns, and `lsblk` is no different:

```
$ sudo lsblk -o NAME,SIZE
NAME                              SIZE
nvme0n1                         476.9G
├─nvme0n1p1                       512M
├─nvme0n1p2                       488M
└─nvme0n1p3                       476G
  └─nvme0n1p3_crypt             475.9G
    ├─kilgore--trout--vg-root   474.9G
    └─kilgore--trout--vg-swap_1   976M
```

Print information about filesystems:

```
$ lsblk -f
NAME                            FSTYPE      FSVER    LABEL UUID                                   FSAVAIL FSUSE% MOUNTPOINT
nvme0n1
├─nvme0n1p1                     vfat        FAT32          892E-F9C9                                 500M     2% /boot/efi
├─nvme0n1p2                     ext2        1.0            400bebc0-1270-4c2c-9c0b-255d3e1143e4    346.8M    21% /boot
└─nvme0n1p3                     crypto_LUKS 2              c1334d3a-d586-49ee-b8a9-37a2a36da46c
  └─nvme0n1p3_crypt             LVM2_member LVM2 001       DIjCje-JxlM-HL0D-9BqL-puZl-x34V-dDFL8U
    ├─kilgore--trout--vg-root   ext4        1.0            6d4a9ce3-9412-4261-b873-974c29447e79    413.8G     6% /
    └─kilgore--trout--vg-swap_1 swap        1              3d46ebcb-fd6c-4a94-8f1d-1a945cb4b7ae                  [SWAP]
kilgore-trout ~~> ~/projects/benjamintoll.com:master
```

> Note that this option is the same as `-o NAME,FSTYPE,LABEL,UUID,FSAVAIL,FSUSE%,MOUNTPOINT`.

The man page notes that the authoritative information about filesystems and raids is provided by the [`blkid`] command.

Print all available blocks, including RAM disks and empty devices:

```
$ sudo lsblk -a
NAME                            MAJ:MIN RM   SIZE RO TYPE  MOUNTPOINT
sda                               8:0    1     0B  0 disk
nvme0n1                         259:0    0 476.9G  0 disk
├─nvme0n1p1                     259:1    0   512M  0 part  /boot/efi
├─nvme0n1p2                     259:2    0   488M  0 part  /boot
└─nvme0n1p3                     259:3    0   476G  0 part
  └─nvme0n1p3_crypt             253:0    0 475.9G  0 crypt
    ├─kilgore--trout--vg-root   253:1    0 474.9G  0 lvm   /
    └─kilgore--trout--vg-swap_1 253:2    0   976M  0 lvm   [SWAP]
```

Output full device paths:

```
$ sudo lsblk -p
NAME                                        MAJ:MIN RM   SIZE RO TYPE  MOUNTPOINT
/dev/nvme0n1                                259:0    0 476.9G  0 disk
├─/dev/nvme0n1p1                            259:1    0   512M  0 part  /boot/efi
├─/dev/nvme0n1p2                            259:2    0   488M  0 part  /boot
└─/dev/nvme0n1p3                            259:3    0   476G  0 part
  └─/dev/mapper/nvme0n1p3_crypt             253:0    0 475.9G  0 crypt
    ├─/dev/mapper/kilgore--trout--vg-root   253:1    0 474.9G  0 lvm   /
    └─/dev/mapper/kilgore--trout--vg-swap_1 253:2    0   976M  0 lvm   [SWAP]
```

Print as `JSON`:

```
$ sudo lsblk -pJ
{
   "blockdevices": [
      {"name":"/dev/nvme0n1", "maj:min":"259:0", "rm":false, "size":"476.9G", "ro":false, "type":"disk", "mountpoint":null,
         "children": [
            {"name":"/dev/nvme0n1p1", "maj:min":"259:1", "rm":false, "size":"512M", "ro":false, "type":"part", "mountpoint":"/boot/efi"},
            {"name":"/dev/nvme0n1p2", "maj:min":"259:2", "rm":false, "size":"488M", "ro":false, "type":"part", "mountpoint":"/boot"},
            {"name":"/dev/nvme0n1p3", "maj:min":"259:3", "rm":false, "size":"476G", "ro":false, "type":"part", "mountpoint":null,
               "children": [
                  {"name":"/dev/mapper/nvme0n1p3_crypt", "maj:min":"253:0", "rm":false, "size":"475.9G", "ro":false, "type":"crypt", "mountpoint":null,
                     "children": [
                        {"name":"/dev/mapper/kilgore--trout--vg-root", "maj:min":"253:1", "rm":false, "size":"474.9G", "ro":false, "type":"lvm", "mountpoint":"/"},
                        {"name":"/dev/mapper/kilgore--trout--vg-swap_1", "maj:min":"253:2", "rm":false, "size":"976M", "ro":false, "type":"lvm", "mountpoint":"[SWAP]"}
                     ]
                  }
               ]
            }
         ]
      }
   ]
}
```

> Remember that device mapper names are soft links:
>
> ```
> $ readlink -f /dev/mapper/kilgore--trout--vg-root
> /dev/dm-1
> ```

Weeeeeeeeeeeeeeeeeeeeeee

### `lscpu`

This [`lscpu`] utility comes from the [`util-linux`] package:

```
$ dpkg -S $(which lscpu)
util-linux: /usr/bin/lscpu
```

This utility gets its information from [`/proc/cpuinfo`](#proccpuinfo).

```
$ lscpu
Architecture:                    x86_64
CPU op-mode(s):                  32-bit, 64-bit
Byte Order:                      Little Endian
Address sizes:                   39 bits physical, 48 bits virtual
CPU(s):                          8
On-line CPU(s) list:             0-7
Thread(s) per core:              2
Core(s) per socket:              4
Socket(s):                       1
NUMA node(s):                    1
Vendor ID:                       GenuineIntel
CPU family:                      6
Model:                           142
Model name:                      Intel(R) Core(TM) i7-8650U CPU @ 1.90GHz
Stepping:                        10
CPU MHz:                         802.816
CPU max MHz:                     4200.0000
CPU min MHz:                     400.0000
BogoMIPS:                        4199.88
Virtualization:                  VT-x
L1d cache:                       128 KiB
L1i cache:                       128 KiB
L2 cache:                        1 MiB
L3 cache:                        8 MiB
NUMA node0 CPU(s):               0-7
Vulnerability Itlb multihit:     KVM: Mitigation: Split huge pages
Vulnerability L1tf:              Mitigation; PTE Inversion; VMX conditional cache flushes, SMT vulnerable
Vulnerability Mds:               Mitigation; Clear CPU buffers; SMT vulnerable
Vulnerability Meltdown:          Mitigation; PTI
Vulnerability Mmio stale data:   Mitigation; Clear CPU buffers; SMT vulnerable
Vulnerability Retbleed:          Mitigation; IBRS
Vulnerability Spec store bypass: Mitigation; Speculative Store Bypass disabled via prctl and seccomp
Vulnerability Spectre v1:        Mitigation; usercopy/swapgs barriers and __user pointer sanitization
Vulnerability Spectre v2:        Mitigation; IBRS, IBPB conditional, RSB filling, PBRSB-eIBRS Not affected
Vulnerability Srbds:             Mitigation; Microcode
Vulnerability Tsx async abort:   Mitigation; Clear CPU buffers; SMT vulnerable
Flags:                           fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush dts acpi mmx fxsr sse s
                                 se2 ss ht tm pbe syscall nx pdpe1gb rdtscp lm constant_tsc art arch_perfmon pebs bts rep_good nopl xtop
                                 ology nonstop_tsc cpuid aperfmperf pni pclmulqdq dtes64 monitor ds_cpl vmx smx est tm2 ssse3 sdbg fma c
                                 x16 xtpr pdcm pcid sse4_1 sse4_2 x2apic movbe popcnt tsc_deadline_timer aes xsave avx f16c rdrand lahf_
                                 lm abm 3dnowprefetch cpuid_fault epb invpcid_single pti ssbd ibrs ibpb stibp tpr_shadow vnmi flexpriori
                                 ty ept vpid ept_ad fsgsbase tsc_adjust bmi1 hle avx2 smep bmi2 erms invpcid rtm mpx rdseed adx smap clf
                                 lushopt intel_pt xsaveopt xsavec xgetbv1 xsaves dtherm ida arat pln pts hwp hwp_notify hwp_act_window h
                                 wp_epp md_clear flush_l1d arch_capabilities
```

### `lsdev`

This [`lsdev`] utility comes from the [`procinfo`] package:

```
$ dpkg -S $(which lsdev)
procinfo: /usr/bin/lsdev
```

It pulls its information from the following locations:

- [`/proc/dma`](#procdma)
- [`/proc/interrupts`](#procinterrupts)
- [`/proc/ioports`](#procioports)

So, it's a quick overview of which hardware uses what I/O addresses and what IRQ and DMA channels:

```
$ sudo lsdev | head -20
Device            DMA   IRQ  I/O Ports
------------------------------------------------
 0  rmi4-00.fn34        162
 1  rmi4-00.fn01        163
 2  rmi4-00.fn03        164
 3  rmi4-00.fn11        165
 4  rmi4-00.fn11        166
 5  rmi4-00.fn30        167
0000:00:02.0                   e000-e03f
0000:00:1f.4                   efa0-efbf
0000:01:00.0                     d000-d07f
44  rmi4_smbus          160
acpi                      9
ACPI                             1800-1803     1804-1805     1808-180b     1810-1815     1850-1850     1880-189f
cascade             4
dma                            0080-008f
dma1                           0000-001f
dma2                           00c0-00df
dmar0                   120
dmar1                   121
```

> Issue this command as a privileged user or all of the memory locations will be zeros.

### `lspci`

This [`lspci`] utility comes from the [`pciutils`] package:

```
$ dpkg --search $(which lspci)
pciutils: /usr/bin/lspci
```

Each entry in the table will contain the following information.  In order, they are:

- slot
- class
- vendor
- device
- revision (optional)
- programming interface (optional)

```
$ sudo lspci
00:00.0 Host bridge: Intel Corporation Xeon E3-1200 v6/7th Gen Core Processor Host Bridge/DRAM Registers (rev 08)
00:02.0 VGA compatible controller: Intel Corporation UHD Graphics 620 (rev 07)
00:04.0 Signal processing controller: Intel Corporation Xeon E3-1200 v5/E3-1500 v5/6th Gen Core Processor Thermal Subsystem (rev 08)
00:08.0 System peripheral: Intel Corporation Xeon E3-1200 v5/v6 / E3-1500 v5 / 6th/7th/8th Gen Core Processor Gaussian Mixture Model
00:14.0 USB controller: Intel Corporation Sunrise Point-LP USB 3.0 xHCI Controller (rev 21)
00:14.2 Signal processing controller: Intel Corporation Sunrise Point-LP Thermal subsystem (rev 21)
00:16.0 Communication controller: Intel Corporation Sunrise Point-LP CSME HECI #1 (rev 21)
00:1c.0 PCI bridge: Intel Corporation Sunrise Point-LP PCI Express Root Port #1 (rev f1)
00:1c.6 PCI bridge: Intel Corporation Sunrise Point-LP PCI Express Root Port #7 (rev f1)
00:1d.0 PCI bridge: Intel Corporation Sunrise Point-LP PCI Express Root Port #9 (rev f1)
00:1d.2 PCI bridge: Intel Corporation Sunrise Point-LP PCI Express Root Port #11 (rev f1)
00:1f.0 ISA bridge: Intel Corporation Sunrise Point LPC Controller/eSPI Controller (rev 21)
00:1f.2 Memory controller: Intel Corporation Sunrise Point-LP PMC (rev 21)
00:1f.3 Audio device: Intel Corporation Sunrise Point-LP HD Audio (rev 21)
00:1f.4 SMBus: Intel Corporation Sunrise Point-LP SMBus (rev 21)
00:1f.6 Ethernet controller: Intel Corporation Ethernet Connection (4) I219-LM (rev 21)
01:00.0 3D controller: NVIDIA Corporation GP108M [GeForce MX150] (rev a1)
03:00.0 Network controller: Intel Corporation Wireless 8265 / 8275 (rev 78)
04:00.0 PCI bridge: Intel Corporation JHL6240 Thunderbolt 3 Bridge (Low Power) [Alpine Ridge LP 2016] (rev 01)
05:00.0 PCI bridge: Intel Corporation JHL6240 Thunderbolt 3 Bridge (Low Power) [Alpine Ridge LP 2016] (rev 01)
05:01.0 PCI bridge: Intel Corporation JHL6240 Thunderbolt 3 Bridge (Low Power) [Alpine Ridge LP 2016] (rev 01)
05:02.0 PCI bridge: Intel Corporation JHL6240 Thunderbolt 3 Bridge (Low Power) [Alpine Ridge LP 2016] (rev 01)
06:00.0 System peripheral: Intel Corporation JHL6240 Thunderbolt 3 NHI (Low Power) [Alpine Ridge LP 2016] (rev 01)
3c:00.0 USB controller: Intel Corporation JHL6240 Thunderbolt 3 USB 3.1 Controller (Low Power) [Alpine Ridge LP 2016] (rev 01)
3d:00.0 Non-Volatile memory controller: Intel Corporation SSD Pro 7600p/760p/E 6100p Series (rev 03)
```

Get more information about a specific device:

```
$ sudo lspci -s 3d:00.0 -v
3d:00.0 Non-Volatile memory controller: Intel Corporation SSD Pro 7600p/760p/E 6100p Series (rev 03) (prog-if 02 [NVM Express])
        Subsystem: Intel Corporation SSD Pro 7600p/760p/E 6100p Series [NVM Express]
        Flags: bus master, fast devsel, latency 0, IRQ 18, NUMA node 0, IOMMU group 17
        Memory at e9000000 (64-bit, non-prefetchable) [size=16K]
        Capabilities: [40] Power Management version 3
        Capabilities: [50] MSI: Enable- Count=1/8 Maskable+ 64bit+
        Capabilities: [70] Express Endpoint, MSI 00
        Capabilities: [b0] MSI-X: Enable+ Count=16 Masked-
        Capabilities: [100] Advanced Error Reporting
        Capabilities: [158] Secondary PCI Express
        Capabilities: [178] Latency Tolerance Reporting
        Capabilities: [180] L1 PM Substates
        Kernel driver in use: nvme
        Kernel modules: nvme

```

And the device's kernel module in use:

```
$ sudo lspci -s 3d:00.0 -k
3d:00.0 Non-Volatile memory controller: Intel Corporation SSD Pro 7600p/760p/E 6100p Series (rev 03)
        Subsystem: Intel Corporation SSD Pro 7600p/760p/E 6100p Series [NVM Express]
        Kernel driver in use: nvme
        Kernel modules: nvme
```

Display all buses, bridges, devices and the connections between them as a tree (increase verbosity to include the names):

```
$ sudo lspci -vt
-[0000:00]-+-00.0  Intel Corporation Xeon E3-1200 v6/7th Gen Core Processor Host Bridge/DRAM Registers
           +-02.0  Intel Corporation UHD Graphics 620
           +-04.0  Intel Corporation Xeon E3-1200 v5/E3-1500 v5/6th Gen Core Processor Thermal Subsystem
           +-08.0  Intel Corporation Xeon E3-1200 v5/v6 / E3-1500 v5 / 6th/7th/8th Gen Core Processor Gaussian Mixture Model
           +-14.0  Intel Corporation Sunrise Point-LP USB 3.0 xHCI Controller
           +-14.2  Intel Corporation Sunrise Point-LP Thermal subsystem
           +-16.0  Intel Corporation Sunrise Point-LP CSME HECI #1
           +-1c.0-[01]----00.0  NVIDIA Corporation GP108M [GeForce MX150]
           +-1c.6-[03]----00.0  Intel Corporation Wireless 8265 / 8275
           +-1d.0-[04-3c]----00.0-[05-3c]--+-00.0-[06]----00.0  Intel Corporation JHL6240 Thunderbolt 3 NHI (Low Power) [Alpine Ridge LP 2016]
           |                               +-01.0-[07-3b]--
           |                               \-02.0-[3c]----00.0  Intel Corporation JHL6240 Thunderbolt 3 USB 3.1 Controller (Low Power) [Alpine Ridge LP 2016]
           +-1d.2-[3d]----00.0  Intel Corporation SSD Pro 7600p/760p/E 6100p Series
           +-1f.0  Intel Corporation Sunrise Point LPC Controller/eSPI Controller
           +-1f.2  Intel Corporation Sunrise Point-LP PMC
           +-1f.3  Intel Corporation Sunrise Point-LP HD Audio
           +-1f.4  Intel Corporation Sunrise Point-LP SMBus
           \-1f.6  Intel Corporation Ethernet Connection (4) I219-LM
```

Increase the verbosity by adding up to three `v`s:

```
$ sudo lspci -v
$ sudo lspci -vv
$ sudo lspci -vvv
```

Show kernel modules for each device:

```
$ sudo lspci -k | tail
        Kernel driver in use: thunderbolt
        Kernel modules: thunderbolt
3c:00.0 USB controller: Intel Corporation JHL6240 Thunderbolt 3 USB 3.1 Controller (Low Power) [Alpine Ridge LP 2016] (rev 01)
        Subsystem: Device 2222:1111
        Kernel driver in use: xhci_hcd
        Kernel modules: xhci_pci
3d:00.0 Non-Volatile memory controller: Intel Corporation SSD Pro 7600p/760p/E 6100p Series (rev 03)
        Subsystem: Intel Corporation SSD Pro 7600p/760p/E 6100p Series [NVM Express]
        Kernel driver in use: nvme
        Kernel modules: nvme
```

### `lsusb`

This [`lsusb`] utility comes from the [`usbutils`] package:

```
$ dpkg --search $(which lsusb)
usbutils: /usr/bin/lsusb
```

```
$ lsusb
Bus 004 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 003 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
Bus 002 Device 002: ID 0bda:0316 Realtek Semiconductor Corp. Card Reader
Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 001 Device 005: ID 06cb:009a Synaptics, Inc. Metallica MIS Touch Fingerprint Reader
Bus 001 Device 004: ID 5986:2113 Acer, Inc SunplusIT Integrated Camera
Bus 001 Device 003: ID 8087:0a2b Intel Corp. Bluetooth wireless interface
Bus 001 Device 002: ID 5986:1141 Acer, Inc Integrated IR Camera
Bus 001 Device 008: ID 047f:1200 Plantronics, Inc. Plantronics Calisto 7200
Bus 001 Device 006: ID 2386:432f Raydium Corporation Touch System
Bus 001 Device 009: ID 04d9:0169 Holtek Semiconductor, Inc. USB Keyboard
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
```

Here it is as a tree structure:

```
$ lsusb -t
/:  Bus 04.Port 1: Dev 1, Class=root_hub, Driver=xhci_hcd/2p, 10000M
/:  Bus 03.Port 1: Dev 1, Class=root_hub, Driver=xhci_hcd/2p, 480M
/:  Bus 02.Port 1: Dev 1, Class=root_hub, Driver=xhci_hcd/6p, 5000M
    |__ Port 3: Dev 2, If 0, Class=Mass Storage, Driver=usb-storage, 5000M
/:  Bus 01.Port 1: Dev 1, Class=root_hub, Driver=xhci_hcd/12p, 480M
    |__ Port 1: Dev 9, If 1, Class=Human Interface Device, Driver=usbhid, 1.5M
    |__ Port 1: Dev 9, If 0, Class=Human Interface Device, Driver=usbhid, 1.5M
    |__ Port 2: Dev 8, If 2, Class=Audio, Driver=snd-usb-audio, 12M
    |__ Port 2: Dev 8, If 0, Class=Audio, Driver=snd-usb-audio, 12M
    |__ Port 2: Dev 8, If 3, Class=Human Interface Device, Driver=usbhid, 12M
    |__ Port 2: Dev 8, If 1, Class=Audio, Driver=snd-usb-audio, 12M
    |__ Port 5: Dev 2, If 1, Class=Video, Driver=uvcvideo, 480M
    |__ Port 5: Dev 2, If 0, Class=Video, Driver=uvcvideo, 480M
    |__ Port 7: Dev 3, If 0, Class=Wireless, Driver=btusb, 12M
    |__ Port 7: Dev 3, If 1, Class=Wireless, Driver=btusb, 12M
    |__ Port 8: Dev 4, If 1, Class=Video, Driver=uvcvideo, 480M
    |__ Port 8: Dev 4, If 0, Class=Video, Driver=uvcvideo, 480M
    |__ Port 9: Dev 5, If 0, Class=Vendor Specific Class, Driver=, 12M
    |__ Port 10: Dev 6, If 0, Class=Human Interface Device, Driver=usbhid, 12M
```

Search by vendor ID and product ID:

```
$ lsusb -d 04d9:0169
Bus 001 Device 009: ID 04d9:0169 Holtek Semiconductor, Inc. USB Keyboard
```

And get more information:

```
$ sudo lsusb -vd 04d9:0169 | head
can't get debug descriptor: Resource temporarily unavailable

Bus 001 Device 009: ID 04d9:0169 Holtek Semiconductor, Inc. USB Keyboard
Device Descriptor:
  bLength                18
  bDescriptorType         1
  bcdUSB               1.10
  bDeviceClass            0
  bDeviceSubClass         0
  bDeviceProtocol         0
  bMaxPacketSize0         8
```

Search by bus number only:

```
$ lsusb -s 2:
Bus 002 Device 002: ID 0bda:0316 Realtek Semiconductor Corp. Card Reader
Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
```

Search by bus number and device number:

```
$ lsusb -s 1:4
Bus 001 Device 004: ID 5986:2113 Acer, Inc SunplusIT Integrated Camera
```

And then get more information about it (`-v`):

```
$ sudo lsusb -vs 1:4 | head

Bus 001 Device 004: ID 5986:2113 Acer, Inc SunplusIT Integrated Camera
Device Descriptor:
  bLength                18
  bDescriptorType         1
  bcdUSB               2.01
  bDeviceClass          239 Miscellaneous Device
  bDeviceSubClass         2
  bDeviceProtocol         1 Interface Association
  bMaxPacketSize0        64
```

> Note that when using the verbose flag (`-v`) that it's necessary to have escalated privileges (`sudo`).

## Service Management

### `SysV`

Managed by `/sbin/init`.

#### runlevels

Every runlevel has associated scripts in `/etc/rc[0-6].d/`, and each script is prefaces with an `S` (start) or a `K` (kill or stop).

Since one or more runlevel can have the same script (i.e, the same behavior), these scripts are just symlinks to the associated scripts in `/etc/init.d/`.

- runlevel 0
    + system shutdown
- runlevel 1
    + also, `s` or `single`
    + single user mode
    + no network and other non-essential capabilities (maintenance mode)
- runlevel 2, 3 or 4
    + multi-user mode
    + users can log in by console or network
    + runlevels 2 and 4 are not often used
- runlevel 5
    + multi-user mode
    + network and the graphical mode login
- runlevel 6
    + system restart

Runlevels can be changed using either `init` or [`telinit`].

Both of the following commands will change to single-user mode:

```
sudo init 1
sudo telinit 1
```

So, no need to reboot when changing runlevels.

The [`runlevel`] command will print the previous and current `SysV` runlevel:

```
$ runlevel
N 5
```

> Here, `N` means that it was booted into runlevel 5.  If it had been in a previous runlevel, the output would be something like `3 5`.

Reload daemon configuration every time `/etc/inittab` has been modified:

```
$ sudo telinit q
```

> This is equivalent to `systemctl daemon-reload`.

#### `/etc/inittab`

Runlevels are determined by a kernel parameter or in `/etc/inittab`:

A typical `/etc/inittab` looks like the following:

`/etc/inittab`

<pre class="math">
# Default runlevel
id:3:initdefault:

# Configuration script executed during boot
si::sysinit:/etc/init.d/rcS

# Action taken on runlevel S (single user)
~:S:wait:/sbin/sulogin

# Configuration for each execution level
l0:0:wait:/etc/init.d/rc 0
l1:1:wait:/etc/init.d/rc 1
l2:2:wait:/etc/init.d/rc 2
l3:3:wait:/etc/init.d/rc 3
l4:4:wait:/etc/init.d/rc 4
l5:5:wait:/etc/init.d/rc 5
l6:6:wait:/etc/init.d/rc 6

# Action taken upon ctrl+alt+del keystroke
ca::ctrlaltdel:/sbin/shutdown -r now

# Enable consoles for runlevels 2 and 3
1:23:respawn:/sbin/getty tty1 VC linux
2:23:respawn:/sbin/getty tty2 VC linux
3:23:respawn:/sbin/getty tty3 VC linux
4:23:respawn:/sbin/getty tty4 VC linux

# For runlevel 3, also enable serial
# terminals ttyS0 and ttyS1 (modem) consoles
S0:3:respawn:/sbin/getty -L 9600 ttyS0 vt320
S1:3:respawn:/sbin/mgetty -x0 -D ttyS1
</pre>

> If `-a` is placed before the option at the line with `ctrlaltdel` in `/etc/inittab`, then users can restart the machine by pressing `Ctrl+Alt+Del`, but only for the users whitelisted in `/etc/shutdown.allow`.
>
>     # Action taken upon ctrl+alt+del keystroke
>     ca::ctrlaltdel:/sbin/shutdown -r now

### `systemd`

#### Services

Services are referred to as units by `systemd`.

There are seven types of units:

- service
- socket
- device
- mount
- automount
- target
- snapshot

The configuration files for every unit can be found in `/lib/systemd/system/`.

#### `systemctl`

`systemd` and its service manager are managed by [`systemctl`].

Its most common actions are:

- `systemctl start UNIT.service`
- `systemctl stop UNIT.service`
- `systemctl restart UNIT.service`
- `systemctl status UNIT.service`
- `systemctl is-active UNIT.service`
- `systemctl enable UNIT.service`
- `systemctl disable UNIT.service`
- `systemctl is-enabled UNIT.service`

`systemd` system targets are groupings of units that are managed as a single unit, akin to runlevels.  To manage them:

```
$ sudo systemctl isolate multi-user.target
or
$ sudo systemctl isolate runlevel3.target
```

> The `multi-user.target` unit, for example, combines all units required by the multi-user system environment. It is similar to the runlevel number 3 in a system utilizing `SysV`.
>
> Note the backwards-compatibility with `SysV`: `runlevel3.target`.  There is a similar runlevel target for each system target.

`systemd` does not, however, support the `/etc/inittab` file.  An analogous behavior in `systemd` would be to set a kernel parameter such as `systemd.unit=multi-user.target` or to make it permanent by changing the bootloader configuration.

Another way to change the system target is to modify the soft link `/etc/systemd/system/default.target`:

```
$ readlink -f /etc/systemd/system/default.target
/usr/lib/systemd/system/multi-user.target
$ ls -l /etc/systemd/system/default.target
lrwxrwxrwx 1 root root 37 Jan  2 17:38 /etc/systemd/system/default.target -> /lib/systemd/system/multi-user.target
$ systemctl get-default
multi-user.target
$ sudo systemctl set-default graphical.target
```

To see all available units and their state (i.e., `enabled`, `disabled`, `masked`, etc.):

```
$ systemctl list-unit-files
```

To restrict to a certain type:

```
systemctl list-unit-files --type=service
```

> The same can be done for listing the current units.  Simple `s/list-unit-files/list-units` in the two previous examples.

```
# systemctl suspend
# systemctl hibernate
# systemctl reboot
```

#### Mount Units

View all customized mount points:

```
$ systemctl -t mount list-units
```

Recall that [`systemd`] will create mount units for all mount points defined in [`/etc/fstab`].

However, when manually creating a mount point, `systemd` will also automatically generate a mount unit file, as well as create entries in the `/proc` pseudo-filesystem.

Check this out:

```
$ mkdir src targ
$ touch src/foo
$ sudo mount --bind src targ
$ mount
/dev/mapper/kilgore--trout--vg-root on /home/btoll/targ type ext4 (rw,relatime,errors=remount-ro)
$ systemctl -t mount list-units
  UNIT                          LOAD   ACTIVE SUB     DESCRIPTION
  -.mount                       loaded active mounted Root Mount
  boot-efi.mount                loaded active mounted /boot/efi
  boot.mount                    loaded active mounted /boot
  dev-hugepages.mount           loaded active mounted Huge Pages File System
  dev-mqueue.mount              loaded active mounted POSIX Message Queue File System
  home-btoll-targ.mount         loaded active mounted /home/btoll/targ
  ...
$ cat /proc/self/mountinfo
...
586 29 253:1 /home/btoll/src /home/btoll/targ rw,relatime shared:1 - ext4 /dev/mapper/kilgore--trout--vg-root rw,errors=remount-ro
$ cat /proc/self/mounts
...
/dev/mapper/kilgore--trout--vg-root /home/btoll/targ ext4 rw,relatime,errors=remount-ro 0 0
```

Of course, they are removed when the mount point is unmounted.

#### Powering Off

All of the following can be use to power off the system:

- `halt`
- `poweroff`
- `shutdown`
    + `shutdown [option] time [message]`
    + all processes receive `SIGTERM` and then `SIGKILL`
    + if neither `-r` or `-h` is given, it will change to runlevel 1 (single-user mode)
    + its `message` parameter gets sent to all terminals of logged-in users
- `systemctl isolate halt`
- `systemctl isolate poweroff`

Also, note that all of the following are soft links to `/usr/bin/systemctl`:

```
$ readlink -f /usr/sbin/{halt,poweroff,shutdown,reboot}
/usr/bin/systemctl
/usr/bin/systemctl
/usr/bin/systemctl
/usr/bin/systemctl
```

### `Upstart`

Developed by Ubuntu to parallelize the system initialization process, Ubuntu stopped using `Upstart` in 2015.

Initialization scripts are in `/etc/init/`.

List services, their state, and, if possible, the PID:

```
# initctl list
```

Initiate a sixth virtual terminal:

```
# start tty6
```

And get its current state:

```
# status tty6
```

Stop it:

```
# stop tty6
```

> `Upstart` does not support `/etc/inittab`, but it does support `init` and `telinit`.

## Kernel Ring Buffer

Dump the kernel [ring buffer] to view the system initialization logs.

### [`dmesg`]

- list all initialization logs:
    + `dmesg`
- tail the kernel ring buffer:
    + `dmesg -w` or `dmesg --follow`

### [`journalctl`]

- list all initialization logs:
    + `journalctl -k` or `journalctl --dmesg`
- tail the kernel ring buffer:
    + `journalctl --dmesg --follow`

> Note that you can do more interesting stuff with `journalctl` such as view recent boot logs:
>
>   `journalctl --list-boots`   # list all boots
>   `journalctl --boot=0`       # the last boot
>   `journalctl --boot=2`       # the second-to-last boot

# References

- [LPIC-1 Objectives V5.0](https://wiki.lpi.org/wiki/LPIC-1_Objectives_V5.0)
- [LPIC-1 Learning Materials](https://learning.lpi.org/en/learning-materials/101-500/)
- [filesystems(5)](https://www.man7.org/linux/man-pages/man5/filesystems.5.html)
- [proc(5)](https://man7.org/linux/man-pages/man5/proc.5.html)
- [Filesystem Hierarchy Standard](https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard)
- [Persistent block device naming (Arch linux docs)](https://wiki.archlinux.org/title/Persistent_block_device_naming)
- [Difference Between Sourcing and Executing a Shell Script](https://www.baeldung.com/linux/sourcing-vs-executing-shell-script)

[LPIC-1]: https://www.lpi.org/our-certifications/lpic-1-overview
[Topic 101: System Architecture]: https://learning.lpi.org/en/learning-materials/101-500/101/
[LPIC-1 Exam 101]: https://www.lpi.org/our-certifications/exam-101-objectives
[`systemd`]: https://systemd.io/
[`/etc/fstab`]: https://man7.org/linux/man-pages/man5/fstab.5.html
[World Wide Name]: https://en.wikipedia.org/wiki/World_Wide_Name
[`udev`]: https://en.wikipedia.org/wiki/Udev
[`mke2fs`]: https://www.man7.org/linux/man-pages/man8/mke2fs.8.html
[`PCI`]: https://en.wikipedia.org/wiki/Peripheral_Component_Interconnect
[`UID`]: https://en.wikipedia.org/wiki/Unique_identifier
[`tune2fs`]: https://man7.org/linux/man-pages/man8/tune2fs.8.html
[ISA]: https://en.wikipedia.org/wiki/Direct_memory_access#ISA
[DMA]: https://en.wikipedia.org/wiki/Direct_memory_access
[`mount`]: https://man7.org/linux/man-pages/man8/mount.8.html
[`mkswap`]: https://man7.org/linux/man-pages/man8/mkswap.8.html
[`swapon`]: https://man7.org/linux/man-pages/man8/swapon.8.html
[`swapoff`]: https://man7.org/linux/man-pages/man8/swapoff.8.html
[`insmod`]: https://www.man7.org/linux/man-pages/man8/insmod.8.html
[`modprobe`]: https://man7.org/linux/man-pages/man8/modprobe.8.html
[`rmmod`]: https://man7.org/linux/man-pages/man8/rmmod.8.html
[`modinfo`]: https://man7.org/linux/man-pages/man8/modinfo.8.html
[`lsmod`]: https://man7.org/linux/man-pages/man8/lsmod.8.html
[ring buffer]: https://en.wikipedia.org/wiki/Circular_buffer
[`telinit`]: https://man7.org/linux/man-pages/man8/telinit.8.html
[`runlevel`]: https://man7.org/linux/man-pages/man8/runlevel.8.html
[`systemctl`]: https://man7.org/linux/man-pages/man1/systemctl.1.html
[`dmesg`]: https://man7.org/linux/man-pages/man1/dmesg.1.html
[`journalctl`]: https://man7.org/linux/man-pages/man1/journalctl.1.html
[the kernel's command-line parameters]: https://www.kernel.org/doc/html/v4.14/admin-guide/kernel-parameters.html
[zombie]: https://en.wikipedia.org/wiki/Zombie_process
[`free`]: https://man7.org/linux/man-pages/man1/free.1.html
[when creating `udev` rules]: https://opensource.com/article/18/11/udev
[`lsblk`]: https://man7.org/linux/man-pages/man8/lsblk.8.html
[RAM disks]: https://en.wikipedia.org/wiki/RAM_drive
[`sysfs`]: https://man7.org/linux/man-pages/man5/sysfs.5.html
[`udev db`]: https://unix.stackexchange.com/questions/666954/where-is-the-udev-database-stored-and-what-sets-the-permission
[PCI Express bus]: https://en.wikipedia.org/wiki/PCI_Express
[only fools use Docker]: /2022/02/04/on-running-systemd-nspawn-containers/
[`/etc/group`]: https://man7.org/linux/man-pages/man5/group.5.html
[`/etc/gshadow`]: https://man7.org/linux/man-pages/man5/gshadow.5.html
[`usermod`]: https://man7.org/linux/man-pages/man8/usermod.8.html
[`chgrp`]: https://man7.org/linux/man-pages/man1/chgrp.1.html
[`lscpu`]: https://man7.org/linux/man-pages/man1/lscpu.1.html
[`util-linux`]: https://sources.debian.org/src/util-linux/
[`blkid`]: https://man7.org/linux/man-pages/man8/blkid.8.html
[`lsdev`]: https://linux.die.net/man/8/lsdev
[`procinfo`]: https://sources.debian.org/src/procinfo/
[`lspci`]: https://man7.org/linux/man-pages/man8/lspci.8.html
[`pciutils`]: https://sources.debian.org/src/pciutils/
[`lsusb`]: https://man7.org/linux/man-pages/man8/lsusb.8.html
[`usbutils`]: https://sources.debian.org/src/usbutils/
[`UUID`]: https://en.wikipedia.org/wiki/Universally_unique_identifier
[`LVM`]: ttps://en.wikipedia.org/wiki/Logical_Volume_Manager_%28Linux%29
[`man lvchange`]: https://www.man7.org/linux/man-pages/man8/lvchange.8.html
[MAC addresses]: https://en.wikipedia.org/wiki/MAC_address
[`GPT`]: https://en.wikipedia.org/wiki/GUID_Partition_Table
[`EFI`]: https://en.wikipedia.org/wiki/EFI_system_partition
[List of filesystem partition type codes.]: https://linuxconfig.org/list-of-filesystem-partition-type-codes
[`SHLVL`]: https://www.gnu.org/software/bash/manual/html_node/Bash-Variables.html
[`BIOS`]: https://en.wikipedia.org/wiki/BIOS
[`GRUB`]: https://www.gnu.org/software/grub/
[GNU Project]: https://www.gnu.org/
[symlinked]: /2022/09/25/on-hard-and-soft-links/
[Arch Linux]: https://archlinux.org/
[MBR]: https://en.wikipedia.org/wiki/Master_boot_record
[chain loading]: https://en.wikipedia.org/wiki/Chain_loading
[each partition entry taking 16 bytes]: https://en.wikipedia.org/wiki/Master_boot_record#PT
[`grub-install`]: https://www.gnu.org/software/grub/manual/grub/html_node/Installing-GRUB-using-grub_002dinstall.html
[`GRUB` Legacy on Wikipedia.]: https://en.wikipedia.org/wiki/GNU_GRUB#Version_0_(GRUB_Legacy)
[`GRUB2` on Wikipedia.]: https://en.wikipedia.org/wiki/GNU_GRUB#Version_2_(GRUB_2)
[device mapper]: https://en.wikipedia.org/wiki/Device_mapper
[`nice`]: https://man7.org/linux/man-pages/man1/nice.1.html
[`renice`]: https://man7.org/linux/man-pages/man1/renice.1.html
[Firefox web containers]: https://hacks.mozilla.org/2021/05/introducing-firefox-new-site-isolation-security-architecture/
[`Btrfs`]: https://man7.org/linux/man-pages/man8/btrfs-filesystem.8.html
[`COW`]: https://en.wikipedia.org/wiki/Copy-on-write
[`LZO`]: https://en.wikipedia.org/wiki/Lempel%E2%80%93Ziv%E2%80%93Oberhumer
[`zlib`]: https://en.wikipedia.org/wiki/Zlib
[`zstd`]: https://en.wikipedia.org/wiki/Zstd
[`mkfs.btrfs`]: https://man7.org/linux/man-pages/man8/mkfs.btrfs.8.html
[`btrfs-subvolume`]: https://man7.org/linux/man-pages/man8/btrfs-subvolume.8.html
[`btrfstune`]: https://man7.org/linux/man-pages/man8/btrfstune.8.html
[Extended filesystem]: https://en.wikipedia.org/wiki/Extended_file_system
[`ext2`]: https://en.wikipedia.org/wiki/Ext2
[`ext3`]: https://en.wikipedia.org/wiki/Ext3
[`ext4`]: https://en.wikipedia.org/wiki/Ext4
[`inodes`]: /2019/11/19/on-inodes/
[B-tree]: https://en.wikipedia.org/wiki/B-tree
[`xfs_admin`]: https://man7.org/linux/man-pages/man8/xfs_admin.8.html
[`xfs_fsr`]: https://man7.org/linux/man-pages/man8/xfs_fsr.8.html
[`xfs_db`]: https://www.man7.org/linux/man-pages/man8/xfs_db.8.html
[`dpkg`]: https://www.man7.org/linux/man-pages/man1/dpkg.1.html
[`apt`]: https://linux.die.net/man/8/apt
[`apt-file`]: https://manpages.debian.org/buster/apt-file/apt-file.1.en.html
[`rpm`]: https://www.man7.org/linux/man-pages/man8/rpm.8.html
[`rpm2cpio`]: https://man7.org/linux/man-pages/man8/rpm2cpio.8.html
[`cpio`]: https://linux.die.net/man/1/cpio
[`glibc`]: https://www.gnu.org/software/libc/
[`libcrypt`]: https://en.wikipedia.org/wiki/Libgcrypt
[`libcurl`]: https://curl.se/libcurl/
[`ld.so`]: https://man7.org/linux/man-pages/man8/ld.so.8.html
[`ldconfig`]: https://man7.org/linux/man-pages/man8/ldconfig.8.html
[`LD_LIBRARY_PATH`]: https://man7.org/linux/man-pages/man8/ld.so.8.html#ENVIRONMENT
[`ELF`]: https://en.wikipedia.org/wiki/Executable_and_Linkable_Format
[`dpkg-query`]: https://man7.org/linux/man-pages/man1/dpkg-query.1.html
[`apt-get`]: https://linux.die.net/man/8/apt-get
[`apt-cache`]: https://linux.die.net/man/8/apt-cache

