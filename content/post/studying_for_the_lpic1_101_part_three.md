+++
title = "On Studying for the LPIC-1 Exam 101 (101-500), Part Three"
date = "2023-01-18T00:25:10-05:00"

+++

This is a riveting series:

- [On Studying for the LPIC-1 Exam 101 (101-500), Part One](/2023/01/13/on-studying-for-the-lpic-1-exam-101-101-500-part-one/)
- [On Studying for the LPIC-1 Exam 101 (101-500), Part Two](/2023/01/15/on-studying-for-the-lpic-1-exam-101-101-500-part-two/)
- On Studying for the LPIC-1 Exam 101 (101-500), Part Three
- [On Studying for the LPIC-1 Exam 101 (101-500), Part Four](/2023/01/20/on-studying-for-the-lpic-1-exam-101-101-500-part-four/)

---

When studying for the Linux Professional Institute [LPIC-1] certification, I took a bunch of notes when reading the docs and doing an online course.  Note that this is not exhaustive, so do not depend on this article to get you prepared for the exam.

The menu items below are not in any order.

This roughly covers [Topic 103: GNU and Unix Commands].

*Caveat emptor*.

---

- [Exam Details](#exam-details)
- [Topic 103: GNU and Unix Commands](#topic-103-gnu-and-unix-commands)
    + [Some `Unix` and Shell Commands](#some-unix-and-shell-commands)
        - [`uname`](#uname)
        - [`hash`](#hash)
        - [`history`](#history)
        - [`env` vs `set`](#env-vs-set)
        - [`paste`](#paste)
        - [`sort`](#sort)
        - [`od`](#od)
        - [`cut`](#cut)
        - [`tr`](#tr)
        - [`nl`](#nl)
        - [`sed`](#sed)
        - [`find`](#find)
        - [`tar`](#tar)
        - [`cpio`](#cpio)
        - [`dd`](#dd)
        - [`uniq`](#uniq)
        - [`tee`](#tee)
        - [`xargs`](#xargs)
        - [`jobs`](#jobs)
        - [`nohup`](#nohup)
        - [`watch`](#watch)
        - [`top`](#top)
        - [`nice`](#nice)
        - [`renice`](#renice)
        - [`locate`](#locate)
    + [Processes](#processes)
        - [`ps`](#ps)
        - [`pgrep`](#pgrep)
        - [`pkill`](#pkill)
    + [Archiving, Compressing and Tarballing](#archiving-compressing-and-tarballing)
        - [Archiving](#archiving)
        - [Compressing](#compressing)
        - [Tarballing](#tarballing)
        - [Viewing Compressed Tarballs](#viewing-compressed-tarballs)
    + [Shell Quoting](#shell-quoting)
    + [Checksums](#checksums)
    + [File Globbing](#file-globbing)
    + [Redirects](#redirects)
        - [Here Document and Here String](#here-document-and-here-string)
    + [Terminal Multiplexers](#terminal-multiplexers)
    + [Process Priority](#process-priority)
- [Summary](#summary)
- [References](#references)

---

# Exam Details

[LPIC-1 Exam 101]

- Exam Objectives Version: 5.0
- Exam Code: 101-500

# Topic 103: GNU and Unix Commands

## Some `Unix` and Shell Commands

### `uname`

Get kernel name:

```
$ uname
Linux
$ uname -s
Linux
```

Print kernel release:

```
$ uname -r
5.10.0-20-amd64
```

Print kernel version:

```
$ uname -v
#1 SMP Debian 5.10.158-2 (2022-12-13)
```

Print the machine hardware:

```
$ uname -m
x86_64
```

Print the network node hostname:

```
$ uname -n
kilgore-trout
```

Print the OS:

```
$ uname -o
GNU/Linux
```

### `hash`

To increase performance, recently used commands will be added to a hash table for faster lookup.  The [`type`] Bash builtin will show if a command has been hashed.

For example:

```
$ type man
man is /usr/bin/man
$ man man
$ type man
man is hashed (/usr/bin/man)
```

To remove a command from the hash table:

```
$ type man
man is hashed (/usr/bin/man)
$ hash -d man
$ type man
man is /usr/bin/man
```

To add a command(s) to the hash table:

```
$ type man which
man is /usr/bin/man
which is /usr/bin/which
$ hash man which
$ type man which
man is hashed (/usr/bin/man)
which is hashed (/usr/bin/which)
```

To view the help:

```
$ help hash
```

### `history`

To write the current history to the history file (usually, `$HOME/.bash_history):

```
$ history -w
```

> Commands that have been recently executed are not automatically written to the `.bash_history` file.  The `-w` switch will "flush" the history list to the file.

To clear the history list by deleting all of the entries:

```
$ history -c
```

To select and execute the 666th command in the history list:

```
$ !666
```

To view the help:

```
$ help history
```

### `env` vs `set`

`env` will print all of the environment variables for a shell session.

`set` will also print the environment variables, but it also will print the functions, too.

However, unlike `set`, `env` will not print custom variables that have not been exported:

```
$ biscuit=yum
$ set | ag biscuit
biscuit=yum
$ env | ag biscuit
```

Let's now export it:

```
$ export biscuit
$ env | ag biscuit
biscuit=yum
```

Why is this?

Recall that `set` is a Bash builtin, while `env` will run in a subprocess.  That subprocess, however, will not inherit an environment variable that has not been exported, just as spawning a new shell would not inherit an unexported variable as part of its environment inherited from its parent.

> The current set of Bash options is in the special [`-` parameter]:
>
>     $ "$-"
>     himBCHs
>
> These can then be looked up by running `help set`.

### `paste`

The [`paste`] command will merge lines from multiple files.  The delimiter between the colums defaults to `TAB`, but this can be changed with the `-d` switch:

```
$ echo -e "a\nb\nc\nd\ne" > chars
$ cat chars
a
b
c
d
e
$ echo -e "1\n2\n3\n4\n5" > ints
$ cat ints
1
2
3
4
5
$ paste chars ints
a       1
b       2
c       3
d       4
e       5
$ paste -d: chars ints
a:1
b:2
c:3
d:4
e:5
```

### `sort`

[`sort`]

### `od`

The tool [`od`] lists out a file's contents in [octal] format.

```
$ od cmds.txt
0000000 072542 075156 070151 005062 075142 060543 005164 075142
0000020 070151 005062 060543 005164 072547 075156 070151 063412
0000040 064572 005160 067165 075170 074012 005172 075170 060543
0000060 005164 061572 072141 000012
0000067
```

The first column is the byte offset for each line of output.  The following eight columns each contain the octal value of he data within the column.

Display printable characters:

```
$ od -ac cmds.txt
0000000   b   u   n   z   i   p   2  nl   b   z   c   a   t  nl   b   z
          b   u   n   z   i   p   2  \n   b   z   c   a   t  \n   b   z
0000020   i   p   2  nl   c   a   t  nl   g   u   n   z   i   p  nl   g
          i   p   2  \n   c   a   t  \n   g   u   n   z   i   p  \n   g
0000040   z   i   p  nl   u   n   x   z  nl   x   z  nl   x   z   c   a
          z   i   p  \n   u   n   x   z  \n   x   z  \n   x   z   c   a
0000060   t  nl   z   c   a   t  nl
          t  \n   z   c   a   t  \n
0000067
```

Note the newlines.

`od` can display the data in other character formats, such as hexadecimal:

```
$ od -x cmds.txt
0000000 7562 7a6e 7069 0a32 7a62 6163 0a74 7a62
0000020 7069 0a32 6163 0a74 7567 7a6e 7069 670a
0000040 697a 0a70 6e75 7a78 780a 0a7a 7a78 6163
0000060 0a74 637a 7461 000a
0000067
$ od -cx cmds.txt
0000000   b   u   n   z   i   p   2  \n   b   z   c   a   t  \n   b   z
           7562    7a6e    7069    0a32    7a62    6163    0a74    7a62
0000020   i   p   2  \n   c   a   t  \n   g   u   n   z   i   p  \n   g
           7069    0a32    6163    0a74    7567    7a6e    7069    670a
0000040   z   i   p  \n   u   n   x   z  \n   x   z  \n   x   z   c   a
           697a    0a70    6e75    7a78    780a    0a7a    7a78    6163
0000060   t  \n   z   c   a   t  \n
           0a74    637a    7461    000a
0000067
```

Hide the offset column:

```
$ od -An -c cmds.txt
   b   u   n   z   i   p   2  \n   b   z   c   a   t  \n   b   z
   i   p   2  \n   c   a   t  \n   g   u   n   z   i   p  \n   g
   z   i   p  \n   u   n   x   z  \n   x   z  \n   x   z   c   a
   t  \n   z   c   a   t  \n
```

### `cut`

[`cut`] will remove sections from each line of a file.

The canonical example is to use `/etc/passwd`:

```
$ cut -d: -f1,7 /etc/passwd | tail
saned:/usr/sbin/nologin
colord:/usr/sbin/nologin
geoclue:/usr/sbin/nologin
btoll:/bin/bash
systemd-timesync:/usr/sbin/nologin
systemd-coredump:/usr/sbin/nologin
nm-openvpn:/usr/sbin/nologin
Debian-gdm:/bin/false
lightdm:/bin/false
debian-tor:/bin/false
```

The will print out the first and seventh columns, which are the username and login shell, respectively.

As another example, select the first 10 characters of every line:

```
$ cut -c1-10 /etc/passwd | tail
saned:x:11
colord:x:1
geoclue:x:
btoll:x:10
systemd-ti
systemd-co
nm-openvpn
Debian-gdm
lightdm:x:
debian-tor
```

And the first, third and fifth character of every line:

```
$ cut -c1,3,5 /etc/passwd | tail
snd
clr
gol
bol
sse
sse
n-p
Dba
lgt
dba
```

### `tr`

The [`tr`] tool will translate or delete characters that it receives on its standard input channel.  It expects its input to be redirected.

The canonical example is to change (translate) the colon delimiters in the `/etc/passwd` file to another character.  Here, we use a pipe character:

```
$ tr : "|" < /etc/passwd | head
root|x|0|0|root|/root|/bin/bash
daemon|x|1|1|daemon|/usr/sbin|/usr/sbin/nologin
bin|x|2|2|bin|/bin|/usr/sbin/nologin
sys|x|3|3|sys|/dev|/usr/sbin/nologin
sync|x|4|65534|sync|/bin|/bin/sync
games|x|5|60|games|/usr/games|/usr/sbin/nologin
man|x|6|12|man|/var/cache/man|/usr/sbin/nologin
lp|x|7|7|lp|/var/spool/lpd|/usr/sbin/nologin
mail|x|8|8|mail|/var/mail|/usr/sbin/nologin
news|x|9|9|news|/var/spool/news|/usr/sbin/nologin
```

Remove the `^M` EOL control character from Windows files:

```
$ tr -cd '\11\12\40-\176' < chars
```

### `nl`

The [`nl`] tool numbers the lines of the files.  This is only for display, it doesn't modify the file.

```
$ nl README.md
```

### `sed`

Let's start with a small file filled with Unix commands:

```
$ cat cmds.txt
bunzip2
bzcat
bzip2
cat
gunzip
gzip
unxz
xz
xzcat
zcat
```

We'll demonstrate the different ways we can get information from the file using the stream editor [`sed`].

> Stream editors operate on a line at a time.

List only the lines displaying the word "cat":

```
$ sed -n '/cat/p' cmds.txt
bzcat
cat
xzcat
zcat
```

The `-n` option will suppress the automatic printing of everything in the pattern space (the entire file).  Let's see what happens when we remove it:

```
$ sed '/cat/p' cmds.txt
bunzip2
bzcat
bzcat
bzip2
cat
cat
gunzip
gzip
unxz
xz
xzcat
xzcat
zcat
zcat
```

It has printed everything in the pattern space and the lines that include the word "cat" twice.  This makes, since the `p` `sed` command told it to print lines that contain the search word.

> `sed -n 'p' cmds.txt` is equivalent to `cat cmds.txt`.

To delete all the lines containing the word "cat" and output the rest:

```
$ sed '/cat/d' cmds.txt
bunzip2
bzip2
gunzip
gzip
unxz
xz
```

Find and replace and print only the lines that match the word to be replaced:

```
$ sed -n 's/cat/dog/p' cmds.txt
bzdog
dog
xzdog
zdog
```

Find and replace and print the entire file:

```
$ sed 's/cat/dog/' cmds.txt
bunzip2
bzdog
bzip2
dog
gunzip
gzip
unxz
xz
xzdog
zdog
```

Do in-place editing:

```
$ sed -i.backup 's/cat/dog/' cmds.txt
$
```

This will first make a copy of the original file called `cmds.txt.backup`.  Nothing will be printed to the screen, since the original file was edited in-place:

```
$ ls
cmds.txt  cmds.txt.backup
```

> Omit the suffix (so, just `-i`) to not create a backup.

**Note** that I've used quotes in all of the `sed` examples in this section, but they aren't strictly necessary.

### `find`

Can search on file type:

All are prefeced by `-type`, i.e., `-type f`:

- files `f`
- directories `d`
- symbolic links `l`
- sockets `s`
- character devices `c`
- block devices `b`
- named pipes `p`

Other interesting expressions:

- `-user`
- `-group`
- `-atime` (access time in hours)
- `-amin` (access time in minutes)
- `-delete (delete all files that match result)
- `-empty` (or `-size 0b`)
-  `-exec` (perform action on the result set)
    + `find -type f -name *.log -exec rm {} \;`
    + `find . -name "*.conf" -exec chmod 644 '{}' \;`
- `-readable` (matches for current user)
- `-writable` (matches for current user)
- `-executable` (matches for current user)
- `-perm`
- `-iname` (inode)
- `-mtime` (modification time)
- `-maxdepth`
- `-size`
- `-print0` (print the full filename on the standard output, followed by a null character (instead of the newline character that `-print` uses))
    + good for scripting and `find -exec`
- `-mount`
    + avoid searching mounted filesystems
- `-fstype`

### `tar`

See [Archiving and Compressing](#archiving-and-compression).

### `cpio`

The [`cpio`] archive tool takes its list of files to archive piped to `stdin` and writes to `stdout`.  For example, to create an archive:

```
ls | cpio -vo > archive.cpio
```

> `-o` is `Copy-out` mode.

To extract this archive:

```
cpio --no-absolute-filenames -id < archive.cpio
```

> `-i` is `Copy-in` mode.

Note that the default is `--absolute-filenames`, which is to preserve the system prefix components of the filenames.

### `dd`

The tool [`dd`] is used to convert and copy a file.  I've used it mainly to [create a live USB].

```
$ sudo dd if=~/Downloads/ubuntu-22.04-desktop-amd64.iso of=/dev/sdb1 bs=4M
```

> `bs` is the number of bytes to read and write at a time.

Add a progress bar:

```
$ sudo dd if=~/Downloads/ubuntu-22.04-desktop-amd64.iso of=/dev/sdb1 bs=4M status=progress
```

Convert to uppercase:

```
$ dd if=oldfile of=newfile conv=ucase
```

### `uniq`

The [`uniq`] will print the non-duplicate lines to standard out.  It's important to note, however, that non-contiguous duplicate lines are not counted as duplicates and will be displayed by `uniq`.  For this reason, it's highly recommended to `sort` prior to running `uniq`.

```
$ sort chars | uniq
a
b
c
d
e
```

```
$ sort chars | uniq -c
      2 a
      2 b
      2 c
      2 d
      2 e
```

The following example is functionally equivalent to the previous one:

```
$ uniq -c <(sort chars)
      2 a
      2 b
      2 c
      2 d
      2 e
```

Let's take another similar file with less data to save room on this article, because it's getting completely out of control:

```
$ cat chars
a
b
c
a
b
c
```

Only print duplicate lines, one for each group:

```
$ sort chars | uniq -d
a
b
c
```

Print all duplicate lines:

```
$ sort chars | uniq -D
a
a
b
b
c
c
```

### `tee`

[`tee`] reads from `stdin` and writes to both `stdout` and files.

```
$ ls | tee dir_list.txt
```

This is good for things such as running in a command in very verbose mode (`-vvv`) and at the same time capturing the output in a logfile.

Append to an existing file:

```
$ ./my_command -vvv | tee -a out.txt
```

Capture both `stdout` **and** `stderr` when compiling:

```
$ make 2>&1 | tee log.txt
```

### `xargs`

Build and execute command lines from standard input using [`xargs`].

- `-n 1` or `-L 1`
- `-0`
- `-I`

In the following examples, pretend that `filelist.txt` contains a list of images.

```
$ xargs -I IMG convert IMG -resize 25% small/IMG < filelist.txt
```

The following is equivalent:

```
$ cat filelist.txt | xargs -I IMG convert IMG -resize 25% small/IMG
```

### `jobs`

[`jobs`] is a shell builtin.  They are attached to the user who invoked them.  If the session is killed, the background processes are re-parented to PID 1 (active foreground processes are killed dead along with their parent).

Jobs can be stopped with a [`jobspec`]:

- job ID (different from PID)
    + `kill %1`
- string
    + `kill %sleep`
- contains string
    + `kill %?eep`
- current job
    + `kill %+`
    + `kill %%`
- previous job
    + `kill %-`

> If there is only one job, it will be both *current* and *previous*.

### `nohup`

The [`nohup`] ("no hang up") command runs a command immune to hangups, with output going to a non-`tty` (so, a file) with a default name of `nohup.out`.  This file will be written to by both `stdout` and `stderr`.

The hangups refer to a signal called [`SIGHUP`] that are sent to a process when its controlling terminal is closed.

```
$ nohup ping localhost &
[1] 1251
$ nohup: ignoring input and appending output to 'nohup.out'
^C
```

> Note that you can also use the Bash builtin [`disown`] to target a running process to not receive a `SIGHUP` signal on shell logout, just as with the `nohup` command.

### `watch`

The [`watch`] utility will watch a program periodically (by default, every two seconds) and will display fullscreen.  To exit, send `watch` the `SIGINT` signal (`Ctrl-C`).

Change the time interval:

```
watch -n 8 free
```

Don't display the title:

```
watch -t free
```

### `top`

By default [`top`] will sort by CPU percentage used by a process (`P`) in descending order.  Here are some other ways to sort (all are uppercase):

- `M` - memory usage
- `N` - PID
- `T` - running time
- `R` - toggle between ascending and descending listing

Other useful keybindings that may be interactive, i.e., `top` will ask for more information (like a PID):

- `?` or `h` - help
- `k` - kill a process, will ask for PID and signal (defaults to `SIGTERM`)
- `r` - change the priority, aka, `renice`, will ask for value (-20 through 19)
    + only superuser can change to a negative value or lower than the current value
- `u` - only list processes from a particular user, will ask for user (either name or UID)
- `c` - show a program's absolute path and differentiate between userspace processes and kernelspace processes
- `V` - shows process hierarchy
- `t` or `m` - change the look of CPU and memory readings respectively in a four-stage cycle:
    + the first two presses show progress bars
    + the third hides the bar
    + the fourth brings it back
- `W` - saves configuration settings (saved mine to "$HOME/.config/procps/toprc")

Note that the summary (top) are of `top` shows much of the same information as `uptime` and `free`.

> Other `top` variants are [`htop`] and `atop`.

### `nice`

Play [`nice`].

### `renice`

[`renice`] changes the priority of a **running** process.

> A program can also be reniced by `top`.  In `top`, press `r`, enter then the PID, and then change the value.

Only privileged users can renice to a negative value and a value lower than what is currently assigned.

### `locate`

The [`locate`] command, used to quickly search a system for a file, does not search the filesystem, but a datase.

This database will need to be updated manually by running [`updatedb`], so any files created or added since its last invocation will not be searchable by `locate`.

> The location of the database on my system is `/var/lib/mlocate/mlocate.db`.

Conversely, any files that have been deleted since its last run will also still be in the search database.

```
$ touch ooga-booga
$ locate ooga-booga
$ locate ooga-booga
/home/btoll/projects/benjamintoll.com/ooga-booga
$ rm ooga-booga
$ locate ooga-booga
/home/btoll/projects/benjamintoll.com/ooga-booga
```

Let's say that we know that it will take to long to update the database, so we don't want to run `updatedb`.  But, we don't want to include false positives, like `ooga-booga`.  What is there to do?

Just add the `-e` switch, yo, that will print only entries that refer to files existing at the time `locate` is run.

```
$ locate -e ooga-booga
$
```

Just don't forget to run `updatedb` as soon as possible.

By default, the searches will be case sensitive.  Just use the `-i` switch to do a case insensitive search.

Pass multiple search patterns and count the results (`-c`):

```
$ locate -c zip jpg gz
27807
```

Use `-A` to only match on all search patterns:

```
$ locate -cA zip jpg gz
0
```

Write statistics about each read database to standard output instead of searching for files and exit successfully:

```
$ locate -S
Database /var/lib/mlocate/mlocate.db:
        45,883 directories
        5,28,916 files
        3,43,05,654 bytes in file names
        1,38,08,284 bytes used to store database
```

Note that it's possible to configure the behavior of `updatedb` by modifying `/etc/updatedb.conf`.

My default configuration file looks like this:

```
$ cat /etc/updatedb.conf
PRUNE_BIND_MOUNTS="yes"
# PRUNENAMES=".git .bzr .hg .svn"
PRUNEPATHS="/tmp /var/spool /media /var/lib/os-prober /var/lib/ceph"
PRUNEFS="NFS afs autofs binfmt_misc ceph cgroup cgroup2 cifs coda configfs curlftpfs debugfs devfs devpts devtmpfs ecryptfs ftpfs fuse.ceph fuse.glusterfs fuse.gvfsd-fuse fuse.mfs fuse.rozofs fuse.sshfs fusectl fusesmb hugetlbfs iso9660 lustre lustre_lite mfs mqueue ncpfs nfs nfs4 ocfs ocfs2 proc pstore rpc_pipefs securityfs shfs smbfs sysfs tmpfs tracefs udev udf usbfs"
```

**Note** that all except the last should have space-delimited values.

- `PRUNEFS=` - a case-insensitive list of filesystem types that should be ignored
- `PRUNENAMES=` - a list of directory names that will be ignored
- `PRUNEPATHS=` - a list of path names that will be ignored
- `PRUNE_BIND_MOUNTS=` - if "yes", bind mounts will be ignored

## Processes

### `ps`

The `ps` command allows for three different styles of options:

- `BSD` - no hyphens
    + `ps U alice`
- `Unix` - one hyphen
    + `ps -u alice`
- `GNU` - two hyphens
    + `ps --user alice`

A very common example:

`ps aux`

- BSD-style
- similar to the output of `top`
    + `a` - show process that have a `tty`
    + `u` - display user-oriented format (all users)
    + `x` - show process that are not attached to a `tty`

Information can be displayed differently depending upon which style is employed (unfortunately).

In addition to the `PID`, `TTY`, `TIME` and `CMD` columns that `ps` shows, the long listing also shows `UID`, `PPID`, `PRI` (priority), `NI` ([`nice`]), etc.

```
$ ps -l
F S   UID     PID    PPID  C PRI  NI ADDR SZ WCHAN  TTY          TIME CMD
0 S  1000    4772    4471  0  80   0 -  2195 -      pts/0    00:00:01 bash
0 T  1000   27289    4772  0  80   0 -  5980 -      pts/0    00:00:16 vim
0 S  1000   27929       1  0  80   0 - 24720 -      pts/0    00:00:00 python
4 R  1000   42349    4772  0  80   0 -  2421 -      pts/0    00:00:00 ps
```

Let's say all that you have is the process ID 591720 (PID).  How can you find out more information about it?

```
$ ps -Fl -p 591720
F S UID          PID    PPID  C PRI  NI ADDR SZ WCHAN    RSS PSR STIME TTY          TIME CMD
0 S btoll     591720       1  0  80   0 -  1343 -        568   2 13:42 ?        00:00:00 sleep 777
```

Switches:

- `-F`: extra full format (implies `-f`)
- `-l`: long format
- `-p`: specifies the PID

> You can also use the [`pidof`] command to find the PID of a running process.

### `pgrep`

List the process of a (effective) user (use `-l` to print the program name of the corresponding `PID`):

```
$ pgrep -lu btoll
3386 systemd
3388 (sd-pam)
3486 pipewire
3487 pulseaudio
3490 bash
3508 dbus-daemon
3530 pipewire-media-
3595 gpg-agent
3609 dbus-daemon
3872 startx
3901 xinit
3902 Xorg
4467 sh
4471 tmux: server
4772 bash
4778 i3
...
```

Print the processes for both a specific user and terminal:

```
$ pgrep -lu btoll -t tty1
3490 bash
3872 startx
3901 xinit
3902 Xorg
4467 sh
4778 i3
```

Find the `PID` of a Vim session:

```
$ pgrep -u btoll vim
47988
```

[`renice`] all my [Firefox web containers]:

```
$ renice +10 $(pgrep "Isolated Web Co")
6858 (process ID) old priority 0, new priority 10
6875 (process ID) old priority 0, new priority 10
7393 (process ID) old priority 0, new priority 10
7496 (process ID) old priority 0, new priority 10
11869 (process ID) old priority 0, new priority 10
11927 (process ID) old priority 0, new priority 10
22608 (process ID) old priority 0, new priority 10
22644 (process ID) old priority 0, new priority 10
...
```

### `pkill`

Sends `SIGTERM` by default to each process.

Display the name and the `PID` of the process being killed:

```
$ sleep 10000 &
[2] 17314
$ pkill -e sleep
sleep killed (pid 17314)
[2]-  Terminated              sleep 10000
```

Kill it dead using either symbolic or numeric signal name:

```
$ sleep 8888 &
[2] 18184
$ pkill --signal SIGKILL sleep
[2]-  Killed                  sleep 8888
$
$ sleep 7777 &
[2] 20880
$ pkill -9 sleep
[2]-  Killed                  sleep 7777
```

## Archiving, Compressing and Tarballing

The [`tar`] (tap archiver) command will collect a group of files into one archive file.

### Archiving

Common operations:

- `c`, `--create`
- `x`, `--extract`
- `t`, `--list`
- `u`, `--update`

Common switches:

- `-f`, `--file`
- `-v`, `--verbose`
- `-C`, `--directory`

The traditional usage is the BSD-style of no hyphens, ` tar cvf` or `tar xvf`.  Here, we'll use the Unix-style usage of switches that use the single hyphen:

- creating
    + `tar -cvf`

- extracting
    + `tar -xvf`

- extract to a specific directory
    + `tar -xvf archive.tar -C /tmp`

### Compressing

Compression utilities:
- [`gzip`]
- [`bzip2`]
- [`xz`]

Creating:
+ `gzip README.md`
    - replaces `README.md` with `README.md.gz`
+ `bzip2 README.md`
    - replaces `README.md` with `README.md.bzip2`
+ `xz README.md`
    - replaces `README.md` with `README.md.xz`

---

Uncompression utilities:
- [`gunzip`]
- [`bunzip2`]
- [`unxz`]

Extracting a tarball:
+ `gunzip README.md.gz`
+ `bunzip2 README.md.bzip2`
+ `unxz README.md.xz.`

### Tarballing

A tarball is a compressed `tar` archive.

( And I don't know if anyone actually says "tarballing". )

- creating a tarball
    + `gzip`
        - `tar -czvf archive.tgz music`
        - another common extension is `.tar.gz`
    + `bzip2`
        - `tar -cjvf archive.bz2 music`
        - another common extension is `.tar.bz2` or `.tar.bz`
    + `xz`
        - `tar -cJvf archive.xz music`
        - another common extension is `.tar.xz`

- extracting a tarball
    + `gunzip`
        - `tar -xzvf archive.tgz music`
    + `bunzip2`
        - `tar -xjvf archive.bz2 music`
    + `unxz`
        - `tar -xJvf archive.xz music`

- listing a tarball
    + `tar -tf foo.tar.xz`
    + works regardless of compression

- updating a tarball
    + `gunzip`
        - `tar -xzvf archive.tgz music`
    + `bunzip2`
        - `tar -xjvf archive.bz2 music`
    + `unxz`
        - `tar -xJvf archive.xz music`

### Viewing Compressed Tarballs

- [`zcat`]
    - viewing `gzip` tarballs
    - `zcat foo.tar.gz`

- [`bzcat`]
    - viewing `bzip2` tarballs
    - `bzcat foo.tar.bz2`

- [`xzcat`]
    - viewing `xz` tarballs
    - `xzcat foo.tar.xz`

## Shell Quoting

```
$ foo=42
$ echo $foo
42
$ echo "$foo"
42
$ echo '$foo'
$foo
```

## Checksums

A [checksum] is a small block of data that is derived mathematically (based on a cryptographic hash function) from another block of data for the purpose of detecting errors and verifying data integrity.

They are frequently used when downloading archives, tarballs, disk images, etc., from the Internet.

Common command-line utilities to compute checksums are:

- [`md5sum`]
- [`sha256sum`]
- [`sha512sum`]

Compute a checksum:

```
$ sha256sum README.md
aa85c32f6fe4f5cd76b808a9d4e11a4cbf034fda626a9d6006a8ea1878731ef1  README.md
```

Output a checksum:

```
$ sha256sum README.md > SHA256SUMS
$ cat SHA256SUMS
aa85c32f6fe4f5cd76b808a9d4e11a4cbf034fda626a9d6006a8ea1878731ef1  README.md
```

Note that the calculated checksum is the same.  It will always be the same for the same block of data.

Verify the integrity of the `README.md` file against the checksum file:

```
$ sha256sum -c SHA256SUMS
README.md: OK
```

The file doesn't need to be included when checking the checksum file, as it is included after the checksum itself (`TAB` delimited).

Verify the integrity of multiple files:

```
$ sha256sum README.md build_and_deploy.sh config.toml > SHA256SUMS
$ cat SHA256SUMS
aa85c32f6fe4f5cd76b808a9d4e11a4cbf034fda626a9d6006a8ea1878731ef1  README.md
d82135b2e46c3a5b8d16db1ae30cddca772f255b381f9db929c9ecbd757878b7  build_and_deploy.sh
2baf225d6a8a4df97d869f79c941d370002f8277ae367ac86b4e40cc54480ebe  config.toml
$ sha256sum --check SHA256SUMS
README.md: OK
build_and_deploy.sh: OK
config.toml: OK
```

Of course, if the checksum doesn't match what was expected for the file, you wouldn't want to use it, possibly even alerting the owner of the file as to the failure (that is, after repeated downloads resulted in failures and wasn't the result of something arbitrary and innocuous).

## File Globbing

File globbing is using special characters known as wildcards to match one or more filenames on the system.  The wildcards are are expanded by the shell to find all possible matches.

- `*`
    + matches zero or more characters
- `?`
    + matches a single character
- `[]`
    + matches characters within the brackets
    + like a character class in a regular expression

Of course, they can be combined and used more than once in a search pattern.

## Redirects

Every Linux process gets three file descriptors by default.

- [`stdin`], file descriptor 0
- [`stdout`], file descriptor 1
- [`stderr`], file descriptor 2

For instance, my Bash shell process has the following open file descriptors:

```
$ ls -l /proc/$$/fd
total 0
lrwx------ 1 btoll btoll 64 Jan 17 14:00 0 -> /dev/pts/1
lrwx------ 1 btoll btoll 64 Jan 17 14:00 1 -> /dev/pts/1
lrwx------ 1 btoll btoll 64 Jan 17 14:00 2 -> /dev/pts/1
lrwx------ 1 btoll btoll 64 Jan 18 00:04 255 -> /dev/pts/1
```

Since I'm using a pseudo-terminal, they are all symlinks to `/dev/pts/1` (the reason for this is out of the scope of this article).

---

The reassignment of a channel’s file descriptor in the shell environment is called a redirect.  The target of a redirect can be either a file or a file descriptor.

Redirecting `stdout`:
- `>`
- `>>`
- `1>`
- `1>>`

Redirecting `stdin`:
- `<`
- `0<`
- `<<`
- `0<<`

Redirecting `stderr`:
- `2>`
- `2>>`

> Programs often send debug information to `stderr` as well as error information.

Redirect both `stdout` and `stderr`:
- `&>`
- `>&`
- `&>>`
- `>>&`

Redirect both `stdout` and `stderr` to a file:

```
> log.txt 2>&1
```

Redirect `stdout` to a file and `stderr` to the abyss:

```
> log.txt 2> /dev/null
```

### Here Document and Here String

[Here documents] and here strings are formally stream literals, and they can be redirected to a command that expects to receive its input from `stdin`.  In less formal terms, it can take the place of a file descriptor.

They are ordinary strings used for input redirection.

Here is an example of a here document:

If the file descriptor isn't specified, it's assumed to be 0, `stdin`.

```
$ uniq -c <<EOF
> dooby
> dooby
> doo
> EOF
      2 dooby
      1 doo
```

Here, we're explicit about the file descriptor, with the same results:

```
$ uniq -c 0<<EOF
> dooby
> dooby
> doo
> EOF
      2 dooby
      1 doo
```

Here is an example of a here string:

```
$ wc -c <<<"Stevie Ray Vaughan will always Rave On"
39
$ wc -c <<<"Stevie Ray Vaughan will always Rave On"
39
```

I often do this when using `bc`:

```
$ bc <<<1*2*3*4*5
120
```

> You can think of `bc` as a command-line calculator.

Here is one last example of a `here-document`:

```
$ cat <<.>/dev/stdout
> poo
> bear
> wha?
> .
poo
bear
wha?
```

Bash will enter `Heredoc` input mode and then exit when a period appears in a line by itself (of course, the delimiting identifier could be any textual string).

In this case, the typed text will be redirected to `stdout`, but I've often done this where I'm taking some quick notes and redirecting the output to a file for later perusal.

```
$ cat <<NOTES> /tmp/for/later.txt
```

> There must be two greater than symbols (`<`) directly prior to the delimiting identifier ("NOTES", in the last example).

## Terminal Multiplexers

In electronics, a multiplexer (or `mux`) is a device that allows for multiple inputs to be connected to a single output.  A terminal multiplexer gives us the ability to switch between different inputs as required.

- [`screen`]
- [`tmux`]

## Process Priority

Linux is a preemptive multi-processing operating system.  The *preemptive* means that a process with a higher priority cantake control of the CPU over a process currently controlling the CPU but with a lower priority.

The [Linux scheduler] handles the scheduling of processes, or tasks, and handles CPU resource allocation for these running tasks.

Processes have two predicates that intervene on their behalf:

- scheduling policy
    + real-time policy
        - processes under this policy are scheduled by their priority values directly
        - lower priority processes only gain control when the higher priority processes are idle or are waiting on a response from hardware (I/O)
        - only a few processes fall under the umbrellas of real-time processes
    + normal policy
        - most processes on a system run under a normal policy (both system and user)
- scheduling priority
    + usually called *static* scheduling priorities
        - static priorities range from 0 - 99 for real-time processes
        - static priorities range from 100 - 139 for normal processes
            + meaning that there are 39 different priorities
    + lower values have a higher priority
    + processes under a normal policy usually have the same priority value
    + they can be changed using [`nice`] and [`renice`]

Only processes under normal scheduling policy will be affected when inspecting and tuning process scheduling.

You can view the priority number of a process by getting the information about the scheduling information about the process:

```
$ grep ^prio /proc/$$/sched
prio                                         :                  120
$ grep ^prio /proc/1/sched
prio                                         :                  120
```

The standard priority of a normal process is 120, as shown here.  It can be increased to 139 or decreased to 100.

> The priority of all running processes can be seen with `top` or `ps.
>
> For example, the following command and options are equivalent:
>
> ```
> ps -el
> ps -Al
> ```

See:

- [`nice`](#nice)
- [`renice`](#renice)

# Summary

Continue your journey with the fourth (and last) installment in this titillating series, [On Studying for the LPIC-1 Exam 101 (101-500), Part Four](/2023/01/20/on-studying-for-the-lpic-1-exam-101-101-500-part-four/).
# References

- [LPIC-1 Objectives V5.0](https://wiki.lpi.org/wiki/LPIC-1_Objectives_V5.0)
- [LPIC-1 Learning Materials](https://learning.lpi.org/en/learning-materials/101-500/)
- [filesystems(5)](https://www.man7.org/linux/man-pages/man5/filesystems.5.html)
- [proc(5)](https://man7.org/linux/man-pages/man5/proc.5.html)
- [Filesystem Hierarchy Standard](https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard)
- [Persistent block device naming (Arch linux docs)](https://wiki.archlinux.org/title/Persistent_block_device_naming)
- [Difference Between Sourcing and Executing a Shell Script](https://www.baeldung.com/linux/sourcing-vs-executing-shell-script)

[LPIC-1]: https://www.lpi.org/our-certifications/lpic-1-overview
[LPIC-1 Exam 101]: https://www.lpi.org/our-certifications/exam-101-objectives
[`systemd`]: https://systemd.io/
[`/etc/fstab`]: https://man7.org/linux/man-pages/man5/fstab.5.html
[World Wide Name]: https://en.wikipedia.org/wiki/World_Wide_Name
[`udev`]: https://en.wikipedia.org/wiki/Udev
[`mke2fs`]: https://www.man7.org/linux/man-pages/man8/mke2fs.8.html
[`PCI`]: https://en.wikipedia.org/wiki/Peripheral_Component_Interconnect
[`UID`]: https://en.wikipedia.org/wiki/Unique_identifier
[`tune2fs`]: https://man7.org/linux/man-pages/man8/tune2fs.8.html
[ISA]: https://en.wikipedia.org/wiki/Direct_memory_access#ISA
[DMA]: https://en.wikipedia.org/wiki/Direct_memory_access
[`mount`]: https://man7.org/linux/man-pages/man8/mount.8.html
[`mkswap`]: https://man7.org/linux/man-pages/man8/mkswap.8.html
[`swapon`]: https://man7.org/linux/man-pages/man8/swapon.8.html
[`swapoff`]: https://man7.org/linux/man-pages/man8/swapoff.8.html
[`insmod`]: https://www.man7.org/linux/man-pages/man8/insmod.8.html
[`modprobe`]: https://man7.org/linux/man-pages/man8/modprobe.8.html
[`rmmod`]: https://man7.org/linux/man-pages/man8/rmmod.8.html
[`modinfo`]: https://man7.org/linux/man-pages/man8/modinfo.8.html
[`lsmod`]: https://man7.org/linux/man-pages/man8/lsmod.8.html
[ring buffer]: https://en.wikipedia.org/wiki/Circular_buffer
[`telinit`]: https://man7.org/linux/man-pages/man8/telinit.8.html
[`runlevel`]: https://man7.org/linux/man-pages/man8/runlevel.8.html
[`systemctl`]: https://man7.org/linux/man-pages/man1/systemctl.1.html
[`dmesg`]: https://man7.org/linux/man-pages/man1/dmesg.1.html
[`journalctl`]: https://man7.org/linux/man-pages/man1/journalctl.1.html
[the kernel's command-line parameters]: https://www.kernel.org/doc/html/v4.14/admin-guide/kernel-parameters.html
[zombie]: https://en.wikipedia.org/wiki/Zombie_process
[`free`]: https://man7.org/linux/man-pages/man1/free.1.html
[when creating `udev` rules]: https://opensource.com/article/18/11/udev
[`lsblk`]: https://man7.org/linux/man-pages/man8/lsblk.8.html
[RAM disks]: https://en.wikipedia.org/wiki/RAM_drive
[`sysfs`]: https://man7.org/linux/man-pages/man5/sysfs.5.html
[`udev db`]: https://unix.stackexchange.com/questions/666954/where-is-the-udev-database-stored-and-what-sets-the-permission
[PCI Express bus]: https://en.wikipedia.org/wiki/PCI_Express
[only fools use Docker]: /2022/02/04/on-running-systemd-nspawn-containers/
[`/etc/group`]: https://man7.org/linux/man-pages/man5/group.5.html
[`/etc/gshadow`]: https://man7.org/linux/man-pages/man5/gshadow.5.html
[`usermod`]: https://man7.org/linux/man-pages/man8/usermod.8.html
[`chgrp`]: https://man7.org/linux/man-pages/man1/chgrp.1.html
[`lscpu`]: https://man7.org/linux/man-pages/man1/lscpu.1.html
[`util-linux`]: https://sources.debian.org/src/util-linux/
[`blkid`]: https://man7.org/linux/man-pages/man8/blkid.8.html
[`lsdev`]: https://linux.die.net/man/8/lsdev
[`procinfo`]: https://sources.debian.org/src/procinfo/
[`lspci`]: https://man7.org/linux/man-pages/man8/lspci.8.html
[`pciutils`]: https://sources.debian.org/src/pciutils/
[`lsusb`]: https://man7.org/linux/man-pages/man8/lsusb.8.html
[`usbutils`]: https://sources.debian.org/src/usbutils/
[`UUID`]: https://en.wikipedia.org/wiki/Universally_unique_identifier
[`LVM`]: ttps://en.wikipedia.org/wiki/Logical_Volume_Manager_%28Linux%29
[`man lvchange`]: https://www.man7.org/linux/man-pages/man8/lvchange.8.html
[MAC addresses]: https://en.wikipedia.org/wiki/MAC_address
[`GPT`]: https://en.wikipedia.org/wiki/GUID_Partition_Table
[`EFI`]: https://en.wikipedia.org/wiki/EFI_system_partition
[List of filesystem partition type codes.]: https://linuxconfig.org/list-of-filesystem-partition-type-codes
[`SHLVL`]: https://www.gnu.org/software/bash/manual/html_node/Bash-Variables.html
[`BIOS`]: https://en.wikipedia.org/wiki/BIOS
[`GRUB`]: https://www.gnu.org/software/grub/
[GNU Project]: https://www.gnu.org/
[symlinked]: /2022/09/25/on-hard-and-soft-links/
[Arch Linux]: https://archlinux.org/
[MBR]: https://en.wikipedia.org/wiki/Master_boot_record
[chain loading]: https://en.wikipedia.org/wiki/Chain_loading
[each partition entry taking 16 bytes]: https://en.wikipedia.org/wiki/Master_boot_record#PT
[`grub-install`]: https://www.gnu.org/software/grub/manual/grub/html_node/Installing-GRUB-using-grub_002dinstall.html
[`GRUB` Legacy on Wikipedia.]: https://en.wikipedia.org/wiki/GNU_GRUB#Version_0_(GRUB_Legacy)
[`GRUB2` on Wikipedia.]: https://en.wikipedia.org/wiki/GNU_GRUB#Version_2_(GRUB_2)
[device mapper]: https://en.wikipedia.org/wiki/Device_mapper
[`nice`]: https://man7.org/linux/man-pages/man1/nice.1.html
[`renice`]: https://man7.org/linux/man-pages/man1/renice.1.html
[Firefox web containers]: https://hacks.mozilla.org/2021/05/introducing-firefox-new-site-isolation-security-architecture/
[`Btrfs`]: https://man7.org/linux/man-pages/man8/btrfs-filesystem.8.html
[`COW`]: https://en.wikipedia.org/wiki/Copy-on-write
[`LZO`]: https://en.wikipedia.org/wiki/Lempel%E2%80%93Ziv%E2%80%93Oberhumer
[`zlib`]: https://en.wikipedia.org/wiki/Zlib
[`zstd`]: https://en.wikipedia.org/wiki/Zstd
[`mkfs.btrfs`]: https://man7.org/linux/man-pages/man8/mkfs.btrfs.8.html
[`btrfs-subvolume`]: https://man7.org/linux/man-pages/man8/btrfs-subvolume.8.html
[`btrfstune`]: https://man7.org/linux/man-pages/man8/btrfstune.8.html
[Extended filesystem]: https://en.wikipedia.org/wiki/Extended_file_system
[`ext2`]: https://en.wikipedia.org/wiki/Ext2
[`ext3`]: https://en.wikipedia.org/wiki/Ext3
[`ext4`]: https://en.wikipedia.org/wiki/Ext4
[`inodes`]: /2019/11/19/on-inodes/
[B-tree]: https://en.wikipedia.org/wiki/B-tree
[`xfs_admin`]: https://man7.org/linux/man-pages/man8/xfs_admin.8.html
[`xfs_fsr`]: https://man7.org/linux/man-pages/man8/xfs_fsr.8.html
[`xfs_db`]: https://www.man7.org/linux/man-pages/man8/xfs_db.8.html
[`dpkg`]: https://www.man7.org/linux/man-pages/man1/dpkg.1.html
[`apt`]: https://linux.die.net/man/8/apt
[`apt-file`]: https://manpages.debian.org/buster/apt-file/apt-file.1.en.html
[`rpm`]: https://www.man7.org/linux/man-pages/man8/rpm.8.html
[`rpm2cpio`]: https://man7.org/linux/man-pages/man8/rpm2cpio.8.html
[`cpio`]: https://linux.die.net/man/1/cpio
[`glibc`]: https://www.gnu.org/software/libc/
[`libcrypt`]: https://en.wikipedia.org/wiki/Libgcrypt
[`libcurl`]: https://curl.se/libcurl/
[`ld.so`]: https://man7.org/linux/man-pages/man8/ld.so.8.html
[`ldconfig`]: https://man7.org/linux/man-pages/man8/ldconfig.8.html
[`LD_LIBRARY_PATH`]: https://man7.org/linux/man-pages/man8/ld.so.8.html#ENVIRONMENT
[`ELF`]: https://en.wikipedia.org/wiki/Executable_and_Linkable_Format
[`dpkg-query`]: https://man7.org/linux/man-pages/man1/dpkg-query.1.html
[`apt-get`]: https://linux.die.net/man/8/apt-get
[`apt-cache`]: https://linux.die.net/man/8/apt-cache
[Topic 103: GNU and Unix Commands]: https://learning.lpi.org/en/learning-materials/101-500/103/
[`type`]: https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-type
[`-` parameter]: https://www.gnu.org/software/bash/manual/html_node/Special-Parameters.html#index-_002d
[`paste`]: https://man7.org/linux/man-pages/man1/paste.1.html
[`sort`]: https://man7.org/linux/man-pages/man1/sort.1.html
[`od`]: https://man7.org/linux/man-pages/man1/od.1.html
[octal]: https://en.wikipedia.org/wiki/Octal
[`cut`]: https://man7.org/linux/man-pages/man1/cut.1.html
[`tr`]: https://man7.org/linux/man-pages/man1/tr.1.html
[`nl`]: https://man7.org/linux/man-pages/man1/nl.1.html
[`sed`]: https://man7.org/linux/man-pages/man1/sed.1.html
[`cpio`]: https://linux.die.net/man/1/cpio
[`dd`]: https://man7.org/linux/man-pages/man1/dd.1.html
[create a live USB]: /2022/07/31/on-recovering-files-and-persistent-flash-drives/#step-1
[`uniq`]: https://man7.org/linux/man-pages/man1/uniq.1.html
[`tee`]: https://man7.org/linux/man-pages/man1/tee.1.html
[`xargs`]: https://www.man7.org/linux/man-pages/man1/xargs.1.html
[`jobspec`]: http://mywiki.wooledge.org/BashGuide/JobControl#jobspec
[`jobs`]: https://www.gnu.org/software/bash/manual/html_node/Job-Control-Builtins.html#index-jobs
[`nohup`]: https://man7.org/linux/man-pages/man1/nohup.1.html
[`disown`]: https://www.gnu.org/software/bash/manual/html_node/Job-Control-Builtins.html#index-disown
[`SIGHUP`]: https://en.wikipedia.org/wiki/SIGHUP
[`watch`]: https://man7.org/linux/man-pages/man1/watch.1.html
[`top`]: https://man7.org/linux/man-pages/man1/top.1.html
[`htop`]: https://man7.org/linux/man-pages/man1/htop.1.html
[`tar`]: https://man7.org/linux/man-pages/man1/tar.1.html
[`gzip`]: https://linux.die.net/man/1/gzip
[`bzip2`]: https://linux.die.net/man/1/bzip2
[`xz`]: https://linux.die.net/man/1/xz
[`gunzip`]: https://linux.die.net/man/1/xz
[`bunzip2`]: https://linux.die.net/man/1/xz
[`unxz`]: https://linux.die.net/man/1/unxz
[`zcat`]: https://linux.die.net/man/1/zcat
[`bzcat`]: https://linux.die.net/man/1/bzcat
[`xzcat`]: https://linux.die.net/man/1/bzcat
[checksum]: https://en.wikipedia.org/wiki/Checksum
[`md5sum`]: https://man7.org/linux/man-pages/man1/md5sum.1.html
[`sha256sum`]: https://man7.org/linux/man-pages/man1/sha256sum.1.html
[`sha512sum`]: https://man7.org/linux/man-pages/man1/sha512sum.1.html
[`stdin`]: https://man7.org/linux/man-pages/man3/stdin.3.html
[`stdout`]: https://man7.org/linux/man-pages/man3/stdin.3.html
[`stderr`]: https://man7.org/linux/man-pages/man3/stdin.3.html
[Here documents]: https://en.wikipedia.org/wiki/Here_document
[`screen`]: https://man7.org/linux/man-pages/man1/screen.1.html
[`tmux`]: https://man7.org/linux/man-pages/man1/tmux.1.html
[Linux scheduler]: https://en.wikipedia.org/wiki/Completely_Fair_Scheduler
[`locate`]: https://man7.org/linux/man-pages/man1/locate.1.html
[`updatedb`]: https://man7.org/linux/man-pages/man1/updatedb.1.html

