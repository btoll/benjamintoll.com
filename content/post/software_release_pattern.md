+++
title = "On a Software Release Pattern"
date = "2023-08-16T14:52:16-04:00"

+++

This is a quick post to give a brief overview of a software package and release pattern that I use for my projects written in C and Go.

---

- [What's Up, Buttercup?](#whats-up-buttercup)
- ["Tech Stack"](#tech-stack)
- [FAQ](#faq)
- [References](#references)

---

## What's Up, Buttercup?

The idea is automate<sup>1</sup> the entire process, which I'll quickly outline:

1. [`git-package-and-release`](https://github.com/btoll/dotfiles/blob/master/git-tools/bin/git-package-and-release)
    + example:
        ```
        git package-and-release --create --tag 1.0.0
        ```
    + checks out the `master` branch in the project directory
        - creates a new tag and `GPG` signs it
        - checks out the new tag
    + creates the `debian/master` branch
        - this branch contains the `debian` directory that contains the packaging information
        - merges `master` into `debian/master`
        - creates a new tag, prefaced by `debian/`
        - checks out the new tag
    + creates the packages in a `systemd-nspawn` container
        - `GPG` signs the package build artifacts

1. [`systemd-nspawn`](https://www.man7.org/linux/man-pages/man5/systemd.nspawn.5.html)
    + the packaging is done in the [`deb-packaging` machine](https://github.com/btoll/machines/tree/master/deb-packaging)
    + there are two bind mounts
        - a read-only bind mount one to the location of the local project repository on the host to a `/clone` directory in the container
            + this is the new `debian/TAG` branch that was just created on the host in the project directory
            + for details, refer to the [`build_deb.sh`](https://github.com/btoll/machines/blob/master/deb-packaging/build_deb.sh) shell script in the container
        - a bind mount from the packaging directory on the host (`/srv/packages/deb/`) to the packaging directory in the container (`/build`), where the new build artifacts will be located

1. [`systemd-path`](https://www.man7.org/linux/man-pages/man5/systemd.path.5.html)
    + the `systemd-path` unit configuration details the path on my system that is being monitored (watched) by `systemd`
    + once it sees a change, it will activate the corresponding [`systemd-service` unit](https://www.man7.org/linux/man-pages/man5/systemd.service.5.html), which in turn calls the `/srv/packages/release.sh` shell script on the host

        The `path` and `service` units are both installed in `/lib/systemd/system/`:

        `awesome-release.path`

        ```ini
        [Unit]
        Description="Monitor package build directory for new entries to release"

        [Path]
        PathModified=/srv/packages/deb
        Unit=awesome-release.service

        [Install]
        WantedBy=multi-user.target
        ```

        `awesome-release.service`

        ```ini
        # https://www.putorius.net/systemd-path-units.html
        #
        # I received both of the following errors:
        #       Failed with result 'start-limit-hit'.
        #       Failed with result 'unit-start-limit-hit'.
        # The fix for both was to add the following Unit section option:
        #       StartLimitIntervalSec=0
        # See man 5 systemd.unit
        #
        # To tail the logs: sudo journalctl -ef
        [Unit]
        Description="Release packages when they are added to this directory"
        StartLimitIntervalSec=0

        [Service]
        ExecStart=/srv/packages/release.sh
        ```

        Simple and easy to understand.

1. `release.sh`
    + detects the new directory containing the packages
    + calls [`githhub-release`](https://github.com/btoll/github-release/) to push the packages to GitHub
        - this is a simple Go package that uses [the Google Go client library](https://github.com/google/go-github) to access the GitHub API

That's it!

> To tail just the logs of the `awesome-release.service`:
>
> ```bash
> $ sudo journalctl -ef -u awesome-release.service
> ```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## "Tech Stack"

Because I'm not a chump, I didn't use any of the following:

- Docker
- cloud (besides GitHub, of course)

Because I'm a winner, here are the tools that I chose to use:

- [Git extensions]
- [`systemd`](https://www.man7.org/linux/man-pages/man1/systemd.1.html)
    + `systemd-nspawn`
    + `systemd-path`
    + `systemd-service`
- [`github-release`](https://github.com/btoll/github-release)

Of course, I'm also using Debian packaging tooling and `GPG` for signing, but I'm not going into those as I've written extensively about these topics recently:

- [On gpg-agent Forwarding](/2023/06/07/on-gpg-agent-forwarding/)
- [On debsigs](/2023/06/24/on-debsigs/)
- [On Inspecting deb Packages](/2023/06/01/on-inspecting-deb-packages/)
- [On Creating deb Packages](/2023/06/21/on-creating-deb-packages/)
- [On Creating an APT repository](/2023/06/29/on-creating-an-apt-repository/)

## FAQ

Q. Wait, you mean that's it?

A. Yes!

---

Q. That's crazy?!

A. I know!!

---

Q. Why didn't you want to use Docker?

A. As readers of my articles know, I'm not a fan of Docker.  This is for several reasons.  First and foremost, they want you to believe, dear reader, that they invented containers.  Rarely do they acknowledge the only reason why containers can even be a thing: Linux!

That's not cool.

Also, why would I download and install a container engine when `systemd` already provides that for me?  It'd be like installing Visual Studio Code rather than using vim.  No one is silly enough to do that!  [Cmon]!

---

Q. Why would you ever want to use Docker?

A. Exactly.

---

Q. Why not use the cloud?

A. What, and cede even more control and knowledge?

## References

- [On systemd-nspawn](/2018/08/20/on-systemd-nspawn/)
- [On Running systemd-nspawn Containers](/2022/02/04/on-running-systemd-nspawn-containers/)
---

<sup>1</sup> Before devops came around, nobody automated anything, ever.  Thank you, devops, for blessing us in this way.

[Git extensions]: /2019/07/05/on-extending-git/
[Cmon]: https://www.youtube.com/watch?v=SP_9zH9Q44o

