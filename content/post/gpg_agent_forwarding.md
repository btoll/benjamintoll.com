+++
title = "On gpg-agent Forwarding"
date = "2023-06-07T02:04:32-04:00"

+++

- [Introduction](#introduction)
- [Requirements](#requirements)
- [What is `gpg-agent` Forwarding?](#what-is-gpg-agent-forwarding)
- [`gpgconf`](#gpgconf)
    + [Components](#components)
    + [Directories](#directories)
    + [`kill`](#kill)
- [Preflight](#preflight)
    + [`gpg-preset-passphrase`](#gpg-preset-passphrase)
    + [Key Cache](#key-cache)
        - [Listing](#listing)
        - [Clearing](#clearing)
    + [No Agent On Remote Machine](#no-agent-on-remote-machine)
- [About the `agent-extra-socket`](#about-the-agent-extra-socket)
- [Putting It All Together](#putting-it-all-together)
- [References](#references)

---

I'm running Debian `bullseye` on both the local and remote machines.

---

## Introduction

[`gpg-agent`] forwarding is notoriously difficult and frustrating.  It has been known to age developers ten years overnight.  The mere mention of it will have you scorned from polite company.

I've found myself looking into it again, since I'm starting to create my own `deb` and `RPM` packages and serve them from a custom `APT` repository.  I want to automate this as much as possible, which is why I'm (again) configuring `gpg-agent` forwarding to automate the signing of these packages.

I first encountered `gpg-agent` forwarding when I was working for a startup in Boston, and I helped to create and maintain the pipeline that built its software.  These build artifacts were packages for both Debian-based and RHEL-based systems, and they were added to their respective repositories, which I also had a hand in designing.

It was great fun, and I learned a lot.  There's something about packaging that really butters my buns.

## Requirements

You'll need:

- [`GnuPG`] >= 2.1.1 on **both** machines

- [`OpenSSH`] >= 6.7 on the local machine

If your machine doesn't have at least those versions and you can't update, then you can still make the forwarding work, but it is outside the scope of this article.

## What is `gpg-agent` Forwarding?

The [`gpg-agent`] is a daemon that manages secret keys.  There are Unix sockets that are used to communicate with it, such as used by the `gpg-connect-agent` program.

When one of these Unix sockets is forwarded to another machine (very much like what happens with the better-known `ssh-agent` forwarding), it enables that other remote machine to act as a client to the server process daemon on the original local machine.

Importantly, the private keys never leave the local machine (the machine that initiated the forwarding).  Instead, the `gpg-agent` running on the initiating machine performs actions using the key(s) on behalf of this remote client and sends it back using the forwarded socket.

## `gpgconf`

Before looking at the setup for `gpg-agent` forwarding, let's take a little side trip and look at how we can determine where programs and sockets of the `GnuPG` framework are installed on the system, as this is information that we'll need to know to set up the forwarding.

> The `gpgconf` program was not designed to be invoked manually.  Instead, it's to be used as the backend to a `GUI` editor.  From the man page:
>
> <cite>`gpgconf` provides the backend of a configuration editor.  The configuration editor would usually be a graphical user interface program that displays the current options, their default values, and allows the user to make changes to the options.</cite>

### Components

You can get information about components of the [`GnuPG`] framework using the [`gpgconf`] utility and the `--list-components` command.

```bash
$ gpgconf --list-components
gpg:OpenPGP:/usr/bin/gpg
gpg-agent:Private Keys:/usr/bin/gpg-agent
scdaemon:Smartcards:/usr/lib/gnupg/scdaemon
gpgsm:S/MIME:/usr/bin/gpgsm
dirmngr:Network:/usr/bin/dirmngr
pinentry:Passphrase Entry:/usr/bin/pinentry
```

Here, for example, we see that the `gpg-agent` binary is located in `/usr/bin`.

### Directories

More useful for our purposes is the `--list-dirs` command.  We'll use it to get three crucial pieces of information we need to establish the forwarding:

1. The location of the `gpg-preset-passphrase` utility.
    - `gpgconf --list-dirs libexecdir`
1. The location of the `agent-socket` on the remote machine.
    - `gpgconf --list-dirs agent-socket`
1. The location of the `agent-socket` on the local machine.
    - `gpgconf --list-dirs agent-socket`

Usually, the latter two will be the same, but you shouldn't count on that.

List all of the directories used by `gpgconf` (of course, this lists sockets, too):

```bash
$ gpgconf --list-dirs
sysconfdir:/etc/gnupg
bindir:/usr/bin
libexecdir:/usr/lib/gnupg
libdir:/usr/lib/x86_64-linux-gnu/gnupg
datadir:/usr/share/gnupg
localedir:/usr/share/locale
socketdir:/run/user/1000/gnupg
dirmngr-socket:/run/user/1000/gnupg/S.dirmngr
agent-ssh-socket:/run/user/1000/gnupg/S.gpg-agent.ssh
agent-extra-socket:/run/user/1000/gnupg/S.gpg-agent.extra
agent-browser-socket:/run/user/1000/gnupg/S.gpg-agent.browser
agent-socket:/run/user/1000/gnupg/S.gpg-agent
homedir:/home/btoll/.gnupg
```

The socket files and `homedir` lines are the default names and can be overridden by command-line switches, but we don't need to do that to set up the agent forwarding.

You can also get specific information on an individual listing by specifying it as an optional `name` to the `--list-dirs` command:

```bash
$ gpgconf --list-dirs libexecdir
/usr/lib/gnupg
$ gpgconf --list-dirs agent-socket
/run/user/1000/gnupg/S.gpg-agent
```

### `kill`

If you need to kill and restart the agent, here are some ways to do it.

Kill the `gpg-agent`:

```bash
$ gpgconf --kill gpg-agent
```

Kill all the `GnuPG` components that run as daemons (such as `gpg-agent`, [`dirmngr`] and [`scdaemon`]):

```bash
$ gpgconf --kill all
```

To restart the daemon, simply do:

```bash
$ gpg-connect-agent /bye
```

> You can also kill the agent using the [`Assuan` IPC protocol] with `gpg-connect-agent`:
>
> ```bash
> $ gpg-connect-agent "KILLAGENT" /bye
> OK closing connection
> ```

## Preflight

Now, let's finally start looking at setting up the forwarding by looking at some "preflight" steps that need to be done.

> Note that *preflight* is not a term that I've seen used in the `GnuPG` documentation, it's only what I've chosen to call this section.

There are two things that absolutely must be set before `ssh`ing into the remote machine:

1. The public key **must** be on the remote machine.
    - There are several ways the key can be imported into the remote machine's keyring.  Perhaps the easiest is to download it from a public keyserver.

1. The passphrase of the signing key **must** be in the `gpg-agent` cache.
    - The is done via the [`gpg-preset-passphrase`] utility.
    - Note that you can seed the cache with the wrong passphrase, you will not get a warning for entering the wrong passphrase.  Be mindful when using this utility.  You don't want to waste time debugging an issue that turns out to be a bad passphrase.
    - Also, the forwarding will be successfully setup even if the key cache hasn't been seeded with a passphrase.  In other words, you could `ssh` into the machine and run `gpg --list-secret-keys` and get a listing, but it won't fail until the actual signing operation is attempted.

1. The `gpg-agent` daemon should not be running on the remote machine.

> The order in which you address these operations doesn't matter.

The first item is straightforward, but let's look at the caching of the passphrase a bit more closely.  For instance, some of the questions I had were:

- What program in the `GnuPG` framework is used to cache a passphrase?
- How can you tell if a passphrase has already been cached?
- If you need to, how do you clear the key cache?

I'll address each question in the following subsections.

### `gpg-preset-passphrase`

The [`gpg-preset-passphrase`] tool, as has been mentioned, is what is used to cache a key's passphrase.  It is perfect for automation, as it is intended to be used by unattended machines.

> `GnuPG` version 1 is not supported.

However, it doesn't seem to be in our `PATH`:

```bash
$ gpg-preset-passphrase
-bash: gpg-preset-passphrase: command not found
```

And, [`whereis`] only shows the location of the man page:

```bash
$ whereis gpg-preset-passphrase
gpg-preset-passphrase: /usr/share/man/man1/gpg-preset-passphrase.1.gz
```

So, what's up, chickenbutt?

Well, the `gpg-preset-passphrase` tool, and several others, are in a location that's not in the `PATH` variable.  I'm not really sure why, to be honest.  But, fortunately, there's a sure way to always determine where to find it and then invoke it.

> If you're using the [`updatedb`] tool to keep the file databases used by the [`locate`] tool up-to-date, the binary is easy to find:
>
> ```bash
> $ locate gpg-preset-passphrase
> /home/btoll/projects/gpg-agent-forwarding/gpg-preset-passphrase.sh
> /home/btoll/projects/vagrantfiles/debian/.gpg-preset-passphrase.sh.swp
> /home/btoll/projects/vagrantfiles/debian/gpg-preset-passphrase.sh
> /usr/lib/gnupg/gpg-preset-passphrase
> /usr/lib/gnupg2/gpg-preset-passphrase
> /usr/share/man/man1/gpg-preset-passphrase.1.gz
> ```

To find the location of the directory that contains `gpg-preset-passphrase`, we'll use our new friend `gpgconf`.  Instead of listing every directory, we'll just find the location of the `libexecdir` location, since that is what we're interested in.  Below, we print the location of the directory and then list its contents:

```bash
$ gpgconf --list-dirs libexecdir
/usr/lib/gnupg
$ ls $(gpgconf --list-dirs libexecdir)
dirmngr_ldap  gpg-check-pattern  gpg-preset-passphrase  gpg-protect-tool  gpg-wks-client
```

There's the little fella!

We'll see later how this is used in the context of a larger program, but for now, here is how it is used:

```bash
$ $(gpgconf --list-dirs libexecdir)/gpg-preset-passphrase --preset "$KEYGRIP"
```

### Key Cache

#### Listing

You can list the keys that `gpg-agent` knows about and if any of their passphrases are cached by doing the following:

```bash
$ gpg-connect-agent "KEYINFO --list" /bye
S KEYINFO 6824F6963CC67E731E0BA79EDFFF3FEB42DC0E43 D - - - P - - -
S KEYINFO 03AB58E3686A6C1D288EC8009156B1DE64C38C9D D - - - P - - -
S KEYINFO 4F3E5A4A35E96F887980FE166ADB3AEB4D02766E D - - - P - - -
S KEYINFO 24883CDCA7D5E7D9C1606552CED27A304DE8FCE4 D - - 1 P - - -
S KEYINFO 9F15BF1B9E3B5B320B1710E0DEDFAB3C8D26770E D - - - P - - -
S KEYINFO 0AC061ADBD7F955B003FDCBE55661A918276005A D - - - P - - -
OK
```

Here we see that there are six keys, and one has had its passphrase cached.  We know that because of the `1` in the listing (note, however, that entering the wrong passphrase will still have a `1` show up as a cached passphrase).

If we pass just the keygrip, we'll get just its listing:

```bash
$ gpg-connect-agent "KEYINFO 24883CDCA7D5E7D9C1606552CED27A304DE8FCE4" /bye
S KEYINFO 24883CDCA7D5E7D9C1606552CED27A304DE8FCE4 D - - 1 P - - -
OK
```

The important bits about that line are the following:

|**Field** |**Value** |**Description** |
|:---|:---|:---|
|`TYPE` |`D` |It's a regular key stored on disk. |
|`CACHED` |`1` |The key's passphrase was found in the key cache. |
|`PROTECTION` |`P` |The key is protected by a passphrase. |

> To get the full table details and descriptions for each field, run:
>
> ```bash
> $ gpg-connect-agent "HELP KEYINFO" /bye
> ```

Since the `gpg-agent` socket has been forwarded, you can list the same information once you've logged into the remote server, since the agent forwarded by `ssh` will send the request back to the agent running on the local machine, which then forwards the response back to the server.

So, on the server, you can see that you get the same information:

```bash
+ gpg-connect-agent "KEYINFO --list" /bye
S KEYINFO 6824F6963CC67E731E0BA79EDFFF3FEB42DC0E43 D - - - P - - -
S KEYINFO 03AB58E3686A6C1D288EC8009156B1DE64C38C9D D - - - P - - -
S KEYINFO 4F3E5A4A35E96F887980FE166ADB3AEB4D02766E D - - - P - - -
S KEYINFO 24883CDCA7D5E7D9C1606552CED27A304DE8FCE4 D - - 1 P - - -
S KEYINFO 9F15BF1B9E3B5B320B1710E0DEDFAB3C8D26770E D - - - P - - -
S KEYINFO 0AC061ADBD7F955B003FDCBE55661A918276005A D - - - P - - -
OK
```

#### Clearing

In case you entered a bad passphrase, you should know how to clear the cache.

There are several ways to clear it, of course, and here I'll just line that involves sending the `gpg-agent` the `SIGHUP` signal.  First, we'll show that one passphrase has indeed been cached, then we'll restart the agent and demonstrate that nothing is in the key cache:

```bash
+ gpg-connect-agent "KEYINFO --list" /bye
S KEYINFO 6824F6963CC67E731E0BA79EDFFF3FEB42DC0E43 D - - - P - - -
S KEYINFO 03AB58E3686A6C1D288EC8009156B1DE64C38C9D D - - - P - - -
S KEYINFO 4F3E5A4A35E96F887980FE166ADB3AEB4D02766E D - - - P - - -
S KEYINFO 24883CDCA7D5E7D9C1606552CED27A304DE8FCE4 D - - 1 P - - -
S KEYINFO 9F15BF1B9E3B5B320B1710E0DEDFAB3C8D26770E D - - - P - - -
S KEYINFO 0AC061ADBD7F955B003FDCBE55661A918276005A D - - - P - - -
OK
$ pkill -SIGHUP gpg-agent
+ gpg-connect-agent "KEYINFO --list" /bye
S KEYINFO 6824F6963CC67E731E0BA79EDFFF3FEB42DC0E43 D - - - P - - -
S KEYINFO 03AB58E3686A6C1D288EC8009156B1DE64C38C9D D - - - P - - -
S KEYINFO 4F3E5A4A35E96F887980FE166ADB3AEB4D02766E D - - - P - - -
S KEYINFO 24883CDCA7D5E7D9C1606552CED27A304DE8FCE4 D - - - P - - -
S KEYINFO 9F15BF1B9E3B5B320B1710E0DEDFAB3C8D26770E D - - - P - - -
S KEYINFO 0AC061ADBD7F955B003FDCBE55661A918276005A D - - - P - - -
OK
```

The passphrase for the signing key referenced by the keygrip `24883CDCA7D5E7D9C1606552CED27A304DE8FCE4` has been cleared from the cache (the `1` has been removed from its listing).

> You can also clear the `gpg-agent` cache by killing the daemon using the `gpgconf` command:
> ```bash
> $ gpgconf --kill gpg-agent
> ```

Just as we ran the same query on both machines to prove that the `gpg-agent` on the local machine had indeed been forwarded to the remote machine, we can clear the agent cache on the local machine and then see that its reflected when we run the same command on the server.

> To see this, you'll need to have be running two terminals.  Log into the server on the second terminal, clear the cache in the first terminal on the local machine, and then see the same results when running the command again in the second terminal.
>
> Of course, if you'd then try to run a build on the server, the `pinentry` would be raised in the first terminal on the local machine because the agent no longer has the passphrase in its cache and will be asking for it again.

### No Agent On Remote Machine

**`gpg` should not be running on the remote machine.**

If it is, it will have replaced the forwarded socket with its own.  This is a huge problem, because it will **not** allow signing because the connection with the local machine will not have been established.

There are a couple of ways to address it.  If you have access to the remote machine, the surest way to not have an agent started **and** remove any forwarded socket is to add one line to each of the following configuration files:
- `$HOME/.gnupg/gpg.conf`
- [`/etc/ssh/sshd_config`]

Let's look at `gpg.conf` first.

If you get the following message, it means that the remove system started its own `gpg-agent` daemon and its socket files are being used instead of the one forwarded from the local machine.

```bash
Warning: remote port forwarding failed for listen path /run/user/1000/gnupg/S.gpg-agent
```

```bash
$ ssh vagrant-signing ls /run/user/1000/gnupg
Warning: Permanently added '[127.0.0.1]:2222' (ECDSA) to the list of known hosts.
Warning: remote port forwarding failed for listen path /run/user/1000/gnupg/S.gpg-agent
S.dirmngr
S.gpg-agent
S.gpg-agent.browser
S.gpg-agent.extra
S.gpg-agent.ssh
```

The recommended way to fix this is to ensure that a `gpg-agent` daemon isn't started on the remote machine.  The best way to do this is to include the `no-autostart` directive in the `gpg.conf` configuration:

```bash
echo no-autostart >> "$HOME/.gnupg/gpg.conf"
```

Now, we can be sure that nothing will override the forwarded socket from the local machine to the remote one.

However, if you're not able to augment the `gpg` configuration, you'll have to resort to removing the `gpg-agent` socket on the server before setting up the forwarding.  You'd need to do something like this:

```bash
$ ssh vagrant-signing rm /run/user/1000/gnupg/S.gpg-agent
```

Then, log in as usual, and the forwarding will be successful because the overriding socket from the remote machine's running daemon has been deleted.

In other words, you should not get this warning when logging in:

```bash
Warning: remote port forwarding failed for listen path /run/user/1000/gnupg/S.gpg-agent
```

> Unfortunately, you'll have to remove the remote socket every time **before** you actually log in.

---

Next, let's take a look at what needs to be added to the [`/etc/ssh/sshd_config`] file:

```bash
$ echo "StreamLocalBindUnlink yes" | sudo tee -a /etc/ssh/sshd_config
```

What is the `StreamLocalBindUnlink` option?  From the [`ssh_config`] man page:

<cite>Specifies whether to remove an existing Unix-domain socket file for local or remote port forwarding before creating a new one.  If the socket file already exists and `StreamLocalBindUnlink` is not enabled, `ssh` will be unable to forward the port to the Unix-domain socket file.  This option is only used for port forwarding to a Unix-domain socket file.</cite>

What does this mean?  Well, even if a `gpg-agent` daemon isn't started on the remote machine, if the forwarded socket isn't removed on logout, then we still have the same problem of having to remove it before logging in.

For instance, this is what happens when the socket isn't unlinked.  Here, I've logged back into the remote system and am using `gpg-connect-agent` to communicate with the running `gpg-agent` daemon.  If the remote forwarded worked, then we should see the same information as we would if the command were run on the local machine (i.e., a list of keys and an indication that there is a cached passphrase).

Instead, we get this:

```bash
$ gpg-connect-agent "KEYINFO --list" /bye
gpg-connect-agent: no running gpg-agent - starting '/usr/bin/gpg-agent'
gpg-connect-agent: waiting for the agent to come up ... (5s)
gpg-connect-agent: connection to agent established
OK
$ gpg-connect-agent "KEYINFO --list" /bye
OK
```

Clearly, it's not communication with the forwarded socket.  So, this is why the socket needs to be removed every time.  But, if we add the proper option to the `ssh` daemon config and restart the service, we'll be in business:

```bash
$ sudo systemctl restart sshd
```

## About the `agent-extra-socket`

Even though the docs suggested I use the extra `gpg-agent` socket (`S.gpg-agent.extra`), I found that I could never do the signing when I did.  It appeared as though the forwarding had worked (for instance, running `gpg -K` showed the private key **and** it had the agent had cached the passphrase), but whenever I attempted to sign it would fail.

So, I ended up using the `S.gpg-agent` socket.

Also, make sure you get the order correct when setting up the `RemoteForward` `ssh` config:

```conf
RemoteForward <socket_on_remote_box>  <extra_socket_on_local_box>
```

Here is my full `ssh` config on the local machine:

```conf
Host vagrant-signing
        HostName                127.0.0.1
        User                    vagrant
        Port                    2222
        ForwardAgent            yes
        IdentityFile            ~/projects/vagrantfiles/debian/.vagrant/machines/default/virtualbox/private_key
        RemoteForward           /run/user/1000/gnupg/S.gpg-agent /run/user/1000/gnupg/S.gpg-agent
        StreamLocalBindUnlink   yes
        StrictHostKeyChecking   no
        UserKnownHostsFile      /dev/null
```

> Again, I needed to use the `S.gpg-agent` socket on the local machine **not** the `S.gpg-agent.extra` socket as described in [the official documentation].

You may find that the  `agent-extra-socket` works great for as advertised by the official docs.  Clearly, it didn't for me, and I wanted to document this in case others are also having issues with it.

## Putting It All Together

I've create a [`gpg-agent-forwarding` project on GitHub] that is simply delightful.  It consists of three ways to create and sign two `deb` packages (both a binary package and a source package).

I encourage readers to look at the [`systemd-nspawn` project], the [`vagrant` project] and the [`docker` project] to see how everything we've gone over here comes together.

The latter projects are both using Vagrant, because the last thing I want to do is install the dreaded Docker software on my personal machine.  I mean, I'm not crazy.

[I've said it before] in a previous article, but it's worth mentioning again.  If you're running a distro that is using [`systemd`] as the [`init`] system, why would you use anything but `systemd-nspawn` for your personal containers?

There's no need to install any software on your machine that opens up a giant security hole, and it's far, far easier to get a container running than the other methods documented in that repository (although, to be fair, virtual machines shouldn't be compared to containers, it's apples to oranges).

## References

- [`gpg-agent-forwarding` project on GitHub]
- [Using the GNU Privacy Guard](https://www.gnupg.org/documentation/manuals/gnupg/)
- [Forwarding gpg-agent to a remote system over SSH](https://wiki.gnupg.org/AgentForwarding)
- [How does GPG agent work?](https://unix.stackexchange.com/questions/188668/how-does-gpg-agent-work)
- [GnuPG Man Pages](https://www.gnupg.org/documentation/manpage.en.html)

[`GnuPG`]: https://wiki.gnupg.org/GnuPG
[`OpenSSH`]: https://www.openssh.com/
[`gpgconf`]: https://www.gnupg.org/documentation/manuals/gnupg24/gpgconf.1.html
[`gpg-agent`]: https://www.gnupg.org/documentation/manuals/gnupg24/gpg-agent.1.html
[`gpg-preset-passphrase`]: https://www.gnupg.org/documentation/manuals/gnupg/Invoking-gpg_002dpreset_002dpassphrase.html
[`dirmngr`]: https://www.gnupg.org/documentation/manuals/gnupg24/dirmngr.8.html
[`scdaemon`]: https://www.gnupg.org/documentation/manuals/gnupg24/scdaemon.1.html
[the official documentation]: https://wiki.gnupg.org/AgentForwarding#SSH_Configuration
[`Assuan` IPC protocol]: https://www.gnupg.org/documentation/manuals/assuan/
[`whereis`]: https://man7.org/linux/man-pages/man1/whereis.1.html
[`updatedb`]: https://man7.org/linux/man-pages/man1/updatedb.1.html
[`locate`]: https://man7.org/linux/man-pages/man1/locate.1.html
[`/etc/ssh/sshd_config`]: https://man7.org/linux/man-pages/man5/sshd_config.5.html
[`ssh_config`]: https://www.man7.org/linux/man-pages/man5/ssh_config.5.html
[`gpg-agent-forwarding` project on GitHub]: https://github.com/btoll/gpg-agent-forwarding
[`systemd-nspawn` project]: https://github.com/btoll/gpg-agent-forwarding/tree/master/systemd-nspawn
[`vagrant` project]: https://github.com/btoll/gpg-agent-forwarding/tree/master/vagrant
[`docker` project]: https://github.com/btoll/gpg-agent-forwarding/tree/master/docker
[I've said it before]: /2022/02/04/on-running-systemd-nspawn-containers/
[`systemd`]: https://man7.org/linux/man-pages/man1/init.1.html
[`init`]: https://en.wikipedia.org/wiki/Init

