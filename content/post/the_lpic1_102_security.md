+++
title = "On the LPIC-1 Exam 102: Security"
date = "2023-02-06T19:31:41-05:00"

+++

This is a riveting series:

- [On the LPIC-1 Exam 102: Shells and Shell Scripting](/2023/01/22/on-the-lpic-1-exam-102-shells-and-shell-scripting/)
- [On the LPIC-1 Exam 102: User Interfaces and Desktops](/2023/01/25/on-the-lpic-1-exam-102-user-interfaces-and-desktops/)
- [On the LPIC-1 Exam 102: Administrative Tasks](/2023/01/26/on-the-lpic-1-exam-102-administrative-tasks/)
- [On the LPIC-1 Exam 102: Essential System Services](/2023/02/01/on-the-lpic-1-exam-102-essential-system-services/)
- [On the LPIC-1 Exam 102: Networking Fundamentals](/2023/02/03/on-the-lpic-1-exam-102-networking-fundamentals/)
- On the LPIC-1 Exam 102: Security

And, so is this one!

- [On the LPIC-1 Exam 101 (101-500), Part One](/2023/01/13/on-the-lpic-1-exam-101-system-architecture/)

---

When studying for the Linux Professional Institute [LPIC-1] certification, I took a bunch of notes when reading the docs and doing an online course.  Note that this is not exhaustive, so do not depend on this article to get you prepared for the exam.

The menu items below are not in any order.

This roughly covers [Topic 110: Security].

*Caveat emptor*.

---

- [Exam Details](#exam-details)
- [Topic 110: Security](#topic-109-networking-fundamentals)
    + [Special File Permissions](#special-file-permissions)
        - [`SUID`](#suid)
        - [`SGID`](#sgid)
    + [Finding File Permissions](#finding-file-permissions)
    + [Password Management and Aging](#password-management-and-aging)
        - [`passwd`](#passwd)
        - [`chage`](#chage)
        - [`usermod`](#usermod)
    + [Discovering Open Ports](#discovering-open-ports)
        - [`lsof`](#lsof)
        - [`fuser`](#fuser)
        - [`netstat`](#netstat)
        - [`nmap`](#nmap)
        - [`systemd` sockets](#systemd-sockets)
    + [User Limits](#user-limits)
    + [Logged-In Users](#logged-in-users)
        - [`last`](#last)
        - [`lastb`](#lastb)
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
    + [`gpg`](#gpg)
        - [Generating](#generating)
        - [Exporting](#exporting)
        - [Importing](#importing)
        - [Listing](#listing)
        - [Revoking](#revoking)
        - [Encrypting](#encrypting)
            + [Symmetric](#symmetric)
            + [Asymmetric](#asymmetric)
        - [Decrypting](#decrypting)
        - [Signing](#signing)
            + [Sign and Encrypt](#sign-and-encrypt)
        - [Deleting](#deleting)
        - [Uploading and Retrieving From a Keyserver](#uploading-and-retrieving-from-a-keyserver)
        - [`gpg-agent`](#gpg-agent)
- [Summary](#summary)
- [References](#references)

---

# Exam Details

[LPIC-1 Exam 102]

- Exam Objectives Version: 5.0
- Exam Code: 102-500

# Topic 110: Security

## Special File Permissions

Of course, I covered the special file permissions `SUID` and `SGID` waaaaaaaaaaaaay back in the [`LPIC-1` 101] docs, but I'll cover it again here, because it's all about repetition, not perfection.

### `SUID`

The `SUID` bit will allow the file to be executed with the privileges of the file's owner.  It is represented numerically by `4000` and symbolically by either `s` or `S`.

The classic example of an executable file with the `SUID` permission set is [`passwd`]:

```bash
$ ls -l $(which passwd)
-rwsr-xr-x 1 root root 63960 Feb  7  2020 /usr/bin/passwd
```

Let's take a quick look at setting the `SUID` bit on a new file:

```bash
$ > derp
$ ls -l derp
-rw------- 1 btoll btoll 0 May 16 00:50 derp
$ chmod 4600 derp
$ ls -l derp
-rwS------ 1 btoll btoll 0 May 16 00:56 derp
```

Note that the `SUID` bit is set, but it is an uppercase `S` because the execute bit isn't set (and it needs to be).  Let's do that now:

```bash
$ chmod u+x derp
$ ls -l derp
-rws------ 1 btoll btoll 0 May 16 00:56 derp
```

The lowercase `s` indicates that the execute bit is indeed set and that the file is now executable.

[Kool moe dee].

### `SGID`

The `SGID` bit can be set both on files and directories.  With files, its behavior is equivalent to that of `SUID` but the privileges are those of the group owner.

When set on a directory, however, it will allow all files created therein to inherit the ownership of the directory's group.

Note that the executable bit does not need to be set for the group to allow the files created in the directory to inherit the ownership of directory's group.

Observe:

```bash
$ mkdir derp
$ ls -ld derp
drwx------ 2 btoll btoll 4096 May 16 01:23 derp
$ chmod g+s derp
$ ls -ld derp
drwx--S--- 2 btoll btoll 4096 May 16 01:23 derp
$ sudo touch derp/berp
$ ls -l derp
total 0
-rw------- 1 root btoll 0 May 16 01:23 berp
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

---

Here's a wrapup, the kind that usually only occurs on xmas eve:

- to set both the `SUID` and the `SGID`
    + `6000`
    + `u+sx,g+s`
- just the `SUID`
    + `4000`
    + `u+sx`
- just the `SGID`
    + `2000`
    + `g+s`

## Finding File Permissions

It's good to check for binaries with either `SUID` or `SGID` set (or both).  Here are examples of checking for them in both symbolic and octal modes.

`SUID`:

```bash
$ find /usr/?bin -perm /u=s
$ find /usr/?bin -perm /4000
```

`SGID`:

```bash
$ find /usr/?bin -perm /g=s
$ find /usr/?bin -perm /2000
```

Both `SUID` and `SGID`:

```bash
$ find /usr/?bin -perm /u=s,g=s
$ find /usr/?bin -perm /6000
```

> Note that you can use a hyphen (`-`) instead of the forward slash (`/`), which I believe is the older way of searching for permissions.
>
> The substitution works for all except searching for both `SUID` and `SGID` using symbolic mode (`/u=s,g=s`).

Only omit both the `-` and the `/` when exactly matching the permissions.  For example, study the following examples.

```bash
$ > homer
$ chmod u+s homer
$ ls -l homer
-rwS------ 1 btoll btoll 0 May 16 01:44 homer
```

The following command will find the file (note the second command matches exactly):

```bash
$ find -perm /4000
./homer
$ find -perm 4600
./homer
```

The following won't (note that the `/` has been omitted):

```bash
$ find -perm 4000
$
```

## Password Management and Aging

### `passwd`

Get status of my account (`-S` or `--status`):

```bash
$ password -S
btoll P 01/02/2023 0 99999 7 -1
```

Let's [breakdown] those fields like a bad Tom Petty cover band:

- `btoll`
    + user login name
- `P`
    + user has a valid password
    + other possible values for this field could be:
        - `L` = locked password
        - `NP` = no password
- `01/02/2023`
    + date of the last password change
- `0`
    + minimum age in days (the minimum number of days between password changes)
    + `0` means the password may be changed at any time
- `99999`
    + maximum age in days (the maximum number of days the password is valid for)
    + `99999` will disable password expiration
- `7`
    + warning period in days (the number of days prior to password expiration that a user will be warned)
- `-1`
    + password inactivity period in days (the number of inactive days after password expiration before the account is locked)
    + a value of `-1` will remove an account's inactivity

In addition, here are some other useful options for managing accounts (must be have privileged permissions):

|**Option** |**Description**
|:---|:---
|`-l`, `--lock` |lock the password of the named account (will put a `!` before the encrypted password in `/etc/shadow`)
|`-u`, `--unlock` |unlock the password of the named account
|`-e`, `--expire` |immediately expire an account's password (this forces a user to change their password at the user's next login)
|`-d`, `--delete` |immediately expire an account's password (this forces a user to change their password at the user's next login)

> Note that locking a user's account does not disable the account.  The user may still be able to login using another authentication token (e.g. an SSH key).
>
> To disable the account, administrators should use `usermod --expiredate 1` (this set the account's expire date to Jan 2, 1970).
>
> Users with a locked password are not allowed to change their password.

### `chage`

Here's another view of the same information using [`chage`]:

```bash
$ chage -l btoll
Last password change                                    : Jan 02, 2023
Password expires                                        : never
Password inactive                                       : never
Account expires                                         : never
Minimum number of days between password change          : 0
Maximum number of days between password change          : 99999
Number of days of warning before password expires       : 7
```

To enter interactive mode, run without options:

```bash
$ sudo chage btoll
```

### `usermod`

As its name implies, the [`usermod`] utility also allows you to modify user information like locking and password expiry information.

|**Option** |**Description**
|:---|:---
|`-L`, `--lock` |lock the password of the named account (will put a `!` before the encrypted password in `/etc/shadow`)
|`-U`, `--unlock` |unlock the password of the named account
|`-f`, `--inactive` |the number of days after a password expires until the account is permanently disabled

## Discovering Open Ports

### `lsof`

You can list open files using the [`lsof`] tool.  Since everything in Linux is a file, this can return a huge amount of information (regular files, device files, sockets, named pipes, etc.).


Check for all Internet network files:

```bash
$ lsof -i
```

Check for all Internet network files for only `IPv4`:

```bash
$ lsof -i4
```

Check for all Internet network files for only `IPv6`:

```bash
$ lsof -i6
```

List open network files on a particular `IP` address (it can also do name resolution):

```bash
$ lsof -i@127.0.0.1
$ lsof -i@192.168.1.96
$ lsof -i@lucullus
```

Or, a port(s):

```bash
$ lsof -i:8000
$ lsof -i:8000,22
```

> If not all of the ports are listed, use the `sudo` command to escalate your privileges.
>
> ```bash
> $ sudo lsof -i@0.0.0.0:8000,22
> ```

Or, both:

```bash
$ lsof -i@162.247.242.61:443
```

List only `v4` network files with `TCP` state `LISTEN`:

```bash
$ lsof -i4tcp -stcp:listen
```

List by service:

```bash
$ sudo lsof -i@0.0.0.0:http,ssh
```

Of course, you can separate multiple ports using commas (`,`) and ranges using hyphens (`-`).

> There are so many great uses for `lsof` that are beyond the scope (it seems) of what's expected to be known for the `LPIC-1` certification exam.
>
> You can open files by:
> - user
> - command (i.e., `ssh`)
> - process
> - a directory (i.e., the files contained within the directory)
>
> Of course, with the support for logical conditions (`AND` and `OR`), most of these (all?) can be mixed and matched.

### `fuser`

Next up, the [`fuser`] tool is used to identify processes using files or sockets.  You can think of its purpose is to find a "file's user".

Here are some examples using the `cwd`:

```bash
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

Ok, that's my home directory, so there's bound to be a lot of action there, much like the backseat of a car on prom night.

Let's look at a more narrow example.  The following is the output from the content directory of my website on my local machine:

```bash
$ fuser .
/home/btoll/projects/benjamintoll.com:  6430c 75409c 129562c 129645c
$ fuser . -v
                     USER        PID ACCESS COMMAND
/home/btoll/projects/benjamintoll.com:
                     btoll      6430 ..c.. bash
                     btoll     75409 ..c.. vim
                     btoll     129562 ..c.. bash
                     btoll     129645 ..c.. ssh
```

This may be a better example of a real-world example of when you're trying to get a view of what could be happening in a particular corner of your filesystem.

As for the `ACCESS` column, here are the possible values and their meaning:


|**Option** |**Description**
|:---|:---
|`-c` |Current directory.
|`-e` |Executable being run.
|`-f` |Open file (omitted in default display mode).
|`-F` |Open file for writing (omitted in default display mode).
|`-r` |Root directory.
|`-m` |[`mmap`]'ed file or shared library.
|`.` |Placeholder (omitted in default display mode).

Here's an example using the `-n` or `--namespace` option to find information about network ports and sockets.  Just supply the protocol and port:

```bash
$ fuser -vn tcp 8000
                     USER        PID ACCESS COMMAND
8000/tcp:            btoll     19121 F.... python
```

You can also use `fuser` to kill a process with the `-k` or `--kill` switch.

### `netstat`

The [`netstat`] tool is part of the `net-tools` package, at least on Debian.  Per its man page, it can do all of the following things:

- print network connections
- routing tables
- interface statistics
- masquerade connections
- multicast memberships

Pretty nifty, I'd say, and I do say.

|**Option** |**Description**
|:---|:---
|`-l`, `--listening` |Show only listening sockets (omitted by default).
|`-p`, `--program`|Show the `PID` and name of the program to which each socket belongs.
|`-t`, `--tcp`|Show only `TCP` connections.
|`-u`, `--udp`|Show only `TCP` connections.
|`-e`, `--extend`|Display additional information.  Use this option twice for maximum detail.
|`-n`, `--numeric`|Resolve hostnames.
|`-a`, `--all`|Show both listening and non-listening sockets.
|`--numeric-ports`|Shows numerical port numbers but does not affect the resolution of host or user names.

> Note that if `-l` is ommitted, only the established connections are shown.  Also, you can combine both `-t` and `-u` if you're looking for a good time.

### `nmap`

[`nmap`] is a network exploration tool and security / port scanner.

`nmap` allows you to scan:
- single host
    + `nmap kilgore-trout.local`
- multiple hosts
    + `nmap localhost 192.168.1.7`
- host ranges
    + `nmap 192.168.1.3-20`
- subnets
    + wildcard or `CIDR` notation
    TODO remove backslash below
    + `nmap 192.168.1.\*`
    + `nmap 192.168.1.0/24`

> You can scan the entire Internet, if you want.

### `systemd` sockets

There is another way to view the open ports on a system, although I don't know if this is covered on the exam.  Anyway, there could be a service that is listening on a [`systemd.socket`]:

```bash
$ systemctl list-unit-files --type=socket
```

The `ListenStream` option will define if the service is to use a Unix socket, port, `IP` address, et al., to use as its connection type.

The following example is taken from the article [The End of the Road: systemd's "Socket" Units].

`/lib/systemd/system/echo.socket`

```systemd
# echo.socket
[Unit]
Description = Echo server

[Socket]
ListenStream = 4444
Accept = yes

[Install]
WantedBy = sockets.target

```

`/lib/systemd/system/echo@.service`

```systemd
[Unit]
Description=Echo server service

[Service]
ExecStart=/path/to/socketthing.py
StandardInput=socket

```

`socketthing.py`

```python
#!/usr/bin/python
import sys
sys.stdout.write(sys.stdin.readline().strip().upper() + 'rn')

```

The utility [`socat`] is a great tool to test this.  `socat` creates two bidirectional byte streams and transfers data between them.

```bash
$ chmod +x socketthing.py
$ socat - TCP:127.0.0.1:4444
hello computer
HELLO COMPUTER
$
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## User Limits

The [`ulimit`] utility is a bash builtin.  It provides control over the resources available to processes started by the shell, on systems that allow such control.

```bash
$ ulimit
unlimited
```

|**Option** |**Description**
|:---|:---
|`-H` | change and report the hard limit associated with a resource
|`-S` | change and report the soft limit associated with a resource
|`-b` | maximum socket buffer size
|`-f` | maximum size of files written by the shell and its children
|`-l` | maximum size that may be locked into memory
|`-m` | maximum resident set size (RSS) — the current portion of memory held by a process in main memory (RAM)
|`-s` | maximum stack size (in KB)
|`-v` | maximum amout of virtual memory
|`-u` | maximum number of processes available to a single user

```bash
$ ulimit -u
127079
$ ulimit -s
8192
```

Here's a quick example.  If the size of the stack isn't increased, the following toy program will fail with a segmentation fault:

```c
#include <stdlib.h>

int main() {
  char foo[10000000];
  foo[0] = 'a';
  exit(0);
}
```

A hard limit cannot be increased by a non-root user once it is set, but a non-root can decrease a hard limit.  A soft limit may be increased up to the value of the hard limit by the non-root user.

> To get help on the command line, issue the command `help ulimit`.

To set new limits on a particular resource, specify either the `-S` or the `-H` option, followed by the corresponding resource option and the new value.  This value can be a number or the special words `soft` (current soft limit), `hard` (current hard limit) or `unlimited` (no limit).  If neither `-S` or `-H` is specified, both limits will be set.

Any changes made using `ulimit` do not persist across reboots.  To make the changes permanent, edit the [`/etc/security/limits.conf`] file.  Note that this file can also be used to restrict resources by user.

For example, here is a snippet of the file that shows how this per-user restriction can be accomplished.  Note that the entries are commented-out:

```txt
#*               soft    core            0
#root            hard    core            100000
#*               hard    rss             10000
#@student        hard    nproc           20
#@faculty        soft    nproc           20
#@faculty        hard    nproc           50
#ftp             hard    nproc           0
#ftp             -       chroot          /ftp
#@student        -       maxlogins       4
```

## Logged-In Users

### `last`

The [`last`] utility is part of the `util-linux` package:

```bash
$ dpkg -S $(which last)
util-linux: /usr/bin/last
```

It shows a listing of last logged in users with the most recent on top:

```bash
$ last -n10
btoll    tty1                          Mon May 15 15:11   still logged in
reboot   system boot  5.10.0-21-amd64  Mon May 15 15:09   still running
btoll    tty1                          Wed May 10 21:27 - crash (4+17:42)
reboot   system boot  5.10.0-21-amd64  Wed May 10 21:27   still running
btoll    :0           :0               Wed May 10 20:47 - down   (00:34)
btoll    tty1                          Mon Apr 24 21:04 - down  (16+00:17)
reboot   system boot  5.10.0-21-amd64  Mon Apr 24 21:04 - 21:21 (16+00:17)
btoll    tty1                          Wed Apr  5 18:03 - down  (19+02:59)
reboot   system boot  5.10.0-21-amd64  Wed Apr  5 18:03 - 21:03 (19+03:00)
btoll    :0           :0               Wed Apr  5 18:00 - down   (00:01)

wtmp begins Mon Jan  2 17:06:48 2023
```

Note that the system was rebooted several times using kernel `5.10.0-21-amd64`.

The last line begins with `wtmp`, which is the binary file [`/var/log/wtmp`] from which `last` gets its data.

Your system may not have that file.  The `last` man page addresses this:

<cite>The files `wtmp` and `btmp` might not be found.  The system only logs information in these files if they are present.  This is a local configuration issue.  If you want the files to be used, they can be created with a simple `touch(1)` command (for example, `touch /var/log/wtmp`).</cite>

To see all the logins for a particular user, provide the name after the command:

```bash
$ last btoll
```

### `lastb`

The [`lastb`] utility is also part of the `util-linux` package:

```bash
$ dpkg -S $(which lastb)
util-linux: /usr/bin/lastb
```

`lastb` is the same as `last`, except that by default it shows a log of the `/var/log/btmp` file, which contains all the bad login attempts.

The `LPIC-1` docs don't seem to care about this tool.

### `who`

The [`who`] utility shows who is currently logged into the system.  There may be more users currently using the system that are not listed in the output, because not all programs use `utmp` logging.

Also this warning from the man page:

<cite>**Warning:** `utmp` must not be writable by the user class "other", because many system programs (foolishly) depend on its integrity.  You risk faked system logfiles and modifications of system files if you leave `utmp` writable to any user other than the owner and group owner of the file.</cite>

It is part of the `coreutils` package:

```bash
$ dpkg -S $(which who)
coreutils: /usr/bin/who
```

A file can be provided as an argument that is used to look up the information, but if one isn't provided, `who` will use the binary file [`/var/run/utmp`] (it is common to use [`/var/log/wtmp`]).

```bash
$ who
btoll    tty1         2023-02-13 15:06
```

Check out the difference when the `/var/log/wtmp` file is given as an argument:

```bash
$ who | wc -l
1
$ who /var/log/wtmp | wc -l
261
```

Include the `-a|--all` switch to also print the current runlevel, time of last system boot, and more.

```bash
$ who -a
           system boot  2023-02-13 15:05
btoll    - tty1         2023-02-13 15:06  old         5897
           run-level 3  2023-02-13 15:06
```

Here are some useful options:

|**Option** |**Description**
|:---|:---
|`-H`, `--heading` | print line of column headings
|`-T`, `-w`, `--mesg` | add user's message status as `+`, `-` or `?`
|`-a`, `--all` | same as `-b` `-d` `--login` `-p` `-r` `-t` `-T` `-u`
|`-b`, `--boot` | time of last system boot
|`-q`, `--count` | all login names and number of users logged on
|`-r`, `--runlevel` | print current runlevel

### `w`

The [`w`] utility shows who is logged on and what they are doing.  It also gives more verbose output than `who`.

It is part of the `procps` package:

```bash
$ dpkg -S $(which w)
procps: /usr/bin/w
```

Let's take a look at its usage:

```bash
$ w
 02:21:38 up 1 day, 11:11,  1 user,  load average: 1.59, 1.21, 0.66
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
btoll    tty1     -                Mon15   35:10m 28:30   0.00s xinit /home/btoll/.xinitrc -- /etc/X11/xinit/xserverrc :0 vt1
```

The first line (the header) is familiar to tools such as [`uptime`] and [`top`] in that it gives information about:

- the current time (`02:21:38`)
- how long the system has been up and running (`1 day`)
- the number of currently logged in users (1 user)
- the load average numbers (load average: `1.59, 1.21, 0.66`)
    + these values refer to the number of jobs in the run queue averaged over the last 1, 5 and 15 minutes, respectively.

> The information in the header is the same as that given by the `uptime` utility.

Here is a list of the columns:

|**Column** |**Description**
|:---|:---
|`USER` | Login name of user.
|`TTY` | Name of terminal the user is on.
|`FROM` | Remote host from which the user has logged on.
|`LOGIN@` | Login time.
|`IDLE` | Idle time.
|`JCPU` | Time used by all processes attached to the `tty` (including currently running background jobs).
|`PCPU` | Time used by current process (the one showing under `WHAT`).
|`WHAT` | Command line of current process.

Lastly, as with `who`, `w` accepts a user name:

```bash
$ w btoll
```

## `sudo`

Everybody knows about [`sudo`].  It even [has a theme song].

The default security policy is [`sudoers`], and the file that controls the policy is `/etc/sudoers` (your distribution may also have an `@includedir` directive in `/etc/sudoers` to also parse any files in `/etc/sudoers.d/`).

Indeed, `/etc/sudoers` is the place where a user's `sudo` privileges are determined.  In other words, here you will specify who can run what commands as what users on what machines, as well as other settings.

Here's a sample `/etc/sudoers` file:

```conf
Defaults        env_reset
Defaults        mail_badpass
Defaults        secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Defaults        editor=/usr/bin/vim

# Host alias specification

# User alias specification

# Cmnd alias specification

# User privilege specification
root    ALL=(ALL:ALL) ALL

# Allow members of group sudo to execute any command
%sudo   ALL=(ALL:ALL) ALL

# See sudoers(5) for more information on "@include" directives:

@includedir /etc/sudoers.d
```

Here's how to read these entries.  The privilege specification for the `root` user is `ALL=(ALL:ALL) ALL`. This translates as:
- user `root` can log in from all hosts `ALL`, as all users and all groups `(ALL:ALL)`, and run all commands `ALL`
- the same is true for members of the `sudo` group (group names are identified by a preceding percent sign `%`)

> Note that I set `vim` as the default `visudo` editor because [`nano`] is for losers.

Of course, you don't directly edit the `sudoers` config file, you instead use the [`visudo`] utility.

From `/etc/sudoers.d/README`:

<cite>Finally, please note that using the `visudo` command is the recommended way to update `sudoers` content, since it protects against many failure modes.  See the man page for `visudo` for more information.</cite>

## `nologin`

[`/etc/nologin`]

In addition, there's also the [`nologin`] command.

```bash
$ sudo nologin
This account is currently not available.
```
## `xinetd`

Seriously, [`xinetd`]?  I don't think anyone has used this in the past 500 years.

## Unnecessary Services
```bash
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

```bash
$ sudo systemctl disable atd.service --now
Synchronizing state of atd.service with SysV service script with /lib/systemd/systemd-sysv-install.
Executing: /lib/systemd/systemd-sysv-install disable atd
Removed /etc/systemd/system/multi-user.target.wants/atd.service.
```

```bash
$ systemctl status atd
● atd.service - Deferred execution scheduler
     Loaded: loaded (/lib/systemd/system/atd.service; disabled; vendor preset: enabled)
     Active: inactive (dead)
       Docs: man:atd(8)
```

```bash
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

```bash
# Debian
$ sudo update-rc.d SERVICE-NAME remove
```

```bash
# Red Hat
$ sudo chkconfig SERVICE-NAME off
```

The following two commands will also list listening network services.  The first uses the legacy (deprecated?) utility `netstat` from the `net-tools` package:

```bash
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

```bash
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

[`TCP` Wrappers] is a host-based [access-control list] (`ACL`) system that uses a library named `libwrap` to filter network access to servers.

Initially, only super servers like `xinetd` got wrapped, but it has evolved to allow for common network service daemons such as `sshd` to be linked to `libwrap`.

`TCP` Wrappers is used by tools like [`Fail2ban`] because they can add and remove rules at runtime, which gives `TCP` Wrappers the benefit of runtime `ACL` reconfiguration.  This is beneficial for detecting errant behavior on-the-fly, and the services don't need to be reloaded or restarted since the rules aren't written to a daemon's configuration file.

For example, `Fail2ban` may add the `IP` addresses to temporarily block to `/etc/hosts.deny`.

Determining if a binary has been compiled with support (that is, it needs to be linked against the `libwrap.so` shared object) for `TCP` Wrappers is easy:

```bash
$ ldd $(which sshd) | grep libwrap
        libwrap.so.0 => /lib/x86_64-linux-gnu/libwrap.so.0 (0x00007fc7bb86e000)
$ ldd $(which pulseaudio) | grep libwrap
        libwrap.so.0 => /lib/x86_64-linux-gnu/libwrap.so.0 (0x00007f856458b000)
```

To filter traffic, add configurations to `/etc/hosts.allow` and `/etc/hosts.deny`.  The format for an entry is:

```txt
service: host/network [: <option>: <option>: ...]
```

Like other filtering tools, if a definition is found in `/etc/hosts.allow`, the tool stops searching and will not then also look in `/etc/hosts.deny`.

Here are some examples:

`/etc/hosts.allow`

<pre class="math">
sshd: 10.10.136.241
sshd: [2a02:2149:88f1:4c00:9991:9daa:b580:aee1]
</pre>

`/etc/hosts.allow`

<pre class="math">
sshd: .benjamintoll.com
</pre>

`/etc/hosts.deny`:

<pre class="math">
ALL: LOCAL @some_netgroup
ALL: .foobar.edu EXCEPT terminalserver.foobar.edu
</pre>

Another from `/etc/hosts.deny` (excerpted from my Debian `bullseye` machine):

<pre class="math">
# The PARANOID wildcard matches any host whose name does not match its
# address.
#
# You may wish to enable this to ensure any programs that don't
# validate looked up hostnames still leave understandable logs. In past
# versions of Debian this has been the default.
ALL: PARANOID
</pre>

## `ssh`

[`ssh` client]

### Port Forwarding

#### Local

#### Remote

#### Dynamic

## `gpg`

The [`gpg`] utility is an [`OpenPGP`] encryption and signing tool.  It can use both symmetric and asymmetric keys for encryption.

> To print a list of all options and commands:
>
> ```bash
> $ gpg --dump-options
> ```

Also, a good command to know about is `gpgconf` in which you can query and modify configuration files in the `gnupg` home directory (usually `$HOME/.gnupg`):

```bash
$ gpgconf
gpg:OpenPGP:/usr/bin/gpg
gpg-agent:Private Keys:/usr/bin/gpg-agent
scdaemon:Smartcards:/usr/lib/gnupg/scdaemon
gpgsm:S/MIME:/usr/bin/gpgsm
dirmngr:Network:/usr/bin/dirmngr
pinentry:Passphrase Entry:/usr/bin/pinentry
```

### Generating

To generate a new keypair, use `--gen-key|--generate-key` or `--full-gen-key|--ful-generate-key`.  The latter generates the keypair with dialogs for all of the options (it's an extended version of `--generate-key`).

> I've understood that it's better to use `--full-generate-key` because you can specify the algorithm, key length and when the key should expire.  These are the extensions to the `--gen-key` switch mentioned above.

Either option will not only create the keypair but sign it.  A revocation certificate is also generated (on my Debian `bullseye` machine, it put the certificate in `$HOME/.gnupg/openpgp-revocs.d`).

Note that you may be asked to bang on the keyboard and mouse to increase the amount of entropy when creating the keypair.  This may be because you don't have an daemon to feed random from an entropy source (like a [hardware random number generator]) to an entropy sink (like a kernel entropy pool).

To remedy this horrifying situation, install [`rng-tools`].  This will install the `rng-tools.service` and start it.

If you want to manually point the daemon at another entropy source, you can run the following command before generating your keypair:

```bash
$ sudo rngd -r /dev/urandom
```

The `-r` switch is shorthand for `--rng-device`.  The default file is `/dev/hwrng`.

> There is also a `--quick-gen-key|--quick-generate-key` option that isn't covered on the exam.

### Exporting

Export the public key in binary `OpenPGP` format:

```bash
$ gpg --export "Benjamin Toll" > benjam72.pub
$ file benjam72.pub
benjam72.pub: PGP/GPG key public ring (v4) created Tue Feb  7 15:16:39 2023 RSA (Encrypt or Sign) 3072 bits MPI=0xdf8388d842cbedfc...
```

Use the `-a|--armor` option to email the pubkey(s) (known as `ASCII` armor).  The following command sends prints the pubkey to `stdout`:

```bash
$ gpg --export --armor "Benjamin Toll"
-----BEGIN PGP PUBLIC KEY BLOCK-----

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
=pBo6
-----END PGP PUBLIC KEY BLOCK-----
```

### Importing

Import and merge keys.  These can be public or private keys, as well as key revocation certificates.

Import your best friend's public key:

```bash
gpg --import kilgore-trout.pub.key
```

Import a revocation certificate.  This will automatically revoke the respective key.

```bash
$ gpg --import revocation_file.asc
```

### Listing

To list all public keys in your keyring, use any of the following synonyms:

- `--list-keys`
- `-k`
- `--list-public-keys`

To list all private keys:

- `--list-secret-keys`
- `-K`

Note that `#` after the initial tags sec or ssb means that the secret key or subkey is currently not usable.  In addition, `>` after these tags indicate that the key is stored on a smartcard.

> Use the `--with-colons` switch for safe use in scripts.

### Revoking

To create a revocation certificate:

```bash
$ gpg --output revocation_file.asc --gen-revoke benjam72@yahoo.com
```

> A synonym of `--gen-revoke` is `--generate-revocation`.

To revoke the key, simply import (`--import`) the generated revocation certificate into your keyring.  When listing the key again, you will now see that it's been revoked:

```bash
$ gpg -k foo-manchu
pub   rsa3072 2023-02-17 [SC] [revoked: 2023-02-17]
      60F92D048F12B65CA59AD1C1FD717513DE6940D8
uid           [ revoked] foo-manchu <foo-manchu@example.com>

```

(Re-)upload your key to a keyserver and/or distribute the revocation certificate to all of your friends and have them import it into their keyring, as well.

Note that you can just use the generated revocation certificate when the keypair was created instead of creating a new one.  However, you may want to specify the specific reason for the revocation, which is a good reason to generate a new one.

Interestingly, there's this safeguard in the one that it's created upon key creation:

<pre class="math">
...
To avoid an accidental use of this file, a colon has been inserted
before the 5 dashes below.  Remove this colon with a text editor
before importing and publishing this revocation certificate.

:-----BEGIN PGP PUBLIC KEY BLOCK-----
Comment: This is a revocation certificate
...
</pre>

This safeguard is not present if later creating a key revocation cert.

### Encrypting

#### Symmetric

To encrypt using a symmetric cipher, use the `-c|--symmetric` option.

It will ask for a passphrase and then give the new encrypted file a `.gpg` extension.

```bash
$ echo whatever > foo-manchu.txt
$ gpg -c foo-manchu.txt
$ file foo-manchu.txt.gpg
foo-manchu.txt.gpg: GPG symmetrically encrypted data (AES256 cipher)
```

On my machine, it defaulted to using `AES256`, as seen from the output of the `file` command above.  However, you can choose another cipher with the inclusion of the `--cipher-algo` option.

```bash
$ gpg -c --cipher-algo BLOWFISH foo-manchu.txt
$ file foo-manchu.txt.gpg
foo-manchu.txt.gpg: GPG symmetrically encrypted data (BLOWFISH cipher)
```

To see what ciphers are supported, use the previous command with the `--version` switch:

```bash
$ gpg -c --cipher-algo foo-manchu.txt --version
gpg (GnuPG) 2.2.27
libgcrypt 1.8.8
Copyright (C) 2021 Free Software Foundation, Inc.
License GNU GPL-3.0-or-later <https://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

Home: /home/btoll/.gnupg
Supported algorithms:
Pubkey: RSA, ELG, DSA, ECDH, ECDSA, EDDSA
Cipher: IDEA, 3DES, CAST5, BLOWFISH, AES, AES192, AES256, TWOFISH,
        CAMELLIA128, CAMELLIA192, CAMELLIA256
Hash: SHA1, RIPEMD160, SHA256, SHA384, SHA512, SHA224
Compression: Uncompressed, ZIP, ZLIB, BZIP2
```

#### Asymmetric

Encrypt so it is safe to email:

```bash
$ gpg --recipient benjam72@yahoo.com --encrypt --armor foo-manchu.txt
$ cat foo-manchu.txt.asc
-----BEGIN PGP MESSAGE-----

hQGMAwfhRt5iEmywAQwAmZVpcVgIQj9NAgaKV41EwALhrLX+CxRaa9qUBb+4mpW7
8w+oN5Wokhu8EnYCjNRUbv6SO/RGwLG6USaxm5z9y4/z+h0sWro2I/O1Q23Xnaxa
wbp4Zhlzqeta8mqpxJyOLxiLligP6zQNeV8ysyZPmwTGCRw3uLj9vxdBgJFXI5bC
bu1CzqhmmUG1pbhNyHsizz2pq5VFVJcb64hIj7ZOZ6Z31aMuEZb+AyWwH/hCOwZQ
zj4ynZCyqQzgxmeD0pRaxVqwVidZ0xfxLxyagn9d5HdPGRML4Jc+ycxHMQzBbdcL
Uii9VsQCL2LRZ/HEKPyNtAeApEASBzn+m4bCEM8Prm2EYjhocm/4cZLw0fe2F+DP
GC3G/jqy2hJF55jjYFd6PGHbXVHrwOJlKyD7cBqucAlH3wmHenc8zk9bub5ia0Bn
V+o57jrBZzNPPwc8/1GZBUI460OXh//qelv4j3oSOCLHYymAwetJ6oPsNCiArSpf
DIEs/E/5hZKet6DtBF+20kwBtyfmvv3GXsq4aB5xT9cmg8I7vw9Qg3UJs6kcCzKF
LVSOAqwhiVr1RElTZPIuepCc+vXlp1DdqPUCclo47N/wibUPBSOmjrBiZ3hn
=ppBU
-----END PGP MESSAGE-----
```

Encrypt and sign (also armored).  Note that the signature increases the size of the file.

```bash
$ gpg --recipient benjam72@yahoo.com --encrypt --sign --armor foo-manchu.txt
$ cat foo-manchu.txt.asc
-----BEGIN PGP MESSAGE-----

hQGMAwfhRt5iEmywAQv/VwW6TAoaUDuxMK0PW2SK2rMRMAodIc/FfGckQMf/lyj1
crcr7V1LX7DqyL4+ML6WNyOipw5v5luwU4zM3g9u8m8LHyj5q9pgdGcxk/6Kdr7I
JFH1gNRAram2VcuDU8ZYOAF8DU+LC8BvNvbgcws9TfjHQ61QLmmMAwdJE2+HjAG+
plGzGFQDkvSYxqN4TIIwE7CWaX7CBPUOs9eUWvDHOp86UwQsyWxlE4zBAweF5lFL
KRoOLojDQqn3YvQv1LyP6/BtB5/sFgY0kDdS4NWOWmMeIRkkImnNtemyFQ7N2HV8
alzZkJWJ6Azuvi/44zSZoXcefkHcgQFn79zWPAtTTY+RZFON0r2i3CH5HL2IPJH0
Mb2dOKbHcrz2U6VUWSNb/3eNJYyAdphm8gZSihSIFxtaJRQ+3Rp7EvnHkt5wq0bi
nIvfuKSxGEoRr3wzJrlgzN9s4FO80ZLSJ41KDDPNQrQNPX5UTKuwk8Tf0JFdaNLi
GYfxW7wHrEr7pdn8N3Ly0ukBwTcFMf1SqWrTyaLx/siiihTUFVli3hxOPcibcNRC
YNMjcj1hQ4Yn5TICS2OTI2uaC2zHRV6E3nOwUcQV6NMoJv7SQTOTDeD68jQEe/Sw
UmS0/2wbpZY2nc5uKyPOQyW40vo0ueFvVSOvOo1ZhmEFLBgiS3WHp7lqnxVw02lD
YoLlHOvngLRyu5Ml/9vz91HF5pIHKDg5CnCBXXOwcdq/6y2SbJ/9vsy70R10OFq6
1gvZsd3wH34wVU7799svVU2gwOmTVYwMKNNTUBzieR13DTZ0gaIW0TIl1ZsiHpqp
dLXSSuEKHHpBgth8p90G/xPpvl849uIqoV0vNw0egqGmF6WZxEaZFWEtbacy2Gem
NIrWP84r9m4+z6seN9XDChLB1kaa0BvfAm2az1oLlbglAtuN765541/ZaxnCoWnp
2yJkD6Kx4z6Nro5eH5vGaRf8KZ1B/CKin8/qgGmNx5XyZ3agRyPjt46wI3Z17VYo
8jgUzvbbIuCSSWjoBNvXCdUGn3Ha50FQpe2wNyzhJFnAKiSsIvKSocj8Rzu9AkVI
9IH0KPeZrL3p3KRy8o9maflOzgZ79nTN+Sa6/UGBXcZDC9zUZSf0l6Y/BNPttqUH
VXV4oOYBpykpEXXj5Bb64b9Vr3+L9enxcba4zQrmSqRqDU55YMDME94m5LdYofzU
shpBeD+ObDSEtbt9LwE91Cja5vZzel5bqzMEkA==
=vcwB
-----END PGP MESSAGE-----
```
### Decrypting

Use either the `--decrypt` or `-d` switch.

To decrypt a nice encrypted message that was sent by a pal, issue the following command:

```bash
$ gpg -d foo-manchu.txt.asc
```

This will write to `stdout` unless you specify an out file destination.

### Signing

A file can be signed and not encrypted.  Let's look at some examples to understand more fully.

Sign an unencrypted file with the default private key.   This will create a binary file with the `.gpg` extension if the `--output` option isn't given:

```bash
$ gpg --sign foo-manchu.txt
$ file foo-manchu.txt.gpg
foo-manchu.txt.gpg: data
```

Create a cleartext signature, that is, one that can be read without the need of any special software:

```bash
$ gpg --clearsign foo-manchu.txt
$ file foo-manchu.txt.asc
foo-manchu.txt.asc: PGP signed message
$ cat foo-manchu.txt.asc
-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

foo-manchu
-----BEGIN PGP SIGNATURE-----

iQGzBAEBCgAdFiEE02zdfLNUNQp7pFEM43rjrVH/3IQFAmPv8MoACgkQ43rjrVH/
3IQltwv+PLalQ5f7HbwPRXbd/D59K9yoUGxI6uIp1wIAxqLRpmRuX4NOGJteiRG8
8W+2+Fu6Hht7pTBBGNCp7ep6EQwI5Y24F9jjVeMcpOipLY+6BLitieEUq8w8x37e
45/tnLaxa7uTkBnQP+unoKu6bnNSYUKgdLIMYWrOWvHdQJhw68nP+13tGIFbVK6Q
IU8dKYtXuMHderylTmyeYazRFxY2zTVLOSghelwJtw2T5MODeOeITDqTml+omGW+
buRHTqP0et0PleyKOsnnPrOPHFv94OXJ6HUOEbATt0pBJS3b5vQKWzPIx6uhawhD
mkyhjv+jOczQ1dAC28QZ2FWDXdTy6+aU2eHj1qivRtqGD45yTrFlTkZejMOE+5Zo
QwI4J0NmMloHB+OhtgX7Loah2ZprHQOx3Dssrf8Ei/2G016d4YAn3J7a/ijPKdp1
TAz4k2fewZYi2jUh0gkJe15Rs9ykfjtAD+fHghOhMwSgIXUnVdj2YIyNN4T05kNe
4LFnBJeo
=8Z2E
-----END PGP SIGNATURE-----
```

In contrast with the binary signature file, the cleartext signature was given an extension of `.asc`.

Note that `--clearsign` is a synonym for `--clear-sign`.

To make a detached signature, use `--detach-sign` or `-b`.  This will a separate binary signature file that is given the `.sig` extension by default, and it can be verified using the `--verify` switch as usual:

```bash
$ file foo-manchu.txt.sig
foo-manchu.txt.sig: data
```

> Use `--default-key` or `--local-user` to specify another private key to do the signing.

#### Sign and Encrypt

Symmetrically encrypt and sign:

```bash
$ gpg --symmetric --sign foo-manchu.txt
gpg: AES256 encryption will be used
$ file foo-manchu.txt.gpg
foo-manchu.txt.gpg: GPG symmetrically encrypted data (AES256 cipher)
```

Note that you can't encrypt and clearsign.  Of course, this makes sense:

```bash
$ gpg --symmetric --clearsign foo-manchu.txt
gpg: conflicting commands
```

Asymmetrically encrypt and sign for the `benjam72` recipient:

```bash
$ gpg --recipient benjam72 --encrypt --sign foo-manchu.txt
$ file foo-manchu.txt.gpg
foo-manchu.txt.gpg: PGP RSA encrypted session key - keyid: 07E146DE 62126CB0 RSA (Encrypt or Sign) 3072b .
```

You can encrypt more than one file at once using the `--multiline` switch:

```bash
$ gpg --recipient benjam72@yahoo.com --encrypt --multifile [f,m]oo-manchu.txt
$ file [f,m]oo-manchu.txt.gpg
foo-manchu.txt.gpg: PGP RSA encrypted session key - keyid: 07E146DE 62126CB0 RSA (Encrypt or Sign) 3072b .
moo-manchu.txt.gpg: PGP RSA encrypted session key - keyid: 07E146DE 62126CB0 RSA (Encrypt or Sign) 3072b .
```

### Deleting

Use `--delete-keys` to delete a public key from the keyring.  However, if there is also a secret key for the public key, then you will get a warning that you first must remove the secret private key:

```bash
$ gpg --delete-keys foo-manchu
gpg (GnuPG) 2.2.27; Copyright (C) 2021 Free Software Foundation, Inc.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

gpg: there is a secret key for public key "foo-manchu"!
gpg: use option "--delete-secret-keys" to delete it first.
```

You will be asked three or four times if you're sure that you want to remove the key:

```bash
$ gpg --delete-secret-keys foo-manchu
gpg (GnuPG) 2.2.27; Copyright (C) 2021 Free Software Foundation, Inc.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.


sec  rsa3072/FD717513DE6940D8 2023-02-17 foo-manchu <foo-manchu@example.com>

Delete this key from the keyring? (y/N) y
This is a secret key! - really delete? (y/N) y
```

You will then be able to remove the public key:

```bash
$ gpg --delete-keys foo-manchu
gpg (GnuPG) 2.2.27; Copyright (C) 2021 Free Software Foundation, Inc.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.


pub  rsa3072/FD717513DE6940D8 2023-02-17 foo-manchu <foo-manchu@example.com>

Delete this key from the keyring? (y/N) y
```

If you know that you want to remove both, then this is your lucky day.  Use the `--delete-secret-and-public-key` to remove both in one fell swoop.  It will remove the private key first, which means that it will ask you several times if you're sure that you want to perform the action.

### Uploading and Retrieving From a Keyserver

Upload a key to a keyserver:

```bash
$ gpg --keyserver keyserver-name --send-keys KEY-ID
```

For others to then get the key from a keyserver:

```bash
$ gpg --keyserver keyserver-name --recv-keys KEY-ID
```

### `gpg-agent`

The [`gpg-agent`] is a daemon that stores keys in memory.  When `gpg` needs to perform an operation, it will ask the daemon for the key material, and if it doesn't have it, will get it from the keyring, thus prompting for a password (and raising your [`pinentry`] program).

Essentially, it stores keys in memory so you don't have to keep entering passphrases every time you invoke `gpg`.

Like its cousin `gpg`, the `gpg-agent` has a switch to dump all of its available options and commands:

```bash
$ gpg-agent --dump-options
```

# Summary

Congratulations, you're now an expert in what I think is important to know about the `LPIC-1` exam.

# References

- [LPIC-1 Objectives V5.0](https://wiki.lpi.org/wiki/LPIC-1_Objectives_V5.0#Objectives:_Exam_102)
- [LPIC-1 Learning Materials](https://learning.lpi.org/en/learning-materials/102-500/)
- [Securing your network: An introduction to TCP wrappers](https://www.computerworld.com/article/2833484/securing-your-network-an-introduction-to-tcp-wrappers.html)
- [Linux manual pages: section 5](https://man7.org/linux/man-pages/dir_section_5.html)
- [`GnuPG` manual](https://gnupg.org/documentation/manuals/gnupg/)
- [Forwarding gpg-agent to a remote system over SSH](https://wiki.gnupg.org/AgentForwarding)
- [How to Use the Linux lsof Command](https://www.howtogeek.com/426031/how-to-use-the-linux-lsof-command/)

https://en.wikipedia.org/wiki/GNU_Privacy_Guard

<!--
https://bbs.archlinux.org/viewtopic.php?id=147964
-->

[LPIC-1]: https://www.lpi.org/our-certifications/lpic-1-overview
[Topic 110: Security]: https://learning.lpi.org/en/learning-materials/102-500/110/
[LPIC-1 Exam 102]: https://www.lpi.org/our-certifications/exam-102-objectives
[`lsof`]: https://man7.org/linux/man-pages/man8/lsof.8.html
[`fuser`]: https://man7.org/linux/man-pages/man1/fuser.1.html
[`netstat`]: https://man7.org/linux/man-pages/man8/netstat.8.html
[`systemd.socket`]: https://man7.org/linux/man-pages/man5/systemd.socket.5.html
[The End of the Road: systemd's "Socket" Units]: https://www.linux.com/training-tutorials/end-road-systemds-socket-units/
[`socat`]: https://man.archlinux.org/man/socat.1.en
[`who`]: https://man7.org/linux/man-pages/man1/who.1.html
[`/var/run/utmp`]: https://man7.org/linux/man-pages/man5/utmp.5.html
[`/var/log/wtmp`]: https://linux.die.net/man/5/wtmp
[`w`]: https://man7.org/linux/man-pages/man1/w.1.html
[`visudo`]: https://man7.org/linux/man-pages/man8/visudo.8.html
[`/etc/nologin`]: https://man7.org/linux/man-pages/man5/nologin.5.html
[`nologin`]: https://man7.org/linux/man-pages/man8/nologin.8.html
[`xinetd`]: https://en.wikipedia.org/wiki/Xinetd
[`ss`]: https://man7.org/linux/man-pages/man8/ss.8.html
[`TCP` Wrappers]: https://en.wikipedia.org/wiki/TCP_Wrappers
[access-control list]: https://en.wikipedia.org/wiki/Access-control_list
[`Fail2ban`]: https://www.fail2ban.org/wiki/index.php/Main_Page
[`ssh` client]: https://man7.org/linux/man-pages/man1/ssh.1.html
[`gpg`]: https://gnupg.org/
[`OpenPGP`]: https://www.openpgp.org/
[hardware random number generator]: https://en.wikipedia.org/wiki/Hardware_random_number_generator
[`rng-tools`]: https://wiki.archlinux.org/title/Rng-tools
[`gpg-agent`]: https://linux.die.net/man/1/gpg-agent
[`pinentry`]: https://www.gnupg.org/related_software/pinentry/index.html
[`passwd`]: https://man7.org/linux/man-pages/man1/passwd.1.html
[Kool moe dee]: https://en.wikipedia.org/wiki/Kool_Moe_Dee
[`LPIC-1` 101]: /2023/01/20/on-the-lpic-1-exam-101-devices-linux-filesystems-fhs/#special-permissions
[`chage`]: https://man7.org/linux/man-pages/man1/chage.1.html
[`usermod`]: https://man7.org/linux/man-pages/man8/usermod.8.html
[breakdown]: https://www.youtube.com/watch?v=dqxns-JTTqA
[`mmap`]: https://man7.org/linux/man-pages/man2/mmap.2.html
[`nmap`]: https://man7.org/linux/man-pages/man1/nmap.1.html
[`ulimit`]: https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-ulimit
[`/etc/security/limits.conf`]: https://www.man7.org/linux/man-pages/man5/limits.conf.5.html
[`last`]: https://man7.org/linux/man-pages/man1/last.1@@util-linux.html
[`lastb`]: https://linux.die.net/man/1/lastb
[`uptime`]: https://man7.org/linux/man-pages/man1/uptime.1.html
[`top`]: https://man7.org/linux/man-pages/man1/top.1.html
[`sudo`]: https://man7.org/linux/man-pages/man8/sudo.8.html
[has a theme song]: https://www.youtube.com/watch?v=r0qBaBb1Y-U
[`sudoers`]: https://man7.org/linux/man-pages/man5/sudoers.5.html
[`nano`]: https://nano-editor.org/

