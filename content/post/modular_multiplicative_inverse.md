+++
title = "On the Modular Multiplicative Inverse"
date = "2019-01-01T12:47:58-05:00"

+++

In my [last post], I detailed how you can use the extended Euclidean algorithm to not only determine the greatest common divisor of two numbers but also to determine [Be&#769;zout's coefficients]. This is crucial in determining the modular multiplicative inverse of a number and has practical applications in cryptosystems such as [RSA].  Let's dig in.

> I'm not going to describe either the [Euclidean algorithm] or the [extended Euclidean algorithm] again, so please refer to my [last post] for a refresher.

## The Modular Multiplicative Inverse

First, let's define the [multiplicative inverse]:

- A multiplicative inverse or reciprocal is a number <code>x<sup>-1</sup></code> such that when multiplied with `x` yields the [multiplicative identity], the number 1.

- More formally, in [group theory], one axiom of a group is [invertibility] that says there is an element that can undo the effect of combination with another given element.  The result is the [identity element].

<pre class="math">
The identity element for multiplication is 1.

xx<sup>-1</sup> = 1
x<sup>-1</sup>x = 1

x = 5

1 = 5 * 1/5
  = 5 * .2
  = 1

---

x = .125

1 = .125 * 1/.125
  = .125 * 8
  = 1
</pre>

> The identity element is a member of a set that helps to satisfy another condition of a [group]!

Easy peasy.

Now, let's look the *modular* multiplicative inverse.  Again, this is an operation that will also result in 1, the difference being that it is congruent to, not equal to, 1.  This is important and implies that there is more than one result that can be a modular multiplicative inverse.

<code>a ≡ x<sup>-1</sup> mod m ⇔ ax ≡ 1 mod m</code>

So, in the above notation, the number `x` is a multiplicative inverse of the number `a` if the product `ax` is congruent to 1, modulus `m`.

> There can only be a [modular multiplicative inverse] if both `a` and `m` are coprime.
>
> Recall that another way to say that two numbers are coprime or relatively prime is that their greatest common divisor is 1.
>
> `gcd(a, m)` = 1

## Example

Let's look at an example of "brute forcing" by trying a range of numbers sequentially from `1 < m` (we don't try `m` since `m % m == 0`, i.e., it is the same as 0):

<pre class="math">
a = 5
m = 17

5 ≡ d<sup>-1</sup> mod 17
5d ≡ 1 mod 17

# Again, we're only trying numbers
# less than the modulus!
#
#	5d ≡ 1 mod 17
#
# We'll use our workhorse `bc`.
$ for d in {1..16}
> do
> bc <<< 5*$d%17
> done
5
10
15
3
8
13
1      	   <--- Bingo!
6
11
16
4
9
14
2
7
12

In this case, d = 7.  Let's verify that.

5(7) ≡ 1 mod 17
35 ≡ 1 mod 17
35 mod 17 ≡ 1
1 ≡ 1

So, 7 is the modular multiplicative inverse of 5!
</pre>

> Did you notice anything interesting about the results of that loop?  All of the numbers are represented in the range 1 < `m`!  Neat!

One thing that's very important to note is that modulus operations will have an infinite number of multiplicative inverses.  This is because of the nature of [modular arithmetic]: when reaching a certain value, i.e., the modulus, the numbers will "wrap around".

For example, think of the 12-hour clock as having the modulus 12.  So 1, 13, 25, 37, etc. are all values congruent to 1.

Let's see what happens when we raise the upper bound of our range to be greater than the modulus.

> We'll use the helper program [priv_key.c], and we'll use it like this:

> 		Usage: priv_key <e> <mod> <bound>
>
> 		    e = The integer for which we're looking for
>		        the multiplicative inverse.
> 		  mod = The modulus.
> 		bound = The number of times to loop.
>		        Defaults to the modulus.
>
> 	Remember, we're solving `d` for `ed ≡  1 mod m`

First, let's calculate the previous result using our new tool so we can compare the result.

Here, we're looking for a number that when multiplied by 5 is congruent with 1 modulus 17.  We'll try numbers 1 - 16, inclusive.

	$ priv_key 5 17 16
	7


Let's increase the bound to 100 (trying numbers 1 - 100):

	$ priv_key 5 17 100
	7 24 41 58 75 92

And 500 (trying numbers 1 - 500):

	$ priv_key 5 17 500
	7 24 41 58 75 92 109 126 143 160 177 194 211 228 245 262 279 296 313 330 347 364 381 398 415 432 449 466 483 500

This demonstrates a couple of things:

1. As previously mentioned, when a modular multiplicative inverse can be found, there are an infinite number of them.

2. All of the inverses are 17 greater than the previous one, which is the value of the modulus!  The numbers wrap around just like the 12-hour clock!  All of the numbers `mod 17` above are in the same [congruence class].

> Keep in mind that for numbers that are tens or hundreds of digits long that it is impractical to use a brute-force approach to finding the inverse like the `priv_key` does.  In these case, the extended Euclidean algorithm is the way to go.

## Computation

We'll now look at two ways to compute the modular multiplicative inverse:

- the extended Euclidean algorithm
- Euler's theorem

We'll work with the same values for both algorithms:

a = 17, m = 37

### The Extended Euclidean Algorithm

The following should look familiar from what we've already covered.  I've also [written about it] previously.

<pre class="math">
ax + my = gcd(a, m) = 1 ⇔ ax - 1 = (-y)m ⇔ ax ≡ 1 mod m
</pre>

> You'll also see this as part of the RSA algorithm to determine the private key `d`
> in the <a href="https://en.wikipedia.org/wiki/RSA_(cryptosystem)#Key_generation">key generation</a> step:
>
> <pre class="math">
> d ≡ e<sup>-1</sup> mod n ⇔ de ≡ 1 mod n
> </pre>

### Example

<!--
Let's verify that it's equal to 1!

1 = 69(1093) - 88(857)
1 = 75417 - 75416
1 = 1

gcd(1093, 857) = 1093x + 857y
	           = 1093(<b>69</b>) - 857(<b>88</b>)
	           = 1
-->

<pre class="math">
<b>gcd(17, 37)</b>

a = 37, b = 17

Step 1:
	n = 37
	d = 17
	q = 2
	r = n % d = 3

	3 = 37 - 17(2)
	3 = a - 2b

Step 2:
	Is r > 1? Yes.

Step 1:
	n = 17
	d = 3
	q = 5
	r = n % d = 2

	2 = 17 - 3(5)
	2 = b - 5(a - 2b)
	2 = b - 5a + 10b
	2 = -5a + 11b

Step 2:
	Is r > 1? Yes.

Step 1:
	n = 3
	d = 2
	q = 1
	r = n % d = 1

	1 = 3 - 2(1)
	1 = a - 2b - 1(-5a + 11b)
	1 = a - 2b + 5a - 11b
	1 = 6a - 13b

Step 2:
	Is r > 1? No!

Step 3:
	1 = 6a - 13b
	1 = 6(37) - 13(17)
	1 = 222 - 221
	1 = 1

So, we've learned the gcd is 1 (but we knew that already since
both numbers were prime and that is the prerequisite for computing
the modular multiplicative inverse!).

The coefficients are 6 and -13, respectively (recall that one of
the numbers will always be negative).

gcd(17, 37) = 6a + -13m

Finally, let's determine the inverse.  This is the easy part;
simply subtract the Be&#769;zout's coefficient that we computed
from the modulus:

37 - 13 = <b>24</b>

Let's verify:

17(<b>24</b>) ≡ 1 mod 37
408 ≡ 1 mod 37
1 ≡ 1 mod 37
</pre>

> Why can we subtract one of the Be&#769;zout's coefficients from the modulus to get the inverse?  Recall that any two numbers whose difference equals the modulus are congruent to each other:
>
> <pre class="math">
> <a href="https://www.wolframalpha.com/input/?i=58+is+congruent+to+1+mod+57">58 ≡ 1 mod 57</a>
> <a href="https://www.wolframalpha.com/input/?i=-27+is+congruent+to+30+mod+57">-27 ≡ 30 mod 57</a>
>
> And again, from the example above:
> <a href="https://www.wolframalpha.com/input/?i=-13+is+congruent+to+24+mod+37">-13 ≡ 24 mod 37</a>
>
> We subtract from the modulus, since we want the inverse to
> be an element of the group, that is, within the range <b>1 < m</b>.
> </pre>

### Euler's Theorem

[Euler's theorem], as I've [covered previously], states that when `a` and `n` are coprime that:

a<sup>ϕ(m)</sup> ≡ 1 mod m

Now, let's rewrite it so we're solving for the inverse of `a`, <b>a<sup>-1</sup></b>:

a<sup>ϕ(m)</sup> ≡ 1 mod m ⇔ a<sup>ϕ(m)-1</sup> ≡ a<sup>-1</sup> mod m

### Example

So, plugging in our values, we're now solving for:

17<sup>ϕ(37)-1</sup> ≡ a<sup>-1</sup> mod 37

We'll solve this by reducing the terms every chance we get.  Let's go!

<pre class="math">
17<sup>35</sup> mod 37
≡ 17 * 17<sup>34</sup>
≡ 17 * 289<sup>17</sup>
≡ 17 * 30<sup>17</sup>
≡ 17 * 30 * 30<sup>16</sup>
≡ 17 * 30 * -7<sup>16</sup>
≡ 17 * 30 * 7<sup>16</sup>
≡ 17 * 30 * 49<sup>8</sup>
≡ 17 * 30 * 12<sup>8</sup>
≡ 17 * 30 * 144<sup>4</sup>
≡ 17 * 30 * -4<sup>4</sup>
≡ 17 * 30 * 4<sup>4</sup>
≡ 17 * 30 * 16<sup>2</sup>
≡ 17 * 30 * 256
≡ 17 * 30 * 34
≡ <b>24</b>

Cool, it's the same value we got from using the extended Euclidean algorithm!

Let's verify:

24<sup>ϕ(37)</sup> ≡ 1 mod 37
24<sup>36</sup> ≡ 1 mod 37
1 ≡ 1 mod 37

If this feels unfamiliar or awkward, consult the links in the `References`
section and brush up on your modular arithmetic.
</pre>

### Drawbacks to Euler's Theorem

- It may be impractical, however, to find the inverse using Euler's theorem if the modular isn't prime and is very large.  To illustrate, can you compute the following?:

	ϕ(25<sup>777777</sup>)

	That number, by the way, is well over a million digits long!  Have fun!

- It is usually easier to compute the inverse using the extended Euclidean algorithm.

> Recall [Euler's totient function], also known as the `phi` function, counts the number of integers up to some number `n` that are coprime to `n`.  It is symbolized by either `φ` or ϕ.
>
> Also, recall that neither number has to be prime, although it is easier to calculate if the modulus is prime, i.e.:
>
> <pre class="math">
> ϕ(p) = p - 1
>
> p = 17
> ϕ(17) = 16
> </pre>

<pre class="math">
<b>Just For Fun</b>

a = 9
m = 17

ϕ(a) = 6
ϕ(m) = 16

ϕ(am) = <a href="https://www.wolframalpha.com/input/?i=%CF%95(9)%CF%95(17)">ϕ(a)ϕ(m)</a>
</pre>

## Conclusion

I've found the modular multiplicative inverse to be a difficult topic to write about.  It is necessary to at least understand the fundamentals of many different aspects of mathematics; namely, number theory, group theory, modular arithmetic and modular exponentiation.

As an autodidact, it took me a tremendous amount of time to wade through the copious amounts of information on each subject, and then loads more time in trying to arrange the narrative into something cohesive.  Hopefully, the reader will bear this in mind if they are unnecessarily confused and/or find mistakes, and [I welcome any and all corrections and suggestions].

## References

- https://www.di-mgt.com.au/multiplicative-group-mod-p.html
- https://www.quora.com/How-do-I-calculate-8-%E2%80%931-mod-77-using-Eulers-Theorem/
- https://math.stackexchange.com/questions/747342/extended-euclidean-algorithm-for-modular-inverse/
- https://math.stackexchange.com/questions/1307082/use-eulers-theorem-to-find-the-inverse-of-17-modulo-31-in-the-range-1-30/
- https://www.di-mgt.com.au/rsa_alg.html

[last post]: /2018/12/28/on-the-extended-euclidean-algorithm/
[Be&#769;zout's coefficients]: https://en.wikipedia.org/wiki/B%C3%A9zout%27s_identity
[RSA]: https://en.wikipedia.org/wiki/RSA_(cryptosystem)
[Euclidean algorithm]: https://en.wikipedia.org/wiki/Euclidean_algorithm
[extended Euclidean algorithm]: https://en.wikipedia.org/wiki/Extended_Euclidean_algorithm
[multiplicative inverse]: https://en.wikipedia.org/wiki/Multiplicative_inverse
[multiplicative identity]: https://en.wikipedia.org/wiki/1#Mathematics
[group theory]: https://en.wikipedia.org/wiki/Group_theory
[invertibility]: https://en.wikipedia.org/wiki/Inverse_element
[identity element]: https://en.wikipedia.org/wiki/Identity_element
[group]: https://en.wikipedia.org/wiki/Group_(mathematics)
[modular multiplicative inverse]: https://en.wikipedia.org/wiki/Modular_multiplicative_inverse
[modular arithmetic]: https://en.wikipedia.org/wiki/Modular_arithmetic
[my little friend]: https://www.youtube.com/watch?v=3MDHL0xnPpA
[priv_key.c]: https://github.com/btoll/tools/blob/master/c/priv_key.c
[is_prime.c]: https://github.com/btoll/tools/blob/master/c/is_prime.c
[congruence class]: https://en.wikipedia.org/wiki/Modular_arithmetic#Congruence_class
[written about it]: /2018/12/28/on-the-extended-euclidean-algorithm/
[Euler's theorem]: https://en.wikipedia.org/wiki/Euler%27s_theorem
[covered previously]: /2018/07/15/on-eulers-theorem/
[Euler's totient function]: https://en.wikipedia.org/wiki/Euler%27s_totient_function
[I welcome any and all corrections and suggestions]: /contact/

