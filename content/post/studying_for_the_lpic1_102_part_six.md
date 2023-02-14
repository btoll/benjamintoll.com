+++
title = "On Studying for the LPIC-1 Exam 102 (102-500), Part Six"
date = "2023-02-06T19:31:41-05:00"

+++

This is a riveting series:

- [On Studying for the LPIC-1 Exam 102 (101-500), Part One](/2023/01/22/on-studying-for-the-lpic-1-exam-102-102-500-part-one/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Two](/2023/01/25/on-studying-for-the-lpic-1-exam-102-102-500-part-two/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Three](/2023/01/26/on-studying-for-the-lpic-1-exam-102-102-500-part-three/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Four](/2023/02/01/on-studying-for-the-lpic-1-exam-102-102-500-part-four/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Five](/2023/02/03/on-studying-for-the-lpic-1-exam-102-102-500-part-five/)
- On Studying for the LPIC-1 Exam 102 (101-500), Part Six

And, so is this one!

- [On Studying for the LPIC-1 Exam 101 (101-500), Part One](/2023/01/13/on-studying-for-the-lpic-1-exam-101-101-500-part-one/)

---

When studying for the Linux Professional Institute [LPIC-1] certification, I took a bunch of notes when reading the docs and doing an online course.  Note that this is not exhaustive, so do not depend on this article to get you prepared for the exam.

The menu items below are not in any order.

This roughly covers [Topic 110: Security].

*Caveat emptor*.

---

- [Exam Details](#exam-details)
- [Topic 110: Security](#topic-109-networking-fundamentals)
    + [User Information](#user-information)
    + [Open Ports](#open-ports)
        - [`lsof`](#lsof)
        - [`fuser`](#fuser)
        - [`netstat`](#netstat)
        - [`nmap`](#nmap)
    + [User Limits](#user-limits)
    + [Logged-In Users](#logged-in-users)
        - [`last`](#last)
        - [`who`](#who)
        - [`w`](#w)
    + [`sudo`](#sudo)
    + [`nologin`](#nologin)
    + [`xinetd`](#xinetd)
    + [Unnecessary Services](#unnecessary-services)
    + [`TCP` Wrappers](#tcp-wrappers)
    + [`ssh`](#ssh)
        - [Port Forwarding](#port-forwarding)
            + [Local](#local)
            + [Remote](#remote)
            + [Dynamic](#dynamic)
    + [`GPG`](#gpg)
        - [Generating](#generating)
        - [Listing](#listing)
        - [Revoking](#revoking)
        - [Encrypting](#encrypting)
        - [Decrypting](#decrypting)
        - [Signing](#signing)
        - [`gpg-agent`](#gpg-agent)
- [Summary](#summary)
- [References](#references)

---

# Exam Details

[LPIC-1 Exam 102]

- Exam Objectives Version: 5.0
- Exam Code: 102-500

# Topic 110: Security

## User Information

Check for binaries with either `SUID` or `SGID` set:

```
$ find /usr/bin -perm /u=s,g=s
$ find /usr/bin -perm /6000
```

Get status of my account (`-S` or `--status`):

```
$ password -S
btoll P 01/02/2023 0 99999 7 -1
```

Here's another view of the same information using [`chage`]:

```
$ chage -l btoll
Last password change                                    : Jan 02, 2023
Password expires                                        : never
Password inactive                                       : never
Account expires                                         : never
Minimum number of days between password change          : 0
Maximum number of days between password change          : 99999
Number of days of warning before password expires       : 7
```

As its name implies, the `usermod` utility also allows you to modify user information like locking and password expiry information.

## Open Ports

### `lsof`

You can list open files using hte [`lsof`] tool.

Check for all Internet network files:

```
$ lsof -i
```

List open network files on a particular `IP` address:

```
$ lsof -i@127.0.0.1
```

Or, a port:

```
$ lsof -i:8000
```

Or, both:

```
$ lsof -i@162.247.242.61:443
```

Of course, you can separate multiple ports using commas (`,`) and ranges using hyphens (`-`).

### `fuser`

Next up, the [`fuser`] tool is used to identify processes using files or sockets.  You can think of its purpose is to find a "file's user".

Here are some examples using the `cwd`:

```
$ fuser .
/home/btoll:          5887c  5889c  5904c  5911c  5943c  5965c  5966c  5984c  5988c  6289c  6295c  6340c  6342c  6343c  6345c  6346c  6349c  6350c  6352c  6357c  6376c  6377c  6378c  6447c  6508c  6561c  6566c  6794c  6945c  8072c  8086c  8282c
$
$ fuser . -v
                     USER        PID ACCESS COMMAND
/home/btoll:         btoll      5887 ..c.. pipewire
                     btoll      5889 ..c.. bash
                     btoll      5904 ..c.. dbus-daemon
                     btoll      5911 ..c.. pipewire-media-
                     btoll      5943 ..c.. startx
                     btoll      5965 ..c.. xinit
                     btoll      5966 ..c.. Xorg
                     btoll      5984 ..c.. sh
                     btoll      5988 ..c.. tmux: server
                     btoll      6289 ..c.. bash
                     btoll      6295 ..c.. i3
                     btoll      6340 ..c.. sh
                     btoll      6342 ..c.. kitty
                     btoll      6343 ..c.. sh
                     btoll      6345 ..c.. firefox-esr
                     btoll      6346 ..c.. sh
                     btoll      6349 ..c.. thunderbird
                     ...
```

```
$ fuser -vn tcp 8000
                     USER        PID ACCESS COMMAND
8000/tcp:            btoll     19121 F.... python
```

You can also use `fuser` to kill a process with the `-k` or `--kill` switch.

### `netstat`

The [`netstat`] tool is part of the `net-tools` package, at least on Debian.

### `nmap`

## User Limits

```
$ ulimit
unlimited
```

## Logged-In Users

### `last`

### `who`

### `w`

## `sudo`

## `nologin`

[`/etc/nologin`]

In addition, there's also the [`nologin`] command.

```
$ sudo nologin
This account is currently not available.
```
## `xinetd`

Seriously, [`xinetd`]?  I don't think anyone has used this in the past 500 years.

## Unnecessary Services
```
$ service --status-all | head
 [ - ]  acpid
 [ - ]  alsa-utils
 [ - ]  anacron
 [ + ]  apparmor
 [ + ]  atd
 [ + ]  avahi-daemon
 [ + ]  bluetooth
 [ - ]  console-setup.sh
 [ + ]  cron
 [ - ]  cryptdisks
```

```
$ sudo systemctl disable atd.service --now
Synchronizing state of atd.service with SysV service script with /lib/systemd/systemd-sysv-install.
Executing: /lib/systemd/systemd-sysv-install disable atd
Removed /etc/systemd/system/multi-user.target.wants/atd.service.
```

```
$ systemctl status atd
● atd.service - Deferred execution scheduler
     Loaded: loaded (/lib/systemd/system/atd.service; disabled; vendor preset: enabled)
     Active: inactive (dead)
       Docs: man:atd(8)
```

```
$ sudo service --status-all | head
 [ - ]  acpid
 [ - ]  alsa-utils
 [ - ]  anacron
 [ + ]  apparmor
 [ - ]  atd
 [ + ]  avahi-daemon
 [ + ]  bluetooth
 [ - ]  console-setup.sh
 [ + ]  cron
 [ - ]  cryptdisks
```

```
# Debian
$ sudo update-rc.d SERVICE-NAME remove
```

```
# Red Hat
$ sudo chkconfig SERVICE-NAME off
```

The following two commands will also list listening network services.  The first uses the legacy (deprecated?) utility `netstat` from the `net-tools` package:

```
$ netstat -ltu | head
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 localhost:1042          0.0.0.0:*               LISTEN
tcp        0      0 localhost:1143          0.0.0.0:*               LISTEN
tcp        0      0 localhost:ipp           0.0.0.0:*               LISTEN
tcp        0      0 localhost:smtp          0.0.0.0:*               LISTEN
tcp        0      0 localhost:9050          0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:8000            0.0.0.0:*               LISTEN
tcp        0      0 localhost:1025          0.0.0.0:*               LISTEN
udp        0      0 0.0.0.0:631             0.0.0.0:*
```

The second uses [`ss`] and is equivalent in functionality.  Moving forward, this should be used instead of `netstat`:

```
$ ss -ltu | head
Netid State  Recv-Q Send-Q                      Local Address:Port          Peer Address:PortProcess
udp   UNCONN 0      0                                 0.0.0.0:631                0.0.0.0:*
udp   UNCONN 0      0                                 0.0.0.0:34025              0.0.0.0:*
udp   UNCONN 0      0                                 0.0.0.0:mdns               0.0.0.0:*
udp   UNCONN 0      0      [fe80::f167:8747:fb33:88bc]%wlp3s0:dhcpv6-client         [::]:*
udp   UNCONN 0      0                                    [::]:53611                 [::]:*
udp   UNCONN 0      0                                    [::]:mdns                  [::]:*
tcp   LISTEN 0      4096                            127.0.0.1:1042               0.0.0.0:*
tcp   LISTEN 0      4096                            127.0.0.1:1143               0.0.0.0:*
tcp   LISTEN 0      128                             127.0.0.1:ipp                0.0.0.0:*
```

## `TCP` Wrappers

[`TCP` Wrappers]

```
$ ldd $(which sshd) | grep libwrap
        libwrap.so.0 => /lib/x86_64-linux-gnu/libwrap.so.0 (0x00007fc7bb86e000)
```

## `ssh`

[`ssh` client]

### Port Forwarding

#### Local

#### Remote

#### Dynamic

## `GPG`

### Generating

### Listing

### Revoking

### Encrypting

### Decrypting

### Signing

### `gpg-agent`

# References

- [LPIC-1 Objectives V5.0](https://wiki.lpi.org/wiki/LPIC-1_Objectives_V5.0#Objectives:_Exam_102)
- [LPIC-1 Learning Materials](https://learning.lpi.org/en/learning-materials/102-500/)
- [Securing your network: An introduction to TCP wrappers](https://www.computerworld.com/article/2833484/securing-your-network-an-introduction-to-tcp-wrappers.html)
- [Linux manual pages: section 5](https://man7.org/linux/man-pages/dir_section_5.html)

[LPIC-1]: https://www.lpi.org/our-certifications/lpic-1-overview
[Topic 110: Security]: https://learning.lpi.org/en/learning-materials/102-500/110/
[LPIC-1 Exam 102]: https://www.lpi.org/our-certifications/exam-102-objectives

[`/etc/nologin`]: https://man7.org/linux/man-pages/man5/nologin.5.html
[`nologin`]: https://man7.org/linux/man-pages/man8/nologin.8.html
[`xinetd`]: https://en.wikipedia.org/wiki/Xinetd
[`ss`]: https://man7.org/linux/man-pages/man8/ss.8.html
[`TCP` Wrappers]: https://en.wikipedia.org/wiki/TCP_Wrappers
[`ssh` client]: https://man7.org/linux/man-pages/man1/ssh.1.html

