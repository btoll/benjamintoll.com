+++
title = "On Debugging with GDB"
date = "2018-05-19T18:35:14-04:00"

+++

There is nothing cooler than debugging a program using [`GDB`].  For real.  Inspecting memory addresses, disassembling the machine code into assembly, seeing how the stack frames are generated... what's not to like?

Knowing how a program works at the lowest levels is invaluable and will make you a better programmer.  It has greatly improved my understanding of C and systems programming, and understanding how memory works and is laid out opens the door to understanding how hacking truly works.  It is an art, and I'm in awe at the cleverness of hackers and their ingenuity.  Hackers are rightfully to be held in high-esteem!

This is a long post, and at the end of it you will be comfortable using `GDB` to inspect raw memory.  You'll also learn how a stack frame is generated.  Let's get started.

> ### Important!  Read this!  Now!
>
> Note that the x86 64-bit architecture mandates an area known as the [red zone] for leaf functions (functions that don't call another function).  One of the advantages of this is that the stack pointer doesn't need to be modified in the function prologue and epilogue (you can verify this by inspecting both the frame pointer and the stack pointer in the callee and verifying that they both point to the same address).
>
> Since the stack frame inspected in this post is indeed a leaf function, the stack frame won't be adjusted and all offsets are from the base pointer.  This default behavior [can be changed] by using the `-mno-red-zone` flag when compiling, however.
>
> Chances are that the stack frame will be constructed differently depending on your architecture, so always refer to its ABI.

I'm going to work with a very basic and contrived example just to keep things simple.  The objective is to be able to clearly see how the compiler constructs the stack frame, and how you can use the `rbp` (base pointer) CPU register to find the values of the variables using offsets.

> Registers, if you recall, are data storage locations directly on the CPU, and can be thought of as variables.  Their size or width determines the system's architecture, i.e., a 64-bit CPU will have 64 bit registers.

Here is the code:

```c
void foo(int a, int b, char c, char d) {
    int eleet;
    char buf[10];

    eleet = 31337;
    buf[0] = 'C';
    buf[1] = 'A';
    buf[2] = 'T';
}

int main(void) {
    foo(1, 2, 'a', 'b');
}
```

The first thing is to compile the program [with debugging support]:

```bash
$ gcc -ggdb3 stack_example.c -o stack_example
```

Alternatively, you could do:

```bash
$ CFLAGS="-ggdb3" make stack_example
```

which runs:

```bash
cc -ggdb3 stack_example.c -o stack_example
```

Note that `cc` is symlinked to `gcc`.

> The `-ggdb3` switch provides the most debugging information possible.  The switch is an aggregation of `-ggdb`, which builds for `GDB` using the most expressive format available ([DWARF], [stabs], or falls back to native format if neither is supported), and `-g3`, which is the fourth and highest level of debugging information (zero-based).

Here is the stack in relation to the other memory segments:

```
  Low addresses  ----------------------------------
		 |				  |
		 |	 Text (code) segment	  |
		 |				  |
		 ----------------------------------
		 |				  |
		 |       Data segment		  |
		 |				  |
		 ----------------------------------
		 |				  |
		 | 	 bss segment		  |
		 |				  |
		 ----------------------------------
		 |				  |
		 |	 Heap segment		  |
		 |				  |
		 |	 	The heap grows	  |
		 |	    	   down toward    |
		 |	         higher memory    |
		 |	     	    addresses.    |
		 |				  |
		 |				  |
		 |	       The stack grows    |
		 |	       up toward lower    |
		 |	     memory addresses.    |
		 |				  |
		 |	Stack segment		  |
		 |				  |
  High addresses ----------------------------------
```

Then, launch `GDB` with the produced executable (use `-q` for quiet output if it prints the welcome banner):

```bash
$ gdb stack_example
Reading symbols from stack_example...done.
(gdb)
```

You can view the code by using the `list` or `l` command:

```gdb
(gdb) l
1       void foo(int a, int b, char c, char d) {
2           int eleet;
3           char buf[10];
4
5           eleet = 31337;
6           buf[0] = 'C';
7           buf[1] = 'A';
8           buf[2] = 'T';
9       }
10
(gdb)
11      int main(void) {
12          foo(1, 2, 'a', 'b');
13      }
14
(gdb)
```

Let's get started by seeing the disassembly of the `main` function:

```gdb
(gdb) disass main
Dump of assembler code for function main:
   0x0000555555554688 <+0>:     push   rbp		(1) Function prologue.
   0x0000555555554689 <+1>:     mov    rbp,rsp
   0x000055555555468c <+4>:     mov    ecx,0x62		(2) b
   0x0000555555554691 <+9>:     mov    edx,0x61		(2) a
   0x0000555555554696 <+14>:    mov    esi,0x2		(2) 2
   0x000055555555469b <+19>:    mov    edi,0x1		(2) 1
   0x00005555555546a0 <+24>:    call   0x660 <foo>	(3) Calls foo().
   0x00005555555546a5 <+29>:    mov    eax,0x0		(3) Pushes return value into `eax` register.
   0x00005555555546aa <+34>:    pop    rbp		(4) Function epilogue.
   0x00005555555546ab <+35>:    ret
End of assembler dump.
(gdb)
```

> The GNU assembler is using Intel syntax here rather than the default AT&T.  Instead of setting the syntax every time I run `GDB`, I put the directive in my [.gdbinit] file.

We can see several things of interest here:

1. The [function prologue] pushes the current base pointer onto the stack (known as the [frame pointer] in the new stack frame) so that later it can be restored and assigns the value of the stack pointer (top of stack) to be the new base pointer.  This allows for a new stack frame to be created on top of the old one.
2. The compiler is moving the function arguments into general purpose registers (this will be architecture-dependent, consult the ABI!).
3. The call to the `foo` function.  This will push the memory address of the next instruction onto the newly-generated stack frame as the return address to allow the compiler to unwind the stack back to the current one.  Here, the address is `0x00005555555546a5`.
4. The [function epilogue] restores the current stack frame by popping the old frame off of the stack and freeing its memory that was allocated in the prologue.

Let's set a couple of breakpoints (`b` or `break`) and start inspecting the program.  The first will be set in the `main` function before the call to `foo`, and the second will be set in `foo` directly after the function prologue.

```gdb
(gdb) b 12
Breakpoint 1 at 0x68c: file stack_example.c, line 12.
(gdb) b foo
Breakpoint 2 at 0x672: file stack_example.c, line 5.
(gdb)
```
To view all the breakpoints (`info break` or just `i b`):

```gdb
(gdb) i b
Num     Type           Disp Enb Address            What
1       breakpoint     keep y   0x000055555555468c in main at stack_example.c:12
2       breakpoint     keep y   0x0000555555554672 in foo at stack_example.c:5
(gdb)
```

Now we can run the program by typing `run` or `r` at the prompt:

```gdb
(gdb) r
Starting program: /home/btoll/sandbox/c/hacking_the_art_of_exploitation/stack_example

Breakpoint 1, main () at stack_example.c:12
12          foo(1, 2, 'a', 'b');
(gdb)
```

This will halt the execution of the program where we've set the first breakpoint.  We'll take note of the current position of the base pointer and shortly see its importance (`i r` is shorthand for `info register`):


```gdb
(gdb) i r rbp
rbp            0x7fffffffe0f0   0x7fffffffe0f0
(gdb) x $rbp
0x7fffffffe0f0: 0x555546b0
(gdb) p $rbp
$1 = (void *) 0x7fffffffe0f0
(gdb)

```

The last command is shorthand for `print $rbp` which will save the value (a pointer, in this case) to the variable `$1`.  This will come in handy later when we're inspecting the `foo` stack frame.

And then execute the next four instructions so that the instruction pointer is right before the call to `foo`:

```gdb
(gdb) nexti 4
0x00005555555546a0      12          foo(1, 2, 'a', 'b');
(gdb) x/i $rip
=> 0x5555555546a0 <main+24>:    call   0x555555554660 <foo>
(gdb)
```

Let's inspect the values of the four CPU registers where the compiler moved `foo`'s function parameters:

```gdb
(gdb) i r ecx edx esi edi
ecx            0x62     98
edx            0x61     97
esi            0x2      2
edi            0x1      1
(gdb)
```

> If you need a refresher on x86 syntax, see the primer at the end of the post.

Now, let's move on and continue to the next breakpoint (`continue`, `cont` or `c`).  Note that by doing so, the `foo` function will be called and the return value that we discussed before is pushed onto the new stack frame.  This is important, for it allows the stack to unwind and get back to its previous state when the new stack frame is popped off of the stack:

```gdb
(gdb) c
Continuing.

Breakpoint 2, foo (a=1, b=2, c=97 'a', d=98 'b') at stack_example.c:5
5           eleet = 31337;
(gdb)
```

Now that we're in the `foo` function, we can start looking at its stack frame.  Let's print out the top of the stack down into the `main` stack frame:

```gdb
(gdb) x/16xw $rbp-32
0x7fffffffe0a0: 0x00000062      0x00000061      0x00000002      0x00000001
0x7fffffffe0b0: 0x555546b0      0x00005555      0x55554530      0x00005555
0x7fffffffe0c0: 0xffffe0d0      0x00007fff      0x555546a5      0x00005555
0x7fffffffe0d0: 0x555546b0      0x00005555      0xf7a5a2e1      0x00007fff
(gdb)
```

Here we can already see that the `foo` function parameters are already in the stack frame starting at memory address `0x7fffffffe0a0` (we'll see why shortly when inspecting the assembly code):

```gdb
(gdb) x/xw 0x7fffffffe0a0
0x7fffffffe0a0: 0x00000062
(gdb) x/xw 0x7fffffffe0a4
0x7fffffffe0a4: 0x00000061
(gdb) x/xw 0x7fffffffe0a8
0x7fffffffe0a8: 0x00000002
(gdb) x/xw 0x7fffffffe0ac
0x7fffffffe0ac: 0x00000001
(gdb)
```

You can also examine them by name (note the use of the  `address-of` operator):

```gdb
(gdb) x &a
0x7fffffffe0ac: 0x00000001
(gdb) x &d
0x7fffffffe0a0: 0x00000062
(gdb)
```

> You can use tab completion in `GDB` for known symbols.

You can also see the same memory addresses pointing to the contents of `a` and `d` by getting their offsets from the base pointer register (again, see below for an explanation of why):

```gdb
(gdb) x $rbp-20
0x7fffffffe0ac: 0x00000001
(gdb) x $rbp-32
0x7fffffffe0a0: 0x00000062
(gdb)

```

Moving past the function arguments, we can see 32 bytes that the compiler has allocated for the local function variables, followed by the frame pointer and the return address.  Below are the latter two.

```gdb
(gdb) x/xw 0x00007fffffffe0d0
0x7fffffffe0d0: 0x555546b0
(gdb) x/xw 0x00005555555546a5
0x5555555546a5 <main+29>:       0x000000b8
(gdb) x/i 0x00005555555546a5
   0x5555555546a5 <main+29>:    mov    eax,0x0
(gdb)
```

If at first you don't see them in the dump from above, that's because they are in little endian byte order, which is how values are stored in x86 architecture.  More on [endianness] later.

Let's pause for a moment to understand a very important and fundamental aspect about the stack.  As the ascii art shows above, the stack grows up as it increases towards the lower memory address.  So, to access any of the stack's variables, we must *subtract* from the current base pointer to access the memory.  Although this is counter-intuitive, it's imperative to understand this in order to find anything that you're interested in on the stack.

Now, how did I know the exact byte offsets with which to subtract from `rbp` in some of the preceding examples?  By disassembling the `foo` function!  Check out the offsets from the `rbp` register in the assembly code:

```gdb
(gdb) disass foo
Dump of assembler code for function foo:
   0x0000555555554660 <+0>:     push   rbp
   0x0000555555554661 <+1>:     mov    rbp,rsp
   0x0000555555554664 <+4>:     mov    DWORD PTR [rbp-0x14],edi
   0x0000555555554667 <+7>:     mov    DWORD PTR [rbp-0x18],esi
   0x000055555555466a <+10>:    mov    eax,ecx
   0x000055555555466c <+12>:    mov    BYTE PTR [rbp-0x1c],dl
   0x000055555555466f <+15>:    mov    BYTE PTR [rbp-0x20],al
=> 0x0000555555554672 <+18>:    mov    DWORD PTR [rbp-0x4],0x7a69
   0x0000555555554679 <+25>:    mov    BYTE PTR [rbp-0xe],0x43
   0x000055555555467d <+29>:    mov    BYTE PTR [rbp-0xd],0x41
   0x0000555555554681 <+33>:    mov    BYTE PTR [rbp-0xc],0x54
   0x0000555555554685 <+37>:    nop
   0x0000555555554686 <+38>:    pop    rbp
   0x0000555555554687 <+39>:    ret
End of assembler dump.
(gdb)
```

By the way, it's easy to forget the code we're currently debugging, and there are several options to refresh your memory about where you are in the program.

To view the code:

```gdb
(gdb) l foo
1       void foo(int a, int b, char c, char d) {
2           int eleet;
3           char buf[10];
4
5           eleet = 31337;
6           buf[0] = 'C';
7           buf[1] = 'A';
8           buf[2] = 'T';
9       }
10
(gdb)
```

To view the current frame (`frame` or `f`):

```gdb
(gdb) f
#0  foo (a=1, b=2, c=97 'a', d=98 'b') at stack_example.c:5
5           eleet = 31337;
(gdb)

```

To view the stack frames (`backtrace` or `bt`):

```gdb
(gdb) bt
#0  foo (a=1, b=2, c=97 'a', d=98 'b') at stack_example.c:5
#1  0x00005555555546a5 in main () at stack_example.c:12
(gdb)
```

You can also jump to different frames, but that is beyond the scope of this post.  See `help` for a list of everything you can do.

Back to the assembly code.  Beginning with the first move assignment (`mov    DWORD PTR [rbp-0x14],edi`), we see the compiler building the current stack frame by moving the values of the registers into memory offset from the current base pointer.  Again, since the memory grows upward toward the heap and the other memory segments, the offsets are subtracted from the `rbp` register.  The `DWORD PTR` designation is like a formatter that is instructing the compiler that the memory will point to a 32-bit value (recall that a `word` is four bytes).

But wait, what are the `dl` and `al` registers?  We're seeing them for the first time.  They are 8-bit registers that the compiler used to hold the 8-bit `char` values, `a` and `b`.  The `BYTE PTR` designation simply tells the compiler that the value being written to the memory address at `rbp-0x1c` is an 8-bit value.

The first memory assignment will be the value of the `a` variable.  Since the value is in hex, we do a conversion and come up with the number 20 in base-10, which is the number of bytes that the `a` function variable is from the base pointer.  To see the rest of the arguments, keep adding 4 to the offset.  This makes sense, since `int`s are 32 bits, and it seems that the 8-bit `char`s have been padded.

We can tell where the debugger halted in the function by the arrow in the first column.  It's currently sitting at line 5 in the `foo` function, and it's about to assign the value of 31337 to the `eleet` variable.  If we inspect the memory that the variable is currently pointing to, we see it's just random noise:

```gdb
(gdb) x/xw $rbp-4
0x7fffffffe0bc: 0x00005555
(gdb)
```

If we step to the next instruction and again inspect the contents of the `0x7fffffffe0bc` memory address, we see that the value of 0x7a69 has indeed been assigned to the `eleet` variable.  We can confirm this by examining the 4-byte offset from the `rbp` register and by the memory address of the variable itself.

```gdb
(gdb) nexti
6           buf[0] = 'C';
(gdb) x/xw $rbp-4
0x7fffffffe0bc: 0x00007a69
(gdb) x &eleet
0x7fffffffe0bc: 0x00007a69
(gdb)
```

And just as a sanity, let's verify that `0x7a69` is what we think it is by running it through a [command-line calculator]:

```bash
$ echo "ibase=16; 7A69" | bc
31337
```

Next we see the character array that's being assigned in the function.  Let's step ahead three instructions so those assignments are executed and then look at the memory:

```gdb
(gdb) nexti 3
9       }
(gdb) x/16xw $rbp-32
0x7fffffffe0a0: 0x00000062      0x00000061      0x00000002      0x00000001
0x7fffffffe0b0: 0x414346b0      0x00005554      0x55554530      0x00007a69
0x7fffffffe0c0: 0xffffe0d0      0x00007fff      0x555546a5      0x00005555
0x7fffffffe0d0: 0x555546b0      0x00005555      0xf7a5a2e1      0x00007fff
(gdb)
```

Now we can finally see the full stack frame.  `foo`'s function params are at the top of the stack as noted prior, but now we can see all of the [automatic variables] in the space allocated by the compiler between the function params and the frame pointer.  Let's have a closer look.

Again, the arguments passed to the `foo` function start at location `0x7fffffffe0a0`.  However, now we can see the partially-filled `char` buffer at `0x7fffffffe0b0`.  However, if we examine the first byte of that word, we can see that the value isn't part of the `buf` buffer:

```gdb
(gdb) x/xb 0x7fffffffe0b0                                                                      │
0x7fffffffe0b0: 0xb0
(gdb)
```

Indeed, if we look even closer, we see that the bytes that make up the contents of the buffer aren't next to each other or even in the right order!  What's going on here?

```gdb
(gdb) x/2xw 0x7fffffffe0b0
0x7fffffffe0b0: 0x414346b0      0x00005554
(gdb) x/4xh 0x7fffffffe0b0
0x7fffffffe0b0: 0x46b0  0x4143  0x5554  0x0000
(gdb)
```

The answer, of course, is that `GDB` is printing out the bytes in little endian order.  We'll have to list them as individual bytes to see them in the correct order:

```gdb
(gdb) x/16xb 0x7fffffffe0b0
0x7fffffffe0b0: 0xb0    0x46    0x43    0x41    0x54    0x55    0x00    0x00
0x7fffffffe0b8: 0x30    0x45    0x55    0x55    0x69    0x7a    0x00    0x00
(gdb)
```

Now that's what we would expect to see.  Also notice that the buffer starts two bytes in from that address at `0x7fffffffe0b2`.  This can be confirmed by referencing the variable by name:

```gdb
0x7fffffffe0b2: 0x55544143
(gdb) x/3xb buf
0x7fffffffe0b2: 0x43    0x41    0x54
(gdb)
```

---

I'm going to finish this post by talking about environment variables.  All environment variables are accessible on the bottom of the stack at high memory addresses.  You can see this yourself by changing the above simple program to accept a command-line argument that will allow you to access its memory address in `GDB`.

Start by altering the code:

```c
#include <stdlib.h>

void foo(int a, int b, char c, char d) {
    int eleet;
    char buf[10];

    eleet = 31337;
    buf[0] = 'C';
    buf[1] = 'A';
    buf[2] = 'T';
}

int main(int argc, char **argv) {
    char *e = getenv(argv[1]);
    foo(1, 2, 'a', 'b');
}
```

When compiled, the program now expects the name of an environment variable as its sole argument.  Since there is no error checking, it will segfault if none is provided.

Now, set a variable just for this shell session: `export TESTVAR=foo`.

Ok, start gdb as usual, and we'll pass any command-line arguments it needs when we invoke its `run` command.  Before we do though, we'll need to set a breakpoint on line 15 after the `getenv` function has been executed and directly before the call to `foo`:

```bash
~/sandbox/c/hacking_the_art_of_exploitation:$ gdb stack_example
Reading symbols from stack_example...done.
(gdb) l
1       #include <stdlib.h>
2
3       void foo(int a, int b, char c, char d) {
4           int eleet;
5           char buf[10];
6
7           eleet = 31337;
8           buf[0] = 'C';
9           buf[1] = 'A';
10          buf[2] = 'T';
(gdb)
11      }
12
13      int main(int argc, char **argv) {
14          char *e = getenv(argv[1]);
15          foo(1, 2, 'a', 'b');
16      }
17
(gdb) b 15
Breakpoint 1 at 0x6fe: file stack_example_env_var_test.c, line 15.
(gdb) r TESTVAR
Starting program: /home/btoll/sandbox/c/hacking_the_art_of_exploitation/stack_example TESTVAR

Breakpoint 1, main (argc=2, argv=0x7fffffffe1a8) at stack_example_env_var_test.c:15
15          foo(1, 2, 'a', 'b');
(gdb) x/s e
0x7fffffffedf0: "foo"
(gdb)
```

This tells us that `TESTVAR` env var is at the bottom of the stack at memory address `0x7fffffffedf0`. We need to determine how far that is from the current base pointer, which we can easily accomplish by doing some simple arithmetic:

```gdb
(gdb) p e-$rbp
$1 = 3376
(gdb)
```

Ok, it's 3376 bytes below the base pointer in process memory.  Remember that the stack grows downward towards lower memory addresses, so to access the higher address at the bottom of the stack we need to use addition (I know, it's counter-intuitive).

To make sure that we definitely hit the correct memory address, we'll start printing out memory a few bytes before our result from before:

```gdb
(gdb) x/20s $rbp+3360
0x7fffffffede0: "56color"
0x7fffffffede8: "TESTVAR=foo"
0x7fffffffedf4: "WEBSERVER=/usr/local/www"
0x7fffffffee0d: "TMUX_PANE=%6"
0x7fffffffee1a: "SHLVL=3"
0x7fffffffee22: "XDG_SEAT=seat0"
0x7fffffffee31: "PYTHONPATH=:/usr/local/bin:/usr/local/bin:/usr/local/bin"
0x7fffffffee6a: "WINDOWID=14680077"
0x7fffffffee7c: "LOGNAME=btoll"
0x7fffffffee8a: "XDG_RUNTIME_DIR=/run/user/1000"
0x7fffffffeea9: "XAUTHORITY=/home/btoll/.Xauthority"
0x7fffffffeecc: "PATH=/usr/local/src/go:/home/btoll/go/bin:/home/btoll/bin:/usr/local/src/node/bin:/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games"
0x7fffffffef57: "HISTSIZE=500000"
0x7fffffffef67: "HISTFILESIZE=100000"
0x7fffffffef7b: "XTERM_LOCALE=en_US.UTF-8"
0x7fffffffef94: "LESSOPEN=| /usr/bin/lesspipe %s"
0x7fffffffefb4: "/home/btoll/sandbox/c/hacking_the_art_of_exploitation/stack_example"
0x7fffffffeff8: ""
0x7fffffffeff9: ""
0x7fffffffeffa: ""
(gdb)
```

And there it is.  There are quicker ways to determine the address, but I find it's instructive to learn this way since it incorporates many of the things discussed in this post.  And in a future post, I'll show how it's possible to exploit a program by injecting shellcode into an enviroment variable and getting the program to run it.

> ### A quick x86 architecture primer:
> ```config
> General purpose registers:
>       eax, ecx, edx
>
> Special purpose registers:
>       rbp = base pointer
>       rsp = stack pointer
>       rip = next instruction pointer
>
> Command:
>       i = info
>       x = examine
>
> Format:
>       x = hexadecimal
>       o = octal
>       u = unsigned base-10
>       t = binary
>
> Size:
>       b = byte, one byte, 8 bits
>       h = halfword, two bytes, 16 bits
>       w = word, four bytes, 32 bits
>       g = giant, eight bytes, 64 bits
> ```

It's easy to generate the assembly code from the C code by calling `gcc` with the appropriate flags:

```bash
$ gcc -masm=intel -S stack_example.c -o stack_example.s
```

Incidentally, do yourself a favor and pick up a copy of one of my all-time favorite books that discusses this topic and others at length, [Hacking: the Art of Exploitation].  And don't buy it from Amazon, if you're reading this you can afford to pay the difference.

[Fuck] [Jeff] [Bezos].

## References

- [Online GDB](https://www.onlinegdb.com/)

[`GDB`]: https://www.gnu.org/software/gdb/
[red zone]: https://en.wikipedia.org/wiki/Red_zone_(computing)
[can be changed]: https://gcc.gnu.org/onlinedocs/gcc-3.3.6/gcc/i386-and-x86_002d64-Options.html#index-no_002dred_002dzone-998
[with debugging support]: https://gcc.gnu.org/onlinedocs/gcc/Debugging-Options.html
[DWARF]: https://en.wikipedia.org/wiki/DWARF
[stabs]: https://en.wikipedia.org/wiki/Stabs
[.gdbinit]: https://github.com/btoll/dotfiles/blob/master/gdb/dot-gdbinit
[function prologue]: https://en.wikipedia.org/wiki/Function_prologue
[frame pointer]: https://en.wikipedia.org/wiki/Frame_pointer#Stack_and_frame_pointers
[function epilogue]: https://en.wikipedia.org/wiki/Function_prologue#Epilogue
[endianness]: https://en.wikipedia.org/wiki/Endianness
[command-line calculator]: http://www.theunixschool.com/2011/05/bc-unix-calculator.html
[automatic variables]: https://en.wikipedia.org/wiki/Automatic_variable
[Hacking: the Art of Exploitation]: https://nostarch.com/hacking2.htm
[Fuck]: https://www.truthdig.com/articles/inside-amazons-abusive-labor-practices/
[Jeff]: https://www.theguardian.com/technology/2018/jan/31/amazon-warehouse-wristband-tracking
[Bezos]: https://money.com/amazon-employee-median-salary-jeff-bezos/

