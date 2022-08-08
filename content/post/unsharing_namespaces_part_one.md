+++
title = "On Unsharing Namespaces, Part One"
date = "2022-08-08T03:26:29Z"

+++

"A container is just a process."

-- Attributed to [Titus Herminius Aquilinus], c. 500 B.C.E.

---

This is the first part in a two part series that will be looking at [Linux namespaces] and the [`unshare`] command which is used to create them.  Using this new knowledge, we'll create a container by hand, piece by piece.

The `unshare` tool is used to run a program in a process with some namespaces unshared from its parent, meaning that it doesn't share the namespaces with the parent, instead having its own.  The namespaces to be unshared are listed as options to the `unshare` command.

So, what's the big deal about this?  Why learn about it?

Well, education!  Isn't that always the answer?

We're learning how to create a container from scratch using some foundational knowledge that we probably already have.  It's just a matter of putting all of the pieces together.  And, no matter your container technology of choice (Docker, Podman, `systemd-nspawn`, et al.), doing this exercise will improve and enhance your understanding of how these higher-level abstractions create Linux containers under the hood.  That's always a good thing.

Back to the task at hand.  Again, we're going to be primarily looking at the `unshare` command and creating new, unshared namespaces.

As for the name, the child process inherits all of its parent namespaces.  But sometimes the child shouldn't **share** those inherited namespaces, instead opting to create new namespaces that are not **shared** (or, if you will, *unshared*) with the parent.

So, let's get on with it.

> There are more namespaces than just the ones we're looking at in this series.

---

- [Namespaces](#namespaces)
    + [Unix Timesharing System](#unix-timesharing-system)
    + [Process IDs](#process-ids)
    + [Mount points](#mount-points)

[Hey, ho, let's go!]

---

## Namespaces

You can get a sense of all of the defined namespaces on your system by listing them:

```
$ sudo lsns
```

> Always run [`lsns`] as a privileged user, because it reads its information from the [`/proc`] pseudo-filesystem!

On mine, there are a whole bunch, mostly Firefox web browser tabs that I have open.  After all, modern browsers use namespacing and cgroups to create a sandboxed environment!

### Unix Timesharing System

The Unix Timesharing System is basically the hostname namespace, which allows us to set a hostname in the `uts` namespace which can be different from that of the host.

As a simple example, observe the following:

```
# On host.
$ sudo unshare --uts sh

# Now, inside the container process.
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

First, we launched a shell with its own `uts` namespace.  We then list out the hostname inherited from the parent, and then change it to "doody", because I'm a child.  Then, we verify that it took and exit the shell (and the namespace).  Lastly, we verify that the hostname on the host has not been changed.

Ok, pretty simple stuff.  Let's move on to a more interesting example.

### Process IDs

The `pid` namespace is interesting because we first have to know something about [`chroot`]s and the [`/proc`] filesystem.  Let's talk about `/proc` first.

`/proc` is a pseudo-filesystem that is created by the kernel and is an interface to kernel data structures.  Essentially, this means that user space can get information from the kernel and set properties that are read from the kernel by reading from and writing to these files.

We're interested in the `/proc` filesystem because of its detailed information about all of the running processes.  When, for example, the `ps` command is executed, it reads its information from `/proc`.  So, creating an unshared `pid` namespace isn't simply specifying the option as part of the `unshare` command; we need to tell the kernel to create a new `/proc` filesystem, in which it will write **only** process information for the new namespace.

But, wait, there is *already* a `/proc` filesystem!  Indeed there is, observant grasshopper.  What we need is to create another, different view of the filesystem for the new process.  Perhaps we could install another [`rootfs`] within this filesystem, and the **change** the **root** of the filesystem to this new `rootfs`.

This will change the root of what the process can see, essentially restricting its access and what it can do (for example, the new root may only have a small fraction of the binaries that are available in the main root).  There are many upsides to this, as evidenced by the fact that `chroot`s have been used in the Unix world for decades.

Let's download a `rootfs` from Alpine.  Let's get the latest as of this writing, [version 3.9]:

```
$ mkdir rootfs
$ cd rootfs
$ curl -o alpine-3.9.tar.gz http://dl-cdn.alpinelinux.org/alpine/v3.9/releases/x86_64/alpine-minirootfs-3.9.0-x86_64.tar.gz
```

And `unshare` the `pid` namespace and change the root in the same fell command:

```
$ sudo unshare --pid --fork chroot rootfs sh
```

> Why `--fork`?  From the `unshare` man page:
>
>   > Fork the specified program as a child process of `unshare` rather than running it directly.  This is useful when creating a new PID namespace.
>
> Every time you unshare the `pid` namespace, you should use the `--fork` option.

Let's [`sleep`] in the container process and then inspect the process ID from the host:

```
# In the container process.
$ sleep 1000
$

# In another terminal on the host.
$ ps -C sleep
    PID TTY          TIME CMD
2290330 pts/1    00:00:00 sleep
$ sudo ls -l /proc/2290330/root
lrwxrwxrwx 1 root root 0 Aug  8 01:52 /proc/2290330/root -> /home/btoll/rootfs
```

Well, that's pretty darn cool!  From the host, we can see that the `sleep` process indeed has a different view of the filesystem (that is, the kernel is informing us that the root of process ID 2290330 is `/home/btoll/rootfs` and not `/`).  Its root is the new `rootfs` in the `rootfs` directory, and the process only sees this subsystem of the entire host filesystem.

However, `ps` still isn't working in the container process:

```
$ ps
Error, do this: mount -t proc proc /proc
```

( The error is a big clue for why `ps` isn't "working", as we'll see in a moment. )

Why isn't it reporting on any running processes?  We know that it should have at least one in the container process, PID 1, which will be `/bin/sh` in this case, since we "launched" the process with the `sh` shell command.

Listing out the `/proc` directory tells us why.  It's empty, of course.

```
$ ls /proc
$
```

Ok, let's do as we were told and mount the `/proc` pseudo-filesystem.  Just as with the main `/proc` filesystem in the `/` root, it will contain information written to it by the kernel about the running processes **only** in this `chroot`.

```
$ mount -t proc proc /proc
```

Now, `ps` should be able to list the running processes:

```
$ ps
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

`mnt` namespaces allow a process to see only its own mount points and not that of any other `mnt` namespace, like its parent's.

Creating a `mnt` namespace is important so the parent `mnt` namespace isn't shared with child processes and subsequently the host mount table isn't littered with entries that had been mounted in child container processes and not unmounted, leaving a relic that hangs around like your next-door neighbor.

Since the `mnt` namespace is otherwise inherited and shared, these mount points can be seen from the host and will appear in its mount table.

Imagine having a host that continually spawns hundreds, if not thousands, of containers whose needs include bind mounting directories from the host and/or mounting (pseudo-)filesystems in the container, like `/proc`.  Of course, if the container process remembers to clean up after itself by umounting any mount points before exiting or in a trap, then the mount entries are removed, but who remembers to do that?  Well, I do, of course, but other people that aren't me?  No way.

Also, and more importantly, sharing the same `mnt` namespace with the host is a huge security risk.  Remember, once the host is compromised, which is bad enough, then the attacker has access to every container running on the kernel.  Depending on the shared hosting and its infrastructure, this could be really bad (although I assume, and hope, that cloud providers run the containers in virtual machines, but that only partly mitigates it if there are multiple containers running in the same VM).  So, not only do you have to worry about your own security, you have to worry about your neighbor's.

First, let's take a look at mounting from within the container process that inherits (shares) its `mnt` namespace with its parent:

```
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

```
$ mount | ag target
/dev/sda2 on /home/btoll/target type ext4 (rw,relatime,errors=remount-ro)
```

This is unfortunate but easily fixed.

> Note in the example below that we don't need to recreate the `source` and `target` directories because the `bash` process has the same root filesystem (`/`).  Another way to say it is that the new process did not `chroot` to a subdirectory on the host filesystem, so it has the same view of the filesystem as the host.

```
$ sudo unshare --mount bash
(container) # mount --bind source target
(container) # ls target
HELLO
container # exit
exit
```

And, on the host:

```
$ mount | ag target
$
```

Even though the container process didn't tidy up by unmounting the mount point before exiting, it still didn't create the mount point in the parent namespace because it had its own `mnt` namespace, established by the `--mount` option.

---

Before moving on to the next section, let's take a look at some information made available to us by the kernel in `/proc` that is interesting and instructive.

Each process in `/proc` has a `mounts` file that informs us what mounts, if any, were created by the process (in this context, our container process).  For example, to see the mount points for PID 1 (on my system that is `systemd`), you can do:

```
$ sudo cat /proc/1/mounts
```

You'll see a list that is strikingly similar, or perhaps the same, as that of `mount`.

Now, let's take a look at an example where a process is created with its own unshared `mnt` namespace:

```
$ sudo unshare --mount bash
(container) # mkdir source
(container) # touch source/HELLO
(container) # mkdir target
(container) # mount --bind source target
(container) # ls target
HELLO
```

So far, so good.  We need to look at the process information on the host in `/proc`, so let's get the PID number from the container environment:

```
(container) # echo $$
2509877
```

> The [Bash special parameters] `$$` expands to the process ID of the shell (in a subshell, it's always the PID of the invoking shell).

As expected, it's a high number because the process has inherited the `pid` namespace of its parent.  We can use `ps` to confirm that:

```
(container) # ps
    PID TTY          TIME CMD
    2509876 pts/1    00:00:00 sudo
    2509877 pts/1    00:00:00 bash
    2511137 pts/1    00:00:00 ps
```

Armed with the PID of the Bash process, we can now see its mount points.

> Since the container process has unshared its `mnt` namespace from its parent, the mount point entry won't show by running `mount` on host, so the following method is the only way to see from the host what is in a container process's `mnt` namespace.

First, just as a sanity check, we'll make sure that that process is indeed what we think it is:

```
$ ps -C bash
    PID TTY          TIME CMD
   2025 tty1     00:00:00 bash
   2301 pts/0    00:00:00 bash
2219162 pts/1    00:00:04 bash
2247417 pts/2    00:00:01 bash
2517779 pts/1    00:00:00 bash
```

Yes, there it is.  Of course it would be, but I am, well, paranoid.  Now, let's look at the method with which we can see what is in a process's unshared `mnt` namespace.  The expectation is that we'll only see what has been mounted (`source`, in this case).

```
$ sudo cat /proc/2517779/mounts
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

Well, it's because the mount information for each process is contained in `/proc` within each PID's directory entry, as we've seen above.  And, because we haven't unshared the `pid` namespace **and** (most importantly) created the process in its own `chroot`, it's view of the world will still be that of its parent, and it will get all of its mount information from `/proc` on the host.

So let's create its own `pid` namespace and `chroot` to get only the information we expect.

```
$ sudo unshare --pid --fork --mount chroot rootfs bash
(container) # echo $$
1
(container) # ps
Error, do this: mount -t proc proc /proc
(container) # mount -t proc proc /proc
(container) # ls -l /proc/$$/exe
lrwxrwxrwx 1 root root 0 Aug  8 23:30 /proc/1/exe -> /usr/bin/bash
(container) # mkdir source
(container) # touch source/CIAO
(container) # mkdir target
(container) # mount --bind source target
(container) # ls target/
CIAO
(container) # sleep 1000
```

And on the host:

```
$ ps -C sleep
    PID TTY          TIME CMD
    2528091 pts/1    00:00:00 sleep
$ cat /proc/2528091/mounts
proc /proc proc rw,relatime 0 0
/dev/sda2 /target ext4 rw,relatime,errors=remount-ro 0 0
```

And there we have it, it's only listing the two mount points that we just created in the container, and nothing from its parent `mnt` namespace.

Interestingly, the `sleep` "trick" works because any process that is forked is going to be a descendant of PID 1, and unless explicitly done by another `unshare` call (or another means), the forked process will inherit the parent's namespaces.

So, we don't need to `cat` out the mount points for the parent `bash` process (PID 1) and instead can look at any process in the process tree that hasn't unshared its `mnt` namespace.

Here is the proof they're sharing the same namespace (the first is `bash` and the second is `sleep`):

```
$ sudo ls -l /proc/2528059/ns/ | ag mnt
lrwxrwxrwx 1 root root 0 Aug  8 20:57 mnt -> mnt:[4026533227]
kilgore-trout ~~> ~:
$ sudo ls -l /proc/2528091/ns/ | ag mnt
lrwxrwxrwx 1 root root 0 Aug  8 20:57 mnt -> mnt:[4026533227]
```

---

As this is starting to get fairly long, this is a good point to stop and continue in part two.

[Titus Herminius Aquilinus]: https://en.wikipedia.org/wiki/Titus_Herminius_Aquilinus
[Linux namespaces]: https://en.wikipedia.org/wiki/Linux_namespaces
[`unshare`]: https://www.man7.org/linux/man-pages/man1/unshare.1.html
[Hey, ho, let's go!]: https://www.youtube.com/watch?v=krokQtkvd9M
[`lsns`]: https://www.man7.org/linux/man-pages/man8/lsns.8.html
[`chroot`]: https://man7.org/linux/man-pages/man2/chroot.2.html
[`/proc`]: https://man7.org/linux/man-pages/man5/proc.5.html
[`rootfs`]: https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard
[version 3.9]: http://dl-cdn.alpinelinux.org/alpine/v3.9/releases/x86_64/alpine-minirootfs-3.9.0-x86_64.tar.gz
[`sleep`]: https://www.man7.org/linux/man-pages/man1/sleep.1.html
[Bash special parameters]: https://www.gnu.org/software/bash/manual/html_node/Special-Parameters.html

