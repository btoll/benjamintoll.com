+++
title = "On Bash Prompts"
date = "2021-03-29T14:28:17-04:00"

+++

In [my last post], one may have noticed that I assigned a value to the `PS3` prompt with no explanation.  This is because I only have scorn and contempt for the readers of this site.

However, I spent a sleepless night reflecting upon this decision.  Come morning, I decided to make another decision.

Here it is.

---

In the Bash shell, there are five prompts that are available for the customization of the shell prompt and are displayed based upon the operation being performed.  They are environment variables and can be easily set in either a run command file like `.bashrc` upon login or new shell or defined at the command line.

Here they are:

- **PS1** The [default interactive prompt](#ps1).
- **PS2** The prompt [displayed for a multi-line command](#ps2).
- **PS3** The prompt [displayed in the `select` statement](#ps3) (type `help select` at the command prompt for more information).
- **PS4** The prompt [displayed in debugging mode](#ps4), i.e., when setting `set -x` in a shell script.
- **PROMPT_COMMAND** A callable script or program that is called right [before the `PS1` prompt is displayed](#prompt_command).

# `PS1`

This is the prompt displayed when interacting with the command line.  Depending on the Linux distribution, it is often set by default, defined in `/etc/skel/.bashrc` and copied to a user's `$HOME` directory when the user is created.

```
$ PS1="capitalism is fun |> "
capitalism is fun |> echo foo
foo
capitalism is fun |>
```

To reset back to the original value, presumably defined in `.bashrc`, do the following:

```
capitalism is fun |> source ~/.bashrc
$
```

# `PS2`

Let's now look at the default `PS2` prompt for multi-line commands:

```
$ echo foo \
> bar \
> baz
foo bar baz
$
```

I'll now change the default from ">" to "--> ", and let's see the amazing results:

```
$ PS2="--> "
$ echo foo \
--> bar \
--> baz
foo bar baz
$
```

Weeeeeeeeeeeeeeeeeeeeeeeeee

# `PS3`

As we've [seen previously], the `PS3` prompt is displayed within a `select` statement.  I'll use the same example as before which changes the prompt from the default of "#?":

```
$ PS3="Night time is the right time #? "
$
$ select item in *.sh; do echo You picked $item \($REPLY\); break; done
1) case.sh
2) create_cert.sh
3) hugo.sh
Night time is the right time #? 2
You picked create_cert.sh (2)
$
```

> The files listed above were found in the directory in which the statement was run.

# `PS4`

Next, I'll cover the prompt seen when in debugging mode.  This is the one that I find most interesting and useful.

First, I'll change the prompt from the default of "+":

```
export PS4="+ (${BASH_SOURCE}:${LINENO}): ${FUNCNAME[0]:+${FUNCNAME[0]}(): }"
```

Then, I'll write a complex script:

`foo.sh `

<pre class="math">
#!/bin/bash

set -x

echo foo \
    bar \
    baz

date

</pre>

```
$ ./foo.sh
+ (./foo.sh:5): main(): echo foo bar baz
foo bar baz
+ (./foo.sh:9): main(): date
Tue Mar 30 13:19:34 EDT 2021
```

That's pretty sweet.

# `PROMPT_COMMAND`

After all of the commands are executed in an interactive session after the `ENTER` key is pressed, the `PS1` prompt is displayed.  However, before that happens, Bash determines if there is a callable script or program set for the `PROMPT_COMMAND` environment variable, and if defined, executes it.

Here is a simple example:

```
$ PROMPT_COMMAND=date
Tue Mar 30 14:15:05 EDT 2021
$
```

> Note that the return value of the `date` program is immediately printed to `stdout`, which is what is expected.

Now, the result of `date` is printed after every interaction:

```
$ echo foo
foo
Tue Mar 30 14:17:38 EDT 2021
$ stat build_and_deploy.sh
  File: build_and_deploy.sh
  Size: 1550            Blocks: 8          IO Block: 4096   regular file
Device: 802h/2050d      Inode: 6556215     Links: 1
Access: (0700/-rwx------)  Uid: ( 1000/   btoll)   Gid: ( 1000/   btoll)
Access: 2021-03-30 11:20:37.432314932 -0400
Modify: 2021-03-28 19:36:12.851540545 -0400
Change: 2021-03-28 19:36:12.859543532 -0400
 Birth: -
Tue Mar 30 14:17:47 EDT 2021
$
```

Ok, that's kind of annoying, so I'm going to turn it off:

```
$ unset PROMPT_COMMAND
$
```

If I get around to it, I'll do a short post about a useful setting for the `PROMPT_COMMAND` that is tremendous.

# Conclusion

Ciao.

# References

- [Debugging a script](https://wiki.bash-hackers.org/scripting/debuggingtips)
- [How-to: Setup Prompt Statement variables](https://ss64.com/bash/syntax-prompt.html)

[my last post]: /2021/03/27/on-bash-select/
[seen previously]: /2021/03/27/on-bash-select/

