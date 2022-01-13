+++
title = "On Scaffolding a Python Project"
date = "2022-01-13T01:52:09-04:00"
draft = true

+++

When first coming to Python, I was very confused the recommended directory structure for my package and had many questions.

For example:

- Which files should be included, and at which level?
- Where should I put my tests?
- Should I use `setup.py` or `setup.cfg`?
- Should my source files go in a direct child directory of the package directory, such as `foo-project/foo-project/SOURCE_FILES`, or should there be a `src` directory separating the two, as some advocate?
- Should I use Markdown or [reStructuredText]?

It was enough to make me wanna holla.

> Curiously, I did not holler but instead calmly turned to the Internets.

---

As you may expect, there is a lovely package called [PyScaffold] that will create a skeleton package for a new project and answer all of these questions for you.

<pre class="math">
$ python -m pip install pyscaffold==4.0.1

# Make new `projects` directory and change into it.
$ <a href="#mcd">mcd</a> projects

# Create scaffolding
$ putup foo-project -l GPL-3.0-only -d "There once was a foo"
done! 🐍 🌟 ✨

# Inspect.
$ tree
.
└── foo-project
    ├── AUTHORS.rst
    ├── CHANGELOG.rst
    ├── docs
    │   ├── authors.rst
    │   ├── changelog.rst
    │   ├── conf.py
    │   ├── index.rst
    │   ├── license.rst
    │   ├── Makefile
    │   ├── readme.rst
    │   ├── requirements.txt
    │   └── _static
    ├── LICENSE.txt
    ├── pyproject.toml
    ├── README.rst
    ├── setup.cfg
    ├── setup.py
    ├── src
    │   └── foo_project
    │       ├── __init__.py
    │       └── skeleton.py
    ├── tests
    │   ├── conftest.py
    │   └── test_skeleton.py
    └── tox.ini

6 directories, 20 files
</pre>

> ### mcd
>
>   mcd = Make cd
>   - Defined in my [`.bash_functions`].
>   - Remember, inspect any defined function by using the [Bash builtin `declare`] to print the function to the console:
>
>           $ declare -f mcd
>           mcd ()
>           {
>               mkdir -p "$1" && cd "$1"
>           }

# References

- [PyScaffold Usage & Examples](https://pyscaffold.org/en/stable/usage.html)

[reStructuredText]: https://en.wikipedia.org/wiki/ReStructuredText
[PyScaffold]: https://pypi.org/project/PyScaffold/
[`.bash_functions`]: https://github.com/btoll/dotfiles/blob/master/bash/.bash_functions
[Bash builtin `declare`]: https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html

