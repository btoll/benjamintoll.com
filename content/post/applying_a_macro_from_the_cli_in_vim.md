+++
title = "On Applying a Macro from the CLI in Vim"
date = "2021-11-08T00:30:52Z"

+++

Tonight I found an interesting solution to a problem where I needed to do some text manipulation on a string.

The details of the problem don't really matter (nor do the details of the Vim macro itself), as the intention of this brief post is just to capture a way to not only apply a macro from the command line in Vim but to first define it, as well.

I have a file that contains less than 100 lines of package names, on package name per line.  It looks like the following:

<pre class="math">
...
openssh-8.4.1
...
</pre>

I want to change each line to rename the package to just its name, minus the version:

<pre class="math">
...
mv openssh-8.4.1 openssh
...
</pre>

Clearly, there are many ways this can be accomplished.  Since one of my favorite things to do in Vim is [recording macros], I thought that would be a cool way to accomplish the task.  However, since I'd never tried to do this from the command line, I had to do a bit of thinking and searching to come up with a solution to then capture for all eternity.

> This may not be the most efficient or the most optimal or the most practical way to do this, but it's my world and you're just passing through.

---

So, let's first have a look at what the command and its arguments look like:

```
$ vim +1 foo.txt -c "let @z=\"EF-y0A \<Esc>pImv \<Esc>j\" | argdo normal 100@z" -c "argdo :x"
```

Notes:

- **`+1`**
    + Always open the file at the first line.  This is very important as there could be Vim statements in `.vimrc` or elsewhere that is saving the cursor position of the file if it had been previously opened.

- **`foo.txt`**
    + The file containing the text we want to operate on.

- **`let @z=\"EF-y0A \<Esc>pImv \<Esc>j\"`**
    + Define the macro in the `z` register.

- **`argdo normal 100@z`**
    + Apply the macro that is now located in the `z` register 100 times.

- **`argdo :x`**
    + Save and close the file.

> I had seen an example where it had saved and closed the file using the `ZZ` shortcut, however this did not work for me.  I found that it would only work by chaining another command that explicitly called the `:x` editor command.
>
> For completeness, here is the example that wouldn't work for me (it would save the file but not close it):
>
>     $ vim +1 foo.txt -c "let @z=\"EF-y0A \<Esc>pImv \<Esc>j\" | argdo normal 100@z | ZZ"

Lastly, if the macro is already in one of Vim's register, you can omit the first bit of the command that defines it:

```
$ vim +1 foo.txt -c "argdo normal 100@z" -c "argdo :x"
```

Happy Vimming!

Weeeeeeeeeeeeeeeeeeeeeeeee

[recording macros]: https://vim.fandom.com/wiki/Macros

