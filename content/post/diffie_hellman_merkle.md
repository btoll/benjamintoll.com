+++
title = "On Diffie-Hellman-Merkle"
date = "2018-04-27T21:04:23-04:00"

+++

Exchanging shared keys is not easy to do.  In days gone by, these keys (oftentimes one-time pads) had to be exchanged in person - think of the spy in the movie with the briefcase handcuffed to the wrist - and this made the process unwieldy and generally unusable.

What was needed was a way to generate a symmetric key over a public channel, in scenarios where the parties wishing to communicate did not have any prior knowledge of each other.  In doing so, some bits used to create the key could be publicly known, but [mixed] together with a private key that only the intended parties were privy to.  The key was then used to securely encrypt the communications using a [symmetric cipher]. For a long time it was considered academically possible to publicly exchange keys for subsequent private communication, but it wasn't until Whitfield Diffie, Martin Hellman and Ralph Merkle published their public key exchange algorithm in 1976 that the problem was considered "solved" (see the [patent]).  Incidentally, it has since become known that the GCHQ had demonstrated the viability of public key cryptography in 1969.

DHM is commonly used to generate a shared symmetric key when using public key cryptography and is used by authenticated protocols such as TLS to provide for [forward secrecy].

When I first read a (simplified) [version of the DHM algorithm], I thought that it would be fun and educational to create a small project where parties could each create a shared key and then use a simple algorithm using XOR to encrypt and decrypt their communication.  At the time, I was writing a lot of JavaScript, and you can find [that project] on my GitHub.

Here is the simplified DHM algorithm:

1. Alice computes `A`, which is a calculation of a (small) prime number `g` raised to Alice's private key `a`, modulo a very large prime number `p`.  Generally, the larger the prime `p` the more secure the key (the modulus is the key space):

		A = g ^ a % p

2. Bob computes `B`, using the same primes `g` and `p`, with his own private key `b`:

		B = g ^ b % p

3. Each party then sends the other the result of their computations, i.e.:

	+ Alice sends Bob -> `A = g ^ a % p`
	+ Bob sends Alice -> `B = g ^ b % p`

4. Alice then does the same computation in Step 1 using modular exponentiation, raising Bob's calculated result `B` to her private key:

		s = B ^ a % p

5. Bob then does the same computation in Step 2 using modular exponentiation, raising Alice's calculated result `A` to his private key:

		s = A ^ b % p

6. Alice and Bob have now generated the same number `s`, a shared key!  They can now safely encrypt and decrypt their communications using this shared key with some symmetric key cipher.

I find this to be absolutely beautiful.  It's math, not magic.  And [you can trust it].

Incidentally, before DHM, the only groups that had access to military-grade encryption was, well, the military and the government.  By putting the ability to encrypt our communications into the public domain, Diffie, Hellman and Merkle enabled citizens spanning the globe to retain a sense of privacy that [is seen as a bug], and not a feature, of the Internet.

[mixed]: https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange#/media/File:Diffie-Hellman_Key_Exchange.svg
[symmetric cipher]: https://en.wikipedia.org/wiki/Symmetric-key_algorithm
[patent]: https://patents.google.com/patent/US4200770
[forward secrecy]: https://en.wikipedia.org/wiki/Forward_secrecy
[version of the DHM algorithm]: https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange
[that project]: https://github.com/btoll/onf-sneak
[you can trust it]: https://www.theguardian.com/world/2013/sep/05/nsa-how-to-remain-secure-surveillance
[is seen as a bug]: https://en.wikipedia.org/wiki/Global_surveillance_disclosures_(2013%E2%80%93present)

