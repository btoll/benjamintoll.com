+++
title = "On systemd-nspawn"
date = "2018-08-20T10:53:13-04:00"

+++

I was recently researching container technology (again), as I seem to do every once in a while.  I've been using [chroots] for a long time and [have written about them] a bit.  I love the idea of sandboxes, so I've always been drawn to the concept and use them when needed.

I've been down this road before, and every time I'm hesitant to use the most well-known player in this domain, Docker.  Why?  Well, almost to a person, the one recommending that I use Docker has never heard of chroot or BSD jails.  This is usually indicative that that person has not done their homework and has just adopted Docker.  This could be for a multitude of reasons, but none of them are reasonable or smart unless they've also weighed the alternatives, such as ones offered natively by various [Unices].  That may not be fair, but that's how the cookie crumbles.

## [A Brief History]

Container technologies are old.  According to the historical record, they first came into widespread use by the [Etruscans] before they succumbed to the Romans, at which point the technology was unfortunately lost for centuries.

The story picks back up in the 20<sup>th</sup> century at [Bell Labs], where the idea of a chroot made its way into [Version 7 Unix] in 1979.  [Bill Joy], he of [vi] fame (thanks Bill!), added it to BSD in 1982, and the stage was set for fully-virtualized sandboxed environments termed [jails] that were released in [FreeBSD] in 2002.  Jails were known to be used in Linux at least by 2002.

Containers, as we know and speak of them today, were first developed (marketed?) by [Sun Microsystems], who called them [Solaris Containers] in 2005, and Linux followed in 2008 with their operating-system level virtualization method, [LXC].  The latter is the technology that Docker was first built-upon, although it no longer uses it.

By 2013, Linux natively supports the building blocks for containers ([cgroups], [namespaces]) in the kernel (starting with version 3.8), which considerably opens the reach of containers to a broad audience.

So Docker?  Unless I'm missing something, they've just been successful at marketing something old as something new.  And they have a cute mascot.

## Creating Containers

In this article, we're going to look at one particular container technology built into [systemd] called [systemd-nspawn].  `systemd` is an [init system] that has been widely adopted by many Linux distributions, so the chances are very good that you already have it installed (because you are using Linux, right?).  And, if not, it's just an install away.

> `systemd` has been highly controversial within the Linux community.  I'm not going to get into it here, but long story short, many people feel that it doesn't subscribe to [the Unix philosophy].  I think they have a good point, and if you're not using `systemd`, I don't know if you need to download the entire package just to be able to use the container utilities of which I'm speaking here.  You may be able to get away with just downloading the `systemd-container` package.  I really don't know, but I suspect not, which would understandably turn some people off.

`systemd-nspawn` is a utility that ships with `systemd`, so most Linux users will have it "out-of-the-box" with most standard installations (if not present on your system, simply download the `systemd-container` package).  This is the utility that allows you to spawn containers.  The [`machinectl`] utility will also be a part of the `systemd-container` package, and this will enable you to manage your containers via a simple inteface (although everything can be done using `systemd-nspawn`).

> I won't be talking about [Linux containers] or Solaris Containers, but they are also popular and exciting container technologies.

There are several steps I took to create my workspace and get containers up and running:

1. Create an area on disk.  We'll do this by creating a [btrfs] filesystem mount point where we'll create our containers.

2. Download and install a minimal Debian system.

3. Create and manage our containers.

> If you're downloading an image or tar file from an external source then you can skip the first two steps and go right to step 3.

### `btrfs`

Why btrfs?  This is a great layered filesystem that is very full-featured, the most important of which for our purposes is the ability to easily and quickly create snapshots of a [btrfs subvolume].  These snapshots will be our new containers.

The idea is to make a btrfs filesystem workspace within our filesystem.  With this then mounted, we'll create a subvolume (directory) that will be the base installations from which we'll stamp out our containers by creating our snapshots (although, we'll shortly see how `machinectl` will manage this for us).  Weeeeeeeeeeeeeeeeee

I'll create this in [/srv], because, why not?

> Note all commands from here on are performed as root!

	# Allocate 20GiB space for the filesystem.
	fallocate -l 20G containers

	# Create the btrfs filesystem.
	mkfs.btrfs containers

	# Create the mount point and mount it.
	mkdir trees
	mount -o loop containers trees

	# Finally, create a subvolume that we'll use as the install target.
	btrfs subvolume create debian_build-vim

### `debootstrap`

The second step to creating a container is to download the packages needed to bootstrap a virtual environment.  For this, I'll use [debootstrap], since I run Debian (other distros will have similar tool, such as [pacstrap] for Arch Linux).  This is easy to do.  At its simplest:

	debootstrap [version] [location]

However, you'll probably want to set some flags to control the behavior, such as the variant type (the type of download, such as `minbase` (the default), `buildd` or `fakechroot`) and other packages to download along with it:

	debootstrap --arch=amd64 --variant=buildd --include=vim,curl,git stretch debian-buildd/ http://deb.debian.org/debian

The notable thing about this command is that we're downloading packages for a minimal install along with `build-essential` (specified by `--variant=buildd`) and the packages for `vim`, `curl` and `git`.  Basically, a development environment, which can serve as a base for more specific projects.

You can tell `debootstrap` to simply download the `deb` packages without installing them.  I particularly like this feature since I'm bandwidth-deprived.  So, I went to the library and downloaded several base packages into their respective tar files:

	debootstrap --arch=amd64 --variant=minbase --include=vim --make-tarball=stretch-minbase_vim.tgz stretch foo
	debootstrap --arch=amd64 --variant=buildd --include=vim,curl,git --make-tarball=stretch-buildd_vim-curl-git.tgz stretch foo
	et al.

> Note that when using `debootstrap` to create an archive the command still needs a location, even though we're not actually installing anything.  In this case, I just made an empty directory `foo` which allows me to run the command.

This will allow me to point the installation at the archive rather than downloading them via HTTP, allowing me to save precious bits.  You could also place these archives on a local network drive which would be save not only bandwidth but time.

So, here is what the process was for me to download and install a base container:

	debootstrap --arch=amd64 --variant=minbase --include=vim --make-tarball=stretch-minbase_vim.tgz stretch foo
	debootstrap --unpack-tarball=/srv/trees/packages/stretch-minbase_vim.tgz stretch debian_base-stretch

That this didn't need to be a two-step process, but it's nice to save the bandwidth for subsequent installs.  Also, `minbase` is the default, but I like to be explicit, especially when I'm first using a technology.  Here is the one-liner:

	debootstrap --arch=amd64 --variant=minbase --include=vim stretch debian_base-stretch http://deb.debian.org/debian

I did that once for all of the different combination minimal package archives that I anticipate needing (at least for stretch), and so moving forward I won't need to do it again.

I now have all my base package tarballs in the `containers` tree:

	/srv/containers/packages:$ ll
	total 315M
	-rw------- 1 root root 96M Aug 20 14:33 stretch-buildd_vim-curl-git.tgz
	-rw------- 1 root root 91M Aug 20 14:28 stretch-buildd_vim-curl.tgz
	-rw------- 1 root root 86M Aug 20 14:31 stretch-buildd_vim.tgz
	-rw------- 1 root root 43M Aug 20 14:25 stretch-minbase_vim.tgz

Let's install one!  Weeeeeeeeeeeeeeeeee

	debootstrap --unpack-tarball=/srv/trees/packages/stretch-buildd_vim.tgz stretch debian_buildd-vim

> It is essential that you created the `debian_buildd-vim` directory as a subvolume as outlined above.  If not, you won't be able to create snapshots of it!

This base development install will now serve as the template with which I'll stamp out the containers.  Note that I'm not going to change this install at all, so it's as vanilla and unopinionated as possible.  Any changes will be in the derivative containers of the base template.

### `systemd-nspawn` and [`machinectl`]

At this point, we could merely use this installation as a chroot, but that's not why we're here.  Let's spin up our container with `systemd-nspawn`!

	root@trout:/srv/trees# systemd-nspawn -D debian_buildd-vim/
	Spawning container debian_buildd-vim on /srv/trees/debian_buildd-vim.
	Press ^] three times within 1s to kill container.
	root@debian_buildd-vim:~#

We're [in like Flynn]!

> This is the easiest way to spawn a container.  There are many switches and options that I am not going to cover here, so [read the man page]!

That's terrific, now let's look at actually booting into a container:

	root@trout:/srv/trees# systemd-nspawn -bD debian_buildd-vim/

You should have seen `init` start and bootstrap the userspace, which then dumps you at a root login:

	...
	...
	...
	[  OK  ] Started Console Getty.
	[  OK  ] Reached target Login Prompts.
	[  OK  ] Started System Logging Service.
	[  OK  ] Reached target Multi-User System.
	[  OK  ] Reached target Graphical Interface.
		 Starting Update UTMP about System Runlevel Changes...
	[  OK  ] Started Update UTMP about System Runlevel Changes.

	Debian GNU/Linux 9 trout console

	trout login:

Ruh roh, we don't have a login!  That's ok, we'll just create one.  Press `Ctrl-]]]` to exit the container and then spawn the container without the boot option, `-b`.

At the prompt, use `passwd` to set a root password.  I suggest [12345].  Now, if you spawn the container with the boot option, you can login.

This is great, but remember, this installation is the template, not the container instance we'll use for changing the world.

Now, let's copy this dir over to where `machinectl` expects to find any containers on the system: `/var/lib/machines`.

	cp -r debian_buildd-vim /var/lib/machines

> `/var/lib/machines` should already exist on your system.  It is not a regular directory but a mount point of the `machines.raw` file, which is a btrfs filesystem.
>
> If it doesn't exist, it is simple enough to create:
>
>		# fallocate -l 20G machines.raw
>		# mkfs.btrfs machines.raw
>		# mkdir machines
>		# mount -o loop machines.raw machines
>
> Commands such as `machinectl list-images` will list what it finds in this directory (and some others), and this is the location where images will be downloaded when using `machinectl pull-tar|pull-raw|import-tar`.

Now `machinectl` knows about this container, which it sees as an image.  We can perform operations on any machine listed in this directory, such as clone, start, stop, reboot, etc.

	/srv/trees:$ machinectl list-images
	NAME              TYPE      RO  USAGE CREATED MODIFIED
	debian_buildd-vim directory no  n/a   n/a     n/a

	1 images listed.

> Note that you can clone a machine using the `systemd-nspawn` utility, but this won't place it in `/var/lib/machines` or make `machinectl` aware of the image.
>
> For completeness, that command would be:
>
>		btrfs subvolume snapshot debian_buildd-vim nginx

Now, if we want to create a new container from our template, we can issue the following command:

	/var/lib:$ machinectl clone debian_buildd-vim nginx
	==== AUTHENTICATING FOR org.freedesktop.machine1.manage-images ===
	Authentication is required to manage local virtual machine and container images.
	Authenticating as: Benjamin Toll,,, (btoll)
	Password:
	==== AUTHENTICATION COMPLETE ===
	/var/lib:$
	/var/lib:$ machinectl list-images
	NAME              TYPE      RO  USAGE CREATED                     MODIFIED
	debian_buildd-vim directory no  n/a   n/a                         n/a
	nginx             subvolume no  n/a   Wed 2018-08-22 00:02:17 EDT n/a

	2 images listed.

Easy peasy lemon squeezy!  You can see that under the hood `machinectl` created a btrfs subvolume for the `nginx` machine, since the operating system supports it.  Cool.

Now, let's spawn an instance of the `nginx` machine and actually install [nginx]:

	# systemd-nspawn -M nginx
	Spawning container nginx2 on /var/lib/machines/nginx2.
	Press ^] three times within 1s to kill container
	root@nginx:~# apt-get install nginx
	...configure nginx and put content in public dir...

After hitting `Ctrl-]]]` to kill the container, we'll export the container as a tar archive which we can upload to the cloud or to a file server on the local network:

	# machinectl --format=xz export-tar nginx nginx.xz
	Enqueued transfer job 1. Press C-c to continue download in background.
	Exporting '/var/lib/machines/nginx', saving to '/var/lib/nginx.xz' with compression 'xz'.
	Operation completed successfully.
	Exiting.

No big deal.

How do you import a container?  Like this:

	# machinectl pull-tar https://cloud-images.ubuntu.com/trusty/current/trusty-server-cloudimg-amd64-root.tar.gz
	# systemd-nspawn -M trusty-server-cloudimg-amd64-root

That one is taken from the [`machinectl` man page].  As you can see, pretty standard stuff and what one would expect from a utility to manage containers.

I just ran out of steam.  I'll be updating this as I learn more about `systemd-nspawn` and `machinectl`.  In the meantime, read the man pages, explore and have fun!

[chroots]: http://man7.org/linux/man-pages/man2/chroot.2.html
[have written about them]: /2018/04/06/on-running-a-tor-onion-service-in-a-chroot/
[Unices]: https://www.thefreedictionary.com/Unices
[A Brief History]: https://en.wikipedia.org/wiki/Chroot#History
[Etruscans]: https://en.wikipedia.org/wiki/Etruscan_civilization
[Bell Labs]: https://en.wikipedia.org/wiki/Bell_Labs
[Version 7 Unix]: https://en.wikipedia.org/wiki/Version_7_Unix
[Bill Joy]: https://en.wikipedia.org/wiki/Bill_Joy
[vi]: https://en.wikipedia.org/wiki/Vi
[jails]: https://www.freebsd.org/doc/handbook/jails.html
[FreeBSD]: https://en.wikipedia.org/wiki/FreeBSD
[Sun Microsystems]: https://en.wikipedia.org/wiki/Sun_Microsystems
[Solaris Containers]: https://en.wikipedia.org/wiki/Solaris_Containers
[LXC]: https://en.wikipedia.org/wiki/LXC
[cgroups]: https://en.wikipedia.org/wiki/Cgroups
[namespaces]: https://en.wikipedia.org/wiki/Namespace
[systemd]: https://en.wikipedia.org/wiki/Systemd
[systemd-nspawn]: http://man7.org/linux/man-pages/man1/systemd-nspawn.1.html
[init system]: https://en.wikipedia.org/wiki/Init
[the Unix philosophy]: https://en.wikipedia.org/wiki/Unix_philosophy
[Linux containers]: https://linuxcontainers.org/
[`machinectl`]: http://manpages.org/machinectl
[`machinectl` man page]: http://manpages.org/machinectl
[btrfs]: https://en.wikipedia.org/wiki/Btrfs
[btrfs subvolume]: https://btrfs.wiki.kernel.org/index.php/Manpage/btrfs-subvolume
[/srv]: http://tldp.org/LDP/Linux-Filesystem-Hierarchy/html/Linux-Filesystem-Hierarchy.html#srv
[debootstrap]: https://linux.die.net/man/8/debootstrap
[pacstrap]: https://git.archlinux.org/arch-install-scripts.git/tree/pacstrap.in
[deb]: https://en.wikipedia.org/wiki/Deb_%28file_format%29
[in like Flynn]: https://en.wikipedia.org/wiki/In_like_Flynn
[read the man page]: /2018/02/20/on-learning/
[12345]: https://www.youtube.com/watch?v=a6iW-8xPw3k

