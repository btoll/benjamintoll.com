+++
title = "On Formatting to Binary"
date = "2018-06-21T15:43:17-04:00"

+++

I stumbled on a delightful little program the other day on my hard drive that I had saved at some point.  Unfortunately, I forget its provenance ([K & R]? [Hacking: the Art of Exploitation]?).  It's a simple thing: give it a base-10 number and encode it to its byte representation.

It's used thusly:

	~:$ asbits 
	Usage: asbits <base-10> [num bytes=4]
	~:$ asbits 203
	0000 0000 1100 1011
	~:$ asbits 203 2
	1100 1011

I find it immensely useful when I'm programming in a systems language and doing things with masks and such.  It certainly helps to be able to visualize the result of a bitwise operation rather than trying to do it in my head.

The elegance of this program lies in the use of bitwise operations.  While used heavily in systems programming, they aren't as well-known among developers who work with high-level languages like JavaScript.

> Once, while working at a fairly well-known international company, I asked a roomful of JavaScript developers how often they've used bitwise operations.  Instead of answering the question, a department head responded that that's the type of code that when stumbled upon makes him want to hunt down the developer(s) and kill them!  Whoa!

Here is [the full program]:

	#include <stdio.h>
	#include <stdlib.h>

	unsigned valueToConvert;

	void asbits(short numDisplayBytes) {
	    int numBitsToRightShift = numDisplayBytes * sizeof(unsigned) - 1;

	    for (; numBitsToRightShift >= 0; --numBitsToRightShift) {
			(valueToConvert >> numBitsToRightShift) & 1
			    ? putchar('1')
			    : putchar('0');

			if (numBitsToRightShift % 4 == 0)
			    putchar(' ');
	    }

	    putchar('\n');
	}

	int main(int argc, char **argv) {
	    if (argc < 2) {
			printf("Usage: %s <hex or chars> [num bytes=4]\n", argv[0]);
			exit(1);
	    }

	    int numDisplayBytes = !argv[2] ? 4 : atoi(argv[2]);

	    if (numDisplayBytes > 8) {
			numDisplayBytes = 8;
			printf("Max number of display bytes is 8\n");
	    }

	    valueToConvert = atoi(argv[1]);
	    asbits(numDisplayBytes);

	    return 0;
	}


The crux of the solution is to bitwise AND the bit in the first position after right shifting `n` number of bits.  The number of bits to shift is determined by multiplying the number of bytes to display by the size of an integer in C.  This will allow the program to build a string of the specified number of bits by looking at each bit individually.

Let's see how this would work if we were to draw it out:

	/*
	 *      asbits 203 2
	 *
	 *          203 >> 7 == 1              1 & 1
	 *          203 >> 6 == 3             11 & 1
	 *          203 >> 5 == 6            110 & 1
	 *          203 >> 4 == 12          1100 & 1
	 *          203 >> 3 == 25         11001 & 1
	 *          203 >> 2 == 50        110010 & 1
	 *          203 >> 1 == 101      1100101 & 1
	 *          203 >> 0 == 203     11001011 & 1
	 *
	 */

Since the program will display the result of the value to convert as a two-byte string, the number to right shift will be 7 in the example above:

	int numBitsToRightShift = numDisplayBytes * sizeof(unsigned) - 1;

Let's look at how the first byte is constructed:

1. The first operation right shifts the value of 203 by 7 bits:

			203 >> 7

	This will give a value of 1, which is 1 in binary.  ANDing this with 1 will produce one, which is immediately printed to `stdout`.

			1 & 1

2. The second operation right shifts the value of 203 by 6 bits (since we decrement the number of bits to shift in a loop):

			203 >> 6
	
	This will give a value of 3, which is 11 in binary.  ANDing this with 1 will produce one, which is immediately printed to `stdout`.

			3 & 1

3. The third operation right shifts the value of 203 by 5 bits (since we decrement the number of bits to shift in a loop):

			203 >> 5
	
	This will give a value of 6, which is 110 in binary.  ANDing this with 1 will produce zero, which is immediately printed to `stdout`.

			6 & 1

4. The third operation right shifts the value of 203 by 4 bits (since we decrement the number of bits to shift in a loop):

			203 >> 4
	
	This will give a value of 12, which is 1100 in binary.  ANDing this with 1 will produce zero, which is immediately printed to `stdout`.

			12 & 1

So, at this point in the program, the output will be `1100`.

Referring back to the example above, you can see how the operations form a pyramid shape as the program right shifts to the bit in the first position and then works its way back out.  For each iteration, only the bit in the right-most position is considered, and a simple bitwise AND operation will produce either a one or a zero.

In conclusion, I love finding solutions like these.  While at first they may seem intimidating, they are beautiful in their simplicity, and it's well-worth the time to tease them apart.

And [they're fast]!

[K & R]: https://en.wikipedia.org/wiki/The_C_Programming_Language
[Hacking: the Art of Exploitation]: https://nostarch.com/hacking2.htm
[the full program]: https://github.com/btoll/tools/tree/master/c/asbits
[they're fast]: /2018/03/10/on-being-performant/

