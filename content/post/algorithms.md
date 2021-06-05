+++
title = "On Algorithms"
date = "2021-06-04T21:54:25-04:00"

+++

Hello.  This post is not about solving algorithms.  Instead, I'm going to briefly discuss how I mentally approach them, which I feel is as valuable as disentangling the algorithms themselves.

# Use a Pencil\*

Always, always, always use a pencil and write the algorithm on paper.  Do not attempt to do it in your head in front of the computer.  My tiny human brain is not designed to hold many different variables with constantly changing values, and I suspect that yours may be the same.  That's what a computer is for!  It's just too easy to get confused.

Here are the different ways I used to think about using paper and pencil to solve an algorithm:

- I was cheating.
- I wasn't good enough to figure it out "on my own".
- I wasn't smart enough.
- It was a crutch.

It turns out, I was completely wrong about all of them.  What an idiot!

These hangups would cost me dearly in interviews as I would botch simple problems.  If I had simply stepped-through the algorithms on paper, I would have caught many of the mistakes that I was making.

In retrospect, they were easy to catch.  For example, I found that doing any sort of sorting algorithm in my head would inevitably lead to [off-by-one errors].  However, writing it by hand would almost immediately expose the error(s).

Now, unless I've already done the problem many times, I don't go near a keyboard until I've written down the code on paper.  And note that I said code, not pseudocode.  Yes, all the braces and brackets and colons that are needed for it to be a complete, running program.

# Don't Memorize

Maybe in the beginning, upon first exposure, it's ok to memorize a solution, but it won't get you far.  I found myself doing this at first, and I quickly got myself more confused as I would try to solve a problem from memory rather than through logic.  It's the latter that's the muscle that needs worked and improved.

Many problems can be solved by using algorithms as building blocks.  Figuring out these solutions can only be done by reasoning through the problem, with an eye to the best conceivable runtime and the data structures that can help achieve it.  If you've simply memorized how to construct several data types, that won't help you understand how they can fit together to construct an elegant and efficient solution.

It's really important to take the time needed to really understand what an implementation is doing.  This is time-consuming!  Set breakpoints and step through it.  Don't move onto the next problem until the current one has been fully understood.

# Repeat Yourself

Need to sort a list?  Don't use the standard library of the language you're using.  Write out your own bubble sort or insertion sort or merge sort or quicksort.

Need to sort a list again in a different script?  Write out the sort algorithm(s) again.  Or the linked list class.  Or the queue or stack implementation.  Or the BFS and DFS tree/graph traversal.

[Need to reverse something], like a string or an integer?  Write your own algorithm, and do it every time until it's second nature.

Doing this will help you tremendously.  Doing this will help you tremendously.  Doing this will help you tremendously.  Doing this will help you tremendously.  Doing this will help you tremendously.  Doing this will help you tremendously.  Doing this will help you tremendously.

# Take It Easy

Finally, the most important approach of the bunch.  Take it easy on yourself.  Don't compare yourself to anyone else.  This is a path of darkness.  I know, I've traveled it many times in my life, and not just with trying to solve algorithms.

The standard advice holds.  Only compare yourself to yourself, and compare yourself to your own progress.  If a problem is marked as "easy" but it takes you a long time to solve or you just give up and look at the answer, that's ok.  We're looking to achieve progress, not perfection.  Don't let other's ideas of the difficulty of an algorithm dictate **your** idea of it.

I have mixed feelings on the coding challenge sites that exist.  On the one hand, they're a great resource, and I've used several of them a lot.  But on the other hand, I believe they foster and reward some of the worst instincts among programmers.

It's good to have some idea of what the industry considers an "easy", "medium" and "hard" question, but I certainly don't think that [learning should be considered a sport].

Here's a novel idea:  learning is its own reward.

# Conclusion

At first, my main goal was to build my confidence when faced with problems that I'd likely be asked on an interview.  Along the way, though, the goal changed to learning for the sake of learning, as I discovered to my delight that it was really fun learning more about data structures and algorithms and how to apply them to solve problems.

One nice side effect of all of this was not worrying as much about interviews.  I may not know every problem, but I can reason through many and even have something to say about the ones that I don't understand.  Programming is hard, and no one can be expected to get everything right all of the time.

I have a repository that is a dumping ground for algorithms and data structures, [`howto-algorithm`].  There's no rhyme or reason to it, though, and I'm afraid there's not much documentation or links.  [So it goes].

Finally, just as with any industry, there are a lot of turds floating around.  Ignore them and their insecurities, keep your focus and remember who you are.  If I can get better at algorithms, anyone can, and that means you!  Yeah!

I now conclude this conclusion.

---

\* Yes, a pencil, not a pen.  And get a manual sharpener.

[off-by-one errors]: https://en.wikipedia.org/wiki/Off-by-one_error
[Need to reverse something]: /2021/05/23/on-reversing-things/
[learning should be considered a sport]: https://www.geeksforgeeks.org/competitive-programming-a-complete-guide/
[`howto-algorithm`]: https://github.com/btoll/howto-algorithm
[So it goes]: https://www.goodreads.com/questions/251943-what-does-so-it-goes-mean-the-narrator

