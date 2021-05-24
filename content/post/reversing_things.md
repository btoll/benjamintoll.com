+++
title = "On Reversing Things"
date = "2021-05-23T13:48:03-04:00"

+++

> The "things" in this article refer specifically to integers and bits, not to time.  If that were the case, I'd throw it in reverse and go back to a time before smartphones, social media and most of the Internet.  I'd probably want to stay my current age, though.

- [Integer Reversal](#integer-reversal)
- [Bit Reversal](#bit-reversal)

---

I came across some algorithm questions on one of the coding challenge sites that asked about reversing integers and bits.  The only constraint was to limit the size of the result to a signed 32-bit integer:

<pre class="math">
-2<sup>31</sup> <= n <= 2<sup>31</sup> - 1
</pre>

There should have been another constraint:  the use of a list or an array is not allowed.  Using a list **should** immediately make you suspicious, because it's a code smell and should feel like cheating.

This type of kludge should not be accepted.  However, it does show the responder's experience and breadth of knowledge, and probably their curiosity level.  At least it does to me.

Unfortunately, the majority of the Python and JavaScript submissions used a list or an array as part, if not the whole, of the solution.  For the Python solutions, the list reversal idiom was usually somewhere in the code:

<pre class="math">
[1, 2, 3, 4, 5][::-1]
</pre>

Or JavaScript:

<pre class="math">
[1, 2, 3, 4, 5].reverse()
</pre>

...and then more tomfoolery.

These kinds of "solutions" won't fly in a coding interview for several reasons:

1. When using a list, it's necessary to type cast the number to a string and then back again.  This is done using the `int()` function, but in so doing it could create a 64-bit depending on the host architecture.
1. Using an integer as a bit vector uses only O(1) space, but a list uses O(N) space.  This may or may not be significant, depending upon the constraints.
1. It's just plain lazy.

On the other hand, the solutions that used system programming languages like C or C++ usually would futz with the numbers themselves, pushing and popping without need of an array.  Some solutions included bitwise operations, and so of course I immediately fell in love.

I feel like the approaches taken by system programmers are the right solutions, and it's no surprise that they are used frequently in systems programming.  Although I was aware of and used bitwise operations even as a frontend developer, it wasn't until I started learning C that I became aware of their extreme utility, efficacy and ubiquity.

Let's take a look at how we can solve these riddles using Python without the crutch of a list.

# Integer Reversal

For reversing integers, there are two operations that will be used:

- [modulo operation]
- [integer division]

Modulo operation is performed on the integer to reverse as a way to pop off the first integer.  Think of popping the last element of a stack.  It is the number `n` modulo the base 10:

<pre class="math">
>>> 321 % 10
1
>>> 32 % 10
2
>>> 3 % 10
3
</pre>

> Actually, it may be more accurate to call this peeking rather than popping, because the right-most number isn't actually removed from the integer.

So, this does actually what we need, which is to remove the numbers that make up the whole integer one at a time.  However, how do we "chop off" the right-most number after every modulo operation?  This is where integer division comes in.

<pre class="math">
>>> n = 321
>>> n //= 10
>>> n
32
>>> n //= 10
>>> n
3
>>> n //= 10
>>> n
0
</pre>

The integer division operator in Python is the `//` symbol.  It discards the remainder, which in practice is the same as flooring.  By re-defining the variable `n` every time, the right-most number is "chopped off" or removed from the integer.  Weeeeeeeeeeeeeeeee

Combining the two operations together enables us to mimic the popping mechanism of a stack data structure, which enables us to return the numbers that make up the entire integer in reverse order.

Kool Moe Dee.

Let's see it in a script:

`reverse_integer.py`

<pre class="math">
def reverse_integer(n, exp=10):       (1)
    if n < 0:
        is_negative = -1
        n *= -1
    else:
        is_negative = 1

    ret = 0
    while n:
        rem = n % exp
        ret = ret * 10 + rem          (2)
        n //= exp

    ret *= is_negative

    if -2**31 <= ret <= 2**31 - 1:
        return ret
    return 0
</pre>

Notes:

1. This version of the script allows us to pass in a base for different numbering systems.  For example, it defaults to decimal (base 10), but try it with binary (base 2) or octal (base 8)!  Yeah!!
1. If you were wondering how the reversed integer is added together with every popped digit, wonder no more.  For each iteration, the operations look like the following for the integer 321 base 10:
    - 0 * 10 + 1 = 1
    - 1 * 10 + 2 = 12
    - 12 * 10 + 3 = 123

So, that's nice.  Let's now take a look at reversing bits!

# Bit Reversal

The only constraint is that the [bit vector] or bit string is 32 bits.

<pre class="math">
def reverse_bits(n):
    ret = 0
    for shift in range(31, -1, -1):     (1)
        ret |= (n & 1) << shift         (2)
        n >>= 1                         (3)
    return ret
</pre>

Notes:

1. Decrementing ensures that the bit vector is treated like a queue.
1. Starting from the most significant bit, "push" the 1s and 0s into the beginning of the bit vector.
    - Right-shift the 0 or 1 determined by the bitwise AND operator `shift` number of bits.
    - This will place the 0 or 1 in the proper place in the bit string.
    - Add it to the running total.
1. "Pop" off or remove the least significant bit after every iteration.

This little fella packs quite a punch, like stepping into the ring with Clubber Lang!  Ouch!

As a bonus, here's another implementation.  It takes the opposite strategy as the previous approach, treating the bit vector as a stack.

<pre class="math">
def reverse_bits(n):
    ret = 0
    for i in range(32):         (1)
        ret <<= 1               (2)
        ret |= (n & 1)          (3)
        n >>= 1                 (4)
    return ret
</pre>

Notes:

1. Incrementing ensures that the bit vector is treated like a stack.
1. Make room in the least signifant bit position for the new bit, whether 1 or 0.
1. Bitwise AND the integer `n` to get its value from its least significant bit position.
1. "Pop" off or remove the least significant bit after every iteration.

If that doesn't make sense, drop into the Python REPL and do the operations one at a time:

```
$ python -q
>>> n = 0
>>> n <<= 1
>>> bin(n)
'0b0'
>>> n |= 1
>>> bin(n)
'0b1'
>>> n <<= 1
>>> bin(n)
'0b10'
>>> n |= 0
>>> bin(n)
'0b10'
>>> n <<= 1
>>> bin(n)
'0b100'
>>> n |= 1
>>> bin(n)
'0b101'
>>> n <<= 1
>>> bin(n)
'0b1010'
>>> n |= 0
>>> bin(n)
'0b1010'
>>> n <<= 1
>>> bin(n)
'0b10100'
>>> n |= 1
>>> bin(n)
'0b10101'
```

In this interactive session, I'm doing the following:

1. Bitwise left shifting by 1 to make room for the new bit (either 1 or 0).
1. Printing the binary representation as a bit string using the `bin` function.
1. Adding the 1 or 0 to the front of the bit string in the least significant bit position.  This is analogous to pushing the bit onto the stack.
1. Printing the binary representation as a bit string using the `bin` function.
1. Repeat.

Doing this manually helps us to see how the bit string is built.  The bit string is indeed reversed by using it as a stack.

# Conclusion

I can't stress enough how important it is to always challenge yourself, and that of course includes learning different and interesting ways to implement algorithms to solve common problems.  On these coding sites, it's encouraged to look at other submissions, especially those not written in the same language as your submission.

There's no excuse not to be familiar with bitwise implementations to solve challenges in efficient and elegant ways.  While they can be difficult to understand, especially at first, studying them is time well spent.

Because after all, we don't do this for any gains other than intellectual, right?  Right?

[modulo operation]: https://en.wikipedia.org/wiki/Modulo_operation
[integer division]: https://mathworld.wolfram.com/IntegerDivision.html
[bit vector]: https://en.wikipedia.org/wiki/Bit_array

