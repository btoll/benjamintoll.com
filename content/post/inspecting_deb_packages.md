+++
title = "On Inspecting deb Packages"
date = "2023-06-01T13:59:06-04:00"

+++

Ever wonder what makes up an [`deb`] package?  I sure have.  Ever since I was a boy, I've lain awake at night and wondered about the contents of the package.  Does anyone really know?

In particular, we'll want to know a package's dependencies and files and look into the what makes up an `deb` package and how we can inspect it without first installing it.

> The commands in this article were run on a Debian bullseye distribution using the [`APT`] package manager.

You may be interested in learning about `RPM` packages in [On Inspecting RPM Packages].

---

- [Configuring Apt Repositories](#configuring-apt-repositories)
    + [Formatting](#formatting)
    + [Releases](#releases)
- [Downloading the deb Package](#downloading-the-deb-package)
    + [`apt-get download`](#apt-get-download)
    + [`apt-get install`](#apt-get-install)
    + [`dget`](#dget)
- [Downloading the Source Package](#downloading-the-source-package)
- [Listing the Package Dependencies](#listing-the-package-dependencies)
    + [`apt-cache`](#apt-cache)
    + [`dpkg-deb`](#dpkg-deb)
    + [Reverse Dependencies](#reverse-dependencies)
- [Listing the Package Files](#listing-the-package-files)
    + [`apt-file`](#apt-file)
    + [`dpkg`](#dpkg)
    + [`apt-cache`](#apt-cache-1)
- [So, What Is A deb Package?](#so-what-is-a-deb-package)
- [The Control Files](#the-control-files)
    + [`ar`](#ar)
    + [`dpkg-deb`](#dpkg-deb-1)
    + [`dpkg-query`](#dpkg-query)
- [Summary](#summary)
- [References](#references)

---

Here are the tools we'll be looking at throughout this article:

|**Utility** |**Description** |
|:---|:---|
|[`apt-cache`] |Query the `APT` cache |
|[`apt-file`] |`APT` package searching utility |
|[`apt-get`] |`APT` package handling utility |
|[`dget`] |Download Debian source and binary packages |
|[`dpkg`] |Package manager for Debian |
|[`dpkg-deb`] |Debian package archive (.deb) manipulation tool |

---

## Configuring Apt Repositories

Before we inspect anything, we have to be able to tell the [`APT`] package manager where it can get information about packages that we may want to download.

There are two primary locations for this:

- [`/etc/apt/sources.list`]
    + contains the default Debian repositories
    + some people add to this
- [`/etc/apt/sources.list.d/`]
    + this directory contains files for user-installed repositories
    + files can have either `.list` or `.source` extensions

The most preferred sources (that is, repositories) are listed first, usually one per line (there is also a [Debian RFC822 control data format] that is accepted).

The information available from these configured sources is what acquired when you run `apt-get update` or any synonym from another `APT` front end (such as `apt-file upgrade`).

The repository has *probably* already been added by default, but you should double-check to make sure.  Here are two ways of listing them:

Simply look in the file:

```bash
$ cat /etc/apt/sources.list
deb https://deb.debian.org/debian bullseye main
deb-src https://deb.debian.org/debian bullseye main
deb https://security.debian.org/debian-security bullseye-security main
deb-src https://security.debian.org/debian-security bullseye-security main
deb https://deb.debian.org/debian bullseye-updates main
deb-src https://deb.debian.org/debian bullseye-updates main
deb https://deb.debian.org/debian bullseye-backports main
deb-src https://deb.debian.org/debian bullseye-backports main
```

To view all of the configured repositories, both in `/etc/apt/source.list` and `/etc/apt/sources.list.d/`), use the `apt-cache policy` command.

```bash
$ apt-cache policy
Package files:
 100 /var/lib/dpkg/status
     release a=now
 100 https://deb.debian.org/debian bullseye-backports/main amd64 Packages
     release o=Debian Backports,a=bullseye-backports,n=bullseye-backports,l=Debian Backports,c=main,b=amd64
     origin deb.debian.org
 500 https://deb.debian.org/debian bullseye-updates/main amd64 Packages
     release v=11-updates,o=Debian,a=stable-updates,n=bullseye-updates,l=Debian,c=main,b=amd64
     origin deb.debian.org
 500 https://security.debian.org/debian-security bullseye-security/main amd64 Packages
     release v=11,o=Debian,a=stable-security,n=bullseye-security,l=Debian-Security,c=main,b=amd64
     origin security.debian.org
 500 https://deb.debian.org/debian bullseye/main amd64 Packages
     release v=11.7,o=Debian,a=stable,n=bullseye,l=Debian,c=main,b=amd64
     origin deb.debian.org
Pinned packages:
```

### Formatting

Here are two different ways to format the repositories in a file:

- One per line:

    ```txt
    deb [ option1=value1 option2=value2 ] uri suite [component1] [component2] [...]
    deb-src [ option1=value1 option2=value2 ] uri suite [component1] [component2] [...]
    ```

- Stanza (RFC822):

    ```txt
    Types: deb deb-src
    URIs: uri
    Suites: suite
    Components: [component1] [component2] [...]
    option1: value1
    option2: value2
    ```

The `suite` refers to a distribution like `stable`, `unstable` or `testing` or a codename like `buster` or `bullseye`.

The `component` refers to a branch, such as `main`, `contrib` or `non-free`.

> Note that while you can have more than one `component` per repository configuration, you can only have one `suite`.

And here are examples of both formats that you may find in an actual production Debian server:

One per line:

```txt
deb http://deb.debian.org/debian bullseye main contrib non-free
deb http://security.debian.org bullseye-security main contrib non-free
```

Stanza (RFC822):

```txt
Types: deb
URIs: http://deb.debian.org/debian
Suites: bullseye
Components: main contrib non-free
Types: deb
URIs: http://security.debian.org
Suites: bullseye-security
Components: main contrib non-free
```

Here are is the information for the `bullseyse` distribution (suite) and the [`main`](http://ftp.debian.org/debian/dists/bullseye/main/), [`contrib`](http://ftp.debian.org/debian/dists/bullseye/contrib/) and [`non-free`](http://ftp.debian.org/debian/dists/bullseye/contrib/) components.

> Both `deb` and `deb-src` types have the same form as shown above.

### Releases

Debian always has [three main releases] in active development and maintenance:

- [`stable`]
    + contains the latest officially released distribution of Debian
    + it is the production release
- [`testing`]
    + contains packages that haven't been accepted into a "stable" release yet, but they are in the queue for that
    + the main advantage of using this distribution is that it has more recent versions of software
- [`unstable`]
    + this is where active development of Debian occurs
    + users running this release should subscribe to the `debian-devel-announce` mailing list to receive notifications of major changes, for example upgrades that may break
    + this distribution is always called `sid`

Although you're welcome to refer to the `suite` or distribution by either release name or codename, referring to it by release name may be advantageous, as it always points to the most recent production release.  Of course, the same goes for the `testing` release.

## Downloading the deb Package

There are two kinds of packages: binary and source.  We'll look at downloading the former in this section.

The first thing we'll want to do after configuring the repositories is download the `deb` package without installing it.  There are several tools that help us accomplish this goal.

### `apt-get download`

This will only download the target package `tmux` and **not** any of its dependencies.

```bash
$ sudo apt-get download tmux
Get:1 https://deb.debian.org/debian bullseye/main amd64 tmux amd64 3.1c-1+deb11u1 [363 kB]
Fetched 363 kB in 0s (910 kB/s)
W: Download is performed unsandboxed as root as file '/home/vagrant/tmux_3.1c-1+deb11u1_amd64.deb' couldn't be accessed by user '_apt'. - pkgAcquire::Run (13: Permission denied)
$ ls
tmux_3.1c-1+deb11u1_amd64.deb
```

This warning is generated because the user `_apt`, which is the user that downloads the packages, doesn't have write access to any cache locations (`/var/cache/apt/archives/` or `/var/cache/apt/archives/partial/`).  It can be safely ignored.

### `apt-get install`

Like `apt-get download`, `apt-get install` will get the target `deb` package, however, it will also download all of its dependencies.  This may or may not be what you want.

```bash
$ sudo apt-get install --download-only tmux -y
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
The following additional packages will be installed:
  libevent-2.1-7 libutempter0
The following NEW packages will be installed:
  libevent-2.1-7 libutempter0 tmux
0 upgraded, 3 newly installed, 0 to remove and 3 not upgraded.
Need to get 560 kB of archives.
After this operation, 1362 kB of additional disk space will be used.
Get:1 https://deb.debian.org/debian bullseye/main amd64 libevent-2.1-7 amd64 2.1.12-stable-1 [188 kB]
Get:2 https://deb.debian.org/debian bullseye/main amd64 libutempter0 amd64 1.2.1-2 [8960 B]
Get:3 https://deb.debian.org/debian bullseye/main amd64 tmux amd64 3.1c-1+deb11u1 [363 kB]
Fetched 560 kB in 0s (2835 kB/s)
Download complete and in download only mode
```

This will download the package to the cache located in `/var/cache/apt/archives/`.

To download it to a different location, you'll have to override a default option with your own:

```bash
$ sudo apt-get --option dir::cache::archives="/home/vagrant" --download-only tmux
```
- `-o`, `--option`
    + Set a Configuration Option. This will set an arbitrary configuration option. The syntax is `-o Foo::Bar=bar`.
    + `-o` and `--option` can be used multiple times to set different options.

Where did that option value come from, you may be wondering?  It's from [the `FILES` section of the `apt-get` man page]:

```conf
/var/cache/apt/archives/
           Storage area for retrieved package files. Configuration Item: Dir::Cache::Archives.
```

### `dget`

[`dget`] is a [`perl`] script that is part of the [`devscripts`] package in the `{DEBIAN-RELEAE}-backports` repository.  It a synonym of `apt-get install -d`.

So, to get the `dget` tool, we'll need to first install the `devscripts` package:

```bash
$ sudo apt-get update
$ sudo apt-get install devscripts
$ whereis dget
dget: /usr/bin/dget /usr/share/man/man1/dget.1.gz
```

Then, you can download packages in two different ways:

- `dget URL`
    + downloads uses [`wget`]
- `dget PACKAGE_NAME`
    + downloads from a mirror configured in `/etc/apt/sources.list` or `/etc/apt/sources.list.d/`

And now, we'll finally download the binary deb package using the second method:

```bash
$ dget -q tmux
2023-06-01 23:59:14 URL:https://deb.debian.org/debian/pool/main/t/tmux/tmux_3.1c-1+deb11u1_amd64.deb [362516/362516] -> "tmux_3.1c-1+deb11u1_amd64.deb" [1]
$ ls
tmux_3.1c-1+deb11u1_amd64.deb
```

As demonstrated, `dget` downloads the package to the current working directory.

> To delete all of the downloaded packages in the cache, simply issue the following command:
>
> ```bash
> $ sudo apt-get clean
> ```

## Downloading the Source Package

There are two kinds of packages: binary and source.  We'll look at downloading the latter in this section.

If you get the following error (or something similar to it), you'll need to download the `dpkg-dev` package, which contains the `dpkg-source` tool needed to unpack the source archives:

```bash
$ apt-get source -q tmux
[output snipped]
sh: 1: dpkg-source: not found
E: Unpack command 'dpkg-source --no-check -x tmux_3.3a-3~bpo11+1.dsc' failed.
```

Easy fix, let's download it:

```bash
$ sudo apt-get install dpkg-dev
```

And then rinse and repeat:

```bash
$ apt-get source -q tmux
Reading package lists...
NOTICE: 'tmux' packaging is maintained in the 'Git' version control system at:
https://salsa.debian.org/rfrancoise/tmux.git
Please use:
git clone https://salsa.debian.org/rfrancoise/tmux.git
to retrieve the latest (possibly unreleased) updates to the package.
Need to get 695 kB of source archives.
Get:1 https://deb.debian.org/debian bullseye-backports/main tmux 3.3a-3~bpo11+1 (dsc) [1,971 B]
Get:2 https://deb.debian.org/debian bullseye-backports/main tmux 3.3a-3~bpo11+1 (tar) [677 kB]
Get:3 https://deb.debian.org/debian bullseye-backports/main tmux 3.3a-3~bpo11+1 (diff) [16.1 kB]
Fetched 695 kB in 0s (2,796 kB/s)
dpkg-source: info: extracting tmux in tmux-3.3a
dpkg-source: info: unpacking tmux_3.3a.orig.tar.gz
dpkg-source: info: unpacking tmux_3.3a-3~bpo11+1.debian.tar.xz
dpkg-source: info: using patch list from debian/patches/series
dpkg-source: info: applying platform-quirks.diff
dpkg-source: info: applying upstream-0f6227f46b.diff
dpkg-source: info: applying upstream-19344efa78.diff
```

In addition to the `deb` package which we had already downloaded, the directory now holds all of the source artifacts:

```bash
$ ls
tmux_3.1c-1+deb11u1_amd64.deb  tmux-3.3a  tmux_3.3a-3~bpo11+1.debian.tar.xz  tmux_3.3a-3~bpo11+1.dsc  tmux_3.3a.orig.tar.gz
```

## Listing the Package Dependencies

### `apt-cache`

```bash
$ apt-cache depends tmux
tmux
  Depends: libc6
  Depends: libevent-2.1-7
  Depends: libtinfo6
  Depends: libutempter0
```

### `dpkg-deb`

```bash
$ dpkg-deb -f tmux_3.1c-1+deb11u1_amd64.deb depends
libc6 (>= 2.27), libevent-2.1-7 (>= 2.1.8-stable), libtinfo6 (>= 6), libutempter0 (>= 1.1.5)
```

### Reverse Dependencies

How about showing the reverse dependencies of `tmux`?  No problem, player.

```bash
$ apt-cache rdepends tmux
tmux
Reverse Depends:
  byobu
  powerline
  ncdc
  tmuxinator
  tmuxinator
  tmux-themepack-jimeh
  tmux-plugin-manager
  powerline
  liquidprompt
  wallstreet
  hollywood
  apt-dater
```

## Listing the Package Files

### `apt-file`

The `apt-file` utility is nice because, among other things, it can list the contents of a remote package (i.e., the package doesn't need to have first been downloaded).

After installing it, you'll need to run `apt-file update` (in practice, it works as an alias for `apt-get update`).  This will store metadata from the package repositories that are configured on the machine.

For instance, if you get the following error, you know that the cache is empty and needs to be created:

```bash
$ sudo apt-file search tmux
Finding relevant cache files to search ...E: The cache is empty. You need to run "apt-file update" first.
```

> `apt-file upgrade` and `apt-get update` are used to resynchronize the package index files from their sources.  The indexes of available packages are fetched from the location(s) specified in `/etc/apt/sources.list`.
>
> For example, when using a Debian archive, this command retrieves and scans the `Packages.gz` files, so that information about new and updated packages is available.

```bash
$ sudo apt-get install apt-file
$ sudo apt-file update
```

```bash
$ apt-file list tmux
tmux: /usr/bin/tmux
tmux: /usr/share/doc/tmux/NEWS.Debian.gz
tmux: /usr/share/doc/tmux/README
tmux: /usr/share/doc/tmux/changelog.Debian.gz
tmux: /usr/share/doc/tmux/changelog.gz
tmux: /usr/share/doc/tmux/copyright
tmux: /usr/share/doc/tmux/example_tmux.conf
tmux: /usr/share/man/man1/tmux.1.gz
```

### `dpkg`

> `dpkg` is the backend to the [`apt`] and [`apt-get`] tools.

List using the `dpkg` utility:

```bash
$ dpkg --contents tmux_3.1c-1+deb11u1_amd64.deb
drwxr-xr-x root/root         0 2021-09-18 13:02 ./
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/bin/
-rwxr-xr-x root/root    733056 2021-09-18 13:02 ./usr/bin/tmux
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/share/
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/share/doc/
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/share/doc/tmux/
-rw-r--r-- root/root       793 2021-09-18 11:23 ./usr/share/doc/tmux/NEWS.Debian.gz
-rw-r--r-- root/root      1920 2020-10-30 12:08 ./usr/share/doc/tmux/README
-rw-r--r-- root/root      9629 2021-09-18 13:02 ./usr/share/doc/tmux/changelog.Debian.gz
-rw-r--r-- root/root     41598 2020-10-30 12:10 ./usr/share/doc/tmux/changelog.gz
-rw-r--r-- root/root      6041 2021-09-18 13:02 ./usr/share/doc/tmux/copyright
-rw-r--r-- root/root      1820 2020-07-24 07:37 ./usr/share/doc/tmux/example_tmux.conf
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/share/man/
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/share/man/man1/
-rw-r--r-- root/root     39412 2021-09-18 13:02 ./usr/share/man/man1/tmux.1.gz
```

When listing the contents of a package (and, as we'll see below, many other operations), it's actually acting as a frontend to the [`dpkg-deb`] utility.

## So, What Is A deb Package?

Finally, we get to the meat in this sandwich.  What makes up a Debian package?

To quote from [the Debian documentation]:

<cite>A Debian package is a collection of files that allow for applications or libraries to be distributed via the package management system.  The aim of packaging is to allow the automation of installing, upgrading, configuring, and removing computer programs for Debian in a consistent manner.  A package consists of one source package, and one or more binary packages.  The [Debian Policy] specifies the standard format for a package, which all packages must follow.</cite>

Super.

A Debian package is an [`ar`] archive that contains three files:

- `debian-binary`
    + the package format version number
    + for current versions of Debian, it is `2.0`
- `control.tar.xz`
    + contains the maintainer scripts and the package meta-information (package name, version, dependencies and maintainer)
    + compressing the archive using [`gzip`], [`xz`] or [`zstd`] is supported
- `data.tar.xz`
    + contains the files to be installed into the file system of the target machine
    + compressing the archive using [`gzip`], [`bzip2`], [`lzma`], [`xz`] or [`zstd`] is supported

## The Control Files

First, let's list the control files.

- `control`
    + contains a brief description of the package as well as other information such as its dependencies
- `md5sums`
    + contains `MD5` checksums of all files in the package in order to detect corrupt or incomplete files
- `conffiles`
    + lists the files of the package that should be treated as configuration files
    + configuration files are not overwritten during an update unless specified
- `preinst`, `postinst`, `prerm`, `postrm`
    + optional scripts that are executed before or after installing or removing the package
- `config`
    + an optional script that supports the [`debconf`] configuration mechanism
- `shlibs`
    + list of shared library dependencies

Now, how can we access the control files?  As usual, you have several ways to do it, ranging from extracting the archives onto the filesystem to surgically extracting a single file or piece (field) of information.

### `ar`

As mentioned in the previous section, the package is an [`ar`] archive.  So, we can use the `ar` utility to extract the goods:

```bash
$ ar xv tmux_3.1c-1+deb11u1_amd64.deb
x - debian-binary
x - control.tar.xz
x - data.tar.xz
$
$ file debian-binary control.tar.xz data.tar.xz
debian-binary:  ASCII text
control.tar.xz: XZ compressed data
data.tar.xz:    XZ compressed data
```

### `dpkg-deb`

As mentioned previously, `dpkg` acts as a frontend to `dpkg-deb`, so all of the commands in this article that use `dpkg-deb` can use `dpkg` instead, and vice-versa.

I find `dpkg-deb` too be a great tool to quickly extract the information about both the control files and the actual data files, so I'd recommend this over `ar`.  But you go ahead and do you.

|**Option** |**Description** |
|:---|:---|
|`-b, --build directory [archive|directory]` |Build a deb package. |
|`-c, --contents archive` |List contents of a deb package. |
|`-e, --control archive [directory]` |Extract control-information from a package. |
|`-x, --extract archive directory` |Extract the files contained by package. |
|`-X, --vextract archive directory` |Extract and display the filenames contained by a package. |
|`-f, --field  archive [control-field...]` |Display control field(s) of a package. |
|`-R, --raw-extract archive directory` |Extracts the filesystem tree from a package archive into a specified directory, and the control information files into a `DEBIAN` subdirectory of the specified directory |
|`--ctrl-tarfile archive` |Output the control tar-file contained in a Debian package. |
|`--fsys-tarfile archive` |Output the filesystem tar-file contained by a Debian package. |
|`-I, --info archive [control-file...]` |Show information about a package. |

Let's look at some examples.

List the files:

```bash
$ dpkg-deb --contents tmux_3.1c-1+deb11u1_amd64.deb
drwxr-xr-x root/root         0 2021-09-18 13:02 ./
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/bin/
-rwxr-xr-x root/root    733056 2021-09-18 13:02 ./usr/bin/tmux
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/share/
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/share/doc/
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/share/doc/tmux/
-rw-r--r-- root/root       793 2021-09-18 11:23 ./usr/share/doc/tmux/NEWS.Debian.gz
-rw-r--r-- root/root      1920 2020-10-30 12:08 ./usr/share/doc/tmux/README
-rw-r--r-- root/root      9629 2021-09-18 13:02 ./usr/share/doc/tmux/changelog.Debian.gz
-rw-r--r-- root/root     41598 2020-10-30 12:10 ./usr/share/doc/tmux/changelog.gz
-rw-r--r-- root/root      6041 2021-09-18 13:02 ./usr/share/doc/tmux/copyright
-rw-r--r-- root/root      1820 2020-07-24 07:37 ./usr/share/doc/tmux/example_tmux.conf
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/share/man/
drwxr-xr-x root/root         0 2021-09-18 13:02 ./usr/share/man/man1/
-rw-r--r-- root/root     39412 2021-09-18 13:02 ./usr/share/man/man1/tmux.1.gz
```

Let's look at some of the control files:

Extract a field value from the `control` file:

```bash
$ dpkg-deb -f tmux_3.1c-1+deb11u1_amd64.deb architecture
amd64
```

Extract the `Package`, `Maintainer` and `Homepage` fields at the same time:

```bash
$ dpkg-deb --field tmux_3.1c-1+deb11u1_amd64.deb package maintainer homepage
Package: tmux
Maintainer: Romain Francoise <rfrancoise@debian.org>
Homepage: https://tmux.github.io/
```

And, the Description:

```bash
$ dpkg-deb --field tmux_3.1c-1+deb11u1_amd64.deb description
terminal multiplexer
 tmux enables a number of terminals (or windows) to be accessed and
 controlled from a single terminal like screen. tmux runs as a
 server-client system. A server is created automatically when necessary
 and holds a number of sessions, each of which may have a number of
 windows linked to it. Any number of clients may connect to a session,
 or the server may be controlled by issuing commands with tmux.
 Communication takes place through a socket, by default placed in /tmp.
 Moreover tmux provides a consistent and well-documented command
 interface, with the same syntax whether used interactively, as a key
 binding, or from the shell. It offers a choice of vim or Emacs key
 layouts.
```

Print a summary of the contents of the package as well as its `control` file:

```bash
$ dpkg-deb --info tmux_3.1c-1+deb11u1_amd64.deb
 new Debian package, version 2.0.
 size 362516 bytes: control archive=1508 bytes.
    1026 bytes,    21 lines      control
     511 bytes,     8 lines      md5sums
     311 bytes,    14 lines   *  postinst             #!/bin/sh
     239 bytes,    12 lines   *  postrm               #!/bin/sh
     383 bytes,    13 lines   *  preinst              #!/bin/sh
     172 bytes,     5 lines   *  prerm                #!/bin/sh
 Package: tmux
 Version: 3.1c-1+deb11u1
 Architecture: amd64
 Maintainer: Romain Francoise <rfrancoise@debian.org>
 Installed-Size: 830
 Depends: libc6 (>= 2.27), libevent-2.1-7 (>= 2.1.8-stable), libtinfo6 (>= 6), libutempter0 (>= 1.1.5)
 Section: admin
 Priority: optional
 Homepage: https://tmux.github.io/
 Description: terminal multiplexer
  tmux enables a number of terminals (or windows) to be accessed and
  controlled from a single terminal like screen. tmux runs as a
  server-client system. A server is created automatically when necessary
  and holds a number of sessions, each of which may have a number of
  windows linked to it. Any number of clients may connect to a session,
  or the server may be controlled by issuing commands with tmux.
  Communication takes place through a socket, by default placed in /tmp.
  Moreover tmux provides a consistent and well-documented command
  interface, with the same syntax whether used interactively, as a key
  binding, or from the shell. It offers a choice of vim or Emacs key
  layouts.
```

Print the `control` and `md5sums` control files:

```bash
$ dpkg-deb --info tmux_3.1c-1+deb11u1_amd64.deb control md5sums
Package: tmux
Version: 3.1c-1+deb11u1
Architecture: amd64
Maintainer: Romain Francoise <rfrancoise@debian.org>
Installed-Size: 830
Depends: libc6 (>= 2.27), libevent-2.1-7 (>= 2.1.8-stable), libtinfo6 (>= 6), libutempter0 (>= 1.1.5)
Section: admin
Priority: optional
Homepage: https://tmux.github.io/
Description: terminal multiplexer
 tmux enables a number of terminals (or windows) to be accessed and
 controlled from a single terminal like screen. tmux runs as a
 server-client system. A server is created automatically when necessary
 and holds a number of sessions, each of which may have a number of
 windows linked to it. Any number of clients may connect to a session,
 or the server may be controlled by issuing commands with tmux.
 Communication takes place through a socket, by default placed in /tmp.
 Moreover tmux provides a consistent and well-documented command
 interface, with the same syntax whether used interactively, as a key
 binding, or from the shell. It offers a choice of vim or Emacs key
 layouts.
bedc0f7f57e96bfa8026fdff60bfa4d9  usr/bin/tmux
cea6b95beec58d1cca6bad8f7f73ed42  usr/share/doc/tmux/NEWS.Debian.gz
2ad24ef33120073bf775009825cc6b2d  usr/share/doc/tmux/README
bfd09c25bc0eb20734a601a9419cb80d  usr/share/doc/tmux/changelog.Debian.gz
8dbbaa69d28f68184e7953ded038b587  usr/share/doc/tmux/changelog.gz
77c0051ba11eee2123c647656e965ba7  usr/share/doc/tmux/copyright
80b03d8f9cd813a7204eea563e592ecb  usr/share/doc/tmux/example_tmux.conf
0c408d2ca30e906766ffcd66264cb02e  usr/share/man/man1/tmux.1.gz
```

Print just the `preinst` control file:

```bash
$ dpkg-deb --info tmux_3.1c-1+deb11u1_amd64.deb preinst
#!/bin/sh

set -e

# Versions before 1.5-2 did not properly disable the tmux-cleanup init script.
if [ "$1" = "upgrade" ] && dpkg --compare-versions "$2" 'lt' "1.5-2"; then
    update-rc.d -f tmux-cleanup remove >/dev/null
fi

# Automatically added by dh_installdeb/13.3.4
dpkg-maintscript-helper rm_conffile /etc/init.d/tmux-cleanup 1.4-6 -- "$@"
# End automatically added section

```

Extract the control data into a target directory `control_dir` (will create if it doesn't exist - but not its parent):

```bash
$ dpkg-deb --control tmux_3.1c-1+deb11u1_amd64.deb control_dir
```

Extract the control data into a target directory into a `DEBIAN` directory in the current directory (note that it does this by default if no target directory is given):

```bash
$ dpkg-deb --control tmux_3.1c-1+deb11u1_amd64.deb
$ tree DEBIAN/
DEBIAN/
├── control
├── md5sums
├── postinst
├── postrm
├── preinst
└── prerm

0 directories, 6 files
```

Extract both the `control` directory and the filesystem (chroot) directory structure to a destination directory `boobar` (will create if it doesn't exist - but not its parent):

```bash
$ dpkg-deb -R tmux_3.1c-1+deb11u1_amd64.deb boobar
$ tree boobar
boobar
├── DEBIAN
│   ├── control
│   ├── md5sums
│   ├── postinst
│   ├── postrm
│   ├── preinst
│   └── prerm
└── usr
    ├── bin
    │   └── tmux
    └── share
        ├── doc
        │   └── tmux
        │       ├── changelog.Debian.gz
        │       ├── changelog.gz
        │       ├── copyright
        │       ├── example_tmux.conf
        │       ├── NEWS.Debian.gz
        │       └── README
        └── man
            └── man1
                └── tmux.1.gz

8 directories, 14 files
```

> Note that extracting a package to the root directory (`/`) will **not** result in a correct installation!  Use `dpkg` to install packages.

### `dpkg-query`

```bash
$ dpkg-query --control-list tmux
postrm
$ dpkg-query --control-show tmux $(!!)
dpkg-query --control-show tmux $(dpkg-query --control-list tmux)
#!/bin/sh

set -e

if [ "$1" = "remove" ]; then
    remove-shell /usr/bin/tmux
fi

# Automatically added by dh_installdeb/13.3.4
dpkg-maintscript-helper rm_conffile /etc/init.d/tmux-cleanup 1.4-6 -- "$@"
# End automatically added section
```

### `apt-cache`

Executing the command `apt-cache show` will also display package details, but that's about it.  It's fine for a quicky, but I'd recommend `dpkg-deb` for doing any heavy lifting.

The example first shows that the cache may not be created.

```bash
$ apt-cache show tmux
N: Unable to locate package tmux
E: No packages found
$ sudo apt-get update
$ apt-cache show tmux
Package: tmux
Version: 3.3a-3~bpo11+1
Installed-Size: 1126
Maintainer: Romain Francoise <rfrancoise@debian.org>
Architecture: amd64
Depends: libc6 (>= 2.27), libevent-core-2.1-7 (>= 2.1.8-stable), libtinfo6 (>= 6), libutempter0 (>= 1.1.5)
Description-en: terminal multiplexer
 tmux enables a number of terminals (or windows) to be accessed and controlled from a single terminal like screen. tmux runs as a
 server-client system. A server is created automatically when necessary
 and holds a number of sessions, each of which may have a number of
 windows linked to it. Any number of clients may connect to a session,
 or the server may be controlled by issuing commands with tmux.
 Communication takes place through a socket, by default placed in /tmp.
 Moreover tmux provides a consistent and well-documented command
 interface, with the same syntax whether used interactively, as a key
 binding, or from the shell. It offers a choice of vim or Emacs key
 layouts.
Description-md5: dc6ff920cb9183a42694d0ea54835078
Homepage: https://tmux.github.io/
Section: admin
Priority: optional
Filename: pool/main/t/tmux/tmux_3.3a-3~bpo11+1_amd64.deb
Size: 464056
SHA256: 205ed5942f7dd98bf0a9dbd6a49100d551b9d75f90dc24c254ce4f46278875fe
...
```

By now, this information should look familiar.

> This shows the same information as `dpkg --print-avail`.

## Summary

After much thought and contemplation, I've decided that this article is nothing short of superb.

---

Here's a nice random fact that has nothing to do with this topic.  You can uninstall a package by appended a hyphen (`-`) after its name like so:

```bash
sudo apt-get install tmux-
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## References

- [Debian Packaging Intro](https://wiki.debian.org/Packaging/Intro)
- [Guide for Debian Maintainers](https://www.debian.org/doc/manuals/debmake-doc/index.en.html)
- [Package Naming Convention](https://www.debian.org/doc/manuals/debmake-doc/ch05.en.html#name-version)
- [Debian RFC822 Control Data](https://manpages.debian.org/bullseye/dpkg-dev/deb822.5.en.html)
- [DebianRepository](https://wiki.debian.org/DebianRepository)
- [Inspecting and extracting Debian package contents](https://blog.packagecloud.io/inspect-extract-contents-debian-packages/)

[`APT`]: https://en.wikipedia.org/wiki/APT_(software)
[`apt`]: https://linux.die.net/man/8/apt
[`apt-get`]: https://manpages.debian.org/bullseye/apt/apt-get.8.en.html
[`apt-cache`]: https://linux.die.net/man/8/apt-cache
[`apt-file`]: https://manpages.debian.org/bullseye/apt-file/apt-file.1.en.html
[`dget`]: https://manpages.debian.org/bullseye-backports/devscripts/dget.1.en.html
[`dpkg`]: https://www.man7.org/linux/man-pages/man1/dpkg.1.html
[`dpkg-deb`]: https://man7.org/linux/man-pages/man1/dpkg-deb.1.html
[the `FILES` section of the `apt-get` man page]: https://manpages.debian.org/bullseye/apt/apt-get.8.en.html#FILES
[`perl`]: https://www.perl.org/
[`devscripts`]: https://manpages.debian.org/stretch-backports/devscripts/index.html
[the Debian documentation]: https://wiki.debian.org/Packaging/Intro
[Debian Policy]: https://www.debian.org/doc/debian-policy/
[On Inspecting RPM Packages]: /2023/05/28/on-inspecting-rpm-packages/
[`/etc/apt/sources.list`]: https://manpages.debian.org/bullseye/apt/sources.list.5.en.html
[`/etc/apt/sources.list.d/`]: https://manpages.debian.org/bullseye/apt/sources.list.5.en.html#SOURCES.LIST.D
[Debian RFC822 control data format]: https://repolib.readthedocs.io/en/latest/deb822-format.html
[`stable`]: https://www.debian.org/releases/stable/
[`testing`]: https://www.debian.org/releases/testing/
[`unstable`]: https://www.debian.org/releases/unstable/
[three main releases]: https://www.debian.org/releases/
[`wget`]: https://man7.org/linux/man-pages/man1/wget.1.html
[`ar`]: https://man7.org/linux/man-pages/man1/ar.1.html
[`gzip`]: https://en.wikipedia.org/wiki/Gzip
[`xz`]: https://en.wikipedia.org/wiki/XZ_Utils
[`zstd`]: https://en.wikipedia.org/wiki/Zstd
[`bzip2`]: https://en.wikipedia.org/wiki/Bzip2
[`lzma`]: https://en.wikipedia.org/wiki/Lempel%E2%80%93Ziv%E2%80%93Markov_chain_algorithm
[`debconf`]: https://manpages.debian.org/bullseye/debconf-doc/debconf.7.en.html

