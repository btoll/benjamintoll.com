+++
title = "On the Order of an Element"
date = "2019-01-20T15:50:05-05:00"

+++

[Group theory] is a deep pool, and today I'm going to dip in my big toe and cover a very tiny aspect of it: the [order] of an element of a group.  This concept is fundamental to group theory, and I'm always seeing it referenced in articles and posts on cryptography and abstract algebra.

Let's go, I like the math life, baby!

## Definition

Let's first understand the order of a group, denoted as `ord(G)` or `|G|`.  This simply means the [cardinality] of a group, or the total number of its elements.

Now, the order of an element is different from the order of a group.  Denoted as `ord(a)` or `|a|`, it is the smallest positive integer of the set where <code>a<sup>m</sup> = e</code>, where `e` is the [identity element] of the group (0 for addition operations and 1 for multiplication).  Importantly, if no integer `m` exists for the group, then the group has infinite order.

> Since I'm interested in how the order of an integer relates to modern cryptography, all of my examples will be over modulo `n`.
>
> The order of `a modulo n` is denoted as <code>ord<sub>n</sub>(a)</code>.

## Some Examples

In the following examples, we'll be looking for the smallest positive integer that satisfies:

<code>a<sup>m</sup> ≡ 1 mod n</code>

Let's look at an example:

- <b><code>5 mod 13</code></b>

	<pre class="math">
	Let's try the exponents in sequential order:

		5<sup>1</sup> ≡ 5 mod 13
		5<sup>2</sup> ≡ 12 mod 13
		5<sup>3</sup> ≡ 8 mod 13
		5<sup>4</sup> ≡ 1 mod 13	<--- Bingo!

		<b>ord<sub>13</sub>5 = 4</b>

	( So, we say that the order of 5 modulo 13 is 4. )

	What happens if we keep going?

		5<sup>5</sup> ≡ 5 mod 13	<--- Repeats!
		5<sup>6</sup> ≡ 12 mod 13
		5<sup>7</sup> ≡ 8 mod 13
		5<sup>8</sup> ≡ 1 mod 13
		5<sup>9</sup> ≡ 5 mod 13	<--- Repeats!
		5<sup>10</sup> ≡ 12 mod 13
		5<sup>11</sup> ≡ 8 mod 13
		5<sup>12</sup> ≡ 1 mod 13

		<4> = { 5, 12, 8, 1 }
	</pre>

- <b><code>2 mod 11</code></b>

	<pre class="math">
	2<sup>1</sup> ≡ 2 mod 11
	2<sup>2</sup> ≡ 4 mod 11
	2<sup>3</sup> ≡ 8 mod 11
	2<sup>4</sup> ≡ 5 mod 11
	2<sup>5</sup> ≡ 10 mod 11
	2<sup>6</sup> ≡ 9 mod 11
	2<sup>7</sup> ≡ 7 mod 11
	2<sup>8</sup> ≡ 3 mod 11
	2<sup>9</sup> ≡ 6 mod 11
	2<sup>10</sup> ≡ 1 mod 11	<--- Bingo!

	Note that this will repeat as well, but only after
	every element of the group has been represented.

	<b>ord<sub>11</sub>2 = 10</b>

	( So, we say that the order of 2 modulo 11 is 10. )

	<10> = { 2, 4, 8, 5, 10, 9, 7, 3, 6, 1 }
	</pre>

This last example is particularly interesting.  Did you notice that every number in the group is represented?  When this occurs, we refer to the order as a [primitive root of modulo n].  In this instance, the order of the element equals the order of the group:

```|a| = |G|```

Now, let's look at some other ways we can determine the order of an element.

> In the worst case, this method requires a search of the entire space of `n-1`.

## Euler's Totient

Another interesting method of determining the order of an element is by using [Euler's totient function].  This is a faster method, for we don't need to check every element in order in a "brute-force" approach and will only need to check the integers that are divisors of ϕ(n).

Let's look at a theorem that uses [Euler's totient]:

<pre>
ord<sub>n</sub>(a) | ϕ(n) iff gcd(a, n) = 1
</pre>

This says that the order of `a modulo n` divides `ϕ(n)` if and only if their greatest common divisor is 1.

> Instead of searching the entire space for an integer `m` where a<sup>m</sup> ≡ 1 mod n</code>, we only search by the divisors that evenly divide the result of `ϕ(n)`!

This makes more sense with some examples.

- <b><code>5 mod 13</code></b>

	<pre class="math">
	gcd(5, 13) = 1

	Get a set of all numbers relatively prime to the modulus:

		ϕ(13) = 12

	Get the integers that divide evenly into 12:

		1 2 3 4 6 12

	We have 6 candidates:

		5<sup>1</sup> ≡ 5 mod 13
		5<sup>2</sup> ≡ 12 mod 13
		5<sup>3</sup> ≡ 8 mod 13
		5<sup>4</sup> ≡ 1 mod 13

		5<sup>4</sup> is congruent to 1 mod 13, we can stop without
		having to calculate all 6!

	<b>ord<sub>13</sub>5 = 4</b>
	</pre>

- <b><code>2 mod 11</code></b>

	<pre class="math">
	gcd(2, 11) = 1

	Get a set of all numbers relatively prime to the modulus:

		ϕ(11) = 10

	Get the integers that divide evenly into 10:

		1 2 5 10

	We have 4 candidates:

		2<sup>1</sup> ≡ 2 mod 11
		2<sup>2</sup> ≡ 4 mod 11
		2<sup>5</sup> ≡ 10 mod 11
		2<sup>10</sup> ≡ 1 mod 11

		In this case, we calculated every candidate before
		finding one that works.

	<b>ord<sub>11</sub>2 = 10</b>
	</pre>

> Some may have noticed that the theorem to find the smallest positive integer `m` such that <code>a<sup>m</sup> ≡ 1 mod n</code> is very similar to [Euler's theorem]:
>
> <code>a<sup>ϕ(n)</sup> ≡ 1 mod n</code>
>
> While Euler's theorem will give us an integer that is congruent to `1 mod n` (when `a` and `n` are relatively prime, of course), it may not give us the *smallest* positive integer.

## Primitive Roots

This is a topic that really requires its own post, but it's worth mentioning here in this context because an order of an element can also be a primitive root.

If an integer `a` is relatively prime to `p` and `p` is prime, then the following defines a **primitive root modulo p**:

<code>ord<sub>p</sub>(a) = ϕ(p) = p - 1</code>

This is fairly intuitive.

Recall earlier we had the following example where we found 2 to be a primitive root modulo 11:

- <b><code>2 mod 11</code></b>

	<pre class="math">
	ord<sub>11</sub>(2) = ϕ(11)
		     = 11 - 1
		     = 10
	</pre>

Easy peasy.

**Theorem**: There are `ϕ(ϕ(n))` primitive roots modulo `n`.

- How many primitive roots modulo 13?

	<pre class="math">
	ϕ(ϕ(13)) = ϕ(12)
		     = 12(1 - 1/2)(1 - 1/3)
		     = 12(1/2)(2/3)
		     = 4
	</pre>

- How many primitive roots modulo 23?

	<pre class="math">
	ϕ(ϕ(23)) = ϕ(22)
		 = 22(1 - 1/2)(1 - 1/11)
		 = 22(1/2)(10/11)
		 = 10
	</pre>

That's great, but how do you actually determine the primitive roots?  We can use the [reduced residue system]!

- Given the primitive root 2, find the other primitive roots mod 13.

	<pre class="math">
	ϕ(ϕ(13)) = ϕ(12)
		     = 4

	Use the reduced residue system mod ϕ(13).

		- What are the prime factors of 12?

			2 3

		- Filter all the integers from the set that are multiples
		  of those prime factors, i.e., where `gcd(k, n) != 1`:

			{ 1, 5, 7, 11 }

	Next, raise the known primitive root to those integers:

		2<sup>1</sup> ≡ 2 mod 13
		2<sup>5</sup> ≡ 6 mod 13
		2<sup>7</sup> ≡ 11 mod 13
		2<sup>11</sup> ≡ 7 mod 13

	In order, the other primitive roots are:

		{ 2, 6, 7, 11 }
	</pre>

- Given the primitive root 5, find the other primitive roots mod 23.

	<pre class="math">
	ϕ(ϕ(23)) = ϕ(22)
		     = 10

	Use the reduced residue system mod ϕ(23).

		- What are the prime factors of 22?

			2 11

		Filter all the integers from the set that are multiples
		of those prime factors, i.e., where `gcd(k, n)`:

			{ 1, 3, 5, 7, 9, 13, 15, 17, 19, 21 }

	Next, raise the known primitive root to those integers:

		5<sup>1</sup> ≡ 5 mod 23
		5<sup>3</sup> ≡ 10 mod 23
		5<sup>5</sup> ≡ 20 mod 23
		5<sup>7</sup> ≡ 17 mod 23
		5<sup>9</sup> ≡ 11 mod 23
		5<sup>13</sup> ≡ 21 mod 23
		5<sup>15</sup> ≡ 19 mod 23
		5<sup>17</sup> ≡ 15 mod 23
		5<sup>19</sup> ≡ 7 mod 23
		5<sup>21</sup> ≡ 14 mod 23

	In order, the other primitive roots are:

		{ 5, 7, 10, 11, 14, 15, 17, 19, 20, 21 }
	</pre>

> Oftentimes, you'll only need to try a handful of integers in the space `p-1` before you find a primitive root modulo p.

Weeeeeeeeeeeeeeeeeeeeeeeee

## Conclusion

As I noted, this is only a brief excursion into some basic group theory, and specifically, the order of an element.  I find both group theory and number theory immensely fascinating, addictive and helpful, and although I don't necessarily "use" any of them when I'm programming, they have greatly increased my problem solving skills!

There is definitely more I'd like to cover at some point that relates to this post and to [modular arithmetic] in general, such as congruence classes, but that will have to wait until another post.

## References

- [Order of Integers and Primitive Roots]
- [Cyclic Groups]
- [multiplicative group modulo p]

[Group theory]: https://en.wikipedia.org/wiki/Group_theory
[order]: https://en.wikipedia.org/wiki/Order_(group_theory)
[cardinality]: https://en.wikipedia.org/wiki/Cardinality
[identity element]: https://en.wikipedia.org/wiki/Identity_element
[primitive root of modulo n]: https://en.wikipedia.org/wiki/Primitive_root_modulo_n
[Euler's totient function]: /2019/01/14/on-coding-eulers-totient-function/
[Euler's totient]: https://en.wikipedia.org/wiki/Euler's_totient_function
[Euler's theorem]: /2018/07/15/on-eulers-theorem/
[reduced residue system]: https://en.wikipedia.org/wiki/Reduced_residue_system
[modular arithmetic]: https://en.wikipedia.org/wiki/Modular_arithmetic
[Order of Integers and Primitive Roots]: https://www.youtube.com/watch?v=IviYLdqmIdw
[Cyclic Groups]: https://www.youtube.com/watch?v=8A84sA1YuPw
[multiplicative group modulo p]: https://www.di-mgt.com.au/multiplicative-group-mod-p.html

