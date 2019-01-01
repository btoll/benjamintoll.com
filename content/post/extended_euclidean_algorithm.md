+++
title = "On the Extended Euclidean Algorithm"
date = "2018-12-28T19:40:31-05:00"

+++

We're going to look at another algorithm by our old pal [Euclid].  But before we do, no discussion of the [extended Euclidean algorithm] would be complete without first taking a step back to consider the [Euclidean algorithm] and [Be&#769;zout's identity].

The Euclidean algorithm is of one of the oldest known algorithms that is still in common use today and has real-world, [practical applications] beyond mathematical algorithms such as those found in [RSA].

Described in his book the [Elements] circa 300BCE, the algorithm determines the [greatest common divisor] of two numbers.  My interest is in how it is used in [number theory] and cryptography.

## The Euclidean Algorithm

First, we need to be acquainted with a helpful algorithm known as the [division algorithm], which computes the quotient and remainder for two integers `n` and `d` in the form:

<pre class="math">
n = dq + r, where 0 <= r < d

n = dividend (numerator)
d = divisor (denominator)
q = quotient
r = remainder

For example:

n = 57
d = 13

57 = 13(4) + 5
</pre>

> Note that for Euclid's algorithm we don't care about the quotient, but we do for the extended Euclidean algorithm!

### The Algorithm

Let's compute the following: `gcd(a, b)`

Before starting, assign the larger number to `n` and the smaller to `d`.

1. Divide `n` by `d` and assign the remainder to `r`.
2. If `r` > 0, assign `d` to `n` and `r` to `d`. Repeat step 1.
3. Else if `r` == 0, the greatest common divisor is `d`.

This algorithm is fast, and every other iteration the value of `r` is reduced by a bit!

### Examples

<pre class="math">
<b>gcd(51, 39)</b>

n = 51, d = 39

Step 1
	n = 51
	d = 39
	r = n % d = 12

Step 2
	Is r > 0? Yes.

Step 1
	n = 39
	d = 12
	r = n % d = 3

Step 2
	Is r > 0? Yes.

Step 1
	n = 12
	d = 3
	r = n % d = 0

Step 2
	Is r > 0? No!

Step 3
	The gcd(51, 39) is <b>3</b>.
</pre>

[Easy peasy lemon squeezy]!

Let's do another!  Weeeeeeeeeeeeeeeeeeeeee

<pre class="math">
<b>gcd(17, 97)</b>

n = 97, d = 17

Step 1
	n = 97
	d = 17
	r = n % d = 12

Step 2
	Is r > 0? Yes.

Step 1
	n = 17
	d = 12
	r = n % d = 5

Step 2
	Is r > 0? Yes.

Step 1
	n = 12
	d = 5
	r = n % d = 2

Step 2
	Is r > 0? Yes.

Step 1
	n = 5
	d = 2
	r = n % d = 1

Step 2
	Is r > 0? Yes.

Step 1
	n = 2
	d = 1
	r = n % d = 0

Step 2
	Is r > 0? No!

Step 3
	The gcd(17, 97) is <b>1</b>.
</pre>

And this is straightforward to code.  Here is a recursive approach in C:

[euclidean_algorithm.c]

```
#include <stdlib.h>
#include <stdio.h>

// gcc -o gcd euclidean_algorithm.c

int gcd(int a, int b) {
    if (a % b == 0) return b;
    return gcd(b, a % b);
}

void main(int argc, char **argv) {
    if (argc < 3) {
        printf("[ERROR] Not enough args: %s [a] [b]\n", argv[0]);
        exit(1);
    }

    printf("%d\n", gcd(atoi(argv[1]), atoi(argv[2])));
}
```
> Having the base case be `a % b == 0` rather than `b == 0` saves us one recursive call on the stack.

Now, that we have the Euclidean algorithm under our belt, let's take another step on the way to our main topic, the extended Euclidean algorithm.

## Be&#769;zout's Identity

[Be&#769;zout's identity], as its name suggests, was named after the 18<sup>th</sup> century French mathemetician [E&#769;tienne Be&#769;zout] (1730-1783).  The theorem states the following (from Wikipedia):

> Let `a` and `b` be integers with greatest common divisor `d`.  Then, there exist integers `x` and `y` such that `ax + by = d`.  More generally, the integers of the form `ax + by` are exactly the multiples of `d`.

So, we can write:

	gcd(a, b) = ax + by

The pair of coefficients `x` and `y` are referred to as Be&#769;zout's coefficients for `(a, b)` and can be computed by the extended Euclidean algorithm.
Let's turn to this now.

> So, why is this important?  Well, for one, it can determine the [modular multiplicative inverse], and this can be used as the [private key] in asymmetric encryption.  I'll cover this is a future article.

## The Extended Euclidean Algorithm

As the Euclidean algorithm needs the division algorithm, so does the extended algorithm.  In addition, we are interested in capturing the quotient for each expression (we weren't before).  Capturing the quotient will help us to compute Be&#769;zout's identity.

In addition, we'll want to rewrite each expression so the remainder is expressed as a [linear combination]:

<pre class="math">
n = dq + r
r = n - dq
</pre>

Let's now see how we can use this to compute both the greatest common divisor of `a` and `b` as well as Be&#769;zout's coefficients.

### The Algorithm

Before beginning, assign the numbers to `a` and `b`, with the former containing the larger value.  These will be used throughout the algorithm in our substitutions.

The algorithm:

1. Compute the division algorithm, rewriting it to so the remainder is represented as a linear combination, and substitute values with the previously-computed polynomial expressions.
2. If `r` > 0, assign `d` to `n` and `r` to `d`.  Repeat step 1.
3. If `r` == 0, calculate the polynomial expression for the penultimate Step 1.

### Examples

<pre class="math">
<b>gcd(527, 341)</b>

a = 527, b = 341

Step 1:
	n = 527
	d = 341
	q = 1
	r = n % d = 186

	186 = 527 - 341(1)
	186 = a - b

Step 2:
	Is r > 0? Yes.

Step 1:
	n = 341
	d = 186
	q = 1
	r = n % d = 155

	155 = 341 - 186(1)
	155 = b - (a - b)
	155 = -a + 2b

Step 2:
	Is r > 0? Yes.

Step 1:
	n = 186
	d = 155
	q = 1
	r = n % d = 31

	31 = 186 - 155(1)
	31 = (a - b) - (-a + 2b)
	<b>31 = 2a - 3b</b>

Step 2:
	Is r > 0? Yes.

Step 1:
	n = 155
	d = 31
	q = 5
	r = n % d = 0

	0 = 155 - 31(5)
	0 = (-a + 2b) - 5(2a - 3b)
	0 = -11a + 17b

Step 2:
	Is r > 0? No!

Step 3:
	31 = 2a - 3b
	31 = 2(527) - 3(341)
	31 = 1054 - 1023
	31 = 31

So, we've learned the gcd is 31 and that the coefficients are 2 and -3, respectively
(one of the numbers will always be negative).
It's a twofer!  We can now determine our entire expression!

gcd(527, 341) = 527x + 341y
		   31 = 527(2) + 341(-3)
		   31 = 1054 - 1023
		   31 = 31

Hmm, looks suspiciously like Step 3 above!  <a href="https://www.youtube.com/watch?v=9HriXwCs-Ck">Bingo!</a>

For completeness, we can also verify the polynomial expression from the last Step 1.

0 = -11a + 17b
0 = -11(527) + 17(341)
0 = -5797 + 5797
</pre>

> Note that by rewriting the expression for the remainder and substituting as we go that we're essentially computing the Euclidean algorithm and the extended Euclidean algorithm at the same time, so that we're done by the time we've determined the **gcd**.
>
> There is a way to do this that some may consider a shortcut, whereby the **gcd** is first determined by the former before employing the latter to reverse the expressions, substituting as you go.  I personally find this to be a bit confusing, so I'm not covering it here

## Conclusion

So, what have we learned?

We now know that the Euclidean algorithm determines the greatest common divisor for two numbers.  It is efficient and fast.

Once we've determined that, we can write Be&#769;zout's identity:

	ax + by = gcd(a, b)

Neat!

Lastly, we know that the extended Euclidean algorithm computes both the `gcd` and the coefficients for Be&#769;zout's identity.  It is extremely useful and can be seen in cryptographic systems like RSA.

My next article well delve into how we can use the extended Euclidean algorithm to calculate the modular multiplicative inverse for any number where the `gcd(a, b) = 1`.

Weeeeeeeeeeeeeeeeeeeeeeee

## References

- http://www.math.cmu.edu/~bkell/21110-2010s/extended-euclidean.html
- http://www-math.ucdenver.edu/~wcherowi/courses/m5410/exeucalg.html
- https://crypto.stanford.edu/pbc/notes/numbertheory/euclid.html
- https://www.di-mgt.com.au/euclidean.html

[Euclid]: https://en.wikipedia.org/wiki/Euclid
[extended Euclidean algorithm]: https://en.wikipedia.org/wiki/Extended_Euclidean_algorithm
[Euclidean algorithm]: https://en.wikipedia.org/wiki/Euclidean_algorithm
[Be&#769;zout's identity]: https://en.wikipedia.org/wiki/B%C3%A9zout%27s_identity
[RSA]: https://en.wikipedia.org/wiki/RSA_(cryptosystem)
[Elements]: https://en.wikipedia.org/wiki/Euclid%27s_Elements
[greatest common divisor]: https://en.wikipedia.org/wiki/Greatest_common_divisor
[number theory]: https://en.wikipedia.org/wiki/Number_theory
[practical applications]: https://www.youtube.com/watch?v=AVrtH6m2wcU
[division algorithm]: https://en.wikipedia.org/wiki/Division_algorithm
[Easy peasy lemon squeezy]: https://www.youtube.com/watch?v=LmToQ1-t98o
[E&#769;tienne Be&#769;zout]: https://en.wikipedia.org/wiki/%C3%89tienne_B%C3%A9zout
[modular multiplicative inverse]: https://en.wikipedia.org/wiki/Modular_multiplicative_inverse
[private key]: https://en.wikipedia.org/wiki/Modular_multiplicative_inverse#Applications
[linear combination]: https://en.wikipedia.org/wiki/Linear_combination
[euclidean_algorithm.c]: https://github.com/btoll/tools/blob/master/c/euclidean_algorithm.c

