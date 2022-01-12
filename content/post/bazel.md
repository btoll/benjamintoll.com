+++
title = "On Bazel"
date = "2021-09-14T21:54:25-04:00"
draft = true

+++

Google open-sourced their internal build tool [`Bazel`] in 2015, and we here at your grandmother's favorite website has been reading its docs and using it for create a [distroless image container].

Let's [begin the Beguine].

---

- [Concepts](#concepts)
    + [Pure Functions](#pure-functions)
    + [Hermeticity](#hermeticity)
- [Architecture](#architecture)
- [Installation](#installation)
    + [Command-line Completion](#command-line-completion)
    + [Vim Integration](#vim-integration)
- [References](#references)

---

## Concepts

Before getting into the installation of `Bazel`, let's explore some of its [design concepts].

### Pure Functions

One of the things that drew me to `Bazel` is the idea of pulling down functions and giving them specific inputs.  This will be deterministic, in that no matter how many times the function is invoked, it will produce the same outputs.  These outputs, in turn, can serve as inputs to more functions, and thus build chains of functions can be built.

This is an incredibly powerful concept.  Just as any mathematician or functional programmer.  In fact, pure functions are showing up more and more frequently in domains other than programming languages as people realize that their use improves build tooling, for instance.  It's much easier to reason about a problem space when all of the inputs can be realized and named.

The opposite of this approach, where the environment outside of the function has bearing on the function's internal state and/or the function has bearing on the environment outside of its limited scope (side effects), reminds me of one of my favorite quotes from [Joe Armstrong], one of the creators of the Erlang programming language:

> The problem with object-oriented languages is that they've got all this implicit environment that they carry around with them.  You wanted a banana but what you've got is a gorilla holding the banana and the entire jungle.

It's not exactly on-topic but it addresses the problem of state.

These functions can be imported from other projects located in the same filesystem or from the public Internet, such as from GitHub or another publicly-accessible location.

### Hermeticity
### Incremental
### Transitive Dependencies

## Architecture

Another reason that I like `Bazel` is that it mimics and improves upon [`make`]. Like its antecedent, `Bazel` targets produce files.  `BUILD` files are analagous to `Makefile`s.

Let's take a look at the major players.

- Workspace
    + This represents the main repository.  It contains the `WORKSPACE` text file and can contain subdirectories that are themselves packages.
    + It can be thought of as a `git` repository.
    + Any subdirectory containing a `WORKSPACE` are ignored.
    + The `WORKSPACE` text file:
        - Can be empty, can have references to external dependencies needed to build the outputs.
        - Supports a `WORKSPACE.bazel` file which takes precedence if both are present.

- Repositories
    + The directory containing `WORKSPACE` is the root of the main repository and known as `@`.
    + Other external repositories are defined in the `WORKSPACE` file using workspace rules.

- Packages
    + A package can contain a subpackage, which itself has a `BUILD` text file.
    + Any subdirectory not containing a `BUILD` file belongs to the ancestor package.
    + The `BUILD` text file:
        - Supports a `BUILD.bazel` file which takes precedence if both are present.
        - Represents a package, the primary unit of code organization.
        - Are small programs, evaluated using the [`Starlark`] imperative language.

- Targets
    + The elements of a package are targets.
    + Kinds of targets:
        - *files*, divided into two types:
            + Versioned source files.
            + Non-versioned generated files of the build from the source file(s).
        - *rules*
            + Specifies the relationship between a set of input and a set of output files.
            + Includes the steps necessary to derive the outputs from the inputs, which are always generated files.
            + Inputs can be of either type of file, and the outputs can be the inputs to another rule.
            + Inputs to a rule can also be another rule.
            + It is not possible to generate a file into another package, as they always will belong to the same package that generated them.
            + However, a rule's inputs *can* come from another package.
        - package groups
            + Are less numerous than the previous two.

- Labels
    + A label is the name of a target.
    + All targets can belong to only one package.
    + The root of a repository can be referred to by either `@//` or `//`.

## Installation

You can install [`bazelisk`], which is a wrapper around the `bazel` tool written in Go, or the tool itself.  If you install the former, it will automatically pick the "right" version of `bazel` and download it automatically for you.  This may or may not be what you want, but it suits me just fine.

I got the `Bazel` binary installer from [the releases page].

```
$ wget https://github.com/bazelbuild/bazel/releases/download/4.2.1/bazel-4.2.1-installer-linux-x86_64.sh
$ chmod +x bazel-4.2.1-installer-linux-x86_64.sh

# The following command puts the binary in $HOME/bin and adds a hidden directory in $HOME/.bazel.
$ ./bazel-4.2.1-installer-linux-x86_64.sh --user
$ export PATH=$HOME/bin:$PATH

$ command -v bazel
/home/vagrant/bin/bazel
$ bazel version
Bazelisk version: v1.10.1
Build label: 4.2.1
Build target: bazel-out/k8-opt/bin/src/main/java/com/google/devtools/build/lib/bazel/BazelServer_deploy.jar
Build time: Mon Aug 30 15:17:47 2021 (1630336667)
Build timestamp: 1630336667
Build timestamp as int: 16303366
```

It's important to note that you should verify that no bits were fiddled with by an intrusive and malicious third-party upon downloading the installer sciprt.  To this end, `Bazel` has included a SHA256 checksum and a signature to verify its integrity and provenance.

Here, I'll download just the SHA and verify that it's safe to use:

```
$ wget https://github.com/bazelbuild/bazel/releases/download/4.2.1/bazel-4.2.1-installer-linux-x86_64.sh.sha256
$
$ cat bazel-4.2.1-installer-linux-x86_64.sh.sha256
35f398ad93af2b5eadd4b6b4fd4d4803b726029e572f40c4e1fe736db3de944b  bazel-4.2.1-installer-linux-x86_64.sh
$
$ [ $(sha256sum bazel-4.2.1-installer-linux-x86_64.sh | cut -d\  -f1) = $(< bazel-4.2.1-installer-linux-x86_64.sh.sha256 cut -d\  -f1) ]
$ echo $?
0
```

Looks good!

### Command-line Completion

Wanting [Bash completion] for `Bazel`?  You shall have it!  Change to the new `$HOME/.bazel` directory installed by the `--user` flag (see above), and list its contents:

```
$ tree
.
├── bin
│   ├── _bazel
│   ├── bazel
│   ├── bazel-complete.bash
│   ├── bazel-real
│   └── bazel.fish
└── etc
```

The `bash` script is what we want to source.

```
$ . bin/bazel-complete.bash
$ bazel [TAB] [TAB]
--autodetect_server_javabase                   --nowindows_enable_symlinks
--batch                                        --noworkspace_rc
--batch_cpu_scheduling                         --output_base=
--bazelrc=                                     --output_user_root=
--block_for_lock                               --server_javabase=
--client_debug                                 --server_jvm_out=
--connect_timeout_secs=                        --shutdown_on_low_sys_mem
--expand_configs_in_place                      --system_rc
--failure_detail_out=                          --unlimit_coredumps
--home_rc                                      --watchfs
--host_jvm_args=                               --windows_enable_symlinks
--host_jvm_debug                               --workspace_rc
--host_jvm_profile=                            analyze-profile
--idle_server_tasks                            aquery
--ignore_all_rc_files                          build
...
```

And, as a billion websites have told you, you can put that in your `.bashrc` to have that sourced on login or new session.

It could look like this!

`.bashrc`
<pre class="math">
COMPLETION_SCRIPTS=(
   .bazel/bin/bazel-complete.bash
   .fzf.bash
   .local/bin/virtualenvwrapper.sh
   cdargs-bash.sh
   git-completion.bash
)

for script in "${COMPLETION_SCRIPTS[@]}"
do
   [ -f "$HOME/$script" ] && source "$HOME/$script"
done
</pre>

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeee

### Vim Integration

Lastly, I have a real treat for you: Vim integration with the [`vim-bazel` plugin]!  Since I use [`vim-plug`], I simply added these lines to my `.vimrc`:

<pre class="math">
" Add maktaba and bazel to the runtimepath.
" (The latter must be installed before it can be used.)
Plug 'google/vim-maktaba'
Plug 'bazelbuild/vim-bazel'
</pre>

So, now you're all set up, and it's time to turn to some the architectural decisions that the `Bazel` designers made.

## References

- [`Bazel` documentation](https://docs.bazel.build/versions/main/bazel-overview.html)
- [Building Python with Bazel](https://www.youtube.com/watch?v=zaymCO1A1dM)

[`Bazel`]: https://bazel.build/
[distroless image container]: https://github.com/GoogleContainerTools/distroless
[begin the Beguine]: https://www.youtube.com/watch?v=cCYGyg1H56s
[design concepts]: https://docs.bazel.build/versions/main/build-ref.html#understanding
[Joe Armstrong]: https://en.wikipedia.org/wiki/Joe_Armstrong_(programmer)
[`bazelisk`]: https://github.com/bazelbuild/bazelisk
[Bash completion]: https://docs.bazel.build/versions/4.2.1/completion.html
[`vim-bazel` plugin]: https://github.com/bazelbuild/vim-bazel
[`vim-plug`]: https://github.com/junegunn/vim-plug
[`make`]: https://www.gnu.org/software/make/manual/make.html
[the releases page]: https://github.com/bazelbuild/bazel/releases
[`Starlark`]: https://github.com/bazelbuild/starlark/

