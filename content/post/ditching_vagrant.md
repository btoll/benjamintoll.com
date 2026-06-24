+++
title = "On Ditching Vagrant"
date = "2026-06-29T23:46:53-04:00"

+++

Goodbye, old friend.  We've been traveling together since 2010, and you've faithfully served all my [virtual machine] needs well, first with VirtualBox and then later with [`libvirt`] and [KVM].  But, as they<sup>1</sup> say, all good things must pass.

What happened?  What has changed?

---

- [Introduction](#introduction)
- [KVM and `libvirt` and `virsh`](#kvm-and-libvirt-and-virsh)
- [ruh-roh](#ruh-roh)
- [Preseeding](#preseeding)
- [Summary](#summary)
- [References](#references)

---

## Introduction

So, what are we doing here?  Why are we parting ways?  Honestly, I have found that [Vagrant] is just too much software for little old me.  As I continue my learning journey throughout this wee life and become exposed to more and more things, I question and re-evaluate some of my earlier choices when I didn't know as much as I do now.  I've always revisited past project and decisions, and this has served me well.  In this case, I saw that I was making my workflow too complex.

When I first started using Vagrant in 2010, I was content just to have it manage the lifecycle of my VMs.  [Vagrant boxes] were cool and saved me time, and then later on as I started using [Ansible], I started provisioning my machines with Vagrant's builtin Ansible support.

But as I continued learning more and more about Linux, I started wondering why I just didn't use [KVM] instead of Vagrant.  After all, it's been merged into the Linux kernel since version 2.6.20, so I already have the [tools] I need to create and manage virtual machines.  Why have another software layer, another abstraction, to create something that Linux can do natively?

I started feeling like a weenie.  I began feeling like a smelly little turd.  Worst of all, I realized that I was being lazy.  So, I switched from the [VirtualBox provider] to the [`libvirt` provider] as a half-measure several years ago and moved on with my life.  After all, I had much more important things to do, such as working as very hard as I very could for my then-employer and their customers, since they told me that that was the important thing, the most important thing, so important that I should get up at 3am on consecutive nights to fix hasty infrastructure that we weren't given time to fix during the work week because Agile and because Scrum master and because it didn't provide value to the customer.

Anyway, after a couple of years of this shameful behavior, I finally set aside time to dig into KVM and `libvirt` and do it right.  That's right, children, I uninstalled Vagrant<sup>2</sup> and my wife started to love me again.

So, what did I do?  Come, join me around the fire, and let's all learn together.

## KVM and `libvirt` and `virsh`

[KVM] allows the Linux kernel to function as a [hypervisor], creating and running virtual machines (VMs), via a kernel [virtualization] module.  Through virtualization, hardware is emulated in software, so creating a VM is like having an entire operating system within your host operating system.  Isn't that cool?  You bet your booties!

`libvirt`, on the other hand, is a library and network daemon (pronounced as demon, not "daymon") that manages KVM other virtualization platforms, like [`Xen`], [`LXC`] and [`QEMU`].  It allows you to create, start, stop, pause and delete VMs, among other things like storage and network management.  What's really nice about `libvirt` is that it gives a unified and common library when interacting with all the different platforms that it supports, so there is no need to use anything else or learn different commands and operations for different hypervisors.  In other words, if you switch out your virtualization backend, you can continue to use `libvirt` using the same commands.

[`virsh`] is a command-line frontend to `libvirt` (`libvirt` also supports other frontends, like [`virt-manager`], but that's a GUI, and everybody knows that no one uses GUIs when there's a CLI tool available).  It gives you a nice abstraction layer to interact with the `libvirt` daemon, which, in turn, interacts with KVM.

Here are some helpful [`virsh`] commands to get information about a virtual machine (i.e., domain):

- `domblkinfo`
- `domblkstat`
- `domid`
- `domiflist`
- `domifstat`
- `dominfo`
- `dommemstat`
- `domname`
- `domstate`
- `domuuid`

And, to get information about the host and about a node:

- `capabilities`
- `hostname`
- `nodeinfo`

And, useful management commands:

- `connect`
- `destroy`
- `dumpxml`
- `edit`
- `list`
- `reboot`
- `shutdown`
- `start`
- `undefine`

There really are too many to list here.  See the [`virsh`] docs.

> Again, the conceptual model is user -> `virsh` -> `libvirt` -> KVM.

There is a lot more to understand about each of these topics, but this will get you started.  Here are some nice articles in and around this topic:

- [On Virtual Machines](/2022/08/12/on-virtual-machines/)
- [On Unsharing Namespaces, Part One](/2022/08/08/on-unsharing-namespaces-part-one/)
- [On Unsharing Namespaces, Part Two](/2022/12/14/on-unsharing-namespaces-part-two/)
- [On Linux Container Networking](/2023/11/28/on-linux-container-networking/)

## ruh-roh

I was happily creating virtual machines with `libvirt` and KVM.  I didn't have a care in the world.  Then suddenly, my world completely fell apart.  I had upgraded from `bookworm` to `trixie`, and now I wasn't getting any serial output when starting a VM.

I was passing the kernel boot parameters as usual in the [`virt-install`] command (more on that later) that enabled communication between my host and the VM via the serial port, but it now didn't appear to be actually writing those parameters to the VM (i.e., in my bootloader configuration).

> To check what parameters have actually been written through to `grub` (or whatever bootloader you use), log into the virtual machine and open the `grub` configuration:
>
> `/etc/default/grub`
>
> The important lines will look like this:
>
> ```cfg
> GRUB_CMDLINE_LINUX_DEFAULT="quiet"
> GRUB_CMDLINE_LINUX="console=ttyS0,115200"
> ```
>
> If you change anything, run the following commands:
>
> ```bash
> $ sudo grub-mkconfig -o /boot/grub/grub.cfg
> $ sudo reboot
> ```

I thought about it, and I decided that I would approach this in a different way.  Instead of spending (possibly a long) time debugging what changed), I'll start passing a config file to the installation command that will create what's known as a preseeded virtual machine.  This is a better solution overall, because it lets the build be deterministic and versionable (or put it somewhere accessible to your build machines), and you know that any values you specify in the file will be written through to the virtual machine.

In addition, you can pre-install software that all your machines should have, later using something like [`cloud-init`] to hook into the VM creation lifecycle to add additional software that is custom to each particular machine.  Neat!

Let's see take a look at that now.

## Preseeding

So, what is preseeding?  As you may have surmised by my previous statements, preseeding is a way to automate the creation of a virtual machine by providing predetermined answers to the questions asked during an installation, such as localization, username and password, installation packages, et al.  You know the drill, it's the stuff you've walked through a thousand times.

> I've seen the word `preseeding` used mainly in the context of Debian builds, but other operating systems have similar methods.

Debian `trixie` helpfully provides an [example preconfiguration file](https://www.debian.org/releases/trixie/example-preseed.txt) that you can use as a basis for your own.  See more great information in [Automating the installation using preseeding] which is a great read and highly recommended.

This all sounds wonderful and you are probably gobsmacked, and now you want to know how to start doing this.  Enter our aformenetioned little friend [`virt-install`]:

```bash
$ virt-install \
    --connect qemu:///system \
    --name kilgore-trout \
    --memory 8192 \
    --extra-args="preseed/file=/preseed.cfg console=ttyS0,115200n8" \
    --initrd-inject ./preseed.cfg \
    --install debian13 \
    --disk size=40 \
    --filesystem type=mount,source=/home/btoll/libvirt/kilgore-trout/mnt,target=shared,accessmode=mapped,driver.type=path,driver.wrpolicy=immediate \
    --network network=default \
    --graphics none
```

Let's look at the parameters and their values (most values copied verbatim from the [`virt-install`] man page:

|Parameter |Value |
|:--|:--|
|`--connect` |Connect to a non-default hypervisor. If this isn't specified, libvirt will try and choose the most suitable default.  For  creating  KVM and QEMU guests to be run by the system libvirtd instance.  This is the default mode that virt-manager uses, and what most KVM users want. |
|`--name` |Name of the new guest virtual machine instance. This must be unique amongst all guests known to the hypervisor on the connection,  including  those  not currently  active. |
|`--memory` |Memory to allocate for the guest, in MiB. |
|`--extra-args` |Additional  kernel  command  line  arguments to pass to the installer when performing a guest install. |
|`--initrd-inject` |This is the location on the HOST of the `preseed` file that will be referenced in `--extra-args`. |
|`--install` |`virt-install` will fetch a `--location` URL from libosinfo, and populate defaults from there. |
|`--disk` |Creates a new 40G disk image and associated disk device.  `virt-install` will generate a path name, and place it in the default image location for the hypervisor. |
|`--filesystem` |Specifies a directory on the host to export to the guest. |
|`--network` |Connect the guest to the host network.  The network will be isolated from the host network and connected with a virtual bridge. |
|`--graphics` | Install as headless.  Guests will likely need to have a text console configured on the first serial port in the guest (this can be done via the `--extra-args` option). |

> Note that without `console=ttyS0,115200n8` in `--extra-args` it appears to hang when the virtual machine (VM) is started, but it hasn't.  The issue is that there is no connection between the terminal and the virtual machine so there is no logging outputted written to the screen from the serial port, because there is no connection.

The above command will fail if you're running against the `qemu:///session` daemon.  The network must be available system-wide (note the `uri` string):

```bash
$ virsh --connect qemu:///system net-list --all
 Name              State    Autostart   Persistent
----------------------------------------------------
 default           active   yes         yes
 vagrant-libvirt   active   no          yes
```

Incidentally, the `vagrant-libvirt` network is listed because I had been using Vagrant with the `libvirt` provider.

When a `virt-install` command was successfully executed, like the one above, it will drop you to a login prompt.  Let's now login and check network connectivity:

```bash
$ virsh -c qemu:///system list --all
 Id   Name            State
--------------------------------
 -    kilgore-trout   shut off

$ virsh -c qemu:///system start kilgore-trout
Domain 'kilgore-trout' started

$ virsh -c qemu:///system console kilgore-trout
Connected to domain 'kilgore-trout'
Escape character is ^] (Ctrl + ])













   The highlighted entry will be executed automatically in 0s.
  Booting `Debian GNU/Linux'

Loading Linux 6.12.94+deb13-amd64 ...
Loading initial ramdisk ...
/dev/mapper/kilgore--trout--vg-root: clean, 51705/2428272 files, 650933/9700352 blocks
[    2.375045] systemd-ssh-generator[287]: Failed to query local AF_VSOCK CID: Cannot assign requested address
[    2.376760] (sd-exec-[279]: /usr/lib/systemd/system-generators/systemd-ssh-generator failed with exit status 1.

Debian GNU/Linux 13 kilgore-trout ttyS0

kilgore-trout login: btoll
Password:
Linux kilgore-trout 6.12.94+deb13-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.12.94-1 (2026-06-20) x86_64

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
btoll@kilgore-trout:~$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host noprefixroute
       valid_lft forever preferred_lft forever
2: enp2s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 52:54:00:52:b4:2d brd ff:ff:ff:ff:ff:ff
    altname enx52540052b42d
    inet 192.168.122.112/24 brd 192.168.122.255 scope global dynamic noprefixroute enp2s0
       valid_lft 3420sec preferred_lft 2970sec
    inet6 fe80::c7e7:221f:751d:773c/64 scope link
       valid_lft forever preferred_lft forever
btoll@kilgore-trout:~$ ip route
default via 192.168.122.1 dev enp2s0 proto dhcp src 192.168.122.112 metric 1002
192.168.122.0/24 dev enp2s0 proto dhcp scope link src 192.168.122.112 metric 1002
btoll@kilgore-trout:~$ ping benjamintoll.com
PING benjamintoll.com (167.114.97.28) 56(84) bytes of data.
64 bytes from dinesh (167.114.97.28): icmp_seq=1 ttl=44 time=44.0 ms
64 bytes from dinesh (167.114.97.28): icmp_seq=2 ttl=44 time=43.5 ms
64 bytes from dinesh (167.114.97.28): icmp_seq=3 ttl=44 time=40.8 ms

--- benjamintoll.com ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2004ms
rtt min/avg/max/mdev = 40.781/42.771/43.993/1.419 ms
```

And, on the host, using `ip`:

```bash
$ ip link show type bridge
4: virbr0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether 52:54:00:9d:81:89 brd ff:ff:ff:ff:ff:ff
$ ip addr show dev virbr0
4: virbr0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 52:54:00:9d:81:89 brd ff:ff:ff:ff:ff:ff
    inet 192.168.122.1/24 brd 192.168.122.255 scope global virbr0
       valid_lft forever preferred_lft forever
```

So, `libvirt` created the `virbr0` virtual bridge and isolated the `192.168.122.0/24` network.  Nice.

We can also use the `brctl` utility, if it's installed:

```bash
$ brctl show virbr0
bridge name     bridge id               STP enabled     interfaces
virbr0          8000.5254009d8189       yes             vnet43
```

Given the name of the virtual network interface `vnet43`, let's get some more information about it:

```bash
$ ip link show dev vnet43
74: vnet43: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master virbr0 state UNKNOWN mode DEFAULT group default qlen 1000
    link/ether fe:54:00:52:b4:2d brd ff:ff:ff:ff:ff:ff
```

This is a TAP device.

`virsh` can also give more information about it:

```bash
$ virsh --connect qemu:///system domifaddr kilgore-trout
 Name       MAC address          Protocol     Address
-------------------------------------------------------------------------------
 vnet45     52:54:00:c7:5e:c3    ipv4         192.168.122.114/24
```

Let's now check the mount device.

In the VM:

```bash
btoll@kilgore-trout:/mnt/shared$ touch grass
btoll@kilgore-trout:/mnt/shared$ ls
grass
```

Enable SSH agent forwarding:

```bash
$ eval $(ssh-agent) && ssh-add ~/.ssh/your_private_key
$ ssh -A 192.168.122.114
```

Of course, you can always login to your VM using the `console` command:

```bash
$ virsh --connect qemu:///system console kilgore-trout
```

Ok, so gets me close enough to what I need that I'm going to be using `virsh` to create virtual machines rather than Vagrant.

```bash
$ virsh -c qemu:///system dumpxml kilgore-trout
```

## Summary

Let's get the obvious out of the way:  this is an amazing overview.  It's brief, but that didn't stop Marky Mark and Calvin Klein.

## References

- [`libvirt`]
- [`virt-install`]
- [Booting the Installation System]
- [Boot Parameters]
- [Automating the installation using preseeding]

---

1. The deep state.
1. Ok, that's a lie, it's still on my machine.

[`libvirt`]: https://libvirt.org/
[Booting the Installation System]: https://www.debian.org/releases/stable/amd64/ch05.en.html
[Boot Parameters]: https://www.debian.org/releases/stable/amd64/ch05s03.en.html
[Automating the installation using preseeding]: https://www.debian.org/releases/stable/amd64/apbs02.en.html
[virtual machine]: /2022/08/12/on-virtual-machines/
[`virt-install`]: https://man.archlinux.org/man/virt-install.1
[Vagrant]: https://developer.hashicorp.com/vagrant
[Vagrant boxes]: https://portal.cloud.hashicorp.com/vagrant/discover
[Ansible]: https://docs.ansible.com/projects/ansible/latest/index.html
[KVM]: https://en.wikipedia.org/wiki/Kernel-based_Virtual_Machine
[VirtualBox]: https://www.virtualbox.org/
[VirtualBox provider]: https://developer.hashicorp.com/vagrant/docs/providers/virtualbox
[`libvirt` provider]: https://vagrant-libvirt.github.io/vagrant-libvirt/
[hypervisor]: https://en.wikipedia.org/wiki/Hypervisor
[virtualization]: https://en.wikipedia.org/wiki/Virtualization
[`virt-manager`]: https://en.wikipedia.org/wiki/Virt-manager
[`Xen`]: https://en.wikipedia.org/wiki/Xen
[`LXC`]: https://en.wikipedia.org/wiki/LXC
[`QEMU`]: https://en.wikipedia.org/wiki/QEMU
[`virsh`]: https://www.libvirt.org/manpages/virsh.html
[`dhcpcd`]: https://wiki.archlinux.org/title/Dhcpcd
[tools]: https://www.youtube.com/watch?v=ype12RuDJ4k
[`cloud-init`]: https://packages.debian.org/en/stable/cloud-init

