+++
title = "On Getting Started with Go"
date = "2022-08-05T19:13:06Z"

+++

- [Installing Go](#installing-go)
- [Go Environment Variables](#go-environment-variables)
- [Enabling Dependency Tracking](#enabling-dependency-tracking)
- [Managing Dependencies](#managing-dependencies)
    + [Adding Dependencies](#adding-dependencies)
    + [Removing Dependencies](#removing-dependencies)
    + [Listing Dependencies](#listing-dependencies)
- [Managing Binaries](#managing-binaries)
    + [Adding Binaries](#adding-binaries)
- [Managing Caches](#managing-caches)
    + [Removing Caches](#removing-caches)
- [Viewing Documentation](#viewing-documentation)
- [Vim Plugin](#vim-plugin)
- [Troubleshooting](#troubleshooting)
- [References](#references)

<!--- [Install Binaries to GOBIN](#install-binaries-to-GOBIN)-->

## Installing Go

First, [Install Go] from the official docs.

Next, change into the downloads directory and execute the following commands:

```
$ sudo tar xvf go1.19.linux-amd64.tar.gz -C /usr/local
$ go version
go version go1.19 linux/amd64
```

## Go Environment Variables

List all information about the Go environment:

```
$ go env
```

Here are the usual suspects I put in my `.bash_env`, which is sourced from my `.bashrc`:

```
export GOARCH=amd64
export GOOS=linux
export GOPATH="$HOME/go"
export GOBIN="$GOPATH/bin"
export GOROOT=/usr/local/go
```

If the `GOPATH` environment variable is unset, it defaults to a directory named `go` in the user's home directory.  Also, from what I've seen, is that `GOROOT`, which contains the compiler and source code, is automatically set by the tooling and only needed if the Go installation is not installed in the default `/usr/local/go` location.

> Technically, neither `GOPATH` nor `GOROOT` need to be included with the other Go environment variables in the snippet above.

## Enabling Dependency Tracking

Create a `go.mod` file which will track all of the module's dependencies.  This file is created by running the following command:

```
go mod init [module-path]
```

`module-path` is the name of the new module.  Typically, it is a path to a reachable public location, such as [`github.com/btoll/stymie-go`].  This is because the `go` tooling will need to be able to access it when it's used in another project.

For example:

```
$ go mod init github.com/btoll/foo
go: creating new go.mod: module github.com/btoll/foo
go: to add module requirements and sums:
        go mod tidy
```

`go.mod` defines the new module and will track all of the modules that contain the packages on which the new module depends.  The `go.mod` should be versioned along with the rest of the module code.

## Managing Dependencies

### Adding Dependencies

Let's say there is the following code (taken from [Go's getting started tutorial]):

`main.go`

<pre class="math">
package main

import (
    "fmt"

    "rsc.io/quote"
)

func main() {
    fmt.Println(quote.Go())
}
</pre>

There are several ways to add dependencies to a module:

- `go get [package-name][@version]`

      $ go get rsc.io/quote
      go: added golang.org/x/text v0.0.0-20170915032832-14c0d48ead0c
      go: added rsc.io/quote v1.5.2
      go: added rsc.io/sampler v1.3.0

    This will add the dependency as a line in `go.mod`:

      require rsc.io/quote v1.5.2

    > To add a specific version of a dependency:
    >
    >     $ go get rsc.io/quote@1.5.2
    >     $ go get rsc.io/quote@latest
    >
    > Or, to add a specific commit or branch name:
    >
    >     $ go get rsc.io/quote@4cf76c2
    >     $ go get rsc.io/quote@bugfixes
    >

- `go get tidy`

    + This will download module dependencies to `GOPATH/pkg/mod` and record their versions in your `go.mod` file.
    + Also, it removes requirements on modules that aren't used anymore.

          $ go mod tidy
          go: finding module for package rsc.io/quote
          go: downloading rsc.io/quote v1.5.2
          go: found rsc.io/quote in rsc.io/quote v1.5.2
          go: downloading rsc.io/sampler v1.3.0
          go: downloading golang.org/x/text v0.0.0-20170915032832-14c0d48ead0c

- `go get .`

      $ go get .
      go: downloading rsc.io/quote v1.5.2
      go: downloading rsc.io/sampler v1.3.0
      go: downloading golang.org/x/text v0.0.0-20170915032832-14c0d48ead0c
      go: added golang.org/x/text v0.0.0-20170915032832-14c0d48ead0c
      go: added rsc.io/quote v1.5.2
      go: added rsc.io/sampler v1.3.0

Each command will:

1. Add [`go.mod`] and a [`go.sum`] if not present or update them if they are.
    + `go.mod` ([from the docs]):
        - Describes the module, including its module path (in effect, its name) and its dependencies ... Though you can edit the `go.mod` file, you'll find it more reliable to make changes through go commands.
    + `go.sum` ([from the docs]):
        - Contains cryptographic hashes that represent the module's dependencies.  Go tools use these hashes to authenticate downloaded modules, attempting to confirm that the downloaded module is authentic.  Where this confirmation fails, Go will display a security error.
1. Add a `require` directive(s) to `go.mod` for all direct dependencies and their indirect dependencies.
1. If needed, downloads module source code (can download from a module proxy).
1. Authenticates the downloaded deps.

```
$ go run main.go
main.go:5:8: no required module provides package rsc.io/quote; to add it:
        go get rsc.io/quote
$ cat go.mod
module github.com/btoll/foo

go 1.19

require rsc.io/quote v1.5.2

require (
        golang.org/x/text v0.0.0-20170915032832-14c0d48ead0c // indirect
        rsc.io/sampler v1.3.0 // indirect
)
```

### Removing Dependencies

```
$ go get rsc.io/quote@none
```

### Listing Dependencies

List all packages of the module:

```
$ go list all
```

List all modules instead of packages, along with the latest version available for each:

```
$ go list -m -u all
```

## Managing Binaries

### Adding Binaries

Build and install binary in `GOBIN`:

```
$ go install example/user/hello
$ go install . (Defaults to package within cwd.)
$ go install   (Defaults to package within cwd.)
```

If `GOBIN` is set, binaries are installed to that directory.
If `GOPATH` is set, binaries are installed to the bin subdirectory of the first directory in the `GOPATH` list.
Otherwise, binaries are installed to the bin subdirectory of the default `GOPATH` (`$HOME/go` or `%USERPROFILE%\go`).

This won't produce an output file.
Instead, it saves the compiled package in the local build cache (GOCACHE).

```
$ go build
```

## Managing Caches

### Removing Caches

Remove the build cache:

```
$ go clean -cache
```

Remove the downloaded module cache:

```
$ go clean -modcache
```

You can find the cache locations in the Go environment information:

```
$ go env | ag cache
GOCACHE="/home/btoll/.cache/go-build"
GOMODCACHE="/home/btoll/go/pkg/mod"
```

## Viewing Documentation

```
$ godoc --help
```

It's possible to load docs locally via a builtin web server, which will also include your own types.

```
$ godoc -http :3030
```

## Vim Plugin

You're going to want to use [`vim-go`].  Here is how to install using [`vim-plug`]:

1. Add the following to `.vimrc`:

    - Plug 'fatih/vim-go', { 'do': ':GoUpdateBinaries' }
        + This will update the binaries every time Vim is opened.

1. In `.vimrc` (or any file loaded into Vim), run the following editor commands in order:

    - `:PlugUpdate`
        + Install or update plugins.
    - `:GoInstallBinaries`
        + This will `go install` all of the `vim-go` required dependencies.
        + From the docs (`:help :GoInstallBinaries`): "Download and install all necessary Go tool binaries such as godef, goimports, gopls, etc. under 'g:go_bin_path'. If [binaries] is supplied, then only the specified binaries will be installed. The default is to install everything."
        + Will install the binaries in the first defined location from the following short list:
            - `g:go_bin_path`
            - `go env GOBIN` or `$GOPATH/bin`

## Troubleshooting

When developing a package, it's quite often that you'll use `go run` to test the binary.  If you get `undefined` errors, make sure that you'll referencing all of the `.go` files that the binary will need.  Recall that you need to specify every file for `go run`.

## References

- [Download and install](https://go.dev/doc/install)
- [Tutorial: Get started with Go](https://go.dev/doc/tutorial/getting-started)
- [Managing dependencies](https://go.dev/doc/modules/managing-dependencies)
- [Managing module source](https://go.dev/doc/modules/managing-source)
- [How to Write Go Code](https://go.dev/doc/code)
- [go.mod file reference](https://go.dev/doc/modules/gomod-ref)

[Install Go]: https://go.dev/doc/install
[`github.com/btoll/stymie-go`]: https://github.com/btoll/stymie-go
[Go's getting started tutorial]: https://go.dev/doc/tutorial/getting-started#call
[`go.mod`]: https://go.dev/doc/modules/gomod-ref
[`go.sum`]: https://go.dev/doc/modules/managing-source#repository
[from the docs]: https://go.dev/doc/modules/managing-source#repository
[`vim-go`]: https://github.com/fatih/vim-go
[`vim-plug`]: https://github.com/junegunn/vim-plug

