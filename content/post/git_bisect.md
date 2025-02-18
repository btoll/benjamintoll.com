+++
title = "On Git Bisect"
date = "2025-02-08T19:02:11-05:00"
draft = true

+++

- [Introduction](#introduction)
- [`git-bisect`](#git-bisect)
- [Examples](#examples)
    + [Good/Bad](#goodbad)
    + [Alternate Terms](#alternate-terms)
    + [Scripting](#scripting)
    + [Skipping](#skipping)
- [References](#references)

---

## Introduction

When I was a young Roman soldier fighting in Caesar's [Gallic Wars], I was exposed to the tool [`git-bisect`].  It was a game changer, and it increased my ability to track down and fix bugs (which was my side gig after a day's worth of soldiering).

I used this tool daily when I was working for Sencha on the Ext JavaScript framework, back when front-end development was fun and not a complete pain in the ass.

So, in this little article, I'll briefly explain why everyone should know this tool and some of the ways that I use it.

## `git-bisect`

When first exposed to `git-bisect`, I was working as a ~~software engineer~~ programmer that was primarily responsible for fixing bugs for supported releases of the Extjs framework, which included writing heaps of tests using the [Jasmine] testing framework.

The other programmers on the team used `git-bisect` regularly, and they were the reason that I first heard of it and started using it to become a much better sleuth.

So, the idea was this.  A bug ticket would be created for a particular release, and it would be my job to fix it.  How should that be approached?  Typically, I would dive in straightaway to reproduce the issue and then set any number of breakpoints to begin debugging.

However, a smarter way revealed itself to me as I observed how my teammates worked.  Wouldn't it be nice to be able to determine when the bug was introduced?  This would be extremely helpful as it would give more context and other information that would be useful in determining why the code was introduced in the first place.  Knowing this could prompt the person fixing the bug to reach out and ask questions and open discussions that may not be had otherwise (but might be needed).

Often, the conversations we would have would then determine that the "fix" for this particular issue was not the proper one at all, and it at times even led to a minor refactoring of a particular feature or module that would led to its betterment.

So, at long last, let's have a description of `git-bisect`.  `git-bisect` is part of the `Git` suite of tools, and it allows one to quickly determine when a bug was introduced into a project using the binary search algorithm which decreases the amount of items logarithmically each time it is called (that is, it eliminates half the possibilities upon each iteration).

> For example, if a project contains 65,536 commits, it will only take 16 iterations to search the entire Git history.

During the process, it stops on a commit and checks out the new working tree (actually, that's configurable using the `--no-checkout` switch).  Each step allows the developer to determine if the bug is present in that particular commit.  If it is, it's marked as a `bad` commit and then process continues, or it's marked as a `good` commit.

This continues until there are is only a single commit left, which is the one of interest.

Of course, there are many different ways the same process can be approached.  That is, it doesn't have to be when a bug was checked into the project.  It could be finding when a particular feature or function was introduced, when test coverage had been increased, and a myriad of other reasons.

Once used, `git-bisect` will quickly be one of the most-used tools in your toolbox.

## Examples

### Good/Bad

Obviously, the way I've used `git-bisect` the most has been to find a bug.  However, it can be used for anything that can be defined as good/bad, new/old, present/absent, etc.  These are referred to as terms, and good/bad are the default ones.  We'll see more about them later.

For now, the standard way of bisecting is to use `start` it and define the `bad` commit and the `good` commit.  For example, if the current commit contains the bug and a known commit further down the branch doesn't contain the bug, then the bisect operation would be initiated like the following:

```bash
$ git bisect start
$ git bisect bad HEAD
$ git bisect good HEAD~500
Bisecting: 1127 revisions left to test after this (roughly 10 steps)
[12841c449c8d4577b330ee18778eefdf22cd3556] Merge branch 'rs/archive-with-attr-pathspec-fix'
```

Note that for the `bad` commit, the reference, SHA or tag can be omitted if it's the current one (`git bisect bad`).

Like the binary search algorithm, Git will now choose a commit in the middle of the selected history range and checks it out as the current.

If this is a Go project, you'd now compile it and run it to see if the bug is present in the present commit.  If it is **not** present, tell Git by marking it as `good`:

```bash
$ git bisect good
```

Of course, mark it as `bad` if it contains the bug:

```bash
$ git bisect bad
```

Simply repeat this process until `git-bisect` spits out the bad commit.

Notable, there are files and a directory in the Git database that are created when bisecting.

```bash
$ ls .git/BISECT_*
.git/BISECT_ANCESTORS_OK  .git/BISECT_EXPECTED_REV  .git/BISECT_LOG  .git/BISECT_NAMES  .git/BISECT_START  .git/BISECT_TERMS
$ tree .git/refs/bisect
.git/refs/bisect/
├── bad
└── good-06e570c0dfb2a2deb64d217db78e2ec21672f558

1 directory, 2 files
$ cat .git/refs/bisect/*
9520f7d9985d8879bddd157309928fc0679c8e92
06e570c0dfb2a2deb64d217db78e2ec21672f558
$ cat .git/BISECT_LOG
git bisect start
# status: waiting for both good and bad commits
# bad: [9520f7d9985d8879bddd157309928fc0679c8e92] The eighth batch
git bisect bad 9520f7d9985d8879bddd157309928fc0679c8e92
# status: waiting for good commit(s), bad commit known
# good: [06e570c0dfb2a2deb64d217db78e2ec21672f558] Sync with 'maint'
git bisect good 06e570c0dfb2a2deb64d217db78e2ec21672f558
```

### Alternate Terms

We can also view the terms that were used for this bisect operation:

```bash
$ git bisect terms
Your current terms are good for the old state
and bad for the new state.
$ cat .git/BISECT_TERMS
bad
good
```

Here is an example when using the default terms of `good` and `bad` may not be as intuitive or accurate as we would like.  In this case, we can change the terms to be more reflective of the search operation we are undertaking.  Instead of `good` and `bad`, we're looking for `unchanged` and `changed`, respectively, to demonstrate the different states of the file.

Instead of building the code, we can simply do an `ls` at each iteration:

```bash
$ git bisect start --term-old unchanged --term-new changed
status: waiting for both good and bad commits
$ git bisect terms
Your current terms are unchanged for the old state
and changed for the new state.
$ git bisect changed
status: waiting for good commit(s), bad commit known
$ git bisect unchanged $(git rev-list --max-parents=0 HEAD)
Bisecting: 4 revisions left to test after this (roughly 2 steps)
[25b622bd587c7489c749068784b17d2db6cc3bfe] Added unit tests
$ ls
binary_search.go  binarysearch_test.go  git-bisect*  go.mod  main.go  Makefile
$ git bisect unchanged
Bisecting: 2 revisions left to test after this (roughly 1 step)
[1614e3922e2def2a801bc5f571ee5e9611760411] Added LICENSE and README
$ ls
binarysearch.go  binarysearch_test.go  git-bisect*  go.mod  LICENSE  main.go  Makefile  README.md
$ git bisect changed
Bisecting: 0 revisions left to test after this (roughly 0 steps)
[3aa3b872084cd082285285218b02b62b1a8f899a] Changed file name to match convention
$ ls
binarysearch.go  binarysearch_test.go  git-bisect*  go.mod  main.go  Makefile
$ git bisect changed
3aa3b872084cd082285285218b02b62b1a8f899a is the first changed commit
commit 3aa3b872084cd082285285218b02b62b1a8f899a
Author: Benjamin Toll <ben@benjamintoll.com>
Date:   Mon Feb 17 20:44:32 2025 -0500

    Changed file name to match convention

 binary_search.go | 16 ----------------
 binarysearch.go  | 16 ++++++++++++++++
 2 files changed, 16 insertions(+), 16 deletions(-)
 delete mode 100644 binary_search.go
 create mode 100644 binarysearch.go
```

### Skipping

### Scripting

`test_build.sh`

```bash
#!/bin/bash

make || exit 125 # This skips a broken build.
[[ $(./git-bisect -n 99) -ne 10 ]] || exit 1

```

Weeeeeeeeeeeeeeeeeeeeeeeeeeee

```bash
$ git rebase -i --root
```

## References

- [`git-bisect`](https://git-scm.com/docs/git-bisect)

[Gallic Wars]: https://en.wikipedia.org/wiki/Gallic_Wars
[Jasmine]: https://jasmine.github.io/

