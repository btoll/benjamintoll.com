+++
title = "On Creating a Zombie (Process)"
date = "2021-03-17T17:52:45-04:00"

+++

My favorite [Romero] movie is the obscure and now out-of-print "Night of the Living Zombie Process".  It's a delightful romp, although it's difficult to find any information on it.  Probably something to do with Tipper Gore and the [PMRC].

Anyway, another thing that's delightful is learning about zombie processes.  What are they?  How are they created?  What to do about them?

I don't know about you, but I'm really *chompin'* at the bit and *hungry* to get started.  Let's go!

# What Are They?

Before I describe how zombie processes are created, it's necessary to understand how [forking a process] works.

Processes need a way to create new processes, thereby running new programs.  In Unix and its derivatives, this is accomplished by invoking the [`fork`] system call to make a copy of itself, known as *forking* a process.  Importantly, this creates a separate virtual address space for the new child process that initially still contains the same data as that of the parent due to the copy-on-write mechanism performed by the kernel.  This means that the two independent processes will share the same physical memory pages until one of them modifies those pages.  The child process can then overlay/replace its process image with a new program by calling one of the [`exec`] family of system calls.  This process is known as the [`fork-exec`] technique.

> In the child process, return value of the `fork` system call will be 0, but in the parent process the return value from `fork` will be the non-zero child [process identifier] (PID) and can be accessed with the [`getpid`] function (if the child process is the caller, that is).  See the code samples below to see the branching in action.

The parent process should then [`wait`] on its child process(es) to finish execution.  So, [`wait`] blocks the calling thread until one of the parent's child process is terminated.  On success, [`wait`] returns the process ID of the terminated child, and, on failure -1 is returned.

When this occurs, the parent process can access the value of the child process' [exit status] (which indicates how the child process returned, i.e., successfully or not), and then its own execution continues.

The signature looks like this:

```c
pid_t child_pid = wait(&exit_status);
```

> In addition to `wait`, there are also related `waitpid` and `waitid` system calls.  See the [`wait` man page] for more information.

Incidentally, as soon as the child process terminates it is a zombie process with its entry still in the [system process table].  Under normal circumstances, it is immediately waited on by its parent it reaps the child by calling one of the `wait` functions listed above.  Its resource is then removed from the system process table.

So, in summation, a zombie process is a child process that wasn't waited on.  As a result, there is still an entry for it in the system process table, thereby introducing a [resource leak].  It's then necessary for a parent or re-parented process to reap these processes by deallocating their resources.

Lastly, it's important to differentiate between a zombie process and an [orphan process].  The latter is a child process whose parent process has terminated and has been adopted or re-parented to the [`init`] process.

# How Are They Created?

In this article, I'll be illustrating three different examples:

1. [Reaped](#reaped) - The parent waits on the child.
1. [Zombied](#zombied) - The child exits and is not waited on by the parent.
1. [Orphaned](#orphaned) - The parent exits before the child and is adopted by `init`.

### Reaped

Let's take a look at a simple program in C.  The first version shows the normal case where the parent process waits on the child.

In brief, the program will suspend execution in the parent process when it hits the `wait` function.  Meanwhile, the child process sleeps for ten seconds.  When the program resumes after the child exits, the parent will continue executing (since the state of the child process changed), capturing the PID of the child and then printing both it and the `exit status` before exiting.

This is the proper way of handling (waiting) for a child process and ensuring that its resources are cleaned up, i.e., the entry for the child process is removed from the system process table.

Easy peasy.

`normal.c`

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/wait.h>
#include <unistd.h>

int main() {
    pid_t pid;
    int status;

    if ((pid = fork()) == -1) {
        perror("fork");
        return EXIT_FAILURE;
    }

    // Child process.
    if (pid == 0) {
        sleep(2);
        _exit(0);
    }

    if (waitpid(pid, &status, 0) == -1) {
        perror("waitpid");
        return EXIT_FAILURE;
    }

    if (WIFEXITED(status)) {
        printf("Waited for child PID %ld.  Its exit status is %d.\n", (long)pid, WEXITSTATUS(status));
    } else if (WIFSIGNALED(status)) {
        printf("Child PID %ld terminated by signal %d\n", (long)pid, WTERMSIG(status));
    }

    return EXIT_SUCCESS;
}
```

Just compile and run:

```bash
$ gcc -o normal normal.c
$ ./normal
Waited for child PID 1765368.  Its exit status is 0.
```

### Zombied

Now, let's create a zombie process.  To do that, we'll exit the child process without waiting for it.  In order to see the child process appear as a zombie, we'll pause the program for thirty seconds before the parent process calls its `wait` function.

Note that the only change was to move the `sleep` statement out of the child process block.

`zombie.c`

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/wait.h>
#include <unistd.h>

int main() {
    pid_t pid;
    int status;

    if ((pid = fork()) == -1) {
        perror("fork");
        return EXIT_FAILURE;
    }

    // Child process.
    if (pid == 0) {
        _exit(0);
    }

    sleep(30);

    if (waitpid(pid, &status, 0) == -1) {
        perror("waitpid");
        return EXIT_FAILURE;
    }

    if (WIFEXITED(status)) {
        printf("Waited for child PID %ld.  Its exit status is %d.\n", (long)pid, WEXITSTATUS(status));
    } else if (WIFSIGNALED(status)) {
        printf("Child PID %ld terminated by signal %d\n", (long)pid, WTERMSIG(status));
    }

    return EXIT_SUCCESS;
}
```

Why is the sleep needed?  It will give us time to call the [`ps`] tool and check for current zombie processes.

Here is the sequence:

1. Child exits.
1. Child becomes zombie (parent sleeps).
1. Parent calls `waitpid`.
1. Zombie is reaped and disappears.

Just compile and run.  Note that we run execute the binary in the background so we can check for zombie processes as it sleeps:

```bash
$ ./a.out &
[1] 9198
$ ps ax | ag Z
9174 pts/2    Z      0:00 [a.out] <defunct>
```

We can see that it is indeed a zombie.  The parent process will then reap it.

In addition, since you're of course using a [terminal multiplexer] like [`tmux`] or [`GNU Screen`], you can open our old friend [`top`] in another shell before running the binary and observe the zombie process count increment.

Moreover, you can see the process tree when using our other old friend [`pstree`]:

<pre class="math">
$ pstree -p 1
systemd(1)─┬─...
           ├─...
           ├─tmux: server(4001)─┬─bash(3564)─┬─pstree(9197)
           │                    │            └─top(9493)
           │                    └─bash(7052)─┬─vim(8757)
           │                                 └─zombie(9173)───zombie(9174)
           ├─...
</pre>

Note the location of the `zombie` process with PID 9174 in the running process tree.  If it had been an orphan process that had been re-parented to `init`, it would appear directly below `systemd` in the process tree (where `tmux` is).

### Orphaned

Lastly, let's take a look an example of the child process being re-parented.  This situation occurs when the parent process exits before the child.  When this happens, the orphaned child becomes a child of the [`init`] process, which is PID 1 and is then reaped by that PID.

`orphan.c`

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/wait.h>
#include <unistd.h>

int main() {
    pid_t pid;

    if ((pid = fork()) == -1) {
        perror("fork");
        return EXIT_FAILURE;
    }

    // Child process.
    if (pid == 0) {
        sleep(60);
        _exit(0);
    }

    _exit(0);
}
```

> Note that while the child process sleeps for sixty seconds that the parent process exits immediately.  This is the condition that creates the orphaned process.  Poor fella!

Just compile and run:

```bash
$ gcc -o orphan orphan.c
$ ./orphan &
```

If we inspect the process tree, we'll see that the orphaned process has indeed been re-parented to the init process (on my Debian distro the init process is [`systemd`]).

<pre class="math">
$ pstree -p 1
systemd(1)─┬─...
           ├─...
           ├─orphan(19257)
           ├─...
</pre>

As we'd expect, the orphaned process is directly below the root process.

Also, running `ps` with the child PID, it's clear that it has indeed been re-parented to PID 1.

```bash
$ ps -o ppid -p 19257
  1
```

[Romero]: https://en.wikipedia.org/wiki/George_A._Romero
[PMRC]: https://en.wikipedia.org/wiki/Parents_Music_Resource_Center
[forking a process]: https://en.wikipedia.org/wiki/Fork_%28system_call%29
[`fork`]: https://www.man7.org/linux/man-pages/man2/fork.2.html
[`exec`]: https://en.wikipedia.org/wiki/Exec_(system_call)
[`fork-exec`]: https://en.wikipedia.org/wiki/Fork%E2%80%93exec
[process identifier]: https://en.wikipedia.org/wiki/Process_identifier
[`wait`]: https://en.wikipedia.org/wiki/Wait_(system_call)
[`wait` man page]: https://man7.org/linux/man-pages/man2/wait.2.html
[system process table]: https://exposnitc.github.io/os_design-files/process_table.html
[orphan process]: https://en.wikipedia.org/wiki/Orphan_process
[`init`]: https://en.wikipedia.org/wiki/Init
[exit status]: https://en.wikipedia.org/wiki/Exit_status
[resource leak]: https://en.wikipedia.org/wiki/Resource_leak
[`ps`]: https://www.man7.org/linux/man-pages/man1/ps.1.html
[terminal multiplexer]: https://en.wikipedia.org/wiki/Terminal_multiplexer
[`tmux`]: https://en.wikipedia.org/wiki/Tmux
[`GNU Screen`]: https://en.wikipedia.org/wiki/GNU_Screen
[`top`]: https://www.man7.org/linux/man-pages/man1/top.1.html
[`pstree`]: https://man7.org/linux/man-pages/man1/pstree.1.html
[`systemd`]: https://systemd.io/
[`getpid`]: https://www.man7.org/linux/man-pages/man2/getpid.2.html

