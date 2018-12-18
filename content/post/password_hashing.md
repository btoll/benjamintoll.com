+++
title = "On Password Hashing"
date = "2018-12-17T14:16:40-05:00"

+++

I've recently been doing a lot of reading about password hashing, which is a deterministic operation that will take a piece of cleartext of arbitrary length and produce a hashed result of a fixed size.  The cleartext is known as the *message* and the hashed value the *message digest*, or just *digest*.  They are often performed by a [cryptographic hash function], but one should use a function that is optimized to be a [password hashing function].  The latter is the subject of this article.

I'm not going to spend any time on *why* one should hash passwords and **not ever store the cleartext version** in the database<sup>[1]</sup>.  We're way past the point where this should be common practice, although it still happens too frequently.

I've usually reached for [bcrypt] when hashing passwords, as this automatically [salts] the password and allows for a customizable work factor, and for these reasons crypto experts say to use it (or something similar) over cryptographic hash functions<sup>[2]</sup>.

Why?  Well, the latter, while it works perfectly well as a [one-way function], falls down in two very important areas: parallelism<sup>[3]</sup> and speed (perhaps counter-intuitively, speed is **not** desirable when hashing passwords).  Unfortunately, cryptographic hash functions don't use a salt and are designed to be fast.

> Cryptographic hash functions are too fast, which allows an adversary to try billions of passwords per second with an off-the-shelf GPU.
>
> Parallelism is defeated by using a unique salt for every stored password, and the time to compute a hashed password can be slowed down immensely by increasing the amount of rounds the algorithm uses to hash the password (aka, the work factor).

Think of it this way: if an adversary gets a read-only view of your database (which does happen, i.e., in the case of a [SQL injection attack]), they can try to crack your passwords at their leisure.  Our defense, as informed developers, is to use a good salt and a work factor as high as can be tolerated<sup>[4]</sup>.  This can literally increase the time to crack a password by several [orders of magnitude], essentially making it too costly (re: time-consuming) for the adversary.

## Password Hashing Functions

- [bcrypt]
- [PBKDF2]
- [Argon2]
- [scrypt]

## Conclusion

I highly recommend reading all of the links that I've referenced.  Too many developers, myself included at one point, may not know the difference between cryptographic hash functions and tools such as `bcrypt` and `PBKDF2`.  The differences may seem subtle, but not to an adversary attempting to crack your passwords, and it could be the difference between a successful break-in and a retreat to look for an easier, softer victim.

## References

1. https://security.blogoverflow.com/2011/11/why-passwords-should-be-hashed/
2. https://security.stackexchange.com/questions/211/how-to-securely-hash-passwords/
3. https://security.stackexchange.com/questions/32816/why-are-gpus-so-good-at-cracking-passwords/
4. https://security.stackexchange.com/questions/3959/recommended-of-iterations-when-using-pkbdf2-sha256/

[cryptographic hash function]: https://en.wikipedia.org/wiki/Cryptographic_hash_function
[password hashing function]: https://en.wikipedia.org/wiki/Cryptographic_hash_function#Password_verification
[bcrypt]: https://en.wikipedia.org/wiki/Bcrypt
[salts]: https://en.wikipedia.org/wiki/Salt_(cryptography)
[one-way function]: https://en.wikipedia.org/wiki/One-way_function
[SQL injection attack]: https://en.wikipedia.org/wiki/SQL_injection
[orders of magnitude]: https://en.wikipedia.org/wiki/Orders_of_magnitude_(numbers)
[PBKDF2]: https://en.wikipedia.org/wiki/PBKDF2
[Argon2]: https://en.wikipedia.org/wiki/Argon2
[scrypt]: https://en.wikipedia.org/wiki/Scrypt
[]: https://www.theguardian.com/technology/2016/dec/15/passwords-hacking-hashing-salting-sha-2

