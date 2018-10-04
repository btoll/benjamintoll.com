+++
title = "On JavaScript Type Tricks"
date = "2018-10-03T17:08:59-04:00"

+++

Everybody knows that JavaScript is a dynamically typed and multi-paradigm language.  After having recently worked with some languages that are statically typed (Golang, Elm), I fully appreciate the benefits and safety that come with having a compiler.

I recently reluctantly added Flow to a React project that I've been doing in my spare time, and in so doing I remembered in a flash of bright white light that I had written a function ten years ago for my jsLite JavaScript library that enforced type checking (and parameter length).  Ah, those halcyon days of yore when everyone wrote their own JavaScript library/framework!  Definitely the most fun I've had when programming JavaScript.  It was a different time, when little bands of merry men roamed the wilds and frontend developers were expected to know the language itself rather than a framework.

Anyhoo, I thought the idea to force the language to do type checks at runtime was pretty nifty.  I worked out an implementation and included it my library, where it augmented the [`Function.prototype`] object.\*  The function was called `assert` and ensured not only that the function was invoked with the correct types but also the correct number of arguments that the function was expecting.  Here is an example:

	const foobar = (a, b) {
		console.log(a);
		console.log(b);
	}.assert(Boolean, Number);

If `foobar` is called with exactly two arguments, the first being a Boolean type and the second a Number, everything is right with the world.  Otherwise, it will throw.  Let's verify that in the console:

	foobar(false, 1992);
	false
	1992

	foobar();
	Uncaught Error: Function arguments do not equal number of expected arguments.
	    at <anonymous>:7:23
	    at <anonymous>:1:1

	foobar(true);
	Uncaught Error: Function arguments do not equal number of expected arguments.
	    at <anonymous>:7:23
	    at <anonymous>:1:1

	foobar(true, 'asdf');
	Uncaught Error: Wrong data type for function argument 2.
	    at Array.from.forEach (<anonymous>:12:27)
	    at Array.forEach (<anonymous>)
	    at <anonymous>:10:35
	    at <anonymous>:1:1

The implementation is rather straightforward.  The `assert` function wraps the base function, which is returned as a closure.

Here are the important bits:

1. The outer wrapper function (`foobar`) captures a reference to itself and its arguments (the constructors, i.e., Boolean and Number) and returns an inner function (closure).

2. The closure is invoked (i.e., `foobar(false, 42)`), and then two checks are made:

	- Its argument length is compared to the [expected number of arguments] of the wrapper function (`fn.length`) and throws an exception if it's not the same.

	- The type of its parameters are checked against those of the arguments captured in the wrapper function (available via the `[[Scope]]` chain).  The equality checks are ensuring that the ["constructor" functions] are the same.

3. Finally, if everything is okey dokey, call the wrapper function with the `arguments` object passed to the closure.  Note that each function has a different `arguments` object, which is why we're having to capture the outer `arguments` object in the `args` free variable that the closure closes over.

Here is the implementation:

	Function.prototype.assert = function () {
		const fn = this;
		const args = arguments;

		return function () {
			if (fn.length !== arguments.length) {
				throw new Error('Function arguments do not equal number of expected arguments.');
			}

			Array.from(arguments).forEach((a, i) => {
				if (a.constructor !== args[i]) {
					throw new Error(`Wrong data type for function argument ${++i}.`);
				}
			});

			// Finally, invoke the parent function.
			return fn.apply(this, arguments);
		};
	};

Weeeeeeeeeeeeeeeeeeee

\* I know, augmenting native types is "bad", just like mixing JavaScript with HTML.

[`Function.prototype`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/prototype
[expected number of arguments]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/length
["constructor" functions]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/constructor

