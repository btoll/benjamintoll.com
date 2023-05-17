+++
title = "On Hard and Soft Links"
date = "2022-09-25T02:04:05Z"

+++

We use [hard links] all the time.  In fact, we use them much more than [soft links] (perhaps better known by their alternate names symbolic links or symlinks).  As a matter of fact, every file in your filesystem(s) is a hard link.

When a hard link is created, it shares the same [`inode`] as its target.  This is why hard links cannot be linked across filesystems, as each filesystem will have its own number of `inodes`.  At first blush this may seem odd, but recall that many different filesystems are supported by and exist in an operating system (see [virtual filesystem switch] (VFS) for more information), and so there is no guarantee that the filesystem of a target supports hard linking.

Since they share the same `inode`, all the [file attributes] (that is, the metadata) that an `inode` stores in its data structure will be reflected across all the hard links.  Obviously, this means that any changes to the contents of one link will be reflected in all the other hard links because the `inode` references the same data blocks.  But not only that: file permissions, ownership, timestamps (create time, access time, modify time), et al.

Conversely, a soft link does not share the target's `inode`.  Rather, it just points to the file name of the target (although they both have separate and distinct inodes).  This can have some unexpected consequences if you're not careful.

For instance, if a symlink is created and then the target it points to is deleted, well, that's a bad thing.  You're now left with a broken link and potential heartache:

```bash
$ touch 1
$ ln -s {1,2}
$ ls -l
total 0
-rw-rw-r-- 1 btoll btoll 0 Oct  3 15:42 1
lrwxrwxrwx 1 btoll btoll 1 Oct  3 15:42 2 -> 1
$ echo herp >> 1
$ cat {1,2}
herp
herp
$ rm 1
$ ls -l
total 0
lrwxrwxrwx 1 btoll btoll 1 Oct  3 15:42 2 -> 1
$ cat 2
cat: 2: No such file or directory
```

To create a hard link, the `target` link must already exist in the filesystem, and the call will fail if it is not present.  Conversely, a soft link can be created for a non-existent `target` file.  These symlinks that point to non-existent files are called dangling, orphaned or broken link.

Use the [`ln`] command-line program to create both a hard and soft links:

Hard link:

```bash
$ ln target_file.txt new_hard_link.txt
```

Soft link:

```bash
$ ln -s target_file.txt new_soft_link.txt
```

> You can also create a new hard link with `cp` by supplying the `-l` -or `--link` flag.

For example, let's create a file `foo`, hard link the file `bar` to it and then inspect the number of hard links to this particular `inode` as well as the `inode` number and the time of last access, respectively:

```bash
$ touch foo
$ ln {foo,bar}
$ stat --format "%h | %i | %x" {foo,bar}
2 | 7213164 | 2022-09-20 17:16:43.388685355 -0400
2 | 7213164 | 2022-09-20 17:16:43.388685355 -0400
```

Now, update the access time of the `bar` file.  Observe that both the files have been updated, since the `inode` that they both share had its data structure modified:

```bash
$ touch bar
$ stat --format "%h | %i | %x" {foo,bar}
2 | 7213164 | 2022-09-20 17:19:49.208433336 -0400
2 | 7213164 | 2022-09-20 17:19:49.208433336 -0400
```

Let's change the access rights:

```bash
$ stat --format %A {foo,bar}
-rw-rw-r--
-rw-rw-r--
$ chmod 4701 bar
$ stat --format %A {foo,bar}
-rws-----x
-rws-----x
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

> Hard links use the [`link`] system call, whereas soft links use the [`symlink`] system call.

Meanwhile, when deleting a file, i.e. using `rm`, it's not really deleting the file but removing the link to it.  Crucially, it's not truly removed, or unlinked, from the filesystem until all the references to it in the `inode` reach zero (this can lead to some clever data retrieval operations for unwanted deletes).  At this point, the content on disk in the data blocks is freed, and the file cannot be recovered.

> See my article on [On Recovering Deleted Files with `lsof`] to take advantage on this knowledge of how `inodes` work to potentially recover deleted files.

Incidentally, both (additional) hard links and soft links are cheap, then, because they don't create any new space on the hard disk, but some are cheaper than others.  For instance, symlinks add a layer of indirection which a hard link doesn't, because the kernel needs to dereference a pointer to lookup the actual target name.  Probably not a big deal, but it's good to know.

For instance, since a soft link will create its own `inode`, the kernel would first look up the `inode` number of the symbolic link in the `inode` table and then follow its reference to the actual `inode` of the target to be able to look up its file contents.

This example demonstrates that hard and soft links will get its own `inode`:

```bash
$ touch 1
$ ln -s {1,2}
$ ls -l
total 0
-rw-rw-r-- 1 btoll btoll 0 Oct  3 15:42 1
lrwxrwxrwx 1 btoll btoll 1 Oct  3 15:42 2 -> 1
$ stat --format %i {1,2}
6821092
6821093
```

So, why use a soft link over a hard link?

Some file systems don't allow hard links to directories (although symlinks can be created to directories).  This is because linking to directories could lead to circular references (hence a circular directory structure), and a filesystem needs to be a tree-like structure.

For example, on my Linux machine on an `ext4` filesystem type, I tried to create a hard link to the current directory but was disallowed:

```bash
$ ln . derpy
ln: .: hard link not allowed for directory
```

---

The following example will demonstrate that filesystems will get their own allotted number of `inodes`.  Observe that the number of the `inode` is greatly different depending on the filesystem (especially, when it was created, i.e., longer-living filesystems will (usually) have higher numbers assigned to `inodes`).

```bash
$ mkdir foo
$ sudo mount -t tmpfs -o size=150M tmpfs foo
$ file foo
foo: sticky, directory
$ touch derp.txt
$ touch foo/derp.text
$ stat derp.txt ; echo ; stat foo/derp.text
  File: derp.txt
  Size: 0               Blocks: 0          IO Block: 4096   regular empty file
Device: 802h/2050d      Inode: 6555906     Links: 1
Access: (0664/-rw-rw-r--)  Uid: ( 1000/   btoll)   Gid: ( 1000/   btoll)
Access: 2022-09-02 23:11:46.427818478 -0400
Modify: 2022-09-02 23:11:46.427818478 -0400
Change: 2022-09-02 23:11:46.427818478 -0400
 Birth: -

  File: foo/derp.text
  Size: 0               Blocks: 0          IO Block: 4096   regular empty file
Device: 100004h/1048580d        Inode: 3           Links: 1
Access: (0664/-rw-rw-r--)  Uid: ( 1000/   btoll)   Gid: ( 1000/   btoll)
Access: 2022-09-02 23:11:52.371811864 -0400
Modify: 2022-09-02 23:11:52.371811864 -0400
Change: 2022-09-02 23:11:52.371811864 -0400
 Birth: -
```

Clearly, they have different device names and different `inode` numbers.

Here's another example.  Note that these three utilities are all hard links referencing the same `inode`:

```bash
$ ls -il /bin | ag 786461
786461 -rwxr-xr-x 3 root root   39144 Sep  5  2019 bunzip2
786461 -rwxr-xr-x 3 root root   39144 Sep  5  2019 bzcat
786461 -rwxr-xr-x 3 root root   39144 Sep  5  2019 bzip2
```

## References

- [On Inodes](/2019/11/19/on-inodes/)
- [Anatomy of the Linux virtual file system switch](https://developer.ibm.com/tutorials/l-virtual-filesystem-switch/)

[hard links]: https://en.wikipedia.org/wiki/Hard_link
[soft links]: https://en.wikipedia.org/wiki/Symbolic_link
[`inode`]: https://en.wikipedia.org/wiki/Inode
[virtual filesystem switch]: https://en.wikipedia.org/wiki/Virtual_file_system
[file attributes]: https://en.wikipedia.org/wiki/File_attribute
[`link`]: https://man7.org/linux/man-pages/man2/link.2.html
[`symlink`]: https://man7.org/linux/man-pages/man2/symlink.2.html
[`ln`]: https://www.man7.org/linux/man-pages/man1/ln.1.html
[On Recovering Deleted Files with `lsof`]: /2022/08/29/on-recovering-deleted-files-with-lsof/

