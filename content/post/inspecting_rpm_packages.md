+++
title = "On Inspecting RPM Packages"
date = "2023-05-28T01:30:56-04:00"

+++

Ever wonder what makes up an [`RPM`] package?  I sure have.  Ever since I was a boy, I've lain awake at night and wondered about the contents of the package.  Does anyone really know?

In particular, we'll want to know a package's dependencies and files and look into the what makes up an `RPM` package and how we can inspect it without first installing it.

> The commands in this article were run on a `CentOS` 7 distribution using the [Yellowdog Updater, Modified] package manager.

You may be interested in learning about `deb` packages in [On Inspecting deb Packages].

---

- [Downloading the RPM Package](#downloading-the-rpm-package)
    + [`yumdownloader`](#yumdownloader)
- [Listing the Package Dependencies](#listing-the-package-dependencies)
    + [`yum`](#yum)
    + [`rpm`](#rpm)
    + [`repoquery`](#repoquery)
- [Listing the Package Files](#listing-the-package-files)
    + [`rpm`](#rpm-1)
    + [`repoquery`](#repoquery-1)
- [So, What Is An RPM Package?](#so-what-is-an-rpm-package)
    + [`cpio` archive](#cpio-archive)
        - [`BUILDROOT`](#buildroot)
    + [Header](#header)
- [The `SPEC` File](#the-spec-file)
- [Summary](#summary)
- [References](#references)

---

## Downloading the RPM Package

The first thing we'll want to do is download the `RPM` package without installing it.

> There are two kinds of packages, source RPM packages (`SRPM`) and binary `RPM` packages, both built from the same [`SPEC` file] (more on that later).

### `yumdownloader`

The main tool we'll use to accomplish this is [`yumdownloader`].  This utility will only download, so it is perfect for our use case.  Let's take a look at its options:

|**Option** |**Description** |
|:---|:---|
|`--archlist` |Limit the query to packages of given and compatible architectures. |
|`--destdir` |Specify a destination directory for the download.  Defaults to the current directory. |
|`--resolve` |When downloading `RPM`s, resolve dependencies and also download the required packages. |
|`--source` |Instead of downloading the binary RPMs, download the source RPMs. |
|`--urls` |Instead of downloading `RPM`s, list the `URL`s that would be downloaded. |

`yumdownloader` will inherit all other options from [`yum`].

For the examples in this article, we'll use our good friend [`tmux`].  Before we download this little fella, let's see where he lives:

```bash
$ yumdownloader --quiet --urls tmux
http://volico.mm.fcix.net/centos/7.9.2009/os/x86_64/Packages/tmux-1.8-4.el7.x86_64.rpm
```

Now, let's do the actual download:

```bash
$ yumdownloader --quiet tmux
```

> `yum` can also download without installing:
>
> ```bash
> $ sudo yum install --downloadonly --downloaddir . tmux
> ```

If `tmux` had any runtime dependencies, we could also download them (along with `tmux` itself) by specifying the `--resolve` option:

```bash
$ yumdownloader -q --resolve tmux
```

For good measure, we'll also download the `SRPM`, because we'll need it later:

```bash
$ yumdownloader -q --source tmux
```

Now that we have that hard work out of the way, we can begin our inspection, my dear Watson.

## Listing the Package Dependencies

> None of the following tools need to have first had the package downloaded before listing its dependencies.  Depending on the utility, it either expects a package name or a `URL`.

Ok, listing the package dependencies is easy enough.  We'll use `yum` for this, because the `yumdownloader` utility with the `deplist` subcommand will download all of the dependencies - if there are any dependencies to download - which is not what we want (remember, `yumdownloader` inherits `yum`s options).

### `yum`

In the case of `tmux`, there are no external dependencies.  Regardless, we'll still use `yum`:

```bash
$ yum --quiet deplist tmux
package: tmux.x86_64 1.8-4.el7
  dependency: /bin/sh
   provider: bash.x86_64 4.2.46-35.el7_9
  dependency: libc.so.6(GLIBC_2.14)(64bit)
   provider: glibc.x86_64 2.17-326.el7_9
  dependency: libevent-2.0.so.5()(64bit)
   provider: libevent.x86_64 2.0.21-4.el7
  dependency: libncurses.so.5()(64bit)   provider: ncurses-libs.x86_64 5.9-14.20130511.el7_4
  dependency: libresolv.so.2()(64bit)
   provider: glibc.x86_64 2.17-326.el7_9
  dependency: libresolv.so.2(GLIBC_2.2.5)(64bit)
   provider: glibc.x86_64 2.17-326.el7_9
  dependency: libtinfo.so.5()(64bit)
   provider: ncurses-libs.x86_64 5.9-14.20130511.el7_4
  dependency: libutil.so.1()(64bit)
   provider: glibc.x86_64 2.17-326.el7_9
  dependency: libutil.so.1(GLIBC_2.2.5)(64bit)
   provider: glibc.x86_64 2.17-326.el7_9
  dependency: rtld(GNU_HASH)
   provider: glibc.x86_64 2.17-326.el7_9   provider: glibc.i686 2.17-326.el7_9
```

> Note that this took the package's name, not a path to the file on the system.

### `rpm`

You can also use the `rpm` utility to get the same information using the `--requires` switch.  The first example queries against the downloaded file (hence, the relative path to the file), and the second example will use a `URL`.

Querying a local `RPM` package:

```bash
$ rpm -qp --requires tmux-1.8-4.el7.x86_64.rpm
/bin/sh
/bin/sh
libc.so.6()(64bit)
libc.so.6(GLIBC_2.14)(64bit)
libc.so.6(GLIBC_2.2.5)(64bit)
libc.so.6(GLIBC_2.3)(64bit)
libc.so.6(GLIBC_2.3.4)(64bit)
libc.so.6(GLIBC_2.4)(64bit)
libc.so.6(GLIBC_2.8)(64bit)
libevent-2.0.so.5()(64bit)
libncurses.so.5()(64bit)
libresolv.so.2()(64bit)
libresolv.so.2(GLIBC_2.2.5)(64bit)
libtinfo.so.5()(64bit)
libutil.so.1()(64bit)
libutil.so.1(GLIBC_2.2.5)(64bit)
rpmlib(CompressedFileNames) <= 3.0.4-1
rpmlib(FileDigests) <= 4.6.0-1
rpmlib(PayloadFilesHavePrefix) <= 4.0-1
rtld(GNU_HASH)
rpmlib(PayloadIsXz) <= 5.2-1
```

Querying a `URL` (this is especially useful when you don't know the download link):

```bash
$ rpm -pq --requires $(yumdownloader --quiet --urls tmux)
/bin/sh
/bin/sh
libc.so.6()(64bit)
libc.so.6(GLIBC_2.14)(64bit)
libc.so.6(GLIBC_2.2.5)(64bit)
libc.so.6(GLIBC_2.3)(64bit)
libc.so.6(GLIBC_2.3.4)(64bit)
libc.so.6(GLIBC_2.4)(64bit)
libc.so.6(GLIBC_2.8)(64bit)
libevent-2.0.so.5()(64bit)
libncurses.so.5()(64bit)
libresolv.so.2()(64bit)
libresolv.so.2(GLIBC_2.2.5)(64bit)
libtinfo.so.5()(64bit)
libutil.so.1()(64bit)
libutil.so.1(GLIBC_2.2.5)(64bit)
rpmlib(CompressedFileNames) <= 3.0.4-1
rpmlib(FileDigests) <= 4.6.0-1
rpmlib(PayloadFilesHavePrefix) <= 4.0-1
rtld(GNU_HASH)
rpmlib(PayloadIsXz) <= 5.2-1
```

### `repoquery`

If you would like to understand what are a package's dependencies **without** downloading it, use the [`repoquery`] utility (part of the [`yum-utils`] package).

You can query package information from any of your listed package repositories, which will download the `yum` repository metadata of the package and update the cache (you can point the tool to the local cache instead of a remote repository, even).

This can be extremely handy when needing to view the contents of a package not installed and downloaded on your local system.

It will only provide information about packages that are in the configured repositories on the system.

Here's an example.  We'll first try to get the information from the cache instead of going out on the Internet:

```bash
$ repoquery --list --cache memcached
Caching enabled but no local cache of /var/tmp/yum-vagrant-iCF5ZP/x86_64/7/base/d6d94c7d406fe7ad4902a97104b39a0d8299451832a97f31d71653ba982c955b-filelists.sqlite.bz2 from base/7/x86_64
```

Ok, looks like the cache hasn't been built because nothing has been downloaded yet.  Let's remedy that by running the same query without the `--cache` switch:

```bash
$ repoquery --list memcached
/etc/sysconfig/memcached
/usr/bin/memcached
/usr/bin/memcached-tool
/usr/lib/systemd/system/memcached.service
/usr/share/doc/memcached-1.4.15
/usr/share/doc/memcached-1.4.15/AUTHORS
/usr/share/doc/memcached-1.4.15/CONTRIBUTORS
/usr/share/doc/memcached-1.4.15/COPYING
/usr/share/doc/memcached-1.4.15/ChangeLog
/usr/share/doc/memcached-1.4.15/NEWS
/usr/share/doc/memcached-1.4.15/README.md
/usr/share/doc/memcached-1.4.15/protocol.txt
/usr/share/doc/memcached-1.4.15/readme.txt
/usr/share/doc/memcached-1.4.15/threads.txt
/usr/share/man/man1/memcached-tool.1.gz
/usr/share/man/man1/memcached.1.gz
```

If we were now to run the same query against the cache, we'd get the same information as above.

> If you're wondering, the `yum` cache is located in `/var/cache/yum/$basearch/$releasever/`, where `$basearch` and `$releasever` are `yum` variables referring to the system architecture and the OS release version, respectively.
>
> For instance, I've been running these examples on an older CentOS 7 distribution on a machine with an Intel processor, and its `yum` cache is located at `/var/cache/yum/x86_64/7/`.

> If you're curious about the list of configured package repositories are on the system (and from where the dependencies will be downloaded), run the following command:
>
> ```bash
> $ yum -q repolist
> ```
> Or:
>
> ```bash
> $ yum repoinfo
> ```
> > The second command is the same as `yum -v repolist`.

[Easy peasy].

Ok, onwards and upwards.

## Listing the Package Files

As we just saw with listing the package dependencies, we can use more than one tool to accomplish this and the file doesn't need to have been downloaded.

### `rpm`

Querying a local `RPM` package:

```bash
$ rpm -qlp tmux-1.8-4.el7.x86_64.rpm
/usr/bin/tmux
/usr/share/doc/tmux-1.8
/usr/share/doc/tmux-1.8/CHANGES
/usr/share/doc/tmux-1.8/FAQ
/usr/share/doc/tmux-1.8/TODO
/usr/share/doc/tmux-1.8/examples
/usr/share/doc/tmux-1.8/examples/bash_completion_tmux.sh
/usr/share/doc/tmux-1.8/examples/h-boetes.conf
/usr/share/doc/tmux-1.8/examples/n-marriott.conf
/usr/share/doc/tmux-1.8/examples/screen-keys.conf
/usr/share/doc/tmux-1.8/examples/t-williams.conf
/usr/share/doc/tmux-1.8/examples/tmux.vim
/usr/share/doc/tmux-1.8/examples/tmux_backup.sh
/usr/share/doc/tmux-1.8/examples/vim-keys.conf
/usr/share/man/man1/tmux.1.gz
```

|**Option** |**Description** |
|:---|:---|
|`-q`, `--query` |Query a package |
|`-l`, `--list` |List files in a package |
|`-p`, `--package` |Query an uninstalled package |

Here, we'll get the list of files again, but this time we'll also get the long listing of each file:

```bash
$ rpm -qlpv tmux-1.8-4.el7.x86_64.rpm
-rwxr-xr-x    1 root    root                   423128 Jun 10  2014 /usr/bin/tmux
drwxr-xr-x    2 root    root                        0 Jun 10  2014 /usr/share/doc/tmux-1.8
-rw-r--r--    1 root    root                    78119 Mar 26  2013 /usr/share/doc/tmux-1.8/CHANGES
-rw-r--r--    1 root    root                    16972 Feb 24  2013 /usr/share/doc/tmux-1.8/FAQ
-rw-r--r--    1 root    root                     7928 Feb 24  2013 /usr/share/doc/tmux-1.8/TODO
drwxr-xr-x    2 root    root                        0 Jun 10  2014 /usr/share/doc/tmux-1.8/examples
-rw-r--r--    1 root    root                     2014 Feb 10  2013 /usr/share/doc/tmux-1.8/examples/bash_completion_tmux.sh
-rw-r--r--    1 root    root                      913 Feb 10  2013 /usr/share/doc/tmux-1.8/examples/h-boetes.conf
-rw-r--r--    1 root    root                     2338 Feb 10  2013 /usr/share/doc/tmux-1.8/examples/n-marriott.conf
-rw-r--r--    1 root    root                     1805 Feb 10  2013 /usr/share/doc/tmux-1.8/examples/screen-keys.conf
-rw-r--r--    1 root    root                     2789 Feb 10  2013 /usr/share/doc/tmux-1.8/examples/t-williams.conf
-rw-r--r--    1 root    root                     5385 Feb 24  2013 /usr/share/doc/tmux-1.8/examples/tmux.vim
-rw-r--r--    1 root    root                     2513 Feb 10  2013 /usr/share/doc/tmux-1.8/examples/tmux_backup.sh
-rw-r--r--    1 root    root                     1088 Feb 10  2013 /usr/share/doc/tmux-1.8/examples/vim-keys.conf
-rw-r--r--    1 root    root                    26855 Jun 10  2014 /usr/share/man/man1/tmux.1.gz
```

|**Option** |**Description** |
|:---|:---|
|`-q`, `--query` |Query a package |
|`-l`, `--list` |List files in a package |
|`-p`, `--package` |Query an uninstalled package |
|`-v`, `--verbose` |Print verbose information, such as the file permissions and ownership (like long listing, `ls -l`) |

Querying a `URL` (this is especially useful when you don't know the download link):

```bash
$ rpm -qlp $(yumdownloader --quiet --urls tmux)
/usr/bin/tmux
/usr/share/doc/tmux-1.8
/usr/share/doc/tmux-1.8/CHANGES
/usr/share/doc/tmux-1.8/FAQ
/usr/share/doc/tmux-1.8/TODO
/usr/share/doc/tmux-1.8/examples
/usr/share/doc/tmux-1.8/examples/bash_completion_tmux.sh
/usr/share/doc/tmux-1.8/examples/h-boetes.conf
/usr/share/doc/tmux-1.8/examples/n-marriott.conf
/usr/share/doc/tmux-1.8/examples/screen-keys.conf
/usr/share/doc/tmux-1.8/examples/t-williams.conf
/usr/share/doc/tmux-1.8/examples/tmux.vim
/usr/share/doc/tmux-1.8/examples/tmux_backup.sh
/usr/share/doc/tmux-1.8/examples/vim-keys.conf
/usr/share/man/man1/tmux.1.gz
```

### `repoquery`

To get a list of files using the `repoquery` utility, use the `-l` or `--list` option:

```
$ repoquery --list tmux
/usr/bin/tmux
/usr/share/doc/tmux-1.8
/usr/share/doc/tmux-1.8/CHANGES
/usr/share/doc/tmux-1.8/FAQ
/usr/share/doc/tmux-1.8/TODO
/usr/share/doc/tmux-1.8/examples
/usr/share/doc/tmux-1.8/examples/bash_completion_tmux.sh
/usr/share/doc/tmux-1.8/examples/h-boetes.conf
/usr/share/doc/tmux-1.8/examples/n-marriott.conf
/usr/share/doc/tmux-1.8/examples/screen-keys.conf
/usr/share/doc/tmux-1.8/examples/t-williams.conf
/usr/share/doc/tmux-1.8/examples/tmux.vim
/usr/share/doc/tmux-1.8/examples/tmux_backup.sh
/usr/share/doc/tmux-1.8/examples/vim-keys.conf
/usr/share/man/man1/tmux.1.gz
```

Like taking candy from a baby.

## So, What Is An RPM Package?

An [`RPM`] package consists simply a header on top of a [`cpio`] archive.

The former is metadata and includes information such as the package name, version, file list and architecture, et al., while the latter is an archive of the files (binary and text, including man pages) that will be installed on the local filesystem.

The `cpio` archive is essentially a `chroot`] (the paths and directory hierarchies created in the [`BUILDROOT`] directory when creating the package), and it mirrors the locations of the files to be installed. These will be locations such as `/usr/sbin`, `/usr/bin/` and `/usr/share/doc/`, et al., and will contain binaries, man pages and other files which were all created by the directives in the [`SPEC` file] and its different sections such as `%build`, `%files` and `%install`, etc.

> The `SPEC` file, incidentally, is known as the "recipe" for how the package is created.

### `cpio` archive

The archive is a [`chroot`] that is created by the package in the `%install` section of the `SPEC` file (as we'll see below).  These package assets are created in the [`BUILDROOT`](#buildroot), the directory under which `rpm` will look for any files to package.  It is the same directory hierarchy that should be used when the files are installed on the destination filesystem.

We'll use the [`rpm2cpio`] utility to extract the `cpio` archive from an `RPM` package.  Here, we'll extract the `cpio` archive from the `RPM` package, piping the results to `cpio` which creates the files on the local filesystem:

```bash
$ rpm2cpio tmux-1.8-4.el7.x86_64.rpm | cpio -idmv
./usr/bin/tmux
./usr/share/doc/tmux-1.8
./usr/share/doc/tmux-1.8/CHANGES
./usr/share/doc/tmux-1.8/FAQ
./usr/share/doc/tmux-1.8/TODO
./usr/share/doc/tmux-1.8/examples
./usr/share/doc/tmux-1.8/examples/bash_completion_tmux.sh
./usr/share/doc/tmux-1.8/examples/h-boetes.conf
./usr/share/doc/tmux-1.8/examples/n-marriott.conf
./usr/share/doc/tmux-1.8/examples/screen-keys.conf
./usr/share/doc/tmux-1.8/examples/t-williams.conf
./usr/share/doc/tmux-1.8/examples/tmux.vim
./usr/share/doc/tmux-1.8/examples/tmux_backup.sh
./usr/share/doc/tmux-1.8/examples/vim-keys.conf
./usr/share/man/man1/tmux.1.gz
1122 blocks
```

Coupling the `-t` switch with `-v` will also produce a long listing of the processed files:

```bash
$ rpm2cpio tmux-1.8-4.el7.x86_64.rpm | cpio -idmtv
-rwxr-xr-x   1 root     root       423128 Jun 10  2014 ./usr/bin/tmux
drwxr-xr-x   3 root     root            0 Jun 10  2014 ./usr/share/doc/tmux-1.8
-rw-r--r--   1 root     root        78119 Mar 26  2013 ./usr/share/doc/tmux-1.8/CHANGES
-rw-r--r--   1 root     root        16972 Feb 24  2013 ./usr/share/doc/tmux-1.8/FAQ
-rw-r--r--   1 root     root         7928 Feb 24  2013 ./usr/share/doc/tmux-1.8/TODO
drwxr-xr-x   2 root     root            0 Jun 10  2014 ./usr/share/doc/tmux-1.8/examples
-rw-r--r--   1 root     root         2014 Feb 10  2013 ./usr/share/doc/tmux-1.8/examples/bash_completion_tmux.sh
-rw-r--r--   1 root     root          913 Feb 10  2013 ./usr/share/doc/tmux-1.8/examples/h-boetes.conf
-rw-r--r--   1 root     root         2338 Feb 10  2013 ./usr/share/doc/tmux-1.8/examples/n-marriott.conf
-rw-r--r--   1 root     root         1805 Feb 10  2013 ./usr/share/doc/tmux-1.8/examples/screen-keys.conf
-rw-r--r--   1 root     root         2789 Feb 10  2013 ./usr/share/doc/tmux-1.8/examples/t-williams.conf
-rw-r--r--   1 root     root         5385 Feb 24  2013 ./usr/share/doc/tmux-1.8/examples/tmux.vim
-rw-r--r--   1 root     root         2513 Feb 10  2013 ./usr/share/doc/tmux-1.8/examples/tmux_backup.sh
-rw-r--r--   1 root     root         1088 Feb 10  2013 ./usr/share/doc/tmux-1.8/examples/vim-keys.conf
-rw-r--r--   1 root     root        26855 Jun 10  2014 ./usr/share/man/man1/tmux.1.gz
1122 blocks
```

|**Option** |**Description** |
|:---|:---|
|`-i`, `--extract` |Run in copy-in mode |
|`-d`, `--make-directories` |Create leading directories where needed |
|`-m`, `--preserve-modification-time` |Retain previous file modification times when creating files |
|`-t`, `--list` |Print a table of contents of the input |
|`-v`, `--verbose` |List the files processed, or with `-t', give an `ls -l' style table of contents listing |

Both of the previous examples will create the following directory tree:

```bash
$ tree usr/
usr/
├── bin
│   └── tmux
└── share
    ├── doc
    │   └── tmux-1.8
    │       ├── CHANGES
    │       ├── examples
    │       │   ├── bash_completion_tmux.sh
    │       │   ├── h-boetes.conf
    │       │   ├── n-marriott.conf
    │       │   ├── screen-keys.conf
    │       │   ├── tmux_backup.sh
    │       │   ├── tmux.vim
    │       │   ├── t-williams.conf
    │       │   └── vim-keys.conf
    │       ├── FAQ
    │       └── TODO
    └── man
        └── man1
            └── tmux.1.gz

7 directories, 13 files
```

Of course, the prior examples were both extracted the `cpio` archive for a binary `RPM` package.  But what about a source `RPM`?  Let's give it a whirl:

```bash
$ rpm2cpio tmux-1.8-4.el7.src.rpm | cpio -idmv
tmux-1.8.tar.gz
tmux.spec
826 blocks
```

This extracted the `SPEC` file and any sources.  Although not shown here because the package doesn't contain any, it also would have extracted any [patches] that would have been part of the package.

This is important to keep in mind when you want to access the `SPEC` file that the package builder used.

#### `BUILDROOT`

To understand what the `BUILDROOT` is, I'm just going to quote directly from the [section on BuildRoots](https://rpm-packaging-guide.github.io/#buildroots) from the [RPM Packaging Guide], as I couldn't write it any better:

<cite>In the context of RPM packaging, "buildroot" is a `chroot` environment. This means that the build artifacts are placed here using the same filesystem hierarchy as will be in the end user’s system, with "buildroot" acting as the root directory. The placement of build artifacts should comply with the [filesystem hierarchy standard] of the end user's system.</cite>

<cite>The files in "buildroot" are later put into a `cpio` archive, which becomes the main part of the `RPM`. When `RPM` is installed on the end user's system, these files are extracted in the root directory, preserving the correct hierarchy.</cite>

### Header

All of the information a package contains, apart from signatures and the actual files, is in a part of the package called the header.  So, the header contains metadata about the package, and the `RPM` package manager uses this metadata to determine dependencies, where to install files, and other information.

This information is able to be queried.  Each piece of information in the header has a tag associated with it, and we can print these tags with formatting information.

`RPM` is aware of a great number of tags, and we can see what they are by running the following command:

```bash
$ rpm --querytags
[snipped output]
$ rpm --querytags | wc -l
205
```

On my `CentOS` distribution, `RPM` is aware of 205 tags.  Holy Zap!

For example, we can get a list of the name and size of every installed package on the system.  For this, we'll use the [`--queryformat` option]:

```bash
$ rpm -qa --queryformat "%{NAME} %{SIZE}\n"
```

To get the name and size of the uninstalled `tmux` package, issue the following command with the `-p` flag:

```bash
$ rpm -qp --queryformat "%{NAME} %{SIZE}\n" tmux-1.8-4.el7.x86_64.rpm
tmux 571847
```

Here, we are getting a list of all the files in the uninstalled `tmux` package.  Note the addition of additional formatting information, where it's printing the `FILENAMES` in the first 60 bytes and then right-aligning the `FILESIZES`.

Further, the aformentioned tags are [arrays], and it's iterating through them (similar to `bash` variables in this respect):

```bash
$ rpm -qp --queryformat "[%-60{FILENAMES} %10{FILESIZES}\n]" tmux-1.8-4.el7.x86_64.rpm
/usr/bin/tmux                                                    423128
/usr/share/doc/tmux-1.8                                            4096
/usr/share/doc/tmux-1.8/CHANGES                                   78119
/usr/share/doc/tmux-1.8/FAQ                                       16972
/usr/share/doc/tmux-1.8/TODO                                       7928
/usr/share/doc/tmux-1.8/examples                                   4096
/usr/share/doc/tmux-1.8/examples/bash_completion_tmux.sh           2014
/usr/share/doc/tmux-1.8/examples/h-boetes.conf                      913
/usr/share/doc/tmux-1.8/examples/n-marriott.conf                   2338
/usr/share/doc/tmux-1.8/examples/screen-keys.conf                  1805
/usr/share/doc/tmux-1.8/examples/t-williams.conf                   2789
/usr/share/doc/tmux-1.8/examples/tmux.vim                          5385
/usr/share/doc/tmux-1.8/examples/tmux_backup.sh                    2513
/usr/share/doc/tmux-1.8/examples/vim-keys.conf                     1088
/usr/share/man/man1/tmux.1.gz                                     26855
```

Let's get a long listing of the files:

```bash
$ rpm -qp --queryformat "[%{FILEMODES:perms} %{FILENAMES}\n]" tmux-1.8-4.el7.x86_64.rpm
-rwxr-xr-x /usr/bin/tmux
drwxr-xr-x /usr/share/doc/tmux-1.8
-rw-r--r-- /usr/share/doc/tmux-1.8/CHANGES
-rw-r--r-- /usr/share/doc/tmux-1.8/FAQ
-rw-r--r-- /usr/share/doc/tmux-1.8/TODO
drwxr-xr-x /usr/share/doc/tmux-1.8/examples
-rw-r--r-- /usr/share/doc/tmux-1.8/examples/bash_completion_tmux.sh
-rw-r--r-- /usr/share/doc/tmux-1.8/examples/h-boetes.conf
-rw-r--r-- /usr/share/doc/tmux-1.8/examples/n-marriott.conf
-rw-r--r-- /usr/share/doc/tmux-1.8/examples/screen-keys.conf
-rw-r--r-- /usr/share/doc/tmux-1.8/examples/t-williams.conf
-rw-r--r-- /usr/share/doc/tmux-1.8/examples/tmux.vim
-rw-r--r-- /usr/share/doc/tmux-1.8/examples/tmux_backup.sh
-rw-r--r-- /usr/share/doc/tmux-1.8/examples/vim-keys.conf
-rw-r--r-- /usr/share/man/man1/tmux.1.gz
```

Let's turn now to viewing [scriptlets].  If you're unsure what the tag names are, simply pipe the full list of tag names to `grep`.  We know that if there are one or more scriptlets, they'll likely to be post-install and post-uninstall.  Let's try it out:

```bash
$ rpm --querytags | grep -i post
POSTIN
POSTINFLAGS
POSTINPROG
POSTTRANS
POSTTRANSFLAGS
POSTTRANSPROG
POSTUN
POSTUNFLAGS
POSTUNPROG
$ rpm -qp --queryformat "%{POSTIN}\n%{POSTUN}\n" tmux-1.8-4.el7.x86_64.rpm
if [ ! -f /etc/shells ] ; then
    echo "/usr/bin/tmux" > /etc/shells
else
    grep -q "^/usr/bin/tmux$" /etc/shells || echo "/usr/bin/tmux" >> /etc/shells
fi
if [ $1 -eq 0 ] && [ -f /etc/shells ]; then
    sed -i '\!^/usr/bin/tmux$!d' /etc/shells
fi
```

There they are, those little rascals!

> A scriptlet is part of the package and runs during specific events, like pre- and post-installation or pre- and post-uninstallation of a package.

Here's a random example:

```bash
$ rpm -qp --queryformat "%{URL} %{PACKAGER}\n" tmux-1.8-4.el7.x86_64.rpm
http://sourceforge.net/projects/tmux CentOS BuildSystem <http://bugs.centos.org>
```

Let's now take a look at the `SPEC` file.

## The `SPEC` File

First, we need to access it.  How do we do that?

The [`SPEC` file] is the recipe on how to create an `RPM` package.  However, it's (usually) not packaged in a binary `RPM`, so the easiest way to obtain it is to download the `SRPM` (the source `RPM` package).

We've already down that, but quickly, while he's away, we'll list the steps.

```bash
$ yumdownloader -q --source tmux
```

Once we have the `SRPM`, we're home free.  In the last section, we got our dirty little hands on the `SPEC` file by extracting the a`cpio` archive with the `rpm2cpio` utility and then piped that to `cpio` to create the files on disk.

However, we can install it using `rpm`, and this will create the `rpmbuild` directory (for those familiar with the `rpmdev-setuptree` tool, this will look familiar):

```bash
$ rpm -i tmux-1.8-4.el7.src.rpm
$ tree rpmbuild/
rpmbuild/
├── SOURCES
│   └── tmux-1.8.tar.gz
└── SPECS
    └── tmux.spec

    2 directories, 2 files
```

There it is.  Let's look at its contents:

```spec
Name:           tmux
Version:        1.8
Release:        4%{?dist}
Summary:        A terminal multiplexer

Group:          Applications/System
# Most of the source is ISC licensed; some of the files in compat/ are 2 and
# 3 clause BSD licensed.
License:        ISC and BSD
URL:            http://sourceforge.net/projects/tmux
Source0:        http://downloads.sourceforge.net/%{name}/%{name}-%{version}.tar.gz

BuildRequires:  ncurses-devel
BuildRequires:  libevent-devel

%description
tmux is a "terminal multiplexer."  It enables a number of terminals (or
windows) to be accessed and controlled from a single terminal.  tmux is
intended to be a simple, modern, BSD-licensed alternative to programs such
as GNU Screen.

%prep
%setup -q

%build
%configure
make %{?_smp_mflags} LDFLAGS="%{optflags}"

%install
rm -rf %{buildroot}
make install DESTDIR=%{buildroot} INSTALLBIN="install -p -m 755" INSTALLMAN="install -p -m 644"

%post
if [ ! -f %{_sysconfdir}/shells ] ; then
    echo "%{_bindir}/tmux" > %{_sysconfdir}/shells
else
    grep -q "^%{_bindir}/tmux$" %{_sysconfdir}/shells || echo "%{_bindir}/tmux" >> %{_sysconfdir}/shellsfi

%postun
if [ $1 -eq 0 ] && [ -f %{_sysconfdir}/shells ]; then    sed -i '\!^%{_bindir}/tmux$!d' %{_sysconfdir}/shells
fi
%files
%defattr(-,root,root,-)
%doc CHANGES FAQ TODO examples/
%{_bindir}/tmux
%{_mandir}/man1/tmux.1.*

%changelog
* Fri Jan 24 2014 Daniel Mach <dmach@redhat.com> - 1.8-4
- Mass rebuild 2014-01-24

* Fri Dec 27 2013 Daniel Mach <dmach@redhat.com> - 1.8-3
- Mass rebuild 2013-12-27
...
```

You can see the `%post` (`POSTIN`) and `%postun` (`POSTUN`) scriptlets that we queried earlier.  Note there though, the macros haven't been expanded.  Compare the scriptlets above to the ones that we got earlier using the `--query-format` switch to see the difference between the unexpanded and expanded macros.

> For the curious, the macros were replaced by [`rpmbuild`] during the package creation process.

By the way, here's another way to list its `postinstall` and `postuninstall` scripts using the `rpm` utility and the `--scripts` switch:

```bash
$ rpm -qp --scripts tmux-1.8-4.el7.x86_64.rpm
postinstall scriptlet (using /bin/sh):
if [ ! -f /etc/shells ] ; then
    echo "/usr/bin/tmux" > /etc/shells
else
    grep -q "^/usr/bin/tmux$" /etc/shells || echo "/usr/bin/tmux" >> /etc/shells
fi
postuninstall scriptlet (using /bin/sh):
if [ $1 -eq 0 ] && [ -f /etc/shells ]; then
    sed -i '\!^/usr/bin/tmux$!d' /etc/shells
fi
```

> So, what are the scriptlets doing?
>
> Here, the scripts are simply adding the location of the `tmux` binary to the list of valid login shells in [`/etc/shells`] or removing it, depending on the operation (`/etc/shells` is itself consulted by utilities like [`chsh`], et al.).
>
> ```bash
> $ cat /etc/shells
> # /etc/shells: valid login shells
> /bin/sh
> /bin/bash
> /usr/bin/bash
> /bin/rbash
> /usr/bin/rbash
> /bin/dash
> /usr/bin/dash
> /usr/bin/tmux
> /bin/mksh
> /usr/bin/mksh
> /bin/mksh-static
> /usr/lib/klibc/bin/mksh-static
> ```
>
> This is quite common.

|**Option** |**Description** |
|:---|:---|
|`-q`, `--query` |Query a package |
|`-p`, `--package` |Query an uninstalled package |
|`--scripts` |List the package specific scriptlet(s) that are used as part of the installation and uninstallation processes |

To view the scriptlet(s) of an **installed** package, simply remove the `-p` flag and pass the name of the package instead of the path to the `RPM`:

```bash
$ rpm -q --scripts iputils
postinstall scriptlet (using /bin/sh):

if [ $1 -eq 1 ] ; then
        # Initial installation
        systemctl preset rdisc.service >/dev/null 2>&1 || :
fi
preuninstall scriptlet (using /bin/sh):

if [ $1 -eq 0 ] ; then
        # Package removal, not upgrade
        systemctl --no-reload disable rdisc.service > /dev/null 2>&1 || :
        systemctl stop rdisc.service > /dev/null 2>&1 || :
fi
postuninstall scriptlet (using /bin/sh):

systemctl daemon-reload >/dev/null 2>&1 || :
if [ $1 -ge 1 ] ; then
        # Package upgrade, not uninstall
        systemctl try-restart rdisc.service >/dev/null 2>&1 || :
fi
```

> To list all of the installed packages, do the following:
>
> ```bash
> $ rpm -qa
> ```
>
> Or, use [`yum`]:
>
> ```bash
> $ yum list installed
> ```

Bear in mind that the [scriptlets] are defined in the `SPEC` file and are not included in a binary `RPM` (unless the maintainer explicitly included it, and usually there's no reason to do that).

## Summary

As we've seen, there are many ways and several tools that can inspect a package before installation that all do similar things.  It can be a bit confusing trying to determine the simplest way to do a particular task, and hopefully this guide gets you started down that path.

## References

- [RPM Packaging Guide]
- [Maximum RPM](https://ftp.osuosl.org/pub/rpm/max-rpm/)
- [Scriptlets](https://docs.fedoraproject.org/en-US/packaging-guidelines/Scriptlets/)
- [Query formats](https://rpm-software-management.github.io/rpm/manual/queryformat.html)
- [GNU Make](https://www.gnu.org/software/make/)
- [Inspecting and extracting RPM package contents with & without installing the package](https://blog.packagecloud.io/inspect-extract-contents-rpm-packages/)
- [How to use yum to download a package without installing it](https://access.redhat.com/solutions/10154)
- [Filesystem Hierarchy Standard](https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html)

[RPM Packaging Guide]: https://rpm-packaging-guide.github.io/
[`RPM`]: https://man7.org/linux/man-pages/man8/rpm.8.html
[`cpio`]: https://linux.die.net/man/1/cpio
[`rpm2cpio`]: https://man7.org/linux/man-pages/man8/rpm2cpio.8.html
[`tmux`]: https://github.com/tmux/tmux/wiki
[scriptlets]: https://en.wikipedia.org/wiki/Scriptlet
[`/etc/shells`]: https://man7.org/linux/man-pages/man5/shells.5.html
[`chsh`]: https://man7.org/linux/man-pages/man1/chsh.1.html
[`yum`]: https://linux.die.net/man/8/yum
[`repoquery`]: https://www.man7.org/linux/man-pages/man1/repoquery.1.html
[`yum-utils`]: https://man7.org/linux/man-pages/man1/yum-utils.1.html
[`rpmbuild`]: https://man7.org/linux/man-pages/man8/rpmbuild.8.html
[Yellowdog Updater, Modified]: https://en.wikipedia.org/wiki/Yum_(software)
[`yumdownloader`]: https://man7.org/linux/man-pages/man1/yumdownloader.1.html
[`SPEC` file]: https://rpm-packaging-guide.github.io/#what-is-a-spec-file
[`chroot`]: https://en.wikipedia.org/wiki/Chroot
[Easy peasy]: https://www.youtube.com/watch?v=-OR2lKvPoZE&t=21s
[`BUILDROOT`]: https://rpm-packaging-guide.github.io/#buildroots
[filesystem hierarchy standard]: https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard
[`--queryformat` option]: https://rpm-software-management.github.io/rpm/manual/queryformat.html
[arrays]: https://rpm-software-management.github.io/rpm/manual/queryformat.html#arrays
[patches]: /2019/06/16/on-patching/
[On Inspecting deb Packages]: /2023/06/01/on-inspecting-deb-packages/

