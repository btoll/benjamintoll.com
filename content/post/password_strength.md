+++
title = "On Password Strength"
date = "2018-05-30T16:28:11-04:00"

+++

> Note that this post focuses on the ability to determine the strength of a **randomly** generated password with high precision.  While the password `l3dz3pp3linRul3z!` contains an undisputed fact, it is **not** an example of a secure or strong password, for obvious reasons.  Password security is a larger topic and is not the focus of this one.

I've recently been doing a lot of reading and research about best practices for protecting one's privacy on the Internet, in anticipation of doing some public speaking on the subject.  While no stranger to privacy and anonymity tools, I've found it interesting and instructive to approach the subject from the perspective of a teacher rather than that of a user.  In the process, I've done deep dives and covered a lot of territory to make sure that I'm quite comfortable with any of the topics I'll be presenting, and I'll also naturally be fielding questions.

During my reading on passwords (a sometimes boring but quite important topic!), one thing that greatly captured my interest was that of [password strength].  I'd never stopped to think about how a password can be quantitatively measured and reasoned about; a password's strength can be measured in terms of [information entropy], which is defined as the average amount of information produced by a random, or [stochastic], source of data.  This information is measured in bits (or shannons, named after [Claude Shannon], the mathematician credited with the concept of information entropy).

Importantly, only randomly-generated passwords can be calculated with precision; human-generated passwords are rarely random and therefore their strength is very difficult to determine.  The algorithm is quite straightforward and easy to understand and is a function of length, complexity and randomness.  A random password's information entropy `H` is determined by the following equation:

		H = (log2)(N^L)

I find it useful to think of the symbol set(s) used for a given password as analogous to its key space.  For example, an Arabic numeral password has a key space of 10, the lowercase Latin alphabet has a key space of 26 characters, as does its uppercase counterpart, and the mixed-case Latin alphabet has a key space of 52.  It follows, then, that a case insensitive alphanumeric password has a key space of 62 (`[a-z][A-Z][0-9]`).

So, for instance, if we wanted to see how many entropy bits a single character password would have given an Arabic numeral character set, the answer would be calculated thusly:

		H = (log2)(10) = 3.3219280949

For a single character, case insensitive Latin alphabet:

		H = (log2)(52) = 5.7004397181

Single character, all printable ascii characters except space:

		H = (log2)(94) = 6.5545888517

Diceware\* passphrase (one word):

		H = (log2)(7776) = 12.924812504

> The Diceware method for generating passphrases is a list of 7776 words, hence calculating the base-2 logarithm of 7776.

As you'd expect, the larger the symbol set (key space), the greater the bit strength for an individual character of a password.  Armed with this information, we now can reason about our passwords and calculate their strength with great precision.  Depending upon the threat model, a long password may not be needed, especially when employing [key stretching].  However, generally, the more entropy the better, and so recommendations can vary between 29 bits and 96 bits.  I favor a six word Diceware passphrase, so my passphrases clock in at roughly 77.549 entopy bits.  Of course, all bets are off when [quantum computers are mainstream], which will be much sooner than you think.  Time to learn [lattice-based cryptography]!

> ### More Fun!
>
> Incidentally, the statement:
>
>       	(log2)(10) = 3.3219280949
>
> tells us how many bits we need to store a base-10 number.
>
> For example, take the number 91.  Since the number is two digits long, we can calculate the bits needed to store the number thusly:
>
>       	2 * (log2)(10)
>       	2 * 3.3219280949
>       	6.6438561898
>       	7 bits
>
> That looks right, after all 7 bits is decimal 128 which encompasses the number 91.
>
> Let's try another one! For instance, decimal 9119.  The number is 4 digits long, so:
>
>       	4 * (log2)(10)
>       	4 * 3.3219280949
>       	13.2877123796
>       	14 bits
>
> Is that right?  Let's ask our trusty little friend [asbits]!
>
>       	~:$ asbits 9119
>       	0010 0011 1001 1111
>
> Yes, it's 14 bits long!  Also, we can see that 14 bits is decimal 16,384, which encompasses our number 9119 (13 bits is less).
>
>       	~:$ echo "2^14" | bc
>       	16384
>       	~:$ echo "2^13" | bc
>       	8192
>
> Weeeeeeeeeeeeeeeeee


\* I'm a fan of the [Diceware] method for generating strong and memorable passphrases.  I've written two implementations, [one in JavaScript] and [one in Go], and I use it as a plugin in [my password manager].

[password strength]: https://en.wikipedia.org/wiki/Password_strength
[information entropy]: https://en.wikipedia.org/wiki/Information_entropy
[stochastic]: https://en.wikipedia.org/wiki/Stochastic
[Claude Shannon]: https://en.wikipedia.org/wiki/Claude_Shannon
[base-2 logarithm]: https://en.wikipedia.org/wiki/Binary_logarithm
[key stretching]: https://en.wikipedia.org/wiki/Key_stretching
[quantum computers are mainstream]: https://www.cnbc.com/2018/03/30/ibm-sees-quantum-computing-going-mainstream-within-five-years.html
[lattice-based cryptography]: https://en.wikipedia.org/wiki/Lattice-based_cryptography
[asbits]: https://github.com/btoll/tools/tree/master/c/asbits
[Diceware]: http://world.std.com/%7Ereinhold/diceware.html
[one in JavaScript]: https://github.com/btoll/onf-diceware
[one in Go]: https://github.com/btoll/diceware
[my password manager]: https://github.com/btoll/stymie-go

