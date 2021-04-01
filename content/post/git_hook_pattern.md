+++
title = "On a Git Hook Pattern"
date = "2021-03-30T23:22:42-04:00"

+++

Everybody knows about [Git hooks] and their usefulness.  Some developers I've met have an extreme bitterness and antipathy towards them, and that's just weird<sup>\*</sup>.

Anyway, at a point in time around the death of [Lorenzo the Magnificent], I found myself needing a pattern for running many of the same kind of hooks sequentially (for example, more than one `pre-commit` hook when creating a commit), and I wondered about the best way to do that.  Or, at least, a way that would be relatively easy to implement and maintain, while also using existing Git best practices or tooling.

# What's the Problem?

The sample examples for the Git hooks in `.git/hooks`, while helpful, didn't address my use case.  For example, I want to install more than just one hook for `pre-commit`, for example, and I'd like to run one only process per hook.  In other words, run one script for linting, one script for error checking, etc., and I want each script to [do only one thing and do it well].

I came across a pattern based on a post by [Junio Hamano] (it's since been taken down, and unfortunately I cannot find another reference to it).  The idea is to have a [section] in a Git config file, whether local or global, that lists all of the hooks for a particular Git action and project.  The hooks themselves live in a `precommit.d` directory inside the project's `.git/hooks` directory and can be listed using `git config`.

The `pre-commit` script (or any other one that is defined) would then iterate over the returned values from `git config`, where each value would represent a script in the adjacent `pre-commit.d` directory.   Each script would then be called in the order of the list value returned by `git config`.

In the case of the `pre-commit` Git action, the tree directory structure would look like this:

<pre class="math">
$ tree <a href="https://github.com/btoll/git-init/tree/master/hooks">.git/hooks/</a>
.git/hooks/
├── pre-commit
└── pre-commit.d
    ├── pycodestyle.sh
    └── pytest.sh
</pre>

I knew that this approach would suit well my purposes, so I promptly stole it.

Enough chatter, let's see an example.

# Updating the Config File

I have a project called [`saddle`].  I'd like it to run two hooks every time I commit, and I have two locations to choose from in which to update the appropriate Git config:

- [global](#global)
- [local](#local)

Of the two, I almost always install locally.  We'll see below what the difference is in the config files.

> Although there are many actions for both the client and server, I find myself using the `pre-commit` Git client hook the most.  But I need to branch out, meet new actions...

### global

Nitpickers might say that depending on the number of projects and the number of hooks, this could bloat the global Git config file, but I don't think this is a big deal.  Also, the config file is meant to be parsed using the [`git config`] tool, so there's really no reason to open it with an editor (although I do all the time **:)** ).

Here are the commands to install the hooks globally for the `pre-commit` hooks for the [`saddle`] project:

```
$ git config --global --add hooks.pre-commit.saddle pycodestyle.sh
$ git config --global --add hooks.pre-commit.saddle pytest.sh
```

> Note that the order is `SECTION_HEADER.HOOK_ACTION_TYPE.PROJECT_NAME`.

This will write to the Git config in the user's home directory, `$HOME/.gitconfig`.

<pre class="math">
[hooks "pre-commit"]
        saddle = pycodestyle.sh
        saddle = pytest.sh
</pre>

Now, let's suppose that I also have another project called `foobar`.  This app is going to change the world and disrupt the disruptors, and I'm so confident that there are no bugs in it that I didn't create any tests for it.  As such, I only need the `pycodestyle.sh` for linting:

I'll also install this globally:

```
$ git config --global --add hooks.pre-commit.foobar pycodestyle.sh
```

Let's now check out the same section in the Git config file:

<pre class="math">
[hooks "pre-commit"]
        saddle = pytest.sh
        saddle = pycodestyle.sh
        foobar = pycodestyle.sh
</pre>

Here it will create a separate entry for the new hook with its project name to differentiate it from the others (i.e., it will not overwrite any existing entries).  The Git tooling makes it easy to retrieve any hooks based upon the project, and this way there can be any number of hooks defined for different projects.

Let's list the scripts for each project:

```
$ git config --global --get-all hooks.pre-commit.saddle
pytest.sh
pycodestyle.sh
$
$ git config --global --get-all hooks.pre-commit.foobar
pycodestyle.sh
```

[Kool Moe Dee].

> If I had combined both hooks into one script, then I would have had to separate them out now anyway.  Having one script per hook makes it easy to consume them.

### local

Again, this is my preferred way of installing scripts.  It feels cleaner than having everything dumped into the global config, and it's the first place to think to look for any install hooks that are being called for various Git actions.

```
$ git config --local --add hooks.pre-commit pycodestyle.sh
$ git config --local --add hooks.pre-commit pytest.sh
```

> Note that when installing them locally that there is no need to include the project name.

This will result in updates to the Git config in the project root, i.e., `./.git/config`.

<pre class="math">
[hooks]
        pre-commit = pycodestyle.sh
        pre-commit = pytest.sh
</pre>

Let's install another just to show that future entries will never overwrite existing ones:

```
$ git config --local --add hooks.pre-rebase derp.sh
```

<pre class="math">
[hooks]
        pre-commit = pycodestyle.sh
        pre-commit = pytest.sh
</pre>

And the state of the config file now:

<pre class="math">
[hooks]
        pre-commit = pycodestyle.sh
        pre-commit = pytest.sh
        pre-rebase = derp.sh
</pre>

That's pretty sweet, yo.

# Installing the Hooks

The easiest step.  Copy `pre-commit` and `pre-commit.d` and its contents to `./.git/hooks`.  Oh, and don't forget to make the shell scripts executable!

# Let's See the Code

[`pre-commit`]

<pre class="math">
#!/bin/bash

# Try for local hooks first.
HOOKS=$(git config --local --get-all hooks.pre-commit)                  (1)

if [ -z "$HOOKS" ]
then
    HOOKS=$(git config --global --get-all hooks.pre-commit.saddle)      (2)
fi

if [ -n "$HOOKS" ]
then
    for HOOK in $HOOKS
    do
        if ! bash "./.git/hooks/pre-commit.d/$HOOK"                     (3)
        then
            exit 1                                                      (4)
        else
            # Separate the hooks by an empty line.
            echo
        fi
    done
fi
</pre>

Notes:

1. Gather all local the pre-commit hooks, if defined.  Will return the values to the var `$HOOKS` if anything is defined:

        $ git config --get-all --local hooks.pre-commit
        pycodestyle.sh
        pytest.sh

1. Gather all local the pre-commit hooks, if defined.
1. Execute with `bash` rather than `sh` to take advantage of the advanced feature set.
1. Here is it exiting on the first pre-commit hook that fails.  This could be changed to iterate through all possible values and gather the failures into an array before exiting (see the pre-commit scripts below for an example of this).  Adjust as necessary.

[`pycodestyle.sh`]

<pre class="math">
#!/bin/bash

if ! which pycodestyle > /dev/null
then
    echo "$(tput setab 7)$(tput setaf 4)[INFO]$(tput sgr0) $(tput bold)pycodestyle$(tput sgr0) is not present on the system..."
    exit 0
fi

FILES=$(git diff-index --cached --name-only HEAD 2> /dev/null | grep ".py\b")

if [ -n "$FILES" ]
then
    echo "$(tput setab 7)$(tput setaf 4)[INFO]$(tput sgr0) Running $(tput bold)pycodestyle$(tput sgr0) pre-commit hook..."

    for file in $FILES
    do
        if ! pycodestyle "$file"
        then
            # Note that pycodestyle's error messages are verbose enough that we don't need to have our own.
            EXIT_CODE=1
        fi
    done

    if [ $EXIT_CODE -eq 0 ]
    then
        echo "$(tput setab 7)$(tput setaf 2)[INFO]$(tput sgr0) Completed successfully."
    fi
fi

exit $EXIT_CODE
</pre>

Note that the script isn't bailing as soon as it gets a non-zero return value.  This allows the coder to see all the errors in all the files at once, which I think is better than fixing a script at at time.

[`pytest.sh`]

<pre class="math">
#!/bin/bash

if ! which pytest > /dev/null
then
    echo "$(tput setab 7)$(tput setaf 4)[INFO]$(tput sgr0) $(tput bold)pytest$(tput sgr0) is not present on the system..."
    exit 0
fi

FILES=$(git diff-index --cached --name-only HEAD 2> /dev/null | grep ".py\b")

if [ -n "$FILES" ]
then
    echo "$(tput setab 7)$(tput setaf 4)[INFO]$(tput sgr0) Running $(tput bold)pytest$(tput sgr0) pre-commit hook..."

    cd tests || exit
    pytest -v
    EXIT_CODE="$?"

    if [ $EXIT_CODE -eq 0 ]
    then
        echo "$(tput setab 7)$(tput setaf 2)[INFO]$(tput sgr0) Completed successfully."
    fi
fi

exit $EXIT_CODE
</pre>

> There is enough duplication in these scripts that it could justify refactoring out the common bits and only importing the actual logic, but that's out of scope of this article.

# Conclusion

This post has focused on the `pre-commit` Git action, but obviously it applies to any and all of them.  Just change the file and directory names as needed or write a nice little tool to do it for you!

I really like this approach, as it leverages Git's own tooling to determine the defined hooks for each action via its own config file.  Adding new actions is easy, and it would be simple to abstract this even further to come up with a nice portable tool to do almost all of the installation work for you.

---

<sup>\*</sup> You don't have to install them and, if you do, you can override them with `git commit --no-verify`.

[Lorenzo the Magnificent]: https://en.wikipedia.org/wiki/Lorenzo_de'_Medici
[Git hooks]: https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks
[do only one thing and do it well]: https://en.wikipedia.org/wiki/Unix_philosophy
[Junio Hamano]: https://simple.wikipedia.org/wiki/Junio_Hamano
[section]: https://en.wikipedia.org/wiki/INI_file
[`.git/hooks/`]: https://github.com/btoll/git-init/tree/master/hooks
[`git config`]: https://git-scm.com/docs/git-config
[`saddle`]: https://github.com/btoll/saddle
[Kool Moe Dee]: https://en.wikipedia.org/wiki/Kool_Moe_Dee
[`pre-commit`]: https://github.com/btoll/git-init/blob/master/hooks/pre-commit
[`pycodestyle.sh`]: https://github.com/btoll/git-init/blob/master/hooks/pre-commit.d/pycodestyle.sh
[`pytest.sh`]: https://github.com/btoll/git-init/blob/master/hooks/pre-commit.d/pytest.sh

