+++
title = "On runc"
date = "2022-01-18T04:43:29Z"

+++

This article intends to introduce [`runc`] as a tool that ultimately creates and runs containers at a lower-level than container engine tools like [`podman`] and [`docker`], which most developers are familiar with and use.

It's not meant to be a thorough dissection of its features and capabilities, and this article only uses a very small subset of what it can do.

---

- [What is runc?](#what-is-runc)
- [The filesystem bundle](#the-filesystem-bundle)
- [Installing runc](#installing-runc)
- [Creating a container](#creating-a-container)
- [Getting the bundle](#getting-the-bundle)
    - [The OCI config](#the-oci-config)
    - [The `rootfs`](#the-rootfs)
- [Creating a container, redux](#creating-a-container-redux)
- [Conclusion](#conclusion)
- [References](#references)

---

How about some sweet ASCII art to give everyone a mental model before we begin!

[Yes, yes, oh god yes!]

<pre class="math">
                    +----------------+
                    |                | -- Tools like <a href="https://kubernetes.io/">kubernetes</a> and <a href="https://podman.io/">podman</a>
                    |     docker     |    are also at this level.
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
</pre>

## What is runc?

[`runc`] is a command-line tool to create and run containers.  It is low-level, at least as viewed in the context of the software "stack" that developers use to create containers, and seen as one of the last pieces of software running in userspace that interacts with the kernel to create namespaces and cgroups that have are the kernel primitives used to create what we think of as a container.

`runc` is the reference implementation of the [Open Container Initiative] (OCI)  runtime specification, which defines what it means to "run" a container.  It is a wrapper around [`libcontainer`].

Since it is a cli and not a library, you can install it as a binary on your system and interact with it to create and spawn your containers.  Interestingly, it is also used by higher-level tools such as [`containerd`] and [`CRI-O`], and by tools such as `docker` and others.

To avoid having different runtimes at this level creating disparate APIs, the OCI stepped in and created a [runtime spec].  Now, as long as a runtime implements this specification, in theory one can be seemlessly swapped for another compliant runtime, and any software running on top of it will just carry on.

So, what does the OCI runtime spec define?

## The filesystem bundle

In order for a compliant reference implementation such as `runc` to be able to create and run containers, the spec defined a [filesystem bundle].  This bundle is composed of two things:

- an [OCI configuration file] (`config.json`)
- a [root filesystem] (`rootfs`)

The config is `json`-formatted and defines the entrypoint, environment variables, [namespaces], [cgroups], [capabilities], mounts, et. al. that make up the container.

For those who know `docker`, the command-line arguments passed to `docker run` are inserted into `config.json`, but not by `runc`.  Again, `runc` knows how to run a container by expecting a bundle to be present.  It doesn't care where the config file or `rootfs` came from, it just needs it to be there.

## Installing runc

There is more than one way to get `runc`.  For Debian-based distributions, here are three packages to get it:

- `runc`
- `containerd.io`
- `docker-ce`

```
$ sudo apt-get install runc
```

## Creating a container

As long as you have the bundle on your filesystem, it is easy as pie to create and start a container.  Here is an example from [the `runc` README]:

```
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

## Getting the bundle

What is the easiest way to get it?  What tools do I need?

> Recall that a bundle is two things, a config and a `rootfs`.

Let's start with getting the config.

### The OCI config

The easiest way to get the `config.json` file is to use the `runc` CLI, as seen above:

```
$ runc spec
$ runc spec --rootless
```

The latter will create a [rootless container], that is, a container that uses the `user` namespace to map a non-privileged user on the host to be root in the container.

This will create a generic config that can be used to create a container, although it probably isn't exactly what you need.  But, it's easy enough to generate and use to get a simple container up and running.

From there, you'd have to edit the config file with your least-favorite text editor to customize it to your own specifications, which is out of the scope of this article.

Is there a way to get the config file that was created for one of your (running) containers that you'd like to use outright or as a base for further customization?  Indeed!

Here are some ways that I've used to get access to a container's `config.json` file.

The first two can be used if Docker has already been installed on your system, while the latter can be used regardless of having Docker and does not need privileged user permissions.

> I'm only going to briefly touch on these tools to show how to generate the parts of the filesystem bundle needed by `runc` to create a container.  See the provided links for more information on each project.

1. Archaeology, or Digging Through Directories Created at Runtime by Docker

    This is my least favorite way of getting an OCI config spec because it is very brittle and could change at any time at the whim of Docker, Inc.

    When I start a container, I found config file generated by `containerd` in `/run`:

    ```
    $ sudo find /run -type f -name config.json 2> /dev/null
    /run/containerd/io.containerd.runtime.v2.task/moby/f36dac521a8faa08f18eb0918a5cb1822ffc13d9e6a48fe42b51ca686dce0ae6/config.json
    ```

    Of course, you can confirm that that is indeed the OCI config of the running container that you expect:

    ```
    $ docker ps
    CONTAINER ID   IMAGE                         COMMAND                  CREATED        STATUS        PORTS     NAMES
    f36dac521a8f   jessfraz/tor-browser:latest   "/bin/bash /usr/loca…"   3 months ago   Up 22 hours             tor-browser
    ```

    Unfortunately, you need to be in `sudoers` to even be able to search for this, which isn't great and could be a problem.

    Of course, you'd then need to copy that to the same directory in which you'll put the `rootfs`.

1. [`riddler`]

    Although no longer maintained, I've found this tool by [Jess Frazelle] to be the best way to get the config file for users that already have Docker installed.

    In order for this to work, you'll need to first create a container.  It doesn't matter if it's state is running or stopped, as long as `docker container ls` can list it then `riddler` will be able to extract the OCI config.

    The tool works by calling the Docker API via the Docker daemon.  Here is an example of how `riddler` accesses the config of a created container:

    ```
    $ curl -XGET --unix-socket /var/run/docker.sock localhost/containers/tor-browser/json
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

    ```
    $ runc spec
    $ runc spec --rootless
    ```

Let's move on to learn how to get the `rootfs`.

### The `rootfs`

To review, a [conventional root filesystem] for Linux operating system (a Unix derivative) will look more or less alike across distributions.

To see what yours looks like, simply list the root (not the `root` user directory, which is located at `/root`);

```
$ ls /
bin boot dev etc home lib lib32 lib64 libx32 media mnt opt proc root run sbin srv sys tmp usr var
```

So, you may be thinking, why do I need a root filesystem?  Can't I just change into a new directory?

Well, no.  In essence, the latter is a `chroot`, where just the root of the filesystem is being changed.  This wouldn't allow for any of the kernel features, in particular namespaces and cgroups, to be applied to the new location.

> Unlike namespaces, cgroups are not necessary for a container.  This is because cgroups control what you can **do**, whereas namespaces control what you can **see**.
>
> Containers, after all, are all about isolation.

What that means is that none of the programs that you're used to working with would work (`ls`, `ps`, et al.).  In fact, you wouldn't even have a shell or have any groups or user.  Essentially, it would be unusable.

There is no `/proc` virtual filesystem, for one.  This is the location where running processes are listed, and it is an interface with the kernel.  You could fix this by mounting the host's `/proc` directory, but now you'd be heading down the road towards having a root filesystem.

Let's take a gander at three different ways to access an image's root filesystem.

1. [`docker export`]

    The `docker export` command will export the container's root filesystem as a tarball.  It does not include any bind mounts.

    ```
    $ mkdir rootfs
    $ docker export tor-browser | tar -C rootfs -xvf -
    $ ls rootfs/
    bin  boot  dev  etc  home  lib  lib64  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
    ```

1. [`debootstrap`]

    The `debootstrap` tool is a very convenient way to easily download a Debian base distribution to a directory on the current filesystem.

    ```
    $ sudo debootstrap \
        --arch=amd64 \
        --variant=minbase \
        bullseye \
        rootfs \
        http://deb.debian.org/debian
    $ ls rootfs/
    bin  boot  dev  etc  home  lib  lib32  lib64  libx32  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
    ```

    > Here at `benjamintoll.com` we make heavy use of `debooststrap`, including as a core dependency in our wildly populare [`chroot` wrapper tool].

1. `skopeo` and `umoci`

    ```
    # https://umo.ci/quick-start/
    $ skopeo copy docker://golang:latest oci:golang:latest
    $ sudo umoci unpack --image golang:latest bundle
    $ ls bundle/
    config.json  rootfs  sha256_ceb17961ecae84361d3d650808c7ad7df06534c01470051be3868426f72a3e14.mtree  umoci.json
    $ ls bundle/rootfs/
    bin  boot  dev  etc  go  home  lib  lib64  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
    ```

    Here's another example.  This time, we'll pull a local image from the Docker daemon instead of remotely from Docker Hub.  Importantly, `runc` doesn't need elevated privileges when performing this type of operation because we'll be creating a [rootless container], so avoids any permission errors.

    ```
    $ skopeo copy docker-daemon:jessfraz/tor-browser:latest oci:tor-browser:latest
    ```

    Create `uid:gid` mappings using the `--rootless` flag:

    ```
    $ umoci unpack --rootless --image tor-browser:latest bundle
    $ ls bundle/
    config.json  rootfs  sha256_f5bfec267eedf2db77f79a022f6c1c2fc90ed1f92e35b380b4ef084d1b48a7ac.mtree  umoci.json
    $ ls bundle/rootfs/
    bin  boot  dev  etc  home  lib  lib64  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
    ```

    Let's confirm that the `--rootless` flag established a mapping between the non-privileged user on host and the root user of the container (when it's created, that is):

    ```
    $ ls bundle/rootfs/etc/sub?id
    bundle/rootfs/etc/subgid  bundle/rootfs/etc/subuid
    $ cat bundle/rootfs/etc/sub?id
    user:100000:65536
    user:100000:65536
    ```

    And for a sanity check, let's look at the same files on the host:

    ```
    $ cat /etc/sub?id
    btoll:1000:65536
    btoll:1000:65536
    ```

    Looks good!

Now that we have an OCI filesystem bundle, let's do something with it by revisiting a topic briefly touched-upon earlier.

## Creating a container, redux

Calling `runc run` will first create the container and then run it.  We'll work with the `golang` directory that we had previously downloaded using `skopeo`.

In the first example, we'll provide the `--rootless` flag that will enable `runc` to create a rootless container.  Then, we'll create and run it, get the user id, and then `sleep`.  We'll then get more information about the process on the host.

```
$ umoci unpack --rootless --image golang:latest bundle
$ runc run -b bundle ctr
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

In addition to running as root in the container, we also see that the `bash` shell is PID 1, as we would expect, and the `sleep` process will have a very lower number, as compared to the host.

```
$ runc list
ID          PID         STATUS      BUNDLE                                         CREATED                          OWNER
ctr         659010      running     /home/btoll/projects/benjamintoll.com/bundle   2022-01-20T22:18:41.967268451Z   btoll
$ ps u -C sleep
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
btoll     604619  0.0  0.0   2332   512 pts/0    S    13:16   0:00 sleep 1000
```

Here is the view of the same process from the host, and we can see that the user namespace mappings were set up correctly, as the owning process is the non-privileged `btoll` account.

Also, note the PID number of the `sleep` process.  This tells us that the `pid` namespace has been set up properly, as well.

<pre class="math">
...
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
        ...
</pre>

Next, let's create and run another container, but this time without establishing the `user` namespace.  We'll run the same commands.

```
$ rm -rf bundle
$ sudo umoci unpack --image golang:latest bundle
$ sudo !!
sudo runc run -b bundle ctr
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

```
$ sudo runc list
ID          PID         STATUS      BUNDLE                                         CREATED                          OWNER
ctr         660070      running     /home/btoll/projects/benjamintoll.com/bundle   2022-01-20T22:20:25.219258558Z   root
$ ps u -C sleep
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root      607988  0.0  0.0   2332   576 pts/0    S    13:24   0:00 sleep 1000
```

Interestingly, and as we would expect, `root` in the container is also root on the host.  This is, of course, no bueno.

<pre class="math">
...
    "linux": {
        "namespaces": [
            {
                "type": "pid"
            },
            {
                "type": "network"
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
        ...
</pre>

Of course, just like with higher-level container engines, you can `exec` into the running container:

```
$ sudo runc exec ctr uname -a
Linux umoci-default 5.11.0-46-generic #51-Ubuntu SMP Thu Jan 6 22:14:29 UTC 2022 x86_64 GNU/Linux
```

<!--
> If you don't define a `net` namespace in the bundle (config.json) then it will inherit that namespace from the host and boom! you have network access.
>
> - BUT you can't use iptables
> - you can't create veth pairs
-->

## Conclusion

This is only a brief introduction to `runc` and how it can create and run containers at a low level.  It's certainly not as convenient and easy to work with containers at this level than at higher levels that tools like `podman` and `Docker` provide, but it is important to understand that those tools will use either `runc` or another OCI runtime reference implementation "under the hood".

There are other container runtimes that implement the OCI runtime spec, but I have not looked into them as I have `runc`.  One that looks interesting is the [`crun`], written in C.

## References

- [Rootless Containers with runC](https://www.youtube.com/watch?v=r6EcUyamu94)
- [runC: The little engine that could (run Docker containers)](https://www.youtube.com/watch?v=ZAhzoz2zJj8)

[`runc`]: https://github.com/opencontainers/runc
[`podman`]: https://podman.io/
[`docker`]: https://www.docker.com/
[Yes, yes, oh god yes!]: https://www.youtube.com/watch?v=gFhQ49qsfIQ
[Open Container Initiative]: https://opencontainers.org/
[`libcontainer`]: https://github.com/opencontainers/runc/tree/master/libcontainer
[`containerd`]: https://containerd.io/
[`CRI-O`]: https://cri-o.io/
[runtime spec]: https://github.com/opencontainers/runtime-spec
[filesystem bundle]: https://github.com/opencontainers/runtime-spec/blob/main/bundle.md
[OCI configuration file]: https://github.com/opencontainers/runtime-spec/blob/main/config.md
[root filesystem]: http://www.linfo.org/root_filesystem.html
[namespaces]: https://en.wikipedia.org/wiki/Linux_namespaces
[cgroups]: https://en.wikipedia.org/wiki/Cgroups
[capabilities]: https://wiki.archlinux.org/title/Capabilities
[the `runc` README]: https://github.com/opencontainers/runc/blob/master/README.md
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
[`crun`]: https://github.com/containers/crun

