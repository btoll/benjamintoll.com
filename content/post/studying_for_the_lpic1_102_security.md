+++
title = "On Studying for the LPIC-1 Exam 102: Security"
date = "2023-02-06T19:31:41-05:00"

+++

This is a riveting series:

- [On Studying for the LPIC-1 Exam 102: Shells and Shell Scripting](/2023/01/22/on-studying-for-the-lpic-1-exam-102-shells-and-shell-scripting/)
- [On Studying for the LPIC-1 Exam 102: User Interfaces and Desktops](/2023/01/25/on-studying-for-the-lpic-1-exam-102-user-interfaces-and-desktops/)
- [On Studying for the LPIC-1 Exam 102: Administrative Tasks](/2023/01/26/on-studying-for-the-lpic-1-exam-102-administrative-tasks/)
- [On Studying for the LPIC-1 Exam 102: Essential System Services](/2023/02/01/on-studying-for-the-lpic-1-exam-102-essential-system-services/)
- [On Studying for the LPIC-1 Exam 102: Networking Fundamentals](/2023/02/03/on-studying-for-the-lpic-1-exam-102-networking-fundamentals/)
- On Studying for the LPIC-1 Exam 102: Security

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
    + [Finding File Permissions](#finding-file-permissions)
    + [Open Ports](#open-ports)
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

## Finding File Permissions

It's good to check for binaries with either `SUID` or `SGID` set (or both).  Here are examples of checking for them in both symbolic and octal modes.

`SUID`:

```
$ find /usr/?bin -perm /u=s
$ find /usr/?bin -perm /4000
```

`SGID`:

```
$ find /usr/?bin -perm /g=s
$ find /usr/?bin -perm /2000
```

Both `SUID` and `SGID`:

```
$ find /usr/?bin -perm /u=s,g=s
$ find /usr/?bin -perm /6000
```

> Note that you can use a hypen (`-`) instead of the forward slash (`/`), which I believe is the older way of searching for permissions.
>
> The substitution works for all except searching for both `SUID` and `SGID` using symbolic mode (`/u=s,g=s`).

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

You can list open files using the [`lsof`] tool.

Check for all Internet network files:

```
$ lsof -i
```

Check for all Internet network files for only `IPv4`:

```
$ lsof -i4
```

Check for all Internet network files for only `IPv6`:

```
$ lsof -i6
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

List only `v4` network files with `TCP` state `LISTEN`:

```
$ lsof -i4tcp -stcp:listen
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

> Of the utilities to list ports, `fuser` provides the least information.

### `netstat`

The [`netstat`] tool is part of the `net-tools` package, at least on Debian.

|**Option** |**Description** |
|:---|:---|
|`-l`, `--listening` |Show only listening sockets (omitted by default).|
|`-p`, `--program`|Show the `PID` and name of the program to which each socket belongs.|
|`-t`, `--tcp`|Show only `TCP` connections.|
|`-u`, `--udp`|Show only `TCP` connections.|
|`-n`, `--numeric`|Resolve hostnames.|
|`-a`, `--all`|Show both listening and non-listening sockets.|
|`--numeric-ports`|Shows numerical port numbers but does not affect the resolution of host or user names.|

### `nmap`

### `systemd` sockets

There is another way to view the open ports on a system, although I don't know if this is covered on the exam.  Anyway, there could be a service that is listening on a [`systemd.socket`]:

```
$ systemctl list-unit-files --type=socket
```

The `ListenStream` option will define if the service is to use a Unix socket, port, `IP` address, et al., to use as its connection type.

The following example is taken from the article [The End of the Road: systemd's "Socket" Units].

`/lib/systemd/system/echo.socket`

```
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

```
[Unit]
Description=Echo server service

[Service]
ExecStart=/path/to/socketthing.py
StandardInput=socket

```

`socketthing.py`

```
#!/usr/bin/python
import sys
sys.stdout.write(sys.stdin.readline().strip().upper() + 'rn')

```

The utility [`socat`] is a great tool to test this.  `socat` creates two bidirectional byte streams and transfers data between them.

```
$ chmod +x socketthing.py
$ socat - TCP:127.0.0.1:4444
hello computer
HELLO COMPUTER
$
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## User Limits

```
$ ulimit
unlimited
```

## Logged-In Users

### `last`

It is part of the `util-linux` package:

```
$ dpkg -S $(which last)
util-linux: /usr/bin/last
```

### `lastb`

It is part of the `util-linux` package:

```
$ dpkg -S $(which lastb)
util-linux: /usr/bin/lastb
```

### `who`

The [`who`] utility shows who is currently logged into the system.  It is part of the `coreutils` package:

```
$ dpkg -S $(which who)
coreutils: /usr/bin/who
```

If a file isn't provided as an argument, it will [`/var/run/utmp`].  It is common to use the [`/var/log/wtmp`] file in its place.

```
$ who
btoll    tty1         2023-02-13 15:06
```

Include the `-a|--all` switch to also print the current runlevel, time of last system boot, and more.

```
$ who -a
           system boot  2023-02-13 15:05
btoll    - tty1         2023-02-13 15:06  old         5897
           run-level 3  2023-02-13 15:06
```

> From the man page:
>
> There may be more users currently using the system, because not all programs use `utmp` logging.
>
> Warning: `utmp` must not be writable by the user class "other", because many system programs (foolishly) depend on its integrity.  You risk faked system logfiles and modifications of system files if you leave `utmp` writable to any user other than the owner and group owner of the file.

### `w`

The [`w`] utility shows who is logged on and what they are doing.

It is part of the `procps` package:

```
$ dpkg -S $(which w)
procps: /usr/bin/w
```

## `sudo`

[`visudo`]

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

[`TCP` Wrappers] is a host-based [access-control list] (`ACL`) system that uses a library named `libwrap` to filter network access to servers.

Initially, only super servers like `xinetd` got wrapped, but it has evolved to allow for common network service daemons such as `sshd` to be linked to `libwrap`.

`TCP` Wrappers is used by tools like [`Fail2ban`] because they can add and remove rules at runtime, which gives `TCP` Wrappers the benefit of runtime `ACL` reconfiguration.  This is beneficial for detecting errant behavior on-the-fly, and the services don't need to be reloaded or restarted since the rules aren't written to a daemon's configuration file.

For example, `Fail2ban` may add the `IP` addresses to temporarily block to `/etc/hosts.deny`.

Determining if a binary has been compiled with support (that is, it needs to be linked against the `libwrap.so` shared object) for `TCP` Wrappers is easy:

```
$ ldd $(which sshd) | grep libwrap
        libwrap.so.0 => /lib/x86_64-linux-gnu/libwrap.so.0 (0x00007fc7bb86e000)
$ ldd $(which pulseaudio) | grep libwrap
        libwrap.so.0 => /lib/x86_64-linux-gnu/libwrap.so.0 (0x00007f856458b000)
```

To filter traffic, add configurations to `/etc/hosts.allow` and `/etc/hosts.deny`.  The format for an entry is:

```
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
> ```
> $ gpg --dump-options
> ```

Also, a good command to know about is `gpgconf` in which you can query and modify configuration files in the `gnupg` home directory (usually `$HOME/.gnupg`):

```
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

```
$ sudo rngd -r /dev/urandom
```

The `-r` switch is shorthand for `--rng-device`.  The default file is `/dev/hwrng`.

> There is also a `--quick-gen-key|--quick-generate-key` option that isn't covered on the exam.

### Exporting

Export the public key in binary `OpenPGP` format:

```
$ gpg --export "Benjamin Toll" > benjam72.pub
$ file benjam72.pub
benjam72.pub: PGP/GPG key public ring (v4) created Tue Feb  7 15:16:39 2023 RSA (Encrypt or Sign) 3072 bits MPI=0xdf8388d842cbedfc...
```

Use the `-a|--armor` option to email the pubkey(s) (known as `ASCII` armor).  The following command sends prints the pubkey to `stdout`:

```
$ gpg --export --armor "Benjamin Toll"
-----BEGIN PGP PUBLIC KEY BLOCK-----

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
=pBo6
-----END PGP PUBLIC KEY BLOCK-----
```

### Importing

Import and merge keys.  These can be public or private keys, as well as key revocation certificates.

Import your best friend's public key:

```
gpg --import kilgore-trout.pub.key
```

Import a revocation certificate.  This will automatically revoke the respective key.

```
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

```
$ gpg --output revocation_file.asc --gen-revoke benjam72@yahoo.com
```

> A synonym of `--gen-revoke` is `--generate-revocation`.

To revoke the key, simply import (`--import`) the generated revocation certificate into your keyring.  When listing the key again, you will now see that it's been revoked:

```
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

```
$ echo whatever > foo-manchu.txt
$ gpg -c foo-manchu.txt
$ file foo-manchu.txt.gpg
foo-manchu.txt.gpg: GPG symmetrically encrypted data (AES256 cipher)
```

On my machine, it defaulted to using `AES256`, as seen from the output of the `file` command above.  However, you can choose another cipher with the inclusion of the `--cipher-algo` option.

```
$ gpg -c --cipher-algo BLOWFISH foo-manchu.txt
$ file foo-manchu.txt.gpg
foo-manchu.txt.gpg: GPG symmetrically encrypted data (BLOWFISH cipher)
```

To see what ciphers are supported, use the previous command with the `--version` switch:

```
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

```
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

```
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

```
$ gpg -d foo-manchu.txt.asc
```

This will write to `stdout` unless you specify an out file destination.

### Signing

A file can be signed and not encrypted.  Let's look at some examples to understand more fully.

Sign an unencrypted file with the default private key.   This will create a binary file with the `.gpg` extension if the `--output` option isn't given:

```
$ gpg --sign foo-manchu.txt
$ file foo-manchu.txt.gpg
foo-manchu.txt.gpg: data
```

Create a cleartext signature, that is, one that can be read without the need of any special software:

```
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

```
$ file foo-manchu.txt.sig
foo-manchu.txt.sig: data
```

> Use `--default-key` or `--local-user` to specify another private key to do the signing.

#### Sign and Encrypt

Symmetrically encrypt and sign:

```
$ gpg --symmetric --sign foo-manchu.txt
gpg: AES256 encryption will be used
$ file foo-manchu.txt.gpg
foo-manchu.txt.gpg: GPG symmetrically encrypted data (AES256 cipher)
```

Note that you can't encrypt and clearsign.  Of course, this makes sense:

```
$ gpg --symmetric --clearsign foo-manchu.txt
gpg: conflicting commands
```

Asymmetrically encrypt and sign for the `benjam72` recipient:

```
$ gpg --recipient benjam72 --encrypt --sign foo-manchu.txt
$ file foo-manchu.txt.gpg
foo-manchu.txt.gpg: PGP RSA encrypted session key - keyid: 07E146DE 62126CB0 RSA (Encrypt or Sign) 3072b .
```

You can encrypt more than one file at once using the `--multiline` switch:

```
$ gpg --recipient benjam72@yahoo.com --encrypt --multifile [f,m]oo-manchu.txt
$ file [f,m]oo-manchu.txt.gpg
foo-manchu.txt.gpg: PGP RSA encrypted session key - keyid: 07E146DE 62126CB0 RSA (Encrypt or Sign) 3072b .
moo-manchu.txt.gpg: PGP RSA encrypted session key - keyid: 07E146DE 62126CB0 RSA (Encrypt or Sign) 3072b .
```

### Deleting

Use `--delete-keys` to delete a public key from the keyring.  However, if there is also a secret key for the public key, then you will get a warning that you first must remove the secret private key:

```
$ gpg --delete-keys foo-manchu
gpg (GnuPG) 2.2.27; Copyright (C) 2021 Free Software Foundation, Inc.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

gpg: there is a secret key for public key "foo-manchu"!
gpg: use option "--delete-secret-keys" to delete it first.
```

You will be asked three or four times if you're sure that you want to remove the key:

```
$ gpg --delete-secret-keys foo-manchu
gpg (GnuPG) 2.2.27; Copyright (C) 2021 Free Software Foundation, Inc.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.


sec  rsa3072/FD717513DE6940D8 2023-02-17 foo-manchu <foo-manchu@example.com>

Delete this key from the keyring? (y/N) y
This is a secret key! - really delete? (y/N) y
```

You will then be able to remove the public key:

```
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

```
$ gpg --keyserver keyserver-name --send-keys KEY-ID
```

For others to then get the key from a keyserver:

```
$ gpg --keyserver keyserver-name --recv-keys KEY-ID
```

### `gpg-agent`

The [`gpg-agent`] is a daemon that stores keys in memory.  When `gpg` needs to perform an operation, it will ask the daemon for the key material, and if it doesn't have it, will get it from the keyring, thus prompting for a password (and raising your [`pinentry`] program).

Essentially, it stores keys in memory so you don't have to keep entering passphrases every time you invoke `gpg`.

Like its cousin `gpg`, the `gpg-agent` has a switch to dump all of its available options and commands:

```
$ gpg-agent --dump-options
```

# References

- [LPIC-1 Objectives V5.0](https://wiki.lpi.org/wiki/LPIC-1_Objectives_V5.0#Objectives:_Exam_102)
- [LPIC-1 Learning Materials](https://learning.lpi.org/en/learning-materials/102-500/)
- [Securing your network: An introduction to TCP wrappers](https://www.computerworld.com/article/2833484/securing-your-network-an-introduction-to-tcp-wrappers.html)
- [Linux manual pages: section 5](https://man7.org/linux/man-pages/dir_section_5.html)
- [`GnuPG` manual](https://gnupg.org/documentation/manuals/gnupg/)
- [Forwarding gpg-agent to a remote system over SSH](https://wiki.gnupg.org/AgentForwarding)

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

