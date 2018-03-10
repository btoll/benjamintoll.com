+++
title = "On Being Performant"
date = "2018-03-10T12:23:59-05:00"

+++

Few things are more ridiculous than the frontend community's long-standing obsession with performance.  In this one-click world, if an action doesn't take 0.00000000001 ms to complete then there is a cabal of senior frontend engineers running around with their hair on fire.  And if we're unlucky, they'll then clutter the landscape with yet another tool/framework/library to do the same thing.

To be clear, I'm not talking about network latency.  And I'm not talking about user actions in the browser that take [more than 100ms] to complete that do cause a noticeable lag to the user or about applications where performance is essential, like games.  I'm talking about your average website or application.  Several milliseconds difference in rendering time when creating that data table just isn't important to me and, I would guess, at least a couple of other people.  And it certainly doesn't warrant a complete rewrite to use your tool/framework/library.

This peculiar absurdity can also be witnessed among the frontend build tools.  If the build tool that I'm using takes longer than another, I can live with that.  If it's doing what I want, and it's extensible and easy to manage, who cares?  I mean, [cmon], it's a frigging build tool.  And why use anything other than `make`, anyway? **:)**

If best performance truly is the goal, then don't use JavaScript.  It's not the right tool.  It's reasonable to use it as a compile target (although then you have the same "performance" issues, of course) or for prototyping, but I certainly don't think companies should be building teams and products around it.  Instead, use a statically-typed language that compiles to web assembly.  There are several that do (C, C++, Rust, [Go], and others that have experimental support) and wasm is already supported in all the major browsers.

So, go out and boldly learn a systems programming language.  It will make you a better programmer.  It will make you more confident.  It might even make you more "performant".

And performant?  It's [not even a word].

[more than 100ms]: https://stackoverflow.com/a/2547903
[cmon]: https://www.youtube.com/watch?v=SP_9zH9Q44o
[Go]: https://github.com/golang/go/issues/18892
[not even a word]: https://www.merriam-webster.com/dictionary/performant

