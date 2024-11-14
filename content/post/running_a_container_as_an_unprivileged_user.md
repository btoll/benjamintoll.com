+++
title = "On Running A Container As An Unprivileged User"
date = "2024-09-15T13:57:42-04:00"
draft = true

+++

- [Introduction](#introduction)
- [How It Works](#how-it-works)
- [Docker](#docker)
- [Podman](#podman)
- [References](#references)

---

## Introduction

Subordinate user ID (UID) and group ID (GUI).

Let's face it, no one likes Docker.  But the industry has embraced it, even though there are better alternatives like [`podman`], and now we all have to deal with it.

Everyone knows that Docker uses a [client-server model] rather than a [fork-exec].  Because of this, there have been billions and billions of exploits and trillions of devops "engineers" who continue to misuse (abuse?) and misunderstand this tool.

Today, we'll take a brief look at how we can easily make Docker more secure.

To use Docker, one must have elevated privileges or be part of the `docker` group.  This is pretty terrible.  Essentially, if one uses Docker to run a container, that person is invoking any commands as a user with elevated privileges (usually `root`) inside and out of the container.

Why would Docker make such an idiotic design decision?

It's very straightforward to use a feature that maps both users and groups on the host to the `root` user in the container.  The mapped users are a range that is between 0 and 65,536 (non-inclusive) which function within the namespace as normal user IDs, but on the host they have no privileges, oftentimes mapping to non-existing users.

Thus, if a container was compromised and a malicious party was able to break out of the container and onto the host, they would become a user with very limited permissions (or possibly even a non-existing user on the host, as many mappings begin with a very high-numbered user id).

> Of course, one could simply create an unprivileged user in the Dockerfile and run the container as that particular user.  However, there are many reasons why one would want to (or must) run a container whose processes must run as the `root` user, and that is the use case being addressed today.

Let's get into it, yo.

## How It Works

The mapping is handled by two files:

- [`/etc/subuid`]
- [`/etc/subgid`]

As you can imagine from their names, one handles the user ID range, and the other the group ID range.

Let's take a look at the files on my system:

```bash
$ cat /etc/sub{u,g}id
btoll:231072:65536
btoll:231072:65536
```

> The UID and GID ranges must be associated with an existing user.

Here is a brief description of each colon-delimited value in the files above:

- `uid`
    + Beginning of the range of UIDs or GIDs inside the user namespace.
- `loweruid`
    + Beginning of the range of UIDs or GIDs outside the user namespace.
- `count`
    + Length of the ranges (both inside and outside the user namespace.

Starting from scratch on a virtual machine created with [Vagrant], let's view the contents of both `/etc/subuid` and `/subgid`.  Here, we see that the default `vagrant` user has already been added to both files:

```bash
$ cat /etc/sub{u,g}id
vagrant:100000:65536
vagrant:100000:65536
```

Let's now add some more users and see what happens:

```bash
$ sudo useradd btoll
$ cat /etc/subuid
vagrant:100000:65536
btoll:165536:65536
$ sudo useradd alice
$ sudo useradd bob
$ cat /etc/subuid
vagrant:100000:65536
btoll:165536:65536
alice:231072:65536
bob:296608:65536
```

Each beginning UID for a subordinate range for each subsequent user is incremented by the range of the subordinate UID namespace (65536), at least for Debian.

From the [`useradd(8)`] man page:

```man
SUB_GID_MIN (number), SUB_GID_MAX (number), SUB_GID_COUNT (number)
   If /etc/subuid exists, the commands useradd and newusers (unless the user already have subordinate group IDs) allocate
   SUB_GID_COUNT unused group IDs from the range SUB_GID_MIN to SUB_GID_MAX for each new user.

   The default values for SUB_GID_MIN, SUB_GID_MAX, SUB_GID_COUNT are respectively 100000, 600100000 and 65536.

SUB_UID_MIN (number), SUB_UID_MAX (number), SUB_UID_COUNT (number)
   If /etc/subuid exists, the commands useradd and newusers (unless the user already have subordinate user IDs) allocate
   SUB_UID_COUNT unused user IDs from the range SUB_UID_MIN to SUB_UID_MAX for each new user.

   The default values for SUB_UID_MIN, SUB_UID_MAX, SUB_UID_COUNT are respectively 100000, 600100000 and 65536.
```

Just for fun, let's remove a range of UIDs for `bob`:

```bash
$ sudo usermod bob --del-subuids 297000-302000
$ cat /etc/subuid
vagrant:100000:65536
btoll:165536:65536
alice:231072:65536
bob:296608:392
bob:302001:60143
```

That was fun.  Let's re-add them:

```bash
$ sudo usermod bob --add-subuids 297000-302000
$ cat /etc/subuid
vagrant:100000:65536
btoll:165536:65536
alice:231072:65536
bob:296608:392
bob:302001:60143
bob:297000:5001
```

```bash
$ sysctl -n kernel.overflowuid
65534
```

```bash
$ ag --nonumbers $(sysctl -n kernel.overflowuid) /etc/passwd
sync:x:4:65534:sync:/bin:/bin/sync
_apt:x:42:65534::/nonexistent:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
sshd:x:102:65534::/run/sshd:/usr/sbin/nologin
dnsmasq:x:106:65534:dnsmasq,,,:/var/lib/misc:/usr/sbin/nologin
```

Or, to only find the user that matches the UID result of the `sysctl` command above, match on the third field (i.e., the username):

```bash
$ awk -F: '{print $1,$3}' /etc/passwd | ag $(sysctl -n kernel.overflowuid)
nobody 65534
```

Docker:

```bash
$ docker run --rm alpine cat /proc/self/{u,g}id_map
         0          0 4294967295
         0          0 4294967295
```

After changing Docker daemon config:

```bash
$ docker run --rm alpine cat /proc/self/{u,g}id_map
         0     165536      65536
         0     165536      65536
$ id
uid=1000(vagrant) gid=1000(vagrant) groups=1000(vagrant),998(docker)
$ ag --nonumber vagrant /etc/subuid
vagrant:100000:65536
```

We can easily verify what the UID maps to on the host by running the sleep command in the container (also, sending the container to the background) and then finding its UID on the host:

```bash
$ docker run --rm -d alpine sleep 1000
3828d409ec6f4e57b4fe0e780bd6bed100539912fb0718c3cdf71a795d39cdc2
$ ps -fC sleep
UID          PID    PPID  C STIME TTY          TIME CMD
165536     47390   47368  0 14:14 ?        00:00:00 sleep 1000
```

Notice that it downloaded the image again because it's a new user namespace and the image is saved within a different directory in `/var/lib/docker`.

```bash
$ sudo ls -al /var/lib/docker
total 56
drwx--x--- 13 root 165536 4096 Sep 19 14:10 .
drwxr-xr-x 34 root root   4096 Sep 19 10:44 ..
drwx--x--- 12 root 165536 4096 Sep 19 14:10 165536.165536
drwx--x--x  4 root root   4096 Sep 19 10:39 buildkit
drwx--x---  2 root root   4096 Sep 19 14:07 containers
-rw-------  1 root root     36 Sep 19 10:39 engine-id
drwx------  3 root root   4096 Sep 19 10:39 image
drwxr-x---  3 root root   4096 Sep 19 10:39 network
drwx--x---  5 root root   4096 Sep 19 14:07 overlay2
drwx------  4 root root   4096 Sep 19 10:39 plugins
drwx------  2 root root   4096 Sep 19 10:39 runtimes
drwx------  2 root root   4096 Sep 19 10:39 swarm
drwx------  2 root root   4096 Sep 19 14:07 tmp
drwx-----x  2 root root   4096 Sep 19 10:39 volumes
```

## Podman

```bash
$ podman run --rm alpine cat /proc/self/uid_map
         0       1000          1
         1     100000      65536
```

This means that root in the container maps to the UID 1000, which is the `vagrant` user running in the virtual machine from which this command was ran.  And, there is only one allocated subordinate UID.

However, UID 1 in the container is mapped to 100000 on the virtual machine host and is allocated 65,536 UIDs.  This is confirmed by viewing the entry in `/etc/subuid`:

```bash
$ grep vagrant /etc/subuid
vagrant:100000:65536
```

Run as root:

```bash
$ sudo podman run --rm alpine cat /proc/self/{u,g}id_map
         0          0 4294967295
         0          0 4294967295
```

Here we see the default Docker behavior.

TODO
Run a container with a bind mount and create files in it that will then be persisted to the host.

## Docker

[From the Docker documentation]:

<quote>For instance, this means that \[`btoll`\] is assigned a subordinate user ID range of 231072 and the next 65536 integers in sequence.   UID 231072 is mapped within the namespace (within the container, in this case) as UID 0 (root). UID 231073 is mapped as UID 1, and so forth. If a process attempts to escalate privilege outside of the namespace, the process is running as an unprivileged high-number UID on the host, which does not even map to a real user. This means the process has no privileges on the host system at all.</quote>

TODO: is this necessary?

```bash
sudo apt-get install uidmap
```

```bash
$ docker run --rm -d ubuntu sleep 12345
586fc6db6bd699bc33f62aa12e089685f5119aba2bf024047ba7b1281eed9d28
```

```bash
$ ps -fC sleep
UID          PID    PPID  C STIME TTY          TIME CMD
root        9967    9944  0 19:14 pts/0    00:00:00 sleep 12345
$ cat /proc/9967/{u,g}id_map
         0          0 4294967295
         0          0 4294967295
```

```bash
$ docker ps
CONTAINER ID   IMAGE     COMMAND         CREATED         STATUS         PORTS     NAMES
586fc6db6bd6   ubuntu    "sleep 12345"   3 minutes ago   Up 3 minutes             silly_perlman
$ docker kill silly_perlman
silly_perlman
```

Also, before setting up uid mapping, let's list the images in the root namespace:

```bash
$ docker images
REPOSITORY   TAG       IMAGE ID       CREATED         SIZE
ubuntu       latest    edbfe74c41f8   6 weeks ago     78.1MB
registry     2.8.3     75ef5b734af4   11 months ago   25.4MB
```

Let's enable `userns-remap` on the Docker daemon in `/etc/docker/daemon.json` (if the file isn't there, simply create it).

In our case, it doesn't yet exist so we can add it and the necessary config in one fell swoop:

```bash
$ cat <<EOF | sudo tee /etc/docker/daemon.json
{
        "userns-remap": "btoll:btoll"
}
EOF
```

It should now contain the following:

```json
{
        "userns-remap": "btoll:btoll"
}
```

> If the group is the same as the user, it's not necessary to list both.

Restart the Docker service for it to take effect :

```bash
$ sudo systemctl restart docker
```

> Creating a Docker service is out of scope of this fine article, but I've found it's done for me when I [install Docker engine on Debian].


> If one doesn't want to use an existing username, then the system can be configured to have Docker automatically create a `dockremap` user and subsequently user that for mappings into the user namespace in the container.
>
> To do this, replace the existing user name that was defined in `/etc/docker/daemon.json` with the name `default`.  In addition, add another non-overlapping mapping to both `/etc/subuid` and `/etc/subgid` with the name `default`.
>
> Then, restart the Docker service.  At this point, a new `dockremap` user should have been added to the system.  To verify, check both `/etc/passwd` and run the command `id dockremap`.

---

```bash
$ docker run --rm -d ubuntu sleep 10044
125e9c9f89ede8701989ff96d23e5fa1513b5615c9e067f47ad1d5dc0793a4dd
$ ps -fC sleep
UID          PID    PPID  C STIME TTY          TIME CMD
231072     12258   12237  0 19:58 ?        00:00:00 sleep 10044
$ cat /proc/12258/{u,g}id_map
         0     231072      65536
         0     231072      65536
```

```bash
$ docker images
REPOSITORY     TAG       IMAGE ID       CREATED        SIZE
ubuntu         latest    edbfe74c41f8   6 weeks ago    78.1MB
kindest/node   <none>    09c50567d34e   7 months ago   956MB
```

```bash
$ sudo ls -l /var/lib/docker/
total 56
drwx--x---  12 root 231072  4096 Sep 15 19:57 231072.231072
drwx--x--x   5 root root    4096 Aug 22 13:26 buildkit
drwx--x---   2 root root    4096 Sep 15 19:57 containers
-rw-------   1 root root      36 Aug 22 13:24 engine-id
drwx------   3 root root    4096 Aug 22 13:24 image
drwxr-x---   3 root root    4096 Aug 22 13:24 network
drwx--x--- 163 root root   12288 Sep 15 19:57 overlay2
drwx------   4 root root    4096 Aug 22 13:24 plugins
drwx------   2 root root    4096 Sep 15 19:51 runtimes
drwx------   2 root root    4096 Aug 22 13:24 swarm
drwx------   2 root root    4096 Sep 15 19:51 tmp
drwx-----x   3 root root    4096 Sep 15 19:51 volumes
```

```bash
$ sudo ls -l /var/lib/docker/231072.231072/containers
total 4
drwx--x--- 4 root 231072 4096 Sep 15 20:01 125e9c9f89ede8701989ff96d23e5fa1513b5615c9e067f47ad1d5dc0793a4dd
```

Lastly,:

```bash
$ docker run --rm -it ubuntu
root@d9cb2258d0da:/# id
uid=0(root) gid=0(root) groups=0(root)
root@d9cb2258d0da:/#
```

## References

- [Isolate containers with a user namespace]
- [newuidmap(1)](https://www.man7.org/linux/man-pages/man1/newuidmap.1.html)
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec)

[`podman`]: https://podman.io/
[client-server model]: https://en.wikipedia.org/wiki/Client%E2%80%93server_model
[fork-exec]: https://en.wikipedia.org/wiki/Fork%E2%80%93exec
[install Docker engine on Debian]: https://docs.docker.com/engine/install/debian/
[Isolate containers with a user namespace]: https://docs.docker.com/engine/security/userns-remap/
[From the Docker documentation]: https://docs.docker.com/engine/security/userns-remap/
[Vagrant]: https://www.vagrantup.com/
[`/etc/subuid`]: https://www.man7.org/linux/man-pages/man5/subuid.5.html
[`/etc/subgid`]: https://www.man7.org/linux/man-pages/man5/subgid.5.html
[`useradd(8)`]: https://www.man7.org/linux/man-pages/man8/useradd.8.html

