+++
title = "On Generating Documentation with Sphinx"
date = "2021-04-03T20:43:33-04:00"

+++

> This post has a very narrow scope.  It's only about generating docs from `docstrings`.  It won't be covering any other use case for `Sphinx`, nor will it be covering anything about [`reStructuredText`].

I've been playing with [`Sphinx`] recently to generate documentation from the [`docstrings`] in my packages and modules, and I wanted to put down what I learned in black and white before I forget everything.

Eventually, I will add full documentation and probably add support for [Read the Docs], but for now I wanted a quick-and-dirty tutorial that I can refer to when/if my memory gets hazy.

# The Project

Years ago, I [created a version] of the classic game [Hangman] to run in a terminal.  This tiny little fella seemed to me a great candidate for which to generate my first-ever docs with `Sphinx`.

> Just prior to writing this article, I took the following steps to create a `requirements.txt` file that will be used to install `Sphinx` and its dependencies.
>
> If there are any questions about what this is doing, check out my primer [on `virtualenv`].
>
>       $ cd hangman
>       $ virtualenv venv
>       $ . venv/bin/activate
>       (venv) $
>       (venv) $ pip install sphinx
>       (venv) $ pip freeze > requirements.txt
>       (venv) $
>       (venv) $ deactivate
>       $ rm -rf venv
>
> I then committed this file and pushed it to [my GitHub].  Later, I high-fived a rando.

Let's get started!

# Enter ~~Sandman~~ `Sphinx`

Here are two ways to generate the `docstrings` as docs.  I'm sure there are more!

- [A not-so great way](#a-not-so-great-way)
- [A better way](#a-better-way)

### A not-so great way

All of the tutorials on `Sphinx` that I read had me start with the [`sphinx-quickstart`] command.  This invoked a sort of wizard that had me answer a number of questions about my project, and I accepted most of the default answers.

This then generated the following files:

- `conf.py`
- `index.rst`
- `Makefile`

In addition, it created the following directories:

- `_build`
- `_static`
- `_templates`

The only one that will have content added for my purposes is `_build`, which will store the `html` that will be generated.

At this point, the tutorials had me opening the `conf.py` to uncomment certain lines and add other lines.  Still others also had me editing the `index.rst` file.  Red flags everywhere.  I'm not going to document those changes here, since [there is a better way](#a-better-way) to do this.

I then would create the `.rst` ([`reStructuredText`]) files from the project modules using the [`sphinx-apidoc`] command before finally calling `make html` to generate all the `html` from the `.rst` files.

> The `sphinx-apidoc` command uses the [`sphinx.ext.autodoc`] extension to generate documentation from `docstrings`.  Without this extension enabled, the goal of this article wouldn't be met.  In other words, it would no worky.

So, I was doing the following:

1. `sphinx-quickstart`
1. futzing around with both `conf.py` and `index.rst`
1. `sphinx-apidoc`
1. `make html`

It goes without saying that [BT no likey] this process.

With a bit of playing around, I managed to get this down to two steps:

1. `sphinx-apidoc`
1. `make html`

Let's look at that now.

### A better way

Here are the commands I ran that were satisfactory to me.  Explanations follow:

```
$ virtualenv venv
$ . venv/bin/activate
(venv) $
(venv) $ mkdir docs && cd docs
(venv) $
(venv) $ sphinx-apidoc -h           (1)
(venv) $
(venv) $ sphinx-apidoc \
> --full \                          (2)
> --append-syspath \                (3)
> --doc-author btoll \
> --doc-project Hangman \
> --doc-version 0.1.0 \
> --output-dir . \                  (4)
> ..                                (5)
(venv) $
(venv) $ make html                  (6)
```

Notes:

1. Having a look at the configuration options for `sphinx-apidoc` informed the ones I chose to create the `.rst` files.

1. This will generate a full project with `sphinx-quickstart`.  The other options will influence its configuration, so there's no need to open `conf.py` and futz around (i.e., step #2 in [a not-so great way](#a-not-so-great-way)).

1. This tells `Sphinx` to append the value of of `module_path` to `sys.path`.  This will be necessary to find the modules from which to generate the `.rst` files.

1. The directory to which to write the generated `.rst`s.  This indicates the `cwd`.

1. The positional `module_path` argument.  Since `--append-syspath` is defined, it will append this value to `sys.path`, which is what we want (it tells `Sphinx` to look one directory above `docs/` to find the modules to transpile to `.rst`.

1. Builds the `html` from the generated `.rst` files that we just created with `sphinx-apidoc`.  This is shorthand for `sphinx-build`, see the Makefile and run `make help`.

> Be sure to have a look at `conf.py` and `index.rst` to see all of the values written to them.

We can now take a gander at the docs by running the built-in Python web server:

```
(venv) $ python -m http.server -d _build/html  --bind 127.0.0.1 6157
```

And that's it!  Congratulations, you've now created documentation for your amazing and disruptive software project that other people will probably never use!

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

> There are a lot of [themes for `Sphinx`] if the default `alabaster` theme isn't up your street.

# Conclusion

This probably just scratches the surface of what `Sphinx` can do, although it satisfies my use case of generating docs from the `docstrings` in the code.  If I were looking to generate docs for a production site, I would tweak this some more, but I'm happy with the results so far.

The next step would be to containerize this.

I conclude that this is indeed a conclusion to this fabulous article.

[`reStructuredText`]: https://docutils.sourceforge.io/rst.html
[`Sphinx`]: https://www.sphinx-doc.org/en/master/
[`docstrings`]: https://www.python.org/dev/peps/pep-0257/
[Read the Docs]: https://readthedocs.org/
[created a version]: https://github.com/btoll/hangman
[Hangman]: https://en.wikipedia.org/wiki/Hangman_(game)
[on `virtualenv`]: /2021/04/01/on-virtualenv/
[my GitHub]: https://github.com/btoll
[`sphinx-quickstart`]: https://www.sphinx-doc.org/en/master/man/sphinx-quickstart.html
[BT no likey]: https://3.bp.blogspot.com/-GM3L8oaK9A4/UFX1Fzt7o5I/AAAAAAAAC_4/e_mgMzCMtBY/s320/cowboy-shaking-head.gif
[`sphinx-apidoc`]: https://www.sphinx-doc.org/en/master/man/sphinx-apidoc.html
[`sphinx.ext.autodoc`]: https://www.sphinx-doc.org/en/master/usage/extensions/autodoc.html#module-sphinx.ext.autodoc
[themes for `Sphinx`]: https://sphinx-themes.org/

