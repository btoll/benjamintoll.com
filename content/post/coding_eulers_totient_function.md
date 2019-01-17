+++
title = "On Coding Euler's Totient Function"
date = "2019-01-14T20:16:42-05:00"

+++

[Euler's totient function] is the bee's knees.  Also known as the `phi` function, it has many practical applications such as finding [the modular multiplicative inverse] of an element (which plays a key role in [RSA]), reducing large exponents (as I've demonstrated before in a prior article on [Euler's theorem]), and others.

Today, we'll be looking at coding an implementation of it, as it teaches us more about prime numbers.

Weeeeeeeeeeeeeeee.

## Definition

As you may recall from some of my past articles, Euler's totient function determines the number of positive integers that are [relatively prime] up to some number `n`.

Given a large enough number (i.e., in the thousands of digits), it is impractical to find all of a number's prime factors, except in one instance:  when the number is prime.  In these cases, the `phi` function of a prime number `n` is simply `n-1`.

That's nice.

## A Solution

So, how could one approach this problem?  A naive solution would be to loop through 1 < `n` and calculate the greatest common divisor (gcd) for each `k`, i.e., `gcd(n, k)`, totaling the number of values for `k` that result in 1.  While there's nothing wrong with this and it works as expected, it's looping over `n-2` elements, which is `O(n)`.  In addition, this implementation has the potential to take up more memory than others that don't use recursion.

Here is [the entire program]:

```
#include <stdio.h>
#include <stdlib.h>

int gcd(int a, int b) {
    if (a % b == 0) return b;
    return gcd(b, a % b);
}

int phi(int n) {
    int k = 1;

    for (int i = 2; i < n; ++i)
        if (gcd(n, i) == 1)
            ++k;

    return k;
}

void main(int argc, char **argv) {
    if (argc < 2) {
        printf("Usage: %s <n>\n", argv[0]);
        exit(1);
    }

    int n = atoi(argv[1]);
    printf("phi(%d) = %d\n", n, phi(n));
}
```

As you can see, it's very straightforward.  The following is the crux of the algorithm that determines the `gcd`:

```
int gcd(int a, int b) {
    if (a % b == 0) return b;
    return gcd(b, a % b);
}
```

Just a simple recursive function that will call the next version of itself with the divisor and the remainder from the previous iteration until it reaches the base case of zero.  This is essentially [the Euclidean algorithm], so nothing new here.

```
$ gcc -o naive eulers_totient_function_naive.c
$ ./naive 42
phi(42) = 12
```

> If interested, you can see this and more on my article on [the extended Euclidean algorithm].

However, there is a better approach.  But first a diversion.

## Prime Factorization

It would behoove us to think about the prime factors that make up each and every number.  It's a number's fingerprint, if you will.  As the [fundamental theorem of arithmetic] states, every number greater than one is either a prime number itself or can be represented as a product of prime numbers.  Further, this representation is unique.

For example:

<pre class="math">
1200 = 2 2 2 2 3 5 5
 777 = 3 7 37
 100 = 2 2 5 5
  42 = 2 3 7
  ...
</pre>

As an important exercise, we'll want to come up with an implementation that will print out a number's prime factorization.

Here's one, with comments to explain what is happening:

[prime_factors.c]

```
#include <stdlib.h>
#include <stdio.h>
#include <math.h>

// The first two blocks handle composite numbers.
// The last condition takes care of any (prime) numbers
// that were not able to be reduced to 1 by the
// preceding blocks.

void prime_factors(int n) {
    // If the number is even, reduce it until it's odd.
    while ((n & 1) == 0) {
        printf("%d ", 2);
        n >>= 1;
    }

    // Now the number is guaranteed to be odd.
    for (int i = 3; i <= sqrt(n); i += 2)
        while (n % i == 0) {
            printf("%d ", i);
            n /= i;
        }

    if (n > 2)
        printf("%d", n);

    printf("\n");
}

void main(int argc, char **argv) {
    if (argc < 2) {
        printf("[ERROR] Not enough args: %s [n]\n", argv[0]);
        exit(1);
    }

    prime_factors(atoi(argv[1]));
}
```

And let's test the same numbers as we did previously:

```
$ for n in {1200,777,100,42}
> do
> ./prime_factors $n
> done
2 2 2 2 3 5 5
3 7 37
2 2 5 5
2 3 7
```

Doing this is a very important step on the way to realizing our final implementation.  As we'll see shortly, thinking of a solution in terms of a number's prime factorization leads us to another of Euler's gems from three centuries ago.

Armed with this new information, let's continue onwards to our final approach.

## Euler's Product Formula

To put everything together, we'll turn once again to our old friend Euler and [his product formula].  His formula states that the value of ϕ(n) is equal to `n` multiplied by the product of `(1 - 1 / p)` for each of its **unique** prime factors.

Let's see some examples:

<pre class="math">
./prime_factors 20
2 2 5

ϕ(20) = 20(1 - 1/2)(1 - 1/5)
ϕ(20) = 20(1/2)(4/5)
<a href="https://www.wolframalpha.com/input/?i=phi(20)">ϕ(20) = 8</a>

---

./prime_factors 144
2 2 2 2 3 3

ϕ(144) = 144(1 - 1/2)(1 - 1/3)
ϕ(144) = 144(1/2)(2/3)
<a href="https://www.wolframalpha.com/input/?i=phi(144)">ϕ(144) = 48</a>

---

./prime_factors 195
3 5 13

ϕ(195) = 195(1 - 1/3)(1 - 1/5)(1 - 1/13)
ϕ(195) = 195(2/3)(4/5)(12/13)
<a href="https://www.wolframalpha.com/input/?i=phi(195)">ϕ(195) = 96</a>
</pre>

From these examples, we can see that, given a prime factorization, the number of steps needed to compute Euler's totient function is drastically reduced!  The key is to ascertain the unique prime factors.

Well, this is where our brief diversion from before comes back into play.  We've shown that it is trivial to find the prime factorization of a given number (with the caveat that there is the processing power and available memory to do so, of course!):

```
void prime_factors(int n) {
    // If the number is even, reduce it until it's odd.
    while ((n & 1) == 0) {
        printf("%d ", 2);
        n >>= 1;
    }

    // Now the number is guaranteed to be odd.
    for (int i = 3; i <= sqrt(n); i += 2)
        while (n % i == 0) {
            printf("%d ", i);
            n /= i;
        }

    if (n > 2)
        printf("%d", n);

    printf("\n");
}
```

For our use case now, it's even simpler, because we're not concerned with computing and printing every single possible prime (and some factorizations will have more than one of the same prime number, as we saw above) but with determining the **unique** primes.

```
#include <stdio.h>
#include <stdlib.h>

int phi(int n) {
    int res = n;

    for (int p = 2; p * p <= n; ++p) {
        if (n % p == 0) {
            while (n % p == 0)
                n /= p;

            res -= res / p;
        }
    }

    if (n > 1)
        res -= res / n;

    return res;
}

void main(int argc, char **argv) {
    if (argc < 2) {
        printf("Usage: %s [n]\n", argv[0]);
        exit(1);
    }

    int n = atoi(argv[1]);
    printf("phi(%d) = %d\n", n, phi(n));
}
```

Some things to note here:

- We don't need to link to the `math` library, since we're no longer calculating the square root in the `for` loop.

- We're no longer multiplying `n` by the product of `(1 - (p / 1))` for each of its unique prime numbers.  Instead, we're dividing the current result by the current prime and then subtracting from the current result.  This accomplishes the same thing with the benefit of not having to cast the integer `p` to a `float` before computing.

- We got rid of the `while` loop and only use the `for` loop to determine the prime factors, starting with 2, the smallest prime number.

## Conclusion

In my opinion, coding Euler's totient function has been an excellent exercise in thinking about numbers as the products of primes.

When time allows, it's beneficial to dig into the fundamental math behind the building blocks of modern cryptography, and this is surely one of them.  For instance, the relationship between Euler's totient function and modular arithmetic is clear in the RSA cryptosystem, as the phi function is used not only in determining the public key `e` but in determining its mathematical inverse, `d`.

> Actually, although Euler's totient function was used in the original RSA paper, it now uses [Carmichael's totient function].

## References

- https://www.geeksforgeeks.org/eulers-totient-function/
- https://www.geeksforgeeks.org/print-all-prime-factors-of-a-given-number/

[Euler's totient function]: https://en.wikipedia.org/wiki/Euler%27s_totient_function
[the modular multiplicative inverse]: /2019/01/01/on-the-modular-multiplicative-inverse/
[RSA]: https://en.wikipedia.org/wiki/RSA_(cryptosystem)
[Euler's theorem]: /2018/07/15/on-eulers-theorem/
[relatively prime]: https://en.wikipedia.org/wiki/Coprime_integers
[the extended Euclidean algorithm]: /2018/12/28/on-the-extended-euclidean-algorithm/
[the Euclidean algorithm]: https://en.wikipedia.org/wiki/Euclidean_algorithm
[the entire program]: https://github.com/btoll/tools/blob/master/c/eulers_totient_function_naive.c
[fundamental theorem of arithmetic]: https://en.wikipedia.org/wiki/Fundamental_theorem_of_arithmetic
[prime_factors.c]: https://github.com/btoll/tools/blob/master/c/prime_factors.c
[his product formula]: https://en.wikipedia.org/wiki/Proof_of_the_Euler_product_formula_for_the_Riemann_zeta_function#The_Euler_product_formula
[Carmichael's totient function]: https://en.wikipedia.org/wiki/Carmichael_function

