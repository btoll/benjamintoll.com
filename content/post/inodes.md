+++
title = "On Inodes"
date = "2019-11-19T14:53:03-05:00"

+++

What is an [inode]?  What is life, for that matter?  [Who knows?]

But first...

---

Q. What is a file?

A. It&rsquo;s an abstraction!

It is physically located in (at least) three places:

- The actual contents are in data blocks on disk.
- The data about the file, i.e., its metadata, such as its size and user and group IDs, et al., (but importantly, **not** the filename itself), is in a struct in an inode table that describes a filesystem object such as a file or a directory.  An inode resides on a specific device and cannot be hard linked to another device.
- Its filename is only located in the special directory file, which is a table that maps filenames to inode numbers.

So, an inode is metadata for a particular file or directory.  The information is contained in a struct data type.  From `man 2 stat`:

    struct stat {
       dev_t     st_dev;         /* ID of device containing file */
       ino_t     st_ino;         /* Inode number */
       mode_t    st_mode;        /* File type and mode */
       nlink_t   st_nlink;       /* Number of hard links */
       uid_t     st_uid;         /* User ID of owner */
       gid_t     st_gid;         /* Group ID of owner */
       dev_t     st_rdev;        /* Device ID (if special file) */
       off_t     st_size;        /* Total size, in bytes */
       blksize_t st_blksize;     /* Block size for filesystem I/O */
       blkcnt_t  st_blocks;      /* Number of 512B blocks allocated */

       /* Since Linux 2.6, the kernel supports nanosecond
          precision for the following timestamp fields.
          For the details before Linux 2.6, see NOTES. */

       struct timespec st_atim;  /* Time of last access */
       struct timespec st_mtim;  /* Time of last modification */
       struct timespec st_ctim;  /* Time of last status change */

    #define st_atime st_atim.tv_sec      /* Backward compatibility */
    #define st_mtime st_mtim.tv_sec
    #define st_ctime st_ctim.tv_sec
    };

One can view this information for a particular file object by using the [stat] command in the shell:

    $ touch foo
    $ stat foo
      File: foo
      Size: 0               Blocks: 0          IO Block: 4096   regular empty file
    Device: fd01h/64769d    Inode: 13502081    Links: 1
    Access: (0664/-rw-rw-r--)  Uid: ( 1000/   btoll)   Gid: ( 1000/   btoll)
    Access: 2019-12-31 18:25:34.636042221 -0500
    Modify: 2019-12-31 18:25:34.636042221 -0500
    Change: 2019-12-31 18:25:34.636042221 -0500
     Birth: -

> Sadly, since `foo` wasn't born in the United States, it cannot grow up to be President.

Note that the filename isn't part of the inode, even though it's displayed here.  Why is that?  Isn't the name important?

It's important to the computer user, the human being.  What is important to the computer is the inode's number, which it then uses to lookup the contents of the file from the relevant data blocks.

---

A directory is a kind of special file that is essentially a table of mappings of file names to inodes.  This can be demonstrated by using our old friend `ls` with the `-i` switch to display the inode numbers in front of the file names:

    $ touch {1..5}
    $ ls -i1
    13895971 1
    13895973 2
    13895974 3
    13895975 4
    13895976 5

> `-1` lists one file per line.

Now, let's make a hard link to one of the files!  Weeeeeeeeeeeeeeeeeeeee

    $ ln 1 10
    $ ls -i1
    13895971 1
    13895971 10
    13895973 2
    13895974 3
    13895975 4
    13895976 5

As you may have guessed, the new file `10` has the same inode number as its hard link, the file `1`.  This is because, as explained above, the filename only exists in the special directory file and merely points to the inode, which here is shared by both files `1` and `10`.  After all, a file or directory's name may often change, and it's much more efficient to change or update a pointer than to move or copy the file contents themselves.

Let's add some content and see the metadata of the files using `stat`:

    $ echo foo > 10
    $ stat 1 10
      File: 1
      Size: 4               Blocks: 8          IO Block: 4096   regular file
    Device: fd01h/64769d    Inode: 13895971    Links: 2
    Access: (0664/-rw-rw-r--)  Uid: ( 1000/   btoll)   Gid: ( 1000/   btoll)
    Access: 2019-12-31 18:54:57.734368112 -0500
    Modify: 2019-12-31 19:01:43.214369411 -0500
    Change: 2019-12-31 19:01:43.214369411 -0500
     Birth: -
      File: 10
      Size: 4               Blocks: 8          IO Block: 4096   regular file
    Device: fd01h/64769d    Inode: 13895971    Links: 2
    Access: (0664/-rw-rw-r--)  Uid: ( 1000/   btoll)   Gid: ( 1000/   btoll)
    Access: 2019-12-31 18:54:57.734368112 -0500
    Modify: 2019-12-31 19:01:43.214369411 -0500
    Change: 2019-12-31 19:01:43.214369411 -0500
     Birth: -

On the right-hand side we can see that there are two links to the data blocks pointed to by the inode number.  Indeed, when this number is reduced to zero, the kernel can "remove" the "file" from the filesystem.

And, of course, the information is the same, since they are both pointing to the same inode.

---

So, that's it really, not much to it.  But, you may be asking, why is it useful to know this?  Well, the canonical example is when strange characters are used to name a file, but then the filename cannot be obtained when wanting to remove it.

In these situations, just obtain the inode number using the `-i` switch above and pass it to `find`, like so:

    $ touch $(printf "foo\bar")
    $ ls -i1
    13502124 'foo'$'\b''ar'
    $ find . -inum 13502124 -delete

# References

- [Inodes - an Introduction]

[inode]: http://man7.org/linux/man-pages/man7/inode.7.html
[Who knows?]: https://en.wikipedia.org/wiki/The_Shadow
[stat]: https://linux.die.net/man/2/stat
[Inodes - an Introduction]: https://www.grymoire.com/Unix/Inodes.html
