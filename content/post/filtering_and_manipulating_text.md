+++
title = "On Filtering And Manipulating Text"
date = "2024-10-17T12:09:52-04:00"

+++

- [Mimicking Common Commands](#mimicking-common-commands)
    + [`cat`](#cat)
    + [`grep`](#grep)
    + [`head`](#head)
    + [`tail`](#tail)
- [Filtering Out Comments And Empty Lines](#filtering-out-comments-and-empty-lines)
- [`sed`](#sed)
    + [Clearing Up Print Confusion](#clearing-up-print-confusion)
    + [Substitution](#substitution)
    + [Appending](#appending)
    + [Inserting](#inserting)
    + [Deleting](#deleting)
    + [Ignoring Case](#ignoring-case)
    + [Writing To Multiple Files](#writing-to-multiple-files)
    + [C Preprocessor Example](#c-preprocessor-example)
- [References](#references)

---

## Mimicking Common Commands

### [`cat`]

```bash
$ grep '' /etc/passwd
```

```bash
$ sed '' /etc/passwd
```

Or:

```bash
$ sed -n 'p' /etc/passwd
```

```bash
$ awk '{ print }' /etc/passwd
```

```bash
$ while read line
> do
> echo $line
> done < /etc/passwd
```

### [`grep`]

```bash
$ awk '/nobody/{ print }' /etc/passwd
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
```

```bash
$ sed -n 's/nobody/&/p' </etc/passwd
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
```

Or:

```bash
$ sed -n '/nobody/p' </etc/passwd
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
```

### [`head`]

```bash
$ awk 'BEGIN { COUNT=0 } { if (COUNT < 10) { print }; COUNT++ }' /etc/passwd
```

```bash
$ grep -m10 '' /etc/passwd
```

```bash
$ sed -n '1,10p' /etc/passwd
```

Or:

```bash
$ sed '1,10!d' /etc/passwd
```

Or:

```bash
$ sed -n '11,$!p' /etc/passwd
```

Or:

```bash
$ sed '11,$d' </etc/passwd
```

Or:

```bash
$ sed '11q' /etc/passwd
```

> `q` is the `quit` command.  It is the only command that does not accept a range of lines.

### [`tail`]

```bash
$ sed -ne':a;$p;N;11,$D;ba' /etc/passwd
```

## Filtering Out Comments And Empty Lines

`grep`

```bash
$ grep -vE '^(#|$)' /etc/ssh/ssh_config
Include /etc/ssh/ssh_config.d/*.conf
Host *
    SendEnv LANG LC_*
    HashKnownHosts yes
    GSSAPIAuthentication yes
```

`sed`

```bash
$ sed -E '/^(#|$)/d' /etc/ssh/ssh_config
Include /etc/ssh/ssh_config.d/*.conf
Host *
    SendEnv LANG LC_*
    HashKnownHosts yes
    GSSAPIAuthentication yes
```

Filtering from multiple files:

```bash
$ sed -E '/^(#|$)/d' /etc/ssh/ssh_config /etc/ssh/sshd_config
Include /etc/ssh/ssh_config.d/*.conf
Host *
    SendEnv LANG LC_*
    HashKnownHosts yes
    GSSAPIAuthentication yes
Include /etc/ssh/sshd_config.d/*.conf
KbdInteractiveAuthentication no
UsePAM yes
X11Forwarding yes
PrintMotd no
AcceptEnv LANG LC_*
Subsystem       sftp    /usr/lib/openssh/sftp-server
```

```bash
$ awk '!/^(#|$)/{ print }' /etc/ssh/ssh_config
Include /etc/ssh/ssh_config.d/*.conf
Host *
    SendEnv LANG LC_*
    HashKnownHosts yes
    GSSAPIAuthentication yes
```

Create aliases:

```bash
$ alias strip="grep -vE '^(#|$)' /etc/ssh/ssh_config"
$ strip /etc/ssh/ssh_config
Include /etc/ssh/ssh_config.d/*.conf
Host *
    SendEnv LANG LC_*
    HashKnownHosts yes
    GSSAPIAuthentication yes
```

```bash
$ alias="sed -E '/^(#|$)/d'"
$ strip /etc/ssh/ssh_config
Include /etc/ssh/ssh_config.d/*.conf
Host *
    SendEnv LANG LC_*
    HashKnownHosts yes
    GSSAPIAuthentication yes
```

Of course, frequently, there are commented lines that are indented.  To remove these as well, simply append `\s*` to the `sed` command to match zero or more whitespace characters (` `, `\t`) that begin the line:

```bash
$ alias="sed -E '/^\s*(#|$)/d'"
```

## `sed`

Use a different delimiter than the default forward slash ('/') to make some commands easier to read:

```bash
$ sed -n 's_/bin/false_/usr/sbin/nlogin_p' </etc/passwd
```

The alternative would be:

```bash
$ sed -n 's/\/bin\/false/\/usr\/sbin\/nlogin/p' </etc/passwd
```

Let's not do that, children.

[Grymoire] recommends separating commands from flags:

From his website
>  Also, you don't need to, but I recommend that you place a space after the pattern and the command. This will help you distinguish between flags that modify the pattern matching, and commands to execute after the pattern is matched. Therefore I recommend this style:
>
> ```bash
> $ sed '/PATTERN/ p' file
> ```
>
> https://www.grymoire.com/Unix/Sed.html#uh-15a

### Clearing Up Print Confusion

Firstly, `-n|--quiet|--silent` suppresses the automatic printing of pattern space.  The `sed` command often uses combinations of the this option and the `/p` command, yet I've found that their use can be difficult to understand and difficult to understand the outcome.  Let's try to fix that.

> Note that the `-n` option won't print anything unless the `/p` print command is used.

The `sed` command acts like `cat` when the `PATTERN` has no matches in the file(s):

```bash
$ sed '/NO_MATCHES_HERE/p' /etc/passwd
```

If there are matches in the file, then each line with a match is printed twice:

```bash
$ sed '/nobody/p' /etc/passwd
```

Lastly, adding the `-n` option has `sed` act like `grep`:

```bash
$ sed -n '/nobody/p' /etc/passwd
```

Omitting a command will generate an error like the following:

```bash
$ sed -n '/nobody/' /etc/passwd
sed: -e expression #1, char 8: missing command
```

### Substitution

```bash
$ echo aaaaa | sed -n 's/a/A/4p'
aaaAa
```

Is the same as:

```bash
$ echo aaaaa | sed -n 's/./A/4p'
aaaAa
```

### Appending

Appending to the tail of the file (i.e., creating a new last line):

```bash
$ sed -i '$a foobar' /etc/passwd
```

### Inserting

> `-i` is editing in-place.

Insert to the head of the file (i.e., creating a new first line):

```bash
$ sed -i '1i foobar' /etc/passwd
```

Or, add a shebang:

```bash
$ sed -i '1i #!/bin/bash\n' /etc/passwd
```

Insert the contents of the file `foo.txt` after the line with the pattern `nobody`:

```bash
$ sed '/nobody/ r foo.txt' </etc/passwd
```

### Deleting

Deleting the last line of the file:

```bash
$ sed '$d' /etc/passwd
```

Deleting the first line of the file:

```bash
$ sed '1d' /etc/passwd
```

Only match lines from the current user to the end of the file:

```bash
$ sed -n '/'"$USER"'/,$p' /etc/passwd
```

Only match lines from the first line to the line that contains `man` user:

```bash
$ sed -n '1,/man/p' /etc/passwd
```

Replace the fourth word on the third line with the word "foo":

```bash
$ sed -n '3 s/[^:]:/foo:/4p' </etc/passwd
```

Delete all the lines between the patterns `start` and `stop`, inclusive:

```bash
$ cat << EOF | sed '/start/,/stop/d'
asdf
asdf
asdf
qwer
start
# asdf
#
#
#
stop
foo
> EOF
asdf
asdf
asdf
qwer
foo
```

Remove the commented lines between the patterns `start` and `stop`, inclusive.

```bash
$ sed '
> /start/,/stop/ {
> /start/n # skip the line that contains "start"
> /stop/ !{
> /^#/d
> }
> }
> ' << EOF
> foo
> bar
> start
> # hello
> # world
> stop
> quux
> EOF
foo
bar
start
stop
quux
```

Let's look at the `sed` command properly indented:

```sed
sed '
    /start/,/stop/ {
        /start/n    # skip the line that contains "start"
        /stop/ !{   # only operate on the lines that don't contain "stop"
            /^#/d
        }
    }
'
```

> `sed` operates on lines, not words.

---

Here's an example of appending, inserting and changing:

```bash
sed '
> /WORD/ {
> i\
> Add this line before
> a\
> Add this line after
> c\
> Change the line to this one
> }' <<EOF
> boo
> WORD
> shoe
> EOF
boo
Add this line before
Change the line to this one
Add this line after
shoe
```

That's neat.

### Ignoring Case

Use the `/I` flag:

```bash
$ sed -n '/abc/Ip' <(echo abc Abc aBC ABC)
abc Abc aBC ABC
```

Note that if you omit the `/p` print command that you'll get an error like the following:

```
sed: -e expression #1, char 6: missing command
```

### Writing To Multiple Files

- using line numbers
- using regular expressions

Write to multiple files at once:

```bash
$ echo -ne "18 so many books\n3 so little time\nno number" | \
> sed \
> -e 's/^[0-9]*[02468] /&/w even' \
> -e 's/^[0-9]*[13579] /&/w odd' \
> -e 's/^[a-zA-Z]* /&/w alpha'
$ cat even
18 so many books
$ cat odd
3 so little time
$ cat alpha
no number
```

> This is possible due to the `w` flag that follows the third delimiter.  The write flag **must** be the last flag.

There is also a `w` write command.  For example, instead of using the `/w` flag to write to a file using the substitution command like the following:

```bash
$ sed -n 's/^[0-9]*[02468] /&/w even' <file
```

This can be simplified using the `w` command:

```bash
$ sed -n '/^[0-9]*[02468]/w even' <file
```

### C Preprocessor Example

First, the `cpp.sh` script:

```bash
#!/bin/sh
# watch out for a '/' in the parameter
# use alternate search delimiter
sed -e '\_#INCLUDE <'"$1"'>_{

    # read the file
	r '"$1"'

    # delete any characters in the pattern space
    # and read the next line in
	d
}'

```

`input`

```txt
# Test first file
#INCLUDE <hello.c>
# Test second file
#INCLUDE <goodbye.c>
```

`hello.c`

```c
void hello(int argc, char **argv) {
    printf("hello world\n");
}
```

`goodbye.c`

```c
void goodbye(int argc, char **argv) {
    printf("goodbye cruel world\n");
}
```

Now, we're ready to match and replace with each of the file's content:

```bash
$ ./cpp.sh hello.c <input | ./cpp.sh goodbye.c
# Test first file
void hello(int argc, char **argv) {
    printf("hello world\n");
}
# Test second file
void goodbye(int argc, char **argv) {
    printf("goodbye cruel world\n");
}
```

This works because the pattern space does not contain the contents of `hello.c` or `goodbye.c` even though they are written to the output stream after matching the pattern `#INCLUDE`.  Since the contents aren't in the pattern space, they cannot be modified by any `sed` command, and the `delete` command cannot operate on it (the `delete` command only operates on and removes the line that contains the matched pattern).

So, this is a nice search and (file) replace operation.

[All credit to `Grymoire`].

### Blocks Of Text

TODO

## Derp

```bash
$ while read ip host
> do
> echo $ip $host
> done < /etc/hosts
127.0.0.1 localhost
127.0.1.1 kilgore-trout.home kilgore-trout

# The following lines are desirable for IPv6 capable hosts
::1 localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters

The same, but removing empty and commented lines:

```bash
$ while read ip host
> do
> echo $ip $host
> done <<< $(grep -vE '^(#|$)' /etc/hosts)
127.0.0.1 localhost
127.0.1.1 kilgore-trout.home kilgore-trout
::1 localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
```

Using the `strip` alias:

```bash
$ while read ip host
> do
> echo $ip $host
> done <<< $(strip /etc/hosts)
127.0.0.1 localhost
127.0.1.1 kilgore-trout.home kilgore-trout
::1 localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
```

## References

- [`cat`]
- [`grep`]
- [`head`]
- [`sed`]
- [`tail`]
- [Sed - An Introduction and Tutorial by Bruce Barnett](https://www.grymoire.com/Unix/Sed.html)

[`cat`]: https://www.man7.org/linux/man-pages/man1/cat.1.html
[`grep`]: https://www.man7.org/linux/man-pages/man1/grep.1.html
[`head`]: https://www.man7.org/linux/man-pages/man1/head.1.html
[`sed`]: https://www.man7.org/linux/man-pages/man1/sed.1.html
[`tail`]: https://www.man7.org/linux/man-pages/man1/tail.1.html
[Grymoire]: https://www.grymoire.com
[All credit to `Grymoire`]: https://www.grymoire.com/Unix/Sed.html#uh-37

