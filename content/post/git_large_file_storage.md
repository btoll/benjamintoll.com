+++
title = "On Git Large File Storage"
date = "2022-02-14T22:07:58-05:00"

+++

I'm not sure how it happened, but I've gone all this time without knowing about [Git Large File Storage (LFS)].  [Developed by GitHub], this tool stores a pointer in a Git [blob] object in the Git object database in place of the large file, which is then stored on a remote server managed by GitHub.

This enables a developer to "upload" large files to their local or remote repositories for versioning just like any other Git blob object.  In essence, no matter how large the file, the pointer will always stay the same size since it is just a simple text file, and the size of your Git database will not be negatively affected.

While this tool may not seem useful to a developer working mostly with text files, it's extremely handy when dealing with large binary files such as images, audio, and in my case, tar archives of root filesystems.  These situations, i.e., needing to store large files in Git, may not arise often, but when they do, it's good to know that there are useful tools available to you.

A fairly large drawback to frequent use of Git LFS is that you're only given a small amount of storage for free.  This makes sense, of course, but I quickly hit the 1GB limit, and [upgrading is expensive].  It would be cheaper to get a VPS or another cloud storage solution.

Still, it's a viable solution, and one that frankly may not be that well known.  Of course, it's probably just me that was unaware of it.  I am, after all, just another bozo on the bus.

---

- [Install](#install)
- [Example](#example)
- [How It Works](#how-it-works)
- [Caveat Emptor](#caveat-emptor)
- [Conclusion](#conclusion)

---

## Install

At the time of this writing, the latest version is 3.1.1: https://github.com/git-lfs/git-lfs/releases/tag/v3.1.1

After downloading it, extract the archive and execute the `install.sh` script.  This will install the pre-compiled Go binary `git-lfs` and run the following command:

```
$ git lfs install
Updated git hooks.
Git LFS initialized.
```

Running this adds the following section to the global Git config file (`.gitconfig`):

<pre class="math">
[filter "lfs"]
        clean = git-lfs clean -- %f
        smudge = git-lfs smudge -- %f
        process = git-lfs filter-process
        required = true
</pre>

Of course, you don't *have* to run the install script.  If you look at its contents, it's actually quite simple and really only saves a couple of manual steps.

Further, it doesn't install the man files located in the archive's `man/` directory.  If you're interested in installing those, you'll have to do that yourself:

```
$ sudo install --mode 0644 man/*1 /usr/local/man/man1
$ sudo install --mode 0644 man/*5 -D --target-directory /usr/local/man/man5
```

> The `-D` flag will create all components of the `--target-directory`, which was necessary on my system because `man5` did not exist.

Now, view the man pages!

```
$ man git-lfs-update
$ man 5 git-lfs-config
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeee

> If you're not sure where `man` looks for man files, run the [`manpath`] command.

With the installation out of the way, let's look at a simple example.

## Example

> There is clearly more to the CLI than what I'm covering here, however, this is demonstrating the most common use case.

The `git-lfs` tool isn't tracking any file paths until they are added.  You can use globs to target multiple files, such as globbing all files with the extension `.tar`, but for my case I prefer to track them explicitly so I will give the full relative path.

Here's my working directory:

<pre class="math">
$ tree -aI .git
.
├── CHANGELOG.md
├── COPYING
├── .gitattributes
├── hugo
│   ├── Dockerfile
│   ├── .Dockerignore
│   ├── hugo.nspawn
│   ├── hugo.sh
│   ├── hugo.tar.xz
│   └── README.md
├── README.md
└── tor-browser
    ├── Dockerfile
    ├── .Dockerignore
    ├── install_tor_browser.sh
    ├── README.md
    ├── tor-browser.nspawn
    └── tor-browser.tar.xz
</pre>

Note that the paths are relative to the root of the repository.

```
$ git lfs track "hugo/hugo.tar.xz"
Tracking "hugo/hugo.tar.xz"
```

The first time that `git-lfs-track` is called, it will create a `.gitattributes` file in the current working directory, if it doesn't exist.

Tracking another file will add another entry to the `.gitattributes` file.

```
$ git lfs track "tor-browser/tor-browser.tar.xz"
Tracking "tor-browser/tor-browser.tar.xz"

$ cat .gitattributes
hugo/hugo.tar.xz filter=lfs diff=lfs merge=lfs -text
tor-browser/tor-browser.tar.xz filter=lfs diff=lfs merge=lfs -text
```

Let's verify that it's tracking the paths that we just added:

```
$ git lfs track
Listing tracked patterns
    hugo/hugo.tar.xz (.gitattributes)
    tor-browser/tor-browser.tar.xz (.gitattributes)
Listing excluded patterns
```

We'll now add and commit the new files:

```
git add *.tar.xz .gitattributes
git commit -m 'Added nspawn container tarballs'
```

Now that the objects have been committed to the database, the tool is aware of the files that we added above.   Let's verify that:

Running the next command will verify the files and/or file patterns that are being tracked:

```
$ git lfs ls-files
bfd840fa63 * hugo/hugo.tar.xz
68540ee38c * tor-browser/tor-browser.tar.xz

$ git lfs ls-files -s
bfd840fa63 * hugo/hugo.tar.xz (22 MB)
68540ee38c * tor-browser/tor-browser.tar.xz (201 MB)
```

> Note that running `git-lfs-track` only adds the file paths to track, **not** the files themselves.  It's only when the files are added to the Git object database by [`git-add`] and [`git-commit`] that `git-lfs` knows how to manage them.

## How It Works

So, how does this work?  Simply.  A pointer to the large file is stored in the Git history, and the actual file itself resides on another server.  Obviously, all this is abstracted and hidden from the user, and the large file appears as a regular file stored in the Git object database like any other blob.

On GitHub, the file in the repo appears as though it's been committed in the history, even though we know now that it's just a small file that contains a pointer to the real location.

So, can we download the large file from the remote repository like we're used to?  Yes!

We can prove this using [`curl`].  We'll turn on `verbose` output to get extra info when dumping the header information for all of the redirects.  Each hop will be prefaced with the text `< location` (at the beginning of new line), so a simple pipeline to a tool that can do textual searches will do the trick:

```
$ curl -vIL https://github.com/btoll/machines/raw/master/tor-browser/tor-browser.tar.xz 2>&1 \
    | ag "^< location:"
< location: https://media.githubusercontent.com/media/btoll/machines/master/tor-browser/tor-browser.tar.xz
```

We see that there's only one hop, and the file itself resides on the `media` server of the `githubusercontent.com` domain.

Now that we've proven that we have full access to the large file through the usual means, let's investigate what's stored in the Git history.

Let's drill down into the Git object database to verify that Git itself is only saving a pointer to the large file, which should be only a few kilobytes.

Before we do, let's see the size of the large file on disk (in bytes):

```
$ stat --format=%s tor-browser/tor-browser.tar.xz
201371436
```

Now, let's get the contents of the `tree` object from the latest commit of the branch pointed to by `HEAD`.  First, we'll verify that the last commit contains the objects we're interested in.

```
$ git log -1 HEAD --oneline
f3c7847 (HEAD -> master, origin/master) Added nspawn container tarballs
```

That indeed contains the tarballs, so let's drill into the commit's `tree` object:

```
$ git cat-file -p master^{tree}
100644 blob bfbf5761375d136171d57bd47a65561cc4763cdc    .gitattributes
040000 tree 340818d02e10f3367f36e2816e9c02c9abc6472b    hugo
040000 tree 65ce727ccb86801c1e5b8b2a8e115eb78c1269ca    tor-browser
```

And take a look at the `tree` object that represents `tor-browser`:

```
$ git cat-file -p 65ce727
100644 blob 6a7707ceea144076d2fa9d20307bfd0b2e743163    .Dockerignore
100644 blob 7d21223cd1f1053bbc3a76c46a44c977038a9481    Dockerfile
100644 blob b750388bfaf5e08fbf38847194795f9970434280    README.md
100755 blob 57ff4a74e17febe8497f6a1fc016c74ac9523499    install_tor_browser.sh
100644 blob 3b3eab8bd420a5006a7aa0b91d5bac6216e62b47    tor-browser.nspawn
100644 blob d82da0c1d752847d10bdbc270041103cf8c8165f    tor-browser.tar.xz
```

Finally, let's see the size of the `tor-browser.tar.xz` in bytes.  Again, this is the pointer to the large file stored on the aforementioned server:

```
$ git cat-file -s d82da0c
134
```

Ok, about what we'd expect, and clearly not the same file as what is on the hard disk.

As a sanity to assure ourselves that the Git blob objects are indeed storing a representation of the files on disk (and they're not all pointers, for example), let's see what it reports for another file that we've committed to Git that resides within the same commit and `tree` object.

Is the size of the shell script `install_tor_browser.sh` in the working directory the same as that of the `blob` boject in the Git object database?

```
$ stat --format=%s tor-browser/install_tor_browser.sh
1335

$ git cat-file -s 57ff4a7
```

It is!

Ok, this all looks good, and we can feel pretty good that the Git LFS tool is indeed doing what's described on the tin.

Before we call this a wrap, let's look at something that everyone who uses this tools should be aware of.

## Caveat Emptor

Let's say that you want to use Git LFS to track and manage files that have already been committed in your git history.

No problem, you think to yourself, I'll check out the repo's [`README`] and see what it has to say about what is probably a fairly common use case.

> At the time of this writing, there was no warning in the [examples section] of the Git LFS `README` that warned of the consequences of running the `git-lfs-migrate` command in `import` mode.

Armed with the suggestion from the `README`, I'll just sidle up to the keyboard and type that in.

```
$ git lfs migrate import --include="*.zed" --everything
migrate: Sorting commits: ..., done.
migrate: Rewriting commits: 100% (2/2), done.
  master        f3c784746b91e5d0f9a68a47468bddc1df2b4650 -> cdb98a1b3e2efe3f50c2e7b462b91c4b899d3c79
migrate: Updating refs: ..., done.
migrate: checkout: ..., done.
```

Well, friend, you just rewrote your commit history, and when you have to force push the objects to the remote repository, you will immediately become *persona non grata* to anyone else working on the project!

I present the following before and after snapshots of the git log as evidence.

**Before**

```
$ git log --oneline
f3c7847 (HEAD -> master) Added nspawn container tarballs
5373111 Initial commit
```

**After**

```
$ git log --oneline
cdb98a1 (HEAD -> master) Added nspawn container tarballs
275933a Initial commit
```

You can see that the hashes have changed, which of course will happen anytime its contents changed.  If you're not expecting this side effect, you will be in for quite a surprise.

The new commit with the "Initial commit" commit message (hash 275933a) now includes a new `.gitattributes` file that **was not** part of the original commit.

> There are other differences, but I'll only focus on the addition of the `.gitattributes` file to the first commit.

Let's explore further.  Since the Git history only includes two commits, we can view the Git objects that make up the first commit with the following command (the first output displayed below is before the `git-lfs-migrate` command that we issued above):

**Before**

```
$ git cat-file -p master^^{tree}
040000 tree 4d32b2a7c05a99a091f4739340138a14ba00a167    hugo
040000 tree de471a5e090040da0b376f75cbe744046696fa7f    tor-browser
```

**After**

```
$ git cat-file -p master^^{tree}
100644 blob 5ff9029b4eb0b849c29f4ca93546e7044478349e    .gitattributes
040000 tree 4d32b2a7c05a99a091f4739340138a14ba00a167    hugo
040000 tree de471a5e090040da0b376f75cbe744046696fa7f    tor-browser
```

~~The side effect of writing the entire Git history is alarming to me, especially since this isn't called out in the `README` until further down in the `Uninistall` section.~~

> I submitted a [pull request] to call out this behavior.

Why is the first commit futzed with?  Well, it is here, but I'm not sure if that will always be the case.  I haven't read through the code, so I don't know what algorithm is being used, but I do know that every reference is being inspected, both locally and remotely.

`git-lfs` may only insert the `.gitattributes` file immediately preceding the first commit that contains a file that matches a given tracked file path, or it may always just alter the first to be safe.

Ultimately, it is the user's responsibility to read the documentation and be aware of the impact of the commands they are running.  I just feel it is a bit cavalier to not call more attention to commands that could impact every commit object in the database.

> Note that running the inverse command `git lfs migrate export` will reverse the `import`, but it will still give the commit objects new (and different) hashes and will cause you to force push your changes which will (again) have anyone also working on this repository to hate your guts.

## Conclusion

Although this may only be of limited use to me, it's good to know that such a tool exists.

My original use case for this was as a remote storage for my root filesystem tarballs that I download for running containers using the [`systemd-nspawn`] container manager.

Essentially, I'd export the `nspawn` containers to a tarball and then upload them using Git LFS to a public repository.  However, having discovered through the course of writing this article that there is a relatively small limit to the free tier, I'll probably upload them to a VPS instead.

In a world where things were more equitable and only a very small number of companies run by horrible people *didn't* control most of the world's infrastructure, I'd consider uploading the archives to a storage offering like S3.

Better to give my money to a small company or use local backup.

[Git Large File Storage (LFS)]: https://git-lfs.github.com/
[Developed by GitHub]: https://github.com/git-lfs/git-lfs
[blob]: /2021/12/18/on-git-blobs/
[upgrading is expensive]: https://docs.github.com/en/billing/managing-billing-for-git-large-file-storage/about-billing-for-git-large-file-storage
[`manpath`]: https://www.man7.org/linux/man-pages/man1/manpath.1.html
[`git-add`]: https://git-scm.com/docs/git-add
[`git-commit`]: https://git-scm.com/docs/git-commit
[`curl`]: https://curl.se/
[`README`]: https://github.com/git-lfs/git-lfs/blob/main/README.md
[examples section]: https://github.com/git-lfs/git-lfs/blob/main/README.md#example-usage
[pull request]: https://github.com/git-lfs/git-lfs/pull/4880
[`systemd-nspawn`]: /2022/02/04/on-running-systemd-nspawn-containers/

