+++
title = "On Vim and `filetype` Plugins"
date = "2021-12-11T04:04:37Z"

+++

When writing my recent article [On Viewing Documentation in Vim], I [found an article] that referenced how to cleanup and organize Vim configuration when there are too many [autocommand] (`autocmd`) commands (commands that are executed automatically for matching file types).  This had me think of my [`.vim.autocmd`] file, which was growing out of control.

This of course led me down a rabbit hole, which was of course delightful and edifying.  I found out that Vim's file type plugins [`ftplugins`] is what I should have been using, probably twenty years too late!  Neat!

> What is that `.vim.autocmd` file?  It's not a standard Vim file!
>
> Years ago, my `.vimrc` started getting too unmanageable so I had broken similar functionality out into their own files and then [sourced them from `.vimrc`].
>
> Turns out that was a giant hack, at least for the bits that were file type dependent!  Awesome!

---

- [Vim Plugins](#vim-plugins)
- [Vim Configuration Cleanup](#vim-configuration-cleanup)
- [Creating Your Own `ftplugin`](#creating-your-own-ftplugin)
    + [Detecting a New File Type](#detecting-a-new-file-type)
- [Order of Precedence](#order-of-precedence)
    + [Use Cases](#use-cases)
- [Conclusion](#conclusion)

---

Before we get started, let's define some terms.

- Vim runtime directory
    + By convention, this is usually `$HOME/.vim`
- `$VIMRUNTIME`
    + This variable usually isn't set, and shouldn't be set, by a user.  Instead, it will be automatically set by Vim.
    + By convention, this will usually be the Vim installation directory.  On Linux, it's commonly `/usr/share/vim/vim80`, where `80` is the version number (`8.0`).
- User `filetype` plugin
    + This refers to a `filetype` plugin added to the `$HOME/.vim/ftplugin` location.

## Vim Plugins

What is a Vim plugin?  [From the docs]:

> A plugin is nothing more than a Vim script file that is loaded automatically when Vim starts.

The two types of plugins are `global` and `filetype`, and it is of course the latter with which we'll be concerning ourselves today.

The `filetype` plugins will be loaded and parsed automatically for a matching file type, so there is no need to do anything (well, that's not *exactly* true, as we'll see in a minute).  Just load your Python script in Vim, and the settings defined in the plugin will be automatically applied.

The `ftplugins` are loaded in the order determined by the value of [`runtimepath`], which works just like the `PATH` variable that is searched to find a binary.  In other words, if it's not in the path, Vim won't find the `ftplugin`, and `ftplugins` sourced later will overwrite the same options that were sourced earlier.

## Vim Configuration Cleanup

What was the problem with my older configuration that I wanted to change?  Well, when setting options for each file type that I worked with, I found myself writing lines like this in `.vim.autocmd` that kept growing:

```
autocmd FileType c,cfg,coffee,conf,cpp,css,dockerfile,elm,expect,javascript,go,groovy,haskell,html,json,markdown,php,python,sh,text,tf,typescript,vim setlocal autoindent expandtab shiftwidth=4 tabstop=4 fileformat=unix
```

And every time I needed to add an option for a file type, I had to wade through the commands to find the appropriate autocommand.

Yeah, not great.

> The irony was that I had thought that breaking all of the autocommands into their own file *was* cleaning up my Vim configuration!  What an idiot!

So, to clean this up, I added a `{LANGUAGE}.vim` file in my new [`$HOME/.vim/ftplugin/`] directory for each file type that was referenced in one of the autocommands.

The end result was the settings for a particular file type are nicely grouped within the appropriate file in a new `ftplugin` directory that Vim knows to find and source (i.e., it's not an arbitrarily named directory in an arbitrarily chosen location):

```
$ ls ~/.vim/ftplugin/
asm.vim   coffee.vim  c.vim           gitconfig.vim  html.vim        markdown.vim  sql.vim   txt.vim
bash.vim  conf.vim    dockerfile.vim  go.vim         javascript.vim  php.vim       text.vim  typescript.vim
cc.vim    cpp.vim     elm.vim         groovy.vim     json.vim        python.vim    tf.vim    vim.vim
cfg.vim   css.vim     expect.vim      haskell.vim    make.vim        sh.vim        tmux.vim  yaml.vim
```

For an added bonus, the `.vim.autocmd` file was then small enough that I moved the remaining bits back into `.vimrc` and removed the `.vim.autocmd` file entirely.  Nice!

> Note that you can add as many `filetype` plugins in the directory as you want, and nothing will be overwritten.  Just use the following convention:
>
> <pre class="math">
> ftplugin/&lt;filetype&gt;.vim
> ftplugin/&lt;filetype&gt;_&lt;name&gt;.vim
> ftplugin/&lt;filetype&gt;&lt;&lt;name&gt;.vim
> </pre>
>
> For instance, if you have a tremendous amount of options for JavaScript that you wanted to separate into groupings, you could do the following:
>
> <pre class="math">
> ~/.vim/ftplugin/javascript.vim
> ~/.vim/ftplugin/javascript_def.vim
> ~/.vim/ftplugin/javascript_set.vim
> ~/.vim/ftplugin/javascript/header.vim
> </pre>
>
> See the [Using A Filetype Plugin] in the Vim docs.

## Creating Your Own `ftplugin`

Creating your own custom `filetype` plugin is not only instructive, but it easily allows us to see Vim's established order of precedence for `ftplugins` and their contents.  This order on its location in the filesystem as dictated by the `runtimepath` value, as described above.

To demonstrate this, I'll create a new `.balls` file type, and to keep it simple, I've only add a few options to it.

`balls.vim`

<pre class="math">
setlocal tabstop=111
setlocal timeoutlen=666
</pre>

The values are obviously ridiculous, but in so doing it will be easy for us to see which values were overridden, i.e., which `ftplugin` "won" or was sourced last, and which settings were added/merged with no conflicts.

I'll drop this into my `filetype` `ftplugins` location:

```
$ cat << EOF > $HOME/.vim/ftplugin/balls.vim
setlocal tabstop=111
setlocal timeoutlen=666
EOF
```

That should be it!  Since the location `$HOME/.vim/ftplugin` is in Vim's `runtimepath`, it will be automatically found and sourced.  This will Just Work.

```
$ touch basket.balls
$ vim -c "set tabstop" basket.balls
tabstop=4
```

Hmm, I was expecting the value to be `111`, what happened?  It's behaving as though Vim hadn't sourced the `ftplugin`.

Let's see what Vim thinks the file type is:

```
$ vim -c "set filetype" basket.balls
filetype=sh
```

[Say what?!]

Looks like we need to tell Vim about our new file type.

### Detecting a New File Type

So, how should we proceed?

One possible solution would be to set the file type every time we opened the file (or set it once the file was opened):

```
$ vim -c "set filetype=balls" -c "set tabstop" basket.balls
tabstop=111
```

That's really bad, though, I mean, that solution really stinks.  Vim will automatically detect the file type and source the right plugin(s), so let's get that working instead.

There are several ways that we can "tell" Vim [how to detect a file].

- Put it in your `.vimrc`.  This is the easiest way, but it's not implicitly recommended in the docs.

    <pre class="math">
    autocmd BufRead,BufNewFile &#42;.balls setfiletype balls
</pre>

- Create a new directory `ftdetect` in your user runtime directory and add a file to it.

    ```
    mkdir -p $HOME/.vim/ftdetect
    cat << EOF > $HOME/.vim/ftdetect/balls.vim
    au BufRead,BufNewFile *.balls            set filetype=balls
    EOF
    ```

- Add a `filetype.vim` file in your user runtime directory.

    `$HOME/.vim/filetype.vim`

    <pre class="math">
	" my filetype file
	if exists("did_load_filetypes")
	  finish
	endif
	augroup filetypedetect
	  au! BufRead,BufNewFile *.balls        setfiletype balls
	  au! BufRead,BufNewFile *.xyz          setfiletype drawing
	augroup END
</pre>

> Note that there is an extremely important yet subtle difference between the different ways of syntactically setting the filetype.

Let's query the file now:

```
$ vim -c "set tabstop" -c "set filetype" basket.balls
tabstop=111
filetype=balls
```

Ok, that's more like it.

## Order of Precedence

Here is the order of directory precedence on Unix systems:

1. `$HOME/.vim`
    - user files
1. `$VIM/vimfiles`
    - system files
1. `$VIMRUNTIME`
    - files distributed with Vim
    - usually something like `/usr/share/vim/vim80` (`80` is the version, i.e., `8.0`)
1. `$VIM/vimfiles/after`
    - system files
1. `$HOME/.vim/after`
    - user files

For demonstration purposes, I'll install the `balls.vim` plugin in `/usr/share/vim/vim80/ftplugin` and pretend as though it were installed along with Vim.  I'll set the same `tabstop` option, but with a different value so we can easily see which one was applied.  I'll include the `shiftwidth` option, but I'm **not** including the `timeoutlen` option as I did in the user `ftplugin` location (`$HOME/.vim/ftplugin/balls.vim`).

```
$ cat << EOF | sudo tee /usr/share/vim/vim81/ftplugin/balls.vim
setlocal tabstop=333
setlocal shiftwidth=15
EOF
```

Now, when we load our file with the `balls` file type (extension), let's see which options were applied.

```
$ vim -c "set" basket.balls
--- Options ---
  autowrite           helplang=en         number              syntax=balls        ttymouse=xterm
  background=dark     hidden              ruler               tabstop=333         visualbell
  cscopetag           hlsearch            scroll=14           tags=tags;/         t_vb=
  cscopeverbose       ignorecase          shiftwidth=85     notimeout
  filetype=balls      incsearch           showcmd             timeoutlen=666
  ...
```

The result is that when there are same-named options set in the different `ftplugin` locations, the last `ftplugin` sourced in the `runtimepath` will override any others.  In addition, all options that are present in one but not another are included and merged.

Specifically:

- `tabstop`
    + is taken from `/usr/share/vim/vim80/ftplugin/balls.vim`
    + it overrides the value from `$HOME/.vim/ftplugin/balls.vim` that was previously sourced
- `shiftwidth`
    + is taken from `/usr/share/vim/vim80/ftplugin/balls.vim`
    + this option is not included in `$HOME/.vim/ftplugin/balls.vim`
- `timeoutlen`
    + is taken from `$HOME/.vim/ftplugin/balls.vim`
    + this option is not included in `/usr/share/vim/vim80/ftplugin/balls.vim`

Let's add one more `balls` `ftplugin` to another location, the last one in the order of precedence above (`$HOME/.vim/after/ftplugin`).

```
$ mkdir -p $HOME/.vim/after/ftplugin
$ cp $HOME/.vim/ftplugin/balls.vim $HOME/.vim/after/ftplugin
$ sed -i 's/111/555/' $HOME/.vim/after/ftplugin/balls.vim
$ vim -c "set tabstop" basket.balls
tabstop=555
```

As expected, the last plugin sourced wins, which is the one that we just added with the option and value `tabstop=555`.

### Use Cases

For me, there are two scenarios to consider when deciding to add a plugin to either the `$HOME/.vim/ftplugin` directory or the `$HOME/.vim/after/ftplugin` directory.

- Adding to `ftplugin/`
    + This seems to be the majority of the cases.  The default `filetype` plugin in `$VIMRUNTIME/ftplugin` has set many default settings, but it hasn't set one the one you're interested in.
    + Adding this option to the user `filetype` plugin won't clash with another `ftplugin` in another location because it hasn't been set by another `ftplugin`.

- Adding to `after/ftplugin`
    + There is a already a `ftplugin` for this in the Vim installation location `$VIMRUNTIME` **and** it has set the option you're interested in.
    + In other words, if you set the option in the user location `$HOME/.vim/ftplugin` it will be overwritten later in the installation `ftplugin` location.
    + So, add it **after** everything else has been sourced, and your option will be the one that "wins", i.e., it will overrule anything that was previously set.

## Conclusion

This reinforced my belief that it's important to always be revisiting past projects to reevaluate the approach taken and to learn more about the tools I use.  I almost always discover a native or better way to do something that I previously hacked together!

## References

- [Vim and the ftplugin folder](https://www.gilesorr.com/blog/vim-ftplugin.html)
- [Using ftplugin to tidy my Vim configuration](https://www.jackfranklin.co.uk/blog/using-ftplugin-in-vim/)
- [Keep your vimrc file clean](https://vim.fandom.com/wiki/Keep_your_vimrc_file_clean)

[On Viewing Documentation in Vim]: /2021/12/08/on-viewing-documentation-in-vim/
[found an article]: https://www.gilesorr.com/blog/vim-ftplugin.html
[autocommand]: http://vimdoc.sourceforge.net/htmldoc/autocmd.html#autocommand
[`.vim.autocmd`]: https://github.com/btoll/dotfiles/blob/e8584629e78af1c50a78a44e81c4cb69866e8563/vim/.vim.autocmd
[sourced them from `.vimrc`]: https://github.com/btoll/dotfiles/blob/master/vim/.vimrc#L113-L123
[`ftplugins`]: https://vimhelp.org/usr_05.txt.html#ftplugins
[From the docs]: https://vimhelp.org/usr_05.txt.html#add-plugin
[`runtimepath`]: https://vimhelp.org/options.txt.html#%27runtimepath%27
[`$HOME/.vim/ftplugin/`]: https://github.com/btoll/dotfiles/tree/master/vim/ftplugin
[Say what?!]: https://www.youtube.com/watch?v=o6KYKKvs9C0&t=206s
[how to detect a file]: https://vimhelp.org/filetype.txt.html#new-filetype
[Using A Filetype Plugin]: https://vimhelp.org/usr_05.txt.html#ftplugin-name
