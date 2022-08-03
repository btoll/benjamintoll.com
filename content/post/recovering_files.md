+++
title = "On Recovering Files and Persistent Flash Drives"
date = "2022-07-31T21:46:36Z"

+++

Last Friday, I found myself in quite an annoying pickle.

As was its wont, my work laptop froze when the screen saver came on.  Annoyed, I powered it down, only to be presented with a helpful "Sorry, there has been a serious problem" error message when it tried to come back up.  No matter what I tried, I couldn't not get the thing to boot.

This was frustrating on another level as well, because this was the laptop that I was forced to use by my current employer.  I had to give up my other work laptop after a certain date, because it wasn't subject to the same scrutiny and controls as the one that just crashed.

I could go on a rant about this but I won't, other than to say that I hadn't been forced to use a machine not of my own choosing since 2007.

If I were on a machine that I controlled, I could re-install the OS and be up and running in an hour.  But, now it will be days because, well, big corporations.

Anyway, to add insult to injury, I can't log into any of my personal email accounts, my bank, etc., because everything is in 1Password, and I don't have the secret key because I hadn't logged into any other browsers than the one on my work laptop or backed up the key certificate, or whatever the hell 1Password calls it.  And I can't reset the passwords because all of the passwords to my backup email addresses are **also** stored in 1Password.  Some of these accounts I've had for decades.

Oh 1Password, you dirty dog.  I thought I could just log into you on any browser anywhere, anytime with just one piece of information (the master password), but no, I need two.

---

Recovering files from an unbootable hard drive is a relatively straightforward process.  Here are the following steps:

- [Step 1](#step-1) - Prepare the [live USB] (in the olden days it was a [live CD]).
- [Step 2](#step-2) - Boot to the live USB.
- [Step 3](#step-3) - Access the files to recover on the host hard drive.
- [Step 4](#step-4) - Mount the persistent partition of the live USB.
- [Step 5](#step-5) - Copy the recovered files to the persistent partition.

Easy peasy.

---

## Step 1

### Prepare the live USB

The only tools needed are [`fdisk`] and [`dd`].  Of course, there are many tutorials that will have you download other tools, but you don't need them.  Also, in my opinion, they're doing a disservice, a disservice to education.  Learn to use the simple tools that are already at your disposal.  You'll be happier and luckier in love (probably).

This is where I created the live USB.  I simply downloaded [Ubuntu Desktop] (although there are other distributions that will do the trick), and the downloaded [ISO] (or ISO image, from the [ISO 9660] file system used with CD-ROM media) will be copied onto the USB after it's been prepared.

After the download, I fired up my old friend `fdisk` to erase any existing partition(s) and create the new ones.  But first, how do I know what device was assigned to the piece of hardware I just jammed into the computer?

I usually use tail [`dmesg`] or [`journalctl`] for this:

```
$ dmesg --follow
...
[94400.100710] usb 2-4: new SuperSpeed Gen 1 USB device number 13 using xhci_hcd
[94400.121462] usb 2-4: New USB device found, idVendor=0781, idProduct=5591, bcdDevice= 1.00
[94400.121468] usb 2-4: New USB device strings: Mfr=1, Product=2, SerialNumber=3
[94400.121471] usb 2-4: Product: Ultra USB 3.0
[94400.121474] usb 2-4: Manufacturer: SanDisk
[94400.121477] usb 2-4: SerialNumber: 0401287714101490fbc8d7cc5ceeb8b8f24cf75c30586680fd6f8d163beadb7549c70000000000000000000073db243f00017c1891558107b6a6651a
[94400.122649] usb-storage 2-4:1.0: USB Mass Storage device detected
[94400.123042] scsi host3: usb-storage 2-4:1.0
[94401.145589] scsi 3:0:0:0: Direct-Access     SanDisk  Ultra USB 3.0    1.00 PQ: 0 ANSI: 6
[94401.146189] sd 3:0:0:0: Attached scsi generic sg1 type 0
[94401.146605] sd 3:0:0:0: [sdb] 30031872 512-byte logical blocks: (15.4 GB/14.3 GiB)
[94401.147483] sd 3:0:0:0: [sdb] Write Protect is off
[94401.147487] sd 3:0:0:0: [sdb] Mode Sense: 43 00 00 00
[94401.147727] sd 3:0:0:0: [sdb] Write cache: disabled, read cache: enabled, doesn't support DPO or FUA
[94401.195054]  sdb: sdb1 sdb2
[94401.217698] sd 3:0:0:0: [sdb] Attached SCSI removable disk
```

On `systemd` machines:

```
$ journalctl --follow --dmesg
...
Aug 01 23:12:41 kilgore-trout kernel: usb 2-4: new SuperSpeed Gen 1 USB device number 15 using xhci_hcd
Aug 01 23:12:41 kilgore-trout kernel: usb 2-4: New USB device found, idVendor=0781, idProduct=5591, bcdDevice= 1.00
Aug 01 23:12:41 kilgore-trout kernel: usb 2-4: New USB device strings: Mfr=1, Product=2, SerialNumber=3
Aug 01 23:12:41 kilgore-trout kernel: usb 2-4: Product: Ultra USB 3.0
Aug 01 23:12:41 kilgore-trout kernel: usb 2-4: Manufacturer: SanDisk
Aug 01 23:12:41 kilgore-trout kernel: usb 2-4: SerialNumber: 0401287714101490fbc8d7cc5ceeb8b8f24cf75c30586680fd6f8d163beadb7549c70000000000000000000073db243f00017c1891558107b6a6651a
Aug 01 23:12:41 kilgore-trout kernel: usb-storage 2-4:1.0: USB Mass Storage device detected
Aug 01 23:12:41 kilgore-trout kernel: scsi host3: usb-storage 2-4:1.0
Aug 01 23:12:42 kilgore-trout kernel: scsi 3:0:0:0: Direct-Access     SanDisk  Ultra USB 3.0    1.00 PQ: 0 ANSI: 6
Aug 01 23:12:42 kilgore-trout kernel: sd 3:0:0:0: Attached scsi generic sg1 type 0
Aug 01 23:12:42 kilgore-trout kernel: sd 3:0:0:0: [sdb] 30031872 512-byte logical blocks: (15.4 GB/14.3 GiB)
Aug 01 23:12:42 kilgore-trout kernel: sd 3:0:0:0: [sdb] Write Protect is off
Aug 01 23:12:42 kilgore-trout kernel: sd 3:0:0:0: [sdb] Mode Sense: 43 00 00 00
Aug 01 23:12:42 kilgore-trout kernel: sd 3:0:0:0: [sdb] Write cache: disabled, read cache: enabled, doesn't support DPO or FUA
Aug 01 23:12:42 kilgore-trout kernel:  sdb: sdb1 sdb2
Aug 01 23:12:42 kilgore-trout kernel: sd 3:0:0:0: [sdb] Attached SCSI removable disk
```

Both commands show that the device is named `sdb`, and it has two partitions.

If either of those commands are unhelpful, use the `fdisk` utility to list the partition tables for the specified devices.  This needs escalated privileges.  After listing the loop back devices, I finally saw what I was looking for (By process of elimination, really.  Also, I was pretty sure that the USB device would be assigned the letter `b`, i.e., `sdb`.):

```
$ fdisk -l
...
Disk /dev/sdb: 14.33 GiB, 15376318464 bytes, 30031872 sectors
Disk model: Ultra USB 3.0
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x5c83e630

Device     Boot   Start      End  Sectors  Size Id Type
/dev/sdb1  *       2048  8390655  8388608    4G 83 Linux
/dev/sdb2       8390656 30031871 21641216 10.3G 83 Linux
...
```

Alternatively, I could always `cat` the [kernel ring buffer] directly (which is what `dmesg` does):

```
$ sudo cat /proc/kmsg
<6>[94919.063424] usb 2-4: new SuperSpeed Gen 1 USB device number 16 using xhci_hcd
<6>[94919.083951] usb 2-4: SerialNumber: 0401287714101490fbc8d7cc5ceeb8b8f24cf75c30586680fd6f8d163beadb7549c70000000000000000000073db243f00017c1891558107b6a6651a
<6>[94919.085349] scsi host3: usb-storage 2-4:1.0
<5>[94920.088319] scsi 3:0:0:0: Direct-Access     SanDisk  Ultra USB 3.0    1.00 PQ: 0 ANSI: 6
<5>[94920.088682] sd 3:0:0:0: Attached scsi generic sg1 type 0
<5>[94920.089741] sd 3:0:0:0: [sdb] Write Protect is off
<5>[94920.090017] sd 3:0:0:0: [sdb] Write cache: disabled, read cache: enabled, doesn't support DPO or FUA
```

If none of these methods work for you, I suggest you just give up.

Ok, [Kool Moe Dee], onwards and upwards.

Next, I re-partitioned the USB by deleting the existing partitions and creating two new ones.

1. The first partition should be large enough to contain the downloaded ISO.  It should be marked as bootable.
1. The second partition will be for the persistent storage and can use the remaining space.

> Why two partitions?  Recall that an ISO 9660 filesystem is a read-only filesystem.  Because of this, the second partition will need to be the one that is persistent.

```
$ sudo fdisk /dev/sdb

Welcome to fdisk (util-linux 2.34).
Changes will remain in memory only, until you decide to write them.
Be careful before using the write command.


Command (m for help):
```

Make sure you write to the partition table or you will be [singing the blues]!

```
Command (m for help): w
The partition table has been altered.
Calling ioctl() to re-read partition table.
Syncing disks.
```

Next, I needed to make the USB "live" by burning the ISO to the first partition.  I used my friend `dd` for this (this could take a while):

```
$ sudo dd if=~/Downloads/ubuntu-22.04-desktop-amd64.iso of=/dev/sdb1 bs=4M && sync
```

> Note the use of [`sync`] to make sure to synchronize the cached writes to the the USB device!

For the last step, I created an `ext4` filesystem on the second partition to be persistent so I can recover all of my files.

```
$ sudo mkfs.ext4 -b 4096 /dev/sdb2
```

You're done with the first step, yo!

> Note that at no point should any of the partitions on the USB drive be mounted.

## Step 2

### Boot to the live USB

This step should be familiar to most people.  Access the system BIOS when booting, and set USB as the first boot options.  Save and exit.

## Step 3

### Access the files to recover on the host hard drive.

Ok, this is where things get fun.  I know that the host hard drive, the one I cannot boot to, is [LUKS] encrypted.  The easy way to decrypt this would be through a file manager program like [Nautilus], but I don't like the easy way, especially when the command line is not involved.  So, as we do here at `benjamintoll.com`, we're going to avoid all GUI tools where absolutely necessary.  GUIs are for pussies!

After booting to the Ubuntu desktop, I fired up the Terminal program and listed the partition tables.

I was looking for something like that matched `nvme*`:

```
$ sudo fdisk -l
Disk /dev/nvme0n1: 477 GiB, 512110190592 bytes, 1000215216 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: gpt
Disk identifier: 14E01319-4FEC-423E-AC96-C55D83F7A7C2

Device           Start        End   Sectors   Size Type
/dev/nvme0n1p1    2048    1075199   1073152   524M EFI System
/dev/nvme0n1p2 1075200    3028991   1953792   954M Linux filesystem
/dev/nvme0n1p3 3028992 1000214527 997185536 475.5G Linux filesystem
```

`/dev/nvme0n1p3` is what I want.  We can confirm that it is indeed a LUKS encrypted partition:

```
$ sudo cryptsetup isLuks /dev/nvme0n1p3 -v
Command successful.
```

> [`cryptsetup`] is the reference implementation of the LUKS frontend.

I can also get LUKS header information about the device:

```
$ sudo cryptsetup luksDump /dev/nvme0n1p3
LUKS header information
Version:          2
Epoch:            7
Metadata area:    16384 [bytes]
Keyslots area:    16744448 [bytes]
UUID:             f50fa5b8-3e20-4d16-b554-c3fbee054c1a
Label:            (no label)
Subsystem:        (no subsystem)
Flags:            (no flags)

...
```

That `UUID` is important.  Since I don't know the name that was given to this partition when it was formatted (created), I'll prepend "luks-" to it when I decrypt it:

```
$ sudo cryptsetup luksUUID /dev/nvme0n1p3
f50fa5b8-3e20-4d16-b554-c3fbee054c1a
$ sudo cryptsetup luksOpen !$ luks-$(!!)
sudo cryptsetup luksOpen /dev/nvme0n1p3 luks-f50fa5b8-3e20-4d16-b554-c3fbee054c1a
Enter passphrase for /dev/nvme0n1p3:
```

You just decrypted the LUKS partition, boss!

> **Q**. Wait, what the hell are those exclamation marks and dollar signs?!
>
> **A**. Some pretty sweet [Bash history expansion], that's what!  And directly below it is the full, expanded command.

The mapped devices will show now in [`/dev/mapper`]:

```
$ ls -l /dev/mapper/
total 0
crw-------. 1 root root 10, 236 Aug  2 14:24 control
lrwxrwxrwx. 1 root root       7 Aug  2 14:24 luks-f50fa5b8-3e20-4d16-b554-c3fbee054c1a -> ../dm-0
lrwxrwxrwx. 1 root root       7 Aug  2 14:24 vg_li8535123727-lv_root -> ../dm-2
lrwxrwxrwx. 1 root root       7 Aug  2 14:24 vg_li8535123727-lv_swap -> ../dm-1
```

Now, I'll create the mount point and mount:

```
$ mkdir luks
$ sudo mount /dev/mapper/luks-f50fa5b8-3e20-4d16-b554-c3fbee054c1a luks/
mount: /home/btoll/persist: unknown filesystem type 'LVM2_member'.
```

Ruh-roh, it's using [LVM] (LVM2 is a read/write snapshot).  No problem.  Let's check scan for a volume group:

```
$ sudo vgscan
  Found volume group "vg_li8535123727" using metadata type lvm2
```

[That's a bingo!]  Let's get some more details on the logical volumes:

```
$ sudo lvs
  LV      VG              Attr       LSize    Pool Origin Data%  Meta%  Move Log Cpy%Sync Convert
  lv_root vg_li8535123727 -wi-ao---- <444.34g
  lv_swap vg_li8535123727 -wi-ao----   31.1
```

And even more details.  I can get verbose information about the volume group, which will in turn detail all the logical volumes and physical volumes:

```
$ sudo vgdisplay -v
  --- Volume group ---
  VG Name               vg_li8535123727
  System ID
  Format                lvm2
  Metadata Areas        1
  Metadata Sequence No  3
  VG Access             read/write
  VG Status             resizable
  MAX LV                0
  Cur LV                2
  Open LV               2
  Max PV                0
  Cur PV                1
  Act PV                1
  VG Size               <475.48 GiB
  PE Size               4.00 MiB
  Total PE              121722
  Alloc PE / Size       121722 / <475.48 GiB
  Free  PE / Size       0 / 0
  VG UUID               w4Z2yL-p5si-LvnX-z7qk-hfMd-U3Ah-cegrr7

  --- Logical volume ---
  LV Path                /dev/vg_li8535123727/lv_swap
  LV Name                lv_swap
  VG Name                vg_li8535123727
  LV UUID                4St7A4-lG23-QeeM-Z5JD-Q5oW-fGxQ-JbOPGj
  LV Write Access        read/write
  LV Creation host, time localhost.localdomain, 2022-08-01 16:04:47 -0400
  LV Status              available
  # open                 2
  LV Size                31.14 GiB
  Current LE             7972
  Segments               1
  Allocation             inherit
  Read ahead sectors     auto
  - currently set to     8192
  Block device           253:1

  --- Logical volume ---
  LV Path                /dev/vg_li8535123727/lv_root
  LV Name                lv_root
  VG Name                vg_li8535123727
  LV UUID                b50qQZ-uSJk-3nGw-T4tQ-ogVb-fT21-L1klmk
  LV Write Access        read/write
  LV Creation host, time localhost.localdomain, 2022-08-01 16:04:47 -0400
  LV Status              available
  # open                 1
  LV Size                <444.34 GiB
  Current LE             113750
  Segments               1
  Allocation             inherit
  Read ahead sectors     auto
  - currently set to     8192
  Block device           253:2

  --- Physical volumes ---
  PV Name               /dev/mapper/luks-f50fa5b8-3e20-4d16-b554-c3fbee054c1a
  PV UUID               tjK0uP-oB4g-6eWZ-9ExN-GjWL-0C2H-WvF3zx
  PV Status             allocatable
  Total PE / Free PE    121722 / 0
```

> There are also `lvdisplay` and `pvdisplay` to get information on just logical volumes and physical volumes, respectively, but this isn't a tutorial on LVM!

Ok, I now know everything I need in order to mount the correct partition, and I do it now, with gusto:

```
$ sudo mount /dev/mapper/vg_li8535123727-lv_root luks
```

Donzo!

## Step 4

### Mount the persistent partition of the live USB.

This is easy and should be familiar to most:

```
$ mkdir persist
$ sudo mount /dev/sda2 persist
```

The only important bit is to make sure that you mounted the correct partition.  To ensure this, you can use the following tools to determine the device name, et al.:

- [`lsblk`]
- `fdisk`

## Step 5

### Copy the recovered files to the persistent partition.

Again, this is easy.  Since all the files in the LVM volumes are owned by `root`, it's easiest to change to that user.  In Ubuntu and distros that use [`sudoers`]:

```
$ sudo su -
```

Simply go to the mountpoints and copy what you need.  After that, clean up by unmounting your mount points.

[live USB]: https://en.wikipedia.org/wiki/Live_USB
[live CD]: https://en.wikipedia.org/wiki/Live_CD
[`fdisk`]: https://en.wikipedia.org/wiki/Fdisk
[`dd`]: https://en.wikipedia.org/wiki/Dd_(Unix)
[Ubuntu Desktop]: https://ubuntu.com/download/desktop
[ISO]: https://en.wikipedia.org/wiki/Optical_disc_image
[ISO 9660]: https://en.wikipedia.org/wiki/ISO_9660
[`dmesg`]: https://en.wikipedia.org/wiki/Dmesg
[`journalctl`]: https://www.man7.org/linux/man-pages/man1/journalctl.1.html
[kernel ring buffer]: https://en.wikipedia.org/wiki/Circular_buffer
[Kool Moe Dee]: https://en.wikipedia.org/wiki/Kool_Moe_Dee
[singing the blues]: https://youtu.be/lN7QmRorpwQ
[`sync`]: https://en.wikipedia.org/wiki/Sync_(Unix)
[LUKS]: https://en.wikipedia.org/wiki/Linux_Unified_Key_Setup
[Nautilus]: https://en.wikipedia.org/wiki/GNOME_Files
[`cryptsetup`]: https://en.wikipedia.org/wiki/Dm-crypt#cryptsetup
[Bash history expansion]: https://www.thegeekstuff.com/2011/08/bash-history-expansion/
[`/dev/mapper`]: https://en.wikipedia.org/wiki/Sudo#Configuration
[LVM]: https://en.wikipedia.org/wiki/Logical_Volume_Manager_%28Linux%29
[That's a bingo!]: https://www.youtube.com/watch?v=q5pESPQpXxE
[`lsblk`]: https://www.man7.org/linux/man-pages/man8/lsblk.8.html
[`sudoers`]: https://en.wikipedia.org/wiki/Sudo#Configuration

