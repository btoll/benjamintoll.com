+++
title = "On Creating an Empty File"
date = "2021-07-14T20:17:17-04:00"

+++

Here's a bit of fun.

The following will all create a [zero-byte file]:

- [redirection]
- [touch]
- [dd]

Let's see examples of each at the command line:

```
$ > empty.out
$ touch empty.out
$ dd if=/dev/null of=empty.out count=0
0+0 records in
0+0 records out
0 bytes copied, 0.00033948 s, 0.0 kB/s
```

They will all output the same pertinent information when displaying the file status, similar to that shown below (with different inode numbers and timestamps, obviously):

```
$ stat empty.out
  file: empty.out
  size: 0               blocks: 0          io block: 4096   regular empty file
device: 802h/2050d      inode: 6556767     links: 1
access: (0664/-rw-rw-r--)  uid: ( 1000/   btoll)   gid: ( 1000/   btoll)
access: 2021-07-14 21:20:06.753450366 -0400
modify: 2021-07-14 21:20:06.753450366 -0400
change: 2021-07-14 21:20:06.753450366 -0400
 birth: -
```

> zero-byte files can also be created programmatically and as an artifact of an aborted file operation due to an error.

The following will also create an empty file:

```
$ echo > empty.out
$
$ stat empty.out
  file: empty.out
  size: 1               blocks: 8          io block: 4096   regular file
device: 802h/2050d      inode: 6556764     links: 1
access: (0664/-rw-rw-r--)  uid: ( 1000/   btoll)   gid: ( 1000/   btoll)
access: 2021-07-14 21:22:12.585225280 -0400
modify: 2021-07-14 21:22:12.585225280 -0400
change: 2021-07-14 21:22:12.585225280 -0400
 birth: -
```

Wait, though.  Although it looks empty, it actually contains a newline character.  Open the file in vim with the command to show the control character:

```
$ vim -c "set list" empty.out
```

You should see a dollar sign (`$`).

Alternatively, it would be easier to just use the [`od`] tool to format the content of the file in your favorite numbering system:

```
$ whatis od
od (1)               - dump files in octal and other formats
```

```
$ od -a n -t d1 empty.out
   10
$ od -a n -t x1 empty.out
 0a
$ od -a n -t o1 empty.out
 012
```

The content is displayed in decimal, hexadecimal and octal, respectively.

So, perhaps it should be called a *visually* empty file.

---

This is all well and good, but how can a zero-byte file be stored on disk?  If there's no data in the file, how can it be represented on disk (i.e., it won't have written to any blocks in storage)?

It's a great question!  Incidentally, those are the only kinds of questions i ever ask!

Files, as abstractions, are stored in three different areas by the operating system:

- the contents are stored in data blocks on the physical disk
- as an [inode], that is, the data structure that contains metadata about the file
- as an entry in the table in the special directory file that maps inode numbers to filenames

In the case of a zero-byte file, there is no data stored on disk (see the above output of `stat`, in particular that the block size is zero).  However, the inode structure itself has a size, and the inode is stored in the inode table on disk.

[zero-byte file]: https://en.wikipedia.org/wiki/Zero-byte_file
[redirection]: https://www.gnu.org/software/bash/manual/html_node/Redirections.html
[touch]: https://www.man7.org/linux/man-pages/man1/touch.1.html
[dd]: https://www.man7.org/linux/man-pages/man1/dd.1.html
[`od`]: https://www.man7.org/linux/man-pages/man1/od.1.html
[inode]: /2019/11/19/on-inodes/

