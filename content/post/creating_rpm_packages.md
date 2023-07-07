+++
title = "On Creating RPM Packages"
date = "2023-07-06T17:49:15-04:00"

+++

The [`rpmdev-newspec`] tool will create a base `spec` file.  You'll have to customize this with your package name and version, license, files included in the package, et al., but it does give you a template you can work with:

```bash
$ rpmdev-newspec asbits
asbits.spec created; type minimal, rpm version >= 4.11.
```

The `rpmdev-setuptree` utility will create an `RPM` build tree within a user's home directory.  Its subdirectories such as `RPMS` and `SRPMS` will eventually contain the binary and source packages, respectively:


```bash
$ rpmdev-setuptree
$ tree rpmbuild/
rpmbuild/
├── BUILD
├── RPMS
├── SOURCES
├── SPECS
└── SRPMS

5 directories, 0 files
```

What does a complete `SPEC` file look like?  Well, it depends on the project.  My wee little project [`asbits`] has a very simple `SPEC` file that looks like this:

```spec
$ cat asbits.spec
Name:           asbits
Version:        1.0.0
Release:        1%{?dist}
Summary:        Displays hexadecimal, decimal and octal numbers in binary

License:        GPLv3+
URL:            https://benjamintoll.com/
Source0:        https://github.com/btoll/tools/blob/master/c/%{name}/%{name}-%{version}.tar.gz

BuildRequires:  gcc
BuildRequires:  make

%description
Displays hexadecimal, decimal and octal numbers in binary

%prep
%setup -q

%build
make %{?_smp_mflags}

%install
%make_install

%files
%license LICENSE
%{_bindir}/%{name}
%doc

%changelog
* Tue May 30 2023 Benjamin Toll <ben@benjamintoll.com> - 1.0.0-1
- First asbits package

```

> The tarball that you create that holds the source code **must** have a `LICENSE` file or the package devtools will complain and fail to build.

```bash
$ mkdir /tmp/asbits-1.0.0
$ find -maxdepth 1 -type f -not -name ".*" -exec cp {} /tmp/asbits-1.0.0/ \;
$ cd /tmp
$ tar -cvzf asbits-1.0.0.tar.gz asbits-1.0.0/
asbits-1.0.0/
asbits-1.0.0/asbits.c
asbits-1.0.0/asbits.h
asbits-1.0.0/Makefile
asbits-1.0.0/LICENSE
$ mv asbits-1.0.0.tar.gz ~/rpmbuild/SOURCES/
$ cd
$ mv asbits.spec rpmbuild/SPECS/
$ tree rpmbuild/
rpmbuild/
├── BUILD
├── RPMS
├── SOURCES
│   └── asbits-1.0.0.tar.gz
├── SPECS
│   └── asbits.spec
└── SRPMS

5 directories, 2 files
```

Let's build both the SRPM (source RPM) and the binary RPM:

```bash
$ rpmbuild -bs rpmbuild/SPECS/asbits.spec
Wrote: /home/vagrant/rpmbuild/SRPMS/asbits-1.0.0-1.el7.src.rpm
tree rpmbuild/
rpmbuild/
├── BUILD
├── BUILDROOT
├── RPMS
├── SOURCES
│   └── asbits-1.0.0.tar.gz
├── SPECS
│   └── asbits.spec
└── SRPMS
    └── asbits-1.0.0-1.el7.src.rpm

    6 directories, 3 files
$
$ rpmbuild --rebuild rpmbuild/SRPMS/asbits-1.0.0-1.el7.src.rpm
tree rpmbuild/
rpmbuild/
├── BUILD
├── BUILDROOT
├── RPMS
│   └── x86_64
│       ├── asbits-1.0.0-1.el7.x86_64.rpm
│       └── asbits-debuginfo-1.0.0-1.el7.x86_64.rpm
├── SOURCES
├── SPECS
└── SRPMS
    └── asbits-1.0.0-1.el7.src.rpm

    7 directories, 3 files
```

This removed the `SPEC` file.  Invoking `rpmbuild --rebuild` involves:

- Installing the contents of the `SRPM` - the `SPEC` file and the source code - into the `~/rpmbuild/` directory.
- Building using the installed contents.
- Removing the `SPEC` file and the source code.

You can retain the SPEC file and the source code after building. For this, you have two options:

- When building, use the `--recompile` option instead of `--rebuild`.
- Install the `SRPM` using this command:
    ```bash
    $ rpm -Uvh ~/rpmbuild/SRPMS/asbits-1.0.0-1.el7.src.rpm
    ```

Specifying the `--recompile` flag created this directory tree:

```bash
$ tree rpmbuild
rpmbuild/
├── BUILD│   └── asbits-1.0.0
│       ├── asbits
│       ├── asbits.c
│       ├── asbits.h
│       ├── debugfiles.list
│       ├── debuglinks.list
│       ├── debugsources.list
│       ├── elfbins.list
│       ├── LICENSE
│       └── Makefile
├── BUILDROOT
│   └── asbits-1.0.0-1.el7.x86_64
│       └── usr
│           ├── bin
│           │   └── asbits
│           ├── lib
│           │   └── debug
│           │       └── usr
│           │           └── bin
│           │               └── asbits.debug
│           ├── share
│           │   └── licenses
│           │       └── asbits-1.0.0
│           │           └── LICENSE
│           └── src
│               └── debug
│                   └── asbits-1.0.0
│                       ├── asbits.c
│                       └── asbits.h
├── RPMS
│   └── x86_64
│       ├── asbits-1.0.0-1.el7.x86_64.rpm
│       └── asbits-debuginfo-1.0.0-1.el7.x86_64.rpm
├── SOURCES
│   └── asbits-1.0.0.tar.gz
├── SPECS
│   └── asbits.spec
└── SRPMS
    └── asbits-1.0.0-1.el7.src.rpm

21 directories, 19 files
```

You can also build the binary RPM using the `-bb` flag (build binary), which doesn't do the steps above that are initiated by doing `--rebuild`, that is, it won't remove the `SPEC` file and the tarball in `rpmbuild/SOURCES`:

```bash
$ rpmbuild -bb rpmbuild/SPECS/asbits.spec
$ tree rpmbuild/
rpmbuild/
├── BUILD
│   └── asbits-1.0.0
│       ├── asbits
│       ├── asbits.c
│       ├── asbits.h
│       ├── debugfiles.list
│       ├── debuglinks.list
│       ├── debugsources.list
│       ├── elfbins.list
│       ├── LICENSE
│       └── Makefile
├── BUILDROOT
├── RPMS
│   └── x86_64
│       ├── asbits-1.0.0-1.el7.x86_64.rpm
│       └── asbits-debuginfo-1.0.0-1.el7.x86_64.rpm
├── SOURCES
│   └── asbits-1.0.0.tar.gz
├── SPECS
│   └── asbits.spec
└── SRPMS
    └── asbits-1.0.0-1.el7.src.rpm

8 directories, 14 files
```

Here is the new package:

`asbits-1.0.0-1.el7.x86_64.rpm`

```bash
$ rpm -qlp rpmbuild/RPMS/x86_64/asbits-1.0.0-1.el7.x86_64.rpm
/usr/bin/asbits
/usr/share/licenses/asbits-1.0.0
/usr/share/licenses/asbits-1.0.0/LICENSE
```

weeeeeeeeeeeeeeeeeeeeeeeee

Let's verify it!

```bash
$ rpmlint rpmbuild/SPECS/asbits.spec
0 packages and 1 specfiles checked; 0 errors, 0 warnings.
$ rpmlint rpmbuild/RPMS/x86_64/asbits-1.0.0-1.el7.x86_64.rpm
asbits.x86_64: W: no-documentation
asbits.x86_64: W: no-manual-page-for-binary asbits
1 packages and 0 specfiles checked; 0 errors, 2 warnings.
```

When binary RPMs are checked `rpmlint` will check for:

- documentation
- manual pages
- consistent use of the Filesystem Hierarchy Standard

Let's install it!

```bash
$ asbits
-bash: asbits: command not found
$ sudo rpm -i rpmbuild/RPMS/x86_64/asbits-1.0.0-1.el7.x86_64.rpm
[vagrant@localhost ~]$ asbits 255
0000 0000 1111 1111
$
```

How to expand the macros?

```bash
$ rpmspec -P rpmbuild/SPECS/asbits.spec
Name:           asbits
Version:        1.0.0
Release:        1.el7
Summary:        Displays hexadecimal, decimal and octal numbers in binary

License:        GPLv3+
URL:            https://benjamintoll.com/
Source0:        https://github.com/btoll/tools/blob/master/c/asbits/asbits-1.0.0.tar.gz

BuildRequires:  gcc
BuildRequires:  make

%description
Displays hexadecimal, decimal and octal numbers in binary

%prep
%setup -q

%build
make -j3


%package debuginfo
Summary: Debug information for package asbits
Group: Development/Debug
AutoReqProv: 0
%description debuginfo
This package provides debug information for package asbits.
Debug information is useful when developing applications that use this
package or when debugging this package.
%files debuginfo -f debugfiles.list
%defattr(-,root,root)

%install

rm -rf $RPM_BUILD_ROOT
/usr/bin/make install DESTDIR=/home/vagrant/rpmbuild/BUILDROOT/asbits-1.0.0-1.el7.x86_64

%files
%license LICENSE
/usr/bin/asbits
%doc

%changelog
* Mon May 29 2023 Benjamin Toll <ben@benjamintoll.com> - 1.0.0-1
- First asbits package

```

Print a list of all of the tags `rpm` knows about:

```bash
$ rpm --querytags
```

---

- new edits

```bash
%install
mkdir -p %{buildroot}/%{_bindir}
install -m 0755 %{name} %{buildroot}%{_bindir}/%{name}
```

```spec
Name:           simple-chat
Version:        1.0.0
Release:        1%{?dist}
Summary:        Here be a simple chat server!

License:        GPLv3+
URL:            https://benjamintoll.com/
Source0:        https://github.com/btoll/simple-chat/releases/download/1.0.0/%{name}-%{version}.tar.gz

BuildRequires:  gcc
Requires:       make

%description
Here be a simple chat server!

%prep
%setup -q

%build
make %{?_smp_mflags}

%install
%make_install

%files
%license LICENSE
%{_bindir}/%{name}
%doc

%changelog
* Mon May 29 2023 Benjamin Toll <ben@benjamintoll.com> - 1.0.0-1
- First simple-chat package

```

## References

- [RPM Packaging Guide]
- [Package `rpmdevtools`](https://www.mankier.com/package/rpmdevtools)
- [Debian `rinse`]
- [CentOS Cloud Images](https://cloud.centos.org/centos/8/x86_64/images/)

[RPM Packaging Guide]: https://rpm-packaging-guide.github.io/
[Debian `rinse`]: https://salsa.debian.org/debian/rinse
[`rpmdev-newspec`]: https://linux.die.net/man/1/rpmdev-newspec
[`asbits`]: https://github.com/btoll/asbits

