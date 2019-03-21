+++
title = "On Ints as Bit Vectors"
date = "2019-03-16T15:42:22-04:00"

+++

I'm about to discuss one of the coolest things on the planet.  Seriously.  If you don't feel the same after having read the article, then as a practicing pyschiatrist I can tell you that there is something terribly wrong with you.

A [bit vector], also known as a bit array, bit map, bit string, et. al., is an array data structure that stores bits.  The allocated memory is contiguous, and operations on it are extremely fast.

However, if the data is under a certain size, there is another way to store data as a bit vector.

## The Mighty Int

Depending upon the CPU architecture, an `int` data type will be either 32 or 64 bits in size (also known as a `word`).  Depending upon the problem, it may just be large enough to fit the data that your algorithm is acting upon, thereby acting as an array data structure.  After all, the bits are grouped together contiguously in memory, just as with an array, and operations on that will be lightning fast.

Using an `int` as a bit vector works wonderfully as part of a solution to many questions that one encounters during coding interviews.  It can often be used in place of other data structures.

> This could probably be more accurately referred to as a [bit field].

## Example

**Question**: Is string N a permutation of a palindrome?

**Assumption**: The string is not empty and only consists of lowercase ASCII alpha characters.

There are many ways to solve this:

- Sort the array and walk through the sorted array, comparing each element to the following one(s).

	O(N lg N) runtime, O(1) space

- Use a hash data structure (or other).

	O(N) runtime, O(N) space

- Use an int as a bit vector and compare values.

	O(N) runtime, O(1) space

> Why does the last option only take constant space?  Because the size of the `int` doesn't grow as the input size grows.

Let's implement the last option.

is_palidrome_permutation.c

```
#include <stdlib.h>
#include <stdio.h>

int translate(char c) {
    if (c >= 'a' && c <= 'z')
        return c - 'a';

    return -1;
}

void load_up_vector(char* s, int* v) {
    for (int i = 0; s[i] != '\0'; i++) {
        int j = translate(s[i]);

        if (j != -1) {
	    int d = 1 << j;

            if ((*v & d) > 0) *v ^= d;
            else *v |= d;
	}
    }
}

void main(int argc, char **argv) {
    if (argc < 2) {
        printf("Usage: %s <string>\n", argv[0]);
        exit(1);
    }

    int v = 0;
    load_up_vector(argv[1], &v);
    printf("%d\n", (v & (v - 1)) == 0);
}
```

Notes:

- This works because every letter is being added to the `int` as a power of two.
- Using an `int` as a bit vector only works if we essentially "map" a unique value to a unique bit.
- The mapping is determined by its offset from the character `a`.
- The logical OR is adding the unique letter mapping to the `int`: `*v |= d;`
- `(v & (v - 1)) == 0` is testing whether the value is a power of two.

> Why test for a power of two?  A number that is a power of two can only be represented by one bit (the rest are zeroes)!

## Debugging

Let's dust off our old pal [GDB] and inspect some memory addresses.  Make sure you compile your program with debugging symbol support:

	gcc -ggdb3 -o is_palindrome_permutation is_palindrome_permutation.c

And start the debugger:

```
$ gdb ./is_palindrome_permutation
Reading symbols from ./is_palindrome_permutation...done.
(gdb) l 1
1       #include <stdlib.h>
2       #include <stdio.h>
3
4       int translate(char c) {
5           if (c >= 'a' && c <= 'z')
6               return c - 'a';
7
8           return -1;
9       }
10
(gdb)
11      void load_up_vector(char* s, int* v) {
12          for (int i = 0; s[i] != '\0'; i++) {
13              int j = translate(s[i]);
14
15              if (j != -1) {
16                  int d = 1 << j;
17
18                  if ((*v & d) > 0) *v ^= d;
19                  else *v |= d;
20              }
(gdb)
21          }
22      }
23
24      void main(int argc, char **argv) {
25          if (argc < 2) {
26              printf("Usage: %s <string>\n", argv[0]);
27              exit(1);
28          }
29
30          int v = 0;
(gdb)
31          load_up_vector(argv[1], &v);
32          printf("%d\n", (v & (v - 1)) == 0);
33      }
34
(gdb) b 32
Breakpoint 1 at 0x127d: file is_palindrome_permutation.c, line 32.
(gdb) r rrcaeca
Starting program: /home/btoll/is_palindrome_permutation rrcaeca

Breakpoint 1, main (argc=2, argv=0x7fffffffdf48) at is_palindrome_permutation.c:32
32          printf("%d\n", (v & (v - 1)) == 0);
(gdb
```

Here we listed out the program, set a breakpoint at line 32, and ran it with the value `rrcaeca`.  GDB is now waiting for more instructions.

Let's print out the memory address of the `int` bit vector:

```
(gdb) x/x &v
0x7fffffffde54: 0x00000010
```

> Hey, wait a minute, that doesn't look right!
>
> Remember, the values are stored as little-endian, so the value in bytes is:
>
>	00000000 00010000<sub>2</sub> = 16<sub>10</sub>

Let's print out the bits:

```
(gdb) x/t &v
0x7fffffffde54: 00010000
```

And the decimal value:

```
(gdb) x/u &v
0x7fffffffde54: 16
```

Hopefully, this gives you more insight into why this works.  Since there is only one unique character in the array (and all the other characters are pairs), the result is a power of two, i.e., only one bit is set.

Let's look at another example where the string is not a permutation of a palindrome.  The expectation is that more than one bit will be set, which would mean that there is more than one unique character.

I'll jump right to the point where the running program has hit the debugger and print out the value of the `int`:

```
(gdb) r foobar
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /home/btoll/is_palindrome_permutation foobar

Breakpoint 1, main (argc=2, argv=0x7fffffffdf48) at is_palindrome_permutation.c:32
32          printf("%d\n", (v & (v - 1)) == 0);
(gdb) x/2x &v
0x7fffffffde54: 0x0023  0x0002
(gdb) x/2t &v
0x7fffffffde54: 0000000000100011        0000000000000010
(gdb) x/2u &v
0x7fffffffde54: 35      2
(gdb)
```

00000000 00000010 00000000 00100011<sub>2</sub> = 131107<sub>10</sub>

Just as I thought, there are four bits set, one for each unique character in the string, `a`, `b`, `f` and `r`.

## Let's Get More Concrete

Often, you'll see this in use when doing I/O, such as opening a file.  Here's an example from the [open(3) man page]:

```
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>

#define LOCKFILE "/etc/ptmp"
...
int pfd;
char filename[PATH_MAX+1];
...
if ((pfd = open(filename, O_WRONLY | O_CREAT | O_TRUNC,
    S_IRUSR | S_IWUSR | S_IRGRP | S_IROTH)) == -1)
{
    perror("Cannot open output file\n"); exit(1);
}
...
```

Each of those constants represent a power of two, and the logical OR is adding them together.

Essentially, it's a really handy way to store multiple values rather than a slew of variables.  For example, it's much easier to check for the existence of a bit then to have a multi-block `if` or `switch` statement.

I do something similar in one of my static code analysis tools, [rupert-fp] - (see the [visitor.js] script).

[bit vector]: https://en.wikipedia.org/wiki/Bit_array
[bit field]: https://en.wikipedia.org/wiki/Bit_field
[GDB]: https://www.gnu.org/software/gdb/
[open(3) man page]: https://linux.die.net/man/3/open
[rupert-fp]: https://github.com/btoll/rupert-fp/
[visitor.js]: https://github.com/btoll/rupert-fp/blob/master/src/visitor.js

