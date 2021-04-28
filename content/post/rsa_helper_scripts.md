+++
title = "On the RSA Helper Scripts"
date = "2018-07-15T15:49:38-04:00"

+++

> This serves as an aide to a previous post on the [RSA cryptosystem].

**is_prime.js**

<pre class="math">
#!/usr/bin/env node

const N = process.argv[2] * 1;

if (N == null) {
    console.log(`Usage: ${process.argv[1]} [n]`);
    return;
}

if (N < 2) {
    console.log(0);
    return;
}

console.log(
    ([...Array(Math.sqrt(N) >> 0).keys()]
    .map(i => i + 1)
    .filter(i =>
        N % i === 0
    )
    .length === 1) * 1
);
</pre>

The crux:

1. Make an array of numbers from one to the square root of the number to test for [primality], inclusive (the operation must be floored).  I thought it'd be fun to avoid using a `for` loop.
1. Return a new array starting from 1.
1. Filter all numbers that evenly divide into the integer to test for primality.
1. Recall that the number 1 is a factor of all numbers, so a number is indeed prime if the filtered array contains only one item (the number 1).

**eulers_totient_function.js**

<pre class="math">
#!/usr/bin/env node

const P1 = process.argv[2];
const P2 = process.argv[3];

if (!P1 || !P2) {
    console.log(`Usage: ${process.argv[1]} [Prime 1] [Prime 2]`);
    return;
}

// phi(N) = phi(P1)*phi(P2)

console.log(`phi(${P1 * P2}) = ${(P1 - 1) * (P2 - 1)}`);
</pre>

**priv_key.js**

<pre class="math">
#!/usr/bin/env node

const e = process.argv[2] * 1;
const mod = process.argv[3] * 1;

if (!e || !mod) {
    console.log(`Usage: ${process.argv[1]} [e] [modulus]`);
    return;
}

console.log(
    [...Array(mod).keys()]
    .map(i => i + 1)
    .filter(i =>
        e * i % mod === 1
    ).join(',')
);
</pre>

The crux:

1. Make an array of numbers from one to modulo.  I thought it'd be fun to avoid using a `for` loop.
1. Return a new array starting from 1.
1. Filter all numbers that return a result of one, which satisfies the modular multiplicative inverse property of the RSA algorithm.

[RSA cryptosystem]: /2018/07/09/on-rsa/

