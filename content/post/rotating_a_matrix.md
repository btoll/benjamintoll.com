+++
title = "On Rotating a Matrix"
date = "2021-06-08T23:09:22-04:00"

+++

For some reason that I haven't quite ascertained, matrices scare me.  I've tried living my life as if they don't exist, but it hasn't quite worked.  This nagging sensation in the back of my mind tells me that it's time to put on my big boy pants.

In this post, we'll be looking at a quite common problem that seems to be featured on all of the coding sites and is in my copy of [Cracking the Coding Interview].  Simply: rotate a matrix 90&#176; clockwise and do it [in-place].

It seems to be marked as an "easy" problem on every site, but I didn't think it was so easy.  The whole ranking thing is mostly bollocks anyway.  [Everyone learns differently].

Anyway, my eyes glaze over when I encounter a matrix question, and I'll more often than not skip to another question.  And that's not good.  I need to tackle my irrational fear of two-dimensional arrays.  And, on a side note, what a completely idiotic thing to fear.  Seriously.

- [Setup](#setup)
- [Implementation](#implementation)
- [Transposition](#transposition)
- [In reverse](#in-reverse)

---

# Setup

For the sake of this problem, we'll only be looking at matrices whose columns and rows have the same length (`N x N`).  For example:

<pre class="math">
+-------+
| 1 | 2 |
|-------|
| 3 | 4 |
+-------+

+-----------+
| 1 | 2 | 3 |
|-----------|
| 4 | 5 | 6 |
|-----------|
| 7 | 8 | 9 |
+-----------+

+-------------------+
|  1 |  2 |  3 |  4 |
|-------------------|
|  5 |  6 |  7 |  8 |
|-------------------|
|  9 | 10 | 11 | 12 |
|-------------------|
| 13 | 14 | 15 | 16 |
+-------------------+

+------------------------+
|  1 |  2 |  3 |  4 |  5 |
|------------------------|
|  6 |  7 |  8 |  9 | 10 |
|------------------------|
| 11 | 12 | 13 | 14 | 15 |
|------------------------|
| 16 | 17 | 18 | 19 | 20 |
|------------------------|
| 21 | 22 | 23 | 24 | 25 |
+------------------------+
</pre>

> That was just [an exercise in self-indulgence].

Let's take a look at the [before and after]:

<pre class="math">
             +-----------+              +-----------+
             | 1 | 2 | 3 |              | 7 | 4 | 1 |
             |-----------|              |-----------|
             | 4 | 5 | 6 |    =====>    | 8 | 5 | 2 |
             |-----------|              |-----------|
             | 7 | 8 | 9 |              | 9 | 6 | 3 |
             +-----------+              +-----------+


     +-------------------+              +-------------------+
     |  1 |  2 |  3 |  4 |              | 13 |  9 |  5 |  1 |
     |-------------------|              |-------------------|
     |  5 |  6 |  7 |  8 |              | 14 | 10 |  6 |  2 |
     |-------------------|    =====>    |-------------------|
     |  9 | 10 | 11 | 12 |              | 15 | 11 |  7 |  3 |
     |-------------------|              |-------------------|
     | 13 | 14 | 15 | 16 |              | 16 | 12 |  8 |  4 |
     +-------------------+              +-------------------+


+------------------------+              +------------------------+
|  1 |  2 |  3 |  4 |  5 |              | 21 | 16 | 11 |  6 |  1 |
|------------------------|              |------------------------|
|  6 |  7 |  8 |  9 | 10 |              | 22 | 17 | 12 |  7 |  2 |
|------------------------|              |------------------------|
| 11 | 12 | 13 | 14 | 15 |    =====>    | 23 | 18 | 13 |  8 |  3 |
|------------------------|              |------------------------|
| 16 | 17 | 18 | 19 | 20 |              | 24 | 19 | 14 |  9 |  4 |
|------------------------|              |------------------------|
| 21 | 22 | 23 | 24 | 25 |              | 25 | 20 | 15 | 10 |  5 |
+------------------------+              +------------------------+
</pre>

# Implementation

Here's a nice function to create an `N x N` array:

<pre class="math">
def make_matrix(rows):
    matrix = []
    row = []
    for i in range(1, rows**2 + 1):
        row.append(i)
        if i % rows == 0:
            matrix.append(row)
            row = []
    return matrix
</pre>

> I'm aware that the [`numpy`] package has several APIs that can be used to create or operate on a matrix:
>
> - [array](https://numpy.org/doc/stable/reference/generated/numpy.array.html)
> - [matrix](https://numpy.org/doc/stable/reference/generated/numpy.matrix.html)
> - [reshape](https://numpy.org/doc/stable/reference/generated/numpy.reshape.html)
> - [shape](https://numpy.org/doc/stable/reference/generated/numpy.shape.html)
> - [transpose](https://numpy.org/doc/stable/reference/generated/numpy.transpose.html)
>
> et al.
>
> I'm sure you can guess my opinion.  If you're unsure about how to implement any of these yourself, don't use this package or any other until you understand what your code is doing.

And here's one way to rotate the matrix 90&#176; (there are others, of course):

<pre class="math">
def rotate(matrix):
    if not matrix or len(matrix) != len(matrix[0]):
        return False

    length = len(matrix)

    for i in range(length):                                             (1)
        for j in range(i):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]

    for i in range(length):                                             (2)
        for j in range(length // 2):                                    (3)
            matrix[i][j], matrix[i][length - 1 - j] = \
                    matrix[i][length - 1 - j], matrix[i][j]

    return matrix


print(rotate(make_matrix(4)))
</pre>

Notes:

1. Transpose the matrix.
1. Reverse the columns.  To rotate the matrix 90&#176; counterclockwise, reverse the rows instead.
1. This is reversing the row.  The same `for` loop be used for reversing a string (see below).

# Transposition

Let's look at the transposition that occurs in the first `for` loop.  Comment out the first second `for` loop and inspect the results:

<pre class="math">
def rotate(matrix):
    if not matrix or len(matrix) != len(matrix[0]):
        return False

    length = len(matrix)

    for i in range(length):
        for j in range(i):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]

#    for i in range(length):
#        for j in range(length // 2):
#            matrix[i][j], matrix[i][length - 1 - j] = \
#                    matrix[i][length - 1 - j], matrix[i][j]

    return matrix


for n in range(3, 6):
    print(rotate(make_matrix(n)))


             +-----------+              +-----------+
             | 1 | 2 | 3 |              | 1 | 4 | 7 |
             |-----------|              |-----------|
             | 4 | 5 | 6 |    =====>    | 2 | 5 | 8 |
             |-----------|              |-----------|
             | 7 | 8 | 9 |              | 3 | 6 | 9 |
             +-----------+              +-----------+


     +-------------------+              +-------------------+
     |  1 |  2 |  3 |  4 |              |  1 |  5 |  9 | 13 |
     |-------------------|              |-------------------|
     |  5 |  6 |  7 |  8 |              |  2 |  6 | 10 | 14 |
     |-------------------|    =====>    |-------------------|
     |  9 | 10 | 11 | 12 |              |  3 |  7 | 11 | 15 |
     |-------------------|              |-------------------|
     | 13 | 14 | 15 | 16 |              |  4 |  8 | 12 | 16 |
     +-------------------+              +-------------------+


+------------------------+              +------------------------+
|  1 |  2 |  3 |  4 |  5 |              |  1 |  6 | 11 | 16 | 21 |
|------------------------|              |------------------------|
|  6 |  7 |  8 |  9 | 10 |              |  2 |  7 | 12 | 17 | 22 |
|------------------------|              |------------------------|
| 11 | 12 | 13 | 14 | 15 |    =====>    |  3 |  8 | 13 | 18 | 23 |
|------------------------|              |------------------------|
| 16 | 17 | 18 | 19 | 20 |              |  4 |  9 | 14 | 19 | 24 |
|------------------------|              |------------------------|
| 21 | 22 | 23 | 24 | 25 |              |  5 | 10 | 15 | 20 | 25 |
+------------------------+              +------------------------+
</pre>

Ever since I was a little kid, I've loved patterns.  Little did I know that that would prove to be an invaluable quality later in my second act as a programmer.  We can look at the patterns in the data grids above to perhaps glean some insights into what is happening.

For instance, note that the transposition for each row increases in direct relation to the `N` size of the grid.  Just for fun, let's look at how we can use this knowledge to do the transposition in a different way:

<pre class="math">
def transpose(matrix):
    length = len(matrix)
    mat = []

    for n in range(length):                 (1)
        mat.append([matrix[0][n]])

    for row in mat:
        i = 0
        while i < length - 1:               (2)
            row.append(row[i] + length)     (3)
            i += 1

    return matrix
</pre>

Notes:

1. Using the `length`, create the rows and set the first value of each row (its cell) to the next integer in the sequence.  Refer to the matrices art above to help visualize this.
1. The `length` is one-based, so we need to subtract one to prevent any out-of-bounds errors!
1. Simply add the `length` to each previous value for all the cells in the row.  Again, this works because the matrix values are a sequence which we can leverage using the `length` value.

We can probably lose the first `for` loop, though.  After all, we already have the information needed to initiate the first value of each row by looking at the `length` property, which is a sequence.

<pre class="math">
def transpose(length):                      (1)
    matrix = []

    for n in range(length):                 (2)
        row = [n + 1]                       (3)
        i = 0
        while i < length - 1:               (4)
            row.append(row[i] + length)
            i += 1
        matrix.append(row)

    return matrix
</pre>

Notes:

1. We don't need the `matrix` itself, just its `length`.
1. This is now the only `for` loop.  We've essentially collapsed both of the prior two into just this one.
1. Seed each row with its initial value, which will be the next subsequent value in the sequence.  We add one because the `for` loop is zero-based (which can be changed obviously and is just an implementation detail).
1. We re-use the same `while` loop here.

However, the previous implementation is not using the matrix that was created in the `make_matrix` function but creating its own.  This, of course, invalidates our invariant of rotating the matrix in-place, so let's look at another implementation that does just this:

<pre class="math">
def transpose(matrix):                      (1)
    length = len(matrix)
    for i, row in enumerate(matrix):
        row[0] = i + 1                      (2)
        for j in range(1, length):          (3)
            row[j] = row[j - 1] + length    (4)
    return matrix
</pre>

Notes:

1. Again, we're passing in the existing `matrix`.
1. Seed each row with its initial value, which will be the next subsequent value in the sequence.  We add one because the `for` loop is zero-based (which can be changed obviously and is just an implementation detail).
1. Since the length of the matrix is the same as that of each of its rows (i.e., `matrix[0]`, `matrix[1]`, etc.), we just re-using the `length` variable here instead of calculating the length of each `row`.
1. Add the previous value in the row to the `length`.

Lastly, if we wanted to be cheeky, we could now rewrite the `rotate` function to use this new `transpose` helper function:

<pre class="math">
def rotate(matrix):
    if not matrix or len(matrix) != len(matrix[0]):
        return False

    matrix = transpose(matrix)

    for i in range(length):
        for jj in range(length // 2):
            matrix[i][jj], matrix[i][length - 1 - jj] = \
                    matrix[i][length - 1 - jj], matrix[i][jj]

    return matrix
</pre>

# In Reverse

Now, let's take a look at the second `for` loop that reverses each row.  But first, let's use the same loop to reverse a string:

<pre class="math">
def reverse_string(string):
    arr = list(string)
    length = len(arr)
    for i in range(length // 2):
        arr[i], arr[length - 1 - i] = arr[length - 1 - i], arr[i]
    return "".join(arr)
</pre>

Neat!

We can see this in action by commenting-out the first `for` loop:

<pre class="math">
def rotate(matrix):
    if not matrix or len(matrix) != len(matrix[0]):
        return False

    length = len(matrix)

#    for i in range(length):
#        for j in range(i):
#            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]

    for i in range(length):
        for j in range(length // 2):
            matrix[i][j], matrix[i][length - 1 - j] = \
                    matrix[i][length - 1 - j], matrix[i][j]

    return matrix


for n in range(3, 6):
    print(rotate(make_matrix(n)))


             +-----------+              +-----------+
             | 1 | 2 | 3 |              | 3 | 2 | 1 |
             |-----------|              |-----------|
             | 4 | 5 | 6 |    =====>    | 6 | 5 | 4 |
             |-----------|              |-----------|
             | 7 | 8 | 9 |              | 9 | 8 | 7 |
             +-----------+              +-----------+


     +-------------------+              +-------------------+
     |  1 |  2 |  3 |  4 |              |  4 |  3 |  2 |  1 |
     |-------------------|              |-------------------|
     |  5 |  6 |  7 |  8 |              |  8 |  7 |  6 |  5 |
     |-------------------|    =====>    |-------------------|
     |  9 | 10 | 11 | 12 |              | 12 | 11 | 10 |  9 |
     |-------------------|              |-------------------|
     | 13 | 14 | 15 | 16 |              | 16 | 15 | 14 | 13 |
     +-------------------+              +-------------------+


+------------------------+              +------------------------+
|  1 |  2 |  3 |  4 |  5 |              |  5 |  4 |  3 |  2 |  1 |
|------------------------|              |------------------------|
|  6 |  7 |  8 |  9 | 10 |              | 10 |  9 |  8 |  7 |  6 |
|------------------------|              |------------------------|
| 11 | 12 | 13 | 14 | 15 |    =====>    | 15 | 14 | 13 | 12 | 11 |
|------------------------|              |------------------------|
| 16 | 17 | 18 | 19 | 20 |              | 20 | 19 | 18 | 17 | 16 |
|------------------------|              |------------------------|
| 21 | 22 | 23 | 24 | 25 |              | 25 | 24 | 23 | 22 | 21 |
+------------------------+              +------------------------+
</pre>

If we're so inclined, we can also abstract this into a helper function:

<pre class="math">
def reverse(matrix):
    length = len(matrix)
    for i in range(length):
        for j in range(length // 2):
            matrix[i][j], matrix[i][length - 1 - j] = \
                    matrix[i][length - 1 - j], matrix[i][j]
    return matrix
</pre>

The `rotate` function now becomes:

<pre class="math">
def rotate(matrix):
    return reverse(transpose(matrix))
</pre>

We're now heading down the path towards [functional programming].  We've separated the helper bits into discrete pieces and named them appropriately, which greatly facilitates understanding and maintenance.  Further, `rotate` and its helpers have an [arity] of one which improves their use as potential building blocks for other programs.

> It's good to isolate parts of a program to see what each little fella is doing.  After all, it's not pre-ordained that this stuff will be fully understood without first exercising a bit of [freewill].

[in-place]: https://en.wikipedia.org/wiki/In-place_algorithm
[Cracking the Coding Interview]: https://www.crackingthecodinginterview.com/
[Everyone learns differently]: /2021/06/04/on-algorithms/
[`numpy`]: https://numpy.org/
[an exercise in self-indulgence]: https://www.youtube.com/watch?v=PWue-XcFFxw
[before and after]: https://www.youtube.com/watch?v=IK37o2F0cyc
[functional programming]: https://en.wikipedia.org/wiki/Functional_programming
[arity]: https://en.wikipedia.org/wiki/Arity
[freewill]: https://www.youtube.com/watch?v=urBpdyFCZmo

