+++
title = "On RSA"
date = "2018-07-09T16:11:19-04:00"

+++

The [RSA] cryptosystem, named after Ron Rivest, Adi Shamir, and Leonard Adleman, the MIT professors that first publicly described it in 1978, is the most copied software in history.  It is an asymmetric encryption system, meaning that there are "public" and "private" keys which act as inverse operations and are mathematically related.  Because RSA and other asymmetric cryptographic algorithms are slow, they are generally used to encrypt a shared symmetric key during initial communication (the handshake) which is then used for all further communication.

> A British mathematician named [Clifford Cocks] actually discovered this in 1973 while working for [Government Communications Headquarters (GCHQ)], although this was not known until 1997 when the information was declassified.

Its strength relies upon the infeasibility of determining the prime factors of a large composite number `n`.

### First, Some Housekeeping

> ### Symbols
>
>≡ The [congruence relation]. Numbers are congruent if they have the same remainder some modulo `n`.  For example, the following numbers 37 and 57 are said to be congruent modulo 10:
>
>		37 ≡ 57 mod 10
>		37 mod 10 = 57 mod 10
>
> ϕ or φ The Greek letter `phi`.
>
> ### [Euler's totient function]
>
> Also known as Euler's phi function, this function counts the number of positive integers from 1 to a positive integer `n` that are coprime to `n`.
>
> For example:
>
>		ϕ(10) = 4
>			- In the range 1-10 (inclusive), 1,3,7,9 are coprime to 10.
>
>		ϕ(9) = 6
>			- In the range 1-9 (inclusive), 1,2,4,5,7,8 are coprime to 9.
>
> Calculating ϕ(n) of large numbers can be difficult and time-consuming except in one case...prime numbers!  For them, simply do ϕ(n-1).  So:
>
>		ϕ(1117) = 1116
>		ϕ(13) = 12
>
> This makes sense, since prime numbers have no factors besides itself and 1 (obviously, every number can be factored by 1).
>
> The phi function is also multiplicative:
>
>		ϕ(a*b) = ϕ(a) * ϕ(b)
>
> So, if `n` is the product of two distinct prime numbers `p` and `q`, this can be written as:
>
>		ϕ(n) = ϕ(p) * ϕ(q)
>		or
>		ϕ(n) = (p-1) * (q-1)
>
> Needless to say, the phi function is very important in the field of cryptography and for implementing RSA, specifically.

### The Algorithm

We're calculating the public key `(e, n)` and the private key `(d)`.  Sometimes you'll see the modulus included with the private key as well `(d, m)`.

Steps to implement RSA:

1. Use two distinct large prime numbers `p` and `q`.

2. Calculate `n=pq`.  The product of this will be the modulus `n`, also known as the key length.

3. Determine `ϕ(n)`, i.e., compute Euler's totient function.  This value **must** be kept private.  The result counts the number of integers that are relatively prime to `n` (up to a given integer `n`).  It is from this set of numbers that `e` is chosen in step 4.

	Recall:

		ϕ(n) ≡ ϕ(p) * ϕ(q)
		or
		ϕ(n) ≡ (p - 1)(q - 1)

	Note that this is easy to do **only** if the prime factorization of `n` is known, since determining the prime factors of some very large composite number `n` is a very difficult problem, even when `n` is publicly known (as it is).

	> Remember that determing the `phi()` of a prime number is very easy...just subtract one!

4. Choose an integer as the public key `e` using the result from the previous step. The choice **must** be constrained by the following two rules:

		- 1 < e < ϕ(n)
		- Coprime to ϕ(n), that is, gcd(e, ϕ(n)) = 1

	For example, given ϕ(10) = 6, `e` can only be 7, since 1, 2, 3, 4 are factors of either `n` or ϕ(n).

    > Recall that the [gcd] of two or more integers is the greatest number that divides are of them evenly.

5. Determine the private key `d` from the public key `e`.  This is a one-way [trapdoor function] to reverse the public key `(e, n)`.  It is the [modular multiplicative inverse] of the public key, which says that for an integer `a`, the  product of that number with an integer `x` is congruent to 1 modulus `m`:

		ax ≡ 1 mod (m)

	Another way of thinking of this is that `ax - 1` divides equally by the modulus `m`.

	So, in the context of ϕ(n), if we start with:

		d ≡ e^-1 mod ϕ(n)

	we can mulitply both sides by the inverse of `e^-1` to get the statement:

		d*e ≡ 1 mod ϕ(n)

	This statement will determine the modular multiplicative inverse of the number `e` that was chosen from the previous step.  In essence, we need to find a value for `d` that equals 1.

Again, take notice that the calculation depends on knowing `ϕ(n)`, which in turn requires knowledge of the primes:

		ϕ(n) ≡ (p - 1)(q - 1)

Knowing the prime factorization of the modulo `n` is infeasible for traditional computing (not so with quantum computers!), and this is where the strength of the algorithm lies.

> Also recall that `n`, `e` and the encrypted result are publicly known.  Because of math, this is still insufficient for an adversary to reverse the prime factorization!

### Computing the Keys

> I have written concise [JavaScript helper scripts] to calculate some of the steps outlined above.  I found it to be very instructive to do, and I encourage anyone to do the same to assist in really internalizing how the algorithm works.  In addition, the command-line calculator [bc] is invaluable.
>
> Actually, forget all that.  Use pencil and paper :)

Choose two distinct prime numbers:

```
$ ./is_prime.js 17
true
$ ./is_prime.js 19
true
```

Or, using Bash:

```
$ for i in {2..4}
> do
> if [[ $(bc <<< 17%$i) -eq 0 || $(bc <<< 19%$i) -eq 0 ]]
> then
> echo $i
> fi
> done
```

If nothing printed to `stdout`, then both numbers are prime!

> Note the range `{2..4}`.  This is because we only need to test to the square root of the number `n`, floored.  In addition, we can exclude 1 since it factors into every number.

Calculate the ϕ function:

```
ϕ(n) ≡ (p - 1)(q - 1)

$ ./eulers_totient_func.js 17 19
phi(323) = 288
```

Or, using Bash:

```
$ bc <<< 17*19 && bc <<< 16*18
323
288
```

Now that ϕ(323) has been calculated, it's time to choose a public key `e`.  Recall the two conditions:

	- 1 < e < ϕ(323)
	- Coprime to ϕ(323), that is, gcd(e, ϕ(323)) = 1

So, in the range 1..287 (remember, one less than ϕ(n)), I'll choose 5.  But is 5 coprime with 288?

```
$ echo "288%5" | bc
3
```

Yes, it is.  If 5 were a factor of 288, the result would be 0.

Now, there is the very important step of calculating the private key `d`, which **must** be the modular multiplicative inverse of `e`.  In other words, it's necessary to find a multiple `d` by public key `e` modulo `n` where the result is 1.

Recall:

```
d ≡ e^-1 mod ϕ(n)
or
d*e ≡ 1 mod ϕ(n)
```

So, in the context of the variables that have already been determined, the equation will look like this:

```
5d ≡ 1 mod ϕ(323)
```

In order to find a multiple of 5 that satisfies the equation, i.e., equals 1, substitute for `d` with the range `1..ϕ(323)`.

<pre class="math">
5(1) mod 288 = 5
5(2) mod 288 = 10
5(3) mod 288 = 15
5(4) mod 288 = 20
5(5) mod 288 = 25
...
5(172) mod 288 = 284
5(173) mod 288 = 1 	<------ # Bingo!
5(174) mod 288 = 6
...
5(287) mod 288 = 283
5(288) mod 288 = 0
5(289) mod 288 = 5 	<------ # Pattern starts to repeat here!
5(290) mod 288 = 10		# If unfamiliar with this,
5(291) mod 288 = 15		# research <a href="https://en.wikipedia.org/wiki/Modular_arithmetic">modular arithmetic</a>.
5(292) mod 288 = 20
5(293) mod 288 = 25
...
</pre>

>		$ ./priv_key.js 5 288
>		173

Note that in this example there was only one number whose result satisfied the equation, but oftentimes there is more than one number from which to choose.

> Or, using Bash:
>
>
>		$ for i in {1..288}
>		> do
>		> if [[ $(bc <<< 5*$i%288) -eq 1 ]]
>		> then
>		> echo $i
>		> fi
>		> done
>		173
>
>		for i in {1..288}; do
>			if [[ $(bc <<< 5*$i%288) -eq 1 ]]; then
>				echo $i
>			fi
>		done

Now that the public/private keys have been computed, it's a snap to use the one-way functions to encrypt and decrypt all of the secret communications.

### Encryption and Decryption Operations

Given the public key:

    ( e = 5, n = 323 )

we're calculating the cipher text `c` given the plain text message `m`:

    c ≡ m^e mod n

>		$ bc <<< 10^5%323
>		193

Given the private key:

    ( d = 173 )

we're calculating the message `m` given the cipher text `c`:

	m ≡ c^d mod n

>		$ bc <<< 193^173%323
>		10

Again, the operations are inverses of each other, which satisfy the equation

	d*e = 1 mod ϕ(n)

	bc <<< 5*173%288

It's also worth noting that the following are true:

	(m^e)^d mod n = m^(e*d) mod n

	(c^d)^e mod n = c^(d*e) mod n

> Using Bash:
>
>		echo "(10^5)^173%323 == 10^(5*173)%323" | bc
>		echo "(193^173)^5%323 == 193^(173*5)%323" | bc

So cool!

If you've made it this far, here is an [RSA Calculator].

[RSA]: https://en.wikipedia.org/wiki/RSA_(cryptosystem)
[Clifford Cocks]: https://en.wikipedia.org/wiki/Clifford_Cocks
[Government Communications Headquarters (GCHQ)]: https://en.wikipedia.org/wiki/Government_Communications_Headquarters
[congruence relation]: https://en.wikipedia.org/wiki/Modular_arithmetic#Congruence_relation
[Euler's totient Function]: https://en.wikipedia.org/wiki/Euler_totient_function
[gcd]: https://en.wikipedia.org/wiki/Greatest_common_divisor
[trapdoor function]: https://en.wikipedia.org/wiki/Trapdoor_function
[modular multiplicative inverse]: https://en.wikipedia.org/wiki/Modular_multiplicative_inverse
[JavaScript helper scripts]: /2018/07/15/on-the-rsa-helper-scripts/
[primality]: https://en.wikipedia.org/wiki/Primality_test
[bc]: https://fedoramagazine.org/bc-command-line-calculator/
[RSA calculator]: https://www.cs.drexel.edu/~jpopyack/IntroCS/HW/RSAWorksheet.html

