+++
title = "On runc"
date = "2022-01-18T04:43:29Z"

+++

This article intends to introduce [`runc`] as a tool that ultimately creates and runs containers at a lower level than container engine tools like [`podman`] and [`docker`], which most developers are familiar with and use.  Kubernetes, everyone's favorite, may use `runc`.  So, if you work with containers, chances are that you are using `runc`, even if you aren't aware of it.

The article is not meant to be a thorough dissection of its features and capabilities, and this article only uses a very small subset of what it can do.

Its goal is just to get a newcomer to the tool up and running.

---

<!--- [Creating a container](#creating-a-container)-->
- [What is runc?](#what-is-runc)
- [The filesystem bundle](#the-filesystem-bundle)
- [Installing `runc`](#installing-runc)
- [So what?](#so-what)
- [Getting the bundle](#getting-the-bundle)
    - [The OCI config](#the-oci-config)
    - [The `rootfs`](#the-rootfs)
- [Creating a container, redux](#creating-a-container-redux)
    + [User Namespace](#user-namespace)
    + [Mounts](#mounts)
- [Conclusion](#conclusion)
- [References](#references)

---

How about some sweet ASCII art to give everyone a mental model before we begin!  Note that this is Docker-specific, as podman does not use [`containerd`].

<pre class="math">
                    +----------------+
                    |                |
                    |     docker     |
                    |                |
                    +----------------+
                            |
                            |
                    +----------------+
                    |                | -- There are also other implementations
                    |   containerd   |    like <a href="https://cri-o.io/">CRI-O</a> that can be used here
                    |                |    instead of <a href="https://containerd.io/">containerd</a>.
                    +----------------+
                            |
                            |
                         <a href="https://opencontainers.org/">OCI spec</a>
                            |
                            |
                    +----------------+
                    |                |
                    |      runc      |
                    |                |
                    +----------------+
                   /        |         \
                  /         |          \
     +-----------+    +-----------+     +-----------+
     | container |    | container |     | container |
     +-----------+    +-----------+     +-----------+
           |                |                 |
           |                |                 |
     +----------------------------------------------+
     |                 Linux kernel                 |
     +----------------------------------------------+
</pre>

> This is not the only implementation stack, but it is a common one.

## What is runc?

[`runc`] is a command-line tool to create and run containers.  It is low-level, at least as viewed in the context of the software "stack" that developers usually use to create containers (i.e, beginning with podman, docker, [systemd-nspawn], etc.), and is one of the last levels of that software stack running in userspace that interacts with the kernel.  `runc` applies, among other things, the namespaces and cgroups, using kernel interfaces.

`runc` is the runtime implementation of the [Open Container Initiative] (OCI) runtime specification, which defines what it means to "run" a container.  It relies upon [`libcontainer`] substantially to provide Linux container-management functionality.

Since it is a cli and not a library, you can install it as a binary on your system and interact with it to create and spawn your containers.  As implied by the artwork above, it is also used by higher-level tools such as [`containerd`] and [`CRI-O`], and by tools used directly by users, such as `podman` and others.

To avoid having different runtimes at this level creating disparate APIs, the OCI stepped in and created a [runtime spec].  Now, as long as a runtime implements this specification, in theory one can be seamlessly swapped for another compliant implementation, and any software running on top of it *should* be able to just keep calm and carry on.

So, what does the OCI runtime spec define?

`runc` does not manage images at all.  This includes pulling images and unpacking image layers.  It relies upon higher-level tools to do that such as docker, podman, skopeo, et al.

## The filesystem bundle

To enable a compliant runtime implementation such as `runc` to be able to create and run containers, the spec defined a [filesystem bundle].  This bundle is composed of two things:

- an [OCI configuration file] (`config.json`)
    + This is a `json`-formatted file and defines the process arguments, environment variables, [namespaces], [cgroups], [capabilities], mounts, and other configuration that will define the container.
- a [root filesystem] (`rootfs`)
    + A root filesystem is a hierarchy of directories, typically as defined by the [Filesystem Hierarchy Standard] (FHS).  It has been popularized by Linux distributions, and it is usually mounted, not simply changed into.
    + Or, it could be a minimal filesystem.

> The command-line arguments passed to `docker run` are part of the OCI runtime specification that constructs `config.json`.  This isn't accomplished by `runc`, but they are in the `config.json` and are then given when using kernel interfaces.

`runc` knows how to run a container by expecting a filesystem bundle to be present.  Importantly, it doesn't care where the config file or `rootfs` came from, since those are higher-level concerns.  It just needs it to be there.

## Installing `runc`

See the [`Building`](https://github.com/opencontainers/runc#building) section in the official docs.

## So what?

Let's take a brief pause and consider why knowing this stuff is important.

First, containers, and by extension container orchestration platforms like Kubernetes, have a considerable amount of mystery to them.  This is not good and has led to their misuse (and abuse), which has resulted in security breaches and a loss of trust by users (and customers, if you care about that sort of thing).

Unfortunately, many developers still cannot confidently explain the difference between a container and a [virtual machine], and whether your ace scrum master thinks so or not, this is a problem.

So, peeling away the layers and getting closer to the Linux primitives themselves is the best thing we can do for ourselves and our customers (again, if that is something you care about).

Once you get down to a reasonable level (like running commands in the shell), you start to understand how containers are built, and that demystification helps all the way back up the stack to whatever container engine you're using.  Being able to better reason about each layer of the stack will make you a giant among men and women.

> Note that there isn't one well-defined container software "stack".  I'm using the term loosely to illustrate that different tools are responsible for creating and managing containers.

Now, let's get back to the task at hand.

> I recommend starting with [Linux container networking](/2026/08/12/on-linux-container-networking/) and getting comfortable with the command-line tools that are used to build underlay and overlay technologies that are used by modern container engines.

<!--
## Creating a container

As long as you have the bundle on your filesystem, it is easy as pie to create and start a container.  Here is an example from [the `runc` README](https://github.com/opencontainers/runc/blob/main/README.md#rootless-containers):

```bash
# create the top most bundle directory
$ mkdir /mycontainer
$ cd /mycontainer

# create the rootfs directory
$ mkdir rootfs

# export busybox via Docker into the rootfs directory
$ docker export $(docker create busybox) | tar -C rootfs -xvf -

# create the config
$ runc spec

# create and run the container
# run as root
# cd /mycontainer
# runc run mycontainerid
```

I'll get more into the details later in the article, but first I want to address the main question I had when first working with `runc`:

How do I get the bundle?
-->

## Getting the bundle

What is the easiest way to get it?  What tools do I need?

> Recall that a bundle is two things, a config and a `rootfs`.

Let's start with getting the config.

### The OCI config

The easiest way to get the `config.json` file is to use the `runc` CLI, as seen above:

```bash
$ runc spec
$ runc spec --rootless
```

> The latter generates an OCI configuration containing a user namespace and `uid`/`gid` mappings intended for [rootless execution].
>
> Note that there are many other conditions that must be satisfied to fully enable rootless containers, but that is outside the scope of this article.  The simple example above it merely intended to demonstrate that setting the `--rootless` option enables the creation of a separate `user` namespace, just one of the prerequisites for a rootless container.

This will create a generic config that can be used to create a container, although it probably isn't exactly what you need.  Critically, it probably will need to be edited, because it is not meant to be a universal, run-anywhere configuration.  But, it's easy enough to generate and use to get a simple container up and running.

From there, you'd have to edit the config file with your least-favorite text editor to customize it to your own specifications, which is out of the scope of this article.

Is there a way to get the config file that was created for one of your (running) containers that you'd like to use outright or as a base for further customization?  Indeed!

Here are some ways that I've used to get access to a container's `config.json` file.

The first two can be used if Docker has already been installed on your system, while the latter can be used regardless of having Docker and does not need privileged user permissions.

> I'm only going to briefly touch on these tools to show how to generate the parts of the filesystem bundle needed by `runc` to create a container.  See the provided links for more information on each project.

1. Archaeology, or Digging Through Directories Created at Runtime by Docker

    This is my least favorite way of getting an OCI config spec because it is very brittle and could change at any time at the whim of Docker, Inc.

    When I start a container, I found config file generated by `containerd` in `/run`:

    ```bash
    $ sudo find /run -type f -name config.json 2> /dev/null
    /run/containerd/io.containerd.runtime.v2.task/moby/f36dac521a8faa08f18eb0918a5cb1822ffc13d9e6a48fe42b51ca686dce0ae6/config.json
    ```

    Of course, you can confirm that that is indeed the OCI config of the running container that you expect:

    ```bash
    $ docker ps
    CONTAINER ID   IMAGE                         COMMAND                  CREATED        STATUS        PORTS     NAMES
    f36dac521a8f   jessfraz/tor-browser:latest   "/bin/bash /usr/loca…"   3 months ago   Up 22 hours             tor-browser
    ```

    Unfortunately, you need to be in `sudoers` to even be able to search for this, which isn't great and could be a problem.

    Of course, you'd then need to copy that to the same directory in which you'll put the `rootfs`.

1. [`riddler`]

    Although no longer maintained, I've found this tool by [Jess Frazelle] to be the best way to get the config file for users that already have Docker installed.

    In order for this to work, you'll need to first create a container.  It doesn't matter whether its state is running or stopped, as long as `docker container ls` can list it then `riddler` will be able to extract the OCI config.

    For example:

    ```bash
    $ docker container ls -a
    CONTAINER ID   IMAGE           COMMAND   CREATED          STATUS                      PORTS     NAMES
    7861b5dad3b0   golang:latest   "bash"    10 minutes ago   Exited (0) 10 minutes ago             vigilant_hopper
    $ riddler vigilant_hopper
    config.json has been saved.
    ```

    This will save the spec to the current working directory.

    The tool works by calling the Docker API via the Docker daemon.  Here is an example of how `riddler` accesses the config of a created container underneath the hood:

    ```bash
    $ curl -XGET --unix-socket /run/docker.sock localhost/containers/tor-browser/json
    ```

    This will `GET` the container `json`-formatted for a Docker container, which is then massaged by `riddler` into the needed OCI format.  This example is getting the config for [the `tor-browser` container].

    Personally, I don't like either of these methods because I don't like having to install Docker to make this work (although I like the `riddler` tool itself).

1. [`skopeo`] and [`umoci`]

    These are tools that are used to convert an image format into the expected [OCI image format] and then unpack it into the filesystem bundle that `runc` can use, respectively.  Since these tools also help to extract the `rootfs` from a container image, I'll cover them in more detail in the section below.

    There are a couple of very appealing reasons to use these tools.

    - You don't need to have installed Docker.
    - You don't need root access to do any of the operations (well, as we'll see, that's only *mostly* true).
    - You don't need privileges to download a Docker image from the Internet.

1. `runc spec`

    Of course, we've seen this already, but I wanted to add it to the list:

    ```bash
    $ runc spec
    $ runc spec --rootless
    ```

Let's move on to learn how to get the `rootfs`.

### The `rootfs`

To review, a [conventional root filesystem] for the Linux operating system (a Unix derivative) will look more or less alike across distributions.

To see what yours looks like, simply list the root (not the `root` user directory, which is located at `/root`):

```bash
$ ls /
bin boot dev etc home lib lib32 lib64 libx32 media mnt opt proc root run sbin srv sys tmp usr var
```

So, you may be thinking, why do I need a root filesystem?  Can't I just change into a new directory?

Well, no.  Changing directories does **not** make that new directory the root of the filesystem as seen from the view of a process (as would be done when `chroot`ing).  It also wouldn't isolate a new process by moving it into any number of new namespaces or controlling the resources used by it.

> Unlike namespaces, cgroups are not necessary for a container.  This is because cgroups control what you can **do**, whereas namespaces control what you can **see**.
>
> Containers, after all, are all about isolation.

So, what about `chroot`?  This changes the root directory used for filesystem path resolution, but it is not a security boundary and doesn't provide namespace isolation or cgroups resource controls.  If one just creates a new directory in which to `chroot` into, it would also mean that most likely none of the programs that you're used to working with would work (`ls`, `ps`, et al.).  In fact, you wouldn't even have a shell or have any groups or user.  Essentially, it would be unusable.

Why is that?  There is no `/proc` virtual filesystem, for one.  This is the location where running processes are listed, and it is an interface with the kernel.  You could fix this by mounting the host's `/proc` directory, but now you'd be heading down the road towards having a root filesystem.

Or, you could build your own `rootfs`.  But this would be extremely tedious and error-prone.  For every binary that you use, you'd have to copy its binary and its shared libraries, et al. to the new `chroot`.

As an example of that, here's what it takes to get `bash` to work in the `chroot`.  But, you wouldn't even be able to list the directory (because `ls` is no longer reachable from the host filesystem), and you've had to copy it and its shared libraries into the new location.

```bash
$ ldd /bin/bash
        linux-vdso.so.1 (0x00007ffdfaaa3000)
        libtinfo.so.6 => /lib/x86_64-linux-gnu/libtinfo.so.6 (0x00007f6be317f000)
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f6be2f8b000)
        /lib64/ld-linux-x86-64.so.2 (0x00007f6be3317000)
$ mkdir -p beans/{lib,lib64}
$ mkdir beans/lib/x86_64-linux-gnu
$ sudo cp -L /lib64/ld-linux-x86-64.so.2 beans/lib64
$ sudo cp -L /lib/x86_64-linux-gnu/{libc,libtinfo}.so.6 beans/lib
$ mkdir beans/bin
$ cp /bin/bash beans/bin
$ tree beans
beans/
├── bin/
│   └── bash*
├── lib/
│   ├── libc.so.6*
│   ├── libtinfo.so.6
│   └── x86_64-linux-gnu/
└── lib64/
    └── ld-linux-x86-64.so.2*

5 directories, 4 files
$ sudo chroot beans
$ ls
bash: ls: command not found
```

Hopefully, we can all agree that this is not worth our time.  This little exercise should illustrate why a full `rootfs` is preferable.

Moving on.

Let's take a gander at three different ways to obtain a root filesystem.

1. [`docker export`]

    The `docker export` command will export the container's root filesystem as a tarball.  It does not include any bind mounts.

    ```bash
    $ mkdir rootfs
    $ docker export tor-browser | tar -C rootfs -xvf -
    $ ls rootfs/
    bin  boot  dev  etc  home  lib  lib64  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
    ```

1. [`debootstrap`]

    The `debootstrap` tool is a very convenient way to easily download a Debian base distribution to a directory on the current filesystem.

    ```bash
    $ sudo debootstrap \
        --arch=amd64 \
        --variant=minbase \
        bullseye \
        rootfs \
        https://deb.debian.org/debian
    $ ls rootfs/
    bin  boot  dev  etc  home  lib  lib32  lib64  libx32  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
    ```

    > Here at `benjamintoll.com` we make heavy use of `debootstrap`, including as a core dependency in our wildly popular [`chroot` wrapper tool].

1. [`skopeo`] and [`umoci`]

	`skopeo` and `umoci` are often used together as they can complement each other.  Let's look at a modified example from `umoci`'s [quick start](https://umo.ci/quick-start/) guide, in which `skopeo` is used to fetch an image formatted in a Docker schema and convert it to an OCI image.  It is then installed as a directory on the local system.  `umoci` is then used to unpack the image and create an OCI bundle that `runc` can use (it will also write the generate mappings into the bundle's `config.json` used by `runc`):

    ```bash
    $ skopeo copy docker://golang:latest oci:golang:latest
    $ ls golang/
    blobs  index.json  oci-layout
    $ sudo umoci unpack --image golang:latest bundle
    $ ls bundle/
    config.json  rootfs  sha256_ceb17961ecae84361d3d650808c7ad7df06534c01470051be3868426f72a3e14.mtree  umoci.json
    $ ls bundle/rootfs/
    bin  boot  dev  etc  go  home  lib  lib64  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
    ```

    > Note that `podman` can also be used in place of `skopeo`, although its syntax is different.

    Here's another example.  This time, we'll pull a local image from the Docker daemon instead of remotely from Docker Hub.  Importantly, `runc` doesn't need elevated privileges when performing this type of operation because we'll be creating a [rootless container], which avoids any permission errors.

    ```bash
    $ skopeo copy docker-daemon:jessfraz/tor-browser:latest oci:tor-browser:latest
    ```

    For a rootless container, create `uid:gid` mappings using the `--rootless` flag:

    ```bash
    $ umoci unpack --rootless --image tor-browser:latest bundle
    $ ls bundle/
    config.json  rootfs  sha256_f5bfec267eedf2db77f79a022f6c1c2fc90ed1f92e35b380b4ef084d1b48a7ac.mtree  umoci.json
    $ ls bundle/rootfs/
    bin  boot  dev  etc  home  lib  lib64  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
    ```

    Let's confirm that the `--rootless` flag established a mapping between the non-privileged user on host and the root user of the container when it was created.  In the container:

    ```bash
    root@umoci-default:/go# sleep 34567 &
    [1] 8
    root@umoci-default:/go# ps u -C sleep
    USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
    root           8  0.0  0.0   2580  1692 pts/0    S    18:40   0:00 sleep 34567
    ```

    On the host:

    ```bash
    $ ps u -C sleep
    USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
    btoll       6956  0.0  0.0   2580  1692 pts/0    S    18:40   0:00 sleep 34567
    ```

    This is a rootless container because `root` in the container is not `root` on the host.

Now that we have an OCI filesystem bundle, let's do something with it by revisiting a topic briefly touched-upon earlier.

## Creating a container, redux

Calling `runc run` will first create the container and then run it.  We'll work with the `golang` directory that was created in `skopeo` example above.

### User Namespace

In the first example, we'll provide the `--rootless` flag to create a bundle that will enable `runc` to create a rootless container, one result being that it runs the process in its own `user` namespace.  Then, we'll create and run it, get the user id, and then `sleep`.  We'll then get more information about the process on the host.

Note that the `uid` and `gid` mappings have been defined in the `config.json` file in the bundle.

```bash
$ umoci unpack --rootless --image golang:latest bundle
$ runc --root "$XDG_RUNTIME_DIR/runc" run --bundle bundle container-id
root@umoci-default:/go#
root@umoci-default:/go# id
uid=0(root) gid=0(root) groups=0(root),65534(nogroup)
root@umoci-default:/go# ps
    PID TTY          TIME CMD
      1 pts/0    00:00:00 bash
      9 pts/0    00:00:00 ps
root@umoci-default:/go# sleep 1000 &
[1] 10
root@umoci-default:/go# ps
    PID TTY          TIME CMD
      1 pts/0    00:00:00 bash
     10 pts/0    00:00:00 sleep
     11 pts/0    00:00:00 ps
```

In addition to the non-privileged user on the host running as `root` in the container, we also see that the `bash` shell is PID 1, as we would expect for a container within its own isolated `pid` namespace, and the `sleep` process will have a lower number, as compared to the host.

Here is the view of the same process from the host.  We can see that the user namespace mappings were set up correctly, as the owning process is the non-privileged `btoll` account and not `root`.

```bash
$ runc --root "$XDG_RUNTIME_DIR/runc" list
ID                   PID         STATUS      BUNDLE                                         CREATED                          OWNER
container-id         659010      running     /home/btoll/projects/benjamintoll.com/bundle   2022-01-20T22:18:41.967268451Z   btoll
$ ps u -C sleep
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
btoll       6094  0.0  0.0   2332   512 pts/0    S    13:16   0:00 sleep 1000
$ id
uid=1000(btoll) gid=1000(btoll) groups=1000(btoll),24(cdrom),25(floppy),27(sudo),29(audio),30(dip),44(video),46(plugdev),100(users),101(netdev)
```

Also, note the PID number of the `sleep` process.  It's the same process but viewed through two different `pid` namespaces.  Observe:

```bash
root@umoci-default:/go# ls -l /proc/$(pgrep -nx sleep)/ns/pid
lrwxrwxrwx 1 root root 0 Sep  9 02:58 /proc/10/ns/pid -> 'pid:[4026532476]'
$ sudo ls -l /proc/$(pgrep -nx sleep)/ns/pid
lrwxrwxrwx 1 btoll btoll 0 Sep  9 02:58 /proc/6094/ns/pid -> 'pid:[4026532476]'
```

The first command was run in the `container-id` container, and the second was run on the host.  They have the same `pid` namespace object.  This tells us that the `pid` namespace has been set up properly.

To verify that the container is running within a separate `user` namespace, we'll check the `user` namespace of the current process running on the host and the `sleep` command in the container:

Importantly, the `user` namespaces are different:

```bash
root@umoci-default:/go# readlink /proc/$(pgrep -nx sleep)/ns/user
user:[4026532440]
$ sudo readlink /proc/self/ns/user
user:[4026531837]
```

After having proven the container is running in its own `pid` and `user` namespaces, we can take a peek into the `config.json` file in the bundle and see that those configurations have been written into it.  The snippet below only shows the configuration pertinent to this discussion:


```json
"linux": {
    "uidMappings": [
        {
            "containerID": 0,
            "hostID": 1000,
            "size": 1
        }
    ],
    "gidMappings": [
        {
            "containerID": 0,
            "hostID": 1000,
            "size": 1
        }
    ],
    "namespaces": [
        {
            "type": "pid"
        },
        {
            "type": "ipc"
        },
        {
            "type": "uts"
        },
        {
            "type": "mount"
        },
        {
            "type": "user"
        }
    ],
```

Look again at the results of running `id` in both the container and the host, and you can see that, indeed, the mappings in `config.json` defined how the kernel created the container.

Next, let's create and run another container, but this time without establishing the `user` namespace.  We'll run the same commands, but without the `--rootless` flag.

```bash
$ rm -rf bundle
$ sudo umoci unpack --image golang:latest bundle
$ sudo runc --root /run/runc run --bundle bundle container-id
root@umoci-default:/go# id
uid=0(root) gid=0(root) groups=0(root)
root@umoci-default:/go# sleep 1000 &
[1] 8
root@umoci-default:/go# ps
    PID TTY          TIME CMD
      1 pts/0    00:00:00 bash
      8 pts/0    00:00:00 sleep
      9 pts/0    00:00:00 ps
```

The first thing to notice is that `sudo` must be used now, because creating the container without the `--rootless` flag needs a privileged user.  This is an indication that the `user` namespace will be the same as that of the user creating the container on the host, `root`.

```bash
$ sudo runc --root /run/runc list
ID                   PID         STATUS      BUNDLE                                         CREATED                          OWNER
container-id         660070      running     /home/btoll/projects/benjamintoll.com/bundle   2022-01-20T22:20:25.219258558Z   root
$ ps u -C sleep
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root      607988  0.0  0.0   2332   576 pts/0    S    13:24   0:00 sleep 1000
```

We see that the `pid` namespaces are different, but what about the `user` namespace?

```bash
root@umoci-default:/go# ls -l /proc/$(pgrep -nx sleep)/ns/user
lrwxrwxrwx 1 root root 0 Sep  9 03:22 /proc/7/ns/user -> 'user:[4026531837]'
$ sudo ls -l /proc/$(pgrep -nx sleep)/ns/user
lrwxrwxrwx 1 root root 0 Sep  9 03:22 /proc/6240/ns/user -> 'user:[4026531837]'
```

Interestingly, and as we would expect, `root` in the container is also root on the host, because the `sleep` process is running in the same `user` namespace.

If we look the same snippet in `config.json`, we see that both the user and group mappings are gone as well as the `user` namespace:

```json
"linux": {
    "namespaces": [
        {
            "type": "pid"
        },
        {
            "type": "ipc"
        },
        {
            "type": "uts"
        },
        {
            "type": "mount"
        }
    ],
```

Of course, just like with higher-level container engines, you can `exec` into the running container (of course, it needs to be running):

```bash
$ sudo runc --root /root/runc exec container-id uname -a
Linux umoci-default 5.11.0-46-generic #51-Ubuntu SMP Thu Jan 6 22:14:29 UTC 2022 x86_64 GNU/Linux
```

### Mounts

I'll briefly touch on mounting into the container.

When I created the `config.json` spec, it created the following mount points:

```json
"mounts": [
    {
        "destination": "/proc",
        "type": "proc",
        "source": "proc"
    },
    {
        "destination": "/dev",
        "type": "tmpfs",
        "source": "tmpfs",
        "options": [
            "nosuid",
            "strictatime",
            "mode=755",
            "size=65536k"
        ]
    },
    {
        "destination": "/dev/pts",
        "type": "devpts",
        "source": "devpts",
        "options": [
            "nosuid",
            "noexec",
            "newinstance",
            "ptmxmode=0666",
            "mode=0620"
        ]
    },
    {
        "destination": "/dev/shm",
        "type": "tmpfs",
        "source": "shm",
        "options": [
            "nosuid",
            "noexec",
            "nodev",
            "mode=1777",
            "size=65536k"
        ]
    },
    {
        "destination": "/dev/mqueue",
        "type": "mqueue",
        "source": "mqueue",
        "options": [
            "nosuid",
            "noexec",
            "nodev"
        ]
    },
    {
        "destination": "/sys",
        "type": "none",
        "source": "/sys",
        "options": [
            "rbind",
            "nosuid",
            "noexec",
            "nodev",
            "ro"
        ]
    },
    {
        "destination": "/sys/fs/cgroup",
        "type": "cgroup",
        "source": "cgroup",
        "options": [
            "nosuid",
            "noexec",
            "nodev",
            "relatime",
            "ro"
        ]
    }
```

> This is a cgroup version 1 configuration, so it may not be portable.

That's great!  Now, what if I wanted to mount another?  For example, let's mount a safe `/run` (we don't want to mount the host's `/run` for security reasons).  First let's get more information on it by using our old friend `df`:

```bash
$ df -lh | ag run
tmpfs           1.6G  1.6M  1.6G   1% /run
tmpfs           5.0M  4.0K  5.0M   1% /run/lock
tmpfs           1.6G   64K  1.6G   1% /run/user/1000
```

This tells us that its type is [`tmpfs`].  Let's add the `mounts` list in `config.json`:

```json
"mounts": [
    {
        "destination": "/run",
        "type": "tmpfs",
        "source": "tmpfs",
        "options": [
            "nosuid",
            "nodev",
            "mode=755"
        ]
    }
```

> This creates a private `tmpfs` at `/run` in the container.  Crucially, it does not expose `/run` on the host and potentially sensitive runtime information and sockets.

Let's create the container and then confirm that it's been mounted:

```bash
$ runc --root "$XDG_RUNTIME_DIR/runc" run -b bundle/ container-id
root@umoci-default:/go# mount | grep run
tmpfs on /run type tmpfs (rw,nosuid,nodev,relatime,mode=755,uid=1000,gid=1000,inode64)
```

> Note that you don't need to regenerate the bundle after modifying `config.json`.

As the kids say:

```bash
Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
```

<!--
> If you don't define a `net` namespace in the bundle (config.json) then it will inherit that namespace from the host and boom! you have network access.
>
> - BUT you can't use iptables
> - you can't create veth pairs
-->

## Conclusion

This is only a brief introduction to `runc` and how it can create and run containers at a low level.  It's certainly less convenient to work with containers at this level than at higher levels that tools like `podman` and `Docker` provide, but it is important to understand that those tools will use either `runc` or another OCI runtime implementation "under the hood".

There are other container runtimes that implement the OCI runtime spec, but I have not looked into them as I have `runc`.  One that looks interesting is [`crun`], written in C.

## References

- [Rootless Containers with runC](https://www.youtube.com/watch?v=r6EcUyamu94)
- [runC: The little engine that could (run Docker containers)](https://www.youtube.com/watch?v=ZAhzoz2zJj8)

[`runc`]: https://github.com/opencontainers/runc
[`podman`]: https://podman.io/
[`docker`]: https://www.docker.com/
[Open Container Initiative]: https://opencontainers.org/
[`libcontainer`]: https://github.com/opencontainers/runc/blob/main/libcontainer/README.md
[`containerd`]: https://containerd.io/
[`CRI-O`]: https://cri-o.io/
[runtime spec]: https://github.com/opencontainers/runtime-spec
[filesystem bundle]: https://github.com/opencontainers/runtime-spec/blob/main/bundle.md
[OCI configuration file]: https://github.com/opencontainers/runtime-spec/blob/main/config.md
[root filesystem]: http://www.linfo.org/root_filesystem.html
[namespaces]: https://en.wikipedia.org/wiki/Linux_namespaces
[cgroups]: https://en.wikipedia.org/wiki/Cgroups
[capabilities]: https://wiki.archlinux.org/title/Capabilities
[rootless container]: https://rootlesscontaine.rs/
[`riddler`]: https://github.com/genuinetools/riddler
[`skopeo`]: https://github.com/containers/skopeo
[`umoci`]: https://umo.ci/
[Jess Frazelle]: https://github.com/jessfraz
[the `tor-browser` container]: https://github.com/jessfraz/dockerfiles/blob/master/tor-browser/stable/Dockerfile
[OCI image format]: https://github.com/opencontainers/image-spec/blob/main/spec.md
[conventional root filesystem]: https://en.wikipedia.org/wiki/Unix_filesystem#Conventional_directory_layout
[`docker export`]: https://docs.docker.com/engine/reference/commandline/export/
[`debootstrap`]: https://wiki.debian.org/Debootstrap
[`chroot` wrapper tool]: https://github.com/btoll/chroot
[`tmpfs`]: https://en.wikipedia.org/wiki/Tmpfs
[bind mount]: https://unix.stackexchange.com/questions/198590/what-is-a-bind-mount
[`crun`]: https://github.com/containers/crun
[Filesystem Hierarchy Standard]: https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard
[virtual machine]: /2026/08/10/on-virtualization-and-virtual-machines/
[systemd-nspawn]: /2022/02/04/on-running-systemd-nspawn-containers/

