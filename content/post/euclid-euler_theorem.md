+++
title = "On the Euclid-Euler Theorem"
date = "2018-10-07T15:29:23-04:00"

+++

The other day I was on the Internets and I came across a problem that greatly interested me.  The problem itself wasn't difficult to solve, but the optimal solution was so clever I felt compelled to look into it further.  The combination of math, history and code is just too much, and I lost control.

The problem: Write a function that returns true when a number is a [perfect number].

My approach was a typical brute force; iterate through the range of numbers up to and including the square root of `n`.

	const is_perfect = num => {
	    const half = num / 2 >> 0;
	    let res = 0;

	    for (let i = 1; i <= half; i++) {
			if (num % i === 0) {
			    res += i;
			}
	    }

	    return res === num;
	};

	// The first four perfect numbers.
	[6, 28, 496, 8128]
	.forEach(num =>
	    console.log(
			is_perfect(num)
	    )
	);

This isn't bad, and its complexity analysis is as follows:

- **Time complexity**: O(&radic;<span style="text-decoration: overline">n</span>), i.e., only iterate over the range <code>1 < i ≤ &radic;<span style="text-decoration: overline">num</span></code>
- **Space complexity**: O(1)

However, there is a solution that is faster, and has ancient origins.

---

First, it is necessary to understand that [the list of known perfect numbers] is ridiculously small, only fifty at the time of this writing.  Here are the first eight:

- 6
- 28
- 496
- 8128
- 33550336
- 8589869056
- 137438691328

Second, there is a special kind of prime number known as a [Mersenne prime], and there are also only 50 known Mersenne primes.  Coincidence?  Who knows!<sup>1</sup>.  Here are the first eight:

- 3
- 7
- 31
- 127
- 8191
- 131071
- 524287
- 2147483647

> Named after the French polymath and ascetic [Marin Mersenne], this is a prime number that is one less than a power of two.
>
> Here is the definition:
>
> > 2<sup>p</sup> - 1
>
> (`p` is also a prime number)
>
> Beware, however, that not all numbers of the form <code>2<sup>p</sup> − 1</code> with a prime `p` are prime (i.e., <code>2<sup>11</sup> − 1</code>)!

[Kool Moe Dee]!

---

As you've probably guessed, it's not coincidence at all.  There is a one-to-one correspondence between even perfect numbers and Mersenne primes, which was proved by Euclid around 300 BCE in his famous mathematical treatise [the Elements].  He showed that if <code>2<sup>p</sup> - 1</code> is a prime number, then <code>2<sup>p - 1</sup> (2<sup>p</sup> - 1)</code> is a perfect number.  [Leonhard Euler], 20 centuries later and on a different continent, proved that the formula applies to all even perfect numbers.  This is the [Euclid-Euler Theorem].

Let's look at the relationship between the two:

<u>**Legend**:</u>
**P** = Prime number
**MP** = Mersenne prime number

<table style="margin-bottom: 40px;">
<thead>
	<tr>
		<th style="background-color: #c3eada; border: 1px solid #ccc; text-align: center; width: 100px;">P</th>
		<th style="background-color: #c3eada; border: 1px solid #ccc; text-align: center; width: 100px;">2<sup>p</sup> - 1</th>
		<th style="background-color: #c3eada; border: 1px solid #ccc; text-align: center; width: 100px;">MP</th>
		<th style="background-color: #c3eada; border: 1px solid #ccc; text-align: center; width: 200px;">2<sup>p - 1</sup> (2<sup>p</sup> - 1)</th>
		<th style="background-color: #c3eada; border: 1px solid #ccc; text-align: center; width: 200px;">Perfect Number</th>
	</tr>
</thead>
<tbody>
	<tr>
		<td style="text-align: center;">2</td>
		<td style="text-align: center;">2<sup>2</sup> - 1</td>
		<td style="text-align: center;">3</td>
		<td style="text-align: center;">2<sup>2 - 1</sup> (2<sup>2</sup> - 1)</td>
		<td style="text-align: center;">6</td>
	</tr>
	<tr>
		<td style="text-align: center;">3</td>
		<td style="text-align: center;">2<sup>3</sup> - 1</td>
		<td style="text-align: center;">7</td>
		<td style="text-align: center;">2<sup>3 - 1</sup> (2<sup>3</sup> - 1)</td>
		<td style="text-align: center;">28</td>
	</tr>
	<tr>
		<td style="text-align: center;">5</td>
		<td style="text-align: center;">2<sup>5</sup> - 1</td>
		<td style="text-align: center;">31</td>
		<td style="text-align: center;">2<sup>5 - 1</sup> (2<sup>5</sup> - 1)</td>
		<td style="text-align: center;">496</td>
	</tr>
	<tr>
		<td style="text-align: center;">7</td>
		<td style="text-align: center;">2<sup>7</sup> - 1</td>
		<td style="text-align: center;">127</td>
		<td style="text-align: center;">2<sup>7 - 1</sup> (2<sup>7</sup> - 1)</td>
		<td style="text-align: center;">8128</td>
	</tr>
	<tr>
		<td style="text-align: center;">13</td>
		<td style="text-align: center;">2<sup>13</sup> - 1</td>
		<td style="text-align: center;">8191</td>
		<td style="text-align: center;">2<sup>13 - 1</sup> (2<sup>13</sup> - 1)</td>
		<td style="text-align: center;">33550336</td>
	</tr>
	<tr>
		<td style="text-align: center;">17</td>
		<td style="text-align: center;">2<sup>17</sup> - 1</td>
		<td style="text-align: center;">131071</td>
		<td style="text-align: center;">2<sup>17 - 1</sup> (2<sup>17</sup> - 1)</td>
		<td style="text-align: center;">8589869056</td>
	</tr>
	<tr>
		<td style="text-align: center;">19</td>
		<td style="text-align: center;">2<sup>19</sup> - 1</td>
		<td style="text-align: center;">524287</td>
		<td style="text-align: center;">2<sup>19 - 1</sup> (2<sup>19</sup> - 1)</td>
		<td style="text-align: center;">137438691328</td>
	</tr>
	<tr>
		<td style="text-align: center;">31</td>
		<td style="text-align: center;">2<sup>31</sup> - 1</td>
		<td style="text-align: center;">2147483647	</td>
		<td style="text-align: center;">2<sup>31 - 1</sup> (2<sup>31</sup> - 1)</td>
		<td style="text-align: center;">2305843008139952128</td>
	</tr>
</tbody>
</table>

> All the known even perfect numbers end in either 6 or 8!

---

Ok, now that we see the relationship between even perfect numbers and Mersenne primes, let's rewrite the algorithm to take advantage of this.

	const euclid_euler = p =>
	    (1 << p - 1) * ((1 << p) - 1)

	const is_perfect = num =>
	    [2, 3, 5, 7, 13, 17, 19, 31]
	    .some(p =>
		euclid_euler(p) === num
	    );

	[6, 28, 496, 8128]
	.forEach(p =>
	    console.log(
			is_perfect(p)
	    )
	);

Because we now know that the eight primes in the list in the code can generate even perfect numbers, we can simply use them to generate a perfect number with which we then compare the value passed into our `is_perfect` function.  And as a bonus, there's some nifty bit shifting going down.  Weeeeeeeeeeeeeeeeeeeeeeeeee

Now, the complexity analysis is:

- **Time complexity**: O(log *n*)
- **Space complexity**: O(log *n*)

It's faster, though it will take more memory.  I think that's an acceptable trade-off.

<sup>1</sup> [The Shadow] knows.

[perfect number]: https://en.wikipedia.org/wiki/Perfect_number
[the list of known perfect numbers]: https://en.wikipedia.org/wiki/List_of_perfect_numbers
[Mersenne prime]: https://en.wikipedia.org/wiki/Mersenne_prime
[Marin Mersenne]: https://en.wikipedia.org/wiki/Marin_Mersenne
[Kool Moe Dee]: https://en.wikipedia.org/wiki/Kool_Moe_Dee
[the Elements]: https://en.wikipedia.org/wiki/Euclid%27s_Elements
[Leonhard Euler]: https://en.wikipedia.org/wiki/Leonhard_Euler
[Euclid-Euler Theorem]: https://en.wikipedia.org/wiki/Euclid%E2%80%93Euler_theorem
[The Shadow]: https://en.wikipedia.org/wiki/The_Shadow

