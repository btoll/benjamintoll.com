+++
title = "On Studying for the LPIC-1 Exam 101 (101-500), Part Two"
date = "2023-01-15T00:25:10-05:00"

+++

When studying for the Linux Professional Institute [LPIC-1] certification, I took a bunch of notes when reading the docs and doing an online course.  Note that this is not exhaustive, so do not depend on this article to get you prepared for the exam.

The menu items below are not in any order.

This roughly covers [Topic 102: Linux Installation and Package Management].

*Caveat emptor*.

---

- [Exam Details](#exam-details)
- [Topic 102: Linux Installation and Package Management](#topic-102-linux-installation-and-package-management)
    + [A Brief Note On Mounting](#a-brief-note-on-mounting)
    + [Mount Strategies](#mount-strategies)
    + [`LVM`](#lvm)
    + [Bootloaders](#bootloaders)
        - [`GRUB` Legacy](#grub-legacy)
        - [`GRUB2`](#grub2)
    + [Package managers](#package-managers)
        - [Debian](#debian)
            + [`dpkg`](#dpkg)
            + [`apt`](#apt)
            + [`apt` sources](#apt-sources)
            + [`deb` cache](#deb-cache)
        - [Red Hat](#red-hat)
            + [`rpm`](#rpm)
            + [`yum`](#yum)
                - [`yum` sources](#yum-sources)
                - [`yum` cache](#yum-cache)
            + [`dnf`](#dnf)
                - [`dnf` sources](#dnf-sources)
            + [`zypper`](#zypper)
                - [`zypper` sources](#zypper-sources)
    + [Shared Libraries](#shared-libraries)
    + [Virtualization](#virtualization)
        - [Templates](#templates)
        - [`dbus` Machine ID](#dbus-machine-id)
        - [Cloning a Virtual Machine](#cloning-a-virtual-machine)
    + [Cloud Bullshit](#cloud-bullshit)
        - [`SSH`](#ssh)
        - [`cloud-init`](#cloud-init)
- [References](#references)

---

# Exam Details

[LPIC-1 Exam 101]

- Exam Objectives Version: 5.0
- Exam Code: 101-500

# Topic 102: Linux Installation and Package Management

## A Brief Note On Mounting

From the [`mount`] man page:

> If  no -t option is given, or if the auto type is specified, mount will try to guess the desired type.  Mount uses the blkid library for guessing the filesystem type; if that does not turn up anything that looks  famil‐ iar, mount will try to read the file /etc/filesystems, or, if that does not exist, /proc/filesystems.  All of the filesystem types listed there will be tried, except for those that are labeled "nodev" (e.g. devpts, proc and  nfs).

## Mount Strategies

Certain directories are seen as better mount targets as others when formatting a partition.  Citing performance, it suggests the following.

Keep these directories on the same filesystem:

- `/etc`
- `/sbin`
- `/dev`
- `/bin`
- `/lib`

> Maybe keep `/` on a fast SSD device.

Put these on separate filesystems and mount them:

- `/var`
    + for instance, if web or db server, it's easier to add more disk space
    + good for stability and security, so an errant app or process doesn't write and fill the disk causing a kernel panic
    + contains variable data, files and directories the system must be able to write to during operation
        - system logs (`/var/log`)
        - temporary files (`/var/tmp`)
        - cached application data (`/var/cache`)
- `/tmp`
- `/usr`
- `/usr/local`
- `/home`
    + easier to reinstall system w/o risk of accidentally losing data
- `/opt`
- `/boot`
    + system can still boot in the case of a root filesystem crash
    + also, the boot partition needs a `FAT`-based filesystem and the root filesystem is usually something else
    + the boot partition is usually located at the start of the disk and ends before cylinder 1024 (528 MB)
    + this ensures that the machine will always be able to load the kernel
    + the boot partition only stores the files needed by the bootloader (the initial RAM disk and kernel images) and usually doesn't need to be > 300 MB

> `/home` and `/var` could be on slower devices which offer much more space for a lot less money.


Additionally, it recommends having `swap` on a separate device.

- set up using [`mkswap`]
- can't be mounted, can't access like a directory to view its contents
- can have multiple `swap` partitions
- can have `swap` files instead of partitions
- old rule was that its size should be twice that of RAM
- use [`swapon`] and `swapoff` to enable and disable, respectively

## `LVM`

One of the downsides of partitioning a disk is that you may not know ahead of time how much space you'll need for a particular partition or application residing on a partition.  Resizing partitions can be dicey, and there may not be enough room on the device.

With Logical Volume Managment ([`LVM`]), this isn't an issue, because storage is virtualized.  Indeed, volumes can be resized easily (and without needing a reboot) and can span multiple physical partitions and even physical devices.

The basic unit is the Physical Volume (PV).  This is a block device like a disk partition or even a `RAID` array.

These PVs are grouped into Volume Groups (VG).  The VGs abstract the underlying physical devices and are seen as a single logical device.  The combined storage capacity is the number of component PVs.

Each volume in a VG is subdivided into *extents*, which are of a fixed-size.  On a PV, they are called Physical Extents (PE), while on an LV they are called Logical Extents (LE).  In general, each LE is mapped to a PE, but this can change if disk mirroring is being used.

VGs are further subdivided into Logical Volumes (LV), which functionally work like disk partitions but with greater flexibility, as described above.

In the `LVM` world, the LV is the atomic unit, and its size, as specified when it's created, is defined by the size of a PE (4 MB by default) multiplied by the number of them on the volume.  As you can imagine, growing or shrinking an LV is simply a matter of adding extents from the pool available in the VG or removing them, respectively.

When a LV is created, it's seen by the OS as a normal block device and `udev` will create a file for it in `/dev`, like usual.  Its name will be in the format of `/dev/volume-group-name/logical-volume-name`.

The [device mapper] will map the virtual blocks to the underlying physical blocks.

They can be formatted and mounted just like regular block devices.  They can appear in `/etc/fstab`.

## Bootloaders

> **NOTE** this section needs to be checked for accuracy and expanded!

---

> The following is overly-simplistic and only serves as a 30,000 foot view, focusing on the older [`BIOS`] firmware.  *Caveat emptor*.

When the computer is turned on, its firmware is able to load a small program from the master boot sector ([MBR])  into memory on its journey to boot an operating system.  However, it has no concept of a filesystem, so how does it find the Linux kernel that it needs to continue the boot process?

This program is found at the boot sector and is tiny, fitting into one sector (traditionally, 512 bytes but can be as much as 4 KiB on newer disks).  Because not many computer instructions can be contained in such a small program, it usually points to another sector on the drive that contains a larger program to continue the boot process.  This is intuitively known as [chain loading].  This second stage (secondary bootloader) is usually located between the master boot record and the first partition and is 32 KB in size.  It is this that loads the Linux kernel.

> Although there are 512 bytes in the boot sector, not all of them contain machine code.  For MBR, the legacy partition table can support up to four partitions, with [each partition entry taking 16 bytes], for a total of 64 bytes.
>
> There can also be an optional disk signature of four bytes and an optional timestamp of six bytes, so the actual space for the bootloader machine code will only be between 434 and 446 bytes.

Although there are very simple bootloaders that can fit into < 512 bytes of disk space, the more complicated ones will need to be split into different stages.  This is where the aforementioned chain loading comes into play.

Boot loaders with bigger footprints are therefore split into pieces, where the smallest piece fits in the MBR, while one or more larger pieces are stored in other locations such as empty sectors between the MBR and the first partition. The code in the MBR then does little more than starting the second part.

Once a selection is made from the bootloader menu, the remaining stages of the bootloader are concerned with finding the kernel image file located on disk and then loading kernel modules to initiate the operating system boot process.

[`GRUB`] (Grand Unified Bootloader) is a bootloader package from the [GNU Project].  It provides a minimal user interface where one can choose to boot one of multiple operating systems or a specific kernel.

[`initramfs`](https://en.wikipedia.org/wiki/Initial_ramdisk)

### `GRUB` Legacy

> If `GRUB` legacy isn't installed, use [`grub-install`] to do so.

The two most important files for configuration are:

- `/boot/grub/grub.conf`
- `/boot/grub/menu.lst`

The latter may be [symlinked] to the former.

Here is an example from an [Arch Linux] distribution:

`/boot/grub/menu.lst`

<pre class="math">
default=0
timeout=5

title  Arch Linux Stock Kernel
root   (hd0,0)
kernel /vmlinuz-linux root=/dev/sda2 ro
initrd /initramfs-linux.img

title  Arch Linux Stock Kernel Fallback
root   (hd0,0)
kernel /vmlinuz-linux root=/dev/sda2 ro
initrd /initramfs-linux-fallback.img
</pre>

> The `root` statement can be omitted and combined with the `kernel` statement.  For example:
>
> <pre class="math">
> root   (hd0,0)
> kernel /vmlinuz-linux root=/dev/sda2 ro
> </pre>
>
> Can be changed to:
>
> <pre class="math">
> kernel (hd0,0)/vmlinuz-linux root=/dev/sda2 ro
> </pre>

- Keywords:
    + `title`
    + `root`
    + `kernel`
    + `initrd`

[`GRUB` Legacy on Wikipedia.]

### `GRUB2`

> `GRUB2` isn't ever manually installed.

- The two most important files for configuration are:
    - `/boot/grub/grub.cfg`
    - `/boot/grub2/grub.conf`

- Boot menu keybindings:
    + `Ctrl-x`
    + `Esc`
    + `e`

- Keywords:
    + `menuentry` (replaces `title`)
    + `set root` (replaces `root`)
    + `linux` (replaces `kernel`)

- Common kernel parameters:
    + Boot into single-user mode:
        - `s`
        - `S`
        - `1`
        - `single`

[`GRUB2` on Wikipedia.]

## Package managers

This is one of the areas of the exam that annoy me.  I have always used Debian distros (and their derivatives), so any questions not about `apt` and `dpkg` (the Debian package manager) will have to rely on sheer memorization, which is a terrible way to learn anything.

### Debian

What are the primary differences between [`dpkg`] and [`apt`]?

- `dpkg` is the backend to `apt`
- `dpkg` can only install packages that have already been downloaded from a remote source
- `dpkg` does not install package dependencies
- `apt` is not a substitute for `dpkg`, it fills in the gaps (like dependency resolution and advanced search functionality)
- `apt` downloads from package repositories

What is the difference between `apt` and `apt-get`?

- First, know that `apt` combines the features of both [`apt-get`] and [`apt-cache`].  In fact, most of the commands are interchangeable.
- However, `apt` can be interactive, so it's best to use `apt-get` and `apt-cache` in scripts.
- Additionally, the [`apt`] man page documents that `apt` may change in between versions and backwards-compatibility cannot always be guaranteed.

#### `dpkg`

- install (and upgrade)
    + `-i` or `--install`
    + `dpkg` checks to see if it's already installed and upgrades it to the new version if already installed.
    + Won't install if dependencies aren't met unless `--force` is used.

- remove
    + `-r` or `--remove`
    + Can remove multiple packages at the same time.
    + Does not remove configuration files.
    + A package cannot be removed unless every other package that depends on it is also removed (unless `--force` is used).

- purge
    + `-P` or `--purge`
    + Does remove configuration files.

- list contents
    + `-c` or `--contents`

- show information
    + `-I` or `--info`

- show which package "owns" a file
    + `-S` or `--search`
    + Can use either `dpkg` or [`dpkg-query`].

- view status
    + `-s` or `--status`
    + For instance, is it installed?

- verify
    + `-V` or `--verify`
    + From the man page:
        > Verifies the integrity of package-name or all packages if omitted, by comparing information from the files installed by a package with the files metadata information stored in the `dpkg` database (since `dpkg` 1.17.2).  The origin of the files metadata information in the database is the binary packages themselves. That metadata gets collected at package unpack time during the installation process.

- audit
    + `-C` or `--audit`
    + From the man page:
        > Performs database sanity and consistency checks for package-name or all packages if omitted (per package checks since `dpkg` 1.17.10).  For example, searches for packages that have been installed only partially on your system or that have missing, wrong or obsolete control data or files. `dpkg` will suggest what to do with them to get them fixed.

- reconfigure an installed package
    + `sudo dpkg-reconfigure i3`
        - Backs up the current (now old) config files.
        - Unpacks the new config files in the correct directories.
        - Runs the package's `post-install` script.

- list files installed to the system by package
    + `-L` or `--listfiles`

- list installed packages matching pattern
    + `-l` or `--list`

- list installed
    + `--get-selections`
    + also, `sudo dpkg-query -l`
    + Queries the `dpkg` database.

#### `apt`

The most common `apt` tools are:

> Unless noted, both `apt` and `apt-get` can be used for the following operations.

+ [`apt-get`]
    - update the package index
        + `update`
        + retrieves information from repositories about updated and new packages

    - install
        + `install`
        + also, see upgrading below

    - download without installing
        + `download`

    - fix broken dependencies
        + `install -f` or `install --fix-broken`
        + one or more of the installed packages depend on other packages that have not been installed or are not present anymore
        + fixes by installing the missing dependencies
        + can happen due to an `apt` error or a manually installed package

    - upgrade (and install)
        + `upgrade` (updates all)
        + `upgrade PACKAGE_NAME
            + will install if not on system

    - remove
        + `remove`
        + Does not remove configuration files.

    - purge
        + `purge`
        + `remove --purge`
        + Does remove configuration files.

    - list installed packages
        + `apt list --installed`
        + **not** `apt-get`

+ [`apt-cache`]
    - search by keyword
        + `apt-cache search`
        + `apt search`
        + searches package index
        + will match in package name, description and files
        + can use regular expressions

    - show package information
        + `apt-cache show`
        + `apt show`

+ [`apt-file`]
    - `apt-file install`
    - `apt-file update`
    - `apt-file list` or `apt list`

What is the provenance of an executable?  Use [`apt-file`]:

```
# apt-get install apt-file
# apt-get update
# apt-file update
# apt-file search tune2fs
android-sdk: /usr/lib/android-sdk/tools/bin/tune2fs
bash-completion: /usr/share/bash-completion/completions/tune2fs
e2fsprogs: /sbin/tune2fs
e2fsprogs: /usr/share/man/man8/tune2fs.8.gz
grc: /usr/share/grc/conf.tune2fs
libguestfs-gobject-dev: /usr/include/guestfs-gobject/optargs-tune2fs.h
manpages-fr: /usr/share/man/fr/man8/tune2fs.8.gz
manpages-hu: /usr/share/man/hu/man8/tune2fs.8.gz
manpages-ja: /usr/share/man/ja/man8/tune2fs.8.gz
manpages-pl: /usr/share/man/pl/man8/tune2fs.8.gz
zsh-common: /usr/share/zsh/functions/Completion/Linux/_tune2fs
```

#### `apt` sources

An example of `apt` sources:

`deb http://us.archive.ubuntu.com/ubuntu/ disco main restricted universe multiverse`

- Archive type
    + A repository may contain packages with ready-to-run software (binary packages, type deb) or with the source code to this software (source packages, type deb-src). The example above provides binary packages.

- URL
    + The URL for the repository.

- Distribution
    + The name (or codename) for the distribution for which packages are provided. One repository may host packages for multiple distributions. In the example above, disco is the codename for Ubuntu 19.04 Disco Dingo.

- Components
    + Each component represents a set of packages. These components may be different on different Linux distributions.  On Debian, the main components are:
        - main
            + consists of packages compliant with the Debian Free Software Guidelines (DFSG), which do not rely on software outside this area to operate. Packages included here are considered to be part of the Debian distribution.

        - contrib
            + contains DFSG-compliant packages, but which depend on other packages that are not in main.

        - non-free
            + contains packages that are not compliant with the DFSG.

        - security
            + contains security updates.

        - backports
            + contains more recent versions of packages that are in main. The development cycle of the stable versions of Debian is quite long (around two years), and this ensures that users can get the most up-to-date packages without having to modify the main core repository.

#### `deb` cache

`.deb` package files that have been installed and downloaded are cached in `/var/cache/apt/archives` (partial downloads are in `/var/cache/apt/archives/partial/`.

To remove all `.deb` package files from both directories:

```
apt-get clean
apt clean
```

### Red Hat

- `rpm` - RPM Package Manager
- `yum` - YellowDog Updater Modified
- `dnf` - Dandified YUM
- `zypper`

#### [`rpm`]

> Like `dpkg`, `rpm` cannot resolve dependencies.

- install
    + `-i` or `--install`
    + may fail with the list of unresolved dependencies
    + add `-h` option to enable "hash marks" showing installation progress

- remove
    + `-e` or `--erase`
    + can pass multiple packages to the command
    + fails if another installed package also has it as a dependency

- upgrade (and install)
    + `-U` or `--upgrade`
    + upgrades installed package or installs uninstalled package
    + `-F` to **only** upgrade and not install

- view status
    + `-q` or `--query`
    + For instance, is it installed?

- verify
    + `-V` or `--verify`

- list all packages
    + `rpm -qa` (think "query all")

- list dependencies
    + `-R` or `--requires`

- provenance of a file
    + `--whatprovides`
    + `-qf` (think "query file")
        - i.e., which command will output the name of the package which supplied the file `/etc/exports`?
        - `rpm -qf /etc/exports`

- all the following provide information about a package
    + installed
        - `rpm -qi` (think "query info")
        - `rpm -ql` (what files are inside an installed package, think "query list")
        - `rpm - q`
        - `rpm --query`
        - `rpm -qR`
    + uninstalled (just add the `-p` switch to the above commands)
        - `rpm -qip`
        - `rpm -qlp`
        - `rpm -qp --info`

- extract files without installing
    + need both [`rpm2cpio`] and [`cpio`] binaries
    + `rpm2cpio PACKAGE.rpm > name.cpio && cpio idv < name.cpio`

- When using `rpm --verify` to check files created during the installation of RPM packages, which of the following information is taken into consideration?
    + timestamps
    + MD5 checksums
    + file sizes

#### `yum`

> `yum` is similar in functionality to `apt`.

- install
    + `install`

- remove
    + `remove`

- update
    + `update` (updates all packages)
    + `update PACKAGE_NAME`

- check for updates
    + `check-update` (checks for all packages)
    + `check-update PACKAGE_NAME`

- info
    + `info`

- list installed
    + `list installed`

- search for a package
    + `search`

- provenance of a file
    + `--whatprovides`
    + works for both installed and uninstalled packages

- Which of the following commands can be used to download the RPM package kernel without installing it?

      # yumdownloader kernel

- Which command will update the entire system?

    - `update` or `upgrade`

##### `yum` sources

- Repositories are listed in `/etc/yum.repos.d/`.
- Each repository is listed as a file with the `.repo` extension.
- Custom repos can be added as new files to `/etc/yum.repos.d/` or appended to `/etc/yum.conf`.
- Recommended way to add or manage repositories is `yum-config-manager`.
    + To add a repo:
        ```
        yum-config-manager --add-repo https://rpms.remirepo.net/enterprise/remi.repo
        ```
    + List all repos:
        ```
        yum repolist all
        ```
    + Enable/Disable repositories:
        ```
        yum-config-manager --enable updates
        yum-config-manager --disable updates
        ```

##### `yum` cache

Downloaded packages and metadata are stored in `/var/cache/yum`.

- clean the packages cache
    + `yum clean packages

- clean the metadata cache
    + `yum clean metadata`

#### `dnf`

- Dandified YUM, used on Fedora.
- A fork of `yum`.
- As such, commands and parameters are similar to `yum`.

- install
    + `install`

- remove
    + `remove`

- update
    + `update` (updates all packages)
    + `update PACKAGE_NAME`

- info
    + `info`

- search
    + `search`

- provenance of a file
    + `provides`

- list installed
    + `list --installed`

- list contents of a package
    + `repoquery -l PACKAGE_NAME`

- getting help
    + `help`
    + `help install`
    + `help info`

##### `dnf` sources

- Repositories are listed in `/etc/yum.repos.d/`.
- Each repository is listed as a file with the `.repo` extension.

+ To add a repo:
    ```
    dnf config-manager --add_repo URL
    ```

+ List repos:
    - all
        ```
        dnf repolist
        ```
    - enabled/disabled
        ```
        dnf repolist --enabled
        dnf repolist --disabled
        ```

+ Enable/Disable repositories:
    ```
    dnf config-manager --set-enabled REPO_ID
    dnf config-manager --set-disabled REPO_ID
    ```

+ Get a repository ID (REPO_ID above):
    ```
    dnf repolist
    ```

#### `zypper`

Used on `SUSE` Linux and `OpenSUSE`.

> Functionally, `zypper` is similar to both `apt` and `yum`.

- updating the package index
    + `refresh`

- install
    + `install` or `in`
    + can use regular expressions
    + to install a downloaded `rpm`:
        - this will also try to satisfy dependencies

        ```
        zypper install /path/to/package.rpm
        zypper in /path/to/package.rpm
        ```

- remove
    + `remove` or `rm`
    + removing a package also removes any other packages that depend on it

- update
    + `update` (updates all packages)
    + `update PACKAGE_NAME`

- list available updates w/o installing
    + `list-updates`

- search
    + `search` or `se`

- list all installed packages
    + `search -i` or `se -i`

- query if a package is installed
    + `search -i PACKAGE_NAME` or `se -i PACKAGE_NAME`

- search non-installed packages
    + add `-u`
    + `search -ui PACKAGE_NAME` or `se -ui PACKAGE_NAME`

- info
    + `info`

- show repository information
    + `lr`

- provenance of a file
    + `search --provides` or `se --provides`

##### `zypper` sources

- Repositories are listed in `/etc/zypp.repos.d/`.
- Each repository is listed as a file with the `.repo` extension.

+ Add a repo:
    ```
    zypper addrepo URL repository_name
    zypper addrepo http://packman.inode.at/suse/openSUSE_Leap_15.1/ packman
    ```
    - add and enable auto refresh
        ```
        zypper addrepo -f URL repository_name
        ```
    - add and disable repo
        ```
        zypper addrepo -d URL repository_name
        ```

+ Remove a repo:
    ```
    zypper removerepo packman
    ```

+ List repos:
    - all
        ```
        zypper repos
        ```
    - enabled/disabled
        ```
        zypper modifyrepo -e repo-non-oss
        zypper modifyrepo -d repo-non-oss
        ```

+ Enable/Disable auto refresh:
    - does a `zypper refresh` before working with the specified repo
    ```
    zypper modifyrepo -f repo-non-oss
    zypper modifyrepo -F repo-non-oss
    ```

## Shared Libraries

A shared library typically has a name that follows the following standard convention: `lib{LIBRARY_NAME}.so.VERSION`.

For example, `libpthread.so.0`.

Static libraries, on the other hand, have ".a" as a suffix: `libpthread.a`.

Probably the best example of a shared library is [`glibc`] (`libc.so.6`).  This is a symbolic link to the actual shared libary with the latest version:

```
$ readlink -f $(locate libc.so.6)
/usr/lib/x86_64-linux-gnu/libc-2.31.so
$ file $(!!)
file $(readlink -f $(locate libc.so.6))
/usr/lib/x86_64-linux-gnu/libc-2.31.so: ELF 64-bit LSB shared object, x86-64, version 1 (GNU/Linux), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=b503275bf9fee51581fdceef97533b194035b4f7, for GNU/Linux 3.2.0, stripped
```

> It is quite common to have shared libraries with general names to be soft linked to the actual shared library with the specific version in its name.

Other common examples:

- `libreadline` - support for command-line editing with Vim and Emacs key bindings
- [`libcrypt`] - functions related to encryption, hashing, and encoding
- [`libcurl`] - the multiprotocol file transfer library

Common shared library locations:

- `/lib`
- `/lib32`
- `/lib64`
- `/usr/lib`
- `/usr/local/lib`

> Shared libraries in Windows are called Dynamic Linked Libraries (DLL).

How does the [`ld.so`] linker know where to find the shared libraries to link at runtime?

It checks the *library path*:

```
$ cat /etc/ld.so.conf
include /etc/ld.so.conf.d/*.conf
```
The configuration files must include the absolute paths to the shared library directories:

```
$ for conf in $(ls /etc/ld.so.conf.d/*); do echo $conf ; cat $conf ; echo; done
/etc/ld.so.conf.d/fakeroot-x86_64-linux-gnu.conf
/usr/lib/x86_64-linux-gnu/libfakeroot

/etc/ld.so.conf.d/libc.conf
# libc default configuration
/usr/local/lib

/etc/ld.so.conf.d/x86_64-linux-gnu.conf
# Multiarch support
/usr/local/lib/x86_64-linux-gnu
/lib/x86_64-linux-gnu
/usr/lib/x86_64-linux-gnu

```

Finally, the [`ldconfig`] utility reads these config files.  It does the following things:

- creates the aformentioned symlinks that locate the libraries
- updates the `/etc/ld.so.cache` cache file

Make sure to run `ldconfig` anytime config files are added or updated.

Useful commands:

- `sudo ldconfig -v`
- `sudo ldconfig --print-cache`
- `sudo ldconfig

`ldconfig` requires a user with privileged permissions because it writes to `/etc/ld.so.cache`.

The [`LD_LIBRARY_PATH`] environment variable can be modified to add paths to other shared libraries. It's a list of directories in which to search for [`ELF`] libraries at execution time.

> `LD_LIBRARY_PATH` is to shared libraries what `PATH` is to executables.

Find shared library dependencies of a binary:

```
$ ldd $(which tmux)
        linux-vdso.so.1 (0x00007ffecf55d000)
        libutil.so.1 => /lib/x86_64-linux-gnu/libutil.so.1 (0x00007fcbb30b2000)
        libtinfo.so.6 => /lib/x86_64-linux-gnu/libtinfo.so.6 (0x00007fcbb3083000)
        libevent_core-2.1.so.7 => /lib/x86_64-linux-gnu/libevent_core-2.1.so.7 (0x00007fcbb3049000)
        libm.so.6 => /lib/x86_64-linux-gnu/libm.so.6 (0x00007fcbb2f05000)
        libresolv.so.2 => /lib/x86_64-linux-gnu/libresolv.so.2 (0x00007fcbb2eeb000)
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007fcbb2d16000)
        libpthread.so.0 => /lib/x86_64-linux-gnu/libpthread.so.0 (0x00007fcbb2cf2000)
        /lib64/ld-linux-x86-64.so.2 (0x00007fcbb31c0000)
$
$ ldd /lib/x86_64-linux-gnu/libpthread.so.0
        linux-vdso.so.1 (0x00007ffd47bcf000)
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f7282da6000)
        /lib64/ld-linux-x86-64.so.2 (0x00007f7282fbc000)
```

The hexadecimal numbers are the memory addresses of where the library is in RAM.

- print unused dependencies
    + `ldd -u` or `ldd --unused`

## Virtualization

Types:

- Fully Virtualized
    + The CPU architecture must fully support hardware virtualization.
    + No additional drivers are installed to translate the instructions to either simulated or real hardware.
    + The guest is unaware that it is a running VM instance.
    + On `x86`, CPU extensions need to enabled on the host for the following chipsets:
        - for Intel, `VT-x`
        - for AMD, `AMD-V`
- Paravirtualized
    + Better performance than fully virtualized.
    + The guest is aware that it's a VM instance.
    + A modified host kernel and special (guest) drivers are used to help with translation.
- Hybrid
    + TODO

Virtual machines can use multiple types of disk images, and two primary types are:

- [`COW`]
    - disk file is created with a pre-defined upper limit
    - disk image format is `qcow2`
- `RAW`
    - all storage space is pre-allocated

### Templates

Virtual machine templates are often used because they can drastically reduce the amount of setup time for a new virtual machine.

These templates are a master copy of a virtual machine that usually includes the guest OS, a set of applications, and a specific VM configuration. Virtual machine templates are used when you need to deploy many VMs and ensure that they are are consistent and standardized.

They may contain base package installation and locale settings.

If a virtual machine is cloned with the intention to be then used as template to create many instances, it's necessary to modify the instances to be unique.

See the sections below to help identify where instance information may need to be changed to ensure its uniqueness.

### `dbus` Machine ID

No two Linux systems running on a hypervisor should ever have the same `dbus` machine ID.

Use [`dbus-uuidgen`] for the following tests.

- verify a `dbus` machine ID exists for the system
    + if there is no error, an ID exists
    + `dbus-uuidgen --ensure`

- view the current `dbus` machine ID:
    + `dbus-uuidgen --get`

- the `dbus` machine ID "lives" at:
    + `/var/lib/dbus/machine-id`
    + it may be (should be?) symlinked to `/etc/machine-id`

- regenerate the `dbus` machine ID:
    + ensure the instance is stopped
    + if `/var/lib/dbus/machine-id` is symlinked to `/etc/machine-id`:
        ```
        $ sudo rm -f /etc/machine-id
        $ sudo dbus-uuidgen --ensure=/etc/machine-id
    + if it's not symlinked:
        ```
        $ sudo rm /var/lib/dbus/machine-id
        $ sudo dbus-uuidgen --ensure=/etc/machine-id
        ```

### Cloning a Virtual Machine

When a virtual machine is cloned, be sure to change all of the following properties:

- [`UUID`]s
    + `dbus` machine ID:
        - this is generated at install time
        - it needs to be unique per instance to ensure that system resources from the hypervisor get directed to the appropriate guest system
        - see the previous section [`dbus` Machine ID](#dbus-machine-id) for more information
    + Check `/etc/fstab` for any block devices referenced by its `UUID`.
    + Change filesystem `UUID`:
        ```
        # blkid
        # sudo tune2fs /dev/sdX? -U $(uuidgen)
        ```
    + [`LVM`]
        + [`man lvchange`]
    + `SSH` and `GPG` keys
    + et al.
- network interfaces
    + IP addresses
    + [MAC addresses]
    + et al.

## Cloud Bullshit

### `SSH`

Use [`ssh-keygen`] to create a new key.  Permissions for the key pair must be:

- private
    + `0600`
- public
    + `0644`

Or you will receive an error (or you should).


Copy the public key to the cloud instance:

```
$ ssh-copy-id -i <public_key> user@cloud_server
```

This will do a couple of nice things for you:

- append the key to the `~/.ssh/authorized_keys` file on the remote server
    + it will create both the directory and the file, if necessary
- set the appropriate permissions

### `cloud-init`

The [`cloud-init`] tool simplifies the deployments of cloud-based virtual machines.  It uses a [`cloud-config`] file.

# References

- [LPIC-1 Objectives V5.0](https://wiki.lpi.org/wiki/LPIC-1_Objectives_V5.0)
- [LPIC-1 Learning Materials](https://learning.lpi.org/en/learning-materials/101-500/)
- [Topic 102: Linux Installation and Package Management]: https://learning.lpi.org/en/learning-materials/101-500/102/
- [filesystems(5)](https://www.man7.org/linux/man-pages/man5/filesystems.5.html)
- [proc(5)](https://man7.org/linux/man-pages/man5/proc.5.html)
- [Filesystem Hierarchy Standard](https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard)
- [Persistent block device naming (Arch linux docs)](https://wiki.archlinux.org/title/Persistent_block_device_naming)
- [Difference Between Sourcing and Executing a Shell Script](https://www.baeldung.com/linux/sourcing-vs-executing-shell-script)

[LPIC-1]: https://www.lpi.org/our-certifications/lpic-1-overview
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
[`dbus-uuidgen`]: https://dbus.freedesktop.org/doc/dbus-uuidgen.1.html
[SSH]: https://en.wikipedia.org/wiki/Secure_Shell
[`ssh-keygen`]: https://www.man7.org/linux/man-pages/man1/ssh-keygen.1.html
[`cloud-init`]: https://cloudinit.readthedocs.io/en/latest/
[`cloud-config`]: https://cloudinit.readthedocs.io/en/latest/reference/examples.html

