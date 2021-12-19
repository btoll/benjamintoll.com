+++
title = "On Tailing the History"
date = "2021-12-19T05:11:24Z"

+++

I was watching a demo the other week, and the presenter was tailing his `.bash_history` file in real time to log all the commands he was inputting into another session.

I thought this was pretty cool, and I wondered how it was done.  My understanding was that the [`history`] program only wrote the to the file when the shell exited, but here I could see that it was writing to the file as soon as the chosen command returned.

Here is the command:

```
$ tail -n 0 -f ~/.bash_history
```

However, when I entered that into a new session and inputted some commands into another, nothing was printed to `stdout` in the session where I ran `tail`.

What's going on?  How can I get that to work?

---

## What's going on?

By design, the commands entered into a shell are only written to the history file when the shell is exited.  So, it's necessary to write to the history file in real time instead of waiting until logging out.

> If the terminal session crashes before exit, any commands that you had entered are never written to disk and are lost!

## How can I get that to work?

It's actually quite simple.  In short, the following statements need to be present in `.bashrc` or in a file sourced from it:

<pre class="math">
shopt -s histappend
export PROMPT_COMMAND="history -a"
</pre>

The first statement is to `shopt`, which sets and unsets shell options.  This sets the `histappend` shell option to append to the history file (`HISTFILE`) rather than overwriting it.

From the [Bash man page]:

<pre class="math">
histappend
                      If set, the history list is appended to the file
                      named by the value of the HISTFILE variable when
                      the shell exits, rather than overwriting the file.
</pre>

> By default, `HISTFILE` is `$HOME/.bash_history`.
>
> For instance, in my environment, I'm using the default value and not setting a custom location.  The first command below verifies that the value of `HISTFILE` isn't set in my environment, and the second echoes the default value:
>
>     $ printenv | ag histfile\b
>     $ echo $HISTFILE
>     /home/btoll/.bash_history

The second statement exports the [`PROMPT_COMMAND`] environment variable.  Bash will execute any values it finds in this variable, with the result being exactly what I want:  it will write the command immediately to `HISTFILE` rather than waiting for the shell to exit.  This has the effect of the entered command being written to `stdout` by the [`tail`] command that is following the `.bash_history` file.

Of course, this only takes effect after sourcing `.bash_profile` (or similar) or logging out and back in again.

```
$ . ~/.bash_profile`
$ shopt histappend
histappend      on
$ echo $PROMPT_COMMAND
history -a
```

Finally, it's working as I'd like it to.

## Why do this at all?

I'd like to capture each command as I enter it and write it to a file.  Then, I can send that to another person or another thing or the New York Times, or I can attach those commands to an article I'm writing for my website.

This is the magical incantation:

```
$ tail -n 0 -f ~/.bash_history | tee history.cap
```

## Conclusion

You can find more `history` options by entering the following command into a terminal:

```
$ help history
or
$ history --help
```

## References

- [Is it possible to make writing to .bash_history immediate?](https://askubuntu.com/questions/67283/is-it-possible-to-make-writing-to-bash-history-immediate)

[`history`]: https://www.man7.org/linux/man-pages/man3/history.3.html
[Bash man page]: https://man7.org/linux/man-pages/man1/bash.1.html
[`PROMPT_COMMAND`]: https://www.gnu.org/software/bash/manual/html_node/Controlling-the-Prompt.html
[`tail`]: https://www.man7.org/linux/man-pages/man1/tail.1.html

