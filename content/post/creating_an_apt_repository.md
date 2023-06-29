+++
title = "On Creating an APT Repository"
date = "2023-06-29T00:15:19-04:00"

+++

Several of my most recent posts have centered on packaging, and this article will take what we've done and do something cool with it: create our own local [`APT`] repository.

Since we now already know how to create a `deb` package, this is mainly an exercise in gluing pieces together in a way that makes sense and is easy to setup and tear down.

I hate to use the word "automate", even though that's what we'll be doing, because all the cool devops kids think that they invented that word and that the rest of us were acting like buffoons before they showed up.

We'll use a [`systemd-nspawn`] container to create the packages, and then we'll host the repository in a Debian virtual machine.

Note that this isn't supposed to be a production-ready setup, and you'll probably need to change some of my configuration to suit your needs and your environment.

More than anything, this is to get you started.  It's educational, yo.

---

- [The Container](#the-container)
- [The Virtual Machine](#the-virtual-machine)
- [The Package Download](#the-package-download)
- [References](#references)

---

## The Container

> Before doing anything here, you should clone my [`machines` repository] and navigate to the `deb-packaging` machine.  This directory contains all of the scripts and instructions you'll need to perform the following steps.

The first thing to do is to create the `deb-packaging` machine, which we'll use to create the [`systemd-nspawn`] container.  I have an earlier article called [On Running systemd-nspawn Containers] which walks through the steps of setting one up, so I won't do so here, other than showing the configuration.

Here are the steps:

1. [Create the machine](https://github.com/btoll/machines/tree/master/deb-packaging#get-the-root-filesystem).
1. [Install the `systemd` service](https://github.com/btoll/machines/tree/master/deb-packaging#create-the-service).
1. [Build and sign the package](https://github.com/btoll/machines/tree/master/deb-packaging#building-and-signing).

That's it for the package creation.  You can follow the small code samples for those links, and you'll be up and running in no time.

Some notes:

- I'm bind mounting a directory on my host for the newly-created packages at `/home/btoll/projects/reprepro/packages`.  Obviously, change that to whatever you want.
- If the `gpg-agent` isn't seeded (and subsequently cached) with the passphrase of the signing key **before** the container is created, the operation will fail (see [On gpg-agent Forwarding] for a lot more information).
- The `build_deb.sh` script that is ran for every container instance is depending upon two environment variables that need to be set when the container is created:
    + `PACKAGE_NAME`
    + `PACKAGE_VERSION`
- The `git` repository should have the same name as the package.  The `build_deb.sh` script is doing `git clone git@github.com:btoll/PACKAGE_NAME/`.

> Clearly, some of these defaults won't work for you.  That's ok, the point of this article is to get you started.

Once you've got everything sorted, it's time to create your first two packages: [`asbits`] and [`diceware`].

```bash
$ sudo systemd-nspawn --machine deb-packaging --setenv PACKAGE_NAME=asbits --setenv PACKAGE_VERSION=1.0.0 --setenv USER=1000 --quiet
$ sudo systemd-nspawn --machine deb-packaging --setenv PACKAGE_NAME=diceware --setenv PACKAGE_VERSION=1.0.0 --setenv USER=1000 --quiet
```

On my host, I've bind mounted `/home/btoll/projects/reprepro/packages` to the build directory in the `nspawn` container.  Once created, the host directory will contain those two packages:

```bash
$ cd ~/projects/reprepro
$ tree -dL 3 packages/
packages/
├── asbits
│   └── 1.0.0
│       └── asbits-1.0.0
└── diceware
    └── 1.0.0
        └── diceware-1.0.0

6 directories
```

## The Virtual Machine

> You must have [Vagrant] installed to create the virtual machine the way I did.  Of course, you can create a virtual machine however you want, it's up to you, you don't need Vagrant to do this.

To set up the `APT` repository, you'll first clone my [`reprepro` repository].  Once done, navigate into the new root of the project and perform these steps:

1. Run the `gpg-preset-passphrase.sh` shell script to have the host's `gpg-agent` cache the passphrase of your signing key.  Even though the passphrase is in clear text as you type it, it is not stored in your shell history.
1. `vagrant up` to create the virtual machine.
1. `ssh` into the machine.  Do not use `vagrant ssh`, instead use the command in the repository's `README`.  It will look something like this:
    ```bash
	$ ssh \
    -i .vagrant/machines/default/virtualbox/private_key \
    -o RemoteForward=/run/user/1000/gnupg/S.gpg-agent:/run/user/1000/gnupg/S.gpg-agent \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -p 2222 \
    vagrant@127.0.0.1
    ```
    > It's worth looking up the `ssh` options used here and why they're necessary.
1. Once in the virtual machine, run the Python script in the Vagrant shared directory to import the packages into the `reprepro` tool (`./vagrant/import_packages.py`).

    ```bash
	$ /vagrant/import_packages.py
    Exporting indices...
    Imported /vagrant/packages/asbits/1.0.0/asbits_1.0.0_amd64.deb
    Exporting indices...
    Imported /vagrant/packages/asbits/1.0.0/asbits_1.0.0.dsc
    Exporting indices...
    Imported /vagrant/packages/diceware/1.0.0/diceware_1.0.0_amd64.deb
    Exporting indices...
    Imported /vagrant/packages/diceware/1.0.0/diceware_1.0.0.dsc
    ```

    List the packages that the are in the `bullseye` codename / distribution:

    ```bash
    $ reprepro --basedir base list bullseye
    bullseye|main|amd64: asbits 1.0.0
    bullseye|main|amd64: diceware 1.0.0
    bullseye|main|source: asbits 1.0.0
    bullseye|main|source: diceware 1.0.0
    ```

## The Package Download

The last steps are probably ones you're already familiar with:

1. Adding the new `APT` repository to the host.
1. Installing the public key.
1. Updating the indices and download a package.

Back on the host, we'll add a new repository in `/etc/apt/sources.list.d/`.  You can call it whatever you want.  I called mine `btoll.list`:

```bash
$ sudo cat /etc/apt/sources.list.d/btoll.list
deb [signed-by=/usr/share/keyrings/btoll.gpg] http://192.168.1.200 bullseye main
deb-src [signed-by=/usr/share/keyrings/btoll.gpg] http://192.168.1.200 bullseye main
```

Here, we're adding repositories for both binary and source packages.  If you want to know how they're being generated, I've included plenty of links to both the code and configuration and articles I've written explaining the process.  Have fun.

Also, note the `IP` address.  This was defined in the [`Vagrantfile`] of the `reprepro` repository.  You may change this to whatever you want.

Then, install the public key (make sure the permissions are correct):

```bash
$ ls -l /usr/share/keyrings/btoll.gpg
-rw-r--r-- 1 root root 3918 Jun  4 03:30 /usr/share/keyrings/btoll.gpg
```

Finally, update the package indices and download one of the packages:

```bash
$ sudo apt-get update
Get:1 http://192.168.1.200 bullseye InRelease [2,359 B]
...
$ sudo apt-get install asbits
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
The following NEW packages will be installed:
  asbits
0 upgraded, 1 newly installed, 0 to remove and 4 not upgraded.
Need to get 4,642 B of archives.
After this operation, 25.6 kB of additional disk space will be used.
Get:1 http://192.168.1.200 bullseye/main amd64 asbits amd64 1.0.0 [4,642 B]
Fetched 4,642 B in 0s (0 B/s)
Selecting previously unselected package asbits.
(Reading database ... 369943 files and directories currently installed.)
Preparing to unpack .../asbits_1.0.0_amd64.deb ...
Unpacking asbits (1.0.0) ...
Setting up asbits (1.0.0) ...
```

We can get more information on the installed package:

```bash
$ sudo apt-cache policy asbits
asbits:
  Installed: 1.0.0
  Candidate: 1.0.0
  Version table:
 *** 1.0.0 500
        500 http://192.168.1.200 bullseye/main amd64 Packages
        100 /var/lib/dpkg/status
$
$ sudo apt-cache show asbits
Package: asbits
Version: 1.0.0
Architecture: amd64
Maintainer: Benjamin Toll <ben@benjamintoll.com>
Installed-Size: 25
Depends: libc6 (>= 2.2.5)
Homepage: https://benjamintoll.com
Priority: optional
Section: utils
Filename: pool/main/a/asbits/asbits_1.0.0_amd64.deb
Size: 4642
SHA256: 65dd271b20dab5ae11226c47c7f0f7cffbb17cb9baab7315c7867f3566acbec3
SHA1: 6ca8c2cae3f30326fb12d5852df35d8d3a67cfce
MD5sum: 8f97e45deec4522b5491cb3dd60d197f
Description: Display hexadecimal, decimal and octal numbers in binary
 In addition, installs htoi, itob and otio tools.
Description-md5: 18d8963d53d99af7b557b9136878fe7d

$ asbits
Usage: asbits <base-10 | hex | octal> [num nibbles=4]
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## Summary

Clearly, there are some moving pieces here that can still be automated.  Don't judge me too harshly, script kiddie.

## References

- [`machines` repository]
- [`reprepro` repository]
- [On Running systemd-nspawn Containers]
- [On systemd-nspawn](/2018/08/20/on-systemd-nspawn/)
- [On gpg-agent Forwarding]

[`APT`]: https://wiki.debian.org/Apt
[`systemd-nspawn`]: https://www.man7.org/linux/man-pages/man1/systemd-nspawn.1.html
[On Running systemd-nspawn Containers]: /2022/02/04/on-running-systemd-nspawn-containers/
[On gpg-agent Forwarding]: /2023/06/07/on-gpg-agent-forwarding/
[`asbits`]: https://github.com/btoll/asbits
[`diceware`]: https://github.com/btoll/diceware
[`machines` repository]: https://github.com/btoll/machines
[`reprepro` repository]: https://github.com/btoll/reprepro
[Vagrant]: https://www.vagrantup.com/
[`Vagrantfile`]: https://github.com/btoll/reprepro/blob/master/Vagrantfile

