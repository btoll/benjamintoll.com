+++
title = "On memfd_create"
date = "2022-08-21T18:52:47Z"

+++

[`memfd_create`] is a Linux-specific [system call] that first made its appearance in the Linux 3.17 kernel ([`glibc`] support was added in version 2.27).  Its *raison d'être* is to create an anonymous file.

An anonymous file is one that only lives in RAM and so has no permanent (non-volatile) backing storage.  It will return a [file descriptor] that can be used as usual in file operations, because the anonymous file behaves just like a regular file.

mmap ensures that the file behind a file descriptor is in memory (which requires no action in case of a memory-only file), and gives you a pointer to that memory.

---

- [Common Cases](#common-cases)
- [File Sealing](#file-sealing)
- [Examples](#examples)
    + [`mkstemp`](#mkstemp)
    + [`tmpfile`](#tmpfile)
    + [`O_TMPFILE`](#o_tmpfile)
    + [`memfd_create`](#memfd_create)
    + [`elfexec`](#elfexec)
- [References](#references)

---

## Common Cases

According to the man page, there were two motivations for creating the `memfd_create` system call.

1. As an alternative to creating a [`tmpfs`] filesystem, mounting it, creating and opening a file and then tearing it all down.  In addition, the [`fnctl`] system call exposes many APIs that the anonymous file and its associated file descriptor can use to seal the file (the anonymous memory, in this case).

       $ mkdir foo
       $ sudo mount -t tmpfs -o size=150M tmpfs foo
       $ df -hT foo
       Filesystem     Type   Size  Used Avail Use% Mounted on
       tmpfs          tmpfs  150M     0  150M   0% /home/btoll/foo
       $ echo weeeeeeeeeee > foo/bar
       $ df -hT foo
       Filesystem     Type   Size  Used Avail Use% Mounted on
       tmpfs          tmpfs  150M  4.0K  150M   1% /home/btoll/foo
       $ sudo umount foo
       $ rmdir foo

    That's a lot of work!

    > Note that I intentionally did not make the mount point persistent by adding it to `/etc/fstab`.

1. As an alternative to creating files in `/tmp` and creating a file using an existing syscall like [`open`] with the `O_TMPFILE` flag without the intention of then linking it into the filesystem.

    See the [`O_TMPFILE` example](#o_tmpfile).

1. [Fileless Malware]

    As we'll see shortly, fileless malware refers to a wide range of attacks that all have one thing in common: the software threat only exists in RAM.

> Anonymous memory refers to a memory mapping with no file or device backing it.  The stack and the heap in an application process are also allocations of anonymous memory (as is ['malloc']).

## File Sealing

File sealing is disabled by default.

## Examples

### mkstemp

`mkstemp.c`

<pre class="math">
#include &lt;stdlib.h&gt;
#include &lt;stdio.h&gt;
#include &lt;unistd.h&gt;

int main(void) {
    char template[] = "/tmp/tempfile-XXXXXX";

    int fd = mkstemp(template);
    if (fd == -1) {
        perror("There has been a huge problem!");
        return 1;
    }

    sleep(30);
    // unlink(template);
}

</pre>

```
$ gcc -o mkstemp mkstemp.c
$ ls /tmp
$ ./mkstemp
$ ls /tmp
tempfile-PWrBDc
```

In another terminal:

```
$ ps -C mkstemp
    PID TTY          TIME CMD
3972754 pts/2    00:00:00 mkstemp
$ ls -l /proc/3972754/fd
total 0
lrwx------ 1 btoll btoll 64 Aug 24 01:27 0 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 24 01:27 1 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 24 01:27 2 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 24 01:27 3 -> /tmp/tempfile-PWrBDc
```

Note that the only reason that the temporary file still exists is because the [`unlink`] function is commented-out in the program above.  That's very important to be aware of in the context of this article, because that's the only function in this article that has a permanent backing storage.  It is up to the programmer to remove it.

### tmpfile

`tmpfile.c`

<pre class="math">
#include &lt;stdio.h&gt;
#include &lt;unistd.h&gt;
#include &lt;errno.h&gt;

int main(void) {
    FILE *fp = tmpfile();
    if (fp == NULL) {
        perror("Could not create temp file!");
        return 1;
    }

    fprintf(fp, "Hello, world!");

    sleep(30);
}

</pre>

```
$ gcc -o tmpfile tmpfile.c
$ ls /tmp
$ ./tmpfile
$ ls /tmp
```

In another terminal:

```
$ ps -C tmpfile
    PID TTY          TIME CMD
3970916 pts/2    00:00:00 tmpfile
$ ls -l /proc/3970916/fd
total 0
lrwx------ 1 btoll btoll 64 Aug 24 01:24 0 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 24 01:24 1 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 24 01:24 2 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 24 01:24 3 -> '/tmp/#8912919 (deleted)'
```

### O_TMPFILE

`o_tmpfile.c`

<pre class="math">
// The O_DIRECT, O_NOATIME, O_PATH, and O_TMPFILE flags are Linux-specific.
// One must define _GNU_SOURCE to obtain their definitions.
// man 2 open
#define _GNU_SOURCE

#include &lt;stdio.h&gt;
#include &lt;unistd.h&gt;
#include &lt;fcntl.h&gt;

#ifndef PATH_MAX
#define PATH_MAX 100
#endif

int main(void) {
    int fd = open("/tmp", O_TMPFILE | O_EXCL | O_RDWR, S_IRUSR | S_IWUSR);
    if (fd == -1) {
        perror("[ERROR] Could not get file descriptor!");
        return 1;
    }

    char path[PATH_MAX];
    snprintf(path, PATH_MAX, "/proc/%d/fd/%d", getpid(), fd);
    printf("        File descriptor: %d\n", fd);
    printf("Path to file descriptor: %s\n\n", path);

    sleep(30);
}

</pre>

```
$ gcc -o o_tmpfile o_tmpfile.c
$ ls /tmp
$ ./o_tmpfile
        File descriptor: 3
Path to file descriptor: /proc/3967644/fd/3

$ ls /tmp
```

In another terminal:

```
$ ls -l /proc/3967644/fd
total 0
lrwx------ 1 btoll btoll 64 Aug 24 01:19 0 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 24 01:19 1 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 24 01:19 2 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 24 01:19 3 -> '/tmp/#8912919 (deleted)'
```

Listing the `/tmp` directory in the first terminal before and after the execution of the `o_tmpfile` demonstrates that no temporary file was created on the system.

### memfd_create

<pre class="math">
#define _GNU_SOURCE

#include &lt;stdlib.h&gt;
#include &lt;stdio.h&gt;
#include &lt;sys/mman.h&gt;
#include &lt;sys/syscall.h&gt;
#include &lt;unistd.h&gt;
#include &lt;string.h&gt;

void error(char *msg) {
    perror(msg);
    exit(EXIT_FAILURE);
}

int main(void) {
    char *shm;
    const int shm_size = 4096;
    int fd;

    fd = memfd_create("kilgore", 0);
    if (fd == -1)
        error("memfd_create()");

    if (ftruncate(fd, shm_size) == -1)
        error("ftruncate()");

    shm = mmap(NULL, shm_size, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    if (shm == MAP_FAILED)
       error("mmap()");

    char *s1 = "One likes to believe in the freedom of music,\n";
    if (write(fd, s1, strlen(s1)) == -1)
        error("write()");

    char *s2 = "but glittering prizes and endless compromises shatter the illusion of integrity.";
    if (write(fd, s2, strlen(s2)) == -1)
        error("write()");

    printf("%s\n", shm);

    if (munmap(shm, shm_size) == -1)
        error("munmap()");

    sleep(30);
}

</pre>

```
$ gcc -o memfd_create memfd_create.c
$ ./memfd_create
One likes to believe in the freedom of music,
but glittering prizes and endless compromises shatter the illusion of integrity.
```

In another terminal:

```
$ ps -C memfd_create
    PID TTY          TIME CMD
 165943 pts/2    00:00:00 memfd_create
kilgore-trout ~~> ~:
$ ll /proc/165943/fd
total 0
lrwx------ 1 btoll btoll 64 Aug 25 02:04 0 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 25 02:04 1 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 25 02:04 2 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 25 02:04 3 -> '/memfd:kilgore (deleted)'
```

### elfexec

It's a nice little project.  In addition to it being very readable and easy to understand, there are packages for the most popular distros (including the ability to make a Debian package yourself), and there's even a man page.

Getting the `elfexec` program onto my machine was as easy as 1-2-3.  I'm going to build from source.

```
$ git clone git@github.com:abbat/elfexec.git
$ make
$ sudo make install
$ whereis elfexec
elfexec: /usr/bin/elfexec /usr/share/man/man1/elfexec.1
```

Now I'm running the example from [the project's `README`], which prints out the word "Hello!":

```
$ echo '
#include <unistd.h>

int main(int argc, char* argv[])
{
    write(STDOUT_FILENO, "Hello!\n", 7);
    return 0;
}
' | cc -xc - -o /dev/stdout | elfexec
Hello!
```

That's pretty nifty.  It's compiling and writing the binary to the `stdout` file descriptor and streaming it to `elfexec`, which doesn't leave anything on the filesystem and saved to a block device.

## References

- [memfd_create(2)](https://dvdhrm.wordpress.com/2014/06/10/memfd_create2/)
- [`elfexec`](https://github.com/abbat/elfexec)
- [File Sealing & memfd_create()](https://lwn.net/Articles/591108/)
- [Sealed Files](https://lwn.net/Articles/593918/)
- [Detecting Linux memfd_create() Fileless Malware with Command Line Forensics](https://www.sandflysecurity.com/blog/detecting-linux-memfd-create-fileless-malware-with-command-line-forensics/)

[`memfd_create`]: https://man7.org/linux/man-pages/man2/memfd_create.2.html
[system call]: /2022/08/18/on-system-calls/
[`glibc`]: https://en.wikipedia.org/wiki/Glibc
[file descriptor]: https://en.wikipedia.org/wiki/File_descriptor
[`tmpfs`]: https://en.wikipedia.org/wiki/Tmpfs
[`fnctl`]: https://man7.org/linux/man-pages/man2/fcntl.2.html
[`open`]: https://www.man7.org/linux/man-pages/man2/open.2.html
[Fileless Malware]: https://en.wikipedia.org/wiki/Fileless_malware
['malloc']: https://www.man7.org/linux/man-pages/man3/malloc.3.html
[`unlink`]: https://www.man7.org/linux/man-pages/man2/unlink.2.html
[the project's `README`]: https://github.com/abbat/elfexec#examples

