+++
title = "On Exponentiation By Squaring, Revisited"
date = "2019-01-18T19:34:14-05:00"

+++

I was rereading [my post on exponentiation by squaring], and I realized that I had approached it solely from the point of view of a programmer.  That was not necessarily my intention, as I wanted to also show how to use this approach to reduce large exponents with just pencil and paper.  This follow-up post will use a more hands-on approach.

---

It happens frequently when dealing with large exponents in cryptography that the expression cannot be computed using a device with insufficient memory, as the exponent could be hundreds or thousands of digits long.  So, what to do?  We can use [modular exponentiation] to reduce the number a step at a time into smaller and more manageable magnitudes, that's what.

Let's get started!

> Exponentiation refresher:
>
> <pre class="math">
> 3<sup>5 * 7</sup> = 3<sup>5<sup>7</sup></sup>
> 3<sup>5 + 7</sup> = 3<sup>5</sup> * 3<sup>7</sup>
> </pre>
>
> These equivalences become important in reducing large exponents, as we'll see below.

# Exponentiation by Squaring

Let's begin with a simple example.  Obviously, the exponent is small enough that we could compute it with a calculator, but we'll do it by hand anyways to illustrate the point (and it's fun!).

<pre class="math">
3<sup>76</sup> mod 11

1. Reduce using exponentiation by squaring.

	3<sup>1</sup> mod 11 ≡ 3 mod 11

	3<sup>2</sup> mod 11 ≡ 9 mod 11

	3<sup>4</sup> mod 11 ≡ 3<sup>2+2</sup> mod 11
		      ≡ 3<sup>2</sup> * 3<sup>2</sup> mod 11
		      ≡ 9 * 9 mod 11
		      ≡ 81 mod 11
		      ≡ 4 mod 11

	3<sup>8</sup> mod 11 ≡ 3<sup>4+4</sup> mod 11
		      ≡ 3<sup>4</sup> * 3<sup>4</sup> mod 11
		      ≡ 4 * 4 mod 11    <--- We substitute here using the result of 3<sup>4</sup>
		      ≡ 16 mod 11
		      ≡ 5 mod 11

	3<sup>16</sup> mod 11 ≡ 3<sup>8+8</sup> mod 11
		      ≡ 5 * 5 mod 11
		      ≡ 25 mod 11       <--- Substitute!
		      ≡ 3 mod 11

	3<sup>32</sup> mod 11 ≡ 3<sup>16+16</sup> mod 11
		      ≡ 3 * 3 mod 11    <--- Substitute!
		      ≡ 9 mod 11

	3<sup>64</sup> mod 11 ≡ 3<sup>32+32</sup> mod 11
		      ≡ 4 mod 11        <--- Substitute!

	- Do the binary expansion of the base<sub>10</sub> exponent
	- and write the exponent anew, substituting in
	- the power of 2s where the bit is 1.
	76<sub>10</sub> = 0100 1100<sub>2</sub>
	3<sup>64+8+4</sup> mod 11
	3<sup>64</sup> * 3<sup>8</sup> * 3<sup>4</sup> mod 11

	- Substitute and calculate!
	4 * 5 * 4 mod 11
	80 mod 11
	<b>3</b> mod 11

2. Reduce by Euler's theorem.

	3<sup>ϕ(11)</sup> ≡ 1 mod 11
	3<sup>10</sup> ≡ 1 mod 11
	3<sup>10*7+6</sup> mod 11
	3<sup>10<sup>7</sup></sup> * 3<sup>6</sup> mod 11
	1<sup>7</sup> * 3<sup>6</sup> mod 11
	729 mod 11
	<b>3</b> mod 11
</pre>

Let's do another example, and afterwards we'll go into more detail about what we just did.

---

Now, let's take a number that is raised to a large exponent modulus a number `n`:

<code>7<sup>17684</sup> mod 58</code>

Next, we'll continually reduce the exponent and calculate, further reducing the congruence when we can.

> Note that this "large" number is actually rather small when it comes to cryptography!

<pre class="math">
7<sup>1</sup> mod 58 ≡ 7 mod 58

7<sup>2</sup> mod 58 ≡ 49 mod 58

7<sup>4</sup> mod 58 ≡ 7<sup>2+2</sup> mod 58
	      ≡ 7<sup>2</sup> * 7<sup>2</sup> mod 58
	      ≡ 49 * 49 mod 58
	      ≡ 2401 mod 58
	      ≡ 23 mod 58

7<sup>8</sup> mod 58 ≡ 7<sup>4+4</sup> mod 58
	      ≡ 7<sup>4</sup> * 7<sup>4</sup> mod 58
	      ≡ 23 * 23 mod 58
	      ≡ 529 mod 58
	      ≡ 7 mod 58

7<sup>16</sup> mod 58 ≡ 7<sup>8+8</sup> mod 58
	       ≡ 7<sup>8</sup> * 7<sup>8</sup> mod 58
	       ≡ 7 * 7 mod 58
	       ≡ 49 mod 58
	       ≡ -9 mod 58

7<sup>32</sup> mod 58 ≡ 7<sup>16+16</sup> mod 58
	       ≡ 7<sup>16</sup> * 7<sup>16</sup> mod 58
	       ≡ -9 * -9 mod 58
	       ≡ 81 mod 58
	       ≡ 23 mod 58

7<sup>64</sup> mod 58 ≡ 7<sup>32+32</sup> mod 58
	       ≡ 7<sup>32</sup> * 7<sup>32</sup> mod 58
	       ≡ 23 * 23 mod 58
	       ≡ 529 mod 58
	       ≡ 7 mod 58

7<sup>128</sup> mod 58 ≡ 7<sup>64+64</sup> mod 58
	       ≡ 7<sup>64</sup> * 7<sup>64</sup> mod 58
	       ≡ 7 * 7 mod 58
	       ≡ -9 mod 58

7<sup>256</sup> mod 58 ≡ 7<sup>128+128</sup> mod 58
	       ≡ -9 * -9 mod 58
	       ≡ 81 mod 58
	       ≡ 23 mod 58

7<sup>512</sup> mod 58 ≡ 7<sup>256+256</sup> mod 58
	       ≡ 23 * 23 mod 58
	       ≡ 7 mod 58

7<sup>1024</sup> mod 58 ≡ 7<sup>512+512</sup> mod 58
	       ≡ 7 * 7 mod 58
	       ≡ -9 mod 58

7<sup>2048</sup> mod 58 ≡ 7<sup>1024+1024</sup> mod 58
	       ≡ -9 * -9 mod 58
	       ≡ 23 mod 58

7<sup>4096</sup> mod 58 ≡ 7<sup>2048+2048</sup> mod 58
	       ≡ 23 * 23 mod 58
	       ≡ 7 mod 58

7<sup>8192</sup> mod 58 ≡ 7<sup>4096+4096</sup> mod 58
	       ≡ 7 * 7 mod 58
	       ≡ -9 mod 58

7<sup>16384</sup> mod 58 ≡ 7<sup>8192+8192</sup> mod 58
	       ≡ -9 * -9 mod 58
	       ≡ 23 mod 58
</pre>

Some things to note:

- Substitutions with prior calculations can be made every time the exponent is squared.

	For example, we already calculated 7<sup>128</sup> mod 58 and know that it is congruent to -9 mod 58, so when we next see 7<sup>128</sup> * 7<sup>128</sup> mod 58 we can automatically substitute that expression for -9 * -9 mod 58 (and we can substitute even further if we wish and cut it even more intermediate calculations).

- We stop when the next squared exponent is greater than the exponent we're calculating.  In other words:

	```16384 < 17684 < 32768```

Sweet.  Now onto...

## Binary Expansion

The last step is to write out our large exponent in binary form, that is, to do a binary expansion:

<code>17684<sub>10</sub> = 0100 0101 0001 0100<sub>2</sub></code>

We note that there is a 1 in the following places:

- 16384
- 1024
- 256
- 16
- 4

Substituting these for 7<sup>17684</sup>, we get:

<code>7<sup>16384+1024+256+16+4</sup> mod 58</code>

That, of course, can be rewritten as:

<code>7<sup>16384</sup> * 7<sup>1024</sup> * 7<sup>256</sup> * 7<sup>16</sup> * 7<sup>4</sup> mod 58</code>

This should now look familiar!  We've already computed these expressions above, so let's simply plug in the results and calculate:

<pre class="math">
23 * -9 * 23 * -9 * 23 mod 58
23<sup>3</sup> * 81 mod 58
985527 mod 58
<b>49</b> mod 58
</pre>

Neat!

> We can see that the number takes up 15 bits of storage:
>
> ```Math.ceil(Math.log2(17684))```

## Euler's Theorem

A really nice way to reduce the large exponent is by using [Euler's theorem], but only if the base is coprime to the modulus (another way to think of it is if the greatest common divisor of both numbers is 1).  In our case they are relatively prime to each other, so we're in luck!

Recall Euler's theorem:

<code>a<sup>ϕ(n)</sup> ≡ 1 mod n</code>

Let's get to work!

<pre class="math">
7<sup>17684</sup> mod 58

7<sup>ϕ(58)</sup> ≡ 1 mod 58

Let's calculate ϕ(58):
	ϕ(58) = 58(1 - 1/2)(1 - 1/29)*
	ϕ(58) = 58(1/2)(28/29)
	ϕ(58) = 28

7<sup>28</sup> ≡ 1 mod 58

Let's use the <a href="https://en.wikipedia.org/wiki/Division_algorithm">division algorithm</a> to reduce the large exponent
(the result of the phi function will be the divisor):
	n = dq + r, where 0 <= r < d
	17684 = 28(631) + 16

	7<sup>(28*631+16)</sup> mod 58
	7<sup>28<sup>631</sup></sup> * 7<sup>16</sup> mod 58

	Recall that 7<sup>28</sup> ≡ 1 mod 58, so we can substitute:
		1<sup>631</sup> * 7<sup>16</sup> mod 58
		1 * 7<sup>16</sup> mod 58
		7<sup>16</sup> mod 58

	An exponent of 16 is much better to compute than one of 17684!
		33232930569601 mod 58
		49 mod 58

* The numbers 2 and 29 are the prime factorization of 58.
</pre>

> If any of these computations seem unfamiliar, please see my articles on [Euler's theorem] and [coding Euler's totient function].

## Conclusion

This is some cool shit, man.

[my post on exponentiation by squaring]: /2019/01/02/on-exponentiation-by-squaring/
[modular exponentiation]: https://en.wikipedia.org/wiki/Modular_exponentiation
[Euler's theorem]: /2018/07/15/on-eulers-theorem/
[coding Euler's totient function]: /2019/01/14/on-coding-eulers-totient-function/

