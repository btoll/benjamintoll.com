+++
title = "On Two's Complement"
date = "2018-10-29T22:28:32-04:00"

+++

[Two's complement] is a way to encode negative numbers in a binary representation.  It accomplishes this by using the most significant bit as the sign bit (0 is positive, 1 is negative).

Two's complement has a distinct advantage over [ones' complement], and as such it is the most common method of representing signed integers on computers:

- Fundamental arithmetic operations are identical for both signed and unsigned binary numbers.
- There is only one representation for zero (ones' complement has both positive and negative zero).

For example, let's compare positive and negative 5 using the [`asbits`] tool to see their bit representations.  The following will print the values out for 4 bits, 8 bits, 16 bits and 32 bits, respectively:

	~:$ for bits in {4,8,16,32}
	> do
	> for n in {5,-5}
	> do
	> asbits $n $(bc <<< $bits/4)
	> done
	> done
	0101
	1011
	0000 0101
	1111 1011
	0000 0000 0000 0101
	1111 1111 1111 1011
	0000 0000 0000 0000 0000 0000 0000 0101
	1111 1111 1111 1111 1111 1111 1111 1011

Looking at the output, one can see that the negative encoding (where the most significant, or leftmost, bit is a 1) isn't very intuitive.  At least not for me.  In fact, I found it confusing as hell, and I didn't get it at all.  Most explanations centered on the mechanics of the operation, such as "invert every bit and add one", which is the two's complement of its inverse, but that didn't help my understanding.

> You can determine the two's complement of a number by first taking its ones' complement, i.e., inverting the bits, and then adding 1.  For instance:
>
>		0101
>		1010   <-- Ones' complement
>		1011   <-- Two's complement
>
> Sure that works, but *why* does it work?!?

The way that I finally understood it was realizing that the sum of a number and its two's complement is `2`<sup>N</sup>.

For instance, let's say that we want to find the two's complement of 8 in an 8-bit representation.  To find the two's complement of `00001000` (8<sub>10</sub> in binary), we add to it another number which will equal 2<sup>8</sup>:

	10000000 = 00001000 + 11111000

	~:$ for n in {8,-8}
	> do
	> asbits $n 2
	> done
	0000 1000
	1111 1000

Add the two binary numbers together to see for yourself.

        00001000
      + 11111000
        --------
     (1)00000000

Conveniently, the overflow number is discarded.

Another way to mathematically calculate the two's complement is by plugging the complement into the following formula:

(2<sup>Number of bits</sup> - complement)<sub>2</sub>

For example, lets find the two's complement of 6 for a 4-bit representation.  The formula becomes:

2<sup>4</sup> - 6 = 16 - 6 = 10<sub>10</sub> = 1010<sub>2</sub>

        0110
      + 1010
        ----
     (1)0000

Now, let's see how a simple program written in C stores a negative integer in memory.  The following is straightforward enough:

`twos_complement.c`:

	#include <stdlib.h>
	#include <stdio.h>

	int main(int argc, char **argv) {
	    int i = 5;
	    int j = -5;

	    printf("%d %d\n", i, j);
	    return 0;
	}

Compile it with symbols so we can debug it in [GDB]:

	-ggdb3 twos_complement.c -o twos_complement

And start debugging:

	~:$ gdb twos_complement
	Reading symbols from twos_complement...done.
	(gdb) list
	1       #include <stdlib.h>
	2       #include <stdio.h>
	3
	4       int main(int argc, char **argv) {
	5           int i = 5;
	6           int j = -5;
	7
	8           printf("%d %d\n", i, j);
	9           return 0;
	10      }
	(gdb) b 8
	Breakpoint 1 at 0x6cd: file twos_complement.c, line 8.
	(gdb) r
	Starting program: /home/btoll/twos_complement

	Breakpoint 1, main (argc=1, argv=0x7fffffffe2a8) at twos_complement.c:8
	8           printf("%d %d\n", i, j);
	(gdb)

Here, we've listed the program, set a breakpoint at line 8 and then ran it.  We'll now disassemble the machine code so we can see the memory we need to inspect:

	(gdb) disass
	Dump of assembler code for function main:
	   0x00005555555546b0 <+0>:     push   rbp
	   0x00005555555546b1 <+1>:     mov    rbp,rsp
	   0x00005555555546b4 <+4>:     sub    rsp,0x20
	   0x00005555555546b8 <+8>:     mov    DWORD PTR [rbp-0x14],edi
	   0x00005555555546bb <+11>:    mov    QWORD PTR [rbp-0x20],rsi
	   0x00005555555546bf <+15>:    mov    DWORD PTR [rbp-0x4],0x5
	   0x00005555555546c6 <+22>:    mov    DWORD PTR [rbp-0x8],0xfffffffb
	=> 0x00005555555546cd <+29>:    mov    edx,DWORD PTR [rbp-0x8]
	   0x00005555555546d0 <+32>:    mov    eax,DWORD PTR [rbp-0x4]
	   0x00005555555546d3 <+35>:    mov    esi,eax
	   0x00005555555546d5 <+37>:    lea    rdi,[rip+0x98]        # 0x555555554774
	   0x00005555555546dc <+44>:    mov    eax,0x0
	   0x00005555555546e1 <+49>:    call   0x555555554560 <printf@plt>
	   0x00005555555546e6 <+54>:    mov    eax,0x0
	   0x00005555555546eb <+59>:    leave
	   0x00005555555546ec <+60>:    ret
	End of assembler dump.

The positive value stored in the variable `i` is located four bytes below the base pointer, and the negative value in variable `j` is located eight bytes from the base pointer.  We can already see from the hexadecimal values that the `-5` is encoded as two's complement of `5`<sub>10</sub>, but let's print them as binary to get the full effect:

	(gdb) x/xt $rbp-4
	0x7fffffffe1bc: 00000000000000000000000000000101
	(gdb) x/xt $rbp-8
	0x7fffffffe1b8: 11111111111111111111111111111011

This looks like what we'd expect, and we'll verify it again using our old friend:

	~:$ for n in {5,-5}
	> do
	> asbits $n 8
	> done
	0000 0000 0000 0000 0000 0000 0000 0101
	1111 1111 1111 1111 1111 1111 1111 1011

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

[Two's complement]: https://en.wikipedia.org/wiki/Two's_complement
[ones' complement]: https://en.wikipedia.org/wiki/Ones'_complement
[`asbits`]: https://github.com/btoll/tools/tree/master/c/
[GDB]: https://www.gnu.org/software/gdb/

