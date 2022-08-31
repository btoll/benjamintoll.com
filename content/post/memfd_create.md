+++
title = "On memfd_create"
date = "2022-08-21T18:52:47Z"

+++

[`memfd_create`] is a Linux-specific [system call] that first made its appearance in the Linux 3.17 kernel ([`glibc`] support was added in version 2.27).  Its *raison d'être* is to create an anonymous file.

An anonymous file is one that only lives in RAM and so has no permanent (non-volatile) backing storage, and all backing pages use anonymous memory.  It will return a [file descriptor] that can be used as usual in file operations that work on file descriptors, because the anonymous file behaves just like a regular file.  However, unlike a regular file, the backing memory is released when there are no more references to it, with nothing having been persisted to any permanent backing storage.

There is a `name` argument, and this name can be seen when listing out the file descriptors and their symbolic links of the process in `/proc/self/fd/`.  It's only for debugging purposes and prefixed with `memfd:`.  It does not affect the file descriptor in any way, so multiple anonymous files can have the same name.

Because this syscall returns a file descriptor, it is inherited by any child process when [fork-exec] like any other file descriptor.

> Anonymous memory refers to a memory mapping with no file or device backing it.  The stack and the heap in an application process are also allocations of anonymous memory.
>
> ['malloc'] also returns anonymous memory as its memory backing.  It's as if it had returned a file descriptor instead of a pointer.

---

- [Common Cases](#common-cases)
- [File Sealing](#file-sealing)
- [Examples](#examples)
    + [`memfd_create`](#memfd_create)
    + [Similar Functionality to `memfd_create`](#similar-functionality-to-memfd_create)
        - [`tmpfile`](#tmpfile)
        - [`O_TMPFILE`](#o_tmpfile)
    + [Fileless Malware](#fileless-malware)
        - [`elfexec`](#elfexec)
    + [Other](#other)
        - [`mkstemp`](#mkstemp)
- [Summary](#summary)
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

2. As an alternative to creating files in `/tmp` and creating a file using an existing syscall like [`open`] with the `O_TMPFILE` flag without the intention of then linking it into the filesystem.

    See the [`O_TMPFILE` example](#o_tmpfile).

In addition, there's a third common case, and it's used for nefarious reasons.  It's also the use case that inspired me to write this article.

3. [Fileless Malware]

    As we'll see shortly, fileless malware refers to a wide range of attacks that all have one thing in common: the software threat only exists in RAM.  A binary is executed, however it is not first saved to the file system (or exists on an external device).

    These sorts of attacks can be hard to detect.  Not only is there no trace of the binary on the system, but unless you know where to look (for example, in `/proc`), you won't know that there's malware actively running on your system.  In addition, a thorough attacker will do as much as they can to scrub all traces of the attack that is possible and obfuscate the rest.

    > For an interesting write-up on detecting a fileless malware attack, see the article [Detecting Linux memfd_create() Fileless Malware with Command Line Forensics].

    See the [`elfexec` example](#elfexec).

## File Sealing

File sealing was one of the design goals by the creator of `memfd_create`, David Herrmann.  Why is it important?

One of the problems of shared memory is that of trust.  What does that mean?  Well, the process that creates it must rely on its untrusted peers not to change the shared memory in any way, either by writing to it or truncating it (shrinking or expanding).  That's a big ask and can lead to [time-of-check to time-of-use] race conditions and [`SIGBUS`] errors, respectively.  Otherwise, not willing to settle for blind trust, the process must take programmatic measures to ensure that its shared memory is protected.

Either method isn't great, and one can quickly see the huge benefits of the added file sealing feature functionality.

We can get access to the file sealing APIs that can be used to manipulate file descriptors using the [`fcntl`] sycall.  In the example below, we're changing the behavior of the `memfd_create` syscall by allowing file sealing on the anonymous.  I'll annotate the program with notes below it.

<pre class="math">
#define _GNU_SOURCE

#include &lt;stdlib.h&gt;
#include &lt;stdio.h&gt;
#include &lt;sys/mman.h&gt;
#include &lt;sys/syscall.h&gt;
#include &lt;unistd.h&gt;
#include &lt;string.h&gt;
#include &lt;sys/types.h&gt;
#include &lt;fcntl.h&gt;                                                      (1)

#define MAX_SIZE 4096

void error(char *msg) {
    perror(msg);
    exit(EXIT_FAILURE);
}

int main(void) {
    int fd = memfd_create("kilgore", MFD_ALLOW_SEALING);                (2)
    if (fd == -1)
        error("memfd_create()");

    if (ftruncate(fd, MAX_SIZE) == -1)
        error("ftruncate()");

    if (fcntl(fd, F_ADD_SEALS, F_SEAL_SHRINK | F_SEAL_GROW) == -1)      (3)
        error("fcntl(F_ADD_SEALS, F_SEAL_SHRINK | F_SEAL_GROW)");

    char *str1 = "One likes to believe in the freedom of music,\n";
    if (write(fd, str1, strlen(str1)) == -1)
        error("write()");

    char *str2 = "but glittering prizes and endless compromises shatter the illusion of integrity.";
    if (write(fd, str2, strlen(str2)) == -1)
        error("write()");

    if (fcntl(fd, F_ADD_SEALS, F_SEAL_WRITE) == -1)                     (4)
        error("fcntl(F_ADD_SEALS, F_SEAL_WRITE)");

    if (write(fd, "This will fail!", 15) == -1)                         (5)
        error("write()");

    off_t r = lseek(fd, 0, 0);
    if (r == -1)
        error("lseek()");

    char buf[MAX_SIZE];
    if (read(fd, buf, sizeof buf) == -1)
        error("read()");

    printf("%s\n", buf);

    sleep(30);
}

</pre>

Notes:

1. Linking to the `fcntl` headers gives the program access to the APIs that manipulate file descriptors.
1. Since file sealing is disabled by default, it's necessary to add the `MFD_ALLOW_SEALING` flag to change the behavior of `memfd_create` to allow file sealing operations on the anonymous file.
1. After setting the size with the [`ftruncate`] call, the file is prevented from any further action to try and alter its size.
1. The file is sealed from any more writes.
1. The file has been sealed and so this subsequent write operation will fail with `EPERM` (operation not permitted).

There are other operations such as `F_GET_SEALS` that are not in the above example, so check out the man page for complete details.

## Examples

### memfd_create

This example is the same as the one above in the section on [file sealing](#file-sealing) with the sealing functionality removed.

<pre class="math">
#define _GNU_SOURCE

#include &lt;stdlib.h&gt;
#include &lt;stdio.h&gt;
#include &lt;sys/mman.h&gt;
#include &lt;sys/syscall.h&gt;
#include &lt;unistd.h&gt;
#include &lt;string.h&gt;
#include &lt;sys/types.h&gt;

#define MAX_SIZE 4096

void error(char *msg) {
    perror(msg);
    exit(EXIT_FAILURE);
}

int main(void) {
    int fd = memfd_create("kilgore", 0);
    if (fd == -1)
        error("memfd_create()");

    if (ftruncate(fd, MAX_SIZE) == -1)
        error("ftruncate()");

    char *str1 = "One likes to believe in the freedom of music,\n";
    if (write(fd, str1, strlen(str1)) == -1)
        error("write()");

    char *str2 = "but glittering prizes and endless compromises shatter the illusion of integrity.";
    if (write(fd, str2, strlen(str2)) == -1)
        error("write()");

    off_t r = lseek(fd, 0, 0);
    if (r == -1)
        error("lseek()");

    char buf[MAX_SIZE];
    if (read(fd, buf, sizeof buf) == -1)
        error("read()");

    printf("%s\n", buf);

    sleep(30);
}

</pre>

In the first terminal, compile the program and run it.  It will block for ~30s, and in the interim we get its `pid` and list its file descriptors in a second terminal.

```
$ gcc -o memfd_create memfd_create.c
$ ./memfd_create
One likes to believe in the freedom of music,
but glittering prizes and endless compromises shatter the illusion of integrity.
```

In the second terminal:

```
$ ps -C memfd_create
    PID TTY          TIME CMD
 165943 pts/2    00:00:00 memfd_create
kilgore-trout ~~> ~:
$ ls -l /proc/165943/fd
total 0
lrwx------ 1 btoll btoll 64 Aug 25 02:04 0 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 25 02:04 1 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 25 02:04 2 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 25 02:04 3 -> '/memfd:kilgore (deleted)'
```

Note the name `kilgore` that is displayed when listing the processes file descriptors.

Here's another example of the same program that uses pointers to write to an area in virtual memory mapped by [`mmap`] instead of using system calls.  This version should be faster because writing there are no privilege context switches.

<pre class="math">
#define _GNU_SOURCE

#include &lt;stdlib.h&gt;
#include &lt;stdio.h&gt;
#include &lt;sys/mman.h&gt;
#include &lt;sys/syscall.h&gt;
#include &lt;unistd.h&gt;
#include &lt;string.h&gt;
#include &lt;sys/types.h&gt;

#define MAX_SIZE 4096

void error(char *msg) {
    perror(msg);
    exit(EXIT_FAILURE);
}

int main(void) {
    int fd = memfd_create("kilgore trout", 0);
    if (fd == -1)
        error("memfd_create()");

    if (ftruncate(fd, MAX_SIZE) == -1)
        error("ftruncate()");

    char *p = mmap(NULL, MAX_SIZE, PROT_READ | PROT_WRITE, MAP_PRIVATE, fd, 0);
    if (p == MAP_FAILED)
        error("mmap()");

    char *s0 = "One likes to believe in the freedom of music,\n";
    char *s1 = "but glittering prizes and endless compromises shatter the illusion of integrity.";

    strncpy(p, s0, strlen(s0));
//    strncpy(p+strlen(s0), s1, strlen(s1));
    strncat(p, s1, strlen(s1));

    printf("%s\n", p);

    if (munmap(p, MAX_SIZE) == -1)
        error("munmap()");

    sleep(30);
}

</pre>

After compiling and running the program it blocks, and getting the `pid` in another terminal allows us to look up the file descriptors:

```
$ ps aux | ag [m]emfd_create_mmap
btoll     779662  0.0  0.0   2488  1228 pts/2    S+   02:49   0:00 ./memfd_create_mmap
$ ls -l /proc/779662/fd
total 0
lrwx------ 1 btoll btoll 64 Aug 27 02:50 0 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 27 02:50 1 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 27 02:50 2 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 27 02:50 3 -> '/memfd:kilgore trout (deleted)'
```

Here we see its name is `kilgore trout`.

### Similar Functionality to `memfd_create`

There have long existed other ways to create temporary files (re, **not** anonymous files), of course, and here are two of them.

#### tmpfile


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

In the first terminal, we compile the program, list the contents of the `/tmp` directory, run the program and list `/tmp` again.  The [`tmpfile`] function does create a file on disk, however it deletes it automatically when it is closed or the program terminates.

Technically, it really isn't a synonym in the sense that it doesn't create an anonymous file behind the scenes, but in practice it is similar because the kernel takes care of removing it from the permanent backing storage itself without needing the developer to.

```
$ gcc -o tmpfile tmpfile.c
$ ls /tmp
$ ./tmpfile
$ ls /tmp
```

In the second terminal, we get the `pid` of the `tmpfile` program and list its file descriptors:

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

#### O_TMPFILE

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

This [`open`] flag is similar to `tmpfile` in that it creates a temporary file and is automatically closed when the last file descriptor is closed.

According to its man page, its an improvement over `tmpfile`.  From the man page, here are the two main use cases to pass `open` the `O_TMPFILE` flag:

> Another way to say this would be that it doesn't create an anonymous file and then [`link`] it into the filesystem.
> - Improved tmpfile(3) functionality: race-free creation of temporary files that (1) are automatically deleted when closed; (2) can never be reached via any pathname; (3) are not subject to symlink attacks; and (4) do not require the caller to devise unique names.
>
> - Creating a file that is initially invisible, which is then populated with data and adjusted to have appropriate filesystem attributes (fchown(2), fchmod(2), fsetxattr(2), etc.)  before being atomically linked into the filesystem in a fully formed state (using linkat(2) as described above).
>

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

### Fileless Malware

#### elfexec

[`elfexec`] is a nice little project.  In addition to it being very readable and easy to understand, there are packages for the most popular distros (including the ability to make a Debian package yourself), and there's even a man page.

Here's a short description from [the project's `README`]:

> Utility to execute ELF binary directly from `stdin` pipe. It is useful to run binary via SSH without copy or install it on remote systems.

Getting the `elfexec` program onto my machine was as easy as 1-2-3.  I'm going to build it from source:

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

Let's have that block and then look at its file descriptors:


```
$ echo '
#include <unistd.h>

int main(int argc, char* argv[])
{
    write(STDOUT_FILENO, "Hello!\n", 7);
    sleep(30);
    return 0;
}
' | cc -xc - -o /dev/stdout | elfexec
Hello!
```

In another terminal:

```
$ ps aux | ag [e]lfexec
btoll     306589  0.0  0.0   2356   516 pts/2    S+   14:47   0:00 elfexec
$ ll /proc/306589/fd
total 0
lr-x------ 1 btoll btoll 64 Aug 25 14:47 0 -> 'pipe:[17941966]'
lrwx------ 1 btoll btoll 64 Aug 25 14:47 1 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 25 14:47 2 -> /dev/pts/2
lrwx------ 1 btoll btoll 64 Aug 25 14:47 3 -> '/memfd:elfexec (deleted)'
```

### Other

#### mkstemp

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

> Of course, [`mkstemp`] is the underlying syscall of the [`mktemp`] command-line tool.

## Summary

This is not a thorough detailing of the [`memfd_create`] system call and all of its configuration options and uses.  Instead, it's meant to be an overview and encourages the reader to do more research on their own.

## References

- [memfd_create(2)](https://dvdhrm.wordpress.com/2014/06/10/memfd_create2/)
- [File Sealing & memfd_create()](https://lkml.org/lkml/2014/3/19/487)
- [`elfexec`](https://github.com/abbat/elfexec)
- [File Sealing & memfd_create()](https://lwn.net/Articles/591108/)
- [Sealed Files](https://lwn.net/Articles/593918/)
- [Detecting Linux memfd_create() Fileless Malware with Command Line Forensics](https://www.sandflysecurity.com/blog/detecting-linux-memfd-create-fileless-malware-with-command-line-forensics/)
- [memfd_create system call for bash](https://forums.raspberrypi.com/viewtopic.php?t=320170)

[`memfd_create`]: https://man7.org/linux/man-pages/man2/memfd_create.2.html
[system call]: /2022/08/18/on-system-calls/
[`glibc`]: https://en.wikipedia.org/wiki/Glibc
['malloc']: https://www.man7.org/linux/man-pages/man3/malloc.3.html
[file descriptor]: https://en.wikipedia.org/wiki/File_descriptor
[fork-exec]: https://en.wikipedia.org/wiki/Fork%E2%80%93exec
[`tmpfs`]: https://en.wikipedia.org/wiki/Tmpfs
[`fnctl`]: https://man7.org/linux/man-pages/man2/fcntl.2.html
[`ftruncate`]: https://www.man7.org/linux/man-pages/man3/ftruncate.3p.html
[`mmap`]: https://www.man7.org/linux/man-pages/man2/mmap.2.html
[`tmpfile`]: https://www.man7.org/linux/man-pages/man3/tmpfile.3.html
[`open`]: https://www.man7.org/linux/man-pages/man2/open.2.html
[Fileless Malware]: https://en.wikipedia.org/wiki/Fileless_malware
[Detecting Linux memfd_create() Fileless Malware with Command Line Forensics]: https://www.sandflysecurity.com/blog/detecting-linux-memfd-create-fileless-malware-with-command-line-forensics/
[time-of-check to time-of-use]: https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use
[`SIGBUS`]: https://en.wikipedia.org/wiki/Bus_error
[`fcntl`]: https://man7.org/linux/man-pages/man2/fcntl.2.html
[`unlink`]: https://www.man7.org/linux/man-pages/man2/unlink.2.html
[`elfexec`]: https://github.com/abbat/elfexec
[the project's `README`]: https://github.com/abbat/elfexec#examples
[`mkstemp`]: https://www.man7.org/linux/man-pages/man3/mkstemp.3.html
[`mktemp`]: https://www.man7.org/linux/man-pages/man1/mktemp.1.html

