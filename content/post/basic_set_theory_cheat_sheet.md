+++
title = "On Basic Set Theory (Cheat Sheet)"
date = "2019-01-22T23:54:54-05:00"

+++

This is a work in progress.  Its intended to be used as a quick reference.

## Set Notation

∅ = [empty set]

- ∅ = {}

N = [natural numbers]

- N = { 1, 2, 3, ... }

- N<sub>0</sub> = { 0, 1, 2, 3, ... }

Z = [integers]

- Z = { ..., -1, 0, 1, ... }

Q = [rational numbers]

R = [real numbers]

C = [complex numbers]

## Set Operators

∪ = [union]

- A ∪ B = { p : p ∈ A or p ∈ B }

	- The definition of A union B equals the set containing elements p such that p is an element of A or p is an element of B.

∩ = [intersection]

- A ∩ B = { p : p ∈ A and p ∈ B }

	- The definition of A intersection B equals the set containing elements p such that p is an element of A and p is an element of B.

\ = [complement]

- A \ B = { p : p ∈ A or p &notin; B }

	- The definition of A difference of B equals the set containing elements p such that p is an element of A or p is not an element of B.

&oplus; = [symmetric difference]

- xor
- A &oplus; B = ( A \ B ) ∪ ( B \ A )

R \ Q = I

## (Some) Laws of Set Theory

U = the [universe]

[Idempotence]

- Applying a binary operator to a proposition over and over will never change the value of the original proposition.

	- A ∪ A = A
	- A ∩ A = A

[Identity]

- An equality relation, A and B produce the same value as each other.

	- A ∪ ∅ = A
	- U ∪ A = U
	- A ∩ U = A
	- ∅ ∩ A = ∅

[Complement]

- A<sup>c</sup> = { x : x ∉ A }

	- A ∪ A<sup>c</sup> = U
	- ∅<sup>c</sup> = U
	- A ∩ A<sup>c</sup> = ∅
	- U<sup>c</sup> = ∅

[Involution]

- If we have a proposition and apply it to the same function twice it will yield the original value.
- A function that is its own inverse.

	- (A<sup>c</sup>)<sup>c</sup> = A
	- f(f(x)) = x

[Associativity]

- Sets can be regrouped.

	- A ∩ ( B ∩ C ) = ( A ∩ B) ∩ C
	- A ∪ ( B ∪ C ) = ( A ∪ B) ∪ C

[Commutativity]

- The sets can be switched relative to the operator.

	- A ∩ B = B ∩ A
	- A ∪ B = B ∪ A

[Distributive]

- A ∩ ( B ∪ C ) = ( A ∩ B ) ∪ ( A ∩ C )

	- To show equality, you must prove that each side of an equation are subsets of each other:

		- A ∩ ( B ∪ C ) &sube; ( A ∩ B ) ∪ ( A ∩ C )
		- ( A ∩ B ) ∪ ( A ∩ C ) &sube; A ∩ ( B ∪ C )

	<pre class="math">
	<b><u>Example</u></b>

	A = { 1, x, 3 }
	B = { 3, k, z }
	C = { 1, 3 }

	A ∩ B = { 3 }	  <----- A set with only one element is referred
	A ∩ C = { 1, 3 }         to as a singleton or a singleton set.
	B ∪ C = { 1, 3, k, z }
	A ∩ ( B ∪ C ) = { 1, 3 }

	A ∩ ( B ∪ C ) = ( A ∩ B ) ∪ ( A ∩ C )

	{ 1, 3 } = { 3 } ∪ { 1, 3}
	{ 1, 3 } = { 1, 3 }
	</pre>

- A ∪ ( B ∩ C ) = ( A ∪ B ) ∩ ( A ∪ C )

	<pre class="math">
	<b><u>Example</u></b>

	A = { 1, x, 3 }
	B = { 3, k, z }
	C = { 1, 3 }

	A ∪ ( B ∩ C ) = ( A ∪ B ) ∩ ( A ∪ C )

	A ∪ B = { 1, x, 3, k, z }
	A ∪ C = { 1, x, x }
	B ∩ C = { 3 }
	A ∪ ( B ∩ C ) = { 1, x, 3 }

	A ∪ ( B ∩ C ) = ( A ∪ B ) ∩ ( A ∪ C )

	{ 1, x, 3 } = { 1, x, 3, k, z } ∩ { 1, x, 3 }
	{ 1, x, 3 } = { 1, x, 3 }
	</pre>

[De Morgan's Law]

The complement of the union is the intersection of the complements.

- ( A ∪ B )<sup>c</sup> &sube; A<sup>c</sup> ∩ B<sup>c</sup>

	- x ∈ ( A ∪ B )<sup>c</sup>
	- x ∉ ( A ∪ B )
	- x ∉ A and x ∉ B
	- x ∈ A<sup>c</sup> and x ∈ B<sup>c</sup>
	- x ∈ A<sup>c</sup> ∩ B<sup>c</sup>

	<pre class="math">
	<b><u>Example:</u></b>
	( A ∪ B )<sup>c</sup> &sube; A<sup>c</sup> ∩ B<sup>c</sup>

	A = { 1, x, 3 }
	B = { 3, k, z }
	C = { 1, 3 }

	U = { x ∈ Z : 0 ≤ x ≤ 5 }

	A ∪ B = { 1, x, 3, k, z }
	( A ∪ B )<sup>c</sup>  = { 0, 2, 4, 5 }
	A<sup>c</sup> ∩ B<sup>c</sup> = { 0, 2, 4, 5 }
	</pre>

The complement of the intersection is the union of the complements.

- ( A ∩ B )<sup>c</sup> &sube; A<sup>c</sup> ∪ B<sup>c</sup>

	- x ∈ ( A ∩ B )<sup>c</sup>
	- x ∉ ( A ∩ B )
	- x ∉ A or x ∉ B
	- x ∈ A<sup>c</sup> or x ∈ B<sup>c</sup>
	- x ∈ A<sup>c</sup> ∪ B<sup>c</sup>

	<pre class="math">
	<b><u>Example:</u></b>
	( A ∩ B )<sup>c</sup> &sube; A<sup>c</sup> ∪ B<sup>c</sup>

	A = { 1, x, 3 }
	B = { 3, k, z }
	C = { 1, 3 }

	U = { x ∈ Z : 0 ≤ x ≤ 5 }

	A ∩ B = { 3 }
	( A ∩ B )<sup>c</sup> = { 0, 1, 2, 4, 5 }
	A<sup>c</sup> ∪ B<sup>c</sup> = { 0, 1, 2, 4, 5 }
	</pre>

## References

- [Maths for Programmers]
- [Book of Proof]

[empty set]: https://en.wikipedia.org/wiki/Empty_set
[natural numbers]: https://en.wikipedia.org/wiki/Natural_number
[integers]: https://en.wikipedia.org/wiki/Integer
[rational numbers]: https://en.wikipedia.org/wiki/Rational_number
[real numbers]: https://en.wikipedia.org/wiki/Real_number
[complex numbers]: https://en.wikipedia.org/wiki/Complex_number
[union]: https://en.wikipedia.org/wiki/Union_(set_theory)
[intersection]: https://en.wikipedia.org/wiki/Intersection_(set_theory)
[complement]: https://en.wikipedia.org/wiki/Complement_(set_theory)
[symmetric difference]: https://en.wikipedia.org/wiki/Symmetric_difference
[Idempotence]: https://en.wikipedia.org/wiki/Idempotence
[Identity]: https://en.wikipedia.org/wiki/Law_of_identity
[Involution]: https://en.wikipedia.org/wiki/Involution_(mathematics)
[Associativity]: https://en.wikipedia.org/wiki/Associative_property
[Commutativity]: https://en.wikipedia.org/wiki/Commutative_property
[Distributive]: https://en.wikipedia.org/wiki/Distributive_property
[universe]: https://en.wikipedia.org/wiki/Universe_(mathematics)
[De Morgan's Law]: https://en.wikipedia.org/wiki/De_Morgan%27s_laws
[Maths for Programmers]: https://www.youtube.com/playlist?list=PLWKjhJtqVAbndUuYBE5sVViMIvyzp_dB1
[Book of Proof]: https://www.people.vcu.edu/~rhammack/BookOfProof/

