+++
title = "On dump_describes"
date = "2019-06-22T15:43:17-04:00"

+++

This post is about a JavaScript tool I wrote several years ago called [`dump_describes`].

---

From the [README]:

> `dump_describes` is a tool that provides a high-level view of all of the `describe` and `it` blocks in a test suite. This is useful to quickly gain familiarity with a particular suite and to easily determine where to insert new tests.
>
> Any testing framework that uses describe and it blocks to define a suite is supported, such as Jasmine, Mocha and Jest.

So, it is a tool that quickly enables me to get a “bird’s eye” view of the organization of a particular test suite.

## Why?

I hate code duplication. I mean, I really hate it. Especially when there are only very minor differences. Refactoring that can sometimes be a nightmare, as well, when trying to understand the need for the differences and the provenance of the code that depends on it.

Admittedly, it’s not as much of a problem when it comes to testing, but I do not want to spend time writing tests to only later discover that they already exist. And this situation would occur more frequently that you might think, especially at companies that (rightfully) prioritize unit testing.

For example, when I worked at [Sencha] on the [Ext] team, we wouldn’t merge any commits that didn’t have at least one test (for very minor fixes), and usually they needed several. The tests were very comprehensive, and subsequently, it would be very easy to miss existing coverage. Our test files were regularly thousands of lines long, and, depending on your opinion, the tests and the suites were either well-named or they weren’t.

As you can imagine, it was difficult to determine if the code that had been written or fixed had test coverage. If the suite was over two thousand lines long, with many nested `describe` blocks, it would be easy to miss existing coverage, especially if it were hastily named.

## First Pass

In fact, it was after realizing that I had again duplicated tests that I, frustrated, created a `sed` command that would list all the `describe` blocks that would at least give me some basic sense of the structure of the test suite.

> Interestingly, I still have the original `sed` script commented-out in my [dotfiles]. [Here it is], nestled in my `.bash_functions` file:
>
>     # Deprecating this in favor of https://github.com/btoll/dump_describes node module.
>     # I'm leaving it here just for an example of a `sed` command.
>     #dump_describes() {
>     #    sed -n -E 's/^[[:space:]]{1,7}describe\('\(.*\)'/\1/p' "$1" | cut -d, -f1
>     #}
>
>
> Weeeeeeeeeeeeeeeeeeeeeeee

This “worked”, but it was pretty awful. Ignoring the obvious problems with it, it doesn’t print nested `describe` blocks, and of course, the tests themselves (the `it` blocks). What I needed was something that would create an [abstract syntax tree], so I could walk the tree and control what to print.

## Parsing

Luckily for me, I worked with the creator of [Esprima], a popular JavaScript parser, and I decided to use it for this project. It would be my introduction to tooling, something that has always interested me.

Esprima has a very handy [online tool] that, given some valid JavaScript, will print the AST. I [hacked together] a [visitor pattern] to visit each node and capture what I needed.

> I’ve since written several tools that rely upon this base code, which I’ve now abstracted to its own repository, [`onf-static`].

This is great, but now I needed to write some code that would take those captured node objects and print them in a human-readable way. The initial goal, of course, would be to print them to `stdout`.

Let's look at the built-in generators that ship with the tool.

## Generating

`dump_describes` comes with three generators that will provide different views of the AST:

- [LOG]

    - Dumps the results to `stdout`. This is the default.

- [HTML]

    - Creates an `.html` file that can be viewed in a browser. There is a minimal amount of JavaScript on the page that will allow for expanding and collapsing of the `describe` blocks.
- [MARKDOWN]

    - You guessed it :)

See the [README] for examples.

I’ve tried to make it as straightforward as possible to extend or create your own custom generators if the ones out-of-the-box aren’t sufficient for your use case(s). For instance, as long as your generator defines and exports a `print` function, it can be plugged into `dump_describes`. The `print` function will be called by the program and passed the results of walking the AST and any programmer-defined options. The only requirement is that `print` returns a [`Promise`].

Check out the generator examples above to understand how easy it is to work with the passed `results` to print a view that is suitable to your use case.

## Conclusion

This project was really fun to do.  It was my first hand at using the results of an AST, and I learned a lot.  Which is always the point, right?

I still use `dump_describes` every time I'm writing unit tests in JavaScript, and you should, too!  And, if not, there's a word for people like you.  Loser.

[`dump_describes`]: https://github.com/btoll/dump_describes
[README]: https://github.com/btoll/dump_describes/blob/master/README.md
[Sencha]: https://www.sencha.com/
[Ext]: https://en.wikipedia.org/wiki/Ext_JS
[dotfiles]: https://github.com/btoll/dotfiles/
[Here it is]: https://github.com/btoll/dotfiles/blob/master/bash/.bash_functions
[abstract syntax tree]: https://en.wikipedia.org/wiki/Abstract_syntax_tree
[Esprima]: http://esprima.org/
[online tool]: http://esprima.org/demo/parse.html
[hacked together]: https://github.com/btoll/onf-static/blob/master/src/visitor.js
[visitor pattern]: https://en.wikipedia.org/wiki/Visitor_pattern
[`onf-static`]: https://github.com/btoll/onf-static/
[LOG]: https://github.com/btoll/dump_describes/blob/master/src/generator/log.js
[HTML]: https://github.com/btoll/dump_describes/blob/master/src/generator/html.js
[MARKDOWN]: https://github.com/btoll/dump_describes/blob/master/src/generator/markdown.js
[`Promise`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise

