+++
title = "On ["
date = "2018-12-23T16:13:51-05:00"
+++

The other day my friend [Will] asked me to execute **`which [`** into a shell.  Of course, I dropped everything I was doing and ran to a terminal:

	~:$ which [
	/usr/bin/[

	~:$ type -a [
	[ is a shell builtin
	[ is /usr/bin/[

	~:$ type -t [
	builtin

[Say what?]

**`man [`** told me that it was essentially the **`test`** command, which I had heard of, though frankly, had never used.

	~:$ type -a test
	test is a shell builtin
	test is /usr/bin/test

Further, neither one is a symlink:

	~:$ ll /usr/bin/{[,test}
	-rwxr-xr-x 1 root root 51K Feb 22  2017 /usr/bin/[
	-rwxr-xr-x 1 root root 47K Feb 22  2017 /usr/bin/test

**`type`** above shows that there are two locations for both **`[`** and **`test`**.  Why?

## Explanation

It turns out that the Bourne shell did not have either **`[`** or **`test`** as a [builtin], so they were included as system binaries.  However, the Bourne shell on my Debian system does indeed include both commands as builtins, so I'm not sure why they are still there (although my guess would be in case there is a shell lurking about that doesn't include them as builtins).

Given a choice, I'll use the Bash builtin, as it's faster and there is no [context switch] between the shell and the binary.

## Examples

I use **`test`** a lot now instead of the "change, save and execute" development loop when I get any errors when running a Bash script.

> Since the **`test`** and **`[`** executables will return a value like any other binary, it is necessary to check their return values to see if the tests were successful.

**`test`** example:

	~:$ test 1 -eq 1
	~:$ echo $?
	0
	~:$ test 1 -eq 2
	~:$ echo $?
	1

**`[`** example:

	~:$ [ 1 -eq 1 ]
	~:$ echo $?
	0
	~:$ [ 1 -eq 2 ]
	~:$ echo $?
	1

Conditional examples:

	~:$ if test 1 -eq 1
	> then
	> echo foobar
	> fi
	foobar

	~:$ if [ 1 -eq 1 ]
	> then
	> echo foobar
	> fi
	foobar

> Although these examples were run from the terminal, they obviously work in a Bash script as well.

## Differences

The biggest (only?) syntactic difference is that **`[`** needs a closing option **`]`**, which most developers would be inclined to add anyways.  In fact, prior to this post, I had never thought of Bash's use of **`[`** as being an actual command!  Weeeeeeeeeeeeeeeeeeeeeee

Also, note that **`test`** does not recognize any options, because it would not be able to know the difference between them and what it is testing.

For example, you cannot get any *help* or *version* information by typing the following:

	test --help
	test --version

Either bring up its man page (**`man test`**), or get the information from **`[`**:

	~:$ /usr/bin/[ --version
	[ (GNU coreutils) 8.26
	Copyright (C) 2016 Free Software Foundation, Inc.
	License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>.
	This is free software: you are free to change and redistribute it.
	There is NO WARRANTY, to the extent permitted by law.

	Written by Kevin Braunsdorf and Matthew Bradburn.

## Conclusion

While I do use **`test`** as I've mentioned, I was more interested in writing this post because of the oddity of the **`/usr/bin/[`** binary.  I do recall seeing it on my system before but never really gave it much thought.  There are so many interesting corners of `GNU/Linux`!

## References

- [**`test`** man page]
- https://serverfault.com/questions/138951/what-is-usr-bin
- https://www.linuxquestions.org/questions/programming-9/just-curious-why-do-usr-bin-test-and-usr-bin-%5B-have-different-sizes-4175490151/

[Will]: https://github.com/winder
[Say what?]: https://www.youtube.com/watch?v=veCodY5YuYY
[builtin]: https://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
[context switch]: https://en.wikipedia.org/wiki/Context_switch
[**`test`** man page]: https://linux.die.net/man/1/test

