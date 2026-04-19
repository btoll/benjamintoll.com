+++
title = "On QEMU"
date = "2026-03-24T15:31:55-04:00"
draft = true

+++

<!--
- [`virt-install`](#virt-install)
-->
- [Introduction](#introduction)
- [Summary](#summary)
- [References](#references)

---

## Introduction

```bash
$ sudo apt-get update
$ sudo apt-get install \
    qemu-system-x86 \
    qemu-kvm \
    qemu-utils \
    libvirt-daemon-system \
    libvirt-clients \
    bridge-utils \
    virt-manager
```

What's up with all of the different download files?  From the [Debian Official Cloud Images] page:

- **`azure`**: Optimized for the Microsoft Azure environment
- **`ec2`**: Optimized for the Amazon EC2
- **`generic`**: Should run in any environment using [`cloud-init`], for e.g. OpenStack, DigitalOcean and also on bare metal.
- **`genericcloud`**: Identical to generic but with a reduced set of hardware drivers in the kernel. If it does not work for your use case, you should use the generic images.
- **`nocloud`**: Does not run [`cloud-init`] and boots directly to a root prompt. Useful for local VM instantiation with tools like QEMU.

It's easy to dismiss the first two because no one serious uses either cloud platform, but what about the last three?  How do we know which one would work best for us and what we need?

```bash
$ wget -O bookworm-arm64.tar.xz https://cloud.debian.org/images/cloud/bookworm/latest/debian-12-genericcloud-arm64.tar.xz

$ tar -xJf bookworm-arm64.tar.xz
disk.raw
```

<!--
> Note that I wanted to use the `generic` image, but I was unable to login via public key authentication:
>
> ```bash
> $ ssh -p 2222 debian@localhost
> The authenticity of host '[localhost]:2222 ([127.0.0.1]:2222)' can't be established.
> ED25519 key fingerprint is SHA256:6jMX3RnCGptK3vsAC4s+4OdeMw4+w97kao0En1cm4rU.
> This key is not known by any other names.
> Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
> Warning: Permanently added '[localhost]:2222' (ED25519) to the list of known hosts.
> debian@localhost: Permission denied (publickey).
> ```
-->

```bash
$ qemu-system-x86_64 \
    -enable-kvm \
    -m 2048 \
    -smp 2 \
    -drive file=debian-12-genericcloud-amd64.raw,format=raw,if=ide,index=0 \
    -drive file=seed.iso,media=cdrom,if=ide,index=1 \
    -boot d \
    -net nic,model=virtio \
    -net user,hostfwd=tcp::2222-:22 \
    -serial stdio
```

> If you get the following message, remove your `known_hosts` file:
> ```bash
> $ ssh -p 2222 debian@127.0.0.1
> @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
> @    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
> @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
> IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!
> Someone could be eavesdropping on you right now (man-in-the-middle attack)!
> It is also possible that a host key has just been changed.
> The fingerprint for the ED25519 key sent by the remote host is
> SHA256:mK/zM9wuQlenz41I/xRt2KM6Mysg09mhfdC6CbSp/Og.
> Please contact your system administrator.
> Add correct host key in /home/btoll/.ssh/known_hosts to get rid of this message.
> Offending ECDSA key in /home/btoll/.ssh/known_hosts:3
>   remove with:
>   ssh-keygen -f "/home/btoll/.ssh/known_hosts" -R "[127.0.0.1]:2222"
> Host key for [127.0.0.1]:2222 has changed and you have requested strict checking.
> Host key verification failed.
> $ rm ~/.ssh/known_hosts
> ```

```bash
$ ssh -p 2222 debian@127.0.0.1
The authenticity of host '[127.0.0.1]:2222 ([127.0.0.1]:2222)' can't be established.
ED25519 key fingerprint is SHA256:pBYeHG81ogvCTTIfP1WdGO5QIEr3vrldQ9MUw98ifvE.
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '[127.0.0.1]:2222' (ED25519) to the list of known hosts.
Linux bookworm-qemu 6.1.0-44-cloud-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.164-1 (2026-03-09) x86_64

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
-bash: warning: setlocale: LC_ALL: cannot change locale (en_US.UTF-8)
_____________________________________________________________________
WARNING! Your environment specifies an invalid locale.
 The unknown environment variables are:
   LC_CTYPE=en_US.UTF-8 LC_MESSAGES=en_US.UTF-8 LC_ALL=en_US.UTF-8
 This can affect your user experience significantly, including the
 ability to manage packages. You may install the locales by running:

 sudo dpkg-reconfigure locales

 and select the missing language. Alternatively, you can install the
 locales-all package:

 sudo apt-get install locales-all

To disable this message for all users, run:
   sudo touch /var/lib/cloud/instance/locale-check.skip
_____________________________________________________________________

debian@bookworm-qemu:~$
```

```bash
$ qemu-img info disk.raw
image: disk.raw
file format: raw
virtual size: 3 GiB (3221225472 bytes)
disk size: 0.999 GiB
```

If it's not `qcow2`, then you'll need to convert it:

Convert the raw disk to a `qcow2` virtual disk:

```bash
$ qemu-img convert -f raw -O qcow2 disk.raw disk.qcow2
$ qemu-img info disk.qcow2
image: disk.qcow2
file format: qcow2
virtual size: 3 GiB (3221225472 bytes)
disk size: 1.11 GiB
cluster_size: 65536
Format specific information:
    compat: 1.1
    compression type: zlib
    lazy refcounts: false
    refcount bits: 16
    corrupt: false
    extended l2: false
```

It is possible to use the `raw` image:

```bash
qemu-system-x86_64 \
    -enable-kvm \
    -m 2048 \
    -smp 2 \
    -drive file=debian-12-genericcloud-amd64.raw,format=raw,if=ide,index=0 \
    -drive file=seed.iso,media=cdrom,if=ide,index=1 \
    -boot d \
    -net nic,model=virtio \
    -net user,hostfwd=tcp::2222-:22 \
    -serial stdio
```

> Note, if the `raw` format isn't specified, you'll receive the following warning upon boot:
> ```bash
> WARNING: Image format was not specified for 'debian-12-genericcloud-amd64.raw' and probing guessed raw.
>          Automatically detecting the format is dangerous for raw images, write operations on block 0 will be restricted.
>          Specify the 'raw' format explicitly to remove the restrictions.
> ```

If you'd like a writeable layer (i.e., a snapshot layer) on top of the `qcow2` disk format, do the following:

TODO: Check 20G

```bash
$ qemu-img create -f qcow2 -F qcow2 -b disk.qcow2 snapshot-layer.qcow2 20G
```

| Switch | Meaning
| :- | :-
| -f | First image format
| -F | Second image format
| -b | Backing file

```bash
$ cloud-localds seed.iso user-data meta-data
```

We can see that the two data files have indeed been included in `seed.iso`:

```bash
CD001
LINUX                           cidata
                                                                                                                                                                                                                                                                                                                                                                                                GENISOIMAGE ISO 9660/HFS FILESYSTEM CREATOR (C) 1993 E.YOUNGDALE (C) 1997-2006 J.PEARSON/J.SCHILLING (C) 2006-2007 CDRKIT TEAM                                                                                                                 2026032423123000
2026032423123000
0000000000000000
2026032423123000

CD001
2026032423123000
2026032423123000
0000000000000000
2026032423123000

CD001
META_DAT.;1RR
meta-dataPX$
USER_DAT.;1RR
user-dataPX$
RRIP_1991ATHE ROCK RIDGE INTERCHANGE PROTOCOL PROVIDES SUPPORT FOR POSIX FILE SYSTEM SEMANTICSPLEASE CONTACT DISC PUBLISHER FOR SPECIFICATION SOURCE.  SEE PUBLISHER IDENTIFIER IN PRIMARY VOLUME DESCRIPTOR FOR CONTACT INFORMATION.
instance-id: bookworm-qemu-1
local-hostname: bookworm-qemu
#cloud-config
users:
  - name: debian
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh-authorized-keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN1bs+siDzKYN+ZsOASRKkip7BZkWjo6UNilCTL2cAFF minorsevenflatfive@proton.me
    shell: /bin/bash
ssh_pwauth: false
hostname: bookworm-qemu

```

> Note that the `cidata` label is very important.  This will instruct the `nocloud` datasource to look locally for the `user-data`, and optionally, the `meta-data` files.

`user-data`

```
#cloud-config
users:
  - name: debian
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh-authorized-keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN1bs+siDzKYN+ZsOASRKkip7BZkWjo6UNilCTL2cAFF minorsevenflatfive@proton.me
    shell: /bin/bash
ssh_pwauth: false
hostname: bookworm-qemu
```

`meta-data`

```
instance-id: bookworm-qemu-1
local-hostname: bookworm-qemu
```

Start the VM:

```bash
$ qemu-system-x86_64 \
    -enable-kvm \
    -m 2048 \
    -smp 2 \
    -drive file=debian-12-genericcloud-amd64.raw,format=raw,if=ide,index=0 \
    -drive file=seed.iso,media=cdrom,if=ide,index=1 \
    -boot d \
    -net nic,model=virtio \
    -net user,hostfwd=tcp::2222-:22 \
    -serial stdio
```

For an image that doesn't support `cloud-init`, it's necessary to log in as `root`.  Simply:

```bash
$ qemu-system-x86_64 \
    -enable-kvm \
    -m 2048 \
    -smp 2 \
    -drive file=debian-12-nocloud-amd64.qcow2,format=qcow2,if=ide,index=0 \
    -boot d \
    -net nic,model=virtio \
    -net user,hostfwd=tcp::2222-:22 \
    -serial stdio
```

At the login in the `QEMU` `GUI`, enter `root`.  This will give you a `root` login:

```bash
root@localhost:~#
```

You can see that it doesn't support `cloud-init` as evidenced by the fact that there are no `cloud-init` services:

```bash
root@localhost:~# systemctl list-units --type=service | grep -i cloud-init
root@localhost:~#
```

In the VM:

```bash
$ systemctl list-units --type=service | grep -i cloud-init
  cloud-init-local.service             loaded active exited  Initial cloud-init job (pre-networking)
  cloud-init.service
$ systemctl list-unit-files --type=service | grep -i cloud-init
cloud-init-hotplugd.service            static          -
cloud-init-local.service               enabled         enabled
cloud-init.service                     enabled         enabled
```

To get information particular to a service, list the status of the service.  This will list the location of the service configuration, among other useful information:

```bash
sudo systemctl status cloud-init-local.service
● cloud-init-local.service - Initial cloud-init job (pre-networking)
     Loaded: loaded (/lib/systemd/system/cloud-init-local.service; enabled; preset: enabled)
     Active: active (exited) since Wed 2026-03-25 02:50:42 UTC; 5min ago
    Process: 238 ExecStart=/usr/bin/cloud-init init --local (code=exited, status=0/SUCCESS)
   Main PID: 238 (code=exited, status=0/SUCCESS)
        CPU: 928ms

Mar 25 02:50:41 bookworm-qemu systemd[1]: Starting cloud-init-local.service - Initial cloud-init job (pre-networking)...
Mar 25 02:50:42 bookworm-qemu cloud-init[297]: Cloud-init v. 22.4.2 running 'init-local' at Wed, 25 Mar 2026 02:50:42 +0000. Up 3.60 seconds.
Mar 25 02:50:42 bookworm-qemu systemd[1]: Finished cloud-init-local.service - Initial cloud-init job (pre-networking).
```

Let's check out the configuration at `/lib/systemd/system/cloud-init-local.service`:

```bash
$ cat /lib/systemd/system/cloud-init-local.service
[Unit]
Description=Initial cloud-init job (pre-networking)
DefaultDependencies=no
Wants=network-pre.target
After=hv_kvp_daemon.service
After=systemd-remount-fs.service
Before=NetworkManager.service
Before=network-pre.target
Before=shutdown.target
Before=sysinit.target
Conflicts=shutdown.target
RequiresMountsFor=/var/lib/cloud

[Service]
Type=oneshot
ExecStart=/usr/bin/cloud-init init --local
RemainAfterExit=yes
TimeoutSec=0

# Output needs to appear in instance console output
StandardOutput=journal+console

[Install]
WantedBy=cloud-init.target
```

Here is the other `cloud-init` service:

```bash
$ sudo systemctl status cloud-init.service
● cloud-init.service - Initial cloud-init job (metadata service crawler)
     Loaded: loaded (/lib/systemd/system/cloud-init.service; enabled; preset: enabled)
     Active: active (exited) since Wed 2026-03-25 02:50:45 UTC; 11min ago
    Process: 311 ExecStart=/usr/bin/cloud-init init (code=exited, status=0/SUCCESS)
   Main PID: 311 (code=exited, status=0/SUCCESS)
      Tasks: 0 (limit: 2348)
     Memory: 2.5M
        CPU: 358ms
     CGroup: /system.slice/cloud-init.service

Mar 25 02:50:45 bookworm-qemu cloud-init[315]: ci-info: +++++++++++++++++++Route IPv6 info+++++++++++++++++++
Mar 25 02:50:45 bookworm-qemu cloud-init[315]: ci-info: +-------+-------------+---------+-----------+-------+
Mar 25 02:50:45 bookworm-qemu cloud-init[315]: ci-info: | Route | Destination | Gateway | Interface | Flags |
Mar 25 02:50:45 bookworm-qemu cloud-init[315]: ci-info: +-------+-------------+---------+-----------+-------+
Mar 25 02:50:45 bookworm-qemu cloud-init[315]: ci-info: |   0   |  fe80::/64  |    ::   |    ens3   |   U   |
Mar 25 02:50:45 bookworm-qemu cloud-init[315]: ci-info: |   2   |    local    |    ::   |    ens3   |   U   |
Mar 25 02:50:45 bookworm-qemu cloud-init[315]: ci-info: |   3   |  multicast  |    ::   |    ens3   |   U   |
Mar 25 02:50:45 bookworm-qemu cloud-init[315]: ci-info: +-------+-------------+---------+-----------+-------+
Mar 25 02:50:45 bookworm-qemu cloud-init[315]: 2026-03-25 02:50:45,098 - schema.py[WARNING]: Invalid cloud-config provided: Please run 'sudo cloud-init schema >
Mar 25 02:50:45 bookworm-qemu systemd[1]: Finished cloud-init.service - Initial cloud-init job (metadata service crawler).
```

And, the configuration of the `cloud-init` service:

```bash
$ cat /lib/systemd/system/cloud-init.service
[Unit]
Description=Initial cloud-init job (metadata service crawler)
DefaultDependencies=no
Wants=cloud-init-local.service
Wants=sshd-keygen.service
Wants=sshd.service
After=cloud-init-local.service
After=systemd-networkd-wait-online.service
After=networking.service
Before=network-online.target
Before=chronyd.service
Before=sshd-keygen.service
Before=sshd.service
Before=sysinit.target
Before=shutdown.target
Conflicts=shutdown.target
Before=systemd-user-sessions.service

[Service]
Type=oneshot
ExecStart=/usr/bin/cloud-init init
RemainAfterExit=yes
TimeoutSec=0

# Output needs to appear in instance console output
StandardOutput=journal+console

[Install]
WantedBy=cloud-init.target
```

```bash
$ qemu-system-aarch64 \
    -machine virt \
    -cpu cortex-a72 \
    -m 2048 \
    -smp 2 \
    -drive file=snapshot-layer.qcow2,format=qcow2 \
    -drive file=seed.iso,format=raw,media=cdrom \
    -net nic -net user,hostfwd=tcp::2222-:22 \
    -bios /usr/share/qemu-efi-aarch64/QEMU_EFI.fd \
    -serial mon:stdio
```

Sanity check that the port forwarding has been established:

```bash
$ ss -tlnp | grep 2222
LISTEN 0      1            0.0.0.0:2222       0.0.0.0:*    users:(("qemu-system-x86",pid=4165707,fd=20))
```

---

Let's use `virsh` to manage the VMs.

`bookworm-vm.xml`

```xml
<domain type='qemu'>
  <name>bookworm-vm</name>
  <memory unit='MiB'>2048</memory>
  <currentMemory unit='MiB'>2048</currentMemory>
  <vcpu placement='static'>2</vcpu>
  <cpu mode='custom' match='exact'>
    <model>cortex-a72</model>
  </cpu>
  <os>
    <type arch='aarch64' machine='virt'>hvm</type>
    <loader readonly='yes'>/usr/share/qemu-efi-aarch64/QEMU_EFI.fd</loader>
    <boot dev='hd'/>
  </os>
  <devices>
    <emulator>/usr/bin/qemu-system-aarch64</emulator>
    <disk type='file' device='disk'>
      <driver name='qemu' type='qcow2'/>
      <source file='/home/btoll/projects/qemu-vms/bookworm/snapshot-layer.qcow2'/>
      <target dev='vda' bus='virtio'/>
    </disk>
    <disk type='file' device='disk'>
      <driver name='qemu' type='raw'/>
      <source file='/home/btoll/projects/qemu-vms/bookworm/seed.iso'/>
      <target dev='vdb' bus='virtio'/>
      <readonly/>
    </disk>
    <interface type='user'>
      <mac address='52:54:00:12:34:56'/>
      <model type='virtio'/>
      <portForward proto='tcp' dev='lo'>
        <range start='2222' to='22'/>
      </portForward>
    </interface>
    <console type='pty'>
      <target type='serial' port='0'/>
    </console>
    <memballoon model='virtio'/>
  </devices>
</domain>

```

```bash
virsh destroy bookworm-vm
virsh undefine bookworm-vm
virsh define bookworm-vm.xml
virsh edit bookworm-vm
```

```bash
#!/bin/bash

DOMAIN="$1"
ACTION="$2"

if [ "$DOMAIN" = "bookworm-vm" ]
then
    if [ "$ACTION" = "start" ]
    then
        sleep 2  # Give the VM time to fully start
        virsh qemu-monitor-command bookworm-vm --hmp "hostfwd_add hostnet0 tcp:127.0.0.1:2222-:22"
    fi

# unknown command: 'hostfwd_del'
#    if [ "$ACTION" = "stop" ]
#    then
#        virsh qemu-monitor-command bookworm-vm --hmp "hostfwd_del hostnet0 tcp:127.0.0.1:2222-:22" 2>/dev/null || true
#    fi
fi

```

```bash
$ sudo systemctl restart libvirtd
```

Does my CPU support virtualization extensions?

```bash
$ grep -o 'vmx\|svm' /proc/cpuinfo
vmx
vmx
vmx
vmx
vmx
vmx
vmx
vmx
vmx
vmx
vmx
vmx
vmx
vmx
vmx
vmx
```

---

Note that each image type has a `json` file that contains metadata information and an SBOM (Software Bill Of Materials) that contains information of each package name and version included in the image file.

Here is an example:

```json
{
    "apiVersion": "v1",
    "items": [
        {
            "apiVersion": "cloud.debian.org/v1alpha1",
            "data": {
                "info": {
                    "arch": "amd64",
                    "build_id": "cloud-admin-team-master",
                    "release": "bookworm",
                    "release_baseid": "12",
                    "release_id": "12",
                    "type": "official",
                    "vendor": "generic",
                    "version": "20260316-2418"
                },
                "packages": [
                    {
                        "name": "adduser",
                        "version": "3.134"
                    },
                    {
                        "name": "apparmor",
                        "version": "3.0.8-3"
                    },
                    {
                        "name": "apt",
                        "version": "2.6.1"
                    },
					...
					{
                        "name": "cloud-init",
                        "version": "22.4.2-1+deb12u3"
                    },
                    {
                        "name": "cloud-initramfs-growroot",
                        "version": "0.18.debian13+deb12u1"
                    },
					...
```

Note that all of the images will contain the `cloud-init` packages **except for** the `nocloud` image.

You can see this by logging into a VM and using [`dpkg`]:

```bash
$ dpkg -l | grep cloud-init
ii  cloud-init                    22.4.2-1+deb12u3               all          initialization system for infrastructure cloud instances
ii  cloud-initramfs-growroot      0.18.debian13+deb12u1          all          automatically resize the root partition on first boot
```

The first package contains the [`systemd`] services.

<!--
## `virt-install`

```bash
$ sudo virt-install --install debian11
[sudo] password for btoll:
Using debian11 --location http://deb.debian.org/debian/dists/bullseye/main/installer-amd64
Using default --name debian11
Using debian11 default --memory 1024
Using debian11 default --disk size=20

Starting install...
Retrieving 'linux'                                                                                                                       | 3.5 MB  00:00:00 ...
Retrieving 'initrd.gz'                                                                                                                   |  28 MB  00:00:02 ...
Allocating 'debian11.qcow2'                                                                                                              |    0 B  00:00:00 ...
Removing disk 'debian11.qcow2'                                                                                                           |    0 B  00:00:00
ERROR    Requested operation is not valid: network 'default' is not active
Domain installation does not appear to have been successful.
If it was, you can restart your domain by running:
  virsh --connect qemu:///system start debian11
otherwise, please restart your installation.
```

The `default` network needs to be started.  Do so and try again:

```bash
$ sudo virsh net-start default
Network default started

$ sudo virt-install --install debian11
Using debian11 --location http://deb.debian.org/debian/dists/bullseye/main/installer-amd64
Using default --name debian11
Using debian11 default --memory 1024
Using debian11 default --disk size=20

Starting install...
Retrieving 'linux'                                                                                                                       | 6.3 MB  00:00:00 ...
Retrieving 'initrd.gz'                                                                                                                   |  28 MB  00:00:02 ...
Allocating 'debian11.qcow2'                                                                                                              |    0 B  00:00:00 ...
Creating domain...                                                                                                                       |    0 B  00:00:00
Running graphical console command: virt-viewer --connect qemu:///system --wait debian11
```

This opens the `virt-viewer` and walks you through the installation.

To see a list of the support Debian operating systems:

```bash
$ virt-install --osinfo list | grep -i debian
debian11, debianbullseye
debian10, debianbuster
debian9, debianstretch
debian8, debianjessie
debian7, debianwheezy
debian6, debian6.0, debiansqueeze
debian5, debian5.0, debianlenny
debian4, debian4.0, debianetch
debian3, debian3.0, debianwoody
debian3.1, debiansarge
debian2.2, debianpotato
debian2.1, debianslink
debian2.0, debianhamm
debian1.3, debianbo
debian1.2, debianrex
debian1.1, debianbuzz
debiantesting
```
-->

## Summary

This summary could be a master class in how to write a summary, but I choose not to.

## References

[Debian Official Cloud Images]: https://cloud.debian.org/images/cloud/
[Index of /images/cloud/bookworm/latest]: https://cloud.debian.org/images/cloud/bookworm/latest/
[`cloud-init`]: https://cloud-init.io/
[`dpkg`]: https://www.man7.org/linux/man-pages/man1/dpkg.1.html
[`systemd`]: https://en.wikipedia.org/wiki/Systemd

