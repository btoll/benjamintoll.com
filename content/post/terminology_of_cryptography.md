+++
title = "On the Terminology of Cryptography"
date = "2018-11-30T21:25:06-05:00"

+++

I've made it a goal to learn as much about cryptography as I can.  I'm talking about the mathematics that enable it, of course, the stuff that has always terrified me.  As a programmer, I've (mostly) never shrunk from a challenge, but the sheer amount of preparatory work necessary to even understand a post on [Stack Overflow] or [Stack Exchange] had me shivering in my timbers.

But this is all about to change, and I've selected my entry point to be [The Handbook of Applied Cryptography].  I really enjoy reading Bruce Schneier and subscribe to his [Crypto-Gram], so I'm sure I'll augment my studies with his writings in the near future, as well.

This will be the first in a series of articles on cryptography as I attempt to go as far as I can on my own steam.  My goal is to document the content that seems most meaningful and instructive to me.  It's not intended to be exhaustive.

Although it may seem boring and perhaps even intimidating, there's no getting around that one needs to build a solid foundation before getting to the really interesting topics.  I think this is true in any endeavor, and so I found myself facing frightening terms and symbols as soon as I opened the book.

So, as a reference and a cheat sheet, here are some of the terms that I've encountered.  Some of the definitions I've lifted whole cloth from the aforementioned book, and I in no way am trying to pass them off as my own.

Let's dig in....

1. <a href="#basic-terminology">Basic Terminology</a>
2. <a href="#function-terminology">Function Terminology</a>
3. <a href="#encryption-domains-and-codomains">Encryption Domains and Codomains</a>
4. <a href="#encryption-and-decryption-transformations">Encryption and Decryption Transformations</a>
5. <a href="#communication-participants">Communication Participants</a>
6. <a href="#channels">Channels</a>
7. <a href="#cryptology">Cryptology</a>

---

## Basic Terminology

- **Cryptography** - The study of mathematical techniques related to aspects of information security such as confidentiality, data integrity, entity authentication, and data origin authentication.

- **Cryptographic primitives** - Basic cryptographic tools used to provide information security.  Examples include encryption schemes, hash functions and digital signature schemes.

- **Cipher** - An <a href="#encryption-and-decryption-transformations">encryption scheme</a>.

- **Set** - Consists of distinct elements which are known as *elements* of the set.  For example, a set <code>X</code> might consist of the elements <code>a</code>, <code>b</code> and <code>c</code> and is denoted <code>X = {a,b,c}</code>.

- **Information security service** - A method to provide some specific aspect of security.  For example, integrity of transmitted data is a security objective, and a method to ensure this aspect is an information security service.

- **Symmetric-key encryption** - An <a href="#encryption-and-decryption-transformations">encryption scheme</a> is said to be *symmetric-key* if for each associated encryption/decryption key pair <code>(e, d)</code>, it is computationally "easy" to determine <code>d</code> knowing only <code>e</code>, and to determine <code>e</code> from <code>d</code>.

- **Public-key encryption** - An <a href="#encryption-and-decryption-transformations">encryption scheme</a> where for each associated encryption/decryption pair <code>(e,d)</code>, one key <code>e</code> (the *public key*) is mad publicly available, while the other <code>d</code> (the *private key*) is kept secret.  For the scheme to be **secure**, it must be computationally infeasible to compute <code>d</code> from <code>e</code>.

- **Digital signature** - A cryptographic primitive which is fundamental in authentication, authorization and non-repudiation, its purpose is to provide a means for an identity to bind its identity to a piece of information.

- **Hash function** - Often informally called a *one-way hash function*, it is a computationally efficient function mapping binary strings of arbitrary length to binary strings of some fixed length, called *hash-values*.

---

## Function Terminology

- **Function** - Alternatively referred to as a *mapping* or a *transformation*, a *function* is defined by two sets <code>X</code> and <code>Y</code> and a rule <code>f</code> which assigns to each element in <code>X</code> precisely one element in <code>Y</code>.  The set <code>X</code> is called the *domain* of the function and <code>Y</code> the *codomain*.

	- **image** of <code>x</code> - If <code>x</code> is an element of <code>X</code> (usually written <code>x ∈ X</code>), the *image* of <code>x</code> is the element in <code>Y</code> in which the rule <code>f</code> associates with <code>x</code>.  The image <code>y</code> of <code>x</code> is denoted by <code>y = f(x)</code>.

	- **preimage** of <code>y</code> - If <code>y ∈ Y</code>, then a *preimage* of <code>y</code> is an element <code>x ∈ X</code> for which <code>f(x) = y</code>.

	- **image** of <code>f</code> - Denoted <code>Im(f)</code>. The set of all elements in <code>Y</code> which have at least one preimage.

<pre class="math">
<strong><u>Example</u></strong>

Let f be the rule that for each x ∈ X, f(x) = r<sub>x</sub>, where r<sub>x</sub> is the remainder
when x<sup>2</sup> is divided by 11.

	X = {1,2,3,4,5,6,7,8,9,10}

	f(1) = 1
	f(2) = 4
	f(3) = 9
	f(4) = 5
	f(5) = 3
	f(6) = 3
	f(7) = 5	<--- The preimage of element 5 is 7.
	f(8) = 9
	f(9) = 4
	f(10) = 1

	Im(f) = {1,3,4,5,9}
</pre>

## Types of Functions

- <a href="#1-1">1-1</a>
- <a href="#one-way">one-way</a>
- <a href="#trapdoor-one-way">trapdoor one-way</a>
- <a href="#permutations">permutations</a>
- <a href="#involutions">involutions</a>

> Standard notation for a function <code>f</code> from set <code>X</code> to set <code>Y</code> is <code>f : X → Y</code>.

### 1-1

- A function or transformation is 1-1 (one-to-one) if each element in the codomain <code>Y</code> is the image of at most one element in the domain <code>X</code>.

- A 1-1 function is [bijective].

- Inverse functions:

	- If <code>f</code> is a bijection from <code>X</code> to <code>Y</code> then it is a simple matter to define a bijection <code>g</code> from <code>Y</code> to <code>X</code> as follows: for each <code>y ∈ Y</code> define <code>g(y) = x</code> where <code>x ∈ X</code> and <code>f(x) = y</code>.  This function <code>g</code> obtained from <code>f</code> is called the *inverse function* of <code>f</code> and is denoted by <code>g = f</code><sup>−1</sup>.

	- The domain of <code>g</code> is <code>Y</code> and the codomain is <code>X</code>.

> ### bijection
>
> - If a function <code>f : X → Y</code> is 1−1 and <code>Im(f) = Y</code>, then f is called a bijection.  There are no unpaired elements.
>
> - Bijective functions are *one-to-one* ([injective]) as well as *onto* ([surjective]).
> Note that if <code>f</code> is a bijection, then so is <code>f<sup>−1</sup></code>. In cryptography, bijections are used as the tool for encrypting messages and the inverse transformations are used to decrypt.  Notice that if the transformations were not bijections then it would not be possible to always decrypt to a unique message.

### one-way

- A function <code>f</code> from a set <code>X</code> to a set <code>Y</code> is called a *one-way function* if <code>f(x)</code> is "easy" to compute for all <code>x ∈ X</code> but for "essentially all" elements <code>y ∈ Im(f)</code> it is "computationally infeasible" to find any <code>x ∈ X</code> such that <code>f(x) = y</code>.

- Alternatively, for a random <code>y ∈ Im(f)</code>, it is computationally infeasible to find any <code>x ∈ X</code> such that <code>f(x) = y</code>.

<pre class="math">
<strong><u>Example</u></strong>

Define <code>f(x) = r<sub>x</sub></code> for all <code>x ∈ X</code> where <code>r<sub>x</sub></code> is the remainder when 3<sup>x</sup> is divided by 17.

Now, given a number between between 1 and <code>t</code>, determine <code>x</code> provided <code>f(x) = 8</code>.

For small numbers, this is not a hard problem, as one can simply try every number
in the range 1 through 16:

	f(1) = 3
	f(2) = 9
	f(3) = 10
	f(4) = 13
	f(5) = 5
	f(6) = 15
	f(7) = 11
	f(8) = 16
	f(9) = 14
	f(10) = 8	<--- Dude!
	f(11) = 7
	f(12) = 4
	f(13) = 12
	f(14) = 2
	f(15) = 6
	f(16) = 1

But, let's say the modulus is the product of two 100-digit prime numbers?

p = 56282904590578772918091824503812389276973148221339/
	23421169378062922140081498734424133112032854812293

q = 72126101472954749095445237850434924099693821481867/
	65460082500085393519556525921455588705423020751421

n = pq = <strong>40594664876927152429464221872014903331305438593550203566566567434044\
		 09274728618132558293704275021893950727842396795312164019235290143106\
		 7647263568137200677133330187177812269497007251370100980768018353</strong>

The domain of the function now becomes:

	X = {1, 2, 3, ..., n - 1}

Good luck!
</pre>

The important point here is that there is a difference in the amount of work to compute <code>f(x)</code> and the amount of work to find <code>x</code> given <code>f(x)</code>.
What is needed is a shortcut or "trapdoor" where the latter becomes knowable, i.e., easy to reverse.

### trapdoor one-way

- A trapdoor one-way function is a one-way function <code>f : X → Y</code> with the additional property that given some extra information (called the *trapdoor information*) it becomes feasible to find for any given <code>y ∈ Im(f)</code>, an <code>x ∈ X</code> such that <code>f(x) = y</code>.

- In the example above, the trapdoor is knowing the two prime factors.  This is the [integer factorization problem].

> *One-way* and *trapdoor one-way* functions are the basis for public-key cryptography.

### permutations

- Let <code>S</code> be a finite set of elements.  A *permutation p* on <code>S</code> is a bijection from <code>S</code> to itself (i.e., <code>p : S → S)</code>.

- Since permutations are bijections, they have inverses.  The inverse of <code>p</code> is <code>p<sup>-1</sup></code>.

### involutions

- Involutions have the property that they are their own inverses.

- Let <code>S</code> be a finite set and let <code>f</code> be a bijection from <code>S</code> to <code>S</code> (i.e., <code>f : S → S</code>).  The function <code>f</code> is called an *involution* if <code>f = f<sup>−1</sup></code>.  An equivalent way of stating this is <code>f(f(x)) = x</code> for all <code>x ∈ S</code>.

---

## Encryption Domains and Codomains

- **Alphabet of definition** - Is a finite set denoted by <code>A</code>.  For example, <code>A = {0,1}</code> is the *binary alphabet* and is a frequently-used alphabet of definition.

> Any alphabet can be encoded in terms of the binary alphabet.

- **Message space** - Denoted by the set <code>M</code>, it consists of strings of symbols from an alphabet of definition.  An element of <code>M</code> is called a *plaintext message* or simply a *plaintext*.

- **Ciphertext space** - Denoted by the set <code>C</code>, it consists of strings of symbols from an alphabet of definition, which may differ from the alphabet of definition for <code>M</code>.  An element of <code>C</code> is called a *ciphertext*.

---

## Encryption and Decryption Transformations

- **Key space** - Denoted by the set <code>K</code>.  An element of <code>K</code> is called a *key*.

- **Encryption function** - Also known as an *encryption transformation*, it is denoted by <code>E<sub>e</sub></code>, where each element <code>e ∈ K</code> uniquely determines a bijection from <code>M</code> to <code>C</code>.  Note that <code>E<sub>e</sub></code> must be a bijection if the process is to be reversed and a unique plaintext message recovered for each distinct ciphertext.

	- The process of applying the transformation <code>E<sub>e</sub></code> to a message <code>m ∈ M</code> is usually referred to as *encrypting m* or the *encryption* of *m*.

> More generality is obtained if <code>E<sub>e</sub></code> is simply defined as a 1 − 1 transformation from <code>M</code> to <code>C</code>. That is to say, <code>E<sub>e</sub></code> is a bijection from <code>M</code> to <code>Im(E<sub>e</sub>)</code> where <code>Im(E<sub>e</sub>)</code> is a subset of <code>C</code>.

- **Decryption function** - Also known as a *decryption transformation*, it is denoted by <code>D<sub>d</sub></code>, where each element <code>d ∈ K</code> uniquely determines a bijection from <code>C</code> to <code>M</code> (i.e., <code>D<sub>d</sub></code> : C → M).

	- The process of applying the transformation <code>D<sub>d</sub></code> to a ciphertext <code>c</code> is usually referred to as <code>decrypting c</code> or the <code>decryption</code> of <code>c</code>.

- **Encryption scheme** - Sometimes referred to as a *cipher*, it consists of a set <code>{E<sub>e</sub> : e ∈ K}</code> of encryptions transformations and a corresponding set <code>{D<sub>d</sub> : d ∈ K}</code> of decryption transformations with the property that for each <code>e ∈ K</code> there is a unique key <code>d ∈ K</code> such that <code>D<sub>d</sub> = E<sup>−1</sup></code>; that is, <code>D<sub>d</sub>(E<sub>e</sub>(m)) = m</code> for all <code>m ∈ M</code>.

> To construct an encryption scheme requires one to select a message space <code>M</code>, a ciphertext space <code>C</code>, a key space <code>K</code>, a set of encryption transformations <code>{E<sub>e</sub> : e ∈ K}</code>, and a corresponding set of decryption transformations <code>{D<sub>d</sub> : d ∈ K}</code>.

> > An encryption scheme is said to be *breakable* if a third party, without prior knowledge of the key pair <code>(e, d)</code>, can systematically recover plaintext from corresponding ciphertext within some appropriate time frame.

- **Key pair** - In the preceding definition, the keys *e* and *d* are referred to as a *key pair* and sometimes denoted by <code>(e,d)</code>.  Note that *e* and *d* could be the same.

---

## Communication Participants

- **Entity** - Also known as a *party*, it is someone or something which sends, receives or manipulates information.  An entity may be a person, computer terminal, etc.

- **Sender** - An entity in a two-party communication which is the legitimate transmitter of information.

- **Receiver** - An entity in a two-party communication which is the intended recipient of information.

- **Adversary** -  An entity in a two-party communication which is neither the sender nor receiver, and which tries to defeat the information security service being provided between the sender and receiver.  Various other names are synonymous with adversary such as enemy, attacker, opponent, tapper, eavesdropper, intruder and interloper.  An adversary will often attempt to play the role of either the legitimate sender or the legitimate receiver.

---

## Channels

- **Channel** - A means of conveying information from one entity to another.

- **Physically secure channel** - Also known as a *secure channel*, is one which is not physical accessible to the adversary.

- **Unsecured channel** - A channel from which parties other than those for which the information is intended can reorder, delete, insert or read.

- **Secured channel** - A channel from which an adversary does not have the ability to reorder, delete, insert or read.

---

## Cryptology

-- **Cryptanalysis** - The study of mathematical techniques for attempting to defeat cryptographic techniques, and, more generally, information security services.

-- **Cryptanalyst** - Someone who engages in cryptanalysis.

-- **Cryptology** - The study of cryptography and cryptanalysis.

-- **Cryptosystem** - A general term referring to a set of cryptographic primitives used to provide information security services.  Most often the term is used in conjunction with primitives providing confidentiality, i.e., encryption.

> Cryptographic techniques are typically divided into two generic types: *symmetric-key* and *public-key*.

[Stack Overflow]: https://stackoverflow.com/questions/tagged/cryptography
[Stack Exchange]: https://crypto.stackexchange.com/
[The Handbook of Applied Cryptography]: http://cacr.uwaterloo.ca/hac/
[Crypto-Gram]: https://www.schneier.com/crypto-gram/
[injective]: https://en.wikipedia.org/wiki/Injective_function
[surjective]: https://en.wikipedia.org/wiki/Surjective_function
[bijective]: https://en.wikipedia.org/wiki/Bijection
[integer factorization problem]: https://en.wikipedia.org/wiki/Integer_factorization

