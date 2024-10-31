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
    + [Creating Binaries](#creating-binaries)
- [Managing Caches](#managing-caches)
    + [Removing Caches](#removing-caches)
- [Importing A Local Module](#importing-a-local-module)
- [Publishing](#publishing)
- [Viewing Documentation](#viewing-documentation)
- [Installing Delve](#installing-delve)
- [Vim Plugin](#vim-plugin)
- [Troubleshooting](#troubleshooting)
- [Programming](#programming)
    + [`init` function](#init-function)
    + [Embedding Static Files](#embedding-static-files)
    + [Passing Command-Line Arguments](#passing-command-line-arguments)
    + [Getting User Input](#getting-user-input)
    + [Multi-Dimensional Arrays](#multi-dimensional-arrays)
- [Runtime](#runtime)
- [References](#references)

<!--- [Install Binaries to GOBIN](#install-binaries-to-GOBIN)-->

## Installing Go

First, [Install Go] from the official docs.

Next, change into the downloads directory and execute the following commands:

```bash
$ sudo tar xvf go1.19.linux-amd64.tar.gz -C /usr/local
$ go version
go version go1.19 linux/amd64
```

## Go Environment Variables

List all information about the Go environment:

```bash
$ go env
```

Here are the usual suspects I put in my `.bash_env`, which is sourced from my `.bashrc`:

```bash
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

```bash
go mod init [module-path]
```

`module-path` is the name of the new module.  Typically, it is a path to a reachable public location, such as [`github.com/btoll/stymie-go`].  This is because the `go` tooling will need to be able to access it when it's used in another project.

For example:

```bash
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

```go
package main

import (
    "fmt"

    "rsc.io/quote"
)

func main() {
    fmt.Println(quote.Go())
}
```

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
    > This can be used to bot upgrade or downgrade a package to a specific version.

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
1. If needed, downloads module source code (can download from a module proxy) into the module cache.
1. Authenticates the downloaded deps.

```bash
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

```bash
$ go get rsc.io/quote@none
```

### Listing Dependencies

List all packages of the module:

```bash
$ go list all
```

List all modules instead of packages, along with the latest version available for each:

```bash
$ go list -m -u all
```

## Managing Binaries

### Creating Binaries

Build and install binary in `GOBIN`:

```bash
$ go install example/user/hello
$ go install . (Defaults to package within cwd.)
$ go install   (Defaults to package within cwd.)
```

If `GOBIN` is set, binaries are installed to that directory.
If `GOPATH` is set, binaries are installed to the bin subdirectory of the first directory in the `GOPATH` list.
Otherwise, binaries are installed to the bin subdirectory of the default `GOPATH` (`$HOME/go` or `%USERPROFILE%\go`).

This won't produce an output file.
Instead, it saves the compiled package in the local build cache (GOCACHE).

```bash
$ go build
```

## Managing Caches

### Removing Caches

Remove the build cache:

```bash
$ go clean -cache
```

Remove the downloaded module cache:

```bash
$ go clean -modcache
```

You can find the cache locations in the Go environment information:

```bash
$ go env | ag cache
GOCACHE="/home/btoll/.cache/go-build"
GOMODCACHE="/home/btoll/go/pkg/mod"
```

## Importing A Local Module

If you run `go mod tidy` on a module that has a dependency that has not yet been published (see below), then the download will fail and nothing will be added to the `go.mod` file.

If the module is local (for example, you're currently developing it), then you can run the following command to have the Go runtime successfully import it into your module:

```bash
$ go mod edit -replace github.com/btoll/super-secret=../super-secret
```

This will add the following entry into `go.mod`:

```go
replace github.com/btoll/super-secret => ../super-secret
```

> Note that this is the module "path" and not the path of a package within the module.

This is nice and saves you from having to possibly to a search and replace all through your module's packages.

> Of course, this isn't the only reason for use the `replace` directive.

## Publishing

If you do not add a license to your repository, the Go package repository will not be able to display your documentation.

```bash
$ go mod tidy
$ git tag v0.1.0
$ git push origin v0.1.0
$ GOPROXY=proxy.golang.org go list -m github.com/btoll/trivial@v0.1.0
```

To [read more about publishing], read the docs.

> You can search for packages at [the Go package repository].

## Viewing Documentation

To get the `godoc` package and install it:

```bash
$ go get golang.org/x/tools/cmd/godoc
$ go install golang.org/x/tools/cmd/godoc
```

You'll then see the `godoc` binary in `$GOPATH/bin`.

```bash
$ godoc --help
```

It's possible to load docs locally via a builtin web server, which will also include your own types.  For example, go to the root directory of your package and run:

```bash
$ godoc -http :3030
using module mode; GOMOD=/home/btoll/projects/trivial/go.mod
```

> The default port is `6060`, so if that's acceptable, you can just run `godoc` by itself.

You'll then see your package listed under the "Third party" header.

Optionally, browse to the package:

`http://localhost:6060/pkg/github.com/btoll/trivial/trivial/`

To include the Playground, use the `-play` switch:

```bash
$ godoc -play
```

## Installing Delve

```bash
$ go install github.com/go-delve/delve/cmd/dlv@latest
```

This will install [`Delve`] to the location of `$GOBIN`.

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

---

If you're getting a circular dependency error when compiling, make sure that every package is within its own directory.

For example, here is the directory structure of my [`github-release`] utility that contains three packages: `main`, `cmd` and `release`:

```bash
$ tree github-release/
github-release/
├── cmd
│   ├── create.go
│   ├── delete.go
│   ├── get.go
│   ├── list.go
│   └── root.go
├── go.mod
├── go.sum
├── main.go
├── README.md
└── release
    └── release.go
```

This structure **will** compile.  However, if the `release.go` script was not in its own directory but instead at the root of the project (so, the same level as main.go), it'd could result in a circular dependency error (it also would depend on how your `imports` were defined).

At the very least, you'll get something like this:

```bash
$ go install .
found packages main (main.go) and release (release.go) in /home/btoll/projects/github-release
cmd/create.go:7:2: no required module provides package github.com/btoll/github-release/release; to add it:
        go get github.com/btoll/github-release/release
```

## Programming

### `init` function

Everybody knows that the `main` function is the first function that is run in the `main` package.  However, there is a function that is run before the `main` function, if defined.

This is the [niladic] `init` function, and you can define one in every file.  They will all get run before the `main` function in the `main` package.

You can [read more about the `init` function] in the Go docs.

### Embedding Static Files

Since Go 1.16, it's been possible to [embed] static files, whether one or many, into the binary.  This is a great addition to the language, and it solves the problem of trying to deploy these static files alongside the generated binary.

Here is an example of embedding a directory of `html` template files in an executable (excerpted from my [`trivial` package]):

```go
import (
	"embed"
	...
)

//go:embed templates/*.gohtml
var templateFiles embed.FS

func NewSocketServer(uri URI) *SocketServer {
	fmt.Printf("created new websocket server `%s`\n", uri)
	return &SocketServer{
		Location: uri,
		Games:    make(map[string]*Game),
		Tpl: template.Must(template.ParseFS(templateFiles, "templates/*.gohtml")),
	}
}
```

### Passing Command-Line Arguments

Use `os.Args` or the `flags` package.

### Getting User Input

Here is a dead simple example:

```go
package main

import (
	"fmt"
	"os"
)

func main() {
	var name string
	var band string
	fmt.Print("What is your name and favorite band: ")
	_, err := fmt.Scanf("%s %s", &name, &band)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Printf("Hi %s, you are correct that %s is the greatest band\n", name, band)
}
```

### Multi-Dimensional Arrays

```go
a := [3][3]int{
    {0, 1, 2},
    {3, 4, 5},
    {6, 7, 8},
}
```

Weeeeeeeeeeeeeeee

## Runtime

Goroutines are lightweight application-level threads that have separate and independent executions.

The number of logical cores is the product of the number of physical cores times the number of threads that can run on each core (i.e., hardware threads).

The Go runtime has its own scheduler that multiplexes the goroutines on the OS level threads.  So, it schedules an arbitrary number of goroutines onto an arbitrary number of OS threads (`m:n` multiplexing).

The operating system scheduler manages the operating system threads for each logical core in the system.  Within the Go runtime, each of of these threads will have a queue associated with it called the LRQ (the local run queue), which in turn consist of all the goroutines that will be executed within the context of that thread.

The Go runtime scheduler does the scheduling and the context switching of the goroutines belonging to a particular LRQ.

There is also a GRQ (global run queue) which contain all the goroutines that haven't been moved to any LRQ of any OS thread.  The Go scheduler will assign a goroutine from this queue to the LRQ of any OS thread.

The Go scheduler is a cooperative scheduler, so it is non-preemptive.  Cooperative scheduling is a style of scheduling in which the OS never interrupts a running process to initiate a context switch from one process to another.

The process must voluntarily yield control periodically or when logically blocked on a resource.

Context switching may happen when a goroutine is called.

Examples of context switching:

- function calls
- garbage collection
- network calls
- channel operations
- on using the `go` keyword

But again, it's up to the scheduler to do a context switch (or not).

To find out the number of logical processors on a machine:

### Goroutines vs Threads

- goroutines are cheaper
    + the stack is only a few KBs in size and can grow and shrink
    + for threads, the stack size has to be specified (usually 1MB) and it's fixed
- goroutines are multiplexed to a fewer number of OS threads
- context switching time of goroutines is much faster
- goroutines communicate using channels

```go
fmt.Printf("%d\n", runtime.NumCPU)
```

## References

- [Download and install](https://go.dev/doc/install)
- [Tutorial: Get started with Go](https://go.dev/doc/tutorial/getting-started)
- [Managing dependencies](https://go.dev/doc/modules/managing-dependencies)
- [Managing module source](https://go.dev/doc/modules/managing-source)
- [How to Write Go Code](https://go.dev/doc/code)
- [go.mod file reference](https://go.dev/doc/modules/gomod-ref)
- [Understanding the Go runtime (1.21)](https://golab.io/talks/understanding-the-go-runtime)

[Install Go]: https://go.dev/doc/install
[`github.com/btoll/stymie-go`]: https://github.com/btoll/stymie-go
[Go's getting started tutorial]: https://go.dev/doc/tutorial/getting-started#call
[`go.mod`]: https://go.dev/doc/modules/gomod-ref
[`go.sum`]: https://go.dev/doc/modules/managing-source#repository
[from the docs]: https://go.dev/doc/modules/managing-source#repository
[read more about publishing]: https://go.dev/doc/modules/publishing
[the Go package repository]: https://pkg.go.dev
[`vim-go`]: https://github.com/fatih/vim-go
[`vim-plug`]: https://github.com/junegunn/vim-plug
[niladic]: https://en.wiktionary.org/wiki/niladic
[read more about the `init` function]: https://go.dev/doc/effective_go#init
[embed]: https://pkg.go.dev/embed
[`trivial` package]: https://pkg.go.dev/github.com/btoll/trivial
[`github-release`]: https://github.com/btoll/github-release/
[`Delve`]: https://github.com/go-delve/delve

