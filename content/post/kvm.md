+++
title = "On KVM"
date = "2024-10-31T17:48:19-04:00"
draft = true

+++

---

- [Introduction](#introduction)
- [Virtualization](#virtualization)
- [KVM](#kvm)
- [`virsh`](#virsh)
- [Vagrant](#vagrant)
- [References](#references)

---

## Introduction

## Virtualization

- virtualization is emulation of hardware in software

- server virtualization (aka "full")
- desktop virtualization
- application virtualization ([`chroot`], FreeBSD jails, containers)
- network virtualization

- hypervisor (or virtual machine monitor)
    + computer software, firmware or hardware that creates and runs virtual machines
    + the piece of software that makes server virtualization possible
    + it provides the resources an OS expects via emulation or paravirtualization
    + virtual:
        - CPU
        - memory
        - disk
        - networking
    + it might also map physical resources:
        - GPU
        - networking (IP, storage)
    + virtual media:
        - sound
        - video
        - USB

- server virtualization abstracts away the OS from the physical server

- the virtualized servers are running as virtual machines on top of the virtualization layer

- the OS in the VM still get access to the resources they need through virtual CPU, virtual memory, virtual networking and virtual storage that is provide to it through the virtualization layer

- virtual machines are hardware independent (i.e., they are portable)

- more virtual resources can be allocated than physical resources on the (virtual) host

- hardware virtualization
    + features are added to the CPU that assist and accelerate virtualization by moving these functions (features) from the software (hypervisor) to the hardware (CPU)
    + Intel Virtualization (VT-x)
        - CPU flag is `vmx`
        - grep -i vmx /proc/cpuinfo
        - `vmx` stands for "virtual machine extensions"
        - adds 13 new extensions
            + guest OS perceives itself as running with full privileges (host OS remains protected and in charge)
    + AMD Virtualization (AMD-V)
        - CPU flag is `svm`
        - grep -i svm /proc/cpuinfo
        - `svm` stands for "secure virtual machine"

- type 1 hypervisor (bare metal)
    + Hyper-V
    + ESXi/vSphere
    + KVM

- type 2 hypervisor (hosted)
    + virtualbox
    + vmware fusion
    + parallels

- typically, you can create more VMs with type 1 than type 2

- complexities introduced by virtualization
    + greater demand on all resources
    + blended storage I/O (many machines writing to the same storage where previously it was just a small handful on the same machine)
    + greater complexity in troubleshooting

How can you tell if a machine is running in a virtual environment?

```bash
$ grep hypervisor /proc/cpuinfo
```

## KVM

Kernel-based Virtual Machine

- the kernel functions as a type-1 hypervisor
- merged into kernel mainline in 2.6.20 in February 2007
- requires hardware virtualization extensions
    + `vmx` (Intel)
    + `svm` (AMD)
- provides the `/dev/kvm` device

Is it installed?

```bash
$ lsmod | ag kvm
kvm_intel             380928  2
kvm                  1146880  1 kvm_intel
irqbypass              16384  3 kvm
```

> The `kvm_intel` module is loaded because I have an Intel CPU.

Or:

```bash
$ ls -l /dev/kvm
crw-rw----+ 1 root kvm 10, 232 Oct 12 00:37 /dev/kvm
```

In addition:

```bash
$ lscpu | ag virtualization
Virtualization:                       VT-x
```

Also:

```bash
$ egrep "vmx|svm" /proc/cpuinfo | wc -l
16
```

> 16 cores with hardware virtualization support.

- three parts
    + KVM
        - provides acceleration through access to hardware virtualization extensions
        - doesn't have an easy-to-use interface
        - the engine of a car
    + QEMU
        - type-2 hypervisor that runs in userspace (when run with KVM)
        - utilizes KVM for a full-featured type-1 hypervisor
        - doesn't need KVM, but when used with KVM and reduces the number of things that needed emulating and the way they are emulated
        - QEMU and `/dev/kvm` provide the resources that the guest OS's need
        - supports many disk formats:
            + read/write
                - QEMU
                    + `qcow2`
                    + `qed`
                    + `qcow`
                    + `cow`
                - VirtualBox
                    + `vdi` (Virtual Disk Image)
                - Virtual PC
                    + `vhd` (Virtual Hard Disk)
                - Virtual VFAT
                    + share files between guest and host
                - VMWare
                    + `vmdk` (Virtual Machine Disk)
                - Raw images
                    + `img`
                - Bootable CD/DVD images
                    + `iso`
            + read-only
                - macOS
                    + `dmg` (Universal Disk Image)
                - Bochs
                - Linux cloop
                    + compressed image format
                - Parallels
                    + `hdd`
                    + `hds`
        - the chassis and body that channels the power of the (KVM) engine
    + libvirt
        - a virtualization API
        - a toolkit to manage virtualization platforms
        - runs as a daemon
        - it supports many different frontends:
            + [`virsh`] (cli)
            + [`virt-manager`] (gui)
            + `Cockpit` (web-based)
            + `oVirt` (enterprise))
        - to many different backends (`KVM`, `LXC`, `Xen`, `ESX`, etc.)
            + `virsh` -> `libvirt` -> KVM
        - the instruments and controls that allow the driver to easily operate the vehicle

- QEMU/KVM provide paravirtualization support:
    + provides a software interface that looks like hardware
    + VirtIO drivers for the guest OS
        - ethernet
        - storage
        - memory balloon device
        - display

<!--
## `libvirt` Frontends

These frontends, like [`virsh`] and [`virt-manager`], don't need to know how to talk to the type-1 hypervisor backends like KVM or Xen.  They only need to know how to interact with the `libvirt` daemon (`libvirtd`) through `libvirt`.

### `virt-manager`

Install:

```bash
$ sudo apt-get install virt-manager
```

Add user to the `libvirt` group:

```bash
$ sudo usermod -aG libvirt btoll
```

Ensure the service is running:

```bash
$ systemctl status libvirtd.service
```

Enable it to start on system boot:

```bash
$ systemctl enable libvirtd.service
```

`virt-manager` is very similar to other frontend management tools like the GUI for VirtualBox.
-->

## `virsh`

Many of the management utilities use [`virsh`] beneath the surface because, well, of course they do.

- a userspace program that interfaces with `libvirtd`

Install:

```bash
$ sudo apt-get install libvirt-clients virtinst virt-v2v -y
```

This will also install [`virt-install`] and [`virt-v2v`].

```bash
$ virsh version
Compiled against library: libvirt 9.0.0
Using library: libvirt 9.0.0
Using API: QEMU 9.0.0
Running hypervisor: QEMU 7.2.13
```

Does the host support virtualization?

```bash
$ virt-host-validate qemu
  QEMU: Checking for hardware virtualization                                 : PASS
  QEMU: Checking if device /dev/kvm exists                                   : PASS
  QEMU: Checking if device /dev/kvm is accessible                            : PASS
  QEMU: Checking if device /dev/vhost-net exists                             : PASS
  QEMU: Checking if device /dev/net/tun exists                               : PASS
  QEMU: Checking for cgroup 'cpu' controller support                         : PASS
  QEMU: Checking for cgroup 'cpuacct' controller support                     : PASS
  QEMU: Checking for cgroup 'cpuset' controller support                      : PASS
  QEMU: Checking for cgroup 'memory' controller support                      : PASS
  QEMU: Checking for cgroup 'devices' controller support                     : WARN (Enable 'devices' in kernel Kconfig file or mount/enable cgroup controller in your system)
  QEMU: Checking for cgroup 'blkio' controller support                       : PASS
  QEMU: Checking for device assignment IOMMU support                         : PASS
  QEMU: Checking if IOMMU is enabled by kernel                               : PASS
  QEMU: Checking for secure guest support                                    : WARN (Unknown if this platform has Secure Guest support)
```

> Check support for [LXC]:
>
> ```bash
> $ virt-host-validate lxc
> ```

In scripts:

```bash
$ virt-host-validate qemu -q
$ echo $?
0
```

List networks:

```bash
sudo virsh net-list
 Name      State    Autostart   Persistent
--------------------------------------------
 default   active   no          yes

```

Dump XML for devices:

```bash
$ virsh dumpxml --domain bookworm-amd64
$ sudo virsh net-dumpxml default
```

It will print information like the following:

```xml
<network connections='1'>
  <name>default</name>
  <uuid>9f774bd1-1e1f-490e-ade9-b3745223c654</uuid>
  <forward mode='nat'>
    <nat>
      <port start='1024' end='65535'/>
    </nat>
  </forward>
  <bridge name='virbr0' stp='on' delay='0'/>
  <mac address='52:54:00:9d:81:89'/>
  <ip address='192.168.122.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='192.168.122.2' end='192.168.122.254'/>
    </dhcp>
  </ip>
</network>

```

List all machines (note the different connection strings):

```bash
$ virsh --connect qemu:///session list --all
 Id   Name             State
 ---------------------------------
  -    bookworm-amd64   shut off

$ virsh --connect qemu:///system list --all
 Id   Name       State
 --------------------------
  4    debian11   running

```

List storage pools:

```bash
$ sudo virsh pool-list
 Name      State    Autostart
-------------------------------
 Debian    active   yes
 default   active   yes
```

List the volumes in the `Debian` storage pool:

```bash
$ sudo virsh vol-list Debian
 Name                            Path
---------------------------------------------------------------------------------------
 debian-12.7.0-amd64-DVD-1.iso   /home/btoll/iso/debian/debian-12.7.0-amd64-DVD-1.iso
```

Enter the `virsh` shell:

```bash
$ sudo virsh
Welcome to virsh, the virtualization interactive terminal.

Type:  'help' for help with commands
       'quit' to quit

virsh # version --daemon
Compiled against library: libvirt 9.0.0
Using library: libvirt 9.0.0
Using API: QEMU 9.0.0
Running hypervisor: QEMU 7.2.13
Running against daemon: 9.0.0

virsh # pool-list
 Name      State    Autostart
-------------------------------
 Debian    active   yes
 default   active   yes
```

Helpful `virsh` commands to get information about a virtual machine (i.e., domain):

- `dominfo`
- `domstate`
- `domblkinfo`
- `domblkstat`
- `domiflist`
- `domifstat`
- `dommemstat`
- `domid`
- `domname`
- `domuuid`

Get information about the host and about a node:

- `capabilities`
- `hostname`
- `nodeinfo`

Print the hypervisor canonical URI:

```bash
$ virsh uri
qemu:///session

$ sudo virsh uri
qemu:///system

```

## Install Headless

<!--
virt-install --virt-type kvm --name bookworm-amd64 --location https://deb.debian.org/debian/dists/bookworm/main/installer-amd64/ --os-variant debian11 --disk size=40 --memory 8192 --graphics none --console pty,target_type=serial --extra-args "console=ttyS0"
-->

```bash
$ virt-install \
--virt-type kvm \
--name bookworm-amd64 \
--location https://deb.debian.org/debian/dists/bookworm/main/installer-amd64/ \
--os-variant debian11 \
--disk size=40 \
--memory 8192 \
--graphics none \
--console pty,target_type=serial \
--extra-args "console=ttyS0"
```
## Connect

```bash
$ virsh console bookworm-amd64
```

## Stop

```bash
$ virsh shutdown bookworm-amd64
```

## Destroy

```bash
$ virsh destroy bookworm-amd64
```

## Remove

```bash
$ virsh undefine bookworm-amd64
```

## Escape A Virtual Machine

```
Ctrl-]
```

## Vagrant

I've used Vagrant for many years now as the frontend to start and configure virtual machines without having to worry about the particulars of a backing provider.

I used to use Virtualbox, for the simple reason that I was familiar with it.  It's the classic reason to put off learning something better, however, usually with good reasons.  Mine were also time constraints, which is probably the same excuse of most people.

Anyway, now I use QEMU/KVM with `libvirt` and `virsh` as the frontend (that is, the client that makes requests to the `libvirtd` daemon or service).  And, Vagrant has good support for `libvirt` as a provider, and we'll take a brief look at that now.

```bash
$ vagrant plugin install vagrant-libvirt
Installing the 'vagrant-libvirt' plugin. This can take a few minutes...
Fetching xml-simple-1.1.9.gem
Fetching nokogiri-1.16.7-x86_64-linux.gem
Fetching ruby-libvirt-0.8.4.gem
Building native extensions. This could take a while...
Fetching formatador-1.1.0.gem
Fetching fog-core-2.5.0.gem
Fetching fog-xml-0.1.4.gem
Fetching fog-json-1.2.0.gem
Fetching fog-libvirt-0.12.2.gem
Fetching diffy-3.4.3.gem
Fetching vagrant-libvirt-0.12.2.gem
Installed the plugin 'vagrant-libvirt (0.12.2)'!
```

Note that if you receive the following error when attempting to create a virtual machine, you probably haven't installed the `vagrant-libvirt` plugin:

```bash
$ VAGRANT_DEFAULT_PROVIDER=libvirt vagrant up
The provider 'libvirt' could not be found, but was requested to
back the machine 'default'. Please use a provider that exists.

Vagrant knows about the following providers: hyperv, docker, virtualbox
```

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
    config.vm.box = "debian/bookworm64"
    config.vm.hostname = "vagrant-HOSTNAME"

    config.vm.synced_folder ".", "/vagrant"
    config.ssh.forward_agent = true

    config.vm.provider "libvirt" do |vb|
        vb.cpus = 4
        vb.memory = 8192
    end

    config.vm.provision "shell", inline: <<-SHELL
        apt-get update && \
        apt-get install -y \
            build-essential \
            curl \
            git \
            gnupg2 \
            wget

        # Fixes the "-bash: warning: setlocale: LC_ALL: cannot change locale (en_IN.UTF-8)" warning.
        # Also, fixes the same warnings for Perl.
        localedef -i en_US -f UTF-8 en_US.UTF-8
    SHELL

    config.vm.provision :ansible_local do |ansible|
        ansible.become = true
        ansible.groups = {
            "servers" => ["default"]
        }

        ansible.compatibility_mode = "2.0"
        ansible.playbook = "playbook.yml"
        ansible.version = "latest"
        ansible.extra_vars = {
            ansible_python_interpreter: "/usr/bin/python3"
        }
        ansible.galaxy_roles_path = nil
        ansible.galaxy_role_file = "requirements.yml"
        ansible.galaxy_command = "ansible-galaxy install --role-file=%{role_file} --roles-path=%{roles_path}"
    end
end

```

> Of course, provisioning a VM can also be done without using Vagrant.  See [preseeding Debian installations].

Just do a `vagrant up` as usual (of course, set the [`VAGRANT_DEFAULT_PROVIDER`] environment variable):

```bash
$ VAGRANT_DEFAULT_PROVIDER=libvirt vagrant up
```

Verify that it's running using `virsh`:

```bash
$ sudo virsh list --all
 Id   Name              State
---------------------------------
 8    libvirt_default   running

```

Although, you still want to manage the state of the virtual machine using `vagrant`:

```bash
$ vagrant halt
==> default: Attempting graceful shutdown of VM...
```

And the results of the previous command:

```bash
$ sudo virsh list --all
 Id   Name              State
----------------------------------
 -    libvirt_default   shut off

```

## References

- [KVM](https://en.wikipedia.org/wiki/Kernel-based_Virtual_Machine)
- [KVM - Debian docs](https://wiki.debian.org/KVM)
- [QEMU](https://en.wikipedia.org/wiki/QEMU)

[`chroot`]: /2019/05/18/on-escaping-a-chroot/
[`virsh`]: https://manpages.debian.org/buster/libvirt-clients/virsh.1.en.html
[`virt-manager`]: https://manpages.debian.org/bookworm/virt-manager/virt-manager.1.en.html
[`virt-install`]: https://manpages.debian.org/bookworm/virtinst/virt-install.1.en.html
[`virt-v2v`]: https://manpages.debian.org/bookworm/virt-v2v/virt-v2v.1.en.html
[LXC]: https://en.wikipedia.org/wiki/LXC
[preseeding Debian installations]: https://wiki.debian.org/DebianInstaller/Preseed
[`VAGRANT_DEFAULT_PROVIDER`]: https://developer.hashicorp.com/vagrant/docs/providers/default

