+++
title = "On virtualenv"
date = "2021-04-01T13:41:21-04:00"

+++

Whenever I do any programming with Python, I always use [`virtualenv`] to isolate my Python environment(s) from the rest of my system.  It's not only good practice, it's good system hygiene and will save you from using [`pip`] as a footgun.

Using `virtualenv` will create separate environments for each of the Python projects on a system, with package downloads only going into the location of the current project's virtual environment and not affecting anything else on the system.  There is no cross-project package contamination.

This separation is especially appreciated by those of us who have had experiences of installing packages globally and then having to deal with library conflicts and packages not being able to be downloaded and installed, whether those conflicts occur because of different versions of Python itself or of the individual packages.

> Note that these virtual environments are not the same as virtual machines and there is no virtualization.

Here is a short list of reasons for using `virtualenv`:

- Testing a package with different versions of Python, i.e., 2.7 and 3.x.
- Testing different versions of a package with different package dependencies.
- Easily able to capture package dependencies in a `requirements.txt` file.
- Installing a package just to have a look around before deleting it.
- Easy cleanup.

One can imagine trying to do several of these scenarios system-wide and the difficulty inherent in doing so.  One quickly understands the advantage of creating virtual environments for each project where all the package dependencies are effectively "siloed" from one another.

As we'll see, `virtualenv` provides the ability to create these virtual environments.

Let's look at it now.

---

# `virtualenv`

`virtualenv` is the tool to install to enable all of the environment isolation that I mentioned previously.  Install it as usual:

```
$ python -m pip install virtualenv
```

There are a number of useful flags that can be used to control how the virtual environment behaves.  I'll just show a short list of ones that I tend to use:

- [`-p`] - Specify the Python version, although it must be present on the system.  Will default to the first-found on the system if not present (i.e., the result of `which python`).
    - Any bootstrapped packages will be compatible with the specified version (see below).
- [`--prompt`] - Specify a prompt prefix other than the default `(DEST)`.
- [`--system-site-packages`] - Allow the virtual environment access to the system's site-package directory.
    - Note that this will affect the output of `pip freeze` if creating a `requirements.txt` file after activating the virtual environment, which will include all of the local **and** system packages particular to the Python version.
    - To filter out the system packages and only include the dependencies downloaded into the virtual environment, add the `--local` flag:
        + `pip freeze --local > requirements.txt`
- [`-v`] - Increase verbosity.

To create a virtual environment, simply call it with the destination name of the environment:

```
$ virtualenv venv
```

> `venv` tends to be used as a convention, but it can be named anything.

Let's now take a look at the directory structure that was created:

<pre class="math">
$ tree -dL 4 venv/
venv/
├── bin
└── lib
  └── python3.8
      └── site-packages
          ├── _distutils_hack
          ├── pip
          ├── pip-20.3.3.dist-info
          ├── pkg_resources
          ├── setuptools
          ├── setuptools-51.3.3.dist-info
          ├── wheel
          └── wheel-0.36.2.dist-info
</pre>

Again, note that this isn't a fully-independent virtual environment, for apart from some automatic bootstrapping (which can be configured) of packages such as `pip`, `setuptools` and `wheel` into the Python virtual environment, the Python interpreter will rely on the system Python distribution for standard library and binary libraries.

And the `bin` directory itself:

<pre class="math">
$ tree venv/bin
venv/bin/
├── activate
├── activate.csh
├── activate.fish
├── activate.ps1
├── activate_this.py
├── activate.xsh
├── easy_install
├── easy_install3
├── easy_install-3.8
├── easy_install3.8
├── pip
├── pip3
├── pip-3.8
├── pip3.8
├── python -> /usr/bin/python
├── python3 -> python
├── python3.8 -> python
├── wheel
├── wheel3
├── wheel-3.8
└── wheel3.8
</pre>

Notes:

1. All of the `activate*` scripts are the [activators] to choose from.  The one without an extension is for `Bash`.
1. The binaries are the aforementioned bootstrapped packages that work with the version of Python chosen for the `virtualenv`.
1. Since the system Python version is also being used for the `virtualenv` (the absence of the `-p` option), `python` is symlinked to the system-wide version.

> What version of Python is my system using?
>
>
>   ```
>   $ which python
>   /usr/bin/python
>   $
>   $ $(which python) -V
>   Python 3.8.0

To activate the new environment, [source] an activator of your choosing.  Again, I use the Bash `activate` script, but use the one that matches your shell:

```
$ source venv/bin/activate
(venv) $
```

This does several things to the current shell environment:

- Changes the interactive prompt [`PS1`] to the name given to the `DEST` directory (or to the value of `--prompt`, if given).
- Prepends the location of the `virtualenv`'s `bin` directory to the front of `$PATH` so that location will be prioritzed:
- Loads the `deactivate` Bash function into the current session, which is used to effectively reverse the steps that `activate` takes.

        (venv) $ declare -f deactivate
        deactivate ()
        {
            unset -f pydoc > /dev/null 2>&1 || true;
            if ! [ -z "${_OLD_VIRTUAL_PATH:+_}" ]; then
                PATH="$_OLD_VIRTUAL_PATH";
                export PATH;
                unset _OLD_VIRTUAL_PATH;
            fi;
            if ! [ -z "${_OLD_VIRTUAL_PYTHONHOME+_}" ]; then
                PYTHONHOME="$_OLD_VIRTUAL_PYTHONHOME";
                export PYTHONHOME;
                unset _OLD_VIRTUAL_PYTHONHOME;
            fi;
            if [ -n "${BASH-}" ] || [ -n "${ZSH_VERSION-}" ]; then
                hash -r 2> /dev/null;
            fi;
            if ! [ -z "${_OLD_VIRTUAL_PS1+_}" ]; then
                PS1="$_OLD_VIRTUAL_PS1";
                export PS1;
                unset _OLD_VIRTUAL_PS1;
            fi;
            unset VIRTUAL_ENV;
            if [ ! "${1-}" = "nondestructive" ]; then
                unset -f deactivate;
            fi
        }

    > Depending on your system architecture, this function will look different.

You can verify that the `virtualev` is prioritizing the `python` and `pip` binaries in its `bin` directory:

```
(venv) $ which python pip
/home/btoll/projects/benjamintoll.com/venv/bin/python
/home/btoll/projects/benjamintoll.com/venv/bin/pip
```

And let's check the `$PATH`:

```
(venv) $ echo $PATH | tr : \\n | head -4
/home/btoll/projects/benjamintoll.com/venv/bin
/opt/go/bin
/home/btoll/go/bin
/home/btoll/bin
```

Looks good.  Now, let's download some packages and create a `requirements.txt` file for future project bootstrapping.  In addition, we'll list the downloaded modules before and after the package installs:

```
(venv) $ pip list
Package    Version
---------- -------
pip        20.3.3
setuptools 51.3.3
wheel      0.36.2
(venv) $
(venv) $ pip install numpy scipi
Collecting numpy
  Downloading numpy-1.20.2-cp38-cp38-manylinux2010_x86_64.whl (15.4 MB)
     |████████████████████████████████| 15.4 MB 12.4 MB/s
Collecting scipy
  Downloading scipy-1.6.2-cp38-cp38-manylinux1_x86_64.whl (27.2 MB)
     |████████████████████████████████| 27.2 MB 12.2 MB/s
Installing collected packages: numpy, scipy
Successfully installed numpy-1.20.2 scipy-1.6.2
(venv) $
(venv) $ pip list
Package    Version
---------- -------
numpy      1.20.2
pip        20.3.3
scipy      1.6.2
setuptools 51.3.3
wheel      0.36.2
```

As expected, `pip` only lists the packages that have been downloaded since the `virtualenv` has been created (remember that `pip`, `setuptools` and `wheel` were downloaded automatically on `virtualenv` creation).  None of the system-wide packages have been listed, which means that our isolated virtual environment doesn't "know" about them.  This is great and exactly what we want.

Our last action is to create the `requirements.txt` file.  Let's first see what packages and their versions will be included:

```
(venv) $ pip freeze
numpy==1.20.2
scipy==1.6.2
```

A couple things to note here:

1. Again, no system-wide packages.
1. The bootstrapped packages aren't included.

Super!

And create the file:

```
(venv) $ pip freeze > requirements.txt
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee!

Finally, let's deactivate the virtual environment session and remove the virtual environment.  There is no special function or command flag or option to delete the virtual environment.  Simply delete it and its contents like usual.

```
(venv) $ deactivate
$
$ rm -rf venv
```

And we're back to our system-wide binaries and old `$PATH` value:

```
$ which python pip
/usr/bin/python
/home/btoll/.local/bin/pip
$
$ echo $PATH | tr : \\n | head -4
/opt/go/bin
/home/btoll/go/bin
/home/btoll/bin
/home/btoll/.local/bin
```

> `virtualenv` has a lot of handy features, such as support for a [configuration file] to override defaults, creating the virtual environment [from an install image], and others that can be very useful depending on the use case.  Check out the docs for more information.

# Conclusion

My original intent was to describe `virtualenv` and then follow up with how to use [`virtualenvwrapper`] as a management tool for `virtualenv`, but then this post got really long, and I ran out of steam.  I may do a separate post for `virtualenvwrapper` at some point in the future, but I honestly don't use it as much as I used to because I'm rarely juggling more than one Python virtual environment at a time.

So, in conclusion, I conclude that [I really have no idea what I'll do next] or really what I'll do at any given moment.

# References

- [There’s no magic: virtualenv edition](https://www.recurse.com/blog/14-there-is-no-magic-virtualenv-edition)
- [Pipenv](https://github.com/pypa/pipenv)

[`virtualenv`]: https://virtualenv.pypa.io/en/latest/
[`pip`]: https://pypi.org/project/pip/
[`-p`]: https://virtualenv.pypa.io/en/latest/cli_interface.html#p
[`--prompt`]: https://virtualenv.pypa.io/en/latest/cli_interface.html#prompt
[`--system-site-packages`]: https://virtualenv.pypa.io/en/latest/cli_interface.html#system-site-packages
[`-v`]: https://virtualenv.pypa.io/en/latest/cli_interface.html#v
[configuration file]: https://virtualenv.pypa.io/en/latest/cli_interface.html#configuration-file
[from an install image]: https://virtualenv.pypa.io/en/latest/user_guide.html#seeders
[source]: https://linuxize.com/post/bash-source-command/
[activators]: https://virtualenv.pypa.io/en/latest/user_guide.html#activators
[`PS1`]: /2021/03/29/on-bash-prompts/
[`virtualenvwrapper`]: https://virtualenvwrapper.readthedocs.io/en/latest/
[I really have no idea what I'll do next]: https://www.youtube.com/watch?v=d11DS15AA7M

