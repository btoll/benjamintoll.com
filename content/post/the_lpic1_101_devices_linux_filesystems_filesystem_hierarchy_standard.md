+++
title = "On the LPIC-1 Exam 101: Devices, Linux Filesystems, FHS"
date = "2023-01-20T00:25:10-05:00"

+++

This is a riveting series:

- [On the LPIC-1 Exam 101: System Architecture](/2023/01/13/on-the-lpic-1-exam-101-system-architecture/)
- [On the LPIC-1 Exam 101: Linux Installation and Package Management](/2023/01/15/on-the-lpic-1-exam-101-linux-installation-and-package-management/)
- [On the LPIC-1 Exam 101: GNU and Unix Commands](/2023/01/18/on-the-lpic-1-exam-101-gnu-and-unix-commands/)
- On the LPIC-1 Exam 101: Devices, Linux Filesystems, FHS

---

When studying for the Linux Professional Institute [LPIC-1] certification, I took a bunch of notes when reading the docs and doing an online course.  Note that this is not exhaustive, so do not depend on this article to get you prepared for the exam.

The menu items below are not in any order.

This roughly covers [Topic 104: Devices, Linux Filesystems, Filesystem Hierarchy Standard].  There is also extra stuff in here that may not be covered by the exam.  Deal with it, tiger.

*Caveat emptor*.

---

- [Exam Details](#exam-details)
- [Topic 104: Devices, Linux Filesystems, Filesystem Hierarchy Standard](#topic-104-devices-linux-filesystems-filesystem-hierarchy-standard)
    + [Disk Partitioning](#disk-partitioning)
        - [`MBR`](#mbr)
        - [`GPT`](#gpt)
        - [`EFI`](#efi)
        - [Partitioning Tools](#partitioning-tools)
        - [`swap`](#swap)
    + [Kernel Modules](#kernel-modules)
    + [Persistent Block Device Naming](#persistent-block-device-naming)
        - [`/dev/disk/by-id`](#devdiskby-id)
        - [`/dev/disk/by-label`](#devdiskby-label)
        - [`/dev/disk/by-path`](#devdiskby-path)
        - [`/dev/disk/by-uuid`](#devdiskby-uuid)
    + [Users and Groups](#users-and-groups)
    + [`/proc`](#proc)
        - [`/proc/cpuinfo`](#proccpuinfo)
        - [`/proc/devices`](#procdevices)
        - [`/proc/dma`](#procdma)
        - [`/proc/cmdline`](#proccmdline)
        - [`/proc/filesystems`](#procfilesystems)
        - [`/proc/interrupts`](#procinterrupts)
        - [`/proc/ioports`](#procioports)
        - [`/proc/meminfo`](#procmeminfo)
        - [`/proc/partitions`](#procpartions)
    + [Sourcing a Bash Script](#sourcing-a-bash-script)
    + [Filesystems](#filesystems)
        - [Display Filesystem Information](#display-filesystem-information)
        - [Display Inodes Information and Usage](#display-inodes-information-and-usage)
        - [Filesystem Partition Type Codes](#filesystem-partition-type-codes)
        - [`fsck`](#fsck)
        - [Mounting and Unmounting](#mounting-and-unmounting)
            + [`/etc/fstab`](#etcfstab)
            + [`systemd`](#systemd)
        - [`btrfs`](#btrfs)
        - [`ext`](#ext)
        - [`xfs`](#xfs)
        - [`fat`](#fat)
        - [`exfat`](#exfat)
    + [Permissions](#permissions)
        - [Modes](#modes)
        - [`umask`](#umask)
        - [Special Permissions](#special-permissions)
    + [Filesystem Hierarchy Standard](#filesystem-hierarchy-standard)
- [Summary](#summary)
- [References](#references)

---

# Exam Details

[LPIC-1 Exam 101]

- Exam Objectives Version: 5.0
- Exam Code: 101-500

# Topic 104: Devices, Linux Filesystems, Filesystem Hierarchy Standard

## Disk Partitioning

In [Topic 102: Linux Installation and Package Management] we covered the `GRUB Legacy` and `GRUB2` [bootloaders], and the following sections will have some overlap with that information.

### [`MBR`]

The master boot record ([`MBR`]) goes back to the early days of `MS-DOS` (1983).  It is stored on the first sector of the disk, called the boot sector, and was the standard partitioning scheme for decades.

The master boot record stores both the partition table and a boot loader, which in Linux is most likely going to be [`GRUB Legacy`] or [`GRUB2`].

It has serious limitations, in that it only supports partitions of around 2.2 TB in size, and support for only four primary partitions.

This partitioning scheme is commonly found on machines that are still using the older [`BIOS`] firmware.

### [`GPT`]

### [`EFI`]

### Partitioning Tools

- [`fdisk`]
- [`gdisk`]
- [`parted`]

### [`swap`]

Create a `swap` partition using the aforementioned utilities:

- `fdisk`
    + in the tool, select the `t` command, select the partition and change its type to `82`
- `gdisk`
    + in the tool, select the `t` command, select the partition and change its type to `8200`
- `parted`
    + in the tool, use `linux-swap` as the filesystem type:
        - `(parted) mkpart primary linux-swap 301m 800m`

Once the partition is created, [`mkswap`] must be called with the device as an argument to create it as a special swap partition:

```
# mkswap /dev/sda2
```

Finally, enable it with [`swapon`]:

```
# swapon /dev/sda2
```

To disable:

```
# swapoff /dev/sda2
```

> To create a swap file, do the following steps:
>
> ```
> # dd if=/dev/zero of=foo_swap bs=1M count=1024
> # mkswap foo_swap
> # swapon foo_swap
> ```
>
> This will create a swap file of size 1 GB (data block size 1 MB * count 1024).
>
> Note that both `mkswap` and `swapon` will complain if the correct permissions aren't set on the swap file.  The permissions should be `0600`, with `root` being both the owner and the group.

## Kernel Modules

The system's kernel modules can be found in `/lib/modules`.  The installed modules for the current kernel are in `/lib/modules/$(uname -r)/`.

For example:

```
$ ls /lib/modules/$(uname -r)
build   modules.alias      modules.builtin.alias.bin  modules.dep      modules.order    modules.symbols.bin
kernel  modules.alias.bin  modules.builtin.bin        modules.dep.bin  modules.softdep  source
misc    modules.builtin    modules.builtin.modinfo    modules.devname  modules.symbols
```

The following utilities act as frontends to read hardware information exposed by the kernel in the `/proc` and `/sys` pseudo-filesystems (i.e., they only exist when the system is running).

- installing
    + [`insmod`]
    + [`modprobe`] (also installs dependencies)

- removing
    + [`rmmod`]
    + `modprobe -r` (also removes dependencies)

- get info
    + [`modinfo`]
    + customized parameters for a module can be persisted by putting them in `/etc/modprobe.d/`

- listing
    + [`lsmod`]

- blacklisting
    + prevent individual modules from being loaded in `/etc/modprobe.d/blacklist.conf`
    + on its own line: `blacklist MODULE_NAME`
    + or, create its own file specific to the module
        -  `/etc/modprobe.d/MODULE_NAME.conf`

## Persistent Block Device Naming

> Note that from Linux kernel version 2.4 on that most storage devices are identified as `SCSI` devices, regardless of hardware type.
>
> This means that `IDE`, `SSD` and `USB` block devices will all be prefixed by `sd` (ex., `/dev/sdb`).

[`udev`] is the device manager daemon for the Linux kernel.  Among other things, it captures events from the kernel and will dynamically create and remove directory entries as it identifies the device in the following locations as devices are hot-plugged into and removed from a running system.

Depending on the `udev` rules and metadata stored on the particular device itself, all the locations may not get an entry when a device is detected by `udev`.

> `udev` relies on `/sys` for its information.

So, what's the use of these directories?  Understand that the kernel will name devices and create device files for them in `/dev` based on the order that they are plugged in, so you cannot depend on these names.  Even devices that are cold-plugged, such as disk drives, may have their corresponding device nodes added in an arbitrary order, so `/dev/sda` may become `dev/sdb` on the next boot.

One of the design goals of `udev` was to allow for persisting naming based on different factors such as `UUID`s and disk labels, et al., and the dynamically created directories in `/dev/disk` correspond to these persistent naming patterns.

Use either [`lsblk`] or [`blkid`] to view this information.

> There are two additional schemes that can be used with disks that are partitioned with `GPT`:
>
> - `by-partlabel`
> - `by-partuuid`
>
> They are not covered in this article.
>
> Note that for `GPT`, it's better to view the node information with `blkid` rather than `lsblk`, which displays these additional persistent naming schemes.

### `/dev/disk/by-id`

Automatically generated, when a device is handled by `udev`, entries in the `by-id` directory are given a unique name depending on the hardware serial number, unless they are logical volumes.  The latter will have already been give a unique name, so this can be used in place of an `id` given to it by the kernel.

The names will contain strings that indicate to which subsystem they belong.  For instance, in the example below, the entries contain both `ata-` and `wwn-` strings.  The `ata-` can refer to either a `SATA` or `PATA` HDD (in this case, I know they are they former).

Interesting, the block devices are also given a [World Wide Name] reference, as well.  Either one of these persistent names can be used to refer to the disk and partitions, for example, in [`/etc/fstab`].

```
$ ls -l /dev/disk/by-id
total 0
341 lrwxrwxrwx 1 root root  9 Jan 13 16:28 ata-WDC_WDS250G2B0B-00YS70_175169801376 -> ../../sda
351 lrwxrwxrwx 1 root root 10 Jan 13 16:28 ata-WDC_WDS250G2B0B-00YS70_175169801376-part1 -> ../../sda1
343 lrwxrwxrwx 1 root root 10 Jan 13 16:28 ata-WDC_WDS250G2B0B-00YS70_175169801376-part2 -> ../../sda2
340 lrwxrwxrwx 1 root root  9 Jan 13 16:28 wwn-0x5001b448b68f88da -> ../../sda
355 lrwxrwxrwx 1 root root 10 Jan 13 16:28 wwn-0x5001b448b68f88da-part1 -> ../../sda1
348 lrwxrwxrwx 1 root root 10 Jan 13 16:28 wwn-0x5001b448b68f88da-part2 -> ../../sda2
```

Example using [`LVM`]:

```
$ ls -l /dev/disk/by-id/
total 0
308 lrwxrwxrwx 1 root root 10 Jan 13 19:55 dm-name-kilgore--trout--vg-root -> ../../dm-1
305 lrwxrwxrwx 1 root root 10 Jan 13 19:55 dm-name-kilgore--trout--vg-swap_1 -> ../../dm-2
293 lrwxrwxrwx 1 root root 10 Jan 13 19:55 dm-name-nvme0n1p3_crypt -> ../../dm-0
...
```

### `/dev/disk/by-label`

Not all filesystems will have a label, which can be set on creation (ex. [`make2fs`]) and afterwards when tuning (ex. [`tune2fs`]).

There are some rules to adhere to when creating labels, such as they must be unambiguous to prevent naming collisions and they can be up to 16 characters long.

```
$ ls -l /dev/disk/by-label
total 0
lrwxrwxrwx 1 root root 10 May 27 23:31 Data -> ../../sda3
$ lsblk -dno LABEL /dev/sda3
Data
$ sudo blkid -s LABEL -o value /dev/sda3
Data
```

> Remember, your disks may not have been formatted with a label, so your system may not have this directory in `/dev/disk/`.

### `/dev/disk/by-path`

Like `by-id`, `by-path` entries are automatically created by `udev`, but their names are dependent upon the shortest physical path on the [`PCI`] bus.

```
$ ls -l /dev/disk/by-path/
total 0
lrwxrwxrwx 1 root root  9 Jan 13 19:55 pci-0000:00:14.0-usb-0:3:1.0-scsi-0:0:0:0 -> ../../sda
lrwxrwxrwx 1 root root 13 Jan 13 19:55 pci-0000:3d:00.0-nvme-1 -> ../../nvme0n1
lrwxrwxrwx 1 root root 15 Jan 13 19:56 pci-0000:3d:00.0-nvme-1-part1 -> ../../nvme0n1p1
lrwxrwxrwx 1 root root 15 Jan 13 19:56 pci-0000:3d:00.0-nvme-1-part2 -> ../../nvme0n1p2
lrwxrwxrwx 1 root root 15 Jan 13 19:55 pci-0000:3d:00.0-nvme-1-part3 -> ../../nvme0n1p3
```

Note that the first column of information from the [`lspci`](#lscpi) command can be used to identify the corresponding entry in the `by-path` directory:

```
$ sudo lspci
...
00:14.0 USB controller: Intel Corporation Sunrise Point-LP USB 3.0 xHCI Controller (rev 21)
...
3d:00.0 Non-Volatile memory controller: Intel Corporation SSD Pro 7600p/760p/E 6100p Series (rev 03)
```

### `/dev/disk/by-uuid`

When the devices are formatted, a `UUID` is created by the filesystem utility (ex. `mkfs.*) to ensure that there are no collisions (or, at least unlikely).

FAT, exFAT and NTFS filesystems don't support `UUID`s and get a shorter unique identifier ([`UID`]).

```
$ lsblk -o NAME,UUID
NAME                            UUID
nvme0n1
├─nvme0n1p1                     892E-F9C9
├─nvme0n1p2                     400bebc0-1270-4c2c-9c0b-255d3e1143e4
└─nvme0n1p3                     c1334d3a-d586-49ee-b8a9-37a2a36da46c
  └─nvme0n1p3_crypt             DIjCje-JxlM-HL0D-9BqL-puZl-x34V-dDFL8U
    ├─kilgore--trout--vg-root   6d4a9ce3-9412-4261-b873-974c29447e79
    └─kilgore--trout--vg-swap_1 3d46ebcb-fd6c-4a94-8f1d-1a945cb4b7ae
$
$ sudo blkid -s UUID -o value /dev/nvme0n1p3
c1334d3a-d586-49ee-b8a9-37a2a36da46c
```

`UUID`s are nice because, unlike labels, they are automatically generated when the device is formatted.  Additionally, since a `UUID` is by design globally unique, you can plug the block device into another machine without any collision.  This is in contrast with labels, which are much more inclined to be non-unique, even between systems (because humans are predictable, of course).

## Users and Groups

### Users

Print effective ID:

```
$ id -u
1000
```

Print effective user name:

```
$ id -nu
btoll
```

Don't list group information:

```
$ touch furd
$ sudo chown :root furd
$
$ ls -o
total 0
-rw-r--r-- 1 btoll 0 Jan 15 14:19 furd
```

Add a user to a group ([`usermod`]):

```
$ sudo usermod -a -G new_group btoll
```

Remove a user from a group:

```
$ sudo gpasswd -d btoll poop
Removing user btoll from group poop
gpasswd: user 'btoll' is not a member of 'poop'
```

### Groups

Print the effective group ID:

```
$ id -g
1000
```

Print the effective group name:

```
$ id -gn
btoll
```

Display the user's groups by ID and name, respectively:

```
$ id -G
1000 24 25 27 29 30 44 46 108 114 121 124
$ id -Gn
btoll cdrom floppy sudo audio dip video plugdev netdev bluetooth lpadmin scanner
```

> Note that I don't belong to the `docker` group, because [only fools use Docker].

Do not list owner information:

```
$ touch furd
$ sudo chown :root furd
$
$ ls -g
total 0
-rw-r--r-- 1 root 0 Jan 15 14:19 furd
```

Display the groups to which a user belongs:

```
$ groups
btoll cdrom floppy sudo audio dip video plugdev netdev bluetooth lpadmin scanner nordvpn
```

Print out the groups on the system:

```
$ head -5 /etc/group
root:x:0:
daemon:x:1:
bin:x:2:
sys:x:3:
adm:x:4:
```

Delete a group:

```
$ sudo groupdel poop
Removing group `poop' ...
Done.
$ getent group | ag poop
$
```

> This removes the group from both the [`/etc/group`] and [`/etc/gshadow`] files.

Change the group to which a file belongs ([`chgrp`]):

```
$ sudo chgrp GROUP FILENAME
```

## `/proc`

### `/proc/cpuinfo`

Outputs CPU and system architecture dependent information.  There is a different list for each supported architecture.  [`lscpu`](#lscpu) gets information from this file.

```
$ cat /proc/cpuinfo
processor       : 0
vendor_id       : GenuineIntel
cpu family      : 6
model           : 142
model name      : Intel(R) Core(TM) i7-8650U CPU @ 1.90GHz
stepping        : 10
microcode       : 0xf0
cpu MHz         : 814.882
cache size      : 8192 KB
physical id     : 0
siblings        : 8
core id         : 0
cpu cores       : 4
apicid          : 0
initial apicid  : 0
fpu             : yes
fpu_exception   : yes
cpuid level     : 22
wp              : yes
flags           : fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush dts acpi mmx fxsr sse sse2 ss ht tm pbe syscall nx pdpe1gb rdtscp lm constant_tsc art arch_perfmon pebs bts rep_good nopl xtopology nonstop_tsc cpuid aperfmperf pni pclmulqdq dtes64 monitor ds_cpl vmx smx est tm2 ssse3 sdbg fma cx16 xtpr pdcm pcid sse4_1 sse4_2 x2apic movbe popcnt tsc_deadline_timer aes xsave avx f16c rdrand lahf_lm abm 3dnowprefetch cpuid_fault epb invpcid_single pti ssbd ibrs ibpb stibp tpr_shadow vnmi flexpriority ept vpid ept_ad fsgsbase tsc_adjust bmi1 hle avx2 smep bmi2 erms invpcid rtm mpx rdseed adx smap clflushopt intel_pt xsaveopt xsavec xgetbv1 xsaves dtherm ida arat pln pts hwp hwp_notify hwp_act_window hwp_epp md_clear flush_l1d arch_capabilities
vmx flags       : vnmi preemption_timer invvpid ept_x_only ept_ad ept_1gb flexpriority tsc_offset vtpr mtf vapic ept vpid unrestricted_guest ple shadow_vmcs pml ept_mode_based_exec
bugs            : cpu_meltdown spectre_v1 spectre_v2 spec_store_bypass l1tf mds swapgs taa itlb_multihit srbds mmio_stale_data retbleed
bogomips        : 4199.88
clflush size    : 64
cache_alignment : 64
address sizes   : 39 bits physical, 48 bits virtual
power management:

...
```

Note that the `flags` value is often used to determine if the CPU supports hardware virtualization.

### `/proc/devices`

From the man page:

> Text listing of major numbers and device groups.  This can be used by `MAKEDEV` scripts for consistency with the kernel.

```
$ cat /proc/devices
Character devices:
  1 mem
  4 /dev/vc/0
  4 tty
  4 ttyS
  5 /dev/tty
  5 /dev/console
  5 /dev/ptmx
  6 lp
  7 vcs
 10 misc
 13 input
 21 sg
 29 fb
 81 video4linux
 99 ppdev
116 alsa
...
```

### `/proc/dma`

This is a list of the registered [ISA] direct memory access ([DMA]) channels in use.  It shows the channels that send data directly to memory without having to access the CPU.

```
$ cat /proc/dma
 4: cascade
```

### `/proc/cmdline`

This file contains [the kernel's command-line parameters] passed from the bootloader to the kernel on boot:

```
$ cat /proc/cmdline
BOOT_IMAGE=/vmlinuz-5.10.0-20-amd64 root=/dev/mapper/kilgore--trout--vg-root ro quiet
```

> Note that all child processes also have a `cmdline` file in their `PID` subtree.  For example:
>
> ```
> $ cat /proc/$$/cmdline
> -bash$
> $ cat /proc/$(pgrep -u btoll vim)/cmdline
> vimcontent/post/lpic1.md$
> ```
>
> > If the process is a [zombie], there is nothing in this file: that is, a read on this file will return 0 characters.
> >
> > Note that the command-line arguments appear in this file as a set of strings separated by null bytes ('\0'), with a further null byte after the last string, which is why the strings are not space delimited and the command prompt (`$`) appears to be directly to the file contents in the examples above.

### `/proc/filesystems`

The filesystems which are supported by the kernel, that is, the filesystems which were compiled into the kernel or whose kernel modules are currently loaded.

If a filesystem is marked with "nodev", this means that it does not require a block device to be mounted (e.g., virtual filesystem, network filesystem).

> This is one of the locations searched by [`mount`] if the `-t` option isn't provided when mounting a directory.

```
$ cat /proc/filesystems
nodev   sysfs
nodev   tmpfs
nodev   bdev
nodev   proc
nodev   cgroup
nodev   cgroup2
nodev   cpuset
nodev   devtmpfs
nodev   debugfs
nodev   tracefs
nodev   securityfs
nodev   sockfs
nodev   bpf
nodev   pipefs
nodev   ramfs
nodev   hugetlbfs
nodev   devpts
nodev   mqueue
nodev   pstore
        btrfs
        ext3
        ext2
        ext4
nodev   autofs
nodev   efivarfs
nodev   configfs
        fuseblk
nodev   fuse
nodev   fusectl
        vfat
```

### `/proc/interrupts`

The number of interrupts per IO device for each CPU:

```
$ head /proc/interrupts
            CPU0       CPU1       CPU2       CPU3       CPU4       CPU5       CPU6       CPU7
   1:      40542          0          0        258          0          0          0          0  IR-IO-APIC    1-edge      i8042
   8:          0          0          0          0          0          0          0          0  IR-IO-APIC    8-edge      rtc0
   9:     182053       1997          0          0          0          0          0          0  IR-IO-APIC    9-fasteoi   acpi
  12:         18          0        191          0          0          0          0          0  IR-IO-APIC   12-edge      i8042
  16:     671166          0          0          0          0          0          0       1572  IR-IO-APIC   16-fasteoi   i801_smbus
 120:          0          0          0          0          0          0          0          0  DMAR-MSI    0-edge      dmar0
 121:          0          0          0          0          0          0          0          0  DMAR-MSI    1-edge      dmar1
 122:          0          0          0          0          0          0          0          0  IR-PCI-MSI 458752-edge      PCIe PME
 123:          0          0          0          0          0          0          0          0  IR-PCI-MSI 471040-edge      PCIe PME
```

### `/proc/ioports`

This is a list of currently registered Input-Output port regions that are in use.  In other words, it's the memory locations through which the CPU and hardware devices send data back and forth to each other.

```
$ sudo cat /proc/ioports
0000-0cf7 : PCI Bus 0000:00
  0000-001f : dma1
  0020-0021 : pic1
  0040-0043 : timer0
  0050-0053 : timer1
  0060-0060 : keyboard
  0061-0061 : PNP0800:00
  0062-0062 : PNP0C09:00
    0062-0062 : EC data
  0064-0064 : keyboard
  0066-0066 : PNP0C09:00
    0066-0066 : EC cmd
  0070-0077 : rtc0
  0080-008f : dma page reg
  00a0-00a1 : pic2
  00c0-00df : dma2
  00f0-00ff : fpu
  0400-041f : iTCO_wdt
    0400-041f : iTCO_wdt
...
```

> Make sure you view this file as a privileged user.

### `/proc/meminfo`

Used by the [`free`] utility, it reports the statistics about the memory usage on a system.

```
$ head /proc/meminfo
MemTotal:       32623748 kB
MemFree:        19013216 kB
MemAvailable:   26498260 kB
Buffers:          313908 kB
Cached:          7845536 kB
SwapCached:            0 kB
Active:          1630880 kB
Inactive:       10168796 kB
Active(anon):       6816 kB
Inactive(anon):  4201716 kB
```

### `/proc/partitions`

Contains the major and minor numbers of each partition as well as the number of 1024-byte blocks and the partition name.

```
$ cat /proc/partitions
major minor  #blocks  name

 259        0  500107608 nvme0n1
 259        1     524288 nvme0n1p1
 259        2     499712 nvme0n1p2
 259        3  499082240 nvme0n1p3
 253        0  499065856 dm-0
 253        1  498020352 dm-1
 253        2     999424 dm-2
```

## Sourcing a Bash Script

[Sourcing] a Bash script doesn't create a subshell.  We can check this by printing the current value of the special Bash [`SHLVL`] environment variable that is incremented each time a new instance of the shell is started:

```
$ cat > shlvl.sh
#!/bin/bash

echo "$SHLVL"

$ chmod +x shlvl.sh
```

If we were to invoke this using the Bash program, it creates a subshell:

```
$ ./shlvl.sh
2
```

But not when it's sourced:

```
$ . shlvl.sh
1
```

This completely makes sense after thinking about it.  After all, we often source or `eval` a shell script to add/augment the symbols in the script (variables and functions) in the calling environment, since **it is executed in the same shell**.

> Here is a common example:
>
>     $ eval $(ssh-agent) && ssh-add

Weeeeeeeeeeeeeeeeeeee

## Filesystems

This section is just a very brief overview of common Linux filesystems and their common tools.

Common tools to help with gleaning information about filesystems:

- [`du`] - estimate file space usage
    + works at the file level
    + by default, will show only directory information, recursively
    + shows how many 1 KB blocks are being used by the current directory and its subdirectories
    + to also get information about files, use the `-a` (all) switch
    + `-c` to get a grand total
    + `-s` to get a summary
    + `-d` to control depth of search
    + use `--exclude` to filter
    + get the size of files, excluding directories
        - `du -hS`

- [`df`] - report file system disk space usage
    + works at the filesystem level
    + lists info about available, i.e., mounted, filesystems
    + use `-x` to exclude filesystems (don't show certain filesystem types)
        - `df -hx tmpfs` (don't show `tmpfs` filesystems)
    + only show `ext2` filesystems (`-t`)
        - `df -ht ext2`
    + customize the output (`--output`)
        - `df -h --output=target,source,fstype,pcent`

### Display Filesystem Information

- `blkid`
- `df -T`
    + prints the filesyste type (as another column)
- `lsblk -f`
- `cat /proc/filesystems` (shows kernel support)
    ```
    /dev/nvme0n1: DOS/MBR boot sector; partition 1 : ID=0xee, start-CHS (0x0,0,2), end-CHS (0x3ff,255,63), startsector 1, 1000215215 sectors, extended partition table (last)
    ```
- `sudo file -sL /dev/nvme0n1`
- `sudo fsck -N /dev/nvme0n1`
    ```
    fsck from util-linux 2.36.1
    [/usr/sbin/fsck.ext2 (1) -- /dev/nvme0n1] fsck.ext2 /dev/nvme0n1
    ```

### Display Inodes Information and Usage

- `df -ih` (entire system)
- `df -h --output=source,fstype,itotal,iused,ipcent`
- `du --inodes -h` (per directory)
- `ls -i`

### Display Summary of Disk Usage

```
$ sudo du -sh / 2> /dev/null
31G
$
$ sudo du -sh /boot
111M    /boot
```

### Filesystem Partition Type Codes

The most common ones, at least among the test questions I've seen.  The numbers are hexadecimal.

- [`GPT`]
    + `ee`
- [`EFI`]
    + `ef`
- swap
    + `82`
- `ext2`
    + `83`

[List of filesystem partition type codes.]

### `fsck`

The [`fsck`] tool will check and repair a Linux filesystem.  Note that it does not check the filesystem itself, it will call the appropriate tool based on the type of filesystem to check.

For example, for an `ext*` type filesystem, it will call [`e2fsck`].  Of course, you can call `e2fsck` or even `fsck.ext4` directly, although the latter is symlinked to the former:

```
$ ls -l /usr/sbin | ag fsck\.ext[2-4]
lrwxrwxrwx 1 root root         6 Jan  2 16:56 fsck.ext2 -> e2fsck
lrwxrwxrwx 1 root root         6 Jan  2 16:56 fsck.ext3 -> e2fsck
lrwxrwxrwx 1 root root         6 Jan  2 16:56 fsck.ext4 -> e2fsck
```

By default, `e2fsk` is interactive.  Use the following options to run in non-interactive mode:

- `-p` - attempt to fix any errors
- `-y` - answer "yes" to all questions
- `-n` - answer "no" to all questions (and the filesystem will be mounted read-only)

Common and useful switches for `fsck`:

- `-t` - specify filesystem type
- `-A` - check all filesystems listed in `/etc/fstab`
- `-AR` - skips the root filesystem check
- `-C` - display a progress bar
- `-N` - dry run
- `-V` - verbose mode

Check the filesystem type of a particular block device:

```
$ sudo fsck -N /dev/nvme0n1
fsck from util-linux 2.36.1
[/usr/sbin/fsck.ext2 (1) -- /dev/nvme0n1] fsck.ext2 /dev/nvme0n1
```

### Mounting and Unmounting

Common [`mount`] options:

- `-t` - filter by filesystem type (can be comma-separated)
- `-a` - mounts all filesystems listed in `/etc/fstab`
- `-o`, `--options` - a comma-separated list of mount options
- `-r`, `-ro` - mount as read-only
- `-w`, `-rw` - mount as writable

> It is good practice to manually mount a filesystem in `/mnt`.  Desktop environments, though, will default to mounting in `/media` (`/media/USER/LABEL`).

Common [`umount`] options:

- `-a` - unmounts all filesystems listed in `/etc/fstab`
- `-f` - force a filesystem to unmount
- `-r` - if a filesystem can't be unmounted, make it read-only

If you get an error that the `target is busy` when trying to unmount, it is because a process has opened a file on the filesystem and so it is busy.

You can see what process is accessing the filesystem by using the [`lsof`] tool.  This will list all of the open files on the block device.

Simply pass the partition as the command argument:

```
$ sudo lsof /dev/nvme0n1p3
lsof: WARNING: can't stat() fuse.gvfsd-fuse file system /run/user/1000/gvfs
      Output information may be incomplete.
lsof: WARNING: can't stat() fuse.portal file system /run/user/1000/doc
      Output information may be incomplete.
```

If you get a warning like the one above, it could be because you're using [`LVM`], like me.  In this case, you need to pass the virtual volume, **not** the physical partition, to `lsof`.  This will be mapped by the device mapper in `/dev/mapper`:

```
$ sudo lsof /dev/mapper/kilgore--trout--vg-root
```

### `/etc/fstab`

Let's briefly look at the format for the entries in `/etc/fstab`.  The following is just one entry in the file on my system:

<pre class="math">
# &lt;file system> &lt;mount point>   &lt;type>  &lt;options>       &lt;dump>  &lt;pass>
UUID=892E-F9C9  /boot/efi       vfat    umask=0077      0       1
</pre>

- `FILESYSTEM`
    + the device containing the filesystem to be mounted
    + specify by
        - `UUID=`
        - `LABEL=`
        - `udev` device name
- `MOUNTPOINT`
    + where the filesystem will be mounted
- `TYPE`
    + the filesystem type
- `OPTIONS`
    + the mount options (see below)
- `DUMP`
    + indicates if an `ext[2-4` filesystem should be backed up by the `dump` utility
    + usually it's 0 (zero), meaning it should be ignored
- `PASS`
    + when non-zero, defines the order in which the filesystems will be checked on bootup
    + commonly, it's 0 (zero)

Mount options:

- `atime` and `noatime`
    + By default, every time a file is read the access time information is updated. Disabling this (with noatime) can speed up disk I/O. Do not confuse this with the modification time, which is updated every time a file is written to.
- `auto` and `noauto`
    + Whether the filesystem can (or can not) be mounted automatically with mount -a.
- `defaults`
    + This will pass the options rw, suid, dev, exec, auto, nouser and async to mount.
- `dev` and `nodev`
    + Whether character or block devices in the mounted filesystem should be interpreted.
- `exec` and `noexec`
    + Allow or deny permission to execute binaries on the filesystem.
- `user` and `nouser`
    + Allows (or not) an ordinary user to mount the filesystem.
- `group`
    + Allows a user to mount the filesystem if the user belongs to the same group which owns the device containing it.
- `owner`
    + Allows a user to mount a filesystem if the user owns the device containing it.
- `suid` and `nosuid`
    + Allow, or not, SETUID and SETGID bits to take effect.
- `ro` and `rw`
    + Mount a filesystem as read-only or writable.
- `remount`
    + This will attempt to remount an already mounted filesystem. This is not used on /etc/fstab, but as a parameter to mount -o. For example, to remount the already mounted partition /dev/sdb1 as read-only, you could use the command mount -o remount,ro /dev/sdb1. When remounting, you do not need to specify the filesystem type, only the device name or the mount point.
- `sync` and `async`
    + Whether to do all I/O operations to the filesystem synchronously or asynchronously. async is usually the default. The manual page for mount warns that using sync on media with a limited number of write cycles (like flash drives or memory cards) may shorten the life span of the device.

#### `systemd`

Let's briefly look at how we'd use [`systemd`] to mount a filesystem.

The units are defined in `/etc/systemd/system/`.  Creating a custom mount unit is easy.  Here is a simple config:

<pre class="math">
[Unit]
Description=foo

[Mount]
What=/dev/disk/by-uuid/56C11DCC5D2E1334
Where=/mnt/foo
Type=exfat
Options=defaults

[Install]
WantedBy=multi-user.target

</pre>

- `Description` - a short description of the mount unit
- `What` - what should be mounted
- `Where` - the full path to where the volume is mounted
- `Type` - the filesystem type
- `Options` - the mount options, these are the same used with the `mount` command or used in /etc/fstab
- `WantedBy` - used for dependency management, which will be a target in the case of mounting

>  Whenever the system boots into a multi-user environment, this unit will be mounted.

Interestingly, the mount unit must have the same name as the mount point.  In this case it will be called `mnt-foo.mount` and moved into `/etc/systemd/system/`.

Lastly, we'll need to restart the `systemd` daemon for the new mount unit to be registered:

```
# systemctl daemon-reload
# systemctl start mnt-foo.mount
```

To auto-mount this filesystem whenever the device is accessed, we'll create another an automount unit:

<pre class="math">
[Unit]
Description=Automount for foo, yo

[Automount]
Where=/mnt/foo

[Install]
WantedBy=multi-user.target

</pre>

We need to save this with the precise name of `mnt-foo.automount`, move to `/etc/systemd/system/` and reload the daemon:

```
# systemctl daemon-reload
# systemctl start mnt-foo.automount
```

Weeeeeeeeeeeeeeeeeeeeeee

### [`btrfs`]

The [`btrfs`] filesystem:
- uses a [B-tree] data structure to read and write data, from which it gets its name
- made to quickly handle large files
- uses [`COW`]
- has its own integrated RAID functionality
    + setup RAID 1 mirroring:
        - `# mkfs.btrfs /dev/sda1 /dev/sdb1 -m raid1`
- can create subvolumes, each of which can be mounted separately
    + a subvolume is a subsection of a `btrfs` parent volume
    + `# btrfs subvolume create /mnt/disk/foo`
- can create snapshots
    + `# btrfs subvolume snapshot /mnt/disk/foo /mnt/disk/bar`
- can implement transparent compression
- compression is file-based
- supported compression algorithms:
    + [`LZO`]
    + [`zlib`] (the default)
    + [`zstd`]

The following
- use [`mkfs.btrfs`] to create the filesystem
- use [`btrfs-subvolume`] to manage a subvolume
- use [`btrfstune`] to tune the filesystem

### `ext`

The [Extended filesystem] and its sucessors, [`ext2`], [`ext3`] and [`ext4`].

To create an `ext{2,3,4}` filesystem, use the [`mke2fs`] utility.  A listing of the executables shows that it's a symlink:

```
$ ls -lF /usr/sbin/ | ag mkfs.ext[2-4]
14425731 lrwxrwxrwx 1 root root      6 Jan  2 16:56 mkfs.ext2 -> mke2fs*
14425732 lrwxrwxrwx 1 root root      6 Jan  2 16:56 mkfs.ext3 -> mke2fs*
14425733 lrwxrwxrwx 1 root root      6 Jan  2 16:56 mkfs.ext4 -> mke2fs*
```

Pass the `-t` option to specify which version you'd like, bro.

For example:

```
$ sudo mke2fs -t ext4 /dev/sdb1
```

or, the equivalent:

```
$ sudo mkfs.ext4 /dev/sdb1
```

On creating, you can set things such as:

- `-b`
    + the size of the data block
    + 1024, 2048 or 4096 bytes per block
- `-L`
    + the volume label
    + this will then appear in the output for tools such as `lsblk` and in the `/dev/disk/by-label/` directory
- `N`
    + number of [`inodes`]
- `-U`
    + sets a `UUID`, formatted as 8-4-4-4-12
        - it's a 128 bit hexadecimal number
    + run [`uuidgen`] to see an example
- `-n`
    + dry run
- `-c`
    + does a check of the block device for bad blocks
- journal options

To change anything (i.e., tune) after creation, use [`tune2fs`].

List fileystem information:

```
$ sudo tune2fs -l /dev/sda1
```

`ext` filesystems also have mount counts.  The mount count is increased by one every time it is mounted, and when it reaches a pre-determined number it will be automatically checked by `e2fsck` on the next boot.

The maximum mount count can be set with the `-c` option.  The value will be the number of times that the filesystem can be mounted without needing to be checked (the number can be updated by the `-C` option).

> Use `-i` to set a time interval between filesystem checks rather than a mount count.

Other useful `tune2fs` options:

- `-L` - set a label (same as `mke2fs`)
- `-U` - set a `UUID` (same as `mke2fs`)
- `-e` - set a behavior if an error is found
    + `-e continue` (default)
    + `-e remount-ro`
    + `-e panic`
- `-j` - add a journal to an `ext2` filesystem
    + `ext2` filesystems don't have a journal, so this will convert it to `ext3`
- `-J` - for a journaled filesystem, this allows the setting of journal options (parameters can be comma-separated)
    + `-J size=`
    + `-J location=`
    + `-J device=`

> There is also the [`resize2fs`] utility which resizes a filesystem after a disk utility like [`parted`] has resized a partition.

### [`xfs`]

Developed by Silicon Graphics in 1993 for its IRIX operating system.  It's high performance and reliability make it useful on servers that require high or guaranteed filesystem bandwidth.

It's also RHEL's default filesystem.

The following tools to manage `xfs` filesystems are part of the `xfsprogs` package:

- mkfs.xfs - create the `xfs` filesystem
- [`xfs_admin`] - tune the filesystem
- [`xfs_fsr`] - reorganize (defragment) the filesystem
- [`xfs_repair`] - check and repair the filesystem (the equivalent of `fsck`)
- [`xfs_db`] - debug the filesystem

### [`fat`]

The `fat` family of filesystems includes:

- `FAT16`
- `VFAT`
- `FAT32`

Behold all of the entries that are symlinked to [`mkfs.fat`]:

```
$ sudo ls -l /usr/sbin/ | ag mkfs\.?fat
lrwxrwxrwx 1 root root         8 Jan  2 16:56 mkdosfs -> mkfs.fat
-rwxr-xr-x 1 root root     64272 Feb  7  2021 mkfs.fat
lrwxrwxrwx 1 root root         8 Jan  2 16:56 mkfs.msdos -> mkfs.fat
lrwxrwxrwx 1 root root         8 Jan  2 16:56 mkfs.vfat -> mkfs.fat
```

Sadly, and we're all weeping over this, the `FAT` family suffers from some pretty debilitating limitations for large storage.

- `FAT` supports:
    + file sizes up to 2 GB
    + volume sizes up to 4 GB

- `FAT32` supports:
    + file sizes up to 4 GB
    + volume sizes up to 2 PB

Because of these limitations, `FAT` is perfect for small storage devices such as thumb drives, memory cards and old operating systems that don't support advanced filesystems.

### [`exfat`]

The [`exfat`] filesystem, created by the Empire Formerly Known as "Evil" in 2006, directly addresses the file and volume size limitations of its predecessors.

It can handle file sizes up to 16 EB (exabytes), and its maximum disk size is 128 PB.

It is known as a "universal" filesystem, because it "enjoys" good support from not only Windows but also MacOS (boo) and Linux and is a good choice for when interoperability is required, such as for large removable media and external hard drives.

It can be created by `mkfs.exfat` and `mkexfatfs`.

> This is also the politically correct term for those individuals who have undergone extreme weight loss.

## Permissions

Useful binaries used in this section:

- [`chmod`]
- [`chown`]
- [`getent`]
- [`groupmems`]
- [`umask`]

File permissions:

- `r` - can open a file and read its contents
- `w` - can edit or delete a file
- `x` - can run as an executable or script

Directory permissions:

- `r` - can list a directory but may not be able to read the files' contents
- `w` - can create or delete files in a directory (need `x` to be able to change to the directory)
- `x` - permission to change to a directory but not list its files (need `r` for that)

Only a privileged user or the owner of a file can change the permissions of a file.
Unless you are `root`, you can't change the owner of a file to another user or group that you don't belong to.
The user that owns a file does not also need to be a member of the group that owns the file.

To see what groups a user belongs to:

```
$ getent group | ag btoll
$ groups btoll
```

To do the reverse and see what users belong to a particular group:

```
$ sudo groupmems -g cdrom -l
```

### Modes

File and directory permissions can be described in two different ways:

- symbolic mode
    + good for wanting to target a specific value of a group (that is, owner, group or other)
- octal mode
    + good for when setting all perms

### `umask`

Check out the [`umask`] command to see what the current masking is the for every created file and directory:

```
$ umask
0022
$ umask -S
u=rwx,g=rx,o=rx
$ umask u=rwx,g=rwx,o=
```

The formal is octal mode, and the latter is symbolic mode.  The third example shows how to set a new `umask` for the session only (won't survive a logout or a reboot).

Here's a question for you, little fella.  Why is there only one `umask` value, yet there are different default permissions for files and directories?

Well, [child in time], directories will get execute permissions for the `other` set (world executable, that is), but files will not.  Why?  Because otherwise you wouldn't be able to change to the directory, that's why.

> Stop asking me so many questions.

Seeing it in action is illustrative:

```
$ umask
0022
$ > ff
$ mkdir dd
$ ls -ld ff dd
drwxr-xr-x 2 btoll btoll 4096 Jan 21 23:43 dd
-rw-r--r-- 1 btoll btoll    0 Jan 21 23:43 ff
```

Same `umask`, different permissions.

Check out this table that determines the permissions given an octal value, homeslice:

<pre class="math">
                File            Directory
    Value       Permissions     Permissions
----------------------------------------------
      0         rw-             rwx
----------------------------------------------
      1         rw-             rw-
----------------------------------------------
      2         r--             r-x
----------------------------------------------
      3         r--             r--
----------------------------------------------
      4         -w-             -wx
----------------------------------------------
      5         -w-             -w-
----------------------------------------------
      6         ---             --x
----------------------------------------------
      7         ---             ---
</pre>

### Special Permissions

- sticky bit
    + aka, the *restricted deletion flag*
    + symbolic value is `t`
    + octal value is 1
    + applies only to directories
    + prevents users from removing or renaming a file in the directory unless they own the file or directory

- `SGID`
    + aka, `Set GID` or `Set Group ID` bit
    + symbolic value is `s` (in group permission set)
        - replaces `x` in the group set
    + octal value is 2
    + applies to both files and directories
    + files: make the process run with privileges of the group owner
    + directories: make every file or directory created within it inherit the group of the parent directory

- `SUID`
    + aka, `Set User ID` bit
    + symbolic value is `s` (in user permission set)
        - replaces `x` in the user set
    + applies only to files
    + make the process run with privileges of the owner

> Run either of the following commands to find all the binaries with either the `SGID` or `SUID` bit.
>
> ```
> $ find /usr/bin -perm /u=s,g=s
> $ find /usr/bin -perm /6000
> ```

## Filesystem Hierarchy Standard

- `/`
    + the filesystem root
- `/bin`
    + essential binaries (available to all users)
    + may be symlinked to `/usr/bin`
- `/boot`
    + files needed by the boot process
    + includes kernel
    + includes `initrd` (initial RAM disk
- `/dev`
    + device files
- `/etc`
    + host-specific configuration files
- `/home`
    + user home directories
- `/lib`
    + shared libraries needed to boot the OS and to run the binaries in `/bin` and `/sbin`
    + may be symlinked to `/usr/lib`
- `/media`
    + desktop environment mount points
- `/mnt`
    + sysadmin manual mount points
- `/opt`
    + application software packages
- `/proc`
    + virtual filesystem containing data related to running processes
    + kernel interface
- `/root`
    + `root` home directory
- `/run`
    + runtime variable data
    + often a symlink **of** `/var/run`
- `/sbin`
    + system binaries
    + may be symlinked **to** `/usr/sbin`
- `/srv`
    + data served by the system (i.e, web server)
- `/tmp`
    + temporary files
- `/usr`
    + read-only user data, including data needed by some secondary utilities and applications
- `/var`
    + variable data written during system operation, including print queue, log data, mailboxes, temporary files, browser, cache, etc.

# Summary

Sadly, all good things must come to an end, like this exhilarating series and Breaking Bad.  Except Breaking Bad sucked balls.

Now may be a great time to begin reading [the second series on the LPIC-1 Exam 102](/2023/01/22/on-the-lpic-1-exam-102-shells-and-shell-scripting/)!

# References

- [LPIC-1 Objectives V5.0](https://wiki.lpi.org/wiki/LPIC-1_Objectives_V5.0)
- [LPIC-1 Learning Materials](https://learning.lpi.org/en/learning-materials/101-500/)
- [filesystems(5)](https://www.man7.org/linux/man-pages/man5/filesystems.5.html)
- [proc(5)](https://man7.org/linux/man-pages/man5/proc.5.html)
- [Filesystem Hierarchy Standard](https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard)
- [Persistent block device naming (Arch linux docs)](https://wiki.archlinux.org/title/Persistent_block_device_naming)
- [Difference Between Sourcing and Executing a Shell Script](https://www.baeldung.com/linux/sourcing-vs-executing-shell-script)

[LPIC-1]: https://www.lpi.org/our-certifications/lpic-1-overview
[LPIC-1 Exam 101]: https://www.lpi.org/our-certifications/exam-101-objectives
[Topic 102: Linux Installation and Package Management]: /2023/01/15/on-the-lpic-1-exam-101-linux-installation-and-package-management/
[bootloaders]: /2023/01/15/on-the-lpic-1-exam-101-linux-installation-and-package-management/#bootloaders
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
[`MBR`]: https://en.wikipedia.org/wiki/Master_boot_record
[chain loading]: https://en.wikipedia.org/wiki/Chain_loading
[each partition entry taking 16 bytes]: https://en.wikipedia.org/wiki/Master_boot_record#PT
[`grub-install`]: https://www.gnu.org/software/grub/manual/grub/html_node/Installing-GRUB-using-grub_002dinstall.html
[`GRUB Legacy`]: https://en.wikipedia.org/wiki/GNU_GRUB#Version_0_(GRUB_Legacy)
[`GRUB2`]: https://en.wikipedia.org/wiki/GNU_GRUB#Version_2_(GRUB_2)
[device mapper]: https://en.wikipedia.org/wiki/Device_mapper
[`nice`]: https://man7.org/linux/man-pages/man1/nice.1.html
[`pidof`]: https://man7.org/linux/man-pages/man1/pidof.1.html
[`renice`]: https://man7.org/linux/man-pages/man1/renice.1.html
[Firefox web containers]: https://hacks.mozilla.org/2021/05/introducing-firefox-new-site-isolation-security-architecture/
[`btrfs`]: https://man7.org/linux/man-pages/man8/btrfs-filesystem.8.html
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
[`exfat`]: https://en.wikipedia.org/wiki/ExFAT
[`resize2fs`]: https://man7.org/linux/man-pages/man8/resize2fs.8.html
[`fdisk`]: https://man7.org/linux/man-pages/man8/fdisk.8.html
[`gdisk`]: https://linux.die.net/man/8/gdisk
[`parted`]: https://man7.org/linux/man-pages/man8/parted.8.html
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
[Topic 104: Devices, Linux Filesystems, Filesystem Hierarchy Standard]: https://learning.lpi.org/en/learning-materials/101-500/104/
[`type`]: https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-type
[`paste`]: https://man7.org/linux/man-pages/man1/paste.1.html
[`od`]: https://man7.org/linux/man-pages/man1/od.1.html
[octal]: https://en.wikipedia.org/wiki/Octal
[`cut`]: https://man7.org/linux/man-pages/man1/cut.1.html
[`nl`]: https://man7.org/linux/man-pages/man1/nl.1.html
[`sed`]: https://man7.org/linux/man-pages/man1/sed.1.html
[`cpio`]: https://linux.die.net/man/1/cpio
[`dd`]: https://man7.org/linux/man-pages/man1/dd.1.html
[create a live USB]: /2022/07/31/on-recovering-files-and-persistent-flash-drives/#step-1
[`tar`]: https://man7.org/linux/man-pages/man1/tar.1.html
[`gzip`]: https://linux.die.net/man/1/gzip
[`bzip2`]: https://linux.die.net/man/1/bzip2
[`xz`]: https://linux.die.net/man/1/xz
[`gunzip`]: https://linux.die.net/man/1/xz
[`bunzip2`]: https://linux.die.net/man/1/xz
[`unxz`]: https://linux.die.net/man/1/unxz
[`zcat`]: https://linux.die.net/man/1/zcat
[`bzcat`]: https://linux.die.net/man/1/bzcat
[`xzcat`]: https://linux.die.net/man/1/bzcat
[checksum]: https://en.wikipedia.org/wiki/Checksum
[`md5sum`]: https://man7.org/linux/man-pages/man1/md5sum.1.html
[`sha256sum`]: https://man7.org/linux/man-pages/man1/sha256sum.1.html
[`sha512sum`]: https://man7.org/linux/man-pages/man1/sha512sum.1.html
[`top`]: https://man7.org/linux/man-pages/man1/top.1.html
[`uuidgen`]: https://man7.org/linux/man-pages/man1/uuidgen.1.html
[`mkfs.fat`]: https://man7.org/linux/man-pages/man8/mkfs.fat.8.html
[`du`]: https://man7.org/linux/man-pages/man1/du.1.html
[`df`]: https://man7.org/linux/man-pages/man1/df.1.html
[`fsck`]: https://man7.org/linux/man-pages/man8/fsck.8.html
[`e2fsck`]: https://man7.org/linux/man-pages/man8/e2fsck.8.html
[`umount`]: https://man7.org/linux/man-pages/man8/umount.8.html
[`lsof`]: https://man7.org/linux/man-pages/man8/lsof.8.html
[`chmod`]: https://man7.org/linux/man-pages/man1/chmod.1.html
[`chown`]: https://man7.org/linux/man-pages/man1/chown.1.html
[`getent`]: https://man7.org/linux/man-pages/man1/getent.1.html
[`groupmems`]: https://man7.org/linux/man-pages/man8/groupmems.8.html
[`umask`]: https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-umask
[child in time]: https://www.youtube.com/watch?v=OorZcOzNcgE

