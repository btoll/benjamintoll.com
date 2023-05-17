+++
title = "On the Provenance of Installed Software"
date = "2022-01-05T13:39:47Z"

+++

When I'm working on an assignment, I do my best not to sully my work laptop with whatever trendy and/or bloated software the client is using by isolating their environment from mine using virtual environments and containers.  It's hard, though, to keep that high level of isolation, and things sometimes get installed on my host environment.

This happened recently after working at BeeperDoody when I realized that I had unwittingly installed their provisioning software.  However, I had little memory of doing this, and, since I couldn't quite remember how I had installed it, I wasn't sure how to uninstall it.

Why is it important, though, to know **how** a particular piece of software was installed?  Why not find out where the binary is on the system and just `rm` it out of existence?

Let's see why that may not be such a great idea, and at the same time use a couple of tools to find the provenance of the installed software.

---

First, since we'll first be looking at a tool that, in addition to other nice features, deals with packages that have been installed by the [package manager], let's quickly enumerate some of the benefits of using one.

The package manager assists with and takes the pain out of:

- Installing dependencies.
- Installing configuration in `/etc` and other directories.
- Installing `systemd` services.
- Installing man pages in `/usr/share/man`.
- Managing upgrades, which could include not only new features but bug fixes and security updates.

Of course, the inverse operations are equally important when removing a package.

> As a thought experiment, imagine installing and removing packages without the use of a package manager.
>
> You'd have to figure out the dependency graph on your own and install every package and its dependencies, as well as all of the configuration and documentation for all the packages in the graph.
>
> Getting everything to install is probably the simpler chore; when removing, you could easily break multiple installations by deleting a dependency of other packages.

---

Ok, let's say I have some horrible software installed as a binary on my system that's stinking up the place, and I won't be able to get a decent night's sleep until it's removed.

Let's first find out where it's living.  Use any of the following to determine its location:

```bash
$ which knife
/usr/bin/knife
$ whereis knife
knife: /usr/bin/knife
$ command -v knife
/usr/bin/knife
```

> Incidentally, the last command [`command`] is a [Bash shell builtin], which means that the function `command` was loaded into memory when the shell was started.  Not only is this faster to execute, but it doesn't create a separate process to run the command.
>
> ```bash
> $ builtin --help
> builtin: builtin [shell-builtin [arg ...]]
>     Execute shell builtins.
>
>     Execute SHELL-BUILTIN with arguments ARGs without performing command
>     lookup.  This is useful when you wish to reimplement a shell builtin
>     as a shell function, but need to execute the builtin within the function.
>
>     Exit Status:
>     Returns the exit status of SHELL-BUILTIN, or false if SHELL-BUILTIN is
>     not a shell builtin.
> ```
>
> Here are two ways to find out if the program is a builtin (there are probably more):
>
> ```bash
> $ builtin command
> $ echo $?
> 0
> $ type -t command
> builtin
> ```

Well, that's nice.  We now know the path(s) of the executable that's in our `PATH`.  Now, what is the best way to determine if the package was installed by the package manager?

For this, we'll turn to the [`dpkg`] program and its ability to find a package's owning file using the `-S` flag.  This will search for the given filename among all of the installed packages.

```bash
$ dpkg -S $(command -v knife)
chef: /usr/bin/knife
```

This tells us that Chef is the owning file (remember that everything in Linux is a file).

> If `dpkg -S` doesn't yield anything, you can try just the package name itself instead of the absolute path.
>
> This will often reveal a lot of information, including if it's a symbolic link (which may have been the reason `dpkg -S /absolute/path/to/filename` may not have returned anything useful.

At this point, I experienced a painful flashback where I recall clearly having had to install this software at gunpoint, and so now I quickly remove it via my package manager and fall to the floor, sweaty and exhausted:

```bash
$ sudo apt purge chef -y
$ knife
-bash: /usr/bin/knife: No such file or directory
```

At this point, you may by wondering if it is possible to determine when the package was installed.  Yes, yes, it is!

Let's check the logs, Beavis!

Below, we see that the most recent log file contains about three days worth of information.  However, the information we're seeking won't be contained in this file, because I know for a fact that the dreaded software was installed sometime in 2021.

```bash
$ head -1 /var/log/dpkg.log ; tail -1 /var/log/dpkg.log
2022-01-03 01:37:22 startup archives unpack
2022-01-05 15:33:17 status installed systemd:amd64 245.4-4ubuntu3.13

or

$ ( cat /var/log/dpkg.log | tee /dev/fd/3 | head -1 ) 3> >( tail -1 )
2022-01-03 01:37:22 startup archives unpack
2022-01-05 15:33:17 status installed systemd:amd64 245.4-4ubuntu3.13
```

> That second example is [using file descriptors like a boss]!

Since I know that [`logrotate`] is managing the logs automatically, I'll list the directory and then grep the other logs for the date of installation:

```bash
$ ls -1 /var/log/dpkg.log*
/var/log/dpkg.log
/var/log/dpkg.log.1
/var/log/dpkg.log.2.gz
/var/log/dpkg.log.3.gz
/var/log/dpkg.log.4.gz
/var/log/dpkg.log.5.gz
/var/log/dpkg.log.6.gz
/var/log/dpkg.log.7.gz
```

```bash
$ for log in $(ls /var/log/dpkg*)
> do
> if zgrep -E "\binstall\b.*\bchef\b" $log
> then
> echo -n "[Log file] $log\n"
> fi
> done
2021-11-16 13:06:30 install ruby-chef-utils:all <none> 15.8.25.3.gcf41df6a2-6
2021-11-16 13:06:30 install ruby-chef-config:all <none> 15.8.25.3.gcf41df6a2-6
2021-11-16 13:06:32 install chef-zero:all <none> 15.0.0-2
2021-11-16 13:06:33 install chef:all <none> 15.8.25.3.gcf41df6a2-6
2021-11-16 13:06:33 install chef-bin:all <none> 15.8.25.3.gcf41df6a2-6
[Log file] /var/log/dpkg.log.2.gz

```

Ok, it was installed on November 16 at a little after 1pm ET.

Before we proceed, let's use that `for` statement as the core for a reusable Bash function:

```bash
dpkg_search() {
    local package="$1"
    local state="$2"

    if [ -z "$package" ] || [ -z "$state" ]
    then
        echo "[Usage] dpkg_search PACKAGE STATE"
    else
        for log in $(ls /var/log/dpkg*)
        do
            local re='\b'"$state"'\b.*'"$package"''
            local res="$(zgrep -E $re $log)"

            if [ "$res" = "" ]
            then
                echo "$(tput setaf 1)[No match]$(tput sgr0) $log"
            else
                echo "$(tput setaf 2)[Match]$(tput sgr0) $log"
                echo "$res"
            fi
        done
    fi
}
```

Now, we can query `dkpg` for any package in any state.

```bash
$ dpkg_search
[Usage] dpkg_search PACKAGE STATE
$ dpkg_search chef purge
[Match] /var/log/dpkg.log
2022-01-05 15:33:17 purge chef:all 15.8.25.3.gcf41df6a2-6 <none>
[No match] /var/log/dpkg.log.1
[No match] /var/log/dpkg.log.2.gz
[No match] /var/log/dpkg.log.3.gz
[No match] /var/log/dpkg.log.4.gz
[No match] /var/log/dpkg.log.5.gz
[No match] /var/log/dpkg.log.6.gz
[No match] /var/log/dpkg.log.7.gz
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

Note that it's also possible to search through the zipped logs using pagers `zless` and `zmore`.

> As an aside, let's see what was logged when we purged the bloated Chef software above:
>
>     2022-01-05 15:33:17 purge chef:all 15.8.25.3.gcf41df6a2-6 <none>
>     2022-01-05 15:33:17 status config-files chef:all 15.8.25.3.gcf41df6a2-6
>     2022-01-05 15:33:17 status triggers-pending systemd:amd64 245.4-4ubuntu3.13
>     2022-01-05 15:33:17 status triggers-pending ureadahead:amd64 0.100.0-21
>     2022-01-05 15:33:17 status not-installed chef:all <none>
>     2022-01-05 15:33:17 startup packages configure
>     2022-01-05 15:33:17 trigproc ureadahead:amd64 0.100.0-21 <none>
>     2022-01-05 15:33:17 status half-configured ureadahead:amd64 0.100.0-21
>     2022-01-05 15:33:17 status installed ureadahead:amd64 0.100.0-21
>     2022-01-05 15:33:17 trigproc systemd:amd64 245.4-4ubuntu3.13 <none>
>     2022-01-05 15:33:17 status half-configured systemd:amd64 245.4-4ubuntu3.13
>     2022-01-05 15:33:17 status installed systemd:amd64 245.4-4ubuntu3.13

---

Next, we'll look at [`apt-file`].  Unlike the previous two, this searches not only installed packages but packages that are not installed and in remote repositories.

Here is a succinct definition from [Debian's `apt-file` wiki page]:

`apt-file is a software package that indexes the contents of packages in your available repositories and allows you to search for a particular file among all available packages.`

```bash
$ sudo apt install apt-file
```

After installing, it's necessary to create the database and index it by parsing all of the available repositories:

```bash
$ sudo apt-file update
```

And finally, to find the package to which `lmnsd_ptcp.so` belongs:

```bash
$ apt-file search lmnsd_ptcp.so
rsyslog: /usr/lib/x86_64-linux-gnu/rsyslog/lmnsd_ptcp.so
```

> The path after the package name shows where the file will be installed if the package is installed.

---

Lastly, what does one do when discovering that the executable in question wasn't installed by the package manager?  [Thoughts and prayers]?

For example, some soulless ghoul seems to have installed `aws` on the system.  As directed, we first use our new friend `dpkg` to find the installed package the file belongs to:

```bash
$ which aws
/usr/local/bin/aws
$ dpkg -S $(which aws)
dpkg-query: no path found matching pattern /usr/local/bin/aws
```

Alas, no luck there!  Let's try to force a purge:

```bash
$ sudo apt purge aws
Reading package lists... Done
Building dependency tree
Reading state information... Done
E: Unable to locate package aws
```

In a panic, I contemplated life alongside `aws`, unsure if I could go on.

But wait, I thought.  The fact that it's installed in `/usr/local` is a clue that this is indeed a manual installation that would be safe to remove by manual deletion.  You couldn't possibly know, dear reader, that I move software that doesn't have a viable package via my package manager to `/opt`, from which I then unpack the tarball and move to `/usr/local` (in most cases).

Let's list that directory, with more thoughts and prayers!

```bash
$ ls /opt
aws  awscliv2.zip  containerd  ngrok-stable-linux-amd64.zip  nomad  tmux-3.2  vagrant
```

There it is, the little bugger!  Let's take great pleasure in nuking it from the system:

```bash
$ rm -rf /opt/aws*
```

I think I just piddled.

[package manager]: https://en.wikipedia.org/wiki/Package_manager
[`dpkg`]: https://www.man7.org/linux/man-pages/man1/dpkg.1.html
[`apt-file`]: https://www.commandlinux.com/man-page/man1/apt-file.1.html
[Debian's `apt-file` wiki page]: https://wiki.debian.org/apt-file
[`command`]: https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html
[Bash shell builtin]: https://en.wikipedia.org/wiki/Shell_builtin
[using file descriptors like a boss]: https://stackoverflow.com/a/20388399
[`logrotate`]: https://www.man7.org/linux/man-pages/man8/logrotate.8.html
[Thoughts and prayers]: https://www.thoughtsandprayersthegame.com/

