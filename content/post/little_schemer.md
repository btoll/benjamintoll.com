+++
title = "On The Little Schemer"
date = "2023-11-12T19:36:24-05:00"

+++

["oooooooooo oooooooooo you were the little schemer..."](https://www.youtube.com/watch?v=_4wGJBBnfqQ)

I saw a comment on the Internets somewhere that went along the lines of "after doing OOP for 20 years, I found Lisp and realized that I had completely wasted my time."

I felt the same way when I first stumbled upon functional programming (FP).

I'm not sure what the *actual* first thing was, but at the time I was programming in JavaScript and using the FP paradigms that it provides.  I read [Reginald Braithwaite] and began using the [Ramda] library, and I started [using it for projects] whenever I could.

As I (finally) moved a away from the frontend and JavaScript, I brought these paradigms to other dynamically-typed languages like [Python] and Ruby.  Because, after all, principles such as pure functions, partial application and composition are ones that ~~could~~ should be used whenever and wherever possible.

Now, I am not a mathematician, and my understanding of FP doesn't go tremendously deep, but I've studied it enough to know how incredibly powerful these ideas are.  And I know enough to know that side effects should be avoided at all costs.

Later, [I'd program in Elm] for a couple of years.

Recently, I've been reading [The Little Schemer], 15 years after [Douglas Crockford] admonished JavaScript programmers to read it.

> I'm using MIT/GNU Scheme Release 12.1.

|**Function** |**Description**
|:---|:---
|`car` |Retrieves the first S-expression in a list.
|`cdr` |Retrieves the rest of the S-expressions in a list. The `cdr` of a non-empty list will always be a list.
|`cons` |Adds an S-expression to the front of a list. Takes two arguments, the second of which must be a list.

Let's take a look at a function that prints the `nth` number of the [Fibonacci sequence]:

```scheme
(define fib
  (lambda (d)
    (cond
      ((< d 2) d)
      (else (+ (fib (- d 1)) (fib (- d 2)))))))


(display (fib 23))
; 28657
```

Is an `atom` present in a list of `atoms`?

```scheme
(define member?
  (lambda (a lat)
    (cond
      ((null? lat) #f)
      (else (or (eq? (car lat) a)
              (member? a (cdr lat)))))))

(display (member? 'bar '(foo bar quux)))
; #t
```

First Commandment: Always ask `null?` as the first question in expressing any function.  This is the base condition of the recursive function.

> The previous function definition and commandment are taken directly from The Little Schemer.

The idea with Lisp and Lisp dialects is simple and astounding: data is code and code is data ([homoiconicity]).  Working with abstract syntax trees (AST) is pretty amazing and elegant and simple.

## References

- [`btoll` on GitHub](https://github.com/btoll)

[MIT/GNU Scheme]: https://www.gnu.org/software/mit-scheme/
[using it for projects]: https://github.com/btoll/rupert-fp
[I'd program in Elm]: https://github.com/btoll?tab=repositories&q=&type=&language=elm
[The Little Schemer]: https://mitpress.mit.edu/9780262560993/the-little-schemer/
[Fibonacci sequence]: https://en.wikipedia.org/wiki/Fibonacci_sequence
[Reginald Braithwaite]: https://leanpub.com/javascriptallongesix
[Ramda]: https://ramdajs.com/
[Douglas Crockford]: https://www.crockford.com/about.html
[Python]: https://github.com/btoll/scale_buddy
[homoiconicity]: https://www.youtube.com/watch?v=o7zyGMcav3c

