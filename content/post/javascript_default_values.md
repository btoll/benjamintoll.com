+++
title = "On JavaScript Default Values"
date = "2018-10-31T22:31:47-04:00"

+++

With the advent of [ECMAScript 2015], the JavaScript language finally supported true [default parameters], among other things.

Of course, for years developers have gotten around the official syntactical support by using the [logical OR] operator:

	let method = m || "GET";

This works, but it's really just a workaround.

## Some History

A little-known but massively popular JavaScript library had come up with another way of expressing default parameter values that was more in line with what eventually landed in ES 6, although it did have the (unfortunate?) condition that one needed to augment `Function.prototype` (well, there are other ways, but only wimps don't augment the native types).

> Incidentally, this is the strategy that [Sulla] took after things began to settle down after his proscriptions in 81 BCE.

## Let's See Some Code

<pre class="math">
Function.prototype.defaults = function (obj, name) {
    const func = this;
    const params = arguments;

    if (func.length < params.length) {
        throw new Error("Too many default arguments.");
    }

    let arr = [...arguments, ...Array(fn.length - params.length)];

    return function () {
        const args = arguments;

        return func.apply(
            null,
            [...args, ...arr.slice(args.length, arr.length)]
        );
    };
};

const foobar = function (a, b) {
    console.log(a);
    console.log(b);
}.defaults("default_a", "default_b");

foobar("marius"); // "marius"
                  // "default_b"
</pre>

## What Is It Doing?

The outer function will make an array from any passed arguments and stuff it into the `arr` variable.  The trick is to check the function length (the number of arguments the function was defined with) by the number of arguments actually passed at runtime.  If `fn.length - params.length` is greater than zero, then the difference will be appended to the new array as `undefined` types.

The inner function (a `closure`) will call the closed-over original function and pass it an array of runtime arguments and any default values that are needed that were captured in the outer function.

Weeeeeeeeeeeeeeeee

## In the Bad Old Days

So how did we concat arrays and work with the array-like `arguments` object before the nifty `spread` operator was gifted to us by the JavaScript overlords?  By "borrowing" the `slice` function from `Array.prototype`, naturally.

So, instead of the sweet, sweet succinctness of:

    let arr = [...arguments, ...Array(fn.length - params.length)];

You'd have to do:

    let arr = Array.prototype.slice.apply(params)
        .concat(new Array(func.length - params.length));

Kids today!

[ECMAScript 2015]: https://www.ecma-international.org/ecma-262/6.0/
[default parameters]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters
[logical OR]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_Operators#Description
[Sulla]: https://en.wikipedia.org/wiki/Sulla

