+++
title = "On the Sieve of Eratosthenes"
date = "2018-12-14T17:13:19-05:00"

+++

Named after the ancient Greek mathematician [Eratosthenes of Cyrene], the [sieve of Eratosthenes] is a fairly efficient algorithm to find all the prime numbers up to an upper bound `n`.  Also, besides having a cool name, Eratosthenes apparently had [a huge head].  Whoa!

The algorithm itself is rather simple:

1. For all numbers 2 to `n`, create an array or a dictionary where the elements or values are all `true`.

2. Set `p` to 2, the smallest prime number.

3. For values `p` to `n`, "cross out" all multiples of `p` by marking them as `false` in the list or dictionary.  The hallmark of the sieve is that the composite numbers form an [arithmetic sequence], rather than incrementing by one.  This is important!

	> For example, the values for `2p`, `3p`, `4p`, `5p` up to `n` can be disregarded, since they are composite numbers and so cannot be prime.
	>
	> - `p` = 2, the sequence is 4, 6, 8, 10, ..., `n`
	> - `p` = 3, the sequence is 6, 9, 12, 15, ..., `n`
	> - `p` = 4, the sequence is 8, 12, 16, 20, ..., `n`
	> - `p` = 5, the sequence is 10, 15, 20, 25, ..., `n`
	>
	> And so on...

4. Choose the next value in the list that hasn't been marked as `false` and repeat step 3.

5. Stop when <code>p<sup>2</sup> > n</code>.

6. The numbers that are still `true` are all the primes less than `n`.

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## Can I Haz Pseudocode?

Yes!<sup>\*</sup>

<pre class="math">
Input: an integer n > 1.

Let A be an array of Boolean values, indexed by integers 2 to n,
initially all set to true.

for i = 2, 3, 4, ..., not exceeding √n:
  if A[i] is true:
    for j = i2, i2+i, i2+2i, i2+3i, ..., not exceeding n:
      A[j] := false.

Output: all i such that A[i] is true.
</pre>

\* The pseudocode was taken from the [sieve of Eratosthenes] Wikipedia page.

## Can I Haz Code?

Yes!  Here is [a JavaScript implementation].

```
#!/usr/bin/env node

if (process.argv.length < 3) {
    console.log(`Usage: ${process.argv[1]} [p]`);
    return;
}

const n = process.argv[2] * 1;
let p = 3;
const m = {
    2: true
};

// First, create a dictionary of odd numbers.  This is an optimization, since
// we know that any even number (besides two, of course), is a composite and
// not a prime and so doesn't need to be included.
while (p < n) {
    if (p % 2 !== 0) {
        m[p] = true;
    }

    p++;
}

// Check only 3 to the square root of the upper bound `n`.
p = 3;
while (p <= (Math.sqrt(n) >> 0)) {
    // Only continue if `p` hasn't already been marked as `false`.
    if (m[p]) {
        primes.push(p);
        //
        // Mark every number in an arithmetic sequence as `false` that is a
        // multiple of the the current value of `p`.
        //
        // i.e., p == 2, p == 3, ...
        //      2p, 3p, 4p, 5p, 6p, etc
        //
        // The next element in the list that is NOT marked `false` will be prime!
        // (Note that the same composite numbers may be inspected more than once.)
        //
        // Don't start with the current value of `p`, as it is a prime number!
        // I.e., 2, 3, 5, etc.
        // So, square it.
        //
        // This works b/c any multiple of a prime will be marked as `false`.
        // I.e., when p == 2:
        //      2p == 4, 3p == 6, 4p == 8, etc.
        //
        // I.e., when p == 3:
        //      2p == 6, 3p == 9, 4p == 12, etc.
        //
        let q = p ** 2;

        while (q < n) {
            m[q] = false;
            q += p; // This generates an arithmetic sequence.
        }
    }

    p += 2;
}

for (let i in m) {
    if (m[i]) console.log(i);
}
```

A couple of things to note about the code:

- The dictionary keys are only odd numbers, except for the key `2`.  Hopefully the reason is obvious, as every even number can be factored by 2, the smallest of the prime numbers.

- We're only checking from `p` to <code>&radic;<span style="text-decoration: overline">n</span></code>.  Why?  When checking a number for primality, then the two factors cannot be greater than the square root (floored) of the number in question.

Let's see this second point in action:

<pre class="math">
n = 120
Math.sqrt(n) = 10.954451150103322
Math.sqrt(n) >> 0 = 10

---------------------------

<b>if</b> a * b = n <b>and</b> a <= b <b>then</b> a * a <= a * b = n

a = 6
b = 20
<b>if</b> 6 * 20 = 120 <b>and</b> 6 <= 20 <b>then</b> 36 <= 120 = 120

---------------------------

<b>if</b> a * b = n <b>and</b> b <= a <b>then</b> b * b <= a * b = n

a = 12
b = 10
<b>if</b> 10 * 12 = 120 <b>and</b> 10 <= 12 <b>then</b> 100 <= 120 = 120

---------------------------

In both the above examples, at least one factor needs to be less than
or equal to the square root of 120.

Clearly, if both numbers are greater than n then a * b > n.

For this reason, we only need to test for factors less than or equal to
the square root of 120.
</pre>

## Optimizations

There are other sieve algorithms that can be used to make the space complexity of the algorithm more efficient.  Two examples are the [segmented sieve] and the [incremental sieve], but I won't be covering them here.

## Testing

When testing, it's too easy to get false positives.  So, I tested against an implementation that determines if a given number is prime, written in C.

[is_prime.c]

```
#include <stdlib.h>
#include <stdio.h>

int is_prime(int n) {
    if (n < 2) {
        return 0;
    }

    int h = n / 2 >> 0;

    for (int i = 2; i <= h; i++) {
        if (n % i == 0) return 0;
    }

    return 1;
}

void main(int argc, char **argv) {
    if (argc < 2) {
        printf("Usage: %s <number>\n", argv[0]);
        exit(1);
    }

    printf("%d\n", is_prime(atoi(argv[1])));
}
```

I would test it thusly:

```
$ for i in $(sieve_of_eratosthenes 200)
> do
> is_prime $i
> done
```

Note that this will return a bunch of ones (the number is prime) and zeroes (it isn't).  It's easy enough to filter that:

```
$ for i in $(sieve_of_eratosthenes 200)
> do
> if [ $(is_prime $i) -eq 0 ]; then echo $i; fi
> done
```

Great, this will now only report numbers that aren't prime.

## In Conclusion

I find it [udderly] fascinating that humans have known of this algorithm for over two millennia (roughly 2,200 years).  I like to picture Eratosthenes sitting in an olive tree grove pouring over his mathematics and surrounded by goats.  And at the age of thirty in 245 BCE, he became a librarian at the Library of Alexandria, one of the wonders of the ancient world.

In addition, the sieve of Eratosthenes can serve as the generator of the factor base for the [quadratic sieve], the second fastest integer factorization algorithm.  *Wheels within wheels in a spiral array, a pattern so grand and complex...*

[Kool Moe Dee], as the kids say.

[Eratosthenes of Cyrene]: https://en.wikipedia.org/wiki/Eratosthenes
[sieve of Eratosthenes]: https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes
[a huge head]: https://commons.wikimedia.org/wiki/File:Eratosthene.01.png
[arithmetic sequence]: https://en.wikipedia.org/wiki/Arithmetic_progression
[a JavaScript implementation]: https://github.com/btoll/tools/blob/master/javascript/sieve_of_eratosthenes
[segmented sieve]: https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes#Segmented_sieve
[incremental sieve]: https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes#Incremental_sieve
[is_prime.c]: https://github.com/btoll/tools/blob/master/c/crypto/is_prime.c
[udderly]: https://en.wikipedia.org/wiki/Udder
[Libray of Alexandria]: https://en.wikipedia.org/wiki/Library_of_Alexandria
[quadratic sieve]: https://en.wikipedia.org/wiki/Quadratic_sieve
[Kool Moe Dee]: https://en.wikipedia.org/wiki/Kool_Moe_Dee

