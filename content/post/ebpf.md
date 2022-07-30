+++
title = "On eBPF"
date = "2022-07-28T19:10:39Z"

+++

Berkeley Packet Filter, known today by the name [BPF], is an old technology that has been extended to achieve magic, as many of its supporters will unequivocally state.  As we'll see, this is not without merit.

I had first heard of this technology from an old [Linux Journal] article published way back in the mists of time.  I think it was the late 90s, although I didn't stumble across it until much later (unfortunately, I was unable to find a link).  If I recall, I was looking into ways of filtering raw link-layer packets in [user space], and BPF enabled early inspection of network traffic right off of the network card.

However, I was then distracted by a squirrel, and I never returned to the subject matter.

Recently, though, I have returned to the subject again after viewing a number of talks about the kernel technology, mostly by [Liz Rice].  I highly recommend [watching everything] that she does.

In a very real way, `eBPF` allows for an on-the-fly configurable kernel, and some have analogized it to the introduction of JavaScript in the browser.  Indeed, it does have the potential to change how we think about doing systems-based operations, not only the scope but the granularity, and there are already production-ready projects with tooling to assist in that.

Since the kernel controls the entire system, there is no better place from which to observe everything that is happening on the system, including networking functionality.  It is the keys to the kingdom.

Ok, enough dramatics.  Let's look at why `eBPF` has been dubbed a ["Linux superpower"] by people who put their pants on one leg at a time.

---

- [What is eBPF?](#what-is-ebpf)
- [How does eBPF work?](#how-does-ebpf-work)
- [Examples](#examples)
    + [bpftrace](#bpftrace)
    + [bcc](#bcc)
- [Summary](#summary)
- [References](#references)

---

## What is eBPF?

Starting with [a patch to the Linux 3.15 kernel] by Alexei Starovoitov in March 2014, what has become to be known as [`eBPF`] (extended BPF) was first added to Linux.  This was exciting and groundbreaking because it allowed, essentially, user space code to be run in the kernel to do a seemingly infinite amount of interesting tasks.

At a high level, `eBPF` is an in-kernel virtual machine that allows for running programmable user space code to do [observability], [instrumentation], security, network filtering (its initial use case), et al.  It has 10 64-bit registers that allow parameters to be passed to functions in `eBPF` virtual machine registers just like native hardware (CPUs).

There is a new [`bpf` system call] that allows for developers to register their `eBPF` program functions with events in the kernel at pre-defined hook points, and the kernel will run these programs when the events are triggered.

For example, you may be interested in tracking a file descriptor as it is used in I/O operations, or dropping network packets that seem suspicious, or monitoring for suspicious activity such as `chmod` syscalls, etc., and you have a nifty `eBPF` function that has been inserted into the kernel at the prescribed hook.  Then, anytime something happens on the machine that goes through the code paths in the kernel where the hooks are defined, the kernel will see if an `eBPF` program is registered, and, if so, it will call it.  You've just changed the world, bro!

Crucially, it is possible to store and access state using `eBPF` maps.  That is, both the `eBPF` program running in kernel space and the application running in user space have access to these maps that can retrieve information out of any of the many supported data structures.  The `eBPF` functionality also provides a system call for user space to access and write to this state.

Here is a partial list of the supported map data structure types:

- `BPF_MAP_TYPE_HASH`: a hash table
- `BPF_MAP_TYPE_ARRAY`: an array map, optimized for fast lookup speeds, often used for counters
- `BPF_MAP_TYPE_PROG_ARRAY`: an array of file descriptors corresponding to eBPF programs; used to implement jump tables and sub-programs to handle specific packet protocols
- `BPF_MAP_TYPE_PERCPU_ARRAY`: a per-CPU array, used to implement histograms of latency
- `BPF_MAP_TYPE_PERF_EVENT_ARRAY`: stores pointers to struct perf_event, used to read and store perf event counters
- `BPF_MAP_TYPE_LRU_HASH`: a hash table that only retains the most recently used items

It's also worth nothing that `eBPF` has helper functions.  This is good, because it will provide us with a stable API, which is much better than relying on kernel function names, as they can change with kernel versions.

> The original BPF is now referred to as classic BPF, or cBPF.  The newer extended BPF is now largely referred to as the non-acronym word "BPF".

## How does eBPF work?

> The following is how `eBPF` works from a developer's point-of-view, and it doesn't go into too much depth about its internal workings.  For a really good overview of `eBPF` internals, see Brendan Gregg's talk on [BPF Internals].

So, I've briefly described what `eBPF` is and why it's quite possibly [the Bee's Knees].  Now, I'll touch on how you, as presumably someone with 46 chromosomes, can put this to good use.

Most developers, of course, work in user space.  And how do user space applications interact with the kernel?  Through [system calls], of course.  Many high-level languages abstract these syscalls from the developer, but they're still used under the covers.  And just as these high-level languages do, there are `eBPF` tools that have also abstracted away the `eBPF` syscalls so that we don't have to worry about them as we write our programs.

> For example, loading the program and associating the program with the trace point is something that has to be done in user space, and these tools will do that for you.

So, how does one get their `eBPF` program into kernel space?  Essentially, you write a restricted C program and then a compiler toolchain like [`LLVM`] compiles it to `eBPF` bytecode (i.e, [`Clang`] frontend to the `LLVM` backend).  There are also tools that let you embed your restricted C code in a higher-level language, as we'll see in the [Examples](#examples) section.

> Why a "restricted" C program?  Because there are certain things that the verifier running in the kernel will check for and not allow you to do, such as write code paths that don't exit.  The kernel will not allow a user-defined `eBPF` program to hang or crash the kernel.

Once the `eBPF` program is inserted into the kernel by calling the `bpf` syscall, it is verified by the kernel to ensure it's safe using static analysis (after all, injecting user space code into kernel space is fraught with danger) and then [JIT compiled] from the intermediary `eBPF` bytecode to the machine specific instruction set, so it runs as fast as natively-compiled kernel code and [kernel modules].

So, when are the `eBPF` function called?  Well, `eBPF` is event-driven and are run when these events occur, such as when the following hooks are encountered:

- system calls
- function entry/exit
- kernel tracepoints
- network events

If a predefined hook doesn't exist for a particular kernel function, it is still possible to create a kernel probe ([`kprobe`] and `kretprobe`) or user probe (`uprobe`) to be called at a function's entry point in kernel and user applications, respectively.

And, as previously mentioned, user space can get information from kernel space about the particular things that it's interested in and have captured, through the use of the `eBPF` maps key/value data structure (by commands that can create and modify these `eBPF` maps).

Another great thing is the machine does not need to be restarted once the code is injected into the kernel.  The `eBPF` program will start working immediately!

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## Examples

### bpftrace

Here is an easy one-line example using [`bpftrace`], taken from the [`README`] and used for explication in a great Liz Rice talk entitled [A Beginner's Guide to eBPF Programming with Go].

It runs a script when any process on the machine makes a system call.  Note that it blocks and only quits by sending the [`SIGINT`] interrupt signal (Control-C) to the process:

```
$ sudo bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'
Attaching 1 probe...
^C

@[rpcbind]: 1
@[StreamT~ns #372]: 2
@[wpa_supplicant]: 2
@[Cache2 I/O]: 3
@[rs:main Q:Reg]: 6
@[Renderer]: 6
@[in:imuxsock]: 6
@[auditd]: 7
@[sudo]: 7
@[rtkit-daemon]: 8
@[tracker-miner-f]: 8
@[IndexedDB #297]: 9
@[Xorg:gdrv0]: 9
@[packagekitd]: 11
@[Compositor]: 12
@[StreamTrans #21]: 13
@[MediaTimer #1]: 13
@[gvfs-afc-volume]: 13
@[MediaSu~isor #6]: 13
@[dockerd]: 13
@[MediaSu~isor #8]: 13
@[URL Classifier]: 14
@[StreamTrans #22]: 14
...
```

### bcc

> Make sure that your kernel [satisfies the requirements] set by the [`bcc`] project.

Here is [a "Hello, World!" example] taken from the [`bcc`] project.  It provides Python bindings and allows you to embed the C code directly into the program:

```
#!/usr/bin/python
#
# This is a Hello World example that formats output as fields.

from bcc import BPF
from bcc.utils import printb

# define BPF program
prog = """
int hello(void *ctx) {
    bpf_trace_printk("Hello, World!\\n");
    return 0;
}
"""

# load BPF program
b = BPF(text=prog)
b.attach_kprobe(event=b.get_syscall_fnname("clone"), fn_name="hello")

# header
print("%-18s %-16s %-6s %s" % ("TIME(s)", "COMM", "PID", "MESSAGE"))

# format output
while 1:
    try:
        (task, pid, cpu, flags, ts, msg) = b.trace_fields()
    except ValueError:
        continue
    except KeyboardInterrupt:
        exit()
    printb(b"%-18.9f %-16s %-6d %s" % (ts, task, pid, msg))

```

`chmod` that little sucker and run it with escalated privileges because it's inserted code into the kernel.  Again, note that it blocks and only quits by sending the [`SIGINT`] interrupt signal (Control-C) to the process:

```
(ebpf) $ chmod 700 main.py
(ebpf) $ sudo ./main.py
TIME(s)            COMM             PID    MESSAGE
78444.455829000    tmux: server     2390   Hello, World!
78444.458999000    tmux: server     2390   Hello, World!
78444.460851000    sh               302895 Hello, World!
78444.460934000    tmux: server     2390   Hello, World!
78444.461730000    sh               302896 Hello, World!
78444.462156000    bash             302897 Hello, World!
78444.462440000    bash             302900 Hello, World!
78444.462787000    sh               302898 Hello, World!
78444.463126000    bash             302899 Hello, World!
78444.463452000    bash             302903 Hello, World!
78444.463928000    bash             302897 Hello, World!
...
```
> You're gonna want to create a [Python virtual environment] before downloading any dependencies and running that script, player.

If you get an error similar to the following, it means that you need to install the `bcc` tools on your machine:

```
Traceback (most recent call last):
  File "./main.py", line 9, in <module>
    from bcc import BPF
ModuleNotFoundError: No module named 'bcc'
$
$ sudo apt-get install bpfcc-tools linux-headers-$(uname -r)
```

## Summary

This article serves as a general overview of `eBPF` and hopefully has provided the reader with an understanding of not only what it is but how powerful it can be.

There are other very good reasons to check out this technology.  Here are some of them:

- The injected program immediately effects all running containers that share the same kernel.
- Writing an `eBPF` program is easier than writing a kernel module (and safer).
- You can modify/patch your kernel immediately without having to wait until the change is in the Linux kernel and then into your Linux distribution, which could literally take years.

> Of course, there are other projects that I haven't mentioned but are definitely worth investigating, such as [Cilium].

## References

- [eBPF site](https://ebpf.io/)
- [A thorough introduction to eBPF](https://lwn.net/Articles/740157/)
- [Awesome eBPF - A curated list of awesome projects related to eBPF.](https://github.com/zoidbergwill/awesome-ebpf)

[BPF]: https://en.wikipedia.org/wiki/Berkeley_Packet_Filter
[Linux Journal]: https://www.linuxjournal.com/
[user space]: https://en.wikipedia.org/wiki/User_space_and_kernel_space
[Liz Rice]: https://www.lizrice.com/
[watching everything]: https://www.youtube.com/results?search_query=liz+rice
[a patch to the Linux 3.15 kernel]: https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/commit/?id=bd4cf0ed331a275e9bf5a49e6d0fd55dffc551b8
[`eBPF`]: https://prototype-kernel.readthedocs.io/en/latest/bpf/
["Linux superpower"]: https://www.brendangregg.com/blog/2016-03-05/linux-bpf-superpowers.html
[observability]: https://en.wikipedia.org/wiki/Observability
[instrumentation]: https://en.wikipedia.org/wiki/Instrumentation_(computer_programming)
[`bpf` system call]: https://man7.org/linux/man-pages/man2/bpf.2.html
[BPF Internals]: https://www.youtube.com/watch?v=_5Z2AU7QTH4
[the Bee's Knees]: https://en.wikipedia.org/wiki/Bee%27s_Knees
[system calls]: https://en.wikipedia.org/wiki/System_call
[`LLVM`]: https://en.wikipedia.org/wiki/LLVM
[`Clang`]: https://en.wikipedia.org/wiki/Clang
[`kprobe`]: https://docs.kernel.org/trace/kprobes.html
[JIT compiled]: https://en.wikipedia.org/wiki/Just-in-time_compilation
[kernel modules]: https://en.wikipedia.org/wiki/Loadable_kernel_module
[`bpftrace`]: https://bpftrace.org/
[`README`]: https://github.com/iovisor/bpftrace/blob/master/docs/tutorial_one_liners.md#lesson-4-syscall-counts-by-process
[A Beginner's Guide to eBPF Programming with Go]: https://www.youtube.com/watch?v=uBqRv8bDroc
[`SIGINT`]: https://en.wikipedia.org/wiki/Signal_(IPC)#SIGINT
[satisfies the requirements]: https://github.com/iovisor/bcc/blob/master/INSTALL.md#kernel-configuration
[`bcc`]: https://github.com/iovisor/bcc
[a "Hello, World!" example]: https://github.com/iovisor/bcc/blob/master/examples/tracing/hello_fields.py
[Python virtual environment]: /2021/04/01/on-virtualenv/
[Cilium]: https://cilium.io/

