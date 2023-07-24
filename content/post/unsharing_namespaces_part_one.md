+++
title = "On Unsharing Namespaces, Part One"
date = "2022-08-08T03:26:29Z"

+++

"A container is just a process."

-- Attributed to [Titus Herminius Aquilinus], c. 500 B.C.E.

---

This is the first part in a two part series that will be looking at [Linux namespaces] and the [`unshare`] command which is used to create them.  Using this new knowledge, we'll create a container by hand, piece by piece.

The `unshare` tool is used to run a program in a process with some namespaces unshared from its parent, meaning that it doesn't share the namespaces with the parent, instead having its own.  The namespaces to be unshared are listed as options to the `unshare` command.

So, what's the big deal about this?  Why learn about it?  Can't I just use Docker?

Well, you could, if you want to be just like everyone else.  But you don't, do you?  You want to be unique, your own person.

We'll be learning how to create a container from scratch using some foundational knowledge that we probably already have.  It's just a matter of putting all of the pieces together.  And, no matter your container technology of choice (Docker, Podman, `systemd-nspawn`, et al.), doing this exercise will improve and enhance your understanding of how these higher-level abstractions create Linux containers under the hood.  That's always a good thing.

Back to the task at hand.  Again, we're going to be primarily looking at the `unshare` command and creating new, unshared namespaces.

As for the name, the child process inherits all of its parent namespaces, but sometimes the child shouldn't **share** those inherited namespaces, instead opting to create new namespaces that are not **shared** (or, if you will, *unshared*) with the parent.

So, let's get on with it.

> There are more namespaces than just the ones we're looking at in this series.

---

- [Namespaces](#namespaces)
    + [Unix Timesharing System](#unix-timesharing-system)
    + [Process IDs](#process-ids)
    + [Mount points](#mount-points)
- [Summary](#summary)
- [References](#references)

[Hey, ho, let's go!]

---

Before we start, here is the syntax of the command:

```bash
unshare [options] [program [arguments]]
```

---

## Namespaces

You can get a sense of all of the defined [namespaces] for all users on your system by listing them:

```bash
$ sudo lsns
```

Running the command as an unprivileged user will only get your own namespaces:

```bash
$ lsns
```

> Always run [`lsns`] as a privileged user, because it reads its information from the [`/proc`] pseudo-filesystem!

On mine, there are a whole bunch, mostly Firefox web browser tabs that I have open.  After all, modern browsers use namespacing and cgroups to create a sandboxed environment!

### Unix Timesharing System

The `uts` [Unix Timesharing System namespace] is basically the hostname namespace, which allows us to set a hostname in the `uts` namespace which can be different from that of the host.

As a simple example, observe the following:

```bash
# On host.
$ sudo unshare --uts sh

# The following command puts us in a new Bourne shell.
# So, now we're inside the "container" process.
$ hostname
kilgore-trout
$ hostname doody
$ hostname
doody
$ exit

# Now, back on host.
$ hostname
kilgore-trout
```

First, we launched a Bourne shell with its own `uts` namespace.  We then list out the hostname inherited from the parent, and then change it to "doody", because I'm a child.  Then, we verify that it took and exited the shell (and the namespace).  Lastly, we verify that the hostname on the host has not been changed.

Ok, pretty simple stuff.  Let's move on to a more interesting example.

> Note that not giving a command to `unshare` will result in it opening a shell by default (determined by the value of the `SHELL` environment variable).

### Process IDs

The [`pid` namespace] is interesting because we first have to know something about [`chroot`]s and the [`/proc`] filesystem.  Let's talk about `/proc` first.

`/proc` is a pseudo-filesystem that is created by the kernel and is an interface to kernel data structures.  Essentially, this means that user space can get information from the kernel and set properties that are read from the kernel by reading from and writing to these files.

We're interested in the `/proc` filesystem because of its detailed information about all of the running processes.  When, for example, the `ps` command is executed, it reads its information from `/proc`.  So, creating an unshared `pid` namespace isn't simply specifying the option as part of the `unshare` command; we need to also tell the kernel to create a new `/proc` filesystem, in which it will write **only** process information for the new namespace.

But, wait, there is *already* a `/proc` filesystem!  Won't a new `/proc` filesystem interfere with this older one?  Indeed it would, observant grasshopper.

What we need is to create another, different view of the filesystem for the new process.  Perhaps we could install another [`rootfs`] within this filesystem, and then **change** the **root** of the filesystem to this new `rootfs`.

This will change the root of what the process can see, essentially restricting its access and what it can do (for example, the new root filesystem may only have a small fraction of the binaries that are available in the main root filesystem).  There are many upsides to this (for example, greater security), as evidenced by the fact that `chroot`s have been used in the Unix world for decades.

Let's download a `rootfs` from Alpine.  Let's get the latest as of this writing, [version 3.9]:

```bash
$ sudo su -
# mkdir rootfs
# curl http://dl-cdn.alpinelinux.org/alpine/v3.9/releases/x86_64/alpine-minirootfs-3.9.0-x86_64.tar.gz | tar -xz -C rootfs/
```

> We're running as a privileged user for all commands, mostly out of convenience when we start unsharing namespaces (as this is a privileged operation), but also to avoid the `./dev/null: Cannot mknod: Operation not permitted` error when untarring the tarball in the `rootfs/` directory.

And `unshare` the `pid` namespace and change the root in the same fell command:

```bash
# unshare --pid --fork chroot rootfs sh
# ls
bin    dev    etc    home   lib    media  mnt    opt    proc   root   run    sbin   srv    sys    tmp    usr    var
```

This is doing the following:

- unsharing the `pid` namespace
- creating a `chroot` rooted in the `rootfs/` filesystem that was just downloaded and installed (putting us into the new `chroot`, as well)
- starting a new Bourne shell in the `chroot`

> Why `--fork`?  From the `unshare` man page:
>
>   > Fork the specified program as a child process of `unshare` rather than running it directly.  This is useful when creating a new PID namespace.
>
> Every time you unshare the `pid` namespace, you should use the `--fork` option.

Let's [`sleep`] in the container process and then inspect the process ID from the host.

In the container process:

```bash
# sleep 1000
```

In another terminal on the host:

```bash
$ ps -C sleep
    PID TTY          TIME CMD
2290330 pts/1    00:00:00 sleep
$ sudo ls -l /proc/2290330/root
lrwxrwxrwx 1 root root 0 Aug  8 01:52 /proc/2290330/root -> /root/rootfs
```

From the host, we can see that the `sleep` process indeed has a different view of the filesystem (that is, the kernel is informing us that the root of process ID 2290330 is `/root/rootfs`).  Its root is the new `rootfs` in the `rootfs` directory, and the process only sees this subsystem of the entire host filesystem.

> Note that the process only has a high number from the perspective of the host.  In the chroot (the "container"), it would have a different and lower number.

However, `ps` still isn't working in the container process.  You may receive an error or it may just return the column headers with no running processes listed:

```bash
# ps
Error, do this: mount -t proc proc /proc
```

Or:

```bash
# ps
PID   USER     TIME  COMMAND
```

Why isn't it reporting on any running processes?  We know that it should have at least one in the container process, PID 1, which will be `/bin/sh` in this case, since we launched the process with the `sh` shell command.

Listing out the `/proc` directory tells us why.  It's empty, of course.

```bash
# ls /proc
#
```

Either way, we need to mount the `/proc` pseudo-filesystem before we're able to see anything.  Just as with the main `/proc` filesystem in the `/` root, it will contain information written to it by the kernel about the running processes, but, importantly, **only** those running in this `chroot`:

```bash
# mount -t proc proc /proc
```

Now, `ps` should be able to list the running processes:

```bash
# ps
    PID TTY          TIME CMD
      1 ?        00:00:00 sh
     46 ?        00:00:00 ps
```

Sweet, that worked!  With one simple command and an easily downloaded `rootfs`, we've gone a fair way toward making a running container!

> Note that we'll get a similar error when executing the `mount` command in the container process before the `/proc` filesystem is mounted:
>
>     # mount
>     mount: failed to read mtab: No such file or directory
>     # mount -t proc proc /proc
>     # mount
>     /dev/sda2 on /target type ext4 (rw,relatime,errors=remount-ro)
>     proc on /proc type proc (rw,relatime)
>
> More on this in the next section.

Weeeeeeeeeeeeeeeeeeeeeeee

### Mount points

[`mnt` namespaces] allow a process to see only its own mount points and not that of any other `mnt` namespace, like its parent's.

Creating a `mnt` namespace is important so the parent `mnt` namespace isn't shared with child processes and subsequently the host mount table isn't littered with entries that had been mounted in child container processes and not unmounted, leaving a relic that hangs around like your next-door neighbor.

Since the `mnt` namespace is otherwise inherited and shared, these mount points can be seen from the host and will appear in its mount table.

Imagine having a host that continually spawns hundreds, if not thousands, of containers whose needs include bind mounting directories from the host and/or mounting (pseudo-)filesystems in the container, like `/proc`.  Of course, if the container process remembers to clean up after itself by umounting any mount points before exiting (or in a trap), then the mount entries are removed, but who remembers to do that?  Well, I do, of course, but other people that aren't me?  No way.

Also, and more importantly, sharing the same `mnt` namespace with the host is a huge security risk.  Remember, once the host is compromised, which is bad enough, then the attacker has access to every container running on the kernel.  Depending on the shared hosting and its infrastructure, this could be really bad (although I assume, and hope, that cloud providers run the containers in virtual machines, but that only partly mitigates it.  For example, if there are multiple containers running in the same VM, that would be the same problem).  So, not only do you have to worry about your own security, you have to worry about your neighbor's.

First, let's take a look at mounting from within the container process that inherits (shares) its `mnt` namespace with its parent:

```bash
$ sudo unshare bash
(container) # mkdir source
(container) # touch source/HELLO
(container) # mkdir target
(container) # mount --bind source target
(container) # ls target
HELLO
container # exit
exit
```
Back on the host, we can still see the mount point listed by the `mount` command:

```bash
$ mount | ag target
/dev/sda2 on /home/btoll/target type ext4 (rw,relatime,errors=remount-ro)
```

This is unfortunate but easily fixed.

> Note in the example below that we don't need to recreate the `source` and `target` directories because the `bash` process had the same root filesystem (`/`), and so the directories created in the "container" were created on the host's root filesystem, which, of course, will persist when exiting the subprocess (the "container").
>
> Another way to say it is that the new process did not `chroot` to a subdirectory on the host filesystem, so it has the same view of the filesystem as the host.

To remove this entry from the host's list of mount points, simply run the same command as before and unmount the bind mount:

```bash
$ sudo unshare bash
$ umount target
```

And, on the host:

```bash
$ mount | ag target
$
```

Now, let's do this properly.  Create an unshared process with its own `mnt` namespace:

```bash
$ sudo unshare --mount bash
(container) # mount --bind source target
(container) # ls target
HELLO
container # exit
exit
```

And, on the host:

```bash
$ mount | ag target
$
```

Even though the container process didn't tidy up by unmounting the mount point before exiting, it still didn't create the mount point in the parent namespace because it had its own `mnt` namespace, established by the `--mount` option.

Weeeeeeeeeeeeeeeeeeeeeee

---

Before moving on to the next section, let's take a look at some information made available to us by the kernel in `/proc` that is interesting and instructive.

Each process in `/proc` has a `mounts` file that informs us what mounts, if any, were created by any process.  For example, to see the mount points for PID 1 (on my system that is `systemd`), you can do:

```bash
$ sudo cat /proc/1/mounts
```

You'll see a list that is strikingly similar, or perhaps the same, as that of `mount`.

Now, let's take a look at an example where a process is created with its own unshared `mnt` namespace.  Run the same commands as before:

```bash
$ sudo unshare --mount bash
(container) # mkdir source
(container) # touch source/HELLO
(container) # mkdir target
(container) # mount --bind source target
(container) # ls target
HELLO
```

So far, so good.  We need to look at the process information on the host in `/proc`, so let's get the PID number from the container environment:

```bash
(container) # echo $$
2521485
```

> The [Bash and Bourne special parameter] `$$` expands to the process ID of the shell (in a subshell, it's always the PID of the invoking shell).

As expected, it's a high number because the process has inherited the `pid` namespace of its parent.  We can use `ps` to confirm that:

```bash
(container) # ps
    PID TTY          TIME CMD
2521380 pts/1    00:00:00 sudo
2521485 pts/1    00:00:00 sh
2521847 pts/1    00:00:00 ps
```

Armed with the PID of the Bourne shell process, we can now see its mount points.

> Since the container process has unshared its `mnt` namespace from its parent, the mount point entry won't show by running `mount` on host, so the following method is the only way to see from the host what is in a container process' `mnt` namespace.

First, just as a sanity check, we'll make sure that that process can be seen from the host:

```bash
$ ps -C sh
    PID TTY          TIME CMD
   1891 tty1     00:00:00 sh
   2200 pts/0    00:00:00 sh
 965293 pts/1    00:00:22 sh
2353178 pts/0    00:00:00 sh
2521485 pts/1    00:00:00 sh
```

Yes, there it is, listed last.  Of course it would be, but I am, well, paranoid.  Now, let's look at the method with which we can see what is in a process's unshared `mnt` namespace.  The expectation is that we'll only see what has been mounted (`source`, in this case).

```bash
$ sudo cat /proc/2521485/mounts
sysfs on /sys type sysfs (rw,nosuid,nodev,noexec,relatime)
proc on /proc type proc (rw,nosuid,nodev,noexec,relatime)
udev on /dev type devtmpfs (rw,nosuid,noexec,relatime,size=8039820k,nr_inodes=2009955,mode=755)
devpts on /dev/pts type devpts (rw,nosuid,noexec,relatime,gid=5,mode=620,ptmxmode=000)
tmpfs on /run type tmpfs (rw,nosuid,nodev,noexec,relatime,size=1613876k,mode=755)
/dev/sda2 on / type ext4 (rw,relatime,errors=remount-ro)
securityfs on /sys/kernel/security type securityfs (rw,nosuid,nodev,noexec,relatime)
...
/dev/sda2 /home/btoll/target ext4 rw,relatime,errors=remount-ro 0 0
```

Wait, what?!?  In addition to the mount point created by the process that we expected to see (the last one listed), we also see all of the other of the host's mount points.  What is going on here?

Well, it's because the mount information for each process is contained in `/proc` within each PID's directory entry, as we've seen above.  And, because we haven't unshared the `pid` namespace **and** (most importantly) created the process in its own `chroot`, its view of the world will still be that of its parent, and it will get all of its mount information from `/proc` on the host.

So let's create **its** own `pid` namespace and `chroot` to get only the information we expect.

```bash
$ sudo unshare --pid --fork --mount chroot rootfs sh
(container) # echo $$
1
(container) # ps
Error, do this: mount -t proc proc /proc
(container) # mount -t proc proc /proc
(container) # ls -l /proc/$$/exe
lrwxrwxrwx 1 root root 0 Aug  8 23:30 /proc/1/exe -> /bin/busybox
(container) # mkdir source
(container) # touch source/CIAO
(container) # mkdir target
(container) # mount --bind source target
(container) # ls target/
CIAO
(container) # sleep 1000
```

And on the host:

```bash
$ ps -C sleep
    PID TTY          TIME CMD
    2528091 pts/1    00:00:00 sleep
$ cat /proc/2528091/mounts
proc /proc proc rw,relatime 0 0
/dev/sda2 /target ext4 rw,relatime,errors=remount-ro 0 0
```

And there we have it, it's only listing the two mount points that we just created in the container, and nothing from its parent `mnt` namespace.

<!--
> Interestingly, the `sleep` "trick" works because any process that is forked is going to be a descendant of the host's PID 1 unless explicitly unshared by an `unshare` call (or another means).  So, the forked process will inherit the parent's namespaces.
-->

So, we don't need to `cat` out the mount points for the parent `sh` process (PID 1) and instead can look at any process in the process tree that hasn't unshared its `mnt` namespace (because all other processes will have the shared view of the mount points).

Here is the proof they're sharing the same namespace (the first is `sh` and the second is `sleep`):

```bash
$ sudo ls -l /proc/2528059/ns/ | ag mnt
lrwxrwxrwx 1 root root 0 Aug  8 20:57 mnt -> mnt:[4026533227]
$ sudo ls -l /proc/2528091/ns/ | ag mnt
lrwxrwxrwx 1 root root 0 Aug  8 20:57 mnt -> mnt:[4026533227]
```

As this is starting to get fairly long, this is a good point to stop and continue in [On Unsharing Namespaces, Part Two] where we'll cover the `net` and `user` namespaces..

## Summary

I hope you have found this article scintillating and that you've been titillated.  I know that I have.

## References

- [On Unsharing Namespaces, Part Two]
- [Container Security by Liz Rice](https://containersecurity.tech/)
- [Containers From Scratch - Liz Rice - GOTO 2018](https://www.youtube.com/watch?v=8fi7uSYlOdc)
- [Trivy](https://github.com/aquasecurity/trivy)
- [Index of /alpine/](http://dl-cdn.alpinelinux.org/alpine/)

[Titus Herminius Aquilinus]: https://en.wikipedia.org/wiki/Titus_Herminius_Aquilinus
[Linux namespaces]: https://en.wikipedia.org/wiki/Linux_namespaces
[`unshare`]: https://www.man7.org/linux/man-pages/man1/unshare.1.html
[Hey, ho, let's go!]: https://www.youtube.com/watch?v=krokQtkvd9M
[namespaces]: https://www.man7.org/linux/man-pages/man7/namespaces.7.html
[`lsns`]: https://www.man7.org/linux/man-pages/man8/lsns.8.html
[Unix Timesharing System namespace]: https://www.man7.org/linux/man-pages/man7/uts_namespaces.7.html
[`pid` namespace]: https://www.man7.org/linux/man-pages/man7/pid_namespaces.7.html
[`chroot`]: https://man7.org/linux/man-pages/man2/chroot.2.html
[`/proc`]: https://man7.org/linux/man-pages/man5/proc.5.html
[`mnt` namespaces]: https://www.man7.org/linux/man-pages/man7/mount_namespaces.7.html
[`rootfs`]: https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard
[version 3.9]: http://dl-cdn.alpinelinux.org/alpine/v3.9/releases/x86_64/alpine-minirootfs-3.9.0-x86_64.tar.gz
[`sleep`]: https://www.man7.org/linux/man-pages/man1/sleep.1.html
[Bash and Bourne special parameter]: https://www.gnu.org/software/bash/manual/html_node/Special-Parameters.html
[On Unsharing Namespaces, Part Two]: /2022/12/14/on-unsharing-namespaces-part-two/

