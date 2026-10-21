+++
title = "On exec As A Logger"
date = "2026-10-20T17:29:25-04:00"

+++

- [Introduction](#introduction)
- [Example](#example)
- [Conclusion](#conclusion)
- [References](#references)

---

## Introduction

Whenever I write an article, I will log all of the commands and their output and copy most or all of it to the post.  Back in the early days, I would do this manually, meaning I would highlight the text in the terminal emulator, copy it into the system buffer and then paste it into the article.  I felt like a noob, and I knew deep down in my heart of hearts that I needed to up my game.

Knowing that anything I need is already available to me, I looked to Bash provide me with the primitives I needed to come up with a nice solution.

Here are the pieces:

- [`exec`]
- Redirecting [standard streams]
- [`tee`]

That's it, pal!

[`exec`] is a Bash builtin that can do several different nifty things, but we'll only be focusing on one of them today: redirecting the [standard streams].

Here is its usage:

```bash
$ help exec
exec: exec [-cl] [-a name] [command [argument ...]] [redirection ...]
    Replace the shell with the given command.

    Execute COMMAND, replacing this shell with the specified program.
    ARGUMENTS become the arguments to COMMAND.  If COMMAND is not specified,
    any redirections take effect in the current shell.

    Options:
      -a name   pass NAME as the zeroth argument to COMMAND
      -c        execute COMMAND with an empty environment
      -l        place a dash in the zeroth argument to COMMAND

    If the command cannot be executed, a non-interactive shell exits, unless
    the shell option `execfail' is set.

    Exit Status:
    Returns success unless COMMAND is not found or a redirection error occurs.
```

## Example

Let's start a new [interactive shell] with no configurations and no inherited environment variables.  In other words, my current Bash shell will source [many different run command files] to configure the shell to my specifications, but for this session I want to start with a vanilla Bash shell.

> For example, my current shell has [ANSI control characters] in the [`PS1`] prompt, and they will be copied into the log file by the process I will explain below.  Unfortunately, the log file will not be able to correctly interpret these control characters without help, so I'm just going to avoid dealing with it at all.

```bash
$ env --ignore-environment bash --noprofile --norc -i
bash-5.2$ printenv
PWD=/home/btoll
SHLVL=1
_=/usr/bin/printenv
bash-5.2$
```

From the [Bash] man page:

```
--noprofile
	  Do  not  read  either  the  system-wide  startup file /etc/profile or any of the personal initialization files ~/.bash_profile, ~/.bash_login, or
	  ~/.profile.  By default, bash reads these files when it is invoked as a login shell (see INVOCATION below).

--norc Do not read and execute the system wide initialization file /etc/bash.bashrc and the personal initialization file ~/.bashrc if the shell  is  in‐
	  teractive.  This option is on by default if the shell is invoked as sh.
```

Note that "`exec` as a logger" will **not** work unless Bash is executed with the `-i` flag, which enables interactive mode.  This is very important; otherwise, any commaned entered at the prompt won't be captured along with the output.

When Bash is in interactive mode, it uses the [Readline] library to allow for things such as in-line editing in both `vi` and `emacs` mode as well as other features such as [history expansion].  Since it is a library that Bash uses when built with Readline support, it will write to the `stdout` of Bash.


Now, let's start the logging.  Here is the magic formula:

```bash
$ exec 3>&1 4>&2
$ exec 1> >(tee -a run.log) 2>&1
```

> Before we go any further, you may be wondering why I don't just get the commands from the Bash history.  While that is a nice option, it is limited to only the executed commands and won't contain the output.

When I first saw commands like these, I went cross-eyed.  Now, I'm a bit more used to them.  Repetition makes perfect.

The first one will create [file descriptors] 3 and 4 and assign them the current shell's `stdout` and `stderr`, respectively.  Essentially, this is saving those standard streams so we can restore them later before exiting the shell.

The second one will redirect `stdout` to the argument of the `exec` command, which is the command "`>(tee -a run.log)`".  This is one form of Bash [process substitution] that will create a pipe to send all `stdout` from Bash to [`tee`] (the process substition will create a file descriptor to which data is sent).  Lastly, `2>&1` will redirect `stderr` to `stdout`, but since `stdout` has been redirected to `tee` means that anything written to the `stderr` standard stream will also go to `tee`.

Notably, the `tee` process inherited its standard streams from the Bash shell **before** it had its streams redirected, so its `stdout` will still write to the terminal as usual (redirecting Bash's `stdout` doesn't also affect `tee`).  What has changed is that the process substitution pipe will deliver the output of Bash to the input of `tee` (which now has its `stdin` connected to that pipe).  This will enable the logging that we want.

The flow looks like this:

<pre class="math">
Bash `stdout` and `stderr` -> pipe -> tee `stdin` -> `tee` -> terminal
                                                           -> log file
</pre>

Now, we can capture not only the shell command but its output in the `run.log` file.  Nice.

> Process substitution is a Bashism and is not [`POSIX`].

Then, when I want to add any of the output of `run.log` to my blog article, I can load it in a `vim` buffer and yank what I need, which is a lot simpler than using the system clipboard as described before.

When cleaning up, "reset" the file descriptors and close the ones that are no longer needed:

```bash
$ exec 1>&3 2>&4 3>&- 4>&-
$ exit
```

## Conclusion

That is all.

## References

- [Bash Redirections Using Exec](https://www.linuxjournal.com/content/bash-redirections-using-exec)

[`exec`]: https://man7.org/linux/man-pages/man1/exec.1p.html
[`tee`]: https://www.man7.org/linux/man-pages/man1/tee.1.html
[process substitution]: https://www.gnu.org/software/bash/manual/html_node/Process-Substitution.html
[`POSIX`]: https://en.wikipedia.org/wiki/POSIX
[Bash]: https://www.man7.org/linux/man-pages//man1/bash.1.html
[Readline]: https://en.wikipedia.org/wiki/GNU_Readline
[standard streams]: https://en.wikipedia.org/wiki/Standard_streams
[interactive shell]: /2023/01/22/on-the-lpic-1-exam-102-shells-and-shell-scripting/#interactive-non-login
[many different run command files]: https://github.com/btoll/dotfiles/tree/master/bash
[ANSI control characters]: https://en.wikipedia.org/wiki/ANSI_escape_code
[`PS1`]: /2021/03/29/on-bash-prompts/#ps1
[file descriptors]: https://en.wikipedia.org/wiki/File_descriptor
[history expansion]: https://www.thegeekstuff.com/2011/08/bash-history-expansion/

