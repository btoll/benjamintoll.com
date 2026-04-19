+++
title = "On FIPS"
date = "2025-07-26T16:25:50-04:00"
draft = true

+++

<!--
https://kupczynski.info/posts/fips-golang/
https://blog.cloudflare.com/exposing-go-on-the-internet/
https://aikchar.dev/blog/add-fips-module-to-openssl-3011-on-debian-12-bookworm.html
https://blog.meain.io/2023/what-is-in-dot-git/
https://www.livius.org/articles/person/julia-2/
-->

- [Introduction](#introduction)
- [Vagrant](#vagrant)
- [Checking FIPS Compatibility](#checking-fips-compatibility)
- [Compiling A Custom `openssl` Binary](#compiling-a-custom-openssl-binary)
- [Enabling FIPS On Fedora](#enabling-fips-on-fedora)
- [Inspecting Binary For FIPS Compatibility](#inspecting-binary-for-fips-compatibility)
- [`openssl-fipsintall`](#openssl-fipsintall)
- [Sanity Check](#sanity-check)
- [Golang And FIPS](#golang-and-fips)
- [References](#references)

---

## Introduction

Today, friends, we're going to look at [FIPS] and how to make systems FIPS compatible.  We'll take a brief look at RHEL and Fedora, followed by a look at Debian and how to create a custom [`openssl`] build that links to FIPS compatible shared objects.

First, let's turn to a `Vagrantfile` that can be used to follow along.

## Vagrant

Let's take a look at a little `Vagrantfile`:

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
    config.vm.box = "debian/bullseye64"
    config.vm.hostname = "vagrant-debian"
    config.vm.synced_folder ".", "/vagrant", type: "nfs", mount_options: ["vers=3,tcp"]
    config.ssh.forward_agent = true

    config.vm.provider "virtualbox" do |vb|
        vb.cpus = 2
        vb.memory = 8192
    end

    config.vm.provision "shell", inline: <<-SHELL
        apt-get update
        apt-get install -y \
            build-essential \
            git \
            perl \
            strace

        git clone https://github.com/openssl/openssl.git
        cd openssl
        git checkout openssl-3.5.0

        ./config enable-fips --prefix=/usr/local/ssl --openssldir=/usr/local/ssl
        make -j$(nproc)
        make install

        # Enable the FIPS module in `openssl.cnf`.
        sed -i 's_^# \.include fips.*_.include /usr/local/ssl/fipsmodule.cnf_' /usr/local/ssl/openssl.cnf
        sed -i 's/^# \(fips = fips_sect\)/\1/' /usr/local/ssl/openssl.cnf

        LD_LIBRARY_PATH=/usr/local/ssl/lib64 /usr/local/ssl/bin/openssl list -providers

        # Update the ld.so.cache.
        echo /usr/local/ssl/lib64 > /etc/ld.so.conf.d/openssl-fips.conf
        ldconfig

        # Fixes the "-bash: warning: setlocale: LC_ALL: cannot change locale (en_IN.UTF-8)" warning.
        # Also, fixes the same warnings for Perl.
        localedef -i en_US -f UTF-8 en_US.UTF-8
    SHELL

    config.vm.provision "shell", privileged: false, inline: <<-SHELL
        export PATH=/usr/local/ssl/bin:"$PATH"
    SHELL
end
```

## Checking FIPS Compatibility

Is my distro compatible with FIPS?

```bash
$ cat /proc/sys/crypto/fips_enabled
0
```

Or:

```bash
$ sysctl crypto.fips_enabled
crypto.fips_enabled = 0
```

## Compiling A Custom `openssl` Binary

Let's see what version of `openssl` is installed by default:

```bash
$ which openssl
/usr/bin/openssl
$ openssl version
OpenSSL 1.1.1w  11 Sep 2023
$ openssl version -a
OpenSSL 1.1.1w  11 Sep 2023
built on: Wed Sep 13 19:21:33 2023 UTC
platform: debian-amd64
options:  bn(64,64) rc4(16x,int) des(int) blowfish(ptr)
compiler: gcc -fPIC -pthread -m64 -Wa,--noexecstack -Wall -Wa,--noexecstack -g -O2 -ffile-prefix-map=/build/reproducible-path/openssl-1.1.1w=. -fstack-protector-strong -Wformat -Werror=format-security -DOPENSSL_USE_NODELETE -DL_ENDIAN -DOPENSSL_PIC -DOPENSSL_CPUID_OBJ -DOPENSSL_IA32_SSE2 -DOPENSSL_BN_ASM_MONT -DOPENSSL_BN_ASM_MONT5 -DOPENSSL_BN_ASM_GF2m -DSHA1_ASM -DSHA256_ASM -DSHA512_ASM -DKECCAK1600_ASM -DRC4_ASM -DMD5_ASM -DAESNI_ASM -DVPAES_ASM -DGHASH_ASM -DECP_NISTZ256_ASM -DX25519_ASM -DPOLY1305_ASM -DNDEBUG -Wdate-time -D_FORTIFY_SOURCE=2
OPENSSLDIR: "/usr/lib/ssl"
ENGINESDIR: "/usr/lib/x86_64-linux-gnu/engines-1.1"
Seeding source: os-specific
```

This is a non-compliant FIPS binary, so let's begin the process of building our own.

First, install the build tools and clone `openssl`:

```bash
$ sudo apt-get install build-essential perl git -y
$ git clone https://github.com/openssl/openssl.git
$ cd openssl
$ git checkout openssl-3.5.0
```

> Note that I'm using [`OpenSSL 3.5.0`](https://github.com/openssl/openssl/releases/tag/openssl-3.5.0), use whatever you want as long as it has FIPS support.

```bash
$ ./config enable-fips --prefix=/usr/local/ssl --openssldir=/usr/local/ssl
$ make -j$(nproc)
```

This will create both `fips.so` and `legacy.so` in `./providers`.

```bash
$ sudo make install
...
*** Installing FIPS module
install providers/fips.so -> /usr/local/ssl/lib64/ossl-modules/fips.so
*** Installing FIPS module configuration
install providers/fipsmodule.cnf -> /usr/local/ssl/fipsmodule.cnf
$ which openssl
/usr/local/bin/openssl
```

You can also list the `ossl-modules` directory:

```bash
$ ls /usr/local/ssl/lib64/ossl-modules/
fips.so  legacy.so
```

Now, notice we're still using the old binary:

```bash
$ openssl version
OpenSSL 1.1.1w  11 Sep 2023
$ which openssl
/usr/bin/openssl
```

If we try to use the new build then we get linker errors:

```bash
$ /usr/local/ssl/bin/openssl version
/usr/local/ssl/bin/openssl: error while loading shared libraries: libssl.so.3: cannot open shared object file: No such file or directory
```

Here, we'll link it to the new shared libraries by adding the `LD_LIBRARY_PATH` to the environment in which the binary runs:

```bash
$ LD_LIBRARY_PATH=/usr/local/ssl/lib64 /usr/local/ssl/bin/openssl version
OpenSSL 3.5.0 8 Apr 2025 (Library: OpenSSL 3.5.0 8 Apr 2025)
$ LD_LIBRARY_PATH=/usr/local/ssl/lib64 /usr/local/ssl/bin/openssl version -a
OpenSSL 3.5.0 8 Apr 2025 (Library: OpenSSL 3.5.0 8 Apr 2025)
built on: Mon Jul 28 01:00:18 2025 UTC
platform: linux-x86_64
options:  bn(64,64)
compiler: gcc -fPIC -pthread -m64 -Wa,--noexecstack -Wall -O3 -DOPENSSL_USE_NODELETE -DL_ENDIAN -DOPENSSL_PIC -DOPENSSL_BUILDING_OPENSSL -DNDEBUG
OPENSSLDIR: "/usr/local/ssl"
ENGINESDIR: "/usr/local/ssl/lib64/engines-3"
MODULESDIR: "/usr/local/ssl/lib64/ossl-modules"
Seeding source: os-specific
CPUINFO: OPENSSL_ia32cap=0xfffa32234f8bffff:0x1840073c219c07ab:0x00000010ac004410:0x0000000000000000:0x0000000000000000
```

The problem is that `openssl` isn't linked to the new library file.  We can see that using the `ldd` tool:

```bash
$ ldd $(which openssl)
        linux-vdso.so.1 (0x00007ffd4cdf3000)
        libssl.so.3 => not found
        libcrypto.so.3 => not found
        libpthread.so.0 => /lib/x86_64-linux-gnu/libpthread.so.0 (0x00007fa251a03000)
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007fa25182f000)
        /lib64/ld-linux-x86-64.so.2 (0x00007fa251b3d000)
```

Let's fix this.

First, let's find where they are:

```bash
$ sudo find / -type f -name libssl.so.3
/usr/local/lib64/libssl.so.3
/home/vagrant/openssl/libssl.so.3
```

> If nothing is found, install `libssl3`.

The first one listed is the old library file and the second one is the newest that supports FIPS.

Let's run the same command again, but this time link it:

```bash
$ LD_LIBRARY_PATH=/usr/local/lib64/ openssl version
OpenSSL 3.5.0 8 Apr 2025 (Library: OpenSSL 3.5.0 8 Apr 2025)
```

Let's see them linked:

```bash
$ LD_LIBRARY_PATH=/usr/local/ssl/lib64 ldd /usr/local/ssl/bin/openssl
        linux-vdso.so.1 (0x00007ffc7bfeb000)
        libssl.so.3 => /usr/local/ssl/lib64/libssl.so.3 (0x00007f2c6c04e000)
        libcrypto.so.3 => /usr/local/ssl/lib64/libcrypto.so.3 (0x00007f2c6ba48000)
        libpthread.so.0 => /lib/x86_64-linux-gnu/libpthread.so.0 (0x00007f2c6ba21000)
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f2c6b84d000)
        libdl.so.2 => /lib/x86_64-linux-gnu/libdl.so.2 (0x00007f2c6b847000)
        /lib64/ld-linux-x86-64.so.2 (0x00007f2c6c268000)
```

```$
$ ls
bin  certs  ct_log_list.cnf  ct_log_list.cnf.dist  fipsmodule.cnf  include  lib64  misc  openssl.cnf  openssl.cnf.dist  private  share
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

Ok, that's great, but I'm still not seeing FIPS listed in providers:

```bash
$ LD_LIBRARY_PATH=/home/vagrant/openssl/ openssl list -providers
Providers:
  default
    name: OpenSSL Default Provider
    version: 3.5.0
    status: active
```

It turns out that this is expected unless since we've not updated the config file.  Let's find it:

```bash
$ sudo find / -type f -name openssl.cnf
/usr/local/ssl/openssl.cnf
/home/vagrant/openssl/apps/openssl.cnf
/etc/ssl/openssl.cnf
```

We can determine that the first two are the same by using the `diff` tool, but the third file listed has many differences.  This will be the old config file.

But, we can determine this using `openssl` itself, of course:

```bash
$ LD_LIBRARY_PATH=/home/vagrant/openssl/ openssl version -h
Usage: version [options]

General options:
 -help  Display this summary

Output options:
 -a     Show all data
 -b     Show build date
 -d     Show configuration directory
 -e     Show engines directory
 -m     Show modules directory
 -f     Show compiler flags used
 -o     Show some internal datatype options
 -p     Show target build platform
 -r     Show random seeding options
 -v     Show library version
 -c     Show CPU settings info
$ LD_LIBRARY_PATH=/home/vagrant/openssl/ openssl version -d
OPENSSLDIR: "/usr/local/ssl"
$ LD_LIBRARY_PATH=/home/vagrant/openssl/ openssl version -a
OpenSSL 3.5.0 8 Apr 2025 (Library: OpenSSL 3.5.0 8 Apr 2025)
built on: Sun Jul 27 23:25:22 2025 UTC
platform: linux-x86_64
options:  bn(64,64)
compiler: gcc -fPIC -pthread -m64 -Wa,--noexecstack -Wall -O3 -DOPENSSL_USE_NODELETE -DL_ENDIAN -DOPENSSL_PIC -DOPENSSL_BUILDING_OPENSSL -DNDEBUG
OPENSSLDIR: "/usr/local/ssl"
ENGINESDIR: "/usr/local/ssl/lib64/engines-3"
MODULESDIR: "/usr/local/ssl/lib64/ossl-modules"
Seeding source: os-specific
CPUINFO: OPENSSL_ia32cap=0xfffa32234f8bffff:0x1840073c219c07ab:0x00000010ac004410:0x0000000000000000:0x0000000000000000
```

> You can also take advantage of the `openssl` environment variable `OPENSSL_CONFIG`:
>
> ```bash
> $ export OPENSSL_CONF=/usr/local/ssl/openssl.cnf
> ```
>
> But, since we used the `--openssldir` flag when configuring (see above), we don't need to do this.

Using `strace`.

```bash
strace -e openat openssl version 2>&1 | grep openssl.cnf

```

Note that there is already a `/usr/local/ssl/fipsmodule.cnf` file.












```bash
$ LD_LIBRARY_PATH=/usr/local/ssl/lib64 /usr/local/ssl/bin/openssl md5 <<< "please worky"
MD5(stdin)= b7029ce8f33b8e354250c2a652ecd57a
```

Add the following to `openssl.cnf`:

1. The absolute path to `fipsmodule.cnf`:
    ```cnf
    .include /usr/local/ssl/fipsmodule.cnf
    ```
    Or:
    ```bash
    $ sudo sed -i 's_^# \.include fips.*_.include /usr/local/ssl/fipsmodule.cnf_' /usr/local/ssl/openssl.cnf
    ```
1. Activate the `fips_sect`, which is defined in and referenced from `fipsmodule.cnf`:
    ```cnf
    fips = fips_sect
    ```
    Or:
    ```bash
    $ sudo sed -i 's/^# \(fips = fips_sect\)/\1/' /usr/local/ssl/openssl.cnf
    ```

When running the same command, you should get an error.  This is proof that the FIPS module has been activated and is working to block unsafe algorithms from running:

```bash
$ LD_LIBRARY_PATH=/usr/local/ssl/lib64 /usr/local/ssl/bin/openssl md5 <<< "please worky"
Error setting digest
80544CFCAC7F0000:error:0308010C:digital envelope routines:inner_evp_generic_fetch:unsupported:crypto/evp/evp_fetch.c:375:Global default library context, Algorithm (MD5 : 100), Properties ()
80544CFCAC7F0000:error:03000086:digital envelope routines:evp_md_init_internal:initialization error:crypto/evp/digest.c:271:
```

Let's update the linker information so this information is saved:

```bash
$ echo /usr/local/ssl/lib64 | sudo tee /etc/ld.so.conf.d/openssl-fips.conf
$ sudo ldconfig
```

> To inspect the `/etc/ld.so.cache`, do the following:
>
> ```bash
> $ ldconfig -p
> ```

You can now remove the `LD_LIBRARY_PATH` variable.  You'll get the same result:

```bash
$ /usr/local/ssl/bin/openssl md5 <<< "please worky"
Error setting digest
80544CFCAC7F0000:error:0308010C:digital envelope routines:inner_evp_generic_fetch:unsupported:crypto/evp/evp_fetch.c:375:Global default library context, Algorithm (MD5 : 100), Properties ()
80544CFCAC7F0000:error:03000086:digital envelope routines:evp_md_init_internal:initialization error:crypto/evp/digest.c:271:
```

Finally, update `PATH` so we no longer need to use the absolute path:

```bash
$ export PATH=/usr/local/ssl/bin:"$PATH"
$ which openssl
/usr/local/ssl/bin/openssl
$ openssl sha256 <<< "please worky"
SHA2-256(stdin)= 4f335406cc1ae837bc22db03f98635aca9cfe3a1b820defd0d2a8cd2bf1b7634
openssl md5 <<< "please worky"
Error setting digest
80A49874BA7F0000:error:0308010C:digital envelope routines:inner_evp_generic_fetch:unsupported:crypto/evp/evp_fetch.c:375:Global default library context, Algorithm (MD5 : 100), Properties ()
80A49874BA7F0000:error:03000086:digital envelope routines:evp_md_init_internal:initialization error:crypto/evp/digest.c:271:
$ ls /etc/ld.so.conf.d/
fakeroot-x86_64-linux-gnu.conf  libc.conf  openssl-fips.conf  x86_64-linux-gnu.conf
```

It's worth mentioning that I could have exported `LD_LIBRARY_PATH` to include the new `openssl` build, but I wanted to be explicit about which path was being utilized on every command.

In other words, this would have been easier but less readable as to what was happening:

```bash
$ export LD_LIBRARY_PATH=/usr/local/ssl/lib64:"$LD_LIBRARY_PATH"
```

```bash
$ export PATH=/usr/local/ssl/bin:/usr/local/bin/go/bin:"$PATH"
$ openssl list -providers
Providers:
  fips
    name: OpenSSL FIPS Provider
    version: 3.5.0
    status: active
```

```bash
$ LD_LIBRARY_PATH=/home/vagrant/openssl/ openssl list -providers
Providers:
  default
    name: OpenSSL Default Provider
    version: 3.5.0
    status: active
  fips
    name: OpenSSL FIPS Provider
    version: 3.5.0
    status: active
```

This won't work now, because the `default` provider is listed first, and so it will be used instead of `fips`, which is of course what we want.

If this is the case, open the `openssl.cnf` file and deactivate the `default` provider:

```cnf
[default_sect]
# activate = 1
```

It should be inactive by default, but this may not be true of every distro and it could always change.

Note that the following still shows that FIPS is not enabled:

```bash
$ cat /proc/sys/crypto/fips_enabled
0
```

That's ok.

## Enabling FIPS On RHEL

https://portal.cloud.hashicorp.com/vagrant/discover/generic/rhel9

Both `openssl` and `curl` are using:

- `libcrypto.so.3 => /lib64/libcrypto.so.3`
- `libssl.so.3 => /lib64/libssl.so.3`

```bash
# dnf install dracut-fips
# UUID=$(findmnt / -no UUID)
# GRUB_CMDLINE_LINUX="biosdevname=0 no_timer_check vga=792 nomodeset text resume=/dev/mapper/rhel_rhel9-swap rd.lvm.lv=rhel_rhel9/root rd.lvm.lv=rhel_rhel9/swap net.ifnames=0 fips=1 boot=UUID=34de4fb5-3ec9-4986-9ddd-8f252d3c865f"
# dracut -f
# grub2-mkconfig -o /boot/grub2/grub.cfg
# reboot
```

## Enabling FIPS On Fedora

```bash
$ sudo apt-get install strace
...
$ strace -e openat $(which ls)
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/x86_64-linux-gnu/libselinux.so.1", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/x86_64-linux-gnu/libc.so.6", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/x86_64-linux-gnu/libpcre2-8.so.0", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/proc/filesystems", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/usr/lib/locale/locale-archive", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, ".", O_RDONLY|O_NONBLOCK|O_CLOEXEC|O_DIRECTORY) = 3
archetypes           config.toml  cpp.sh      foo.sh     hello.c  k8s       public     resources  static
build_and_deploy.sh  content      Dockerfile  goodbye.c  input    Makefile  README.md  sed.sh     test.txt
+++ exited with 0 +++
```

If you are using Fedora, you'll have to enable FIPS manually.  Here I am using Fedora 41.

```bash
[vagrant@vagrant-fedora ~]$ cat /proc/sys/crypto/fips_enabled
0
[vagrant@vagrant-fedora ~]$ sudo fips-mode-setup --enable
Kernel initramdisks are being regenerated. This might take some time.
Setting system policy to FIPS
Note: System-wide crypto policies are applied on application start-up.
It is recommended to restart the system for the change of policies
to fully take place.
FIPS mode will be enabled.
Please reboot the system for the setting to take effect.
[vagrant@vagrant-fedora ~]$ sudo reboot
```

Check again:

```bash
[vagrant@vagrant-fedora ~]$ cat /proc/sys/crypto/fips_enabled
1
```

```bash
[vagrant@vagrant-fedora ~]$ sudo dnf install openssl -y
[vagrant@vagrant-fedora ~]$ openssl version
OpenSSL 3.2.4 11 Feb 2025 (Library: OpenSSL 3.2.4 11 Feb 2025)
```

> You'll also need the `dracut-fips` and `fips-mode-setup` packages, but they had already been installed by default by the distro.

Look for [`openssl`] providers:

```bash
[vagrant@vagrant-fedora ~]$ openssl list -providers
Providers:
  default
    name: OpenSSL Default Provider
    version: 3.2.4
    status: active
```

FIPS is not listed, which is why we could still access the `md5` algorithm using [`openssl`].  We'll need to manually add it to the `openssl` providers section:

```bash
[vagrant@vagrant-fedora ~]$ sudo find / -type f -name openssl.cnf
/etc/pki/tls/openssl.cnf
[vagrant@vagrant-fedora ~]$ sudo vi $(!!)
```

Add the following to `openssl.cnf`:

1. The absolute path to `fipsmodule.cnf`:
    ```cnf
    .include /usr/local/ssl/fipsmodule.cnf
    ```
1. Activate the `fips_sect`, which is defined in and referenced from `fipsmodule.cnf`:
    ```cnf
    fips = fips_sect
    ```

> You may need to create `openssl.cnf` if it is not found, but I didn't have to for Debian Bullseye.

You should then get errors when trying to use the `md5` algorithm, which is not FIPS compliant:

```bash
[vagrant@vagrant-fedora ~]$ openssl md5 <<< "kilgore was here"
Error setting digest
009EFA7CC47F0000:error:0308010C:digital envelope routines:inner_evp_generic_fetch:unsupported:crypto/evp/evp_fetch.c:373:Global default library context, Algorithm (MD5 : 97), Properties ()
009EFA7CC47F0000:error:03000086:digital envelope routines:evp_md_init_internal:initialization error:crypto/evp/digest.c:254:
```

> I've seen instructions that suggest setting the OPENSSL_CONF at runtime.  For example:
>
> ```bash
> $ OPENSSL_CONF=/usr/local/ssl/openssl.cnf openssl md5 <<< "kilgore was here"
> ```
>
> In my case, I did not need to.

```bash
$ ldd oc
        linux-vdso.so.1 (0x00007ffd6e7de000)
        libresolv.so.2 => /lib/x86_64-linux-gnu/libresolv.so.2 (0x00007f6cc6811000)
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f6cc6630000)
        /lib64/ld-linux-x86-64.so.2 (0x00007f6cc6839000)
```

## Inspecting Binary For FIPS Compatibility

Tools to determine:

- `go tool nm /PATH/TO/BINARY`
- `go tool objdump /PATH/TO/BINARY`
    + `go tool objdump -s fips oc` (`-s` = only dump symbols matching this regexp)
- `objdump -T /PATH/TO/BINARY`
    + Some images (i.e., distroless) won't have `objdump`.
- `strings /lib/x86_64-linux-gnu/libc.so.6`

Example:

```bash
$ objdump -T $(which oc) | ag FIPS
0000000001d4ab60 g    DF .text  00000000000000c5  Base        vendor/github.com/golang-fips/openssl/v2.FIPS
0000000008203780 g    DO .data  0000000000000008  Base        vendor/github.com/golang-fips/openssl/v2._cgo_91985741879f_Cfunc_go_openssl_FIPS_mode_set
000000000820eb20 g    DO .data  0000000000000018  Base        crypto/tls.defaultCipherSuitesFIPS
000000000821fce0 g    DO .data  0000000000000018  Base        github.com/aws/aws-sdk-go/aws/session.awsUseFIPSEndpoint
000000000820ec80 g    DO .data  0000000000000018  Base        crypto/tls.defaultFIPSCipherSuitesTLS13
00000000083a7d58 g    DO .bss   0000000000000008  Base        _g_FIPS_mode_set
0000000003dd85a0 g    DF .text  000000000000001d  Base        github.com/aws/aws-sdk-go/aws.(*Config).WithUseFIPSEndpoint
00000000044d8c60 g    DF .text  0000000000000077  Base        github.com/openshift/client-go/machineconfiguration/applyconfigurations/machineconfiguration/v1.(*MachineConfigSpecApplyConfiguration).WithFIPS
0000000001d56840 g    DF .text  00000000000000fa  Base        crypto/internal/backend.hostFIPSModeEnabled
0000000001d4ac40 g    DF .text  0000000000000207  Base        vendor/github.com/golang-fips/openssl/v2.SetFIPS
00000000048e7c10 g    DF .text  000000000000002d  Base        _cgo_91985741879f_Cfunc_go_openssl_FIPS_mode_set
000000000820eb00 g    DO .data  0000000000000018  Base        crypto/tls.defaultFIPSCurvePreferences
00000000048e7be0 g    DF .text  000000000000002a  Base        _cgo_91985741879f_Cfunc_go_openssl_FIPS_mode
0000000001d56e40 g    DF .text  000000000000007c  Base        crypto/internal/backend.strictFIPSOpenSSLRuntimeCheck
00000000083a7d60 g    DO .bss   0000000000000008  Base        _g_FIPS_mode
0000000001d33b80 g    DF .text  0000000000000054  Base        vendor/github.com/golang-fips/openssl/v2._Cfunc_go_openssl_FIPS_mode.abi0
0000000003e6d0e0 g    DF .text  0000000000000171  Base        github.com/aws/aws-sdk-go/aws/session.updateUseFIPSEndpoint
0000000008203778 g    DO .data  0000000000000008  Base        vendor/github.com/golang-fips/openssl/v2._cgo_91985741879f_Cfunc_go_openssl_FIPS_mode
0000000003e64140 g    DF .text  0000000000000196  Base        github.com/aws/aws-sdk-go/aws/session.setUseFIPSEndpointFromEnvVal
00000000082570ba g    DO .noptrdata     0000000000000001  Base        crypto/internal/backend.isStrictFIPS
0000000001d33be0 g    DF .text  0000000000000095  Base        vendor/github.com/golang-fips/openssl/v2._Cfunc_go_openssl_FIPS_mode_set.abi0
```

Symbols like `FIPS_mode` and `FIPS_mode_set` are good indications that FIPS is enabled.

> Note that `objdump` cannot tell if FIPS mode is active at runtime.

## [`openssl-fipsintall`]

```bash
$ openssl fipsinstall -module fips.so -out fips.cnf -provider_name fips
SHA1 : (KAT_Digest) : Pass
SHA2 : (KAT_Digest) : Pass
SHA3 : (KAT_Digest) : Pass
AES_GCM : (KAT_Cipher) : Pass
AES_ECB_Decrypt : (KAT_Cipher) : Pass
RSA : (KAT_Signature) : RNG : (Continuous_RNG_Test) : Pass
Pass
ECDSA : (KAT_Signature) : Pass
ECDSA : (KAT_Signature) : Pass
ECDSA : (KAT_Signature) : Pass
ECDSA : (KAT_Signature) : Pass
TLS13_KDF_EXTRACT : (KAT_KDF) : Pass
TLS13_KDF_EXPAND : (KAT_KDF) : Pass
TLS12_PRF : (KAT_KDF) : Pass
PBKDF2 : (KAT_KDF) : Pass
SSHKDF : (KAT_KDF) : Pass
KBKDF : (KAT_KDF) : Pass
HKDF : (KAT_KDF) : Pass
SSKDF : (KAT_KDF) : Pass
X963KDF : (KAT_KDF) : Pass
X942KDF : (KAT_KDF) : Pass
HASH : (DRBG) : Pass
CTR : (DRBG) : Pass
HMAC : (DRBG) : Pass
DH : (KAT_KA) : Pass
ECDH : (KAT_KA) : Pass
RSA_Encrypt : (KAT_AsymmetricCipher) : Pass
RSA_Decrypt : (KAT_AsymmetricCipher) : Pass
RSA_Decrypt : (KAT_AsymmetricCipher) : Pass
HMAC : (Module_Integrity) : Pass
INSTALL PASSED
```

We can verify the file:

```bash
$ openssl fipsinstall -module fips.so -in fips.cnf -provider_name fips -verify
VERIFY PASSED
```

## Sanity Check

Ok, we've had our fun.  Now, let's confirm that programs that use `openssl` APIs that are now FIPS compliant will block insecure algorithms.

So, what programs will use these APIs?  Anything that involves TLS, hashing, encryption, etc.  Here is a small list of tools that would fall into this category:

- `curl`
- `wget`
- `nmap`
- `stunnel`

There a lots more, but this will give you an idea.  Many of the tools are making web requests, inspecting traffic, inspecting remote servers, etc. and are depending upon underlying protocols like TLS that heavily use cryptographic functions.

Let's try to verify that `curl` is using one of the shared objects that we've created.  Before we do, let's see again the shared objects that our custom `openssl` binary is using:

```bash
$ ldd $(which openssl)
        linux-vdso.so.1 (0x00007fff553e4000)
        libssl.so.3 => /usr/local/ssl/lib64/libssl.so.3 (0x00007f7dd1602000)
        libcrypto.so.3 => /usr/local/ssl/lib64/libcrypto.so.3 (0x00007f7dd0ffc000)
        libpthread.so.0 => /lib/x86_64-linux-gnu/libpthread.so.0 (0x00007f7dd0fda000)
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f7dd0e06000)
        libdl.so.2 => /lib/x86_64-linux-gnu/libdl.so.2 (0x00007f7dd0e00000)
        /lib64/ld-linux-x86-64.so.2 (0x00007f7dd1821000)
```

And `curl`:

```bash
$ ldd $(which curl)
        linux-vdso.so.1 (0x00007fff1a5bf000)
        libcurl.so.4 => /lib/x86_64-linux-gnu/libcurl.so.4 (0x00007f3b1b2be000)
        libz.so.1 => /lib/x86_64-linux-gnu/libz.so.1 (0x00007f3b1b2a1000)
        libpthread.so.0 => /lib/x86_64-linux-gnu/libpthread.so.0 (0x00007f3b1b27f000)
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f3b1b0ab000)
        libnghttp2.so.14 => /lib/x86_64-linux-gnu/libnghttp2.so.14 (0x00007f3b1b07d000)
        libidn2.so.0 => /lib/x86_64-linux-gnu/libidn2.so.0 (0x00007f3b1b05c000)
        librtmp.so.1 => /lib/x86_64-linux-gnu/librtmp.so.1 (0x00007f3b1b03b000)
        libssh2.so.1 => /lib/x86_64-linux-gnu/libssh2.so.1 (0x00007f3b1b006000)
        libpsl.so.5 => /lib/x86_64-linux-gnu/libpsl.so.5 (0x00007f3b1aff2000)
        libssl.so.1.1 => /lib/x86_64-linux-gnu/libssl.so.1.1 (0x00007f3b1af5f000)
        libcrypto.so.1.1 => /lib/x86_64-linux-gnu/libcrypto.so.1.1 (0x00007f3b1ac6b000)
        libgssapi_krb5.so.2 => /lib/x86_64-linux-gnu/libgssapi_krb5.so.2 (0x00007f3b1ac18000)
        libldap_r-2.4.so.2 => /lib/x86_64-linux-gnu/libldap_r-2.4.so.2 (0x00007f3b1abc0000)
        liblber-2.4.so.2 => /lib/x86_64-linux-gnu/liblber-2.4.so.2 (0x00007f3b1abaf000)
        libbrotlidec.so.1 => /lib/x86_64-linux-gnu/libbrotlidec.so.1 (0x00007f3b1aba1000)
        /lib64/ld-linux-x86-64.so.2 (0x00007f3b1b3a1000)
        libunistring.so.2 => /lib/x86_64-linux-gnu/libunistring.so.2 (0x00007f3b1aa1f000)
        libgnutls.so.30 => /lib/x86_64-linux-gnu/libgnutls.so.30 (0x00007f3b1a81f000)
        libhogweed.so.6 => /lib/x86_64-linux-gnu/libhogweed.so.6 (0x00007f3b1a7d4000)
        libnettle.so.8 => /lib/x86_64-linux-gnu/libnettle.so.8 (0x00007f3b1a78c000)
        libgmp.so.10 => /lib/x86_64-linux-gnu/libgmp.so.10 (0x00007f3b1a70b000)
        libgcrypt.so.20 => /lib/x86_64-linux-gnu/libgcrypt.so.20 (0x00007f3b1a5eb000)
        libdl.so.2 => /lib/x86_64-linux-gnu/libdl.so.2 (0x00007f3b1a5e5000)
        libkrb5.so.3 => /lib/x86_64-linux-gnu/libkrb5.so.3 (0x00007f3b1a50b000)
        libk5crypto.so.3 => /lib/x86_64-linux-gnu/libk5crypto.so.3 (0x00007f3b1a4d9000)
        libcom_err.so.2 => /lib/x86_64-linux-gnu/libcom_err.so.2 (0x00007f3b1a4d3000)
        libkrb5support.so.0 => /lib/x86_64-linux-gnu/libkrb5support.so.0 (0x00007f3b1a4c4000)
        libresolv.so.2 => /lib/x86_64-linux-gnu/libresolv.so.2 (0x00007f3b1a4aa000)
        libsasl2.so.2 => /lib/x86_64-linux-gnu/libsasl2.so.2 (0x00007f3b1a48d000)
        libbrotlicommon.so.1 => /lib/x86_64-linux-gnu/libbrotlicommon.so.1 (0x00007f3b1a46a000)
        libp11-kit.so.0 => /lib/x86_64-linux-gnu/libp11-kit.so.0 (0x00007f3b1a334000)
        libtasn1.so.6 => /lib/x86_64-linux-gnu/libtasn1.so.6 (0x00007f3b1a31e000)
        libgpg-error.so.0 => /lib/x86_64-linux-gnu/libgpg-error.so.0 (0x00007f3b1a2f8000)
        libkeyutils.so.1 => /lib/x86_64-linux-gnu/libkeyutils.so.1 (0x00007f3b1a2f1000)
        libffi.so.7 => /lib/x86_64-linux-gnu/libffi.so.7 (0x00007f3b1a2e5000)
```

Here are the two libraries that are different:

```bash
$ ldd $(which curl) | grep libcrypto
        libcrypto.so.1.1 => /lib/x86_64-linux-gnu/libcrypto.so.1.1 (0x00007fef52b03000)
$ ldd $(which curl) | grep libssl
        libssl.so.1.1 => /lib/x86_64-linux-gnu/libssl.so.1.1 (0x00007fe9870ae000)
```

Unfortunately, `curl` would need to be compiled that links to `openssl` 3, which isn't a great answer.  Not only `curl`, of course, but **every** binary that should support FIPS.  That's not great, and the primary reason why it's best to use a distro that supports FIPS at the kernel level, like RHEL.

> By the way, here is the original `openssl` binary.  Notice that both libraries are the same as for `curl`.
>
> ```bash
> $ ldd /usr/bin/openssl
>         linux-vdso.so.1 (0x00007fffbb9e2000)
>         libssl.so.1.1 => /lib/x86_64-linux-gnu/libssl.so.1.1 (0x00007f1a88267000)
>         libcrypto.so.1.1 => /lib/x86_64-linux-gnu/libcrypto.so.1.1 (0x00007f1a87f73000)
>         libpthread.so.0 => /lib/x86_64-linux-gnu/libpthread.so.0 (0x00007f1a87f51000)
>         libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f1a87d7d000)
>         libdl.so.2 => /lib/x86_64-linux-gnu/libdl.so.2 (0x00007f1a87d77000)
>         /lib64/ld-linux-x86-64.so.2 (0x00007f1a883b8000)
> ```

## Golang And FIPS

There are several ways to ensure that any program written in Go uses a FIPS compliant version of Go:

- Use `cgo`.
- Use the Red Hat Go toolchain in RHEL.
- Use [BoringSSL] crypto.

Go has a [BoringSSL crypto branch] in its repository and a [README](https://github.com/golang/go/blob/dev.boringcrypto/README.boringcrypto.md).  It is maintained alongside the mainline.  However, starting with 1.19, BoringSSL-based crypto has been part of the main branch and is behind the `GOEXPERIMENT` gate, specifically:

```go
GOEXPERIMENT=boringcrypto
```

So, there is no longer any need to checkout that development branch.  Instead, just use a mainline branch and enable the feature gate.

> There is also [a `golang-fips` organization](https://github.com/golang-fips) with [a custom repository](https://github.com/golang-fips/go).

---

Was it compiled using FIPS?

```bash
$ strings fips | grep -i fips
```

```bash
$ sudo find / -type f -name ld.so.conf
/etc/ld.so.conf
$ sudo find / -type d -name ld.so.conf.d
/etc/ld.so.conf.d
```

Or:

```bash
$ sudo find / -name ld.so.conf*
/etc/ld.so.conf.d
/etc/ld.so.conf
$ sudo echo /usr/local/lib/openssl-fips | sudo tee /etc/ld.so.conf.d/openssl-fips.conf
$ sudo ldconfig
```

```go
package main

import (
	"crypto/md5"
	"fmt"
	"io"
)

func main() {
	h := md5.New()
	s := "kilgore trout was here"
	_, err := io.WriteString(h, s)
	if err != nil {
		panic(err)
	}
	fmt.Printf("%s\n%x %d bytes\n", s, h.Sum(nil), h.Size())
}
```

Run it:

```bash
$ go run .
```

Wait, why does that work?  In other words, why isn't it being blocked by the `openssl` FIPS module?

Simply, the [`crypto/md5`] library is pure Go and does not using `openssl`.  So, only the FIPS-enabled `openssl` binary that was custom-built will only affect programs that use `openssl` APIs.

There is a caveat, though.  If the Go program uses `cgo`, then there is a chance one or more of Go's cryptographic implementation are linked to `openssl`.

Therefore, the above program is not FIPS-compliant, and it will run unimpeded since it doesn't link to any `openssl` shared libraries.  The way to fix this and ensure compliancy is to replace the [`crypto/md5`] library with [`crypto/sha256`] and then update the hashing method.

### Build Custom Go Toolchain

> Visit the official Go documentation on [Installing Go from source](https://go.dev/doc/install/source).

```bash
$ git clone git@github.com:golang/go.git goroot
$ cd goroot
$ git checkout release-branch.go1.24
$ cd src
$ GOEXPERIMENT=boringcrypto ./all.bash
```

> Note that there must already be a Go source tree on the system, or you'll get errors similar to this:
> ```bash
> $ GOEXPERIMENT=boringcrypto ./all.bash
> ERROR: Cannot find /home/vagrant/go1.4/bin/go.
> Set $GOROOT_BOOTSTRAP to a working Go tree >= Go 1.22.6.
> ```

If you get the following error when compiling, it's because the process has been OOM killed (the Linux kernel has an OOM (out of memory) killer that is a mechnism that is activated to terminate processes that are eating too much memory and may cause the system to crash when the system is becoming low on system resources).

```bash
$ GOEXPERIMENT=boringcrypto ./all.bash
Building Go cmd/dist using /usr/local/bin/go. (go1.24.6 linux/amd64)
Building Go toolchain1 using /usr/local/bin/go.
bootstrap/cmd/compile/internal/ssa: /usr/local/bin/go/pkg/tool/linux_amd64/compile: signal: killed
go tool dist: FAILED: /usr/local/bin/go/bin/go install -tags=math_big_pure_go compiler_bootstrap purego bootstrap/cmd/...: exit status 1
```

Ensure your VM is using at least 6 GM or more of RAM.  Also, add temporary SWAP space:

```bash
$ sudo fallocate -l 4G /swapfile
$ sudo chmod 600 /swapfile
$ sudo mkswap /swapfile
$ sudo swapon /swapfile
```

Now, it should compile:

```bash
$ GOEXPERIMENT=boringcrypto ./all.bash
```

To turn if off afterwards:

```bash
$ sudo swapoff /swapfile
$ sudo rm /swapfile
```

Weeeeeeeeeeeeeeeeeeeeeeeeee

```
$ go version -m fips
fips: go1.24.6 X:boringcrypto
        path    fips
        mod     fips    v0.0.0-20250511192558-7f49fdc475d1+dirty
        build   -buildmode=exe
        build   -compiler=gc
        build   CGO_ENABLED=1
        build   CGO_CFLAGS=
        build   CGO_CPPFLAGS=
        build   CGO_CXXFLAGS=
        build   CGO_LDFLAGS=
        build   GOARCH=amd64
        build   GOEXPERIMENT=boringcrypto
        build   GOOS=linux
        build   GOAMD64=v1
        build   vcs=git
        build   vcs.revision=7f49fdc475d1f5cf1412a8f606f5ea588d90e682
        build   vcs.time=2025-05-11T19:25:58Z
        build   vcs.modified=true
```

Enforce FIPS compliancy on Debian using the `BORINGSSL_FIPS` environment variable:

```bash
BORINGSSL_FIPS=1
```

<!--
[fips_sect]
activate = 1
install-version = 1
conditional-errors = 1
security-checks = 1
module-mac = 6D:E6:E4:72:8E:F2:C2:FB:B0:3B:A3:3B:97:91:D8:40:0A:A1:CA:29:3F:1E:F3:8E:F7:A8:47:3E:17:43:A3:E1
install-mac = 41:9C:38:C2:8F:59:09:43:2C:AA:2F:58:36:2D:D9:04:F9:6C:56:8B:09:E0:18:3A:2E:D6:CC:69:05:04:E1:11
install-status = INSTALL_SELF_TEST_KATS_RUN
-->

## References

- [`glibc`]
- [`openssl`]
- [FIPS]
- [BoringCrypto: FIPS 140-2 Non-Proprietary Security Policy](https://csrc.nist.gov/CSRC/media/projects/cryptographic-module-validation-program/documents/security-policies/140sp3678.pdf)
- [`golang-fips`](https://github.com/golang-fips/go)

[`glibc`]: https://en.wikipedia.org/wiki/Glibc
[`openssl`]: https://en.wikipedia.org/wiki/OpenSSL
[FIPS]: https://en.wikipedia.org/wiki/Federal_Information_Processing_Standards
[`openssl-fipsintall`]: https://docs.openssl.org/3.0/man1/openssl-fipsinstall/
[`fips_config`]: https://docs.openssl.org/master/man5/fips_config/
[`crypto/md5`]: https://pkg.go.dev/crypto/md5
[`crypto/sha256`]: https://pkg.go.dev/crypto/sha256
[BoringSSL]: https://github.com/google/boringssl
[BoringSSL crypto branch]: https://github.com/golang/go/tree/dev.boringcrypto

