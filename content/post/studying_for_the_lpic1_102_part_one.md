+++
title = "On Studying for the LPIC-1 Exam 102 (102-500), Part One"
date = "2023-01-22T20:14:10-05:00"

+++

This is a riveting series:

- On Studying for the LPIC-1 Exam 102 (101-500), Part One
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Two](/2023/01/25/on-studying-for-the-lpic-1-exam-102-102-500-part-two/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Three](/2023/01/26/on-studying-for-the-lpic-1-exam-102-102-500-part-three/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Four](/2023/02/01/on-studying-for-the-lpic-1-exam-102-102-500-part-four/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Five](/2023/02/03/on-studying-for-the-lpic-1-exam-102-102-500-part-five/)
- [On Studying for the LPIC-1 Exam 102 (101-500), Part Six](/2023/02/06/on-studying-for-the-lpic-1-exam-102-102-500-part-six/)

And, so is this one!

- [On Studying for the LPIC-1 Exam 101 (101-500), Part One](/2023/01/13/on-studying-for-the-lpic-1-exam-101-101-500-part-one/)

---

When studying for the Linux Professional Institute [LPIC-1] certification, I took a bunch of notes when reading the docs and doing an online course.  Note that this is not exhaustive, so do not depend on this article to get you prepared for the exam.

The menu items below are not in any order.

This roughly covers [Topic 105: Shells and Shell Scripting].

*Caveat emptor*.

---

- [Exam Details](#exam-details)
- [Topic 105: Shells and Shell Scripting](#topic-105-shells-and-shell-scripting)
    + [Terminals](#terminals)
    + [Shell Types](#shell-types)
        - [Interactive Login](#interactive-login)
        - [Interactive Non-Login](#interactive-non-login)
        - [Non-Interactive Login](#non-interactive-login)
        - [Non-Interactive Non-Login](#non-interactive-non-login)
        - [Determine the Shell Type](#determine-the-shell-type)
    + [`su` and `sudo`](#su-and-sudo)
    + [`SKEL`](#skel)
    + [Shell Variables](#shell-variables)
        - [Quoting](#quoting)
    + [Running a Program in a Modified Environment](#running-a-program-in-a-modified-environment)
    + [Common Environment Variables](#common-environment-variables)
    + [Aliases](#aliases)
    + [Functions](#functions)
    + [Builtin Variables](#builtin-variables)
    + [Unsetting](#unsetting)
    + [Testing](#testing)
        + [Variables](#variables)
        + [Files](#files)
        + [Expressions](#expressions)
    + [`set -o` vs `shopt`](#set--o-vs-shopt)
    + [`IFS`](#ifs)
    + [Scripting](#scripting)
        - [Local Variables](#local-variables)
        - [Reading Input](#reading-input)
        - [`case`](#case)
        - [`printf`](#printf)
    + [Random Examples](#random-examples)
- [Summary](#summary)
- [References](#references)

---

# Exam Details

[LPIC-1 Exam 102]

- Exam Objectives Version: 5.0
- Exam Code: 102-500

# Topic 105: Shells and Shell Scripting

## Terminals

- `tty` - tele-typewriter
- `pts` - pseudo-terminal slave

## Shell Types

A great way to see which initialization files are `source`d by `bash` for a particular invocation of a shell is to append an `echo` statement to each global file:

```
echo "echo hello from /etc/profile" | sudo tee -a /etc/profile
echo "echo hello from /etc/bash.bashrc" | sudo tee -a /etc/bash.bashrc
```

### Interactive Login

Examples include:

1. Invoke a login shell:
    + `bash -l` or `bash -login`
1. Drop to a `tty` on your local machine.
    - `Ctrl+Alt+F2`, for example
1. Logging into a remote machine via `ssh`.

The following files are sourced, in order:

1. `/etc/profile`
    + the system-wide profile file for the Bourne shell and Bourne compatible shells
    + sets `PATH` and `PS1`
1. `/etc/bash.bashrc`
1. if they exist, scripts in `/etc/profile.d/` get executed by `/etc/profile`
1. `$HOME/{.bash_profile,.bash_login,.profile}`
    + this will `source` `$HOME/.bashrc`
    + appends `$HOME/bin` to `PATH`
1. `$HOME/.bash_logout`

> To start an interactive login shell that doesn't source any configuration files, use the `--noprofile` switch (will still source `/etc/bash.bashrc` and `$HOME/.bashrc`, though).
>
> So, it appears to behave like an interactive non-login shell.

### Interactive Non-Login

A general definition of an [interactive shell] is one that reads from and writes to a user's terminal:

> An interactive shell is one started without non-option arguments (unless `-s` is specified) and without specifying the `-c` option, whose input and error output are both connected to terminals (as determined by [`isatty(3)`]), or one started with the -i option.
>
> From [6.3.1 What is an Interactive Shell?]

Here are some fine examples of interactive non-login shells:

1. Subshell:
    ```
    $ bash
    ```
1. Subshell with `-i` (interactive) switch:
    ```
    $ bash -i
    ```
1. With the `-s` switch and positional parameters:
    ```
    $ cat test.sh
    #!/usr/bin/bash

    echo "Today's message is: $1 $2"
    $ > test.sh bash -s -- hello world
    Today's message is: hello world
    ```

    > Note that this example does not suffer from [`UUOC`].

The following files are sourced, in order:

1. `/etc/bash.bashrc`
1. `$HOME/.bashrc`

Optionally, you can use the `--rcfile` option to have `bash` skip any initialization from the user `$HOME/.bashrc` file and instead configure the shell's environment from the file specified as its value:

```
$ bash --rcfile alternate.bashrc
```

This will still `source` the system-wide `/etc/bash.bashrc` file (at least, it did on my machine using Debian `bullseye`).

> To start an interactive non-login shell that doesn't source any configuration files, use the `--norc` switch.

### Non-Interactive Login

These are rare.

Some examples:

1. `/bin/bash --login <some_script>`
1. `<some_command> | ssh <some_user>@<some_server>`

### Non-Interactive Non-Login

Running a script will give you a `bash` shell of this type.  Every script will run in its own subshell, opening the shell on execution and closing it on exit.

Here's an interesting property of these types of shells.  There is a variable used by the shell that's named `BASH_ENV`, and its purpose is to contain a filename that should be `source`d to initialize the shell.

Recall that non-interactive non-login shells will **not** have any initialization files run by the shell when it's launched to customize its environment, because these types of shells are primarily for shells running scripts.

So, if you need the shell to have a custom environment, put it in `BASH_ENV`.  Note, however, that it should be an absolute path to the file because the shell doesn't consult the `PATH` variable for any lookups.

Here's an example that's currently running in production at `benjamintoll.com`:

`scripting.rc`

```
$ cat scripting.rc
export COOTIES="yes, i have them"
```

`c.sh`

```
#!/bin/bash

test -n "$COOTIES" && echo "$COOTIES"
```

Let's first run without setting the variable:

```
$ ./c.sh
$
```

Now, let's augment the subshell's environment:

```
$ env BASH_ENV=$(pwd)/scripting.rc ./c.sh
yes, i have them
```

weeeeeeeeeeeeeeeeeee

### Determine the Shell Type

To determine what type of shell you have, use the special parameter `$0` or `$BASH_ARGV0`.  If the result is prepended by a hyphen (`-`), then it's a login shell.  If it prints `bash` without a leading hyphen, then it's not:


```
$ echo $0
-bash
```

In addition, there is the `Bash` specific, non-`POSIX` `login_shell` option.

Let's take a look at two examples.  First, an interactive login shell, and second, an interactive non-login shell.

Interactive login shell:

```
$ echo $0
-bash
$ shopt login_shell
login_shell     on
$ echo $-
himBCHs
```

Interactive non-login shell:

```
$ bash
$ echo $0
bash
$ shopt login_shell
login_shell     off
$ echo $-
himBCHs
```

> The special parameter `$-` displays the shell options that have been set for the session.  Since both of the previous examples are interactive, they both report the `-i` switch.

Interestingly, the `${PS1-}` `bash` shell variable will also tell you if the shell is interactive or not:

```
$ echo ${PS1-}
$(tput bold)$(tput setaf 4)\h $(tput setaf 2)|$SHLVL:$0| $(tput setaf 3)~~> \[$(tput bold)\]\[$(tput setaf 6)\]\w\[\]:\[$(tput bold)\]\[$(tput setaf 8)\]$(git branch 2> /dev/null | grep "^*" | colrm 1 2)\[$(tput sgr0)\]\n$
```

However, if you run it in a script, it won't echo anything.  This is another way of demonstrating that running `bash` shell scripts are non-interactive non-login.

> Note that the `PS*` variables are shell variables and **not** environment variables.  In other words, they are explicitly set by a script and are **not** inherited by any child processes.
>
> For instance, you'll never see any `PS*` variables exported.

I stumbled across this when viewing the system's `/etc/profile` script:

```
$ head -25 /etc/profile



# /etc/profile: system-wide .profile file for the Bourne shell (sh(1))
# and Bourne compatible shells (bash(1), ksh(1), ash(1), ...).

if [ "$(id -u)" -eq 0 ]; then
  PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
else
  PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games"
fi
export PATH

if [ "${PS1-}" ]; then
  if [ "${BASH-}" ] && [ "$BASH" != "/bin/sh" ]; then
    # The file bash.bashrc already sets the default PS1.
    # PS1='\h:\w\$ '
    if [ -f /etc/bash.bashrc ]; then
      . /etc/bash.bashrc
    fi
  else
    if [ "$(id -u)" -eq 0 ]; then
      PS1='# '
    else
      PS1='$ '
```

Interesting, no?

Also, notice that the `PS1` shell variable is explicitly set.

## `su` and `sudo`

With [`su`], you can run a command with substitute user and group `ID` or become the superuser root.  Both login and non-login shells can be invoked.

For example:
- to start an interactive login shell as `kilgore`:
    + `su - kilgore`
    + `su -l kilgore`
    + `su --login kilgore`
- to start an interactive non-login shell as `kilgore`:
    + `su kilgore`
- to start an interactive login shell as `root`:
    + `su - root`
    + `su -`
- to start an interactive non-login shell as `root`:
    + `su root`
    + `su`

With [`sudo`], you execute command(s) as another user, commonly root.  The default `sudo` security policy plugin `sudoers` is driven by the [`/etc/sudoers`] file, which determines a user's `sudo` privileges.

This is especially useful when you can't login as the root account.

> It is important to only modify the `/etc/sudoers` file through the [`visudo`] utility, which will lock the file to prevent concurrent writes.

As with `su`, `sudo` allows you to create both login and non-login shells.

For example:
- to start an interactive login shell as `kilgore`:
    + `sudo su - kilgore`
    + `sudo su -l kilgore`
    + `sudo su --login kilgore`
- to start an interactive non-login shell as `kilgore`:
    + `sudo su kilgore`
    + `sudo -u kilgore -s`
        - If no command is specified for the `-s` (shell) switch, an interactive shell is executed.
- to start an interactive login shell as `root`:
    + `sudo su - root`
    + `sudo su -`
    + `sudo -i`
        - The `-i` switch tells it to run as an interactive login shell.
- to start an interactive login shell as `root` and return to the calling user after execution of the command:
    + `sudo -i <some_command>`
        - The `-i` switch tells it to run as an interactive login shell.
- to start an interactive non-login shell as `root`:
    + `sudo su root`
    + `sudo su`
    + `sudo -s`
    + `sudo -u root -s`
        - If no command is specified for the `-s` (shell) switch, an interactive shell is executed.

The decision to use a login or non-login shell comes down to the need and the use case.  If you want to have `/etc/profile` executed and anything else that it sources (such as anything in `/etc/profile.d/` and `/etc/.bash_profile` in the user's home directory), then choose an option that invokes a login shell.

> What's [the difference between `sudo su -` and `su -`]?
>
> With `sudo su -` you will be asked to authenticate with your own user password, while you will be expected to know the root user's password for the latter command.

Recall that a login shell will start sourcing with the system-wide `/etc/profile` file, while a non-login shell will not, only starting its sourcing at the system-wide `/etc/bash.bashrc` file.

> Add the `kilgore` user to the `sudo` group by issuing the following command:
>
> ```
> $ sudo usermod -aG sudo kilore
> ```

## `SKEL`

If set, the `SKEL` environment variable holds the location of the `skel` directory.  This is the location that holds the (probably hidden) files that are copied to every user's home directory when their account is created.  They must be a regular user (as opposed to a system account) that needs a home directory and is specified by the system administrator at the time the user account is created (keep in mind that not every new account creation needs a home directory, like system accounts).

`SKEL` is defined in `/etc/adduser.conf` (default values are in `/etc/default/useradd`):

```
$ grep SKEL /etc/adduser.conf
# The SKEL variable specifies the directory containing "skeletal" user
SKEL=/etc/skel
# If SKEL_IGNORE_REGEX is set, adduser will ignore files matching this
SKEL_IGNORE_REGEX="dpkg-(old|new|dist|save)"
```

> The location of `SKEL` can be changed on user account creation by the value of the `-k` or `--skel` option (as mentioned earlier, only applicable if `-m` or `--create-home` is specified).

Here are the default contents on my Debian `bullseye` machine:

```
$ ls -A /etc/skel/
.bash_logout  .bashrc  .profile
```

Any directories and files created in this location (or any location specified in the `-k` option to [`useradd`]) will also get these custom entries when their account is created with a home directory.

> Why is this environment variable (probably) not set in your environment?  Because the env var is only created when an account is created and doesn't outlive the subprocess.

## Shell Variables

Variables can contain the following characters:

- `[a-z][A-Z]`
- `[0-9]`
- `_` (underscore)

They cannot start with a number.

Shell variables can be created as immutable by prefacing it with the [`readonly`] builtin (inherited from the [Bourne shell]):

```
$ readonly fudge=original
$ fudge=changed
-bash: fudge: readonly variable
```

Or, mark it as such after creation:


```
$ fudge=original
$ readonly fudge
```

> Print all read-only variables by invoking either `readonly` or `readonly -p`.

You can also create a read-only variable using the [`declare`] builtin:

```
$ declare -r chicken=maybe
$ echo $chicken
maybe
$ chicken=never
-bash: chicken: readonly variable
```

Variables become environment variables by [`export`]ing them.  They are then part of the environment that is inherited by subshells.

Turn an environment variable back into a local variable:

```
$ export TICKLE=my_fancy
$ bash
$ echo $TICKLE
my_fancy
$ exit
$ export -n TICKLE
$ bash
$ echo $TICKLE
$
```

> `export` or `export -p` will print all environment variables.

To turn the `TICKLE` local variable from the previous example back into an environment variable, you can use either of the following commands:

```
$ export TICKLE
$ declare -x TICKLE
```

### Quoting

Single and double-quotes are not interchangeable (however, they sometimes are equivalent in what they do, i.e., 'i am a string with no special characters' == "i am a string with no special characters").

Follow these rules, and you'll be [as safe as houses]:

- single quotes are for literal interpretation
- double quotes allow for variable substitution

Let's see some examples:

```
$ maga="make attorneys get attorneys"
$ echo '$maga'
$maga
$ echo "$maga"
make attorneys get attorneys
```

In addition, you'll want to use double-quotes to avoid [word splitting] and pathname expansion:

```
$ hello="|    hello,    it's  me    |"
$ echo '$hello'
$hello
$ echo $hello
| hello, it's me |
$ echo "$hello"
|    hello,    it's  me    |
```

It's almost always a good idea to double-quote any variables in scripts so variable substitution occurs and word splitting is avoided.  Further, if a variable is empty, double-quoting will prevent a syntax error when evaluated.

## Running a Program in a Modified Environment

To start a subshell with a limited environment, preface the shell command with `env` and the `-i` or `--ignore-environment` switch:

```
$ env -i bash
$ env
PWD=/home/btoll/projects/benjamintoll.com
LS_COLORS=
LESSCLOSE=/usr/bin/lesspipe %s %s
LESSOPEN=| /usr/bin/lesspipe %s
SHLVL=1
_=/usr/bin/env
```

You can also augment the environment inherited by a subshell by prefacing the `bash` command again with `env`, but this time specifying the new variables to inherit:

```
$ env ZOMBIES=are_real ./run_away.sh
```

> You can omit the `env` command in the previous example, as it's implied.

## Common Environment Variables

- `DISPLAY`
- `HISTCONTROL`
    + `ignorespace`
        - don't save commands starting with a space
    + `ignoredups`
        - repeated, consecutive commands will not be saved
    + `ignoreboth`
        - a command that falls into the previous two categories won't be saved
- `HISTSIZE`
- `HISTFILESIZE`
- `HISTFILE`
    + defaults to `.bash_history`
- `HOME`
- `HOSTNAME`
- `HOSTTYPE`
    + the CPU architecture (`x86_64`)
- `LANG`
    + the locale of the system
- `LD_LIBRARY_PATH`
    + the location of shared libraries
- `MAIL`
- `MAILCHECK`
    + the frequency in seconds that mail is checked
- `PATH`
- `PS1`
    + the prompt
- `PS2`
    + the continuation prompt for multi-line commands (defaults to `>`)
- `PS3`
    + the `select` command prompt
- `PS4`
    + for debugging (defaults to `+`)
- `SHELL`
- `USER`

The following commands will all print the shell's environment variables:
- `export`
- `printenv`
- `env`

## Aliases

To unmask a command that has been masked by an alias, preface the command with a backslash (`\l`):

```
$ alias ls
alias ls='ls -F'
$ ls
archetypes/           config.toml  Dockerfile  k8s/      public/    resources/
build_and_deploy.sh*  content/     env.sh*     Makefile  README.md  static/
$ \ls
archetypes           config.toml  Dockerfile  k8s       public     resources
build_and_deploy.sh  content      env.sh      Makefile  README.md  static
```

Note that the `ls` alias has added the `-F` to classify the directory entries (this appends the indicators to the appropriate entries).  This is a common alias that is provided out-of-the-box, so to speak, by many distributions.

Use the backslash to temporarily "turn off" (i.e., just for that command) the alias to allow the original command, now unshadowed, to run.

However, if there is no underlying command that is being shadowed, you will get an error.  Observe:

```
$ type xkcd
xkcd is aliased to `open https://c.xkcd.com/random/comic/'
$ alias xkcd
alias xkcd='open https://c.xkcd.com/random/comic/'
$ xkcd
( opened the page in a browser )
$ \xkcd
-bash: xkcd: command not found
```

If for some reason you wish to remove all of the aliases from your session:

```
$ unalias -a
```

Let's take a look at the difference between single and double quotes in the definition of an alias.

With single quotes, the shell variable expansion is dynamic:

```
$ alias you_are_here='echo $PWD'
$ you_are_here
/home/btoll/projects/benjamintoll.com
$ cd
$ you_are_here
/home/btoll
```

Now, redefine the alias using double quotes.  Notice now that the expansion is static and will always refer to the location in which the alias was defined:

```
$ alias you_are_here="echo $PWD"
$ you_are_here
/home/btoll
$ cd -
/home/btoll/projects/benjamintoll.com
$ !-2
you_are_here
/home/btoll
```

## Functions

Syntax can be either:

<pre class="math">
function FUNC_NAME {
    ...
}
</pre>

or:

<pre class="math">
FUNC_NAME() {
    ...
}
</pre>

To create local variables scoped to the function:

- `local VAR`
- `declare -A|-a|-i|-n VAR`

Otherwise, the variable will be global and then part of the calling environment.

Let's see an example of this.

When I was a history major at university, my ancient Roman professor introduced us to a Greek warrior that fought the Romans.  His name was Testicles (pronounced `test-ee-klees`).

Let's dedicate this `bash` function to Testicles.

Here is its definition:

```
$ type testicles
testicles is a function
testicles ()
{
    local roman=0;
    greek=1
}
```

Note that there is a `roman` variable prefaced by the `local` keyword and a `greek` variable that is not.

And now we'll use an interactive login shell to test the known variables before and after explicitly calling the function:

So far, neither variable is known to the shell.

```
$ set | grep -E "^(roman|greek)"
$ echo $roman

$ echo $greek

```

Now, we'll call the function and see if anything has changed:

```
$ testicles
$ echo $roman

$ echo $greek
1
$ set | grep -E "^(roman|greek)"
greek=1
```

Uh oh, the `greek` variable, unprefaced by the `local` keyword and thus a non-local (global) variable, is now present in the shell.  This is not good.

Always use `local` in your `bash` functions, children.

## Builtin Variables


These special variables are known as parameters:

|**Variable** |**Description** |
|:---|:---|
|`$?` |the return value of the last command|
|`$$` |the `PID` of the shell|
|`$!` |the `PID` of the last background job|
|`$0`-`$9` |positional parameters|
|`$#` |the number of arguments passed to the command|
|`$@` or `$*` |the arguments passed to the command|
|`$_` |the last parameter or the name of the script|
|`$-` |the shell options that have been set for the session|

## Unsetting

- `unset -v`
    + for variables
- `unset -f`
    + for functions
- `unset` (with no option)
    + first tries to unset as a variable and then failing that as a function

## Testing

It is highly recommended to use double quotes around any variables in case the variable is empty, in which case any command expecting an operand would throw an error without the double quotes.

### Variables

One operand:

- `-n` - the length of `STRING` is nonzero
- `-z` - the length of `STRING` is zero

Two operands:

|**Operands** |**Description** |
|:---|:---|
|`STRING1` = `STRING2`| the strings are equal (can also use double equal sign `==`) |
|`STRING1` != `STRING2`| the strings are not equal |
|`INTEGER1 -eq INTEGER2`| `INTEGER1` is equal to `INTEGER2` |
|`INTEGER1 -ge INTEGER2`| `INTEGER1` is greater than or equal to `INTEGER2` |
|`INTEGER1 -gt INTEGER2`| `INTEGER1` is greater than `INTEGER2` |
|`INTEGER1 -le INTEGER2`| `INTEGER1` is less than or equal to `INTEGER2` |
|`INTEGER1 -lt INTEGER2`| `INTEGER1` is less than `INTEGER2` |
|`INTEGER1 -ne INTEGER2`| `INTEGER1` is not equal to `INTEGER2` |

> Distinct languages may have different rules for alphabetical ordering.  To obtain consistent results, regardless of the localization settings of the system where the script is being executed, it is recommended to set the environment variable `LANG` to `C`, as in `LANG=C`, before doing operations involving alphabetical ordering.

### Files

Here are two utilities for testing at the terminal.  However, they're mostly used in scripts:

- [`test`]
- [\[] (is a synonym of `test`)
    > Yes, that's right, the character above is an open bracket (`[`):
    >
    > ```
    > $ which [
    > /usr/bin/[
    > ```
    > It's mostly seen in conditional checks in shell scripts, i.e.,
    > ```
    > if [ -d /etc/squid ]
    > then
    > ...
    > ```
    > weeeeeeeeeeeeeeeeeeee

> Also, see this astounding article [on testing] that will leave you wanting more.

One operand:

|**Operand** |**Description** |
|:---|:---|
|`-a` |`FILE` exists|
|`-b` |`FILE` exists and is block special|
|`-c` |`FILE` exists and is character special|
|`-d` |`FILE` exists and is a directory|
|`-e` |`FILE` exists|
|`-f` |`FILE` exists and is a regular file|
|`-g` |`FILE` exists and is set-group-ID|
|`-G` |`FILE` exists and is owned by the effective group ID|
|`-h` |`FILE` exists and is a symbolic link (same as `-L`)|
|`-k` |`FILE` exists and has its sticky bit set|
|`-L` |`FILE` exists and is a symbolic link (same as `-h`)|
|`-N` |`FILE` exists and has been modified since it was last read|
|`-O` |`FILE` exists and is owned by the effective user ID|
|`-p` |`FILE` exists and is a named pipe|
|`-r` |`FILE` exists and read permission is granted|
|`-s` |`FILE` exists and has a size greater than zero|
|`-S` |`FILE` exists and is a socket|
|`-t` |`FD` is opened on a terminal|
|`-u` |`FILE` exists and its set-user-ID bit is set|
|`-w` |`FILE` exists and write permission is granted|
|`-x` |`FILE` exists and execute (or search) permission is granted|

Two operands:

|**Operands** |**Description** |
|:---|:---|
|`FILE1 -ef FILE2`| `FILE1` and `FILE2` have the same device and `inode` numbers |
|`FILE1 -nt FILE2`| `FILE1` is newer (modification date) than `FILE2` |
|`FILE1 -ot FILE2`| `FILE1` is older than `FILE2` |

Is executable?

```
$ [ -x /bin/bash ]
$ echo $?
0
$ test -x /bin/bash
$ echo $?
0
```

Is a soft link?

```
$ test -L /lib64/ld-linux-x86-64.so.2
$ echo $?
0
```

Is present and is a directory?

```
$ [ -d /etc ] ; echo $?
0
$ [ -d /etcy ] ; echo $?
1
```

### Expressions

- `( EXPRESSION )` - `EXPRESSION` is true
- `! EXPRESSION` - `EXPRESSION` is false
- `EXPRESSION1 -a EXPRESSION2` - both `EXPRESSION1` and `EXPRESSION2` are true
- `EXPRESSION1 -o EXPRESSION2` - either `EXPRESSION1` or `EXPRESSION2` is true

## `set -o` vs `shopt`

So, what is the difference between [`set -o`] and [`shopt`], anyway?

`set -o` options are those inherited from `Bourne`-style shells like [`ksh`], and the `shopt` options are those specific to `bash.

The [`help`] information for `shopt` is quite telling:

```
$ help shopt
shopt: shopt [-pqsu] [-o] [optname ...]
    Set and unset shell options.

    Change the setting of each shell option OPTNAME.  Without any option
    arguments, list each supplied OPTNAME, or all shell options if no
    OPTNAMEs are given, with an indication of whether or not each is set.

    Options:
      -o        restrict OPTNAMEs to those defined for use with `set -o'
      -p        print each shell option with an indication of its status
      -q        suppress output
      -s        enable (set) each OPTNAME
      -u        disable (unset) each OPTNAME

    Exit Status:
    Returns success if OPTNAME is enabled; fails if an invalid option is
    given or OPTNAME is disabled.
```

Let's create an interactive non-login subshell.  Then, we'll print the total number of shell options from `shopt` and the number after its been restricted to just those supported by `set -o`:

```
$ bash
$ shopt | wc -l
53
$ shopt -o | wc -l
27
```

So, it looks like the `bash` shell has added support for many more shell options that aren't available in older shells.  Probably, it's important to be aware of this when writing shell scripts, and another reason why a static analysis tool like [`shellcheck`] is essential and should absolutely be part of your toolchain.

For example, if you use the `pipefail` shell option (always a good idea) in your shell scripts but then have it interpreted by the [Bourne shell], `shellcheck` will give you the following error:

[In POSIX sh, set option pipefail is undefined.]

> Of course, I'm using `shellcheck` as a [Vim plugin] because I'm cool as hell.
>
> In `.vimrc`:
>
> ```
> call plug#begin('~/.vim/plugged')
> Plug 'koalaman/shellcheck'
> call plug#end()
> ```

Lastly, you can quickly find out which shell options are enabled, that is, which ones are reported as "on" by `shopt`.

```
$ echo $BASHOPTS
autocd:checkjobs:checkwinsize:cmdhist:complete_fullquote:expand_aliases:extquote:force_fignore:globasciiranges:globstar:histappend:hostcomplete:interactive_comments:login_shell:progcomp:promptvars:sourcepath
```

This is a read-only variable, and each word in the list is a valid argument for the `-s` option to `shopt`.

## `IFS`

The `IFS` environment variable stands for the Internal Field Separator.

It is an array of three whitespace characters:

- `[SPACE]`
- `\t`
- `\n`

```
$ echo ${#IFS}
3
$
$ printf '%q' "$IFS"
$' \t\n'
$
$ for v in "$IFS"; do printf '%q' "$v"; done
$' \t\n'
```

## Scripting

In order be able to execute a script using the filename as the argument to the interpreter (i.e., `bash foo.sh`), the read permission bit must be set.  Otherwise, a `Permission Denied` error is raised:

```
$ bash hello.sh
hi
$ chmod 200 foo.sh
$ bash foo.sh
bash: foo.sh: Permission denied
```

To execute the file by its path, the execute permission bit must be enabled.

The following are all equivalent (just pretend the `mclovin.sh` script already exists):

```
$ /home/btoll/mclovin.sh
hi
$ $(pwd)/mclovin.sh
hi
$ ./mclovin.sh
hi
```

However, the script's directory must be included in the `PATH` if the pathname is to be omitted, leaving just the file name:

```
$ mclovin.sh
-bash: mclovin.sh: command not found
```

Add the directory to the `PATH`, and you will be golden, perhaps even [the golden god].

### Local Variables

The scripts also have the same special parameters as listed in the [Builtin Variables](#builtin-variables) section, with the same meaning.

Positional parameters are numeric.  The first one is the script name (`$0` or `$BASH_ARGV0`).  Any numbers greater than nine need to be enclosed in curly brackets, such as `${10}`.  However, if your shell script is accepting that many parameters, you need to rethink some things.

### Reading Input

Getting input from the command-line is easy: use [`read`].

Examples:

```
echo "Do you want to continue (y/n)?"
read ANSWER
```

```
echo "Type your first name and last name:"
read FIRST LAST
```

```
read -p "Type your first name and last name:" FIRST LAST
```

### `case`

<pre class="math">
case "$foo" in
debian | ubuntu | mint )
    echo -n "uses .deb"
    ;;

centos | fedora | opensuse )
    echo -n "uses .rpm"
    ;;
\*)
    echo -n "uses unknown package format"
    ;;
esac
</pre>

Note that the items to be matched in a `case` block can employ command subsitition, parameter and arithmetic expansion, etc.

### `printf`

Many [programming languages have a `printf` function], or something similarly-named that operates like it, that formats and prints data.  You will not be surprised that `bash` has a shell builtin called [`printf`] that allows for the same functionality.

Here is an example from the `LPIC-1` documentation:

```
$ OS=$(uname -o)
$ FREE=$(( 1000 * `sed -nre '2s/[^[:digit:]]//gp' < /proc/meminfo` ))
$ MSG='Operating system:\t%s\nUnallocated RAM:\t%d MB\n'
$ printf "$MSG" $OS $(( $FREE / 1024**2 ))
Operating system:       GNU/Linux
Unallocated RAM:        19375 MB
```

> `printf` is short for **print f**ormatted.

## Random Examples

- get the length of a variable
    ```
    OS=$(uname -o)
    echo "${#OS}"
    9
    ```

- create an array (one-dimensional)
    + `declare -a SIZES`
    + `SIZES=( 5677 77 23 )`
        - this both declares and defines
    + `SIZES=( $(cut -f2 /proc/filesystems | head -3) )`
        - use [command substitution]
        - this works, but it will only create an array of one element
            ```
            echo "${SIZES[0]}"
            sysfs
            tmpfs
            bdev
            ```
        - to get three elements, use [`mapfile`] or its synonym [`readarray`] to split at each newline (`\n`) and generate a full array
            ```
            mapfile -t SIZES <<< "$(cut -f2 /proc/filesystems | head -3 )"
            echo "${SIZES[0]}"
            sysfs
            ```

- access array elements
    + get the first element
        - `$SIZES`
        - `${SIZES[0]}`
    + change the first element
        - `SIZES[0]=20`
    + get the length of the third element
        - `${#SIZES[2]}`
    + get total length
        - `${#SIZES[\*]}`
        - `${#SIZES[@]}`
    > Trying to access a non-existent array element (i.e., out-of-bounds) does not produce an error.

- arithmetic
    + the following examples use the [`expr`] and [`bc`] utilities:
        ```
        $ expr 5 + 4
        9
        $ bc <<< 5+4
        9
        ```
    + `bash`
        ```
        $ sum=$[5+4] ; echo $sum
        9
        $ _32=$((8*4))
        $ echo $_32
        32
        ```

# Summary

Continue your journey with the second installment in this titillating series, [On Studying for the LPIC-1 Exam 102 (101-500), Part Two](/2023/01/25/on-studying-for-the-lpic-1-exam-102-102-500-part-two/).

# References

- [LPIC-1 Objectives V5.0](https://wiki.lpi.org/wiki/LPIC-1_Objectives_V5.0#Objectives:_Exam_102)
- [LPIC-1 Learning Materials](https://learning.lpi.org/en/learning-materials/102-500/)
- [Index of Shell Builtin Commands](https://www.gnu.org/software/bash/manual/html_node/Builtin-Index.html)
- [Differentiate Interactive login and non-interactive non-login shell](https://askubuntu.com/questions/879364/differentiate-interactive-login-and-non-interactive-non-login-shell)
- [Writing Shell Scripts](https://www.netmeister.org/blog/writing-shell-scripts.html)
- [Bash Pitfalls](http://mywiki.wooledge.org/BashPitfalls)
- [Shell Style Guide](https://google.github.io/styleguide/shellguide.html)

[LPIC-1]: https://www.lpi.org/our-certifications/lpic-1-overview
[Topic 105: Shells and Shell Scripting]: https://learning.lpi.org/en/learning-materials/102-500/105/
[LPIC-1 Exam 102]: https://www.lpi.org/our-certifications/exam-102-objectives
[interactive shell]: https://www.gnu.org/software/bash/manual/html_node/Interactive-Shells.html
[6.3.1 What is an Interactive Shell?]: https://www.gnu.org/software/bash/manual/html_node/What-is-an-Interactive-Shell_003f.html
[`UUOC`]: https://en.wikipedia.org/wiki/Cat_(Unix)#Useless_use_of_cat
[`isatty(3)`]: https://man7.org/linux/man-pages/man3/isatty.3.html
[`bash`]: https://www.man7.org/linux/man-pages/man1/bash.1.html
[`su`]: https://man7.org/linux/man-pages/man1/su.1.html
[`sudo`]: https://man7.org/linux/man-pages/man8/sudo.8.html
[`/etc/sudoers`]: https://man7.org/linux/man-pages/man5/sudoers.5.html
[`visudo`]: https://man7.org/linux/man-pages/man8/visudo.8.html
[`useradd`]: https://man7.org/linux/man-pages/man8/useradd.8.html
[`readonly`]: https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-readonly
[Bourne shell]: https://en.wikipedia.org/wiki/Bourne_shell
[`declare`]: https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-declare
[`export`]: https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-export
[shell parameter expansion]: https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html
[word splitting]: https://www.gnu.org/software/bash/manual/html_node/Word-Splitting.html
[`test`]: https://www.man7.org/linux/man-pages/man1/test.1.html
[\[]: https://www.man7.org/linux/man-pages/man1/test.1.html
[on testing]: /2018/12/23/on/
[`set -o`]: https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html
[`shopt`]: https://www.gnu.org/software/bash/manual/html_node/The-Shopt-Builtin.html
[`help`]: https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-help
[`ksh`]: http://www.kornshell.org/
[`shellcheck`]: https://github.com/koalaman/shellcheck
[In POSIX sh, set option pipefail is undefined.]: https://www.shellcheck.net/wiki/SC2039
[Vim plugin]: https://github.com/junegunn/vim-plug
[`read`]: https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-read
[command substitution]: https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.html
[`mapfile`]: https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-mapfile
[`readarray`]: https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-readarray
[`expr`]: https://man7.org/linux/man-pages/man1/expr.1.html
[`bc`]: https://man7.org/linux/man-pages/man1/expr.1.html
[programming languages have a `printf` function]: https://en.wikipedia.org/wiki/Printf_format_string#Programming_languages_with_printf
[`printf`]: https://man7.org/linux/man-pages/man1/printf.1.html
[the difference between `sudo su -` and `su -`]: https://askubuntu.com/questions/678750/difference-between-sudo-su-and-su
[as safe as houses]: https://www.youtube.com/watch?v=snILjFUkk_A
[the golden god]: https://www.youtube.com/watch?v=n5_-HnVhKlw

