+++
title = "On Merge Sort And Quicksort"
date = "2026-03-28T23:44:30-04:00"

+++

- [Introduction](#introduction)
- [Merge Sort](#merge-sort)
- [Quicksort](#quicksort)
- [Reflections](#reflections)
- [Summary](#summary)
- [References](#references)

---

## Introduction

On the docket today are two famous sorting algorithms that use a [divide-and-conquer] strategy.  They are extremely well-known among programmers and will almost always appear on lists of Algorithms You Should Know <sup style="font-size: 10px;">TM</sup>.

Interestingly, I've never had to do one in a coding interview, although I've always done my best to be prepared to be asked one.

> On a side note, there are noises that coding challenges in programming interviews are starting to become out-of-fashion, and I certainly feel that they should.  The best is when I've been asked to do them in a "devops" interview, as if anyone that's a "devops engineer" knows how to write maintainable code.  Hey, "devops", let's drop the pretense.

I really like the [merge sort] and the [quicksort] for a couple of reasons.  First, I've found them to be incredibly challenging, even when I could speak to the strategy that each employs.  For a long time, there was a pretty bad disconnect when I would go to code them, and I would end up feeling like a dummy.

However, I eventually saw that it was my approach that was confusing me, and once I analyzed that and considered that some of my assumptions were incorrect, it became easier.

So, the raison d'être of this article is not to explain in any depth these two particular sorting algorithms, but instead to capture on paper the nuances that helped me to understand and correctly approach them.

## Merge Sort

This little fella confused me for a long time.  Specifically, how the recursion set up the sorting that would be done when the base case was reached and the stack was unwound.

Here is my implementation:

[`mergesort.go`](https://github.com/btoll/howto-algorithm/tree/master/go/sort/merge)

```go
package main

import "fmt"

func merge(a []int, p, q, r int) {
	i, j, k := 0, 0, p
	left := make([]int, q-p+1)
	right := make([]int, r-q)

	copy(left, a[p:q+1])                    (1)
	copy(right, a[q+1:r+1])                 (1)

	for i < len(left) && j < len(right) {   (2)
		if left[i] < right[j] {
			a[k] = left[i]
			i += 1
		} else {
			a[k] = right[j]
			j += 1
		}
		k += 1
	}

	for i < len(left) {                     (3)
		a[k] = left[i]
		i += 1
		k += 1
	}
	for j < len(right) {                    (3)
		a[k] = right[j]
		j += 1
		k += 1
	}
}

func mergeSort(a []int, p, r int) {
	if p < r {                              (4)
		q := (p + r) / 2
		mergeSort(a, p, q)                  (5)
		mergeSort(a, q+1, r)                (5)
		merge(a, p, q, r)                   (6)
	}
}

func main() {
	a := []int{5, 4, 3, 2, 1}
	fmt.Printf("START=%v\n", a)
	mergeSort(a, 0, len(a)-1)
	fmt.Printf("  END=%v\n", a)
}
```

Notes:

1. The `merge` function is called with pointers which will determine the size of the sub-array that is being passed into it (every time the function recurses the start (`p`) and end (`r`) of the size of the array will be smaller until it reaches only one element - which, of course, is by definition a sorted array), and these are used to create the left and right halves of the sub-array.  Note that when [`copy`]ing, the pointers need to account for Go's exclusive slice sub-array syntax, which is easy to get wrong, since just a couple of lines before we're using inclusive pointers to actually create the slices (i.e., need to keep in mind when to use inclusive vs exclusive pointer indices).
1. While both the beginning **local** pointers `i` and `j` are less then the length of their respective halves, move the lesser of the values of the two halves to the main array.  Note that this will lead to duplicate values in the array, since it's an assignment, **not** a swap.  However, this will be rectified further down in the `merge` function (see both (3) and (4)).  Once either of the pointers is no longer less than its respective array half, this `for` loop will end.  This means that one of the array halves has transferred all of its elements to the main array, and all that is left to do is determine the array half that still has unplaced values and loop through it to exhaustion, placing the remaining elements in the main array.  I want to stress that only one half still has unplaced elements, never both.
1. Place every unplaced element of whichever array half still contains elements (known b/c its respective pointer is still less than the length of its array half).  As mentioned previously, the main array will contain duplicate elements at this point, but this is remedied in this step.
1. The base case.  Obviously, without this there will be infinite loop and a [stack overflow].
1. Every time that `mergeSort` is called the pointers will be smaller until it reaches the base case (i.e., both `p` and `r` are 0).
1. The pointers passed to `merge` will delineate two *sorted* array halves that need to be merged.  They have already been sorted due to the recursion that has occurred by passing increasingly smaller pointer values to `mergeSort`.

## Quicksort

[`quicksort.go`](https://github.com/btoll/howto-algorithm/tree/master/go/sort/quicksort)

```go
package main

import (
	"fmt"
)

func partition(a []int, p, r int) int {
	j, pivot := p, a[r]                     (1)
	for i := p; i < r; i++ {
		if a[i] < pivot {
			a[i], a[j] = a[j], a[i]         (2)
			j += 1                          (2)
		}
	}
	a[j], a[r] = a[r], a[j]                 (3)
	return j
}

func quicksort(a []int, p, r int) {
	if p < r {                              (4)
		q := partition(a, p, r)             (5)
		quicksort(a, p, q-1)                (6)
		quicksort(a, q+1, r)                (6)
	}
}

func main() {
	a := []int{6, 1, 2, 5, 4, 3}
	fmt.Printf("START=%v\n", a)
	quicksort(a, 0, len(a)-1)
	fmt.Printf("  END=%v\n", a)
}
```

Notes:

1. In this implementation, the `pivot` is always the last element of the array specified by the pointers `p` and `r` (when the algorithm recurses, this will be a sub-array of the total array).  So, it is not [randomized], which really should be a consideration.  In addition, the local variable `j` represents the rightmost edge of the "smaller than the pivot" group which will move to the right as items are determined to be less than the `pivot`.
1. If the current element represented by `i` is smaller than the `pivot`, then that element becomes the rightmost boundary.  To do this, simply swap.  The intent of this loop is to maintain the boundary of the rightmost element (i.e., all the elements to the left have already been determied to be **smaller** than the `pivot`).  Once that has been established and the `for` is done, `j` will point to the slot **directly** to the right of the last element that was smaller than the `pivot`.  At this point, the placement of the pivot elements isn't done, as the `pivot` **itself** needs to be placed into position directly to the right of that smallest element, pointed to by `j` (see the next step).
1. Swap the `pivot` element to its correct place directly to the right of all the elements less than it, referenced by the value `j`.
1. The base case.  Obviously, without this there will be infinite loop and a [stack overflow].
1. The pointers passed to the first call to `partition` will reference the entire array, and it only needs one pass to correctly place all of the elements on their respective side of the `pivot`.  Note that this **does not** sort the array.
1. Sorting occurs as frames are added to the stack.  As it works towards the base case, the partitions get smaller and smaller, so sorting will naturally occur.  Unwinding the stack doesn't do any operations.

> This implementation uses the [Lomuto partition scheme].  There is another partitioning scheme named after [Tony Hoare] called, you guessed it, the [Hoare partition scheme] (he came up with the quicksort algorithm in 1959).  It looks like this:
> ```go
> func partition(a []int, p, r int) int {
> 	pivot := a[r]
> 	i := p
> 	j := r - 1
> 	for i < j {
> 		if i < j && a[i] < pivot {
> 			i += 1
> 		}
> 		if i < j && a[j] > pivot {
> 			j -= 1
> 		}
> 		if i < j {
> 			a[i], a[j] = a[j], a[i]
> 		}
> 	}
> 	a[j], a[r] = a[r], a[j]
> 	return j
> }
> ```
> The main differences are that Hoare's scheme uses two pointers (one at each end, they move towards each other and meet in the middle) and fewer swaps.  This is more efficient than Lomuto's due to the fewer swaps and is a better choice for use in production.

Also, we could clean this up a bit by writing a `swap` function to contain the swap logic in the `partition` function.  It could look something like this:

```go
func partition(a []int, p, r int) int {
	j, pivot := p, a[r]
	for i := p; i < r; i++ {
		if a[i] < pivot {
            swap(i, j)
			j += 1
		}
	}
    swap(j, r)
	return j
}

func swap(a []int, p, r int) {
    a[p] ^= a[r]
    a[r] = a[p] ^ a[r]
    a[p] ^= a[r]
}
```

> Check out [the `XOR` swap algorithm].

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeee

## Reflections

I have found both algorithms incredibly tricky to visualize and didn't make any progress towards deeply understanding them until I stepped through them with [Delve].

<!--
I know now what was really confusing me.  When the pointer moves to the right in Lomuto's scheme it means that another element was found that is smaller than the pivot, and so room needs to be made for it.  For the longest time, though, it confused me because it felt that anytime something was increased to the right meant that elements of an increased size were being accounted for.  However, it's not the size of the element but the size of the space of the elements that are less than the pivot.

So, `j` marks the size of the *region*, not the literal size of an integer(s).  So, it's not summing or measuring sizes but expanding a physical space in the array (slice).
-->

## Summary

For what it's worth, here are three facts about arrays.  They:

- occupy contiguous areas of memory (allows for arithmetic to determine how to access)
- are all equal in size
- indexed by contiguous integers

In addition:

- it takes constant time `O(1)` to access any element
- it takes constant time `O(1)` to add or remove any element at the end of the array
- linear time `O(n)` to add or remove any element at an arbitrary location in the array

Well, that's nice.

## References

- [merge sort]
- [quicksort]

[merge sort]: https://en.wikipedia.org/wiki/Merge_sort
[quicksort]: https://en.wikipedia.org/wiki/Quicksort
[divide-and-conquer]: https://en.wikipedia.org/wiki/Divide-and-conquer_algorithm
[the `XOR` swap algorithm]: https://en.wikipedia.org/wiki/XOR_swap_algorithm
[Delve]: https://github.com/go-delve/delve
[stack overflow]: https://en.wikipedia.org/wiki/Stack_overflow
[randomized]: https://www.baeldung.com/cs/randomized-quicksort
[Lomuto partition scheme]: https://en.wikipedia.org/wiki/Quicksort#Lomuto_partition_scheme
[Hoare partition scheme]: https://en.wikipedia.org/wiki/Quicksort#Hoare_partition_scheme
[Tony Hoare]: https://en.wikipedia.org/wiki/Tony_Hoare
[`copy`]: https://pkg.go.dev/builtin#copy

