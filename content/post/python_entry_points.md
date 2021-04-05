+++
title = "On Python entry_points"
date = "2021-04-04T19:48:03-04:00"

+++

In my last role, I was maintaining an internal task runner written in Python.  I needed to implement a feature that would support extensions and, before writing any code, set about to investigate the state of Python tooling.

In addition, we had a Linux/MacOS cli tool in the `bin/` directory, and we wanted to include Windows support.  Not being my area of expertise, I didn't fancy writing a Windows executable if I didn't have to.  And, as it turns out, I didn't have to!

Needless to say, I was pleasantly surprised to discover how robust the native tooling is in this area.  In fact, to implement both of the use cases, there would be very little I would need to do in my existing code (at least to get a prototype up and running).

For example, the [`entry_points` specification] allows for anything to be declared as a group in the [`setuptools`] configuration to which programs can register entry points, and `pip` and any other tool that has implemented the spec will create a wrapper for each entry and place it in the Python path.  Neat!

So, what does that mean?  In other words, I've defined the entry points in [`setup.cfg`] and done a little dance...what now?

Let's find out together, like a couple of old pals!

---

First of all, I'm limiting the discussion for this post to only two aspects of entry points:

- [`console_scripts`](#console_scripts)
- [extensions support](#extensions-support)

Getting each to work is a piece of cake, but it is necessary to understand how the tooling allows for this magic to happen.

Before we begin, I'm going to install the [`entry-point-inspector`] in my [Python virtual environment].  This will allow us to easily see all of the `entry_point` plugins that are available for tools and programs to use.

```
$ virtualenv venv
$ . hangman/bin/activate
(hangman) $ pip install entry-point-inspector
```

Here are the groups for which plugins are available:

```
(hangman) $ epi group list
+------------------------------------------+
| Name                                     |
+------------------------------------------+
| cliff.demo                               |
| cliff.demo.hooked                        |
| cliff.formatter.completion               |
| cliff.formatter.list                     |
| cliff.formatter.show                     |
| console_scripts                          |
| distutils.commands                       |
| distutils.setup_keywords                 |
| egg_info.writers                         |
| epi.commands                             |
| setuptools.finalize_distribution_options |
| setuptools.installation                  |
| stevedore.example.formatter              |
| stevedore.test.extension                 |
+------------------------------------------+
```

Here are the members of the `console_scripts` group:

```
(hangman) $ epi group show console_scripts
+------------------+---------------------------------+--------+-----------------------------+-------+
| Name             | Module                          | Member | Distribution                | Error |
+------------------+---------------------------------+--------+-----------------------------+-------+
| wheel            | wheel.cli                       | main   | wheel 0.36.2                |       |
| easy_install     | setuptools.command.easy_install | main   | setuptools 51.3.3           |       |
| easy_install-3.9 | setuptools.command.easy_install | main   | setuptools 51.3.3           |       |
| pip              | pip._internal.cli.main          | main   | pip 20.3.3                  |       |
| pip3             | pip._internal.cli.main          | main   | pip 20.3.3                  |       |
| pip3.8           | pip._internal.cli.main          | main   | pip 20.3.3                  |       |
| pbr              | pbr.cmd.main                    | main   | pbr 5.5.1                   |       |
| epi              | entry_point_inspector.app       | main   | entry-point-inspector 0.1.2 |       |
| hangman          | hangman                         | main   | hangman 0.1                 |       |
+------------------+---------------------------------+--------+-----------------------------+-------+
```

Note the `console_script` for the `hangman` game at `hangman:main` (module:function).

# console_scripts

Why would you want to define a `console_scripts` entry point?  The better question is: why would you not want to do that?

Here are some drawbacks of using the traditional method of creating an executable script in a `bin/` directory in your project root:

1. Python may not use the correct interpreter when executing the script.  For example, if there's a shebang as the first line of your shell script (and there should be), Python will use the interpreter it finds as the default (i.e., `which python`).  This may not be what you want.

        $ which python{,3}
        /usr/bin/python
        /usr/bin/python3

1. `setuptools` will generate scripts for each platform and place them in the system path.  If you're in a Python virtual environment, its `bin/` directory will be listed first and is where the executable will be if just installed in the `virtualenv`:

        (hangman) $ echo $PATH

    This is significant because it's not necessary to be an expert in writing Windows executable files; just let Python do the heavy lifting.

Let's take a look an example.  Here is the `console_scripts` in the entry point section for my [`hangman`] game:

`setup.cfg`

<pre class="math">
[metadata]
name = hangman
author = Benjamin Toll
author_email = benjam72@yahoo.com
version = 0.1
description = The classic game of Hangman
url = http://github.com/btoll/hangman
license = GPLv3+

[options]
packages = hangman
entry_points =
    [console_scripts]
    hangman = hangman:main
</pre>

In English, this is saying, "I am the hangman package, and I am exposing an executable in your system path that will call the `main()` function in the `hangman.py` module if you enter `hangman` anywhere on your system at the command line."

In [Bengali], it's saying, "আমি হ্যাঙ্গম্যান প্যাকেজ এবং আমি আপনার সিস্টেমের পথে একটি এক্সিকিউটেবল প্রকাশ করছি যা কমান্ড লাইনে আপনার সিস্টেমে যে কোনও জায়গায় `হ্যাঙ্গম্যান` প্রবেশ করালে` হ্যাঙ্গম্যান.পিই মডিউলটিতে `প্রধান ()` ফাংশনটি কল করবে।."

In [Latin]: "Carnificem sarcina sum ego in summo exsecutabile ratio ducit: Vocemus principale () `` hangman.py` amet officium: Si introibunt in hangman` huc iussu ratio recta."

Incidentally, here is what the generated executable looks like on my Linux machine:

<pre class="math">
(hangman) $ cat $(which hangman)
#!/home/btoll/projects/venv/hangman/bin/python
# EASY-INSTALL-ENTRY-SCRIPT: 'hangman','console_scripts','hangman'
import re
import sys

# for compatibility with easy_install; see #2198
__requires__ = 'hangman'

try:
    from importlib.metadata import distribution
except ImportError:
    try:
        from importlib_metadata import distribution
    except ImportError:
        from pkg_resources import load_entry_point                              (1)


def importlib_load_entry_point(spec, group, name):
    dist_name, _, _ = spec.partition('==')
    matches = (
        entry_point
        for entry_point in distribution(dist_name).entry_points
        if entry_point.group == group and entry_point.name == name
    )
    return next(matches).load()


globals().setdefault('load_entry_point', importlib_load_entry_point)


if __name__ == '__main__':
    sys.argv[0] = re.sub(r'(-script\.pyw?|\.exe)?$', '', sys.argv[0])
    sys.exit(load_entry_point('hangman', 'console_scripts', 'hangman')())       (2)
</pre>

Notes:

1. Uses the [`pkg_resources`] module to discover all the entry points by scanning the Python path.
1. The entry points for the `hangman` package are scanned and the `hangman` key from the `console_scripts` group is found and then called (again, calling `hangman.main()`.  The return value of this function is used as the exit code of the `sys.exit` call.

And, as an added bonus, you get to delete the `bin/` directory from your project.  Cool, I love deleting code!

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee!

> It's important not to pass any arguments to the function that is called in the entry points.  If the function expects any cli arguments, do that processing within the function itself.

# extensions support

So, back to the extensions support.  The idea is to expose a "foo.extension" entrypoint for every third-party extension to the task runner, and the "foo" Python program would scan the Python path for the group named "foo.extension".

Instead of writing a custom module for your super-duper app that locates and loads third-party extensions and scripts at runtime, leverage the native tooling that Python offers to do this (primarily via the [`pkg_resources`] module), with minimum fuss and overhead on your end.  As long as the group name is exposed in the third-party packages, the tooling will find them and automatically load them at runtime.

Here is an example of the `entry_points` section of a `setup.cfg` file for a third-party extension:

<pre class="math">
entry_points =
    [console_scripts]
    saddle = saddle:main
    [foo.extension]
    saddle = saddle
</pre>

In this case, `saddle` is a module, not an object (such as a `class` or `function`).

And here is a naive implementation that would retrieve the particular extension (module).  It would be defined in the "foo" package:

```
def get_extension(name):
    return [
        entry_point.load()
        for entry_point in pkg_resources.iter_entry_points(group="foo.extension")
        if name == entry_point.name
    ]
```

And the caller would look like this:

```
extension = get_extension("saddle")

# Do super-cool stuff.
```

It's really that easy!

> Again, this was just a prototype, this is not production-worthy code!

# Conclusion

I hope that this gives you a taste of the power of Python entry points.  The examples given are enough to get you bootstrapped and are simple enough to easily grok.

As always, read the docs to fully understand the packages and modules discussed here!  First sources are always better than second or third!

[`entry_points` specification]: https://packaging.python.org/specifications/entry-points/
[`setup.cfg`]: https://setuptools.readthedocs.io/en/latest/userguide/declarative_config.html
[`entry-point-inspector`]: https://pypi.org/project/entry-point-inspector/
[`setuptools`]: https://setuptools.readthedocs.io/en/latest/index.html
[Python virtual environment]: /2021/04/01/on-virtualenv/
[`hangman`]: https://github.com/btoll/hangman
[Bengali]: https://en.wikipedia.org/wiki/Bengali_language
[Latin]: https://en.wikipedia.org/wiki/Latin
[`pkg_resources`]: https://setuptools.readthedocs.io/en/latest/pkg_resources.html

