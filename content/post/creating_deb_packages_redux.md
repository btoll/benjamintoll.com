+++
title = "On Creating deb Packages, Redux"
date = "2023-07-15T17:06:30-04:00"
draft = true

+++

## Setup

The following must be and should be installed, respectively:

- `build-essential`
- `devscripts`
    + `debsign`
    + `debuild`
    + many others

In addition:

- `mc` (GUI)
- `git`
- `quilt`
- `git-buildpackage`
- an `HTTP` proxy
    + `apt-cacher-ng`
    + `squid`
- `reprepro`
- virtual machines
    + `virt-manager` and `qemu-kvm`
- multicast `DNS` discovery infrastructure for local network with virtual machines
    + `avahi-utils`
    > For all running virtual machines and the host PC, we can use each host name appended with `.local` for `SSH` to access each other.  Refer to `/etc/nsswitch.conf`.

Add the `DEBEMAIL` and `DEBFULLNAME` shell environment variables to one of the files that `interactive shells` will `source` when instantiating a new shell, usually `.bash_profile` or `.bashrc`.

The `debmake` tool is a replacement for `dh_make`.

> The `deb-make` command was popular before the `dh_make` command. The current `debmake` package starts its version from 4.0 to avoid version overlaps with the obsolete `debmake` package, which provided the `deb-make` command.

<quote>The `debmake` command only provides good template files.  These template files must be manually adjusted to their perfection to comply with the strict quality requirements of the Debian archive, if the generated package is intended for general consumption.</quote>

```bash
$ cd ~/projects/
$ tar -czf simple-chat-1.0.0.tar.gz simple-chat
$ mkdir simple-chat-1.0.0 && cd $_
$ debmake
... Make manual adjustments of generated configuration files
$ debuild
```

> `debuild` can be replaced by equivalent commands such as [`sbuild`].

`debmake` will delegate to:

- `debhelper`
- `dpkg-dev`
- `devscripts`
- [`sbuild`]
    + Provides a clean build environment using `schroot`.
    + It is the same build environment as the `buildd` infrastructure:
        - `schroot`
            + boosts `chroot` creation speed
        - `lintian`
            + finds bugs in the package
        - `piuparts`
            + finds bugs in the package
        - `autopkgtest'
            + finds bugs in the package
        - `ccache`
            + boosts the `gcc` speed (optional)
        - `libeatmydata1`
            + boosts the `dpkg` speed (optional)
        - `make`
            + boosts the build speed (optional)
- `schroot`
- et al.

> The non-native Debian package is the normal Debian package (`3.0 (quilt)` format).

```bash
$ sudo apt-get install how-can-i-help
$ how-can-i-help
```

---

**TODO**: where do these fit in?

`dpkg-deb`
`dput`
`dgit`
`licensecheck`
`uscan`
`autopkgtest`
[`debci`](https://wiki.debian.org/debci)

---

## `debuild`

This is a summary of commands that are run when using `debuild`.

It will call `dpkg-buildpackage`, which in turn will call:

1. `dpgk-source --before-build`
    - applies Debian patches (unless already applied)
1. `fakeroot debian/rules clean`
1. `dpkg-source --build`
    - build the Debian source package
1. `fakeroot debian/rules build`
1. `fakeroot debian/rules binary`
1. `dpkg-genbuildinfo`
    - generates the `.buildinfo` file
1. `dpkg-genchanges`
    - generates the `.changes` file
1. `fakeroot debian/rules clean`
1. `dpkg-source --after-build`
    - unapplies Debian patches (if they were applied during the `--before-build` step)
1. `debsign`
    - signs the `.dsc` and `.changes` files (unless `-us` and `-uc` options are set)

As noted, the `debuild` tool is a wrapper script of the `dpkg-buildpackage` to build the Debian binary package under the proper environment.

In addition, the `sbuild` command is a wrapper script to build the Debian binary package under the proper chroot environment with the proper environment variables.

## Building a Simple Package

1. Get the upstream source
1. Generate template files with `debmake`
    - the output is very verbose and descriptive
    - if no command-line options are set, it will select reasonable defaults
        + source package name
        + upstream version
        + binary package name
        + Debian revision
        + package type (`ELF` binary executable package)
        + `-x` option (default for the single binary package)

> `debhelper` should almost always be a build dependency of your package.

>  It is highly recommended to use other tools such as `licensecheck` from the `devscripts` package in conjunction with `debmake`, because it could fail in some cases when used with `debmake`.

## Package Name and Version

A package name cannot contain uppercase letters.  In addition, its name should be <= 30 characters, and its version number (including the Debian revision number) should be <= 14 characters.

Version strings can be compared using `dpkg --compare-versions`.

## `debian/rules`

### `$(DESTDIR)`

`$(DESTDIR)` path depends on the build type.

- `$(DESTDIR)=debian/binarypackage` (single binary package)
- `$(DESTDIR)=debian/tmp` (multiple binary package)

### `dh`

1. `dh clean`
    - clean files in the source tree
1. `dh build`
    - build the source tree
1. `dh build-arch`
    - build the source tree for architecture dependent packages
1. `dh build-indep`
    - build the source tree for architecture independent packages
1. `dh install`
    - install the binary files to `$(DESTDIR)`
1. `dh install-arch`
    - install the binary files to `$(DESTDIR)` for architecture dependent packages
1. `dh install-indep`
    - install the binary files to `$(DESTDIR)` for architecture independent packages
1. `dh binary`
    - generate the `deb` file
1. `dh binary-arch`
    - generate the `deb` file for architecture dependent packages
1. `dh binary-indep`
    - generate the `deb` file for architecture independent packages

For `debhelper` "compat >= 9", the `dh` command exports compiler flags (`CFLAGS`, `CXXFLAGS`, `FFLAGS`, `CPPFLAGS` and `LDFLAGS`) with values as returned by `dpkg-buildflags` if they are not set previously.

The `dpkg-buildflags` utility returns the build flags to use during package build.

To see the compiler flags supported by the current vendor:

```bash
$ dpkg-buildflags --list
CFLAGS
CPPFLAGS
CXXFLAGS
DFLAGS
FCFLAGS
FFLAGS
GCJFLAGS
LDFLAGS
OBJCFLAGS
OBJCXXFLAGS
```

> See the `SUPPORTED FLAGS` section in the manpage for more information about each flag.

Print any information that can be useful to explain the behavior of the program:

```bash
$ dpkg-buildflags --query
...
```

Because of the abstraction of the `dh` command, the `debian/rules` executable file can be as simple as:

```Makefile
#!/usr/bin/make -f
#export DH_VERBOSE = 1

%:
        dh $@
```

Essentially, this `dh` command functions as the sequencer to call all required `dh_*` commands at the right moment.

### Overrides

It is easy to override any one of the `dh_*` commands called by `dh`.  Simply prepend `override_` to any of the sequenced commands.

For instance, let's say that you wanted to override the `dh_build` command to add some custom arguments of your own that will be passed to your build system's `build` target in the `Makefile`.  It would look like this:

```Makefile
#!/usr/bin/make -f
#export DH_VERBOSE = 1

LC_ALL := C.UTF-8
export LC_ALL

%:
        dh $@

override_dh_auto_build:
        dh_build -- foo=bar

```

The arguments `foo` will be passed so the build system after the default parameters that `dh_build` usually passes.

Easy peasy.

Incidentally, variables for customizing `debian/rules` can be found in the `/usr/shar/dpkg/` directory.  Notably:

- `pkg-info.mk`
- `vendor.mk`
- `architecture.mk`
- `buildflags.mk`

For the definitions in `architecture.mk`, you can use the `dpkg-architecture` tool to get the value of a particular variable.

For example, to list all the environment variables:

```bash
$ dpkg-architecture --list
DEB_BUILD_ARCH=amd64
DEB_BUILD_ARCH_ABI=base
DEB_BUILD_ARCH_BITS=64
DEB_BUILD_ARCH_CPU=amd64
DEB_BUILD_ARCH_ENDIAN=little
DEB_BUILD_ARCH_LIBC=gnu
DEB_BUILD_ARCH_OS=linux
DEB_BUILD_GNU_CPU=x86_64
DEB_BUILD_GNU_SYSTEM=linux-gnu
DEB_BUILD_GNU_TYPE=x86_64-linux-gnu
DEB_BUILD_MULTIARCH=x86_64-linux-gnu
DEB_HOST_ARCH=amd64
DEB_HOST_ARCH_ABI=base
DEB_HOST_ARCH_BITS=64
DEB_HOST_ARCH_CPU=amd64
DEB_HOST_ARCH_ENDIAN=little
DEB_HOST_ARCH_LIBC=gnu
DEB_HOST_ARCH_OS=linux
DEB_HOST_GNU_CPU=x86_64
DEB_HOST_GNU_SYSTEM=linux-gnu
DEB_HOST_GNU_TYPE=x86_64-linux-gnu
DEB_HOST_MULTIARCH=x86_64-linux-gnu
DEB_TARGET_ARCH=amd64
DEB_TARGET_ARCH_ABI=base
DEB_TARGET_ARCH_BITS=64
DEB_TARGET_ARCH_CPU=amd64
DEB_TARGET_ARCH_ENDIAN=little
DEB_TARGET_ARCH_LIBC=gnu
DEB_TARGET_ARCH_OS=linux
DEB_TARGET_GNU_CPU=x86_64
DEB_TARGET_GNU_SYSTEM=linux-gnu
DEB_TARGET_GNU_TYPE=x86_64-linux-gnu
DEB_TARGET_MULTIARCH=x86_64-linux-gnu
```

Or, to get the value of a particular environment variable:

```bash
$ dpkg-architecture --query DEB_HOST_ARCH_ENDIAN
little
```

## `debian/control`

The `debian/control` file consists of blocks of metadata separated by a blank line.  In addition, some of the lines should be indented.  Note that this whitespace is intentional and **very** significant.

Each block of metadata defines the following, in order:

- metadata for the Debian source package
- metadata for the Debian binary package(s)

### `substvar`

The `debian/control` file also defines the package dependencies.

```bash
$ objdump -p simple-chat | grep NEEDED
  NEEDED               libc.so.6
```

## `debian/upstream/signing-key.asc`

https://www.debian.org/doc/manuals/debmake-doc/ch05.en.html#signing-key

## `debian/watch`

## Install `systemd` service files

`binarypackage.service` - `debmake -x3`

Installs into `lib/systemd/system/binarypackage.service`.

- `dh_systemd_enable`
- `dh_systemd_start`
- `dh_installinit`

## References

- [Guide for Debian Maintainers](https://www.debian.org/doc/manuals/debmake-doc/)
- [Debian Developers' Manuals](https://www.debian.org/doc/devel-manuals)
- [Overview of Debian Maintainer Tools](https://www.debian.org/doc/manuals/developers-reference/tools.html)
- [Debian Users' Manuals](https://www.debian.org/doc/user-manuals)
- [Debian New Members](https://nm.debian.org/)
- [Automatic Packaging Tools](https://wiki.debian.org/AutomaticPackagingTools)
- [Best Packaging Practices](https://www.debian.org/doc/manuals/developers-reference/best-pkging-practices.html)
- [Debian: 17 years of Free Software, "do-ocracy", and democracy](https://upsilon.cc/~zack/talks/2011/20110321-taipei.pdf)
- [`sbuild`]
- [`GNU` Coding Standards](https://www.gnu.org/prep/standards/)
- [Information For Maintainers of `GNU` Software](https://www.gnu.org/prep/maintain/)
- [Filesystem Hierarchy Standard](https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard)
- [A Brief History of Debian](https://www.debian.org/doc/manuals/project-history/)
- [Debian Sources](https://sources.debian.org/)
    + [Debian Code Search](https://wiki.debian.org/DebianCodeSearch)
- [Hardening](https://wiki.debian.org/Hardening)
- [Hardening Walkthrough](https://wiki.debian.org/HardeningWalkthrough)
- [DEP - Debian Enhancement Proposals](https://dep-team.pages.debian.net/)

[`sbuild`]: https://wiki.debian.org/sbuild

