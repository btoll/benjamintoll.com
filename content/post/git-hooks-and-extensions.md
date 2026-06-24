+++
title = "On git-hooks-and-extensions"
date = "2026-06-23T01:59:12-04:00"

+++

- [Introduction](#introduction)
- [Design](#design)
- [Installation](#installation)
    + [Git Hooks](#git-hooks)
    + [Git Extensions](#git-extensions)
    + [Man Pages](#man-pages)
- [Creating A New Repository](#creating-a-new-repository)
- [Behind The Scenes](#behind-the-scenes)
- [More Git Extensions!](#more-git-extensions)
- [References](#references)

## Introduction

It's time to talk about what is on everyone's lips: the Git hooks and extensions tool called, well, [`git-hooks-and-extensions`].

How would I explain what this program does?  After all, how would you explain a flower or a sunset?  It's just perfect.  It just is.  [`git-hooks-and-extensions`] seamlessly and painlessly installs [Git hooks] and Git extensions, but it also helps to make the world a better place.  And, if that isn't nice, I don't know what is.

To be honest, this is an old project that I started around the time of the [First Punic War].  The last time I wrote about this, or an earlier version of this, was several years ago in an award-winning called [On a Git Hook Pattern].  You should drop everything you're doing and go read that.

## Design

Some of the design decisions that went into this little program were based upon the Git design itself.  Most importantly, it will not get in the way of how you use Git or put a layer between you and it.

- The local (and, optionally the) global Git configuration files.
    - All `pre-commit` hooks should be listed in the local config file (see below for more details).
- Installs a custom `pre-commit` hook to the default Git hooks location (`.git/hooks`).
    + The `pre-commit` hook itself will act as a controller, referencing hooks that will live alongside it in a `pre-commit.d/` directory (`.git/hooks/pre-commit.d/`.  This convention of affixing a `.d` to a directory can be seen in other Linux tools like the `apt` package manage which sources any file in `/etc/apt/sources.list.d`.
- Since the hook information is written to the config file, Git's own custom commands can be use as usual to work with the file (i.e., [`git-config`]).
    + Frankly, this is nice because `git-hooks-and-extensions` doesn't get in the way of your Git workflow, and once installed, you can continue to use Git commands to manage your Git config files.  For example, continue to edit it using `git config edit`.

> The only way you could break the workflow established by `git-hooks-and-extensions` was if you removed the `pre-commit` hook file in `.git/hooks/pre-commit.d/` but left its entry in the local Git config.  But why the fuck would you do that?

Essentially, if you know Git and Linux, this will be familiar and feel like a warm blanket.  Promise.  And, if you don't know them, it won't feel like a [hair shirt](https://en.wikipedia.org/wiki/Cilice).  Pinky promise.

Other decisions were based upon simplicity:

- Use standard conventions whereever possible, both for Git and for Linux.  If you already know these, then you are most of the way there to understanding what this tool does, and importantly, how it does it.
- The entire program is written in Bash shell scripts, so it is extremely portable with virtually zero dependencies (well, ok, Bash is a dependency).
- Installation is a cinch:
    + Container (see the `Dockerfile`)
    + Executable Shell script (`git-hooks-and-extensions`)
    + weeeeeeeeeeeeeeee (`weeeeeeeeeeeeeeee`)
- Store anything the project needs in directories recommended by the [freedesktop.org]'s [XDG Base Directory Specification].
    + These locations should be familiar to any Linux user.

Just as importantly, there were also things that I did not want:

- No Python and definitely no stinkin' Node.js.  Go would be ok, though, since most of what I do now is in Go.  But I don't see myself getting around to rewriting this in Go, since it already does everything I want, and I'm not impatient enough to need concurrency for running Git `pre-commit` hooks.
- No `YAML` (or `JSON`) "infrastructure as code".  Seriously, enough already.
- No hidden configuration file(s) that I need to version.  Ever see a project that has more config files than actual code?  Let's stop introducing complexity when there's no reason to do so.
- No stupd name with missing vowels.

## Installation

Ok, you've made the decision to use Git hooks.  Smart choice.  And, you've decided that you want to give [`git-hooks-and-extensions`] a try.  Let's walk through the installation and initial use, as well as useful knowledge dissemination along the way.

The easiest way is to install it using a container:

```bash
$ podman run --rm -v "$HOME/.local":/root/.local btoll/git-hooks-and-extensions:latest
[INFO] Installing git extensions into /root/.local/bin/git-hooks-and-extensions/bin...
[INFO] Installing git hooks into /root/.local/bin/git-hooks-and-extensions/hooks...
[INFO] Installing git bootstrap files into /root/.local/share/git-hooks-and-extensions/bootstrap...
[INFO] Installing git extension man pages into /root/.local/share/man/man1...
[SUCCESS] Installation complete.
[INFO] Add /root/.local/bin/git-hooks-and-extensions/bin to PATH.
[INFO] Add /root/.local/share/man to MANPATH.
```

Otherwise, clone and execute a shell script:

```bash
$ git@github.com:btoll/git-hooks-and-extensions.git
$ cd git-hooks-and-extensions
$ ./git-hooks-and-extensions
[INFO] Installing git extensions into /home/btoll/.local/bin/git-hooks-and-extensions/bin...
[INFO] Installing git hooks into /home/btoll/.local/bin/git-hooks-and-extensions/hooks...
[INFO] Installing git bootstrap files into /home/btoll/.local/share/git-hooks-and-extensions/bootstrap...
[INFO] Installing git extension man pages into /home/btoll/.local/share/man/man1...
[SUCCESS] Installation complete.
[INFO] Add /home/btoll/.local/bin/git-hooks-and-extensions/bin to PATH.
[INFO] Add /home/btoll/.local/share/man to MANPATH.
```

Easy peasy.

Now that `git-hooks-and-extensions` has been installed, what do we do?  What's next?

Let's now turn to what has been installed.

### Git Hooks

At the time of writing, the program will install the following Git hooks into `~/.local/bin/git-hooks-and-extensions/hooks/`.  Note that when a new Git repository is created, the selected hooks will be copied into the repo's `.git/hooks/pre-commit.d/` directory.

```bash
$ tree ~/.local/bin/git-hooks-and-extensions/hooks
/home/btoll/.local/bin/git-hooks-and-extensions/hooks/
├── _/
│   ├── EOF.bash*
│   ├── ggshield.sh*
│   ├── hadolint.sh*
│   ├── link-scanner.sh*
│   ├── shellcheck.sh*
│   ├── trivy.sh*
│   └── vagrantfile.sh*
├── f.sh*
├── go/
│   ├── go-build.sh*
│   ├── go-fmt.sh*
│   ├── golangci-lint.sh*
│   ├── go-mod.sh*
│   ├── gosec.sh*
│   ├── go-test.sh*
│   ├── go-vet.sh*
│   └── govulncheck.sh*
├── js/
│   ├── debugger.bash*
│   └── eslint.bash*
├── pre-commit*
└── py/
    ├── pycodestyle.sh*
    └── pytest.sh*

5 directories, 21 files
```

### Git Extensions

At the time of writing, there are five custom Git extensions, they are installed into `~/.local/bin/git-hooks-and-extensions/bin/`:

```bash
$ tree ~/.local/bin/git-hooks-and-extensions/bin
/home/btoll/.local/bin/git-hooks-and-extensions/bin/
├── git-bootstrap*
├── git-hooks*
├── git-hub*
├── git-init-wrapper*
└── git-ls*

1 directory, 5 files
```

The location should be added to your `PATH` Bash environment variable and executed the same as native `git` commands (subcommands).

### Man Pages

Every extension in the `bin/` project directory has a man page in `man/`.  These man pages are checked in as Markdown files and are converted into [`troff`] format (specifically, [`.man`] files using `troff` macros like `.TH`, `.SH`, etc.) during installation.

> The `.1` file extension indicates the man section, which is user commands.  It is a `.man` file.  See the [`man`] man page for more information.

On a side note, the `man` command uses `troff` (via `groff`) to process the `troff` format to output readable terminal text.

You can see them after installation in the `~/.local/share/man/man1` directory:

```bash
$ tree ~/.local/share/man/man1
/home/btoll/.local/share/man/man1/
├── git-bootstrap.1
├── git-hooks.1
├── git-hub.1
├── git-init-wrapper.1
└── git-ls.1

1 directory, 5 files
$ file ~/.local/share/man/man1/git-bootstrap.1
/home/btoll/.local/share/man/man1/git-bootstrap.1: troff or preprocessor input, ASCII text
```

The location should be added to your `MANPATH` Bash environment variable.  The man pages can then be accessed just like the system man pages, i.e., `man git-init-wrapper`.

## Creating A New Repository

Enter our friend [`git-init-wrapper`], one of the Git extensions that was installed along with the Git hooks.  This little fella will call the native [`git init`] command as well as our other little friend [`git-bootstrap`].

> It's important to note that `git-init-wrapper` simply delegates work to the workhorses that do the actual heavy lifting:
>
> - [`git init`]
> - [`git-bootstrap`]
> - [`git-hooks`]
>
> Both `git-bootstrap` and `git-hooks` can also add their goods to pre-existing repositories, so all three can be called independently of each other.

I won't go over what `git init` does, since you should already be familiar with that.  [`git-bootstrap`], on the other hand, is another custom Git extension that simply copies all of the files that were installed to `$HOME/.local/share/git-hooks-and-extensions/bootstrap/` when `git-hooks-and-extensions` was installed.  You can find all of the files that are copied in the [`share/bootstrap/`](https://github.com/btoll/git-hooks-and-extensions/tree/main/share/bootstrap) directory of the project.

> Note the placeholder name `PROJECT_NAME` in both `.gitignore` and `README.md`.  This will be replaced by the name of the new directory.

The `git-init-wrapper` extension will further delegate work to the customer Git extension [`git-hooks`] if the `--hooks` parameter is passed to it.  As it says on the tin, `git-hooks` will seamlessly install the specified hooks to the aforementioned `.git/hooks/pre-commit/pre-commit.d/` directory and add an entry to the new `[hooks "pre-commit"]` section (in [`INI`] format) in the local Git configuration file for the repository.

```bash
$ git init-wrapper --dir limmy --hooks go
Initialized empty Git repository in /home/btoll/limmy/.git/
[SUCCESS] Installed bootstrap files into limmy.
Install go-build.sh? [Y/n]:
Install go-fmt.sh? [Y/n]:
Install golangci-lint.sh? [Y/n]:
Install go-mod.sh? [Y/n]:
Install gosec.sh? [Y/n]: n
Install go-test.sh? [Y/n]:
Install go-vet.sh? [Y/n]: n
Install govulncheck.sh? [Y/n]:
[SUCCESS] Installed git hooks into .git/hooks/pre-commit.d.
```

Or, if you know that you want all of them, add the `--yes` flag.  This will install everything without prompting.

```bash
$ git init-wrapper --dir limmy --hooks go --yes
Initialized empty Git repository in /home/btoll/limmy/.git/
[SUCCESS] Installed bootstrap files into limmy.
[SUCCESS] Installed git hooks into .git/hooks/pre-commit.d.
```

## Behind The Scenes

As noted previously, the entire design of this program is to fit seamlessly into the design of Git.  Further, it uses standard locations set forth by the [XDG Base Directory Specification].  In other words, you don't need to learn a new tool.

The ability to create a custom `pre-commit` hook.  [`git-hooks-and-extensions`] installs it into the same location as all the samples that are installed into a new Git respository (`.git/hooks/`).  The only difference is that [`git-hooks-and-extensions`] allows for multiple `pre-commit` hooks to be executed sequentially by taking advantage of a little-known way to define multiple values for a single key in [`INI`] files.  For example, after installing `git-hooks-and-extensions` with Go language support, the local Git config will look like this:

```ini
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
[hooks "pre-commit"]
        hook = go-build.sh
        hook = go-fmt.sh
        hook = golangci-lint.sh
        hook = go-mod.sh
        hook = gosec.sh
        hook = go-test.sh
        hook = go-vet.sh
        hook = govulncheck.sh
```

Neat!

Use native Git commands to list the config file!

```bash
$ git config list --local
core.repositoryformatversion=0
core.filemode=true
core.bare=false
core.logallrefupdates=true
hooks.pre-commit.hook=go-build.sh
hooks.pre-commit.hook=go-fmt.sh
hooks.pre-commit.hook=golangci-lint.sh
hooks.pre-commit.hook=go-mod.sh
hooks.pre-commit.hook=gosec.sh
hooks.pre-commit.hook=go-test.sh
hooks.pre-commit.hook=go-vet.sh
hooks.pre-commit.hook=govulncheck.sh
```

Or, get all the `pre-commit` hooks:

```bash
$ git config --local --get-all hooks.pre-commit.hook
go-build.sh
go-fmt.sh
golangci-lint.sh
go-mod.sh
gosec.sh
go-test.sh
go-vet.sh
govulncheck.sh
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeee

## More Git Extensions!

Besides the three Git extensions already covered above, the project also install two other valuable Git extensions (at the time of this writing):

- [`git-hub`]
    + Open any file, directory or commit on GitHub in regular view or blame view.
- [`git-ls`]
    + List the files that are staged and modified or that make up any given commit and optionally open in Vim for editing.

## References

- [`git-hooks-and-extensions`]
- [On a Git Hook Pattern]
- [freedesktop.org]
- [XDG Base Directory Specification]
- [Official Git documentation](https://git-scm.com)

[`git-hooks-and-extensions`]: https://github.com/btoll/git-hooks-and-extensions
[Git hooks]: https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks
[On a Git Hook Pattern]: /2021/03/30/on-a-git-hook-pattern/
[First Punic War]: https://en.wikipedia.org/wiki/First_Punic_War
[freedesktop.org]: https://www.freedesktop.org/wiki/
[XDG Base Directory Specification]: https://specifications.freedesktop.org/basedir/latest/
[`git init`]: https://git-scm.com/docs/git-init
[`git-init-wrapper`]: https://github.com/btoll/git-hooks-and-extensions/blob/main/bin/git-init-wrapper
[`git-bootstrap`]: https://github.com/btoll/git-hooks-and-extensions/blob/main/bin/git-bootstrap
[`git-hooks`]: https://github.com/btoll/git-hooks-and-extensions/blob/main/bin/git-hooks
[`git-hub`]: https://github.com/btoll/git-hooks-and-extensions/blob/main/bin/git-hub
[`git-ls`]: https://github.com/btoll/git-hooks-and-extensions/blob/main/bin/git-ls
[`INI`]: https://en.wikipedia.org/wiki/INI_file
[`troff`]: https://www.troff.org/
[`groff`]: https://man7.org/linux/man-pages/man7/groff.7.html
[`.man`]: https://man7.org/linux/man-pages/man7/groff_man.7.html
[`man`]: https://www.man7.org/linux/man-pages/man1/man.1.html
[`git-config`]: https://git-scm.com/docs/git-config

