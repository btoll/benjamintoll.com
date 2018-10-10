+++
title = "On JavaScript Function Overloading"
date = "2018-10-09T16:55:34-04:00"

+++

Function overloading, whereby an implementation of a named function is called depending upon the type or [arity] of its parameters, is usually associated with statically-typed languages and doesn't exist in JavaScript.  However, since the language is so flexible, this feature can be simulated at runtime.

I first was exposed to this idea in JavaScript by John Resig in an [old post] of his.  At the time, I was just beginning to really delve into the language, and his implementation seemed like magic.  I just couldn't get my head around it at first.  It relies heavily upon closures for one, and unfortunately, there weren't many authoritative sources on that topic in 2007.

> The best resource, by far, on closures in JavaScript is by [Jim Ley].  This is still a must-read.  I remember poring over it as I waited to be called for jury duty in Harrisburg, PA.

## Can I Haz Code?

Using his code as a guide, I wrote an implementation that could be called within a constructor when using classical inheritance (remember, this was 2007).

Here 'tis:

	Function.prototype.overload = function (obj, name) {
	    const fn = this;
	    const oldFn = obj[name];

	    if (!obj.args) {
			obj.args = {};
	    }

	    // Store each "method"'s function length.
	    obj.args[fn.length] = true;

	    obj[name] = function () {
			const args = arguments;

			if (obj.args[args.length]) {
			    return fn.length === args.length ?
					fn.apply(this, args) :
					oldFn.apply(this, args);
			} else {
			    throw new Error('Does not match function signature.');
			}
	    };
	};

And the code that uses it:

	function JavaScripters() {
	    const programmers = [
			'Doug Crockford',
			'Dean Edwards',
			'John Resig',
			'Nicholas Zakas'
	    ];

	    (() => {
			return programmers;
	    }).overload(this, 'find');

	    (name => {
			return programmers.indexOf(name);
	    }).overload(this, 'find');

	    ((first, last) => {
			return programmers.includes(`${first} ${last}`);
	    }).overload(this, 'find');
	}

	const programmers = new JavaScripters();

	console.log(programmers.find());
	console.log(programmers.find('Dean Edwards'));
	console.log(programmers.find('Dean', 'Edwards'))

Here's an example that uses the `prototype` object as the receiver:

	function JavaScripters() {
	    const programmers = [
			'Doug Crockford',
			'Dean Edwards',
			'John Resig',
			'Nicholas Zakas'
	    ];

	    (() => {
			return programmers;
	    }).overload(JavaScripters.prototype, 'find');

	    (name => {
			return programmers.indexOf(name);
	    }).overload(JavaScripters.prototype, 'find');

	    ((first, last) => {
			return programmers.includes(`${first} ${last}`);
	    }).overload(JavaScripters.prototype, 'find');
	}

	const programmers = new JavaScripters();

	console.log(programmers.find());
	console.log(programmers.find('Dean Edwards'));
	console.log(programmers.find('Dean', 'Edwards'))

And if the function is called with more parameters than expected, it will throw:

	console.log(programmers.find('Dean', 'Easy', 'Edwards'));

	Uncaught Error: Does not match function signature.
	    at JavaScripters.obj.(anonymous function) [as find] (file:///derp.html:28:19)
	    at derp.html:51

## How It Works

The idea is to store a reference to the previous same-named function (note that the first time called `obj[name]` **should** be `undefined`) and to capture its parameter length in an object that will be referred to by the closure to determine when to call a particular implementation.  The implementation is then bound to the object, which then allows it to be cached/stored the next time `overload` is invoked.  Rinse and repeat.

The closure (which isn't returned in this case but bound to the passed object `obj`), will be able to determine which implementation to call by comparing the number of arguments it was called with to the number of parameters it was defined with.  If equal, it will call its implementation, if not, it will call the cached `obj[name]` function and do the length comparison again.  This is how the runtime is mimicking function overloading.

> Note that this works because of the nature of closures, which store their free variables in an internal `[[Scope]]` property that is captured on the function at runtime.  Thus, every closure "knows" of the previous call to `overload` that it shadowed because it is bound to it in the `oldFn` variable.
>
> In this way, all the calls to the same-named function are unwound.

## Use With Object Delegation

How do you use this pattern with object delegation?  I'm glad you asked, because everyone knows that using the `class` keyword and/or the classical inheritance pattern is for suckers.

Here's one way:

	const base = {
	    programmers: [
			'Doug Crockford',
			'Dean Edwards',
			'John Resig',
			'Nicholas Zakas'
	    ]
	};

	(() => {
	    return base.programmers;
	}).overload(base, 'find');

	(name => {
	    return base.programmers.indexOf(name);
	}).overload(base, 'find');

	((first, last) => {
	    return base.programmers.includes(`${first} ${last}`);
	}).overload(base, 'find');

	const javascripters = Object.create(base);

	console.log(javascripters.find());
	console.log(javascripters.find('Dean Edwards'));
	console.log(javascripters.find('Dean', 'Edwards'));

That's a bit unwieldy, so let's write the `overload` implementation as a standalone function rather as an augmentation of `Function.prototype`:

	const overload = (obj, name, fns) => {
	    fns.forEach(fn => {
			const oldFn = obj[name];

			if (!obj.args) {
			    obj.args = {};
			}

			// Store each function length.
			obj.args[fn.length] = true;

			obj[name] = function () {
			    const args = arguments;

			    if (obj.args[args.length]) {
					return fn.length === args.length ?
					    fn.apply(obj, args) :
					    oldFn.apply(obj, args);
			    } else {
					throw new Error('Does not match function signature.');
			    }
			};
	    });
	};

With only a few minor changes, `overload` now accepts an array of functions to "overload".  And this implementation is especially nice, as it removes the dreaded `this` object, which is an excellent benefit of using object delegation.

To use:

	const base = {
	    programmers: [
			'Doug Crockford',
			'Dean Edwards',
			'John Resig',
			'Nicholas Zakas'
	    ]
	};

	overload(base, 'find', [
	    () => {
			return base.programmers;
	    },

	    name => {
			return base.programmers.indexOf(name);
	    },

	    (first, last) => {
			return base.programmers.includes(`${first} ${last}`);
	    }
	]);

	const javascripters = Object.create(base);

	console.log(javascripters.find());
	console.log(javascripters.find('Dean Edwards'));
	console.log(javascripters.find('Dean', 'Edwards'));

## In Conclusion

So, would I ever use this?  Probably not, but it was fun as hell to do, and it taught me a lot about closures, `this`, [`Function.length`] and the scope chain that gave me a lot of understanding and confidence about writing JavaScript.  This knowledge was especially useful when working with libraries and frameworks (both as a user and an author).

[arity]: https://en.wikipedia.org/wiki/Arity
[old post]: https://johnresig.com/blog/javascript-method-overloading/
[Jim Ley]: http://www.jibbering.com/faq/notes/closures/
[`Function.length`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/length

