+++
title = "On Debugging Python"
date = "2023-03-09T21:41:45-05:00"

+++

- [Introduction](#introduction)
- [`ipdb` Commands](#ipdb-commands)
- [Vim](#vim)
    + [Filetype Plugins](#filetype-plugins)
    + [Abbreviations](#abbreviations)
- [Conclusion](#conclusion)
- [References](#references)

---

## Introduction

Whenever I debug anything, I prefer it to be on a running production node. Changing production code on-the-fly is exhilarating.

My preference has long been to debug code in the terminal using a command-line debugger. Whether it’s [`Delve`](https://github.com/go-delve/delve) for Go, [`GDB`](https://benjamintoll.com/2018/05/19/on-debugging-with-gdb/) for C or [`ipdb`](https://pypi.org/project/ipdb/) for Python, I’ve found it to be fast, efficient and pleasing.

Who needs those trendy, bloated graphical debuggers? Not this guy. I’m not a weenie.

This isn’t a tutorial on how to debug Python programs. It’s just a quick entry in how easy it is for me to change contexts from writing code to debugging code. In `Vim`. Of course.

We’ll first take a look at some `ipdb` commands, and then we’ll get to the biscuits and gravy.

> I usually use [`virtualenv`](/2021/04/01/on-virtualenv/) to create isolated Python environments and install packages “locally” to the particular environment, but I’ve installed `ipdb` globally. Because it’s a debugger, yo.

## `ipdb` Commands

Let’s take a quick look at some of the most frequently-used `ipdb` debugger commands:

|**Command** |**Description** |
|:---|:---|
|`bt` |Dumps the stack trace. The most recent frame is at the bottom, and the current frame is indicated by an arrow.
|`c`, `cont`, `continue` |Continue execution. Stops at breakpoints.
|`d`, `down` |Moves the current frame count down `n` levels in the stack trace to a newer frame (defaults to one).
|`exit` |Quit the debugger.
|`help` |Print all available commands.
|`help (cmd)` |Get help about a particular command.
|`l`, `list` |Prints lines of code from the current stack frame. When entered repeatedly, will continue to move down through the code. Use `longlist` command to get back to the currently-executing line.
|`ll`, `longlist` |Prints lines of code from the current stack frame. Shows more lines than `list`. Use this command to get back to the current line of execution.
|`n`, `next` |Continue execution to the next line in the current function (skips over function calls, doesn’t descend into them) or it returns.
|`q`, `quit` |Quit the debugger.
|`r`, `return` |Continue execution until the current function returns. To “step out” of a function, couple this command with `next`, i.e., `r` then `n`.
|`s`, `step` | Executes a line and stops at the first possible occasion. Will descend (step) into function calls in the current frame.
|`u`, `up` |Moves the current from count up `n` levels in the stack trace to an older frame (defaults to one).
|`w`, `where` |Dumps the stack trace. The most recent frame is at the bottom, and the current frame is indicated by an arrow.

## `Vim`

### Filetype Plugins

[`Vim` filetype plugins](https://vim-jp.org/vimdoc-en/filetype.html#filetype-plugins) are super-duper. They allow you to use the same mappings everywhere and have it perform differently depending on the file type.

Want an example? As a programmer, you’ll be working in different languages all the time. That means you’ll also be debugging in different languages all the time.

So, you’ll be setting breakpoints in code (all the time), and you’ll (understandably) get tired of manually typing `runtime.Breakpoint()` or `ipdb.set_trace()` every time you want to create a breakpoint in a particular language.

So, it’s inefficient, impractical and unethical to try to create a mapping for each language. What you want is only one mapping that will behave differently according to the file type of your file.

Here’s another example. Most of the filetypes I work in have similar indentation specifications, but there are some outliers. Again, one mapping to rule them all, as it will indent according to the filetype.

I won’t get into the details of the filetype plugin feature in Vim, since [I already covered it](/2021/12/11/on-vim-and-filetype-plugins/) in an earlier article. But, you’ll want to install them wherever your `.vim` configuration directory is (usually in `HOME`). For example, here’s mine:

```bash
$ ls ~/.vim/ftplugin/
asm.vim     conf.vim        elm.vim        haskell.vim     make.vim      sh.vim    txt.vim
bash.vim    cpp.vim         expect.vim     html.vim        markdown.vim  sql.vim   typescript.vim
cc.vim      css.vim         gitconfig.vim  i3config.vim    php.vim       text.vim  vim.vim
cfg.vim     c.vim           go.vim         javascript.vim  python.vim    tf.vim    yaml.vim
coffee.vim  dockerfile.vim  groovy.vim     json.vim
```

As you can see, [I have a lot](https://github.com/btoll/dotfiles/tree/master/vim/ftplugin). Just think of all the uses:

-  programming languages
-  build tools ([`GNU Make`](https://www.gnu.org/software/make/))
-  window managers ([`i3`](https://i3wm.org/))
-  version control (`Git`)
-  shell scripts
-  data interchange formats (`JSON`, `YAML`)
-  creepy “devops” tools (`Terraform`)
-  on and on and on

In particular, it’s a jolly good place to put your custom mappings. This is where the debugging piece will start to make sense.

Here is an excerpt from my Python filetype plugin:

[`python.vim`](https://github.com/btoll/dotfiles/blob/master/vim/ftplugin/python.vim)

```vim
inoreabbrev bp import ipdb<cr><cr><cr>def main():<cr>""" derp """<cr>pass<cr><esc>O<cr><cr>if __name__ == "__main__":<cr>main()

nnoremap <leader>d oipdb.set_trace()<esc>
nnoremap <leader>D Oipdb.set_trace()<esc>

nnoremap <leader>r :!clear && python3 %<cr>
vnoremap <leader>r :echo system('python3 ' @")<cr>
```

So, all this is great, but how is this actually applied when developing?

Well, here are the steps to go from source to debug in `Vim`:

1.  `<leader>d` to set a breakpoint
2.  `<leader>r` to run the script, which enters the debugger

That’s it! When you exit the debugger, you’ll be plopped back into the script.

Note that you still have to import the `ipdb` package at the top of the script. But, if you’re smart, you already have that `import` statement at the top of every brand new Python script.

Let’s take a look at [Vim abbreviations](https://vimdoc.sourceforge.net/htmldoc/map.html#abbreviations), which easily allows us to create boilerplate code in any language.

### Abbreviations

Imagine you have an abbreviation that is defined like this:

```vim
inoreabbrev bp import ipdb<cr><cr><cr>def main():<cr>""" derp """<cr>pass<cr><esc>O<cr><cr>if __name__ == "__main__":<cr>main()
```

And, whose execution produces the following:

```python
import ipdb


def main():
    """ derp """
    pass


if __name__ == "__main__":
    main()
```

Well, it’d save keystrokes and dollars, and you’d be a hero, wouldn’t you? You would be in my book, little fella.

_And_, what if you had a `bash` function that called that abbreviation upon file creation? Well, that would be too much to bear:

```bash
$ type bp
bp is a function
bp ()
{
    if [ "$#" -eq 0 ]; then
        echo "$(tput setaf 1)[ERROR]$(tput sgr0) Not enough arguments.";
        echo "Usage: bp <filename>";
    else
        if ! stat "$1" &> /dev/null; then
            case "$1" in
                Dockerfile)
                    vim -c ":read ~/templates/dockerfile.txt" "$1"
                ;;
                *.elm)
                    vim -c ":read ~/templates/elm.txt" "$1"
                ;;
                *.html)
                    vim -c ":read ~/templates/html.txt" "$1"
                ;;
                *)
                    vim -c ":normal ibp" "$1"
                ;;
            esac;
        else
            echo "$(tput setaf 3)[WARN]$(tput sgr0) File exists, aborting.";
        fi;
    fi
}
```

The important bits are in bold.

This then allows me, the hero of this particular story, to do the following:

```bash
$ bp derp.py
```

And, voilà, I get the boilerplate (`bp`) code that I listed above.

The beauty of this technique is that you can put an abbreviation in any filetype plugin you wish.  The function will launch Vim, which parses the correct plugin based upon the file type extension.

Friends, let `Vim` do the heavy lifting for you.

> Afraid you’ll leave that `import` statement in your precious code and check it in to version control or push it to the cloud?
>
> Well, install a [Git hook](/2021/03/30/on-a-git-hook-pattern/) to search for that line in your staged files or catch it in a myriad number of other ways.
>
> Yay computers.

## Conclusion

My conclusion is that anyone who doesn’t use a command-line debugger is a rube.

## References

-  [On Cheat Sheets: GDB](/2019/11/09/on-cheat-sheets-gdb/)
-  [The `GNU` Readline Library](https://tiswww.case.edu/php/chet/readline/rltop.html)

