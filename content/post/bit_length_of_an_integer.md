+++
title = "On Determining the Bit Length of an Integer"
date = "2018-07-23T14:45:31-04:00"

+++

Over the weekend, I was watching [a video] on a great channel called [Computerphile] that talked about the relationship between the length of an integer and the number of bits needed to represent it.

I realized that I had done the same calculation when I wrote an article [On Password Strength], not thinking that there were other applications for this.  I thought it was interesting and merited a short post.

## The Math

So, to determine how many bits are needed for an integer of length 1, i.e, the integers `0 - 9`, take the base-2 logarithm of 10:

log<sub>2</sub>(10) = 3.3219280949

This shows the mathematical relationship between base-2 and base-10.  It's saying, "How many times do we need to raise the number `2` to equal `10`?"

To store a base-10 number we'll need four bits.  We round up, because obviously we can't have a fraction of a bit.

To see that this is true, let's count to `0 - 9` in binary:

<pre class="math">
0000
0001
0010
0011
0100
0101
0110
0111
1000
1001
</pre>

This demonstrates that the integers `8` and `9` do indeed need four bits to be stored in memory.

## More Examples

Take the number 91.  Since the number is two digits long, we can calculate the bits needed to store the number thusly:

- 2 * log<sub>2</sub>(10)
- 2 * 3.3219280949
- 6.6438561898
- 7 bits

That looks right, after all 7 bits is decimal 128 which encompasses the number 91.

Let's try another one! For instance, decimal 9119.  The number is 4 digits long, so:

- 4 * log<sub>2</sub>(10)
- 4 * 3.3219280949
- 13.2877123796
- 14 bits

Is that right?  Let's ask our trusty little friend [asbits]!

```
$ asbits 9119
0010 0011 1001 1111
```

Yes, it's 14 bits long!  Also, we can see that 14 bits is decimal 16,384, which encompasses our number 9119 (13 bits is less than 9119):

```
$ bc <<< 2^14
16384
$ bc <<< 2^13
8192
```

[ASCII] is a good example for encoding both numerical and alphabetical characters from bits.  Recall that ASCII is a character encoding that can fit in 7 bits, and the 8<sup>th</sup> bit was used by many, many other encoding schemes to add additional characters and symbols that were incompatible with each other.  This was a true nightmare before [Unicode] came to the rescue and solved all of our problems.

This is a good time to mention [a classic Joel Spolsky article] on the topic that is just as relevant now as it was when it was written in 2003.  Read it, if you haven't before!  And if you have, read it again!

Weeeeeeeeeeeeeeeeee.

[a video]: https://www.youtube.com/watch?v=thrx3SBEpL8
[Computerphile]: https://www.youtube.com/user/Computerphile
[On Password Strength]: /2018/05/30/on-password-strength/
[asbits]: https://github.com/btoll/tools/tree/master/c/asbits
[ASCII]: https://en.wikipedia.org/wiki/ASCII
[Unicode]: https://en.wikipedia.org/wiki/Unicode
[a classic Joel Spolsky article]: https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/

