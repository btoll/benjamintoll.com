+++
title = "On Extending Git"
date = "2019-07-05T21:54:25-04:00"

+++

One of my favorite things to do is automate my workflows.  When it comes to version control, [Git] makes this extremely easy to do by allowing it to be extended.

So, what does it mean to extend Git?  Simply put, it's extending Git's behavior to do anything you would like.  Effectively, it's adding programs written in any language and invoking them as if they were Git built-ins.

For example, everyone knows `git-pull` and `git-push`.  I've extended Git to also do `git-hub` and `git-bootstrap`, as well as `git-dirty` (well, technically that's an alias, but you get my point).

## Extending Git

How is this done?  There are only three simple rules:

1. Create your script in a file called `git-SCRIPTNAME`, where `SCRIPTNAME` is obviously a placeholder for, well, the name of the script :)

1. Make the script executable.

1. Place the script in your `$PATH`.

Say what?  Yeah, it's really that easy.  But you will look like a hero to your peers!

> All of my Git extensions are shell scripts, but you can use any scripting language you'd like that's on the system.

Let's go further and create your own man pages for these extensions.

## Man Pages

Wouldn't it be [dynamite] to create and install your own man pages?  Wouldn't it be sweet to do `man git-SCRIPTNAME` and see your own majestic documentation?  Yes!

You can do this in four easy steps:

1. Download the `pod2man` package using your package manager.

2. Create a `.pod` file.  It's easy to create, just use one of mine as a template to create your own.

    For example, create `git-hub.pod`:

    <pre class="math">
    =head1 NAME

    git-hub - Open any file, directory or commit on GitHub in regular view or blame view.

    =head1 SYNOPSIS

    git hub [ -f, --file file ] [ -b, --branch branch ] [ --range 'L10-L20' ] [ --get-hash hash ] [ --hash hash ] [ --blame ]

    =head1 EXAMPLES

    git hub
        - Opens the current working directory.

    git hub --file grid/filters/filter/List.js
        - Opens the file.

    git hub -f grid/header/Container --blame
        - Opens the file in a blame view.

    git hub --branch extjs-4.2.x -f Component.js
        - Opens the file in a remote branch other than the one that is currently checked out.

    git hub --hash b51abf6f38902
        - Opens the commit hash.

    git hub --get-hash EXTJS-15755
        - Opens the commit hash to which the local topic branch points.

    git hub --get-hash extjs5.1.0
        - Opens the commit hash to which the tag points.

    git hub -f app.js --range 'L10-L20'
        - Opens the file with the specified range highlighted.

    =head1 AUTHOR

    Benjamin Toll &lt;benjam72@yahoo.com&gt;
    </pre>

3. Generate the file:

    ```
    pod2man git-hub.pod > git-hub.1
    ```

4. Weeeeeeeeeeeeeeeeeeeeeeeeee

> I've collected all of my extensions, aliases and hooks in my [dotfiles repository].  Check out the `README` for examples!</p>
</blockquote>

## Faves

I'll list some of my favorite Git extensions, ones that I use every single day.

- [`git-bootstrap`] - Open the files that make up a particular commit in Vim.

- [`git-hub`] - Open any file, directory or commit on GitHub in regular view or blame view.

- [`git-ls`] - List the files that are staged and modified or that make up any given commit and optionally open in Vim for editing.

Click through to see examples for each one.

## Installation

Since I'm a prince, I wrote some install scripts to make it easy to install both [the extensions] and [the man pages] on a system.

## Conclusion

I don't need no stinkin' conclusion.

## References

- [Extending git](https://www.atlassian.com/git/articles/extending-git)
- [Writing man-pages](http://linuxfocus.org/English/November2003/article309.shtml)

[Git]: https://git-scm.com/
[dynamite]: https://www.youtube.com/watch?v=b5rKZs6HnB4
[dotfiles repository]: https://github.com/btoll/dotfiles/tree/master/git-hub
[`git-bootstrap`]: https://github.com/btoll/dotfiles/blob/master/git-hub/bin/git-bootstrap
[`git-hub`]: https://github.com/btoll/dotfiles/blob/master/git-hub/bin/git-hub
[`git-ls`]: https://github.com/btoll/dotfiles/blob/master/git-hub/bin/git-ls
[the extensions]: https://github.com/btoll/dotfiles/blob/master/git-hub/install.sh
[the man pages]: https://github.com/btoll/dotfiles/blob/master/git-hub/install_manpages.sh

