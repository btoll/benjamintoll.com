+++
title = "On Managing Multiple Go Installations"
date = "2026-03-01T17:02:15-05:00"

+++

- [Introduction](#introduction)
- [Base Installation](#base-installation)
- [The Go Version Manager](#the-go-version-manager)
- [References](#references)

---

## Introduction

What is the best practice for setting up a new installation of Go?  Should I define `GOROOT` and `GOPATH`?  What about `GOBIN`?  Where should I install Go?  How do I manage multiple versions?

There is often conflicting information about some or all of these questions, and it's probably because many people don't consult the official [Go documentation].  Well, let's do just that and learn what the Go team thinks is the best way to get started with Go and installing multiple versions of Go.

This article is going to assume that you'll be starting from scratch.

## Base Installation

From the [Download and install](https://go.dev/doc/install) documentation:

1. Remove any previous installation and reinstall into the `/usr/local` system directory:

    ```bash
    $ rm -rf /usr/local/go && tar -C /usr/local -xzf go1.26.0.linux-amd64.tar.gz
    ```

1. Set the `PATH` env var in one of your shell scripts that is parsed for both [interactive login shells](/2023/01/22/on-the-lpic-1-exam-102-shells-and-shell-scripting/#interactive-login) and [interactive non-login shells]().

    ```bash
    export PATH=$PATH:/usr/local/go/bin
    ```

1. Source the location of the file that contains the variable declaration.  For example, if using Bash, it will probably be either `$HOME/.bash_profile` or `$HOME/.bashrc` (mine is in [`$HOME/.bash_env`](https://github.com/btoll/dotfiles/blob/master/bash/dot-bash_env) because I'm better than you).

    > Here is the value of may `PATH` environment variable:
    > ```bash
    > $ echo $PATH
    > /home/btoll/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/go/bin
    > ```

That's it!

Test it by printing the version:

```bash
$ go version
go version go1.26.0 linux/amd64
$ which go
/usr/local/go/bin/go
```

But, what about the Go environment variables such as `GOROOT`, `GOPATH` and `GOBIN`?  Let's see if any are set by default:

```bash
$ go env GOROOT GOPATH GOBIN
/usr/local/go
/home/btoll/go

```

Ok, [two out of three ain't bad](https://www.youtube.com/watch?v=k5hWWe-ts2s).

Let's go ahead and set `GOBIN` in your Bash file of choice, as we'll definitely need that:

```bash
export GOBIN="$HOME/go/bin"
export PATH="$HOME/bin:$GOBIN:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/go/bin"
```

Source the file.  Since I set mine in `.bash_env`, I'll source that one:

```
$ . ~/.bash_env
```

Nice, those are sensible defaults, and, in fact, the first two are the same values I have been using to explictly set when launching interactive shells.

So to recap, we've now answered three of the questions posed in the [Introduction](#introduction).  Specifically:

**Q.** What is the best practice for setting up a new installation of Go?

**A.** Make it as simple as possible by relying on the Go tooling.

---

**Q.** Where should I install Go?

**A.** Install it into `/usr/local` and then add the location to the `PATH` environment variable.

---

**Q.** Should I define `GOROOT` and `GOPATH`?  What about `GOBIN`?

**A.** Only need to set `GOBIN`, as the Go tooling will set sensible defaults for the others.

---

Let's now turn to answering the fourth and last question.  How do I manage multiple versions?

## The Go Version Manager

Here are the official docs for [Managing Go installations], you should read them.

There are tools such as `gvm` to manage multiple Go installations, but I like things to be as simple as possible, so we won't be using any of them.  In other words, let's just use the built-in Go tooling.  And, I can always write a short Bash function to easily replicate any behavior I need, such as switching between versions without having to append the version I'd like to the `go` binary name (i.e., `go1.25.5` versus just `go`).

First, let's download the built-in Go version manager:

```bash
$ go install golang.org/dl/go@latest
go: downloading golang.org/dl v0.0.0-20260210192738-6a105f684182
go: golang.org/dl/go@latest: module golang.org/dl@latest found (v0.0.0-20260210192738-6a105f684182), but does not contain package golang.org/dl/go
```

> Don't worry about the last line of the above output, it is not an error.

> If you get an error similar to the following, make sure that you're using the correct domain (i.e., `go.dev` is not correct):
> ```bash
> $ go install go.dev/dl/go@latest
> go: go.dev/dl/go@latest: unrecognized import path "go.dev/dl/go": reading https://go.dev/dl/go?go-get=1: 404 Not Found
>        server response: 404 page not found
> ```

Installing the Go version manager created the `pkg` directory in `GOPATH`.  Here is its structure:

```bash
$ tree -dL 3 $GOPATH/pkg
/home/btoll/go/pkg
├── mod
│   ├── cache
│   │   ├── download
│   │   └── vcs
│   └── golang.org
│       └── dl@v0.0.0-20260210192738-6a105f684182
└── sumdb
    └── sum.golang.org

9 directories
```

It created this entire structure only because I didn't previously have a `pkg` directory, since this is a fresh install.  If I already did have `pkg`, you'd probably have everything except the `dl@v0.0.0-20260210192738-6a105f684182` directory within the `GOPATH/pkg/mod/golang.org` directory.  So, it looks as though the Go version manager itself is installed into `dl@v0.0.0-20260210192738-6a105f684182`.  Of course, the name may not be the same as yours, but the important part appears to be `dl@v...` to distinguish it as the version manager.

Next, let's see what has been installed into that directory:

```bash
$ ls dl@v0.0.0-20260210192738-6a105f684182/                                                                                                                                            [1/24845]
codereview.cfg   go1.11.4/     go1.12.4/     go1.13.8/     go1.15/       go1.16.12/    go1.17.5/     go1.19.1/     go1.20.2/   go1.21.8/   go1.23.10/  go1.24.6/   go1.6.4/     go1.9beta1/
CONTRIBUTING.md  go1.11.5/     go1.12.5/     go1.13.9/     go1.15.1/     go1.16.13/    go1.17.6/     go1.19.10/    go1.20.3/   go1.21.9/   go1.23.11/  go1.24.7/   go1.7.6/     go1.9beta2/
go1.10/          go1.11.6/     go1.12.6/     go1.13beta1/  go1.15.10/    go1.16.14/    go1.17.7/     go1.19.11/    go1.20.4/   go1.21rc1/  go1.23.12/  go1.24.8/   go1.8/       go1.9rc1/
go1.10.1/        go1.11.7/     go1.12.7/     go1.13rc1/    go1.15.11/    go1.16.15/    go1.17.8/     go1.19.12/    go1.20.5/   go1.21rc2/  go1.23.2/   go1.24.9/   go1.8.1/     go1.9rc2/
go1.10.2/        go1.11.8/     go1.12.8/     go1.13rc2/    go1.15.12/    go1.16.2/     go1.17.9/     go1.19.13/    go1.20.6/   go1.21rc3/  go1.23.3/   go1.24rc1/  go1.8.2/     go.mod
go1.10.3/        go1.11.9/     go1.12.9/     go1.14/       go1.15.13/    go1.16.3/     go1.17beta1/  go1.19.2/     go1.20.7/   go1.21rc4/  go1.23.4/   go1.24rc2/  go1.8.3/     gotip/
go1.10.4/        go1.11beta1/  go1.12beta1/  go1.14.1/     go1.15.14/    go1.16.4/     go1.17rc1/    go1.19.3/     go1.20.8/   go1.22.0/   go1.23.5/   go1.24rc3/  go1.8.4/     internal/
go1.10.5/        go1.11beta2/  go1.12beta2/  go1.14.10/    go1.15.15/    go1.16.5/     go1.17rc2/    go1.19.4/     go1.20.9/   go1.22.1/   go1.23.6/   go1.25.0/   go1.8.5/     LICENSE
go1.10.6/        go1.11beta3/  go1.12rc1/    go1.14.11/    go1.15.2/     go1.16.6/     go1.18/       go1.19.5/     go1.20rc1/  go1.22.10/  go1.23.7/   go1.25.1/   go1.8.6/     PATENTS
go1.10.7/        go1.11rc1/    go1.13/       go1.14.12/    go1.15.3/     go1.16.7/     go1.18.1/     go1.19.6/     go1.20rc2/  go1.22.11/  go1.23.8/   go1.25.2/   go1.8.7/     README.md
go1.10.8/        go1.11rc2/    go1.13.1/     go1.14.13/    go1.15.4/     go1.16.8/     go1.18.10/    go1.19.7/     go1.20rc3/  go1.22.12/  go1.23.9/   go1.25.3/   go1.8beta1/
go1.10beta1/     go1.12/       go1.13.10/    go1.14.14/    go1.15.5/     go1.16.9/     go1.18.2/     go1.19.8/     go1.21.0/   go1.22.2/   go1.23rc1/  go1.25.4/   go1.8beta2/
go1.10beta2/     go1.12.1/     go1.13.11/    go1.14.15/    go1.15.6/     go1.16beta1/  go1.18.3/     go1.19.9/     go1.21.1/   go1.22.3/   go1.23rc2/  go1.25.5/   go1.8rc1/
go1.10rc1/       go1.12.10/    go1.13.12/    go1.14.2/     go1.15.7/     go1.16rc1/    go1.18.4/     go1.19beta1/  go1.21.10/  go1.22.4/   go1.24.0/   go1.25.6/   go1.8rc2/
go1.10rc2/       go1.12.11/    go1.13.13/    go1.14.3/     go1.15.8/     go1.17/       go1.18.5/     go1.19rc1/    go1.21.11/  go1.22.5/   go1.24.1/   go1.25.7/   go1.8rc3/
go1.11/          go1.12.12/    go1.13.14/    go1.14.4/     go1.15.9/     go1.17.1/     go1.18.6/     go1.19rc2/    go1.21.12/  go1.22.6/   go1.24.10/  go1.25rc1/  go1.9/
go1.11.1/        go1.12.13/    go1.13.15/    go1.14.5/     go1.15beta1/  go1.17.10/    go1.18.7/     go1.20/       go1.21.13/  go1.22.7/   go1.24.11/  go1.25rc2/  go1.9.1/
go1.11.10/       go1.12.14/    go1.13.2/     go1.14.6/     go1.15rc1/    go1.17.11/    go1.18.8/     go1.20.1/     go1.21.2/   go1.22.8/   go1.24.12/  go1.25rc3/  go1.9.2/
go1.11.11/       go1.12.15/    go1.13.3/     go1.14.7/     go1.15rc2/    go1.17.12/    go1.18.9/     go1.20.10/    go1.21.3/   go1.22.9/   go1.24.13/  go1.26.0/   go1.9.3/
go1.11.12/       go1.12.16/    go1.13.4/     go1.14.8/     go1.16/       go1.17.13/    go1.18beta1/  go1.20.11/    go1.21.4/   go1.22rc1/  go1.24.2/   go1.26rc1/  go1.9.4/
go1.11.13/       go1.12.17/    go1.13.5/     go1.14.9/     go1.16.1/     go1.17.2/     go1.18beta2/  go1.20.12/    go1.21.5/   go1.22rc2/  go1.24.3/   go1.26rc2/  go1.9.5/
go1.11.2/        go1.12.2/     go1.13.6/     go1.14beta1/  go1.16.10/    go1.17.3/     go1.18rc1/    go1.20.13/    go1.21.6/   go1.23.0/   go1.24.4/   go1.26rc3/  go1.9.6/
go1.11.3/        go1.12.3/     go1.13.7/     go1.14rc1/    go1.16.11/    go1.17.4/     go1.19/       go1.20.14/    go1.21.7/   go1.23.1/   go1.24.5/   go1.5.4/    go1.9.7/
```

That's interesting.  There is a directory for each supported release.

What does the `README.md` say?

```bash
$ cat dl@v0.0.0-20260210192738-6a105f684182/README.md
# golang.org/dl

This repository holds the Go wrapper programs that run specific versions of Go, such
as `go install golang.org/dl/go1.10.3@latest` and `go install golang.org/dl/gotip@latest`.

## Report Issues / Send Patches

This repository uses Gerrit for code changes. To learn how to submit
changes to this repository, see https://golang.org/doc/contribute.html.
The main issue tracker for the dl repository is located at
https://github.com/golang/go/issues. Prefix your issue with "dl:" in the
subject line, so it is easy to find.
```

Let's check out the contents of one of the version directories:

```bash
$ ls dl@v0.0.0-20260210192738-6a105f684182/go1.25.7
main.go
```

And, here is the content of [`main.go`](https://github.com/golang/dl/blob/master/go1.25.7/main.go):

```go
// Copyright 2026 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// The go1.25.7 command runs the go command from Go 1.25.7.
//
// To install, run:
//
//      $ go install golang.org/dl/go1.25.7@latest
//      $ go1.25.7 download
//
// And then use the go1.25.7 command as if it were your normal go
// command.
//
// See the release notes at https://go.dev/doc/devel/release#go1.25.7.
//
// File bugs at https://go.dev/issue/new.
package main

import "golang.org/dl/internal/version"

func main() {
        version.Run("go1.25.7")
}
```

Let's try installing this version (see the [`install`](https://github.com/golang/dl/blob/master/internal/version/version.go#L104) function for details):

```bash
$ go install golang.org/dl/go1.25.7@latest
```

Like all installs, it will put a binary into the `$GOBIN` directory.  But what is it?  Is it a Go installation?

```bash
$ go1.25.7 version
go1.25.7: not downloaded. Run 'go1.25.7 download' to install to /home/btoll/sdk/go1.25.7
```

No.  Let's look into this.  If we look back to the contents of `dl@v0.0.0-20260210192738-6a105f684182/go1.25.7/main.go`, we can see that the [`version.Run`](https://github.com/golang/dl/blob/master/internal/version/version.go#L35) function is being called when the binary is executed:

```go
version.Run("go1.25.7")
```

Stepping into that function, you'll see that it's expecting an argument of `download`.  This will then install the full Go installation into the `$HOME/sdk` directory (`sdk` has been hardcoded as of this writing) at `$HOME/sdk/go1.25.7`.

Let's do it:

```bash
$ go1.25.7 download
Downloaded   0.0% (   16384 / 59768749 bytes) ...
Downloaded   5.3% ( 3145136 / 59768749 bytes) ...
Downloaded  28.7% (17170304 / 59768749 bytes) ...
Downloaded  52.2% (31227104 / 59768749 bytes) ...
Downloaded  75.9% (45382768 / 59768749 bytes) ...
Downloaded  98.7% (59014720 / 59768749 bytes) ...
Downloaded 100.0% (59768749 / 59768749 bytes)
Unpacking /home/btoll/sdk/go1.25.7/go1.25.7.linux-amd64.tar.gz ...
Success. You may now run 'go1.25.7'
$ ls ~/sdk/
go1.25.7/
$ which go1.25.7
/home/btoll/go/bin/go1.25.7
$ go1.25.7 version
go version go1.25.7 linux/amd64
```

Now we can understand that the "wrapper" binary that had been installed into `$GOBIN` is used not only to install the full Go installation but also to  delegate execution to the full installation binary in `$HOME/sdk/` in subsequent calls to it after installation (see the [`runGo`](https://github.com/golang/dl/blob/master/internal/version/version.go#L57) function).  Here, it is delegating through to the actual installation binary in `$HOME/sdk/` to call the `version` command.

```bash
$ $GOBIN/go1.25.7 version
go version go1.25.7 linux/amd64
$ $GOBIN/go1.25.7 env GOPATH
/home/btoll/go
```

> When the `install()` function is called to install the full Go installation in `$HOME/sdk/`, it will write a zero-byte hidden file called `.unpackedOkay` into the installation directory.  The wrapper binary in `$GOBIN` will only delegate to the full installation binary if it is present.

## References

- [On Getting Started with Go](/2022/08/05/on-getting-started-with-go/)
- [Go documentation]
- [Managing Go installations]

[Go documentation]: https://go.dev/doc/
[Managing Go installations]: https://go.dev/doc/manage-install

