+++
title = "On Binary Arithmetic"
date = "2019-03-14T15:12:55-04:00"

+++

[Binary arithmetic] is not something that you'll see very often in your everyday [REST] app, but that doesn't mean that it's not important to know (or at least to know about).

Arithmetic on binary numbers is really no different than it is on other number systems (i.e., bases), such as decimal.  Let's look at some examples.

## Addition

Recall that when adding decimal numbers, any sum greater than `9` will carry over to the next number place.  For instance, when adding the numbers `9` and `5`, `14` is greater than 9, so the first number `1` will carry over to the ten's place:

<pre class="math">
 <sub>1</sub>
  9
  5
---
 14
</pre>

Every school kid knows this.  And with binary, it's the same, the only difference being that `1` is carried over to the next "column" when the sum is greater than `1`:

<pre class="math">
<sub>1</sub>
 1
 1
--
10<sub>2</sub> == 2<sub>10</sub>
</pre>

<pre class="math">
 <sub>1</sub>
101
001
---
110<sub>2</sub> == 4<sub>10</sub>
</pre>

Ok, that's really straightforward.  Let's look at an example of adding larger numbers.

<pre class="math">
 <sub>1</sub><sub>1</sub><sub>1</sub><sub>1</sub> <sub>1</sub><sub>1</sub><sub>1</sub><sub>1</sub>
0110 1111  <--- 111<sub>10</sub>
0101 1101  <--- 93<sub>10</sub>
---------
1100 1100<sub>2</sub> == 204<sub>10</sub>
</pre>

Let's break that down:

- 1's place: 1 + 1 = 2, write down 0 and carry a bit
- 2's place: 1 + 1 = 2, write down 0 and carry a bit
- 4's place: 1 + 1 + 1 = 3, write down 1 and carry a bit
- 8's place: 1 + 1 + 1 = 3, write down 1 and carry a bit
- 16's place: 1 + 1 = 2, write down 0 and carry a bit
- 32's place: 1 + 1 = 2, write down 0 and carry a bit
- 64's place: 1 + 1 + 1 = 3, write down 1 and carry a bit
- 128's place: 1 + 0 = 2, write down 1 and we're done

If never having done this, it will probably feel a bit awkward at first, but once your brain gets used to thinking in number systems other than decimal it will become easier.

## Subtraction

Subtraction is fun, at least [until daddy takes the T-Bird away], and then it's sort of a drag.

Most sites that I've looked at use a method of subtracting where bits are borrowed when needed from larger numbers, but I prefer converting the smaller number to [twos' complement] form and then adding.  This has the extra benefit of reinforcing and understanding twos' complement.

> Recall that twos' complement is simply inverting all of the bits (i.e., [ones' complement]) and then adding `1`.

Let's look at a simple example:

<pre class="math">
1001  <--- 9<sub>10</sub>
0111  <--- 7<sub>10</sub>

Twos' complement of 7: 1001

Add!

  <sub>1</sub>
1001
1001
----
0010<sub>2</sub> == 2<sub>10</sub>
</pre>

> Recall that any [overflow bit] is discarded!

Let's look at an example of subtracting larger numbers:

<pre class="math">
0110 1111  <--- 111<sub>10</sub>
0101 1101  <--- 93<sub>10</sub>

Twos' complement of 93: 1010 0011

Add!

<sub>1</sub><sub>1</sub><sub>1</sub> <sub>1</sub> <sub>1</sub><sub>1</sub><sub>1</sub><sub>1</sub>
0110 1111
1010 0011
---------
0001 0010<sub>2</sub> == 18<sub>10</sub>

( Again, the overflow bit is discarded. )
</pre>

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## Multiplication

Binary multiplication is even easier than decimal multiplication.  That's kind of nice.

[Bitwise AND] is multiplication.  Let's look at the truth table:

<table class="truth-table">
    <thead>
        <tr>
	    <th>*</th>
            <th>0</th>
	    <th>1</th>
	</tr>
    </thead>
    <tbody>
        <tr>
	    <td class="bold y-axis">0</td>
	    <td>0</td>
	    <td>0</td>
	</tr>
        <tr>
	    <td class="bold y-axis">1</td>
	    <td>0</td>
	    <td>1</td>
	</tr>
    </tbody>
</table>

So:

- 0 * 0 = 0
- 0 * 1 = 0
- 1 * 0 = 0
- 1 * 1 = 1

See, it's just multiplication, I would never lie to you.  And the bit is only `1` or `true` 25% of the time.

In addition, as in decimal multiplication, there are two parts to binary multiplication:

1. Multiplying each bit, starting from the rightmost bit.
2. Adding the results of the multiplications.

Keep this in mind for the following example:

<pre class="math">
   1101
    101
   ----
   1101
  0000
 1101
-------
1000001 --> 0100 0001<sub>2</sub> == 65<sub>10</sub>
</pre>

The part that is easier than decimal multiplication is that for every `1` in the multiplicand (the second number in the equation), you can merely copy the entire number.  Or, you can think of each bit and compute using the truth table above.  Whatever floats your boat.

## Division

I don't really feel like covering division cause it bores me.  Maybe I'll come back to this article at some point and fill this part in.  Oh well.

[Binary arithmetic]: https://en.wikipedia.org/wiki/Binary_number#Binary_arithmetic
[REST]: https://en.wikipedia.org/wiki/Representational_state_transfer
[until daddy takes the T-Bird away]: https://www.youtube.com/watch?v=dDHErN3dOkc
[twos' complement]: /2018/10/29/on-twos-complement/
[ones' complement]: https://en.wikipedia.org/wiki/Ones%27_complement
[overflow bit]: https://en.wikipedia.org/wiki/Two%27s_complement#Addition
[Bitwise AND]: https://en.wikipedia.org/wiki/Bitwise_operation#AND

