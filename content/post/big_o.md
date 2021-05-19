+++
title = "On Big O"
date = "2021-05-17T17:57:42-04:00"

+++

[**asymptote**], noun:  a straight line associated with a curve such that as a point moves along an infinite branch of the curve the distance from the point to the line approaches zero and the slope of the curve at the point approaches the slope of the line

---

> The following are random notes and sentences to jigger loose long-forgotten information and memories to bring forth into short-term memory.

Big O notation, or asymptotic notation, measures the runtime efficiency of a given algorithm.  This is a big topic, and this is going to be a short post meant to be a kind of cheatsheet.

- O Big O, the upper bound
- Ω Big Omega, the lower bound
- Θ Big Theta, the tight bound

> Since I'm not an academic, I'll be speaking to just Big O in this post, which is used in interviews and informal settings to mean both big O and big Omega.

1. Time Complexity
1. Space Complexity
1. Drop the Constants
1. Drop the Non-Dominant Terms
1. (Don't Forget About) Amortized Time
1. Log N Runtimes
1. Recursive Runtimes

> Note the best/worst/expected case runtimes are not the same as big O/Theta/Omega.

How does the algorithm scale as the size of the input grows?  How well does the algorithm perform over time?

What is the complexity analysis?  What is the performance of an algorithm as its input approaches an upper limit?

We ignore values that don't change the overall shape of the curve.

O(N) isn't always better than O(N<sup>2</sup>)!

Rate of Increase (examples of runtimes from best performance to worst):

1. O(1) - Fixed, the amount of work is not dependent upon the size of the input (don't confuse fixed with fast).  Minimum value of min heap, maximum value of a max heap.

1. O(log N) - As the input grows, the algorithm's cost doesn't grow at the same rate.  Will divide a larger problem into smaller chunks by halves.  For example, finding a word in dictionary or a phone number in the phone book (if the latter still exists), [binary search].

1. O(N) - Scales linearly with the size of the input. Often represented as a single loop over a data collection.  Reading a book, iterating through a list.

1. O(N log N) - Log linear.  Sorting a deck of playing cards, [merge sort].

1. O(N<sup>2</sup>) - Exhibits quadratic growth relative to the input size and can usually be identified by nested loops over the same data collection. [Bubble sort].

1. O(2<sup>N</sup>) - Exponential.  Recursive [Fibonacci function] with no caching.

1. O(N!) - Factorial.  Generating all permutations of a list.

1. O(N<sup>N</sup>)

> Note that these are only a few of the many, many runtimes (infinite?).  They are the most commonly seen and examples of which abound.  There are countless runtimes in-between these runtimes.

Other:

1. O(NM) - Can be identified by nested loops over two distinct data collections, i.e., two inputs.  Difficult to determine the cost as the inputs increase without knowing the domain space.

<pre class="math">
 log<sub>2</sub>N = k -> 2<sup>k</sup> = N
log<sub>2</sub>16 = 4 -> 2<sup>4</sup> = 16
</pre>

[**asymptote**]: https://www.merriam-webster.com/dictionary/asymptote
[binary search]: https://en.wikipedia.org/wiki/Binary_search_algorithm
[merge sort]: https://en.wikipedia.org/wiki/Merge_sort
[Bubble sort]: https://en.wikipedia.org/wiki/Bubble_sort
[Fibonacci function]: http://homepage.cs.uiowa.edu/~sriram/80/spring2009/notes/exponentialRunningTime.html

