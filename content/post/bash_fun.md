+++
title = "On Bash Fun"
date = "2018-08-30T11:53:44-04:00"

+++

I use the [Bash shell] every day.  It's one of the most useful tools I know to get stuff done, and, as such, it's [worth studying].

[One of the resources] I've read inspired me to start documenting some of the more advanced things that Bash can do, esoteric or otherwise, lest I forget.  After all, if I don't use something close to every day, it tends to get all foggy and gray :)

These are not in order of any importance, and I'll be continually adding to this post.

---

## Contents

- <a href="#heredocs">Heredocs</a>
- <a href="#i-o-redirection">I/O Redirection</a>
- <a href="#subshells">Subshells</a>
- <a href="#restricted-shell">Restricted Shell</a>
- <a href="#dev">/dev</a>
- <a href="#options">Options</a>

---

## Heredocs

### Standard Example

		foo="i am foo"

		cat <<EOF
		hello
		$foo
		goodbye
		EOF

Will expand the parameter `$foo` to print "i am foo".

		hello
		i am foo
		goodbye
		~:$

### Preventing Parameter Expansion ('LimitString', \LimitString)

		foo="i am foo"

		cat <<\EOF
		hello
		$foo
		goodbye
		EOF

Will print the literal string `$foo`.

		hello
		$foo
		goodbye
		~:$

### Ignore Leading Tabs (-LimitString)

		cat <<-EOF
			hello
			i am foo
			goodbye
		EOF

It can be argued that this is more pleasant to read.  The closing limit string still cannot be preceded by any whitespace, though.

### "Anonymous" heredoc

The anonymous, or placeholder, command `:` can be useful to comment-out whole code blocks.  I can see using this when I'm doing a lot of shell scripting, which I do from time to time, otherwise it's just an interesting tidbit.

In this example, the `for` loop won't run because it is within the "anonymous" `heredoc`.

		#!/bin/bash

		echo hello world

		: <<\EOF
		for i in {1..10}
		do
		    echo $i
		done
		EOF

		echo goodbye cruel world

> The backslash before the limit string `EOF` isn't necessarily needed, but there could be instances where the "anonymous" `heredoc` is wrapping code that contains a bracket (`{}`), which I've read could make Bash barf all over itself.
>
> I haven't been able to reproduce this, so maybe it's only older versions of Bash, but it's better to be safe than sorry!

I usually comment-out whole code blocks using a Vim macro that I wrote (essentially, `s/^/#/g` in a visual block), but I might change my ways.

---

## I/O Redirection

Each process gets three default files:

		- stdin
		- stdout
		- stderr

They are referenced by their file descriptors, 0, 1 and 2, respectively.

> `>`, `<`, `>>` and `<<` are the redirection operators.

### stdout

These all produce a zero-length file:

		touch foo
		> foo
		1> foo
		: > foo
		<> foo

When redirecting a directory listing to a file, it's not necessary to explicitly use `stdout`'s file descriptor as it's assumed:

		ls > foo == ls 1> foo

To append, use `>>`.

Weeeeeeeeeeeeeeeeee

### stderr

Redirect `stderr` to a file:

		2> foo

For example, using a "bad" command will redirect the error to a file rather than displaying it on the screen:

		asdf 2> foo

Take note that the following might not do as you expect:

		asdf > foo

(It will create the file `foo`, if it doesn't already exist, but it will be empty!)

To append, use `>>`.

> To redirect both `stdout` and `stderr`:
>
>		&> foo

### Redirecting File Descriptors

Redirect `stderr` to `stdout`:

		2>&1

Append both `stderr` and `stdout` to `foo`:

		asdf >> foo 2>&1

> Random access**\***:
> 
> 		echo 123456789 > foo 	# Create `foo`.
> 		exec 3<> foo			# Assign fd 3 for reading and writing.
> 		read -n 4 <&3			# Seek 4 chars.
> 		echo -n . >&3			# Write.
> 		cat foo					# 1234.6789
> 		cat <&3					# 6789
> 		exec 3>&-				# Close fd 3.
>

#### Closing File Descriptors**\***

		n<&-
		Close input file descriptor n.

		0<&-, <&-
		Close stdin.

		n>&-
		Close output file descriptor n.

		1>&-, >&-
		Close stdout.

**\*** Examples taken from http://tldp.org/LDP/abs/html/io-redirection.html

### Multiple Instances of Input and Output Redirection (and Pipes)

Common:

		command < input-file > output-file

Uncommon, but equivalent:

		< input-file command > output-file

These commands are all equivalent:

		$ grep hugo < <(ls -R) > foo

		$ < <(ls -R) grep hugo > foo

		$ ls -R | grep hugo > foo

### Redirecting Code Blocks

The following are equivalent:

		~:$ while read name
		> do
		> echo $name
		> done < <(echo -e "john\npaul\ngeorge\nringo")

		~:$ echo -e "john\npaul\ngeorge\nringo" | while read name
		> do
		> echo $name
		> done

		john
		paul
		george
		ringo
		~:$

---

## Subshells

- Builtins do not launch a new process, but external commands do.
- Any variables created in a subshell are only scoped to that process, so they are not visible in the parent shell.

A command list within parentheses will launch and execute within a subshell.

		~:$ ( cd /my_project && make )
		~:$

You can see the nesting level by printing the value of the [`$BASH_SUBSHELL`] internal variable:

		~:$ echo $BASH_SUBSHELL
		0
		~:$ ( cd /etc ; echo $BASH_SUBSHELL ; ( cd /proc ; echo $BASH_SUBSHELL ) )
		1
		2
		~:$ echo $BASH_SUBSHELL
		0

> Note that the commands executed in a subshell, so the current directory didn't change in the parent process.  This can be useful in a script when needing to frequently change directories, although some purists don't like to spawn a subshell (also, there's [pushd and popd]).

You could run a command group in a subshell with its own environment**\***:

		COMMAND1
		COMMAND2
		COMMAND3
		(
		  IFS=:
		  PATH=/bin
		  unset TERMINFO
		  set -C
		  shift 5
		  COMMAND4
		  COMMAND5
		  exit 3 # Only exits the subshell!
		)
		# The parent shell has not been affected, and the environment is preserved.
		COMMAND6
		COMMAND7

**\*** Example taken from http://tldp.org/LDP/abs/html/subshells.html

---

## Restricted Shell

To run a shell or script in a more secure environment, invoke the process as a [restricted shell].

Start Bash as:

+ From the command line
	- rbash
	- bash -r
	- bash --restricted

+ Shell options
	- set -r
	- set --restricted

---

## /dev

Bash has a builtin pseudo-device file, `/dev/tcp`, which creates a `TCP` connection to the associated socket.  The format is:

	/dev/tcp/$HOST/$PORT

Get a web page:

		exec 5<> /dev/tcp/www.benjamintoll.com/80
		echo -e "GET / HTTP/1.0\n" >&5
		cat <&5 > index.html
		exec 5<&-

This is mostly the same as:

		curl -O www.benjamintoll.com/index.html

Get headers:

		exec 5<> /dev/tcp/www.benjamintoll.com/80
		echo -e "GET / HTTP/1.0\n" >&5
		cat <&5
		exec 5<&-

Emulate a ping:

		echo "HEAD / HTTP/1.0" > /dev/tcp/chomsky/80
		echo $?

Etc.

Weeeeeeeeeeeeeeeeeeeee

> Of course, you can specify more request headers in the `echo` command, it's merely "talking" the `HTTP` protocol, just as you would with any `telnet` session (or other).

---

## Options

The `set` command enables or disables options within a script, shell or Bash file (i.e., `.bashrc`).

To enable:

		set -o verbose
		or
		set -v

To disable:

		set +o verbose
		or
		set +v

Here are some other ways to set options:

- After the [shebang]:

		#!/bin/bash -v

- When invoking a script:

		$ bash -v script_name
		or
		$ bash -o verbose script_name

[Bash shell]: https://en.wikipedia.org/wiki/Bash_(Unix_shell)
[worth studying]: /2018/02/20/on-learning/
[One of the resources]: http://tldp.org/LDP/abs/html/
[pushd and popd]: https://en.wikipedia.org/wiki/Pushd_and_popd
[`$BASH_SUBSHELL`]: http://tldp.org/LDP/abs/html/internalvariables.html#BASHSUBSHELLREF
[restricted shell]: https://www.gnu.org/software/bash/manual/html_node/The-Restricted-Shell.html
[shebang]: https://en.wikipedia.org/wiki/Shebang_(Unix)

