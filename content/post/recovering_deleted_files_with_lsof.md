+++
title = "On Recovering Deleted Files with `lsof`"
date = "2022-08-29T02:50:25Z"

+++

The title of this article is a bit disingenuous, *a bit of a liar*, because the truth is that you can only restore a deleted file if another running process is still currently using it.  What that means, and how to recover the deleted file, is the topic of today's exciting post.

---

- [What is an Open File?](#what-is-an-open-file)
- [`lsof`](#lsof)
- [Recovering Files](#recovering-files)
- [Other Uses](#other-uses)
    + [What process has network files with `TCP` state `LISTEN`?](#what-process-has-network-files-with-tcp-state-listen)
    + [What process is bound to a specific port?](#what-process-is-bound-to-a-specific-port)
    + [What processes have opened a file?](#what-processes-have-opened-a-file)
    + [Which files does a process have open?](#which-files-does-a-process-have-open)
    + [Which files does a specific user have open?](#which-files-does-a-specific-user-have-open)
- [Summary](#summary)
- [References](#references)

---

## What is an Open File?

Before we get into the [`lsof`] command, it's important to understand a bit about how the Linux kernel treats an [`inode`] and an open file.

Each file has metadata that describes it, and this data is contained in an [`inode` structure].  This is the information retrieved by the [`stat`] command.

Some of the metadata includes the `inode` number, the locations on the physical disk where the file has been written and the number of hard links that are pointing to the file.  Incidentally, the name of the file is not part of the `inode`.

The kernel data structure that contains the filename, cursor position and file mode, et al. is called the [`file` structure], and this is created by the kernel when a file is opened.

The `file` struct also contains the `*f_op` field which is a [`file_operations` struct], which is a pointer to a set of file functions (`open`, `read`, `write`, `mmap`, `lseek`, etc.).  Pretty cool.

The important thing to understand in the context of this article is that even though a file can be "deleted" from a directory, it actually only removes the `inode` number from the directory entry which contains the file and decrements the hard link count in the `inode`.  If the hard link count is zero, then the data blocks are marked as free.

But, the actual data object (structure) itself is not removed as long as something still has a reference to it, like a process.  The process' file descriptor that is a symbolic link to the "deleted" file in `/proc` can then be copied (linked) back into the filesystem.

Neat!

## `lsof`

The [`lsof`] command-line tool stands for *list open files*.  What does `lsof` consider to be a file?  According to the man page:

> An  open  file  may  be a regular file, a directory, a block special file, a character special file, an executing text reference, a library, a stream or a network file (Internet socket, NFS file or UNIX domain socket.)  A specific file or all the files in a file system may be selected by path.

Looks like [everything (really) is a file] in Linux!

## Recovering Files

Anyway, let's look at how to recover an accidentally deleted file.  A scenario very similar to the one I'll describe did happen to me a number of years ago, and thankfully I was able to restore the file, just as we'll do today.

Let's say I have file in the current directory that contains, oh, I don't know, something about the President of France, and I'm reading it in [`less`].  Since I'm a cool kid, I use a [terminal multiplexer] that allows me to have more than one terminal open in my screen, when, all of a sudden, my chubby little fingers crusted with KFC grease `rm`s the file.

Luckily, I still have the file open in `less`.  But, how do I restore it?

Let's begin with `lsof`.  Using `lsof` without any flags or arguments will print every open file on the system, and we simply search for the string pattern of our file.  This more than likely will take a couple of seconds.

The result of this piped output will show the following:

- the name of the process
- the `pid` (process id)
- the owner
- the file descriptor (the `r` means that it's a regular file)
- the type of the node associated with the file
- the file's major/minor device number
- the size of the file
- the [`inode`] number of the file
- the full path of the file

```
$ lsof | ag macron.txt
less      1510962                              btoll    4r      REG                8,2       304    6555903 /home/btoll/projects/benjamintoll.com/macron.txt (deleted)
```

Now, that we know the `pid`, we can list its file descriptors in the `proc` pseudo-filesystem:

```
$ ls -l /proc/1510962/fd
total 0
lrwx------ 1 btoll btoll 64 Aug 30 00:45 0 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 30 00:45 1 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 30 00:45 2 -> /dev/pts/2
lr-x------ 1 btoll btoll 64 Aug 30 00:45 3 -> /dev/tty
lr-x------ 1 btoll btoll 64 Aug 30 00:45 4 -> '/home/btoll/projects/benjamintoll.com/macron.txt (deleted)'
```

Here, you can see that the file descriptor `4` is a symbolic link to the deleted file:

```
$ file /proc/1510962/fd/4
/proc/1510962/fd/4: symbolic link to /home/btoll/projects/benjamintoll.com/macron.txt (deleted)
```

And, we can prove that some program (well, we know that's `less`) has opened it because we can see that [`stat`] still shows one reference to it:

```
$ stat /proc/1510962/fd/4
  File: /proc/1510962/fd/4 -> /home/btoll/macron.txt (deleted)
  Size: 64              Blocks: 0          IO Block: 1024   symbolic link
Device: 5h/5d   Inode: 23166603    Links: 1
Access: (0500/lr-x------)  Uid: ( 1000/   btoll)   Gid: ( 1000/   btoll)
Access: 2022-08-30 01:29:07.574008620 -0400
Modify: 2022-08-30 01:28:49.098088543 -0400
Change: 2022-08-30 01:28:49.098088543 -0400
 Birth: -
```

But, that's ok, because we can still use the file descriptor to copy the contents.  After all, its content hasn't been deleted yet since its inode still contains a reference (the `less` program), so we can copy the bits from disk that the inode references in its data structure.

```
$ cp /proc/1510962/fd/4 macron.txt.restored
$ cat macron.txt.restored
[original text]
```

## Other Uses

There are other nifty uses for `lsof`, as you can probably imagine.

### What process has network files with `TCP` state `LISTEN`?

```
$ lsof -i tcp -s TCP:LISTEN
COMMAND  PID  USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
python3 3987 btoll    3u  IPv4  57565      0t0  TCP *:http-alt (LISTEN)
```

### What process is bound to a specific port?

```
$ lsof -i tcp:8080
COMMAND  PID  USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
python3 3987 btoll    3u  IPv4  57565      0t0  TCP *:http-alt (LISTEN)
```

### What processes have opened a file?

```
$ lsof /tmp/ycm_jgy46s88.log
COMMAND     PID  USER   FD   TYPE DEVICE SIZE/OFF    NODE NAME
vim     1544747 btoll    3w   REG    8,2      214 8912927 /tmp/ycm_jgy46s88.log
$ ps aux | ag [1]544747
btoll    1544747  0.0  0.1 112220 25960 pts/1    Sl+  01:59   0:00 vim baseball.py
```

Of course, now that have have the `pid`, we can get all sorts of useful information from the kernel about the process in `/proc`:

```
$ ls - /proc/1544747/fd
total 0
lrwx------ 1 btoll btoll 64 Aug 30 02:00 0 -> /dev/pts/1
lrwx------ 1 btoll btoll 64 Aug 30 02:00 1 -> /dev/pts/1
lrwx------ 1 btoll btoll 64 Aug 30 02:00 2 -> /dev/pts/1
l-wx------ 1 btoll btoll 64 Aug 30 02:00 3 -> /tmp/ycm_jgy46s88.log
lrwx------ 1 btoll btoll 64 Aug 30 02:00 4 -> /home/btoll/.baseball.py.swp
lr-x------ 1 btoll btoll 64 Aug 30 02:00 5 -> 'pipe:[23204158]'
lr-x------ 1 btoll btoll 64 Aug 30 02:00 7 -> 'pipe:[23204159]'
$ ls -l /proc/1544747/exe
lrwxrwxrwx 1 btoll btoll 0 Aug 30 01:59 /proc/1544747/exe -> /usr/bin/vim.basic*
$ ls -l /proc/1544747/cwd
lrwxrwxrwx 1 btoll btoll 0 Aug 30 02:00 /proc/1544747/cwd -> /home/btoll/
$ cat /proc/1544747/cmdline
vimbaseball.py

```

### Which files does a process have open?

By `pid`:

```
$ lsof -p 1544747
COMMAND     PID  USER   FD   TYPE DEVICE SIZE/OFF     NODE NAME
vim     1544747 btoll  cwd    DIR    8,2     4096  6029314 /home/btoll
vim     1544747 btoll  rtd    DIR    8,2     4096        2 /
vim     1544747 btoll  txt    REG    8,2  2906824   263017 /usr/bin/vim.basic
vim     1544747 btoll  mem    REG    8,2   598104   262790 /usr/lib/x86_64-linux-gnu/libssl.so.1.1
vim     1544747 btoll  mem    REG    8,2   186344   524727 /usr/lib/python3.8/lib-dynload/_ssl.cpython-38-x86_64-linux-gnu.so
vim     1544747 btoll  mem    REG    8,2  2954080   262363 /usr/lib/x86_64-linux-gnu/libcrypto.so.1.1
vim     1544747 btoll  mem    REG    8,2   162264 11665647 /lib/x86_64-linux-gnu/liblzma.so.5.2.4
vim     1544747 btoll  mem    REG    8,2    74848 11665495 /lib/x86_64-linux-gnu/libbz2.so.1.0.4
...
```

By name:

```
$ lsof -c less
COMMAND     PID  USER   FD   TYPE DEVICE SIZE/OFF     NODE NAME
less    1733935 btoll  cwd    DIR    8,2     4096  6029314 /home/btoll
less    1733935 btoll  rtd    DIR    8,2     4096        2 /
less    1733935 btoll  txt    REG    8,2   180064   262597 /usr/bin/less
less    1733935 btoll  mem    REG    8,2  5699248   263354 /usr/lib/locale/locale-archive
less    1733935 btoll  mem    REG    8,2  2029592 11665763 /lib/x86_64-linux-gnu/libc-2.31.so
less    1733935 btoll  mem    REG    8,2   192032 11665489 /lib/x86_64-linux-gnu/libtinfo.so.6.2
less    1733935 btoll  mem    REG    8,2   191504 11665682 /lib/x86_64-linux-gnu/ld-2.31.so
less    1733935 btoll    0u   CHR  136,4      0t0        7 /dev/pts/4
less    1733935 btoll    1u   CHR  136,4      0t0        7 /dev/pts/4
less    1733935 btoll    2u   CHR  136,4      0t0        7 /dev/pts/4
less    1733935 btoll    3r   CHR    5,0      0t0       13 /dev/tty
less    1733935 btoll    4r   REG    8,2      608  6036785 /home/btoll/macron.t
```

### Which files does a specific user have open?

```
$ lsof -u btoll
...
```

> Many of the options can be combined.

## Summary

Weeeeeeeeeeeeeeeeeeeeeee

## References

- [inode(7)](https://man7.org/linux/man-pages/man7/inode.7.html)
- [The Linux Kernel: Index Nodes](https://www.kernel.org/doc/html/latest/filesystems/ext4/inodes.html)
- [`linux/fs.h`](https://github.com/torvalds/linux/blob/master/include/linux/fs.h)
- [Anatomy of the Linux virtual file system switch](https://developer.ibm.com/tutorials/l-virtual-filesystem-switch/)

[`lsof`]: https://man7.org/linux/man-pages/man8/lsof.8.html
[`inode`]: /2019/11/19/on-inodes/
[`inode` structure]: https://github.com/torvalds/linux/blob/master/include/linux/fs.h#L593
[`stat`]: https://www.man7.org/linux/man-pages/man1/stat.1.html
[`file` structure]: https://github.com/torvalds/linux/blob/master/include/linux/fs.h#L940
[`file_operations` struct]: https://github.com/torvalds/linux/blob/master/include/linux/fs.h#L2093
[everything (really) is a file]: https://en.wikipedia.org/wiki/Everything_is_a_file
[`less`]: https://www.man7.org/linux/man-pages/man1/less.1.html
[terminal multiplexer]: https://github.com/tmux/tmux

