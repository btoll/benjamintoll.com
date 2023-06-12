+++
title = "On Bootstrapping a git Repository"
date = "2023-06-11T22:01:29-04:00"

+++

The intention of this short article is to act as a cheat sheet for the initial bootstrapping of a local [`git`] repository.

By bootstrapping, I'm specifically referring to a few of the common ways to initiate a project.  These are commands that we usually blindly copy and paste into a terminal on our way to more important things, like changing the world with our crappy little React applications.

---

- [Cloning An Existing Project](#cloning-an-existing-project)
- [Creating A New Project](#creating-a-new-project)
- [Rolling Your Own](#rolling-your-own)
- [Summary](#summary)

---

## Cloning An Existing Project

The simplest is the venerable [`git-clone`] command.  This is a convenience command that does several things under the covers to make life simpler and more enjoyable for you, busy person that you are:

- clones (copies) a repository into a new directory
- creates remote-tracking branches for every branch in the cloned repository
- creates and checks out a new branch that's forked from the cloned repository's currently active branch

So, let's say that we wanted to get a copy of the [`tmux`] project onto our local filesystem.  Just do the following:

```bash
$ git clone git@github.com:tmux/tmux.git
Cloning into 'tmux'...
remote: Enumerating objects: 47120, done.
remote: Counting objects: 100% (126/126), done.
remote: Compressing objects: 100% (61/61), done.
remote: Total 47120 (delta 72), reused 103 (delta 65), pack-reused 46994
Receiving objects: 100% (47120/47120), 16.59 MiB | 18.47 MiB/s, done.
Resolving deltas: 100% (36240/36240), done.
```

By default, `git-clone` will newly-create a `tmux` directory for us.  The name is taken from the name of the project repository.  Isn't that nice.

> We could have called the directory by another name, like `donuts`, by supplying it after the repository `URL`:
>
> ```bash
> $ git clone git@github.com:tmux/tmux.git donuts
> ```
>
> Other than the name of the directory, the result is the same.

So, there it went, gleefully downloading all the `git` objects and refs, without a care in the world.  Let's now change into the newly-created `tmux` directory and list all the remote branches and followed by a listing of all the branches (both local and remote):

```bash
$ cd tmux
$ git branch --remotes
  origin/HEAD -> origin/master
  origin/master
  origin/sixel
  origin/sixel-passthrough
$ git branch --all
* master
  remotes/origin/HEAD -> origin/master  remotes/origin/master
  remotes/origin/sixel
  remotes/origin/sixel-passthrough
```

`master` is our only local branch, alone and friendless.  The asterisk (`*`) means that it is the current branch.

To get some understanding of what `git-clone` has done for us, let's take a look at the local config file, located in the `.git` directory in the project root:

`.git/config`

```ini
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
[remote "origin"]
        url = git@github.com:tmux/tmux.git
        fetch = +refs/heads/*:refs/remotes/origin/*
[branch "master"]
        remote = origin
        merge = refs/heads/master
```

Or, using [`git-config`]:

```bash
$ git config --local --list
core.repositoryformatversion=0
core.filemode=true
core.bare=false
core.logallrefupdates=true
remote.origin.url=git@github.com:tmux/tmux.git
remote.origin.fetch=+refs/heads/*:refs/remotes/origin/*
branch.master.remote=origin
branch.master.merge=refs/heads/master
```

1. It's named the remote repository `origin` and is tracking it.
1. It's created a local `master` branch that is tracking the remote one (`origin/master`).

You can also get individual key values:

```bash
$ git config --local --get remote.origin.url
git@github.com:tmux/tmux.git
$ git config --local --get remote.origin.fetch
+refs/heads/*:refs/remotes/origin/*
```

These are each separate operations that `git-clone` does for you.  We'll see later how to do that ourselves.

## Creating A New Project

We'll turn now to the situation where you've created a project and want to push it to one of the `git` platforms.  You know which one you love.  I'm not here to tell you how to live your life.

No matter the platform, the `git` commands are the same.  It's [`git`], after all.

First, the setup, which I'm not going over:

```bash
$ mkdir gitlab-dev
$ cd gitlab-dev
[make files and do stuff]
$ git init
Initialized empty Git repository in /home/btoll/projects/gitlab-dev/.git/
$ git add .
$ git commit -m "Initial commit"
```

This should all be familiar to everyone on the planet.  Now, the bits that are helpfully listed on `git` platforms tell us what to do next:

```bash
$ git remote add origin git@gitlab.com:btoll/gitlab-dev.git
$ git push -u origin master
```

> Check out the man page for [`git-remote`], it's simply fabulous.

But before we mindlessly copy and paste that into the shell, let's pause and take a look at the local `git` config:

`.git/config`

```ini
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
```

> The long option of `-u` is `--set-upstream`, which I wish the platforms would use instead of the short form.

By the way, a nice way to open the config file, whether it's the system config file (`/etc/gitconfig`), the global config file (`$HOME/.gitconfig`) or the local one (`.git/config`), is to use the `-e` or `--edit` switch.

The default is to open the local config file.  For the system config, use the `--system` switch, and for the global config, use the `--global` switch.

Any changes, of course, are permanent.

```bash
$ git config --edit
```

Results in:

```vim
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
```

Note the presence of only the `core` section.  Above, where the `git-clone` command was issued, it also added the `remote` and `branch` sections for us.  We'll look now at the suggested commands, and what they add to the config file.

First, let's set the upstream remote:

```bash
$ git remote add origin https://gitlab.com/btoll/gitlab-dev.git
```

Although nothing is written to `stdout`, delightful things have probably happened.  If we open the config file, we'll now see the `remote` section has been added for us:

```vim
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
[remote "origin"]
        url = https://gitlab.com/btoll/gitlab-dev.git
        fetch = +refs/heads/*:refs/remotes/origin/*
```

This should look familiar, as its one of the things the `git-clone` command got us.  Specifically, it's telling `git` where to fetch all the `git` objects and refs for a particular remote repository by the value of `url`, and it's naming it "origin".

Next, let's invoke the second command:

```bash
$ git push -u origin master
Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
Delta compression using up to 8 threads
Compressing objects: 100% (5/5), done.
Writing objects: 100% (5/5), 1.62 KiB | 829.00 KiB/s, done.
Total 5 (delta 0), reused 0 (delta 0), pack-reused 0
To github.com:btoll/gitlab-dev.git
 * [new branch]      master -> master
Branch 'master' set up to track remote branch 'master' from 'origin'.
```

And, again, the local config file:

```vim
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
[remote "origin"]
        url = git@github.com:btoll/gitlab-dev.git
        fetch = +refs/heads/*:refs/remotes/origin/*
[branch "master"]
        remote = origin
        merge = refs/heads/master
```

Now, it's added the `branch` section for us, which allows us to [`git-push`] and [`git-pull`] without needing to specify the `remote` and `branch`.  This is known as remote-tracking a branch.

## Rolling Your Own

Lastly, I'd like to demonstrate some more steps that we can do by hand.  This will be illustrative, as it further shows what we get for free by using some of the higher-level `git` commands.

> By the way, "Rolling Your Own" is an absolutely awful name for this section, but I didn't really know what to call it.  Caching and naming things are hard problems.

In this final scenario, we'll imagine that we don't want to use `git-clone` because we want to really internalize what some of the underlying commands are doing.

Let's start with another initialized empty `git` repository:

```bash
$ mkdir gitlab-dev
$ cd gitlab-dev
[make files and do stuff]
$ git init
Initialized empty Git repository in /home/btoll/projects/gitlab-dev/.git/
```

Now, let's go ahead and begin manually doing what `git-clone` would automatically do for us.  And, once more, let's look at the current state of the local config:

```ini
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
```

So far, there's no information in the config that would tell `git` where to fetch any of the remote objects and refs.

First, we need to track the remote repository:

```bash
$ git remote add origin git@gitlab.com:btoll/gitlab-dev.git
```

As we've seen previously, this adds the `remote` section to the config:

```ini
[remote "origin"]
        url = git@gitlab.com:btoll/gitlab-dev.git
        fetch = +refs/heads/*:refs/remotes/origin/*
```

Next, we'll add a local branch that tracks a remote one:

```bash
$ git checkout --track origin/master
fatal: 'origin/master' is not a commit and a branch 'master' cannot be created from it
```

Um, what happened?

Let's see what branches `git` knows about:

```bash
$ git branch -a
$
```

None.  Well, that's a bummer.

Well, we need to fetch all of the `git` objects and refs from the remote repository that we named as the `origin`:

```bash
$ git fetch
remote: Enumerating objects: 5, done.
remote: Counting objects: 100% (5/5), done.
remote: Compressing objects: 100% (5/5), done.
remote: Total 5 (delta 0), reused 0 (delta 0), pack-reused 0
Unpacking objects: 100% (5/5), 1.60 KiB | 1.60 MiB/s, done.
From gitlab.com:btoll/gitlab-dev
 * [new branch]      master     -> origin/master
```

```bash
$ git branch -a
  remotes/origin/master
```

Ok, great.  Let's now try to pull:

```bash
$ git pull
There is no tracking information for the current branch.
Please specify which branch you want to rebase against.
See git-pull(1) for details.

    git pull <remote> <branch>

If you wish to set tracking information for this branch you can do so with:

    git branch --set-upstream-to=origin/<branch> master

```

Fortunately, `git` has some pretty nice warning and error messages that are actually helpful.  This is telling us that it doesn't have enough information to pull from a remote repository because there is nothing in the config file that tells it how to do that (specifically, it doesn't know which branch to pull).

> It is noteworthy that `git-pull` **will** fetch the `git` remote repository's objects and refs if they haven't been fetched yet.

One of the reasons this confuses people is because some `git` commands will add the `branch` section to the config, and so they're not used to having to do it themselves.

The first way to fix the above error is to include both the `remote` and `branch` in the command:

```bash
$ git pull origin master
From gitlab.com:btoll/gitlab-dev
 * branch            master     -> FETCH_HEAD
```

Of course, this works, but you'll have to do it every time.  To fix this so you can simply do `git pull` (and `git push`) without any other arguments, you'll need to set the upstream branch, as the helpful error message indicates:

```bash
$ git branch --set-upstream-to=origin/master master
Branch 'master' set up to track remote branch 'master' from 'origin'.
```

Open the config file to see the result:

```ini
[branch "master"]
        remote = origin
        merge = refs/heads/master
```

Alternatively, we could fetch the objects and refs when we add the `origin` remote with the `-f` switch:

```bash
$ git remote add -f origin git@gitlab.com:btoll/gitlab-dev.git
Updating origin
remote: Enumerating objects: 5, done.
remote: Counting objects: 100% (5/5), done.
remote: Compressing objects: 100% (5/5), done.
remote: Total 5 (delta 0), reused 0 (delta 0), pack-reused 0
Unpacking objects: 100% (5/5), 1.60 KiB | 1.60 MiB/s, done.
From gitlab.com:btoll/gitlab-dev
 * [new branch]      master     -> origin/master
```

This saves us the step from having go manually fetch the objects and refs ourselves.  Check out the config file after the command is finished and the downloading is done:

```ini
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
[remote "origin"]
        url = git@github.com:btoll/benjamintoll.com
        fetch = +refs/heads/*:refs/remotes/origin/*
[branch "master"]
        remote = origin
        merge = refs/heads/master
```

## Summary

It's always good to revisit `git` commands that we use every day and perhaps take for granted.

[`git`]: https://git-scm.com/
[`git-clone`]: https://www.git-scm.com/docs/git-clone
[`tmux`]: https://github.com/tmux/tmux
[`git-config`]: https://www.git-scm.com/docs/git-config
[`git-push`]: https://www.git-scm.com/docs/git-push
[`git-pull`]: https://www.git-scm.com/docs/git-pull
[`git-remote`]: https://git-scm.com/docs/git-remote
[`git-fetch`]: https://git-scm.com/docs/git-fetch

