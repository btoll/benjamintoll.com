+++
title = "On JavaScript Object Delegation"
date = "2018-09-28T22:52:56-04:00"

+++

Over the past couple of years, I've been programming with [Elm] and [Golang], with very little JavaScript development.  However, [that changed recently] as I've begun working with [React], and if I'm going to be doing JavaScript development, React is fine and better than all the alternatives (except for plain JavaScript and [PeteJS], obviously).

Although I'm already missing having a true compiler, I dove back into the language with gusto and rediscovered how much I love it.  I have a long history with JavaScript, and I've always enjoyed its terseness and malleability and the simplicity of prototypal-inheritance.

> Even though I believe prototypal-inheritance to be simple, it's not easy.  I remember struggling mightily to wrap my head around it, and it took me years to feel truly comfortable explaining it to someone else (which is when I knew it had finally sunk in).

Why is prototypal-inheritance so confusing?  I blame much, if not all, of this confusion on JavaScripters themselves, as they've tied themselves in knots trying to turn JavaScript into a class-based language.  In the beginning, this was an unveiled attempt to sycophantically appeal to the Java community for its adoption.  However, for years now, JavaScript has been ranked among the most popular and most-used programming languages (undoubtedly due to its historically unique placement in the browser), so that pretense has rather become outdated.  This continued promotion of "classness" by the community (and now [its codification]) means that this confusion will not abate anytime soon.

Witness the classical-inheritance models that have been around since the days of some of the earliest JavaScript frameworks ([ExtJS], [MooTools], [Dojo]), to the inclusion of a [`class` keyword] in ECMAScript 2015 and its unfortunate adoption by libraries such as React.  JavaScripters talk about classes and methods when they really mean functions, and of course there's the unfortunate inclusion of the `new` keyword in the language (another nod to the Java community) that has a regular function assume the behavior of a "constructor".

In my own work, unless I've had a gun to my head, I've avoided using classical-inheritance in all its forms.  There, I said it.

---

When I was at my last corporate job, the team I was on had a tremendous opportunity to go in a new direction.  The legacy code that we were still supporting was written in CoffeeScript using the Backbone library, and everyone agreed that it was cumbersome and time for a rewrite.  I advocated [TypeScript] or Elm, or at the very least to be very judicious of what we used in the new (at the time) "ES6" specification.  In addition, our "build"<sup>1</sup> system was a mess and extremely over-engineered to the point that no one currently understood it in its entirety.  I proposed simply using [`make`] and proceeded to write a `Makefile` that reduced the Byzantine complexity of the current system to a handful of `make` targets that everyone could easily understand.

I then gave a talk called **[Classes vs Simple Object Delegation in JavaScript]** to the team.  The talk was well-received, but the team decided to use `class` and classical-inheritance.  So be it, although  I don't know what became of it, as I left the company shortly afterwards.

What didn't surprise me, though, was that all but one of the front-end developers in the room were reacting to this information as if hearing it for the first time.  I'd seen this a lot when I would interview candidates for JavaScript roles; they would rarely be able to discuss prototypal-inheritance in any meaningful way.

Confusion, anyone?

---

So what's the point of this?  Well, during the discussion that followed my presentation, the following exchange was heard by a fly on the wall:

> **Senior Frontend Developer**: I like the `super` call!  That's the main reason why I want to use `class`!
>
> **Me**: Um.

Personally, I think the need to call a shadowed property, which is essentially what a call to `super` is doing, is a sign that the design is flawed.  There are other, more elegant ways to achieve the kind of pre-preprocessing on a newly-minted object that a constructor function affords (one such way is through the use of mixins).

Anyway, even though it's a hybrid of both classical and prototypal inheritance models, I thought it would be fun to implement it, so I went home and [wrote a short script] that injects an object with a `super` function property into the prototype chain that allows for calling a shadowed super, or parent, function.

The key function is `create`.  This wraps the traditional way of effecting object delegation in JavaScript, the [`Object.create`] function.  It does the following things:

1. Sets up the prototype chain by passing the `proto` object to `Object.create`, thus serving as the new object's prototype.

2. Inserts a base prototype between the first object in the prototype chain (either `Object.prototype` or `null`) and the first user-defined object in the chain.  The prototype chain will then look something like this:

    <pre class="math">
    Object.prototype / null
             |
             |
         base proto (contains `super` function property)
             |
             |
           proto
             |
             |
        { new object }
    </pre>

    This is necessary to allow for the `super` call to be accessible via the prototype chain.  Without it, the lookup would return `undefined` and the call would throw an exception.

3. `create` allows an object of functions to be passed as an optional second parameter.  If defined, each property in the object is enumerated and the `__SUPER__` symbol is bound to the function.  This will invoke the shadowed property function when `this.super()` is called.  Here is the `enableSuper` function:

    <pre class="math">
    const enableSuper = (obj, proto) => {
        const keys = Object.getOwnPropertySymbols(obj).concat(Object.keys(obj));

        for (let key of keys) {
            const fn = obj[key];

            if (
                !fn[__SUPER__] &&
                isFunction(proto[key]) &&
                isFunction(fn)
            ) {
                fn[__SUPER__] = proto[key];
            }
        }
    };
    </pre>

	Here, you can see how the `super` function is bound on each enumerated function if a same-named function property is in the prototype chain.  Note that the function could be in any object in the chain, it doesn't have to be the directly-linked prototype (`proto[key]` does a lookup of the whole chain).

Another thing to note is that I've used [Symbol types] in my implementation to avoid property collisions on the objects.

How do you use it?  Well, you could set up a base object:

<pre class="math">
const base = {
    name() {
        console.log('I am base');
    },
    sum(list) {
        console.log(
            list.reduce((acc, curr) => (
                acc += curr, acc
            ))
        );
    }
};
</pre>

Any object could delegate to it:

<pre class="math">
const foo = d.create(base, {
    name() {
        console.log('I am foo');
        this.super();
    }
});
</pre>

Call its functions:

```
foo.name(); // "I am foo"
            // "I am base"

foo.sum([1, 2, 3, 4, 5]); // 15
```

You get the idea.  Weeeeeeeeeeeeeeeeeeeee

Please check out the module, which I've named [`delegate-this`] for lack of a better name.  It's well-commented and clearly written and [available on `npm`].

---

1. I always get a case of the chuckles when JavaScripters use the term "build".

[Elm]: http://elm-lang.org/
[Golang]: https://golang.org/
[that changed recently]: https://www.youtube.com/watch?v=S-IkWpm7TS0
[React]: https://reactjs.org/
[PeteJS]: https://github.com/btoll/PeteJS
[its codification]: https://www.ecma-international.org/ecma-262/6.0/#sec-class-definitions
[ExtJS]: https://en.wikipedia.org/wiki/Ext_JS
[MooTools]: https://en.wikipedia.org/wiki/MooTools
[Dojo]: https://en.wikipedia.org/wiki/Dojo_Toolkit
[`class` keyword]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
[TypeScript]: http://www.typescriptlang.org/
[`make`]: https://www.gnu.org/software/make/
[Classes vs Simple Object Delegation in JavaScript]: https://www.benjamintoll.com/talks/classes_vs_simple_object_delegation_in_javascript.pdf
[wrote a short script]: https://github.com/btoll/delegate-this/blob/master/index.js
[`Object.create`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
[Symbol types]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol
[`delegate-this`]: https://github.com/btoll/delegate-this
[available on `npm`]: https://www.npmjs.com/package/delegate-this

