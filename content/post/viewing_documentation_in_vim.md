+++
title = "On Viewing Documentation in Vim"
date = "2021-12-08T04:08:36Z"

+++

I just discovered something delightful.  I'm giddy and extremely titillated.  I can access *both* the man pages *and* the docs for a particular language that matches that of the file type for the word underneath the cursor.

Holy zap!

Now, that was a mouthful, how about an example.  Yes!

By default, Vim allows for opening the man page (if there is one) of the keyword underneath the cursor by pressing [`Shift + k`].

<pre class="math">
K			Run a program to lookup the keyword under the
			cursor.  The name of the program is given with the
			'keywordprg' (kp) option (default is "man").
</pre>

Ok, that's great, especially when coding in C or doing any kind of shell scripting!  But wait!  There's more.

Imagine that you're programming in Go, and you can access not only the man pages **but also** Go docs.  [What?!?]  Yes!

How does Vim determine which program to run?  As the snippet from the docs above tells us, the `keywordprg` (or its shortened version `kp`) option is responsible for that.

To see this in action, open any file in Vim and run the command `:set kp`.  Vim will tell you what it has set the option's value to be for that particular file.

For example, when I open a Python script, the result of running `:set kp` is `keywordprg=pydoc`.

keywordprg=:help

Whoa, is that for real?  [Yes! A thousand times, Yes!]

---

## Just For Fun

1. How can I invoke Vim and **not** have it parse my `.vimrc`?

    Vim reads the `.vimrc` run command file every time it's loaded, and so it loads all of the plugins and customizations, if any.  I have [quite a bit].

    That's only a [`:help -u`] away (in a Vim session)!

    Inspecting the documentation for `-u` within the [`vim-arguments`] section, the following passage looks like a winner:

    <pre class="math">
    When {vimrc} is equal to "NONE" (all uppercase), all initializations from files
    and environment variables are skipped, including reading the gvimrc file when the
    GUI starts.  Loading plugins is also skipped.
    </pre>

    ```
    $ vim -u NONE server.c
    ```

1. How can I see all of the defined mappings?

    <pre class="math">
    ...
    n  ,K            :call &lt;SNR&gt;15_PreGetPage(0)&lt;CR&gt;
    ...
    </pre>

    So, after seeing this, I knew that I was wrong about my assumption.  It's a plugin, but not one loaded by `vim-plug`.  Instead, it's the native `ftplugin/man.vim` that's the bad guy and is referenced in my `.vim.mappings` file, sourced by `.vimrc`:

    <pre class="math">
    runtime ftplugin/man.vim
    </pre>

    > How did I know that from the cryptic output above?  Well, I didn't.  I just knew of the native `ftplugin/man.vim` plugin and the function above looked familiar.  Just dumb luck, really.

    Ah, let's now look at the help section for man, [`:help man`].  And there it is, the answer we've been seeking:

    <pre class="math">
    ...

    To start using the :Man command before any manual page has been loaded,
    source this script from your startup vimrc file:
            runtime ftplugin/man.vim

    ...

    Global mapping:
    &lt;Leader&gt;K	Displays the manual page for the word under the cursor.
    &lt;Plug&gt;ManPreGetPage  idem, allows for using a mapping: &gt;
                nmap &lt;F1&gt; &lt;Plug&gt;ManPreGetPage&lt;CR&gt;

    ...
    </pre>

## References

- [VIM: Powerful “Shift + K”](https://wenijinew.medium.com/vim-powerful-shift-k-748fec296319)

[`Shift + k`]: https://vimhelp.org/various.txt.html#K
[What?!?]: https://www.youtube.com/watch?v=o6KYKKvs9C0&t=206s
[Yes! A thousand times, Yes!]: https://www.youtube.com/watch?v=9_th4LsV9kE
[quite a bit]: https://github.com/btoll/dotfiles/tree/master/vim
[`:help -u`]: https://vimhelp.org/starting.txt.html#-u
[`vim-arguments`]: https://vimhelp.org/starting.txt.html#vim-arguments
[`:help man`]: https://vimhelp.org/filetype.txt.html#man.vim

<!--
https://vimhelp.org/options.txt.html#%27keywordprg%27
-->

