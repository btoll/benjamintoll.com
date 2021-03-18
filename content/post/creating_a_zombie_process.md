+++
title = "On Creating a Zombie (Process)"
date = "2021-03-17T17:52:45-04:00"

+++

My favorite [Romero] movie is the obscure and now out-of-print "Night of the Living Zombie Process".  It's a delightful romp, although it's difficult to find any information on it.  Probably something to do with Tipper Gore and the [PMRC].

Anyway, another thing that's delightful is learning about zombie processes.  What are they?  How are they created?  What to do about them?

I don't know about you, but I'm really *chompin'* at the bit and *hungry* to get started.  Let's go!

# What Are They?

Before I describe how zombie processes are created, it's necessary to understand how [forking a process] works.

Processes need a way to create new processes, thereby running new programs.  In Unix and its derivatives, this is accomplished by invoking the [`fork`] system call to make a copy of itself, that is, *forking* the process.  Importantly, this creates a separate address space for the new child process with exact copies of the parent's memory segments. The child process then overlays/replaces itself with a new program by a call to one of the [`exec`] family of system calls, ceasing execution of the former program (the [`fork-exec`] technique).

> The return value of the new child process will have a [process identifier] (PID) of 0 (zero).  See the code samples below to see the branching in action.

The parent process should then [`wait`] on its child process(es) to finish execution.  In other words, the parent process is halted and is waiting for a change in state of the child process.  When this occurs, the parent process is notified by returning the value of the child process' [exit status] (which indicates how the child process returned, i.e., successfully or not) as a reference, and then its own execution continues.

The signature looks like this:

```
int child_pid = wait(&exit_status);
```

> In addition to `wait`, there are also related `waitpid` and `waitid` system calls.  See the [`wait` man page] for more information.

Incidentally, as soon as the child process terminates it is a zombie process with its entry still in the system process table.  Under normal circumstances, it is immediately waited on by its parent and reaped by the OS and its resource removed from the system process table.

So, in summation, a zombie process is a child process that wasn't waited on.  As a result, there is still an entry for it in the system process table, thereby introducing a [resource leak].  It's then necessary for a special OS reaper process to locate these zombie processes and deallocate their resources.

> On my system, the zombie processes are being reaped by the OS reaper process almost immediately.
>
>		$ hostnamectl
>          Static hostname: kilgore-trout
>         Operating System: Ubuntu 18.04.5 LTS
>                   Kernel: Linux 5.4.0-66-generic
>             Architecture: x86-64

Lastly, it's important to differentiate between zombie process and [orphan process].  The latter is a child process whose parent process has terminated and has been adopted or re-parented to the [`init`] process.

# How Are They Created?

In this article, I'll be illustrating three different examples:

1. [Reaped](#reaped) - The parent waits on the child.
1. [Zombied](#zombied) - The child exits and is not waited on by the parent.
1. [Orphaned](#orphaned) - The parent exits before the child and is adopted by `init`.

### Reaped

Let's take a look at a simple program in C.  The first version shows the normal case where the parent process waits on the child.

In brief, the program will suspend execution in the parent process when it hits the `wait` function.  Meanwhile, the child process sleeps for ten seconds.  When the program resumes after the child exits, the parent will continue executing since the state of the child process changed, capturing the PID of the child and then printing both it and the `exit status` before exiting.

This is the proper way of handling (waiting) for a child process and ensuring that its resources are cleaned up, i.e., the entry for the child process is removed from the system process table.

Easy peasy.

`normal.c`
<pre>
<code>
#include &lt;stdio.h&gt;
#include &lt;stdlib.h&gt;
#include &lt;sys/wait.h&gt;
#include &lt;unistd.h&gt;

int main() {
    pid_t pid;
    int status;

    if ((pid = fork()) < 0) {
        printf("Something went terribly wrong\n");
    }

    printf("PID = %d\n", pid);

    // Child process.
    if (pid == 0) {
        <span style="color: green;">sleep(10);</span>
        exit(0);
    }

    if (pid > 0) {
        wait(&status);
        printf("Child status = %d\n", (unsigned int) status);
    }

    return 0;
}
</code>
</pre>

Just compile and run:

```
$ gcc -o normal normal.c
$ ./normal
PID = 18743
PID = 0
```

### Zombied

Now, let's create a zombie process.  To do that, we'll exit the child process without waiting for it.  In order to see the child process appear as a zombie, we'll pause the program for ten seconds before the parent process calls its `wait` function.

Note that the only change was to move the `sleep` statement out of the child process block.

`zombie.c`
<pre>
<code>
#include &lt;stdio.h&gt;
#include &lt;stdlib.h&gt;
#include &lt;sys/wait.h&gt;
#include &lt;unistd.h&gt;

int main() {
    pid_t pid;
    int status;

    if ((pid = fork()) < 0) {
        printf("Something went terribly wrong\n");
    }

    printf("PID = %d\n", pid);

    // Child process.
    if (pid == 0) {
        exit(0);
    }

    <span style="color: green;">sleep(30);</span>

    if (pid > 0) {
        wait(&status);
        printf("Child status = %d\n", (unsigned int) status);
    }

    return 0;
}
</code>
</pre>

Just compile and run:

```
$ gcc -o zombie zombie.c
$ ./zombie
PID = 9174
PID = 0
```

To see that it is indeed a zombie process, let's use our old friend [`ps`]:

```
$ ps ax | grep Z
9174 pts/3    Z+     0:00 [zombie] <defunct>
```

To further illustrate, running `ps` with the child PID, it's clear that it is still shows the `./zombie` process as its parent and **not** PID 1, which is what it would be if the process was an orphan that had been adopted by `init`.

```
$ ps -o ppid= -p 9174
9173
```

In addition, since you're of course using a [terminal multiplexer] like [`tmux`] or [`GNU Screen`], you can open our old friend [`top`] in another shell before running the binary and observe the zombie process count increment.

Moreover, you can see the process tree when using our old friend [`pstree`]:

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

Lastly, let's take a look an example of the child process being re-parented (is that even a word?).  This situation occurs when the parent process exits before the child.  When this happens, the orphaned child becomes a child of the [`init`] process, which is PID 1, and it is then reaped by the OS.

`orphan.c`
<pre>
<code>
#include &lt;stdio.h&gt;
#include &lt;stdlib.h&gt;
#include &lt;sys/wait.h&gt;
#include &lt;unistd.h&gt;

int main() {
    pid_t pid;
    int status;

    if ((pid = fork()) < 0) {
        printf("Something went terribly wrong\n");
    }

    // Child process.
    if (pid == 0) {
        <span style="color: green;">sleep(30);</span>
        exit(0);
    }

    if (pid > 0) {
        exit(0);
    }

    return 0;
}
</code>
</pre>

Just compile and run:

```
$ gcc -o orphan orphan.c
$ ./orphan
PID = 19257
PID = 0
```

If we inspect the process tree, we'll see that the orphaned process has indeed been re-parented to the init process (on this particular Linux distribution - Ubuntu - the init process is [`systemd`]).

<pre class="math">
$ pstree -p 1
systemd(1)─┬─...
           ├─...
           ├─orphan(19257)
           ├─...
</pre>

As we'd expect, the orphaned process is directly below the root process.

Also, running `ps` with the child PID, it's clear that it has indeed been re-parented to PID 1.

```
$ ps -o ppid= -p 19257
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

