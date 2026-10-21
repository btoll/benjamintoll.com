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

Whenever I write an article, I will log all of the commands and their output and copy most or all of it to the post.  Back in the early days, I would do this manually, in the sense I would highlight the text in the terminal emulator, copy it into the system buffer and then paste into the article.  It felt like something a noob would do, and I knew deep down in my heart of hearts that I needed to up my game.

Knowing that anything I need is already available to me, I looked to `bash` provided me with the primitives I needed to come up with a nice solution that would work for me.

Here are the pieces:

- [`exec`]
- [`tee`]

That's it, pal!

[`exec`] is a `bash` builtin that can do several different nifty things, but we'll only be focusing on one of them today: redirecting data streams.

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

Let's start a new interactive shell with no configurations and no inherited environment variables.  My current Bash shell will source many different run command files to configure the shell to my specifications, and for this session I want to start with a vanilla Bash shell.

> My current shell as ANSI control characters in the `PS1` prompt, and this will copy them into the log file.  Unfortunately, the log file will not be able to correctly interpret these control characters without help, so I'm just avoiding having to deal with it at all.

```bash
$ env -i bash --noprofile --norc -i
bash-5.2$ printenv
PWD=/home/btoll
SHLVL=1
_=/usr/bin/printenv
bash-5.2$
```

From the [`bash`] man page:

```
--noprofile
	  Do  not  read  either  the  system-wide  startup file /etc/profile or any of the personal initialization files ~/.bash_profile, ~/.bash_login, or
	  ~/.profile.  By default, bash reads these files when it is invoked as a login shell (see INVOCATION below).

--norc Do not read and execute the system wide initialization file /etc/bash.bashrc and the personal initialization file ~/.bashrc if the shell  is  in‐
	  teractive.  This option is on by default if the shell is invoked as sh.
```

It put the version of `bash` in the prompt.

Now, let's start the logging.  Here is the magic formula:

```bash
$ exec 3>&1 4>&2
$ exec 1> >(tee -a run.log) 2>&1
```

> Before we go any further, you may be wondering why I don't just get the commands from the `bash` history.  While that is a nice option, it is limited to only the executed commands and won't contain the output.

When I first saw commands like these, I went cross-eyed.  Now, I'm a bit more used to them.  This one will redirect `stdout` to the command `>(tee -a run.log)`.  The command is `bash` [process substitution] that says send all `stdout` from commands to [`tee`].  It will also redirect `stderr` to `stdout`, but since `stdout` has been redirected to `tee` means that anything written to the `stderr` standard stream will also go to `tee`.

> Process substitution is a `bash`ism and is not [`POSIX`].

Notably, the `tee` process has its own standard streams, and they are **not** redirected.  So, what it receives on its `stdin` stream from the pipeline created by `exec` will be written to `run.log` and to the shell.  In other words, its `stdout` has not been affected by the shell's `stdout` redirection.

Now, we can capture not only the shell command but its output in the `run.log` file.  Nice.

Then, when I want to add any of the output of `run.log` to my blog article, I can load it in a `vim` buffer and then yank what I need, which is a lot easier than using the system clipboard as described before.

When cleaning up, "reset" the file descriptiors and close the ones that are no longer needed:

```bash
$ exec 1>&3 2>&4 3>&- 4>&-
$ exit
```

## Conclusion

That is all.

## References

[`exec`]: https://man7.org/linux/man-pages/man1/exec.1p.html
[`tee`]: https://www.man7.org/linux/man-pages/man1/tee.1.html
[process substitution]: https://www.gnu.org/software/bash/manual/html_node/Process-Substitution.html
[`POSIX`]: https://en.wikipedia.org/wiki/POSIX
[`bash`]: https://www.man7.org/linux/man-pages//man1/bash.1.html

