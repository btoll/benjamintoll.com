+++
title = "On Creating deb Packages"
date = "2023-06-21T21:05:01-04:00"

+++

This post is going to outline the steps needed to create a simple `deb` package.

---

- [Create `debian` Directory and Control Files](#create-debian-directory-and-control-files)
    + [`dh_make`](#dh_make)
- [Create `deb` Package](#create-deb-package)
    + [`dpkg-buildpackage`](#dpkg-buildpackage)
        - [Binary Package](#binary-package)
        - [Source Package](#source-package)
        - [Unsigned](#unsigned)
        - [Signed](#signed)
- [Static Analysis](#static-analysis)
    + [`lintian`](#lintian)
- [Sign Package and Build Files](#sign-package-and-build-files)
    + [`debsign`](#debsign)
- [Pulling It All Together](#pulling-it-all-together)
    + [`debuild`](#debuild)
- [References](#references)

---

Before we dive in, I wanted to clarify a couple of points right off the bat.

First, there are different ways that you can create a package.  You can take a kind of à la carte approach, where you are running a tool that does one specific thing, one after the other.  Or, you can use a tool that combines that approach and uses only one tool that delegates the tasks.

For the former, we'll look at the [`dpkg-buildpackage`], [`lintian`] and [`debsign`] tools, and for the latter we'll look at the [`debuild`] tool.

## Create `debian` Directory and Control Files

The first thing to do is setup information needed by the [`dh_make`] program, which will create the `debian` directory and its control files that are needed to create a Debian package.  This includes environment variables like `DEBFULLNAME` and `DEBEMAIL` that will be used in some control files like `debian/changelog` and `debian/control`.

There are only a few rules about invoking `dh_make`, and here they are:

- it must be invoked within the directory containing the source code
- the directory must be named with the convention of `{packagename}-{version}`
- the `packagename` and `version` must be all lowercase, digits and dashes
- in addition, the `version` can also contain the symbols plus (`+`), dot (`.`) and tilde (`~`)
- the `version` must start with a digit

I think we can abide by that.

> If you need to, you can override these restrictions with the `--packagename` option.

For example, for the `1.0.0` version of the [`asbits`] program, the directory should be named `asbits-1.0.0`.

```bash
$ export DEBFULLNAME="Benjamin Toll"
# Email can be specified on command line.
$ export DEBEMAIL="ben@benjamintoll.com"
$ mkdir asbits-1.0.0
$ cd asbits-1.0.0
```

Or, clone an existing `git` repository and then rename the directory to conform with the above standard.  Something like this:

```bash
$ git clone https://github.com/btoll/asbits.git
$ mv asbits{,-1.0.0}
$ ls asbits-1.0.0
asbits  asbits.c  asbits.h  LICENSE  Makefile
```

### `dh_make`

As mentioned already, the `dh_make` binary will create a `debian` directory with generated control files needed to create a Debian package.  In other words, it prepares the upstream source for Debian packaging.

> The files that are created within the `debian/` subdirectory are boilerplate and examples.  They are meant to be customized for your particular package.

Importantly, this only needs to be done once.  Once `dh_make` has generated the control files, then you can choose the files you wish to use from them to build your package.

> Of course, you don't need to run this command at all if you have another way of creating the files (by hand, even).

Here are some of the most common options.

|**Option** |**Description** |
|:---|:---|
|`-c`, `--copyright` |Use license type in copyright file. |
|`-e`, `--email` |Use address as the e-mail address in the Maintainer: field of `debian/control` file. |
|`-n`, `--native` |Create a native Debian packages, i.e., do not generate a `.orig` archive, since it will be generated when building  with `dpkg-buildpackage`.  The version number will not have a Debian revision number (e.g. -1) appended to it.|
|`-p`, `--packagename` |Force the package name to be name, good for packages with hyphens in their name or other strangeness.  You can also make the parameter `name_version` which will set both the package name and version and bypass and directory checking. |
|`-s`, `--single` |Automatically set the package class to Single binary, skipping the question. |
|`-y`, `--yes` |Automatic yes to prompts and run non-interactively.  The package class needs to be set for `dh_make` to run fully automatically. |

To run interactively and generate the `debian` directory:

```bash
$ dh_make --native
Type of package: (single, indep, library, python)
[s/i/l/p]?
Maintainer Name     : Benjamin Toll
Email-Address       : vagrant@debian-bullseye
Date                : Thu, 22 Jun 2023 04:29:55 +0000
Package Name        : asbits
Version             : 1.0.0
License             : gpl3
Package Type        : single
Are the details correct? [Y/n/q]
Currently there is not top level Makefile. This may require additional tuning
Done. Please edit the files in the debian/ subdirectory now.

```

Note that I was asked two questions:

- Type of package?
- Are the details correct?

To automate this, include the `--yes` or `-y` option (package class needs to be set, for example, `--single`, `--library`, `--indep`):

```bash
$ dh_make --native --single --yes
```

Here is the final invocation I ended up using to build a binary package, which includes a copyright (`gpl3`) and my email as an option (remember, I had already set the `DEBFULLNAME` environment variable as the part of the setup above):

```bash
$ dh_make --copyright gpl3 --email ben@benjamintoll.com --native --single --yes
Maintainer Name     : Benjamin Toll
Email-Address       : ben@benjamintoll.com
Date                : Fri, 23 Jun 2023 22:18:59 +0000
Package Name        : asbits
Version             : 1.0.0
License             : gpl3
Package Type        : single
Done. Please edit the files in the debian/ subdirectory now.
```

Regardless of which way you invoke `dh_make`, you should get a generated directory with contents similar to the following:

```bash
$ ls debian/
asbits.cron.d.ex    changelog  manpage.1.ex     postinst.ex  prerm.ex       README.source    source
asbits.doc-base.EX  control    manpage.sgml.ex  postrm.ex    README         rules
asbits-docs.docs    copyright  manpage.xml.ex   preinst.ex   README.Debian  salsa-ci.yml.ex
```

> If you don't follow the naming convention mentioned above for the directory, you will get an error:
>
> ```bash
> $ dh_make --copyright gpl3 --email ben@benjamintoll.com --native --single --yes
>
> For dh_make to find the package name and version, the current directory
> needs to be in the format of <package>-<version>.  Alternatively use the
> -p flag using the format <name>_<version> to override it.
> The directory name you have specified is invalid!
>
> Your current directory is:
> /home/vagrant/asbits
> Perhaps you could try going to directory where the sources are?
>
> Please note that this change is necessary ONLY during the initial
> Debianization with dh_make.  When building the package, dpkg-source
> will gracefully handle almost any upstream tarball.
> ```

Now, the `asbits-1.0.0` directory should contain the new `debian/` subdirectory:

```bash
$ ls -F
asbits.c  asbits.h  debian/  LICENSE  Makefile
```

Notes:

- the `dh_make` utility will create a `control` file with the following line, which means the `compat` file isn't necessary (it's also not even generated by `dh_make`):
    `Build-Depends: debhelper-compat (= 13)`
- `dpkg-buildpackage` will throw an error if the compatibility level is set twice, so remove `compat` from the control files
- format the `copyright` control file using this guide:
    + https://www.debian.org/doc/packaging-manuals/copyright-format/1.0/
- in `debian/changelog`, `UNRELEASED` will appear in the `.changes` file of a source build as the value of the `Distribution` field.
    + https://www.debian.org/doc/debian-policy/ch-controlfields.html#changes

## Create `deb` Package

The [`dpkg-buildpackage`] utility is the way to create Debian packages from sources, and it's ridiculously easy.  As long as you're in the source directory, you can create binary and source packages with only a few command-line switches.

It works by automating the process of building a package by iterating over a number of steps, called hooks:

- `init`
- `preclean`
- `source` (if building a source package)
- `build`
- `binary` (if building a binary package)
- `buildinfo`
- `changes`
- `postclean`
- `check`
- `sign`

For each hook, one or more `dpkg-` utilities are called that perform a function and perhaps even generate a build artifact (such as the `.changes` and `.buildinfo` files).  Unfortunately, going into this in depth is outside the scope of this article.

Let's take a quick overview.

### `dpkg-buildpackage`

First, here are some common options.

|**Option** |**Description** |
|:---|:---|
|`-b` |Equivalent to `--build=binary` or `--build=any,all` |
|`--build` |Specifies the build type from a comma-separated list of components (since dpkg 1.18.5).  Passed to [`dpkg-genchanges`]. |
|`-D`, `--check-builddeps` |Check build dependencies and conflicts; abort if unsatisfied (long option since dpkg 1.18.8).  This is the default behavior. |
|`--force-sign` |Force the signing of the resulting files (since dpkg 1.17.0), regardless of `-us`, `--unsigned-source`, `-ui`, `--unsigned-buildinfo`, `-uc`, `--unsigned-changes` or other internal heuristics. |
|`-F` |Equivalent to --build=full, --build=source,binary or --build=source,any,all (since dpkg 1.15.8). |
|`-g` |Equivalent to `--build=source,all` (since dpkg 1.17.11). |
|`-k`, `--sign-key` |Specify a key-ID to use when signing packages (long option since dpkg 1.18.8).  Can also set using the `DEB_SIGN_KEYID` environment variable. |
|`-m`, `--release-by` |Use maintainer-address as the name and email address of the maintainer for this package, rather than using the information from the source tree's control file. |
|`--no-sign` |Do not sign any file, this includes the source package, the `.buildinfo` file and the `.changes` file (since dpkg 1.18.20). |
|`-uc`, `--unsigned-changes` |Do not sign the `.buildinfo` and `.changes` files.18.8). |
|`-us`, `--unsigned-source` |Do not sign the source package. |

What files are created?  It depends on which package you are creating, binary or source.

Binary package files (following the {packagename_version_arch} format):

- asbits_1.0.0_amd64.buildinfo
- asbits_1.0.0_amd64.changes
- asbits_1.0.0_amd64.deb
- asbits-dbgsym_1.0.0_amd64.deb
    + this is a debug symbols package

Source package files (following the {packagename_version_source} format, mostly):
- asbits_1.0.0_source.buildinfo
- asbits_1.0.0_source.changes
- asbits_1.0.0.dsc
- asbits_1.0.0.tar.xz
    + this is an [`xz`] compressed tarball

> Where does it put the build artifacts?  It will place them in the parent directory of `asbits-1.0.0`:
>
> ```bash
> $ pwd
> /home/vagrant/asbits-1.0.0
> $ ls -1 ..
> asbits-1.0.0
> asbits_1.0.0_amd64.buildinfo
> asbits_1.0.0_amd64.changes
> asbits_1.0.0_amd64.deb
> asbits-dbgsym_1.0.0_amd64.deb
> ```

#### Source Package

If you just want to create an unsigned source package, issue the following command:

```bash
$ dpkg-buildpackage --build=source
dpkg-buildpackage: info: source package asbits
dpkg-buildpackage: info: source version 1.0.0
dpkg-buildpackage: info: source distribution unstable
dpkg-buildpackage: info: source changed by Benjamin Toll <ben@benjamintoll.com>
 dpkg-source --before-build .
 debian/rules clean
dh clean
   dh_auto_clean
        make -j2 clean
make[1]: Entering directory '/home/vagrant/asbits-1.0.0'
rm -f asbits
make[1]: Leaving directory '/home/vagrant/asbits-1.0.0'
   dh_clean
 dpkg-source -b .
dpkg-source: info: using source format '3.0 (native)'
dpkg-source: info: building asbits in asbits_1.0.0.tar.xz
dpkg-source: info: building asbits in asbits_1.0.0.dsc
 dpkg-genbuildinfo --build=source
 dpkg-genchanges --build=source >../asbits_1.0.0_source.changes
dpkg-genchanges: info: including full source code in upload
 dpkg-source --after-build .
dpkg-buildpackage: info: source-only upload: Debian-native package
$
$ ls -1 ..
asbits-1.0.0
asbits_1.0.0.dsc
asbits_1.0.0_source.buildinfo
asbits_1.0.0_source.changes
asbits_1.0.0.tar.xz
```

> Your output will probably be different than mine.

#### Binary Package

```bash
$ dpkg-buildpackage --build=binary
dpkg-buildpackage: info: source package asbits
dpkg-buildpackage: info: source version 1.0.0
dpkg-buildpackage: info: source distribution unstable
dpkg-buildpackage: info: source changed by Benjamin Toll <ben@benjamintoll.com>
dpkg-buildpackage: info: host architecture amd64
 dpkg-source --before-build .
 debian/rules clean
dh clean
   dh_auto_clean
        make -j2 clean
make[1]: Entering directory '/home/vagrant/asbits-1.0.0'
rm -f asbits
make[1]: Leaving directory '/home/vagrant/asbits-1.0.0'
   dh_clean
 debian/rules binary
dh binary
   dh_update_autotools_config
   dh_autoreconf
   dh_auto_configure
   dh_auto_build
        make -j2 "INSTALL=install --strip-program=true"
make[1]: Entering directory '/home/vagrant/asbits-1.0.0'
gcc -g -o asbits asbits.c
make[1]: Leaving directory '/home/vagrant/asbits-1.0.0'
   dh_auto_test
   create-stamp debian/debhelper-build-stamp
   dh_prep
   dh_auto_install
        make -j2 install DESTDIR=/home/vagrant/asbits-1.0.0/debian/asbits AM_UPDATE_INFO_DIR=no "INSTALL=install --strip-program=true"
make[1]: Entering directory '/home/vagrant/asbits-1.0.0'
mkdir -p /home/vagrant/asbits-1.0.0/debian/asbits/usr/bin
install -m 0755 asbits /home/vagrant/asbits-1.0.0/debian/asbits/usr/bin/
make[1]: Leaving directory '/home/vagrant/asbits-1.0.0'
   dh_installdocs
   dh_installchangelogs
   dh_perl
   dh_link
   dh_strip_nondeterminism
   dh_compress
   dh_fixperms
   dh_missing
   dh_dwz -a
   dh_strip -a
   dh_makeshlibs -a
   dh_shlibdeps -a
   dh_installdeb
   dh_gencontrol
   dh_md5sums
   dh_builddeb
dpkg-deb: building package 'asbits' in '../asbits_1.0.0_amd64.deb'.
dpkg-deb: building package 'asbits-dbgsym' in '../asbits-dbgsym_1.0.0_amd64.deb'.
 dpkg-genbuildinfo --build=binary
 dpkg-genchanges --build=binary >../asbits_1.0.0_amd64.changes
dpkg-genchanges: info: binary-only upload (no source code included)
 dpkg-source --after-build .
dpkg-buildpackage: info: binary-only upload (no source included)
$
$ ls -1 ..
asbits-1.0.0
asbits_1.0.0_amd64.buildinfo
asbits_1.0.0_amd64.changes
asbits_1.0.0_amd64.deb
asbits-dbgsym_1.0.0_amd64.deb
```

Incidentally, all of those `dh_*` tools are part of the [`debhelper`] tool suite.

> Your output will probably be different than mine.

#### Unsigned

The first packages we'll create will be unsigned, which means that the `.buildinfo` and `.changes` files will not be signed:

```bash
$ dpkg-buildpackage --build=source --unsigned-changes
$ dpkg-buildpackage --build=binary --unsigned-changes
```

I'm omitting the output, since it's the same as that of the last couple sections.

> Omitting `--unsigned-changes` will produce the same files.

Just as a sanity check (that is, to make sure that the package contains the [`asbits`] binary), let's list the contents of the newly-created `deb` package:

```bash
$ dpkg --contents /home/vagrant/asbits_1.0.0_amd64.deb
drwxr-xr-x root/root         0 2023-06-22 04:43 ./
drwxr-xr-x root/root         0 2023-06-22 04:43 ./usr/
drwxr-xr-x root/root         0 2023-06-22 04:43 ./usr/bin/
-rwxr-xr-x root/root     14480 2023-06-22 04:43 ./usr/bin/asbits
drwxr-xr-x root/root         0 2023-06-22 04:43 ./usr/share/
drwxr-xr-x root/root         0 2023-06-22 04:43 ./usr/share/doc/
drwxr-xr-x root/root         0 2023-06-22 04:43 ./usr/share/doc/asbits/
-rw-r--r-- root/root       179 2023-06-22 04:43 ./usr/share/doc/asbits/README.Debian
-rw-r--r-- root/root       137 2023-06-22 04:43 ./usr/share/doc/asbits/changelog.gz
-rw-r--r-- root/root      1638 2023-06-22 04:43 ./usr/share/doc/asbits/copyright
```

Here's the contents of the source's `.dsc` file:

```bash
$ cat ../asbits_1.0.0.dsc
Format: 3.0 (native)
Source: asbits
Binary: asbits
Architecture: any
Version: 1.0.0
Maintainer: Benjamin Toll <ben@benjamintoll.com>
Homepage: https://benjamintoll.com
Standards-Version: 4.5.1
Build-Depends: debhelper-compat (= 13)
Package-List:
 asbits deb unknown optional arch=any
Checksums-Sha1:
 83ac38bbaa1c6369252afa5670faa72d19ce6545 18956 asbits_1.0.0.tar.xz
Checksums-Sha256:
 cdc15ce7c33564993a7efae8f483e32646c6932c55836c41c57fabf39e3faf33 18956 asbits_1.0.0.tar.xz
Files:
 a146a710b2d0a15e7bed94e7080b27aa 18956 asbits_1.0.0.tar.xz
```

#### Signed

Before we look at signing, it's important to state that these signing methods **do not** sign the package itself, at least for the binary package.  Rather, the `.changes` and `.buildinfo` files are signed (and the `.dsc` source package, if not turned off by an option).

> If you're using a virtual machine (for instance, I'm using a virtual machine I created with Vagrant to build and sign the Debian packages), you can export the signing key and get it into the machine by way of a shared directory.  This isn't the recommended way, but I think it's ok for development purposes.
>
> For production, you can use [`gpg-agent` forwarding].
>
> ```bash
> $ gpg --list-secret-keys --keyid-format long
> $ gpg --export-secret-subkeys DEADBEEFDEADBEEF > signing.key
> ```
>

Let's now turn to creating a package and signing the `.buildinfo` and `.changes` files:

```bash
dpkg-buildpackage --build=source -mDebian --unsigned-source --force-sign
$ dpkg-buildpackage --build=binary --sign-key=DEADBEEF --force-sign
```

Note that using the `--unsigned-source` switch does not sign the source package (the `.dsc` file).  Omitting that will sign the file.

> Signing will be skipped if the distribution is `UNRELEASED`, unless the `--force-sign` option is used.

When signing, the output will be the same as what has been shown above for an unsigned package except for the last outputted lines, which will look like this:

```bash
 signfile asbits_1.0.0_amd64.buildinfo

 signfile asbits_1.0.0_amd64.changes
```

You'll then find that both the `.buildinfo` and `.changes` files have been signed for both kinds of packages:

```bash
$ cat asbits_1.0.0_amd64.changes
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

Format: 1.8
Date: Thu, 22 Jun 2023 04:43:04 +0000
Source: asbits
Binary: asbits asbits-dbgsym
Architecture: amd64
Version: 1.0.0
Distribution: unstable
Urgency: medium
Maintainer: Benjamin Toll <ben@benjamintoll.com>
Changed-By: Benjamin Toll <ben@benjamintoll.com>
Description:
 asbits     - <insert up to 60 chars description>
Changes:
 asbits (1.0.0) unstable; urgency=medium
 .
   * Initial Release.
Checksums-Sha1:
 969ce6feb67b03bfe6bd4ed1ffecb266212053bb 3412 asbits-dbgsym_1.0.0_amd64.deb
 60aa2faed3174b793a04a60d7b58303bb5321e32 5961 asbits_1.0.0_amd64.buildinfo
 6992ebf0c25c9f1c297a3d17ee464d22cb1734fe 4428 asbits_1.0.0_amd64.deb
Checksums-Sha256:
 9eb21b162c451a061277f6da2d7304eec242508d7f3dcb85cd0f825f46999dc2 3412 asbits-dbgsym_1.0.0_amd64.deb
 13eae1efb7c4639616bc433930a5fddd30edd8c5a00f791c20a02316146b32ea 5961 asbits_1.0.0_amd64.buildinfo
 dcd45cf8c5dbeb18074e2e336a09484a083163371037d478344066a908e0bf9b 4428 asbits_1.0.0_amd64.deb
Files:
 2b5a151280f9088d1b93084e6567c786 3412 debug optional asbits-dbgsym_1.0.0_amd64.deb
 3504623e7d8009502d032ce357f470d3 5961 unknown optional asbits_1.0.0_amd64.buildinfo
 3382cbb2bb47faa4acf6ea7a9de204f6 4428 unknown optional asbits_1.0.0_amd64.deb

-----BEGIN PGP SIGNATURE-----

iQIzBAEBCgAdFiEE2By9EzUPO9EjmI3IOhMUNEsNmRIFAmST4EwACgkQOhMUNEsN
mRKERQ//Qk/FGyEND8Ziacn4dmJfCKo1I1Iymj8OwLF0LLvi8Xip9rFv24V6vPdI
PfakWLx7IJQa84LKVOIu+yO6VNT/uO8/pCOWucIP7xg1IiMogjQUaj09kb9QVrCY
gMpeiaTz1j+oJV+Mb4C2v2pSXTe31QRKfqaciZMaOveIsoHy0UHQ4sQiXAAuoFUu
ycPscXR3sY9NZvAR2QPGa05U2Edywgs7lNE4nuXJluHG2BzibWGm8bp0DaSzgSTA
9zYoi0Zux9OkONiKEodiNCIFjJqMH+wG/C6/7qiaRZuUZilfjJllYZ/S+usr7jxq
+dFzr0JvNty0+x9SuWnS1ycfQOLTJ06rzblG/3h8EJ0urJY2rui4TDBVFesL2XuH
cV1lRQ+EH4NUCNvma+AVs/4zzhHWFWoPwlI4kVlwWTehlDjdElC197t4hl6UjqDM
OOJiTRET62rVlOgUn+2d/zK1v1umaflI14H6Ef5vr26UVh8oAF1JCr8ot8KwhUNM
CmD7D0CC+75rTlUOm44QSaoGuJM2IgwYZPJT9EbQAau/BTj5WXmi1SvbYcHGc4y/
qAEXk7DsGVY4RnDSspdumWxTLfGlkqmXK+jo41pHLNgLtZMwy/e2bPRaG6f/YPhW
jqLp98t92mNJwmbDQjJT29/M1P4oZxoa4wTcMT2ceffHH1RU7Pg=
=yY6A
-----END PGP SIGNATURE-----
```

And, of course, as mentioned, the `.dsc` source package will also be signed if `--unsigned-source` is omitted.

> Using signing options with `dpkg-buildpackage` will call `GPG` during the `sign` hook.

## Static Analysis

> It's important to note that you do not need to perform this step to build a package.

The Debian packaging tooling has a few tools to analyze the packages and other files that you've created using tools such as `dpkg-buildpackage`.  Let's take a look at the main utility you'll use to perform static analysis.

### `lintian`

[`lintian`] is a static analysis tool for Debian packages, reporting bugs and policy violations.  It can be used to analyze a single file like a `.deb` package file.

It most commonly will dissect the following types of files:

- `.deb`
    + binary package
- `.dsc`
    + source package
- .changes`
    + will lint every package defined in it

Errors and warnings will contain a tag name, which can be used to get more information about what it is and how to fix it.

Here are some common options:

|**Option** |**Description** |
|:---|:---|
|`-c`, `--check` |Run all checks over the specified packages.  This is the default action. |
|`-d`, `--debug` |Prints debug information. |
|`-i`, `--info` |Print explanatory information about each problem discovered in addition to the `lintian` error tags. To print a long tag description without running `lintian`, see [`lintian-explain-tags`] or check the website at `https://lintian.debian.org`. |
|`--pedantic` |Display pedantic ("P:") tags as well.  They are normally suppressed.  Pedantic tags are `lintian` at its most pickiest and include checks for particular Debian packaging styles and checks that many people disagree with.  Expect false positives and `lintian` tags that you don't consider useful if you use this option. |
|`-v`, `--verbose` |Display verbose messages.  If `--debug` is used this option is always enabled. |

Of course, the package must be built first before linting, otherwise you'll get errors:

```bash
$ lintian
Cannot find changes file for asbits/1.0.0, tried:
  asbits_1.0.0_amd64.changes
  asbits_1.0.0_multi.changes
  asbits_1.0.0_all.changes
  asbits_1.0.0_source.changes
 in the following dirs:
  ..
  ../build-area
  /var/cache/pbuilder/result
```

Let's create a new `debian/` directory (without and alterations and editions by us), create an (unsigned) package and then lint it to see what errors and warnings we get:

```bash
$ dh_make --copyright gpl3 --email ben@benjamintoll.com --native --single --yes
...
$ dpkg-buildpackage -b -us -uc
...
$ lintian
E: asbits: copyright-contains-dh_make-todo-boilerplate
E: asbits: description-is-dh_make-template
E: asbits: helper-templates-in-copyright
E: asbits: section-is-dh_make-template
W: asbits: bad-homepage <insert the upstream URL, if relevant>
W: asbits: copyright-has-url-from-dh_make-boilerplate
W: asbits: no-manual-page usr/bin/asbits
W: asbits: readme-debian-contains-debmake-template
W: asbits: superfluous-clutter-in-homepage <insert the upstream URL, if relevant>
```

The errors (`E`) and the warnings (`W`) each list a tag, one per line, and it's not surprising that we'd have a small handful since it's using the default control files without any custom changes.  How can we get more information about each of those?

The [`lintian-explain-tags`] tool will give us the information needed to fix these message.  Clearly, the package was still able to be built (since we're able to lint it), but you'll probably want to go over each one and fix, if you can.

```bash
$ lintian-explain-tags copyright-contains-dh_make-todo-boilerplate
N:
E: copyright-contains-dh_make-todo-boilerplateN:
N:   The string "Please also look if..." appears in the copyright file,
N:   which indicates that you either didn't check the whole source to findN:   additional copyright/license, or that you didn't remove that paragraph
N:   after having done so.
N:   N:   Refer to Debian Policy Manual section 12.5 (Copyright information) for
N:   details.
N:
N:   Severity: error
N:
N:   Check: debian/copyright
N:
```

Let's look at another:

```bash
$ lintian-explain-tags superfluous-clutter-in-homepage
N:
W: superfluous-clutter-in-homepage
N:
N:   The "Homepage:" field in this package's control file contains
N:   superfluous markup around the URL, like enclosing < and >. This is
N:   unnecessary and needlessly complicates using this information.
N:
N:   Refer to Debian Policy Manual section 5.6.23 (Homepage) for details.
N:
N:   Severity: warning
N:
N:   Check: fields/homepage
N:
```

Pretty good stuff.

Now, here's an example of running `lintian` with the `--pedantic` option on the `.changes` file, followed by a call to `lintian-explain-tags` to get more information about the new tag it revealed:

```bash
$ lintian asbits_1.0.0_amd64.changes --pedantic
W: asbits source: dh-make-template-in-source debian/manpage.1.ex
W: asbits source: missing-debian-source-format
W: asbits: no-manual-page usr/bin/asbits
P: asbits source: source-contains-git-control-dir .git/
$ lintian-explain-tags source-contains-git-control-dir
N:
P: source-contains-git-control-dir
N:
N:   The upstream source contains a .git directory. It was most likely
N:   included by accident since git version control directories usually
N:   don't belong in releases and may contain a complete copy of the
N:   repository. If an upstream release tarball contains .git directories,
N:   you should usually report this as a bug upstream.
N:
N:   Severity: pedantic
N:
N:   Check: cruft
N:
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeee

## Sign Package and Build Files

> It's important to note that you do not need to perform this step to build a package.

### `debsign`

The [`debsign`] utility will sign a Debian `.changes` and `.dsc` file pair using `GPG`.

Here are some nice options.

|**Option** |**Description** |
|:---|:---|
|`-e` |Same as `-m` but takes precedence over it. |
|`-k` |Specify the key ID to be used for signing; overrides any -m and -e options. |
|`-m` |Specify the maintainer name to be used for signing. |
|`--no-re-sign` |Use the existing signature, if the file has been signed already. |
|`-r` |The files to be signed live on the specified remote host (`[username@]remotehost`). |
|`--re-sign` |Recreate  signature. |

You can point it at a `.changes` file, and it will sign it and the `.buildinfo` file:

```bash
$ debsign asbits_1.0.0_amd64.changes -eDebian
 signfile buildinfo asbits_1.0.0_amd64.buildinfo Debian

 fixup_changes buildinfo asbits_1.0.0_amd64.buildinfo asbits_1.0.0_amd64.changes
 signfile changes asbits_1.0.0_amd64.changes Debian

Successfully signed buildinfo, changes files
```

Alternatively, call `debsign` within the same directory as the source, and it will find the build artifacts in the parent directory:

```bash
$ debsign -mDebian
 signfile buildinfo ../asbits_1.0.0_amd64.buildinfo Debian

 fixup_changes buildinfo ../asbits_1.0.0_amd64.buildinfo ../asbits_1.0.0_amd64.changes
 signfile changes ../asbits_1.0.0_amd64.changes Debian

Successfully signed buildinfo, changes files
```

## Pulling It All Together

### `debuild`

As mentioned in the introduction, the [`debuild`] utility will delegate to tools that will do the packaging, linting and signing so you don't have to call those tools individually.  By default, `debuild` builds both source and binary packages.

Many of the command-line options are passed through to the underlying tools.  Read the man page for details.

Like [`dpkg-buildpackage`](#dpkg-buildpackage), `debuild` will also run through a number of hooks:

- `dpkg-buildpackage-hook`
- `clean-hook`
- `dpkg-source-hook`
- `dpkg-build-hook`
- `dpkg-binary-hook`
- `dpkg-genchanges-hook`
- `final-clean-hook`
- `lintian-hook`
- `signing-hook`
- `post-dpkg-buildpackage-hook`

Also like `dpkg-buildpackage`, `debuild` is run from within the source directory.

Again, `debuild` will call [`dpkg-buildpackage`], [`lintian`] and then [`debsign`]:

```bash
$ debuild -k3A1314344B0D9912 --force-sign
0$ debuild -k3A1314344B0D9912 --force-sign
 dpkg-buildpackage -us -uc -ui
dpkg-buildpackage: info: source package asbits
dpkg-buildpackage: info: source version 1.0.0
dpkg-buildpackage: info: source distribution unstable
dpkg-buildpackage: info: source changed by Benjamin Toll <ben@benjamintoll.com>
 dpkg-source --before-build .
dpkg-buildpackage: info: host architecture amd64
 debian/rules clean
dh clean
   dh_auto_clean
        make -j2 clean
make[1]: Entering directory '/home/vagrant/asbits-1.0.0'
rm -f asbits
make[1]: Leaving directory '/home/vagrant/asbits-1.0.0'
   dh_clean
 dpkg-source -b .
dpkg-source: info: using source format '3.0 (native)'
dpkg-source: info: building asbits in asbits_1.0.0.tar.xz
dpkg-source: info: building asbits in asbits_1.0.0.dsc
 debian/rules binary
dh binary
   dh_update_autotools_config
   dh_autoreconf
   dh_auto_configure
   dh_auto_build
        make -j2 "INSTALL=install --strip-program=true"
make[1]: Entering directory '/home/vagrant/asbits-1.0.0'
gcc -g -o asbits asbits.c
make[1]: Leaving directory '/home/vagrant/asbits-1.0.0'
   dh_auto_test
   create-stamp debian/debhelper-build-stamp
   dh_prep
   dh_auto_install
        make -j2 install DESTDIR=/home/vagrant/asbits-1.0.0/debian/asbits AM_UPDATE_INFO_DIR=no "INSTALL=install --strip-program=true"
make[1]: Entering directory '/home/vagrant/asbits-1.0.0'
mkdir -p /home/vagrant/asbits-1.0.0/debian/asbits/usr/bin
install -m 0755 asbits /home/vagrant/asbits-1.0.0/debian/asbits/usr/bin/
make[1]: Leaving directory '/home/vagrant/asbits-1.0.0'
   dh_installdocs
   dh_installchangelogs
   dh_perl
   dh_link
   dh_strip_nondeterminism
   dh_compress
   dh_fixperms
   dh_missing
   dh_dwz -a
   dh_strip -a
   dh_makeshlibs -a
   dh_shlibdeps -a
   dh_installdeb
   dh_gencontrol
   dh_md5sums
   dh_builddeb
dpkg-deb: building package 'asbits' in '../asbits_1.0.0_amd64.deb'.
dpkg-deb: building package 'asbits-dbgsym' in '../asbits-dbgsym_1.0.0_amd64.deb'.
 dpkg-genbuildinfo
 dpkg-genchanges  >../asbits_1.0.0_amd64.changes
dpkg-genchanges: info: including full source code in upload
 dpkg-source --after-build .
dpkg-buildpackage: info: full upload; Debian-native package (full source is included)
Now running lintian asbits_1.0.0_amd64.changes ...
E: asbits: copyright-contains-dh_make-todo-boilerplate
E: asbits source: debian-rules-is-dh_make-template
E: asbits: description-is-dh_make-template
E: asbits: helper-templates-in-copyright
E: asbits source: readme-source-is-dh_make-template
E: asbits: section-is-dh_make-template
W: asbits source: bad-homepage <insert the upstream URL, if relevant>
W: asbits: bad-homepage <insert the upstream URL, if relevant>
W: asbits: copyright-has-url-from-dh_make-boilerplate
W: asbits source: dh-make-template-in-source debian/asbits.cron.d.ex
W: asbits source: dh-make-template-in-source debian/asbits.doc-base.EX
W: asbits source: dh-make-template-in-source debian/manpage.1.ex
W: asbits source: dh-make-template-in-source debian/manpage.sgml.ex
W: asbits source: dh-make-template-in-source debian/manpage.xml.ex
W: asbits source: dh-make-template-in-source debian/postinst.ex
W: asbits source: dh-make-template-in-source debian/postrm.ex
W: asbits source: dh-make-template-in-source debian/preinst.ex
W: asbits source: dh-make-template-in-source debian/prerm.ex
W: asbits source: dh-make-template-in-source debian/salsa-ci.yml.ex
W: asbits: no-manual-page usr/bin/asbits
W: asbits: readme-debian-contains-debmake-template
W: asbits source: superfluous-clutter-in-homepage <insert the upstream URL, if relevant>
W: asbits: superfluous-clutter-in-homepage <insert the upstream URL, if relevant>
Finished running lintian.
Now signing changes and any dsc files...
long key IDs are discouraged; please use key fingerprints instead
 signfile dsc asbits_1.0.0.dsc 3A1314344B0D9912

 fixup_buildinfo asbits_1.0.0.dsc asbits_1.0.0_amd64.buildinfo
 signfile buildinfo asbits_1.0.0_amd64.buildinfo 3A1314344B0D9912

 fixup_changes dsc asbits_1.0.0.dsc asbits_1.0.0_amd64.changes
 fixup_changes buildinfo asbits_1.0.0_amd64.buildinfo asbits_1.0.0_amd64.changes
 signfile changes asbits_1.0.0_amd64.changes 3A1314344B0D9912

Successfully signed dsc, buildinfo, changes files
$
$ ls -1 ..
asbits-1.0.0
asbits_1.0.0_amd64.build
asbits_1.0.0_amd64.buildinfo
asbits_1.0.0_amd64.changes
asbits_1.0.0_amd64.deb
asbits_1.0.0.dsc
asbits_1.0.0.tar.xz
asbits-dbgsym_1.0.0_amd64.deb
```

> Signing will be skipped if the distribution is `UNRELEASED`, unless the `--force-sign` option is used.

To disable `lintian`:

```bash
$ debuild --no-lintian
```

## References

- [On Inspecting deb Packages](/2023/06/01/on-inspecting-deb-packages/)
- [On gpg-agent Forwarding](/2023/06/07/on-gpg-agent-forwarding/)

[`dh_make`]: https://manpages.org/dh_make
[`tty`]: https://man7.org/linux/man-pages/man1/tty.1.html
[`asbits`]: https://github.com/btoll/asbits
[`gpg-agent` forwarding]: /2023/06/07/on-gpg-agent-forwarding/
[`dpkg-buildpackage`]: https://man7.org/linux/man-pages/man1/dpkg-buildpackage.1.html
[`lintian`]: https://manpages.debian.org/testing/lintian/lintian.1.en.html
[`debsign`]: https://manpages.debian.org/testing/devscripts/debsign.1.en.html
[`lintian-explain-tags`]: https://manpages.debian.org/bullseye/lintian/lintian-explain-tags.1.en.html
[`dpkg-genchanges`]: https://www.man7.org/linux/man-pages/man1/dpkg-genchanges.1.html
[`xz`]: https://tukaani.org/xz/
[`debuild`]: https://manpages.debian.org/testing/devscripts/debuild.1.en.html
[`debhelper`]: https://www.man7.org/linux/man-pages/man7/debhelper.7.html

