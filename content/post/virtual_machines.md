+++
title = "On Virtual Machines"
date = "2022-08-12T22:24:29Z"

+++

I remember the first time I heard of [virtual machines] and [hypervisors].  It was way back in the naughties around 2003 or 2004, and I remember thinking something along the lines of: "What kind of magic is this?"

At that time and even now, I feel that virtual machines and [virtualization] in general are technologies that people use all the time without having to know the slightest thing about what it is and how it's done.  In fact, many times we don't even know that we're operating in a virtualized environment.

And I think that's peachy.  There's nothing wrong with that.  It's impossible to know everything about every layer of technology.  It's easy to build a mental model around what a virtual machine is and the benefits it provides, and that's usually enough.

However, once you start doing anything serious with [containers] and [OS-level virtualization] that all changes.  At least, that has been my experience.

Why?  In a containerized world, it's extremely helpful, necessary even, to know what the differences are and the security implications of running a process in a container versus a virtual machine.  (There are other reasons to want to dig into how virtual machines work, of course, but this was the impetus for me.)

That's a big subject, and in order to be able to speak cogently and confidently about it, you have to know a fair bit about the Linux kernel.

- [Glossary](#glossary)
    + [CPU Modes](#cpu-modes)
    + [Privilege Rings](#privilege-rings)
    + [User Space and Kernel Space](#user-space-and-kernel-space)
    + [System Calls](#system-calls)
- [Virtual Machines](#virtual-machines)
    + [Virtualization Methods](#virtualization-methods)
        - [Trap-and-Emulate](#trap-and-emulate)
        - [Binary Translation](#binary-translation)
        - [Paravirtualization](#paravirtualization)
- [Summary](#summary)
- [References](#references)

There are a lot of similarities between these concepts, and many of them overlap.  I'm going to briefly (superficially) define these terms so that we have proper working definitions in order to construct the necessary mental model for the how a virtual machine works.

## Glossary

### CPU Modes

[CPU modes], also called processor modes, are CPU operating modes and exemplify the security model of the system..  The most common two are kernel mode and user mode.  The modes place restrictions on processes and determine the type and scope of allowable operations.  For instance, it allows the kernel to run at a higher privilege level than any application.  User mode requests the kernel to perform privileged operations on its behalf via [system calls].

There can also be modes other than the aformentioned kernel and user modes.  For instance, central processing units that support [hardware-assisted virtualization] run at privilege level -1 (more privileged than level 0) and the guest kernels run at 0.  This effectuates a third mode when running one or more virtual machines managed by a hypervisor.

Kernel mode is also referred to as privileged mode or supervisor mode and user mode as restricted mode, et al.

Modes are usually defined by the type of operations that are permitted.  Kernel mode can perform anything that is allowed by its architecture, which in effect allows any instruction, and user mode is going to be a restricted subset of those operations.

For instance, user mode cannot access any memory other than a limited view (its [virtual memory]) and it cannot perform any I/O.

Usually, moving from one mode to another necessitates a [context switch].  In addition, modes are said to have ring-based security based on their architectures (like Intel), and we'll look at that next.

### Privilege Rings

Privilege rings, also known as protection rings, are concentric circles of privilege from 0 (most privileged) to 3 (least privileged).  Ring 0, for example, allows for direct access of the hardware on the machine.  This is the level in which the kernel and device drivers run.  Ring 3 is for user mode applications.

![Privilege Rings](/images/privilege_rings.jpg)

The privilege rings are [hardware enforced].

### User Space and Kernel Space

Conceptually, [user space and kernel space] is a way for an operation system to segregate virtual memory.  Kernel space refers to the execution of privileged instructions, like the kernel itself, device drivers, [eBPF programs], etc., and the user space (or userland) is where user application programs are executed like web browsers, shells, editors, [`libc`], etc.

Importantly, the separation of kernel space from user space allows for memory protection.

How does user space interface with kernel space?  Through the system call API.  We look at system calls next.

### System Calls

As just mentioned, user space processes request services on behalf of the kernel through system calls (syscalls).  These are requests for file management, process control, communication, et al.

> For most operating systems, syscalls are only made from user space processes.

The userland process, restricted to its own virtual address space, cannot access or modify other processes or the kernel itself.  In addition, anything running in user mode is prevented from directly accessing the machine hardware and must rely on this system call interface to ask the kernel to perform the task.

The end result is a mode switch from restricted (user) to unrestricted (kernel) mode.  Control is passed to the kernel which, running at the highest privilege (ring 0), checks to ensure that the process is allowed to make the syscall, and then directly accesses the hardware and performs the operation on behalf of the userland process.  Control is then returned to the calling program.

As noted, system calls necessitate a mode context switch, but it is **not** a *process* context switch.  Instead, it's a *privilege* context switch.  The hardware's view of the world (execution mode, i.e., user or kernel) is established by the state of the processor [status register], and the register is changed to facilitate the privilege context switching.

Most programming languages have libraries that hide the details of system calls from the developer.  For instance, a higher-level programming language like Python or Go would have APIs that wrap the actual lower-level call through to the underlying C library.

For example, a common way in Go to open a file on the filesystem is with the [`os.Open`] library call.  If you were to follow this down the rabbit hole, you will eventually come to the [`RawSyscall6`] stub, where, according to the comment above it, declares that this function is linked to particular OS file in [`runtime/internal/syscall`] and finally [the Assembly] for the particular machine architecture (in my case, `amd64`) that finally calls the `libc` (or possibly `glibc`) syscall interface API.


> Examples of common syscalls are `open`, `read`, `write`, `close`, `wait`, `exec`, `fork`, `exit`, and `kill`.  View the man page for more information about each one:
>
>     $ man 2 open
>

In my opinion, the key thing to understand about how system calls work is that it generates a software interrupt, or trap, that initiates the privilege context switch.  The trap tells the processor to jump to a well-known address based on the trap's parameter, which is an interrupt number.  This number is a lookup into the [interrupt vector table], which is a data structure that maps these well-known interrupt numbers with a location in memory to a callback that will handle the trap.

To summarize, making a system call uses the trap mechanism to (mode) switch to a well-defined point in the kernel, which then runs all the instructions in kernel mode.

## Virtual Machines

Virtual machines have been around a long time.  IBM built research mainframes in the 1960's that allowed for full virtualization, and once Intel and AMD introduced the hardware extensions into their chips in 2005 and 2006, respectively, that they really took off as a prolific tool in every developer's toolbox.

> For early examples of computers capable of running virtual machine the IBM [CP-40] and the IBM [SIMMON] hypervisor.

Let's look at some different methods to virtualize the guest operating systems that are monitored by the hypervisor.

## Virtualization Methods

### Trap-and-Emulate

The implementation style of [trap-and-emulate] became the prevalent method, although there were others.  Some researchers have referred to this as [the classical style of virtualization].

The fundamental idea behind trap-and-emulate is that the VMM will allow as many non-privileged system calls from the guest OS through as possible (that is, it allows the guest OS to perform these actions directly without intervention from the VMM), and only to emulate the ones that are privileged and legal.  If illegal, the hypervisor will terminate the operation.  This emulation is the behavior that the guest OS expects from the hardware.

However, there are problems trapping some syscalls from some chipsets such as `x86` before the advent of hardware-assisted virtualization that made full virtualization verify difficult or impratical.

What was the issue?  It had to do with traps (interrupts), or rather, the lack of trapping.  A trap never occurred, so the VMM would not have known about it.  The end result was there was no emulation.

Let's take a look at two different methods that addressed this difficulty.

### Binary Translation

With [binary translation], the VMM scans the input instruction stream for privileged instructions (i.e., instructions that cannot be trapped because they are ignored) and replaces them with traps that the VMM can intercept.

### Paravirtualization

## Summary

## References

- [Operating System Concepts](https://people.cs.rutgers.edu/~pxk/416/notes/03-concepts.html)
- [Virtualization](https://people.cs.rutgers.edu/~pxk/416/notes/20-vm.html)
- [A Comparison of Software and Hardware Techniques for x86 Virtualization](https://www.vmware.com/pdf/asplos235_adams.pdf)
- [Container Security](https://containersecurity.tech/)

---

Questions:

- Can a virtualized environment know that it's virtualized?
- What bit is set when modes are changed?

[hypervisors]: https://en.wikipedia.org/wiki/Hypervisor
[virtual machines]: https://en.wikipedia.org/wiki/Virtual_machine
[virtualization]: https://en.wikipedia.org/wiki/Virtualization
[containers]: https://en.wikipedia.org/wiki/Containerization_(computing)
[OS-level virtualization]: https://en.wikipedia.org/wiki/OS-level_virtualization
[CPU modes]: https://en.wikipedia.org/wiki/CPU_modes
[system calls]: https://en.wikipedia.org/wiki/System_call
[hardware-assisted virtualization]: https://en.wikipedia.org/wiki/Hardware-assisted_virtualization
[virtual memory]: https://en.wikipedia.org/wiki/Virtual_memory
[context switch]: https://en.wikipedia.org/wiki/Context_switch
[hardware enforced]: https://en.wikipedia.org/wiki/Status_register
[status register]: https://en.wikipedia.org/wiki/Status_register
[user space and kernel space]: https://en.wikipedia.org/wiki/User_space_and_kernel_space
[eBPF programs]: /2022/07/28/on-ebpf/
[`libc`]: https://en.wikipedia.org/wiki/C_standard_library
[`os.Open`]: https://pkg.go.dev/syscall#Open
[`RawSyscall6`]: https://github.com/golang/go/blob/master/src/syscall/syscall_linux.go
[`runtime/internal/syscall`]: https://github.com/golang/go/blob/master/src/runtime/internal/syscall/syscall_linux.go
[the Assembly]: https://github.com/golang/go/blob/master/src/runtime/internal/syscall/asm_linux_amd64.s
[interrupt vector table]: https://en.wikipedia.org/wiki/Interrupt_vector_table
[CP-40]: https://en.wikipedia.org/wiki/IBM_CP-40
[SIMMON]: https://en.wikipedia.org/wiki/SIMMON
[trap-and-emulate]: https://stackoverflow.com/questions/20388156/what-is-meant-by-trap-and-emulate-virtualization
[the classical style of virtualization]: https://www.vmware.com/pdf/asplos235_adams.pdf
[binary translation]: https://en.wikipedia.org/wiki/Binary_translation

