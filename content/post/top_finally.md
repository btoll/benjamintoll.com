+++
title = "On Top, Finally"
date = "2021-04-15T13:16:46-04:00"

+++

[`top`] is a beautiful little tool to display the system processes that I use quite often to afford me a glimpse into how two important system resources are being used: CPU and memory.

I think most developers are familiar with the `top` command as one of a handful of Unix commands that everyone knows.  Usually, it's invoked and watched as it dynamically updates every few seconds, and that is usually enough of a view to get an idea of what is consuming system resources and what possibly needs to be [`kill`]ed.  To be honest, this is what I do many times, as well.

In this little post, I'm going to quickly cover the ways that I use it the most.

Andiamo!

---

All of the following are entered interactively (after entering the `top` command):

1. Sorting:
    + By default, `top` sorts by CPU usage.  To sort by memory, press `M`.
    + Press `P` to reset back to CPU usage.
    + Press `O` to choose the column to sort.
    + To toggle through the headers, press `<` or `>`, although it can be difficult to tell which column has been sorted!

1. Press `k` to kill a process.

1. Press `1` to display all CPUs in the header.  Press again to revert.

1. Press `c` to display absolute path of the command.  Press again to revert.

1. Press `n` to limit the number of processes displayed (analogous to [`head`]).

1. Press `W` to write the current configuration to `$HOME/.toprc`.  For instance:
    + Open `top`.
    + Press `M` to sort by memory.
    + Press `n` then `20` to only display 20 processes at a time.
    + Press `W` to save.
    + Open `top` again to see that it's saved the configuration.

    ( To revert, either save a different configuration or remove the `$HEAD/.toprc` file. )

        $ cat ~/.toprc
        top's Config File (Linux processes with windows)
        Id:i, Mode_altscr=0, Mode_irixps=1, Delay_time=3.0, Curwin=0
        Def     fieldscur=ķ')*+,-./012568<>?ABCFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghij
                winflags=193844, sortindx=21, maxtasks=20, graph_cpus=0, graph_mems=0
                summclr=1, msgsclr=1, headclr=3, taskclr=1
        Job     fieldscur=(Ļ@<*+,-./012568>?ABCFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghij
                winflags=193844, sortindx=0, maxtasks=0, graph_cpus=0, graph_mems=0
                summclr=6, msgsclr=6, headclr=7, taskclr=6
        Mem     fieldscur=<MBN34'()*+,-./0125689FGHIJKLOPQRSTUVWXYZ[\]^_`abcdefghij
                winflags=193844, sortindx=21, maxtasks=0, graph_cpus=0, graph_mems=0
                summclr=5, msgsclr=5, headclr=4, taskclr=5
        Usr     fieldscur=)+,-./1234568;<=>?@ABCFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghij
                winflags=193844, sortindx=3, maxtasks=0, graph_cpus=0, graph_mems=0
                summclr=3, msgsclr=3, headclr=2, taskclr=3
        Fixed_widest=0, Summ_mscale=0, Task_mscale=0, Zero_suppress=0

> Ok, to be honest, I don't really use that last one, but it's useful to know.

Also, the header information in `top` is really useful for the following reasons:

1. See the load average over 1, 5 and 15 minute periods.
1. See the number of processes that are running and sleeping.
1. See the number of [zombie processes], if any.
1. See the percentage of CPU of idle processes and processes that are waiting, such as waiting on I/O to complete before resuming.
1. See the total amount of system memory, including RAM, swap and disk caching.

[`top`]: https://www.man7.org/linux/man-pages/man1/top.1.html
[`kill`]: https://www.man7.org/linux/man-pages/man1/kill.1.html
[`head`]: https://www.man7.org/linux/man-pages/man1/head.1.html
[zombie processes]: /2021/03/17/on-creating-a-zombie-process/

