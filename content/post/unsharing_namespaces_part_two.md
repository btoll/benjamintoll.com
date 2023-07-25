+++
title = "On Unsharing Namespaces, Part Two"
date = "2022-12-14T00:06:29Z"

+++

"There is no such thing as a Docker container!"

-- Kilgore Trout to Gaias Julius Caesar, March 15, 44 B.C.E.

---

This is the second installment in a riveting series.  Be sure to have read [the first part], which covers the `uts`, `pid` and `mnt` namespaces!

---

- [Namespaces](#namespaces)
    + [Network](#network)
        - [Sharing](#sharing)
        - [Unsharing](#unsharing)
        - [Connectivity](#connectivity)
    + [User](#user)
        - [Rootless Containers](#rootless-containers)
        - [Capabilities](#capabilities)
        - [/etc/sub{u,g}id](#etcsubugid)
        - [nsswitch.conf](#nsswitchconf)
- [Summary](#summary)
- [References](#references)

> There are more [namespaces] than just the ones we're looking at in this series.

---

## Namespaces

### Network

Unsharing the `net` [network namespace] allows for the process to have its own IPv4 and IPv6 stacks, network links, firewall rules and IP routing tables (among others.

Let's look at the difference between sharing, or inheriting, the `net` namespace from the parent process and unsharing it.

#### Sharing

Obviously, in the absence of the `--net` option to `unshare`, the `bash` program running in the forked process will inherit the `--net` namespace from its parent, and we can see this by listing out the processes `ns` directory in `/proc`:

```bash
# On the host.
$ unshare bash

# In the container process.
$ ls -l /proc/$$/ns | ag net
lrwxrwxrwx 1 btoll btoll 0 Aug  9 17:52 net -> net:[4026532008]
```

Next, we demonstrate on the host that PID 1 (`systemd` on my Debian `bullseye` distro) indeed has the same `net` namespace, which the containing process inherited through its parent.

```bash
# On the host, where PID 1 is `systemd`.
$ sudo ls -l /proc/1/exe
lrwxrwxrwx 1 root root 0 Aug  2 15:21 /proc/1/exe -> /lib/systemd/systemd
$ sudo ls -l /proc/1/ns | ag net
lrwxrwxrwx 1 root root 0 Aug  7 20:19 net -> net:[4026532008]
```

Back in the container process, we can show that the new process can see all of the same namespaced network interfaces as the host and accesses the same routing table since it inherited the same `net` namespace:

```bash
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: enp2s0f1: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc fq_codel state DOWN group default qlen 1000
    link/ether 80:fa:5b:53:fb:82 brd ff:ff:ff:ff:ff:ff
3: wlp3s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether e4:70:b8:b4:22:a6 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.10/24 brd 192.168.1.255 scope global dynamic noprefixroute wlp3s0
       valid_lft 196879sec preferred_lft 196879sec
    inet6 fe80::2308:ab5:dc8:cdae/64 scope link noprefixroute
       valid_lft forever preferred_lft forever
$
$ ip route
default via 192.168.1.1 dev wlp3s0 proto dhcp metric 600
169.254.0.0/16 dev wlp3s0 scope link metric 1000
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 linkdown
192.168.1.0/24 dev wlp3s0 proto kernel scope link src 192.168.1.10 metric 600
```

#### Unsharing

Now, when creating its own `net` namespace, we can also see that the `net` namespaces are not the same:

```bash
# On the host.
$ sudo unshare --net bash

# In the container process.
# ls -l /proc/$$/ns | ag net
lrwxrwxrwx 1 root root 0 Aug  9 17:58 net -> net:[4026533295]
```

```bash
# Again, on the host, where PID 1 is `systemd`.
$ sudo ls -l /proc/1/exe
lrwxrwxrwx 1 root root 0 Aug  2 15:21 /proc/1/exe -> /lib/systemd/systemd
$ sudo ls -l /proc/1/ns | ag net
lrwxrwxrwx 1 root root 0 Aug  7 20:19 net -> net:[4026532008]
```

Back in the container process, we can show that the new process only has a [`loopback`] interface and has no routing table information:

```bash
# ip a
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
# ip route
Error: ipv4: FIB table does not exist.
Dump terminated
```

> Note that not giving a command to `unshare` will result in it opening a shell by default (determined by the value of the `SHELL` environment variable).
>
> We could have omitted the `bash` program name from all of the above examples.

Weeeeeeeeeeeeeeeeeeeeeeeeeeee

#### Connectivity

Let's now establish network connectivity between the host and the container process by creating two virtual Ethernet ([`veth`]) interfaces.

Conceptually, we can think of this as a cable that connects the default `net` network namespace with the new `net` network namespace of the container.

Let's list some characteristics of `veth` devices (from the manpage):

- they can act as tunnels between network namespaces to create a bridge to a physical network device in another namespace, but can also be used as standalone network devices
- always created in interconnected pairs
    ```bash
    $ sudo ip link add <p1-name> type veth peer name <p2-name>
    ```
    + `p1-name` and `p2-name` are the names assigned to the two connected end points
- packets transmitted on one device in the pair are immediately received on the other device
- when either devices is down the link state of the pair is down

> Anyone with an interest in container networking should pay particular attention to these little fellas.
>
> `veth` devices have a particularly interesting use case: placing one end of a `veth` pair in one network namespace and the other end in another network namespace allows for communicating between network namespaces.
>
> For example (using the `netns` parameter):
>
> ```bash
> $ sudo ip link add <p1-name> netns <p1-ns> type veth peer <p2-name> netns <p2-ns>
> ```

We'll start by creating the new process with its own unshared `net` network namespace:

```bash
$ sudo unshare --net bash
```

Right away, we can see that the new process has its own `net` namespace that is distinct from the host:

```bash
# lsns --type net -o NS,PID,COMMAND | ag "systemd|bash"
4026532008       1 /lib/systemd/systemd --system --deserialize 18
4026532801 2561438 bash
```

> If there were no accessible namespaces, the result would be empty.

As we can see from the column options passed to the output parameter (`-o`), the first column is the `net` namespace, the second the process ID and the third the command that created the process.

You could also list all of the namespaces of a process by passing the `-p|` option the `PID`:

```bash
# lsns -p $$
        NS TYPE   NPROCS      PID USER COMMAND
4026531834 time       99        1 root /sbin/init
4026531835 cgroup     99        1 root /sbin/init
4026531836 pid        99        1 root /sbin/init
4026531837 user       99        1 root /sbin/init
4026531838 uts        97        1 root /sbin/init
4026531839 ipc        99        1 root /sbin/init
4026531840 mnt        94        1 root /sbin/init
4026532160 net         2  2561438 root bash
```

We'll need that PID of the new process in order to create its virtual network interface.  Note that we can also get it inside the container by echoing out the current process ID using a [special Bash parameter]:

```bash
# echo $$
2561438
```

> The previous command (`lsns`) were run in the container, but it could have also been run on the host.  Also, note that the command is limiting the output to only the namespace (`NS`), process ID (`PID`) and command (`COMMAND`).

Note that there are no entries in the routing table yet in the container, and the only device is `loopback`:

```bash
# ip route
Error: ipv4: FIB table does not exist.
Dump terminated
#
# ip link
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

Ok, that's great.  Let's now connect the new `net` namespace to the default `net` namespace with that `PID`.  Run the following command on the host.

You can still be in the container in another terminal, so don't exit the container, which removes the namespace, unless you created a persistent namespace, which is beyond the scope of this tutorial (we haven't created one here, by the way).

```bash
$ sudo ip link add ve1 netns 2561438 type veth peer name ve2 netns 1
```

Let's break that down like a hip beat:

- We're adding a new virtual Ethernet interface called `ve1` and binding it to the process with ID 2561438.
    + Note that we called have called this anything, it doesn't have to be `ve1`.  It could have been called `poop1`.
- The type `veth` is a virtual Ethernet interface.
- The `peer` keyword means that we're joining the two new interfaces together.
- We're adding a new virtual Ethernet interface called `ve2` and binding it to the process with ID 1.
    + Note that we called have called this anything, it doesn't have to be `ve2`.  It could have been called `poop2`.

In the container, we can now see that the new virtual Ethernet device has indeed been added:

```bash
# ip link
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: ve1@if3: <BROADCAST,MULTICAST> mtu 1500 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/ether 26:c2:b6:f3:aa:3d brd ff:ff:ff:ff:ff:ff link-netnsid 0
```

And we'll bring it up:

```bash
# ip link set ve1 up
# ip l
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: ve1@if3: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state LOWERLAYERDOWN mode DEFAULT group default qlen 1000
    link/ether 26:c2:b6:f3:aa:3d brd ff:ff:ff:ff:ff:ff link-netnsid 0
```

We'll do the same on the host:

```bash
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
...
3745: ve2@if2: <BROADCAST,MULTICAST> mtu 1500 qdisc noqueue state DOWN group default qlen 1000
    link/ether 9e:ea:69:72:e3:1e brd ff:ff:ff:ff:ff:ff link-netnsid 3
$
$ sudo ip link set ve2 up
$ ip a
...
3745: ve2@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 9e:ea:69:72:e3:1e brd ff:ff:ff:ff:ff:ff link-netnsid 3
    inet6 fe80::9cea:69ff:fe72:e31e/64 scope link
       valid_lft forever preferred_lft forever
```

> Bringing an interface `UP` means to enable it.  What does `LOWER_UP` mean, then?
>
> It is a physical layer link flag.  `LOWER_UP` indicates that an `Ethernet` cable was plugged in and that the device is connected to the network, that is, it can send and receive encoded and decoded information from its physical medium source, be it electricity, light or radio waves.

Of course, in order to be able to send traffic to the devices, both need to be assigned an IP address on the same network.

First, in the container:

```bash
# ip addr add 192.168.1.100/24 dev ve1
# ip a
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: ve1@if3745: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 1e:93:3b:e3:8f:32 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 192.168.1.100/24 scope global ve1
       valid_lft forever preferred_lft forever
    inet6 fe80::1c93:3bff:fee3:8f32/64 scope link
       valid_lft forever preferred_lft forever
```

As soon as the IP is associated, a route has been added to the container's routing table:

```bash
# ip route
192.168.1.0/24 dev ve1 proto kernel scope link src 192.168.1.100
```

And on the host:

```bash
$ sudo ip addr add 192.168.1.200/24 dev ve2
$ ip a
...
3745: ve2@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 9e:ea:69:72:e3:1e brd ff:ff:ff:ff:ff:ff link-netnsid 3
    inet 192.168.1.200/24 scope global ve2
       valid_lft forever preferred_lft forever
    inet6 fe80::9cea:69ff:fe72:e31e/64 scope link
       valid_lft forever preferred_lft forever
```

Likewise, when the IP address was associated with the host's virtual Ethernet device, a new route was added to its routing table:

```bash
$ ip route
default via 192.168.1.1 dev wlp3s0 proto dhcp metric 20600
...
192.168.1.0/24 dev ve2 proto kernel scope link src 192.168.1.200
192.168.1.0/24 dev wlp3s0 proto kernel scope link src 192.168.1.10 metric 600
```

Let's test it!

In the container:

```bash
# ping -c4 192.168.1.200
PING 192.168.1.200 (192.168.1.200) 56(84) bytes of data.
64 bytes from 192.168.1.200: icmp_seq=1 ttl=64 time=0.097 ms
64 bytes from 192.168.1.200: icmp_seq=2 ttl=64 time=0.095 ms
64 bytes from 192.168.1.200: icmp_seq=3 ttl=64 time=0.096 ms
64 bytes from 192.168.1.200: icmp_seq=4 ttl=64 time=0.094 ms

--- 192.168.1.200 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3067ms
rtt min/avg/max/mdev = 0.094/0.095/0.097/0.001 ms
```

On the host:

```bash
$ ping -c4 192.168.1.100
PING 192.168.1.100 (192.168.1.100) 56(84) bytes of data.
64 bytes from 192.168.1.100: icmp_seq=1 ttl=64 time=0.081 ms
64 bytes from 192.168.1.100: icmp_seq=2 ttl=64 time=0.074 ms
64 bytes from 192.168.1.100: icmp_seq=3 ttl=64 time=0.067 ms
64 bytes from 192.168.1.100: icmp_seq=4 ttl=64 time=0.068 ms

--- 192.168.1.100 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3060ms
rtt min/avg/max/mdev = 0.067/0.072/0.081/0.005 ms
```

Weeeeeeeeeeeeeeeeeeeeeeee

> At this point, the container can only send traffic to addresses in the 192.168.1.0/24 range.

Note that the `veth` device and the route in the routing table will both be removed automatically from the host when the container is exited.

If the two processes can't communicate, i.e., the `ping`s don't work, make sure that the new network you configured for the container processes don't conflict with any others.

---

### User

The [`user` namespace] is the only one that can be created by a non-privileged user.  This allows for running [rootless containers], which greatly mitigates one of the best-known security implications of containers: running containers as root.  Not needing to run containers as a privileged user is a good security practice, but unfortunately not all popular container runtimes allow for this.

Does this mean that a container shouldn't ever have a `root` user?  No, of course not.  Containers need to have a privileged user to do whatever nefarious things containers do.

The critical difference is that you don't want a `root` user in a container **also** mapping to/running as the `root` user on the host.  This is very bad, because if the `root` user breaks out of the container and the `user` namespace, then they are also `root` on the host.

This would mean, to put it mildly, that you would be fucked.  Remember that the host can see everything that runs on it, including containers?  The attacker could then do whatever they wanted, and most likely, do it gleefully.

Sadly, most people who run containers use Docker, and Docker was not built with security in mind.  It was an afterthought.  Maybe a Docker Captain can tell you about it someday.

So, what does one do?  Curse the decision to promote Docker?  Well, yes.  But, also, *critically*, use the `user` namespace to map the `root` user in the container to a non-privileged account on the host.  That way, if an attacker breaks out of the container, the worst they can do is delete the poems in your home directory.

In addition, the effective user on the host can have greater capabilities inside the container running as `root`.

Let's see how that mapping is done.

#### Rootless Containers

Let's create a process that inherits all of its parent's namespaces and check out the user information:

```bash
$ unshare bash
$ id
uid=1000(btoll) gid=1000(btoll) groups=1000(btoll)
```

Ok, it's running in the same `user` namespace as the PPID (parent process ID) and has inherited the effective user that created the child process.

How about when creating the child process as a privileged user?

```bash
$ sudo unshare bash
# id
uid=0(root) gid=0(root) groups=0(root)
```

That's interesting and to be expected.  Let's now create that a process with an unshared `user` namespace.

```bash
$ unshare --user bash
$ id
uid=65534(nobody) gid=65534(nogroup) groups=65534(nogroup)
```

Ok, the `nobody` user.  Let's confirm that the process has a `user` namespace distinct from the default.

In the container:

```bash
$ echo $$
2713100
```

On the host:

```bash
$ lsns -t user | ag "systemd|bash"
4026531837 user      57    1881 btoll /lib/systemd/systemd --user
4026533574 user       1 2768612 btoll bash
```

> Why can't we run the `lsns` as an unprivileged user in the container as before?
>
> Great question, Eagle Eye.  Since we're now using an unshared `user` namespace, the user in the container is `nobody`, **not** `btoll`, the effective user that created the process.
>
> So, the `nobody` user can only see its own `user` namespace, and the `btoll` user doesn't exist in that namespace.

Ok, let's now do the mapping.

The `/proc/PID/uid_map` and `/proc/PID/gid_map` are the kernel interfaces for the user and group IDs, respectively, for each process.

On the host:

```bash
$ sudo echo "0 1000 1" >> /proc/2713100/uid_map
```

Let's break that down (`0 1000 1`):

1. (0) The first number is the start of the range of the user IDs that will be used **in the container**.
1. (1000) The second number is the start of the range of the user IDs that will be mapped to **on the host**.
1. (1) The last number states the number of user IDs (the length of the range) that will be mapped in the container.  Only one user ID that is given, since we only expect one user for this container.  That's a good thing.

This example is doing the following, in plain English: "Map the effective user ID on the host with user ID 1000 to the user ID of 1 in the container, and only allocate one user ID."

The end result is that my `btoll` (1000) user on the host is now seen as `root` in the new `user` namespace in the container.

[Kool moe dee].

> These special `/proc` files can only be written to once.

After running the mapping command above, we see that the mapping has taken effect in the container:

```bash
$ id
uid=0(root) gid=65534(nogroup) groups=65534(nogroup)
```

> The user may still say `nobody` in the prompt, but this is expected since the shell init scripts like `.bash_profile` haven't been run again.  Rest assured, though, the user is the privileged `root` user in the container.

After having gone through all of those contortions to write to the `/proc/PID/uid_map` after the container has been created to set up the `root` user mapping, let's now look at a very simple way to do it as a switch to the `unshare` command:

```bash
$ unshare --map-root-user bash
# id
uid=0(root) gid=0(root) groups=0(root),65534(nogroup)
# cat /proc/$$/uid_map
         0       1000          1
```

Of course, the `--map-root-user` switch implies the creation of a new `user` namespace:

In the container:

```bash
# lsns -t user
        NS TYPE  NPROCS     PID USER COMMAND
4026533651 user       2 2935027 root bash
```

On the host:

```bash
$ sudo ls -l /proc/1/ns | ag user
lrwxrwxrwx 1 root root 0 Dec 17 16:42 user -> user:[4026531837]
```

Weeeeeeeeeeeeeeeeeeeee

Lastly, let's prove to ourselves that this is indeed a rootless container.  In other words, let's show that, although the container is running as a `root` user, it actually maps to a non-privileged user on the host:

In the container:

```bash
$ unshare --map-root-user bash
# sleep 12345 &
[1] 2945562
# id
uid=0(root) gid=0(root) groups=0(root),65534(nogroup)
# whoami
root
# touch fooby
# ls -li fooby
6038245 -rw-rw-r-- 1 root root 0 Dec 17 17:20 fooby
```

On the host:

```bash
$ ps -ft5
UID          PID    PPID  C STIME TTY          TIME CMD
btoll    2690597    2294  0 Dec16 pts/5    00:00:00 -bash
btoll    2944466 2690597  0 17:14 pts/5    00:00:00 bash
btoll    2945562 2944466  0 17:16 pts/5    00:00:00 sleep 12345
$ ls -li /home/btoll/fooby
6038245 -rw-rw-r-- 1 btoll btoll 0 Dec 17 17:20 /home/btoll/fooby
```

Told you so.

#### Capabilities

Note that the [capabilities] may be augmented depending on the mapping.  Below we see an example of a process not being able to create a `mnt` namespace because the effective user does not have the correct permissions:

```bash
$ unshare --mount sh
unshare: unshare failed: Operation not permitted
$ id
uid=65534(nobody) gid=65534(nogroup) groups=65534(nogroup)
```

However, if we give the user in that container escalated privileges by running the now-familiar mapping command on the host, we can effect that by mapping the non-privileged user on the host to the `root` user in the container.  This will allow us to do what we want.  Remember, if the `root` user does find a way to break out of the `user` namespace, the damage will be limited to only what the `btoll` user is permitted to do on the host.

Again, this will look like the following, if the new container process has the PID 2713100:

```bash
$ sudo echo "0 1000 1" >> /proc/2713100/uid_map
```

Back in the container, we see that the user is now `root` and now has the capabilites needed to unshare any other namespace:

```bash
$ id
uid=0(root) gid=65534(nogroup) groups=65534(nogroup)
$ unshare --mount sh
\u@\h:\w$
```

Let's wrap up this section by looking at the capabilities for a rootless container:

On the host:

```bash
$ capsh --print | ag "Current|uid"
Current: =
Bounding set =cap_chown,cap_dac_override,cap_dac_read_search,cap_fowner,cap_fsetid,cap_kill,cap_setgid,cap_setuid,cap_setpcap,cap_linux_immutable,cap_net_bind_service,cap_net_broadcast,cap_net_admin,cap_net_raw,cap_ipc_lock,cap_ipc_owner,cap_sys_module,cap_sys_rawio,cap_sys_chroot,cap_sys_ptrace,cap_sys_pacct,cap_sys_admin,cap_sys_boot,cap_sys_nice,cap_sys_resource,cap_sys_time,cap_sys_tty_config,cap_mknod,cap_lease,cap_audit_write,cap_audit_control,cap_setfcap,cap_mac_override,cap_mac_admin,cap_syslog,cap_wake_alarm,cap_block_suspend,cap_audit_read
 secure-no-suid-fixup: no (unlocked)
uid=1000(btoll) euid=1000(btoll)
```

In the container:

```bash
# capsh --print | ag "Current|uid"
Current: =ep
Bounding set =cap_chown,cap_dac_override,cap_dac_read_search,cap_fowner,cap_fsetid,cap_kill,cap_setgid,cap_setuid,cap_setpcap,cap_linux_immutable,cap_net_bind_service,cap_net_broadcast,cap_net_admin,cap_net_raw,cap_ipc_lock,cap_ipc_owner,cap_sys_module,cap_sys_rawio,cap_sys_chroot,cap_sys_ptrace,cap_sys_pacct,cap_sys_admin,cap_sys_boot,cap_sys_nice,cap_sys_resource,cap_sys_time,cap_sys_tty_config,cap_mknod,cap_lease,cap_audit_write,cap_audit_control,cap_setfcap,cap_mac_override,cap_mac_admin,cap_syslog,cap_wake_alarm,cap_block_suspend,cap_audit_read
 secure-no-suid-fixup: no (unlocked)
uid=0(root) euid=0(root)
#
# cat /proc/$$/uid_map
         0       1000          1
```

Note that the privileges have been escalated in the container, and the last `cat` command shows indeed that the mapping of `root` in the container is to `btoll(1000)` on the host.

Weeeeeeeeeeeeeeeeeeeeeeeeeee

#### /etc/sub{u,g}id

You may be thinking to yourself, "hey, the format of the `/proc/PID/uid_map` looks suspiciously like the files `/etc/subuid` and `/etc/subgid` that I've configured to map users when using Docker", or something to that effect.

And you'd be right.  Unfortunately, I haven't been able to ascertain the provenance of those files.

Are they an implementation detail of an [OCI spec]?  Does they predate the burgeoning popularity and ubiquity of containers?  After all, the files are listed in the [`useradd` man page] in the `FILES` section, and the [`getuid`] and [`getgid`] system calls, et al., also use them.

Does [the Shadow] know?

I think it's safe to say that regardless of its origin, these files allow for an easier way to map users within a `user` namespace than what we've seen in the examples above.

#### nsswitch.conf

Interestingly, I stumbled across the [subuid(5) man page] when trying to find the provenance of the `/etc/sub{u,g}id` files, and it states the following:

> The delegation of the subordinate uids can be configured via the subid field in /etc/nsswitch.conf file. Only one value can be set as the delegation source. Setting this field to files configures the delegation of uids to /etc/subuid.

I have not tested this, but this would be a great area to explore.

## Summary

Um.

## References

- [On Unsharing Namespaces, Part One]
- [Container Security by Liz Rice](https://containersecurity.tech/)
- [Containers From Scratch - Liz Rice - GOTO 2018](https://www.youtube.com/watch?v=8fi7uSYlOdc)
- [Trivy](https://github.com/aquasecurity/trivy)
- [Index of /alpine/](http://dl-cdn.alpinelinux.org/alpine/)
- [Linux Bridges, IP Tables & CNI Plug-Ins: A Container Networking Deep Dive](https://www.youtube.com/watch?v=z-ITjDQT7DU)

[the first part]: /2022/08/08/on-unsharing-namespaces-part-one/
[namespaces]: https://www.man7.org/linux/man-pages/man7/namespaces.7.html
[network namespace]: https://www.man7.org/linux/man-pages/man7/network_namespaces.7.html
[On Unsharing Namespaces, Part One]: /2022/08/08/on-unsharing-namespaces-part-one/
[`loopback`]: /2019/09/23/on-loopback/
[`lsns`]: https://www.man7.org/linux/man-pages/man8/lsns.8.html
[special Bash parameter]: https://www.gnu.org/software/bash/manual/html_node/Special-Parameters.html
[`user` namespace]: https://www.man7.org/linux/man-pages/man7/user_namespaces.7.html
[rootless containers]: https://blog.aquasec.com/rootless-containers-boosting-container-security
[Kool moe dee]: ttps://en.wikipedia.org/wiki/Kool_Moe_Dee
[capabilities]: https://man7.org/linux/man-pages/man7/capabilities.7.html
[OCI spec]: https://opencontainers.org/
[`useradd` man page]: https://www.man7.org/linux/man-pages/man8/useradd.8.html#FILES
[`getuid`]: https://www.man7.org/linux/man-pages/man2/getuid.2.html
[`getgid`]: https://www.man7.org/linux/man-pages/man2/getgid.2.html
[system calls]: /2022/08/18/on-system-calls/
[the Shadow]: https://en.wikipedia.org/wiki/The_Shadow
[subuid(5) man page]: https://www.man7.org/linux/man-pages/man5/subuid.5.html
[`veth`]: https://man7.org/linux/man-pages/man4/veth.4.html

