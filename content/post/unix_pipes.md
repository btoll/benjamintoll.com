+++
title = "On Unix Pipes"
date = "2018-05-14T20:58:57-04:00"

+++

[Unix pipes] are easy to understand because they are easily visualized and mapped to a real-world construct (their namesake).  Data in, data out.  It's serial, or unidirectional, communication, and you use them all over the place when doing anything useful on the command line (which everyone is, naturally).

This is just going to be a short post to serve as a reference for myself.

Having come from the world of higher-level, interpreted languages like PHP and JavaScript, it was highly instructive (and fun!) when I saw my first C program that demonstrated the use of pipes.  I believe the source was either [K & R] or [Beej's Guide to Unix IPC], and it simply coded the Unix pipeline `ls | wc -l`.  The following is a similar example that `cat`s a file and `grep`s for the word "fork" (`cat pipes.c | grep fork`):

```
#include <stdlib.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

// cat pipes.c | grep fork

int main(int argc, char **argv) {
    int fd[2];

    if (pipe(fd) == -1) {
        perror("pipe");
        exit(1);
    }

    if (!fork()) {
        close(fd[0]);

        if (dup2(fd[1], STDOUT_FILENO) == -1) {
            perror("dup2");
            _exit(1);
        }

        if (execlp("cat", "cat", "pipes.c", NULL) == -1) {
            perror("execlp");
            _exit(1);
        }

        _exit(0);
    } else {
        wait(NULL);
        close(fd[1]);

        if (dup2(fd[0], STDIN_FILENO) == -1) {
            perror("dup2");
            exit(1);
        }

        if (execlp("grep", "grep", "fork", NULL) == -1) {
            perror("execlp");
            exit(1);
        }
    }

    return 0;
}
```

Compiling and running will output the following to `stdout`:

```
// cat pipes.c | grep fork
    if (!fork()) {
        } else if (execlp("grep", "grep", "fork", NULL) == -1) {
```

Here is a summary of the most important bits:

1. The call to `pipe()` creates the pipe, and the passed array of two integers will hold the two [file descriptors] that refer to each end of the created pipe (read/write, respectively).
2. The process forks, and the child (the first part of the `if` block, `pid` 0) inherits a copy of all open file descriptors and variables (including environment variables) from the parent. This is why the call to `pipe()` needs to take place prior to forking the process.
3. The call to `dup2()` is a sort of a combination of calling `close()` followed by `dup()`, which was the "old" way of doing it. The first argument is the old file descriptor, and the second argument specifies the new file descriptor. In essence, this is saying "copy the file descriptor in `fd[1]` to `stdout`".
4. The `exec` family of functions replaces the forked child process with the process specified as the first parameter.
5. Note that it's best to use the `_exit()` function in the child process.  This not only immediately ends the process and closes any file descriptors belonging to the process, but it doesn't flush any of its `stdio` streams, and it also doesn't call any functions registered with `atexit()` or `on_exit()`.  See its man page for all the details.
6. The calls in the parent process are all similar to what was previously described, except for the `wait()` call.  This is particular to a parent process, for it will block until the child process is terminated. Its lone parameter is the child's return status. I specified `NULL` because it's not of interest to me here.

Note that unlike other inter-process communication such as [named pipes], the communication between the ends of the pipe take place in kernel space rather than user space.

On a side note, when I was learning the basics of [functional programming], I found pipes to be analogous to function composition.  For example, the thought experiment goes that every function (in this case, the process) has an arity of one, and it simply passes the output of one function (re: process) as the input of another until the end result pops out the other end of the composition pipe.  No saved state, no intermediate variables.

[Unix pipes]: https://en.wikipedia.org/wiki/Pipeline_(Unix)
[K & R]: https://en.wikipedia.org/wiki/The_C_Programming_Language
[Beej's Guide to Unix IPC]: https://beej.us/guide/bgipc/html/multi/index.html
[file descriptors]: https://en.wikipedia.org/wiki/File_descriptor
[named pipes]: https://en.wikipedia.org/wiki/Named_pipe
[functional programming]: https://en.wikipedia.org/wiki/Functional_programming

