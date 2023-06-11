+++
title = "On Dockerfile Best Practices"
date = "2023-06-10T19:27:34-04:00"

+++

Readers of this website know that I'm no fan of Docker and prefer to use other container engines.  However, I live in the real world, and this world has embraced Docker and loves it to pieces.  I mean, get a room, already.

Of course, being someone who enjoys learning about technology, and on top of that a fan of container technologies, I find myself reading [the Docker documentation] from time to time.  And, truth be told, it is quite good.

So, I'm always keen to understand the best practices for a particular piece of technology, especially as promoted by the designers themselves.

To that end, the only docs that I read for this article were the Docker docs.  I mean, why would I get some watered-down version from another party, when instead I can go straight to the source?  In fact, you should stop reading right now and go to the Docker docs.  Why read what I think is important when you can decide for yourself?

But, if you're still here, read on.

*Caveat emptor*.

---

- [Non-Privileged User](#non-privileged-user)
- [Building](#building)
    + [`stdin`](#stdin)
    + [Build Context](#build-context)
- [`.dockerignore`](#dockerignore)
- [Multi-Stage Builds](#multi-stage-builds)
- [Misc](#misc)
- [Summary](#summary)
- [References](#references)

---

## Non-Privileged User

Hopefully, everyone has heard by now to run a container as a non-privileged user.  That is, do not run as root.  This is rarely a good idea.

Here, I'm creating a new group and user and then switching to it.  Yay.

```dockerfile
RUN groupadd \
    --gid 1000
    noroot && \
    useradd \
    --create-home \
    --home-dir /home/noroot \
    --uid 1000 \
    --gid 1000 \
    noroot

...

USER noroot

...
```

> To reduce layers and complexity, avoid switching `USER` back and forth frequently.

## Building

The ideas in this section aren't best practices, in my opinion, even though [Docker says they are].  Rather, they are interesting ways to create containers with the Docker engine when a Dockerfile isn't present or needed.

Why would you be interested in creating images in the following ways (i.e., dynamically)?  Well, who wants to stink up their project repository with a Dockerfile?  Absolutely nobody, that's who.  And, as you'll soon learn, you don't have to.

So, prepare those pull requests (or, merge requests) to remove the Dockerfiles from your project repositories.

`LGTM`.

### `stdin`

When sending a Dockerfile to `docker build` using `stdin`, use the hyphen (`-`) to denote it (of course, this is a common practice for a lot of Unix tools).  Creating an image this way is handy when you're building them dynamically.

I once did this at a job where I needed to test that software was being built correctly for an image and then usable in a container instance.  These used different Linux distributions for its userspace applications and so the Dockerfiles were fairly boilerplate.

So, I created a simple shell script that dynamically created multiple Dockerfiles with a few surgical changes and sent them to the `stdin` of the `docker build` command.  And, I then partied like it was 1999.

Let's quickly look at some different ways to send a Dockerfile to `stdin`.

Pipe:

```bash
$ echo -e 'FROM busybox\nCMD echo "hello world"' | docker build -t hello -
$ docker run --rm hello
hello world
```

[Here document]:

```bash
$ docker build -t hello -<<EOF
> FROM busybox
> CMD echo "hello world"
> EOF
$ docker run --rm hello
hello world
```

Redirection and [process substitution]:

```bash
$ docker build -t foo - < <(echo -e 'FROM busybox\nCMD echo "hello world"')
$ docker run foo
hello world
```

Ok, that last one was just silly.  No one would do that.  I don't think.

Importantly, none of these examples used a [build context].  Yes, that's a thing.

> Note that trying to `COPY` or `ADD` any files to the image will fail when not using a build context.

Let's now look at the same idea, but with using a build context.

### Build Context

My legendary [`asbits` project] doesn't include a Dockerfile, because that would just be silly.  But that's not a problem, as I can still use it as the build context and pass a Dockerfile on-the-fly to `stdin`.

There are a couple of ways to do this remotely:
- a `URL`
- a tarball

As a `git` repo:

```bash
$ docker build -t asbits -f- https://github.com/btoll/asbits.git <<EOF
> FROM debian:bullseye-slim
> RUN apt-get update && apt-get install -y build-essential
> COPY . ./
> RUN gcc -o asbits asbits.c
> ENTRYPOINT ["./asbits"]
> EOF
$
$ docker images
REPOSITORY   TAG       IMAGE ID       CREATED         SIZE
asbits       latest    bc827217073f   2 minutes ago   371MB
$
$ docker run --rm -it asbits 0xdeadbeef 8
1101 1110 1010 1101 1011 1110 1110 1111
```

Of course, the files copied into the image layer are from the remote `git` repository.

> Docker will do a `git clone` behind the scenes and then pass those download files to the Docker daemon as the build context.  This means that you will need to have `git` installed on the Docker build machine.

Next, let's use a tarball as the build context (supports `xz`, `bzip2`, `gzip` and `identity` formats):

```bash
$ docker build -t btoll/asbits:1.0.0 -f- http://192.168.1.96:8000/asbits-1.0.0.tar.gz <<EOF
FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y build-essential
COPY asbits.[c,h] ./
RUN gcc -o asbits asbits.c
ENTRYPOINT ["./asbits"]
EOF
$
$ docker images
REPOSITORY     TAG       IMAGE ID       CREATED         SIZE
btoll/asbits   1.0.0     44f16aefd686   2 minutes ago   371MB
$
$ docker run --rm -it btoll/asbits:1.0.0 0xdeadbeef 8
1101 1110 1010 1101 1011 1110 1110 1111
```

Lastly, you can always use a local build context.  Here, we'll use everyone's favorite, the current working directory (`.`):

```dockerfile
$ docker build -t btoll/asbits:1.0.0 -f- . <<EOF
FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y build-essential
COPY asbits.[c,h] ./
RUN gcc -o asbits asbits.c
ENTRYPOINT ["./asbits"]
EOF
```

## `.dockerignore`

Exclude any files not needed in the image by using a [`.dockerignore`] file.  Anyone familiar with its better-known cousin the [`.gitignore`] file will be right at home.

For example, if you're using `NodeJS`, you'd want to add `node_modules` to `.dockerignore`.  Frankly, I'm not even sure `NodeJS` is a real thing, but people tell me it is.

Also, really important things you don't want in your Docker image (and that includes any layer) are things such as certificates and cryptographic keys that commonly use the [`PEM` format] and have a `.pem` file extension.

## Multi-Stage Builds

Use the [`scratch` image] as the final layer, if possible.

> Only `RUN`, `COPY` and `ADD` create layers.  Other instructions create temporary intermediate images, and don't increase the size of the build.

Since I'm feeling incredibly lazy, I'm just going to copy [the example from the docs]:

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.16-alpine AS build

# Install tools required for project
# Run `docker build --no-cache .` to update dependencies
RUN apk add --no-cache git
RUN go get github.com/golang/dep/cmd/dep

# List project dependencies with Gopkg.toml and Gopkg.lock
# These layers are only re-built when Gopkg files are updated
COPY Gopkg.lock Gopkg.toml /go/src/project/
WORKDIR /go/src/project/
# Install library dependencies
RUN dep ensure -vendor-only

# Copy the entire project and build it
# This layer is rebuilt when a file changes in the project directory
COPY . /go/src/project/
RUN go build -o /bin/project

# This results in a single layer image
FROM scratch
COPY --from=build /bin/project /bin/project
ENTRYPOINT ["/bin/project"]
CMD ["--help"]
```

## Misc

I sort lists out of habit to prevent duplications, and it's funny that [Docker recommends the same].  So there.  Docker just went up a notch in my book.

Not really.

---

It is no longer necessary to combine all labels (key-value pairs) into a single `LABEL` instruction.  Before version 1.10, this could have resulted in extra layers, but no longer.

---

Always combine `apt-get update` and `apt-get install` in a single `RUN` instruction.  The reason for this is caching.  For instance, if they were in two separate `RUN` statements, they would be cached into two separate layers.

Now, suppose that you add another package for installation to the `apt-get install` `RUN` statement.  Consequently, the package may not be able to be found because the first `RUN` layer would be retrieved from the cache, and its retrieved indices may not have the information for the new package (or reference an older version) you wish to install.  Bummer.

---

It's a good idea to use version pinning instead of relying on the latest version of a package.  For instance, include a tagged version after the package name, whenever possible:

```dockerfile
RUN apt-get update && apt-get install -y \
    asbits \
    foo-package=2.1.4 \
    trivial
```

`APT` stores the package information (such as the `InRelease` file) that it retrieves when updating (`apt-get update`) in the `/var/lib/apt/lists/` directory.  This can be deleted to save space in the final image.

> The contents of `/var/lib/apt/lists/` can be safely deleted as they will be re-downloaded the next time `apt-get update` is invoked.

---

For those that do a lot of `bash` shell scripting, you're probably used to the `pipefail` shell option (`shopt`).

What is `pipefail`?  From [The Set Builtin] docs:

<cite>[T]he return value of a pipeline is the status of the last command to exit with a non-zero status, or zero if no command exited with a non-zero status.</cite>

So, if you run the statement without the `pipefail` option set:

```dockerfile
RUN wget -O - https://some.site | wc -l > /number
```

The `wget` invocation could fail, but as long as the `wc` did not, you'd get a exit value of 0 indicating a success.  So, the error would be swallowed, which everyone knows is *no bueno*.

What you want to happen is for an error to be raised the first time something in a pipeline, and that's what `pipefail` allows for.

The problem, of course, is that Docker uses the `Bourne` shell (`sh`) to execute commands in a `RUN` instruction, and the `Bourne` shell doesn't support `pipefail`.  So, you're going to need to run it in a command that supports it, such as `bash`.

To do that, the Docker docs suggest that you use the *`exec`* form of `RUN`:

```dockerfile
RUN ["/bin/bash", "-c", "set -o pipefail && wget -O - https://some.site | wc -l > /number"]
```

---

Each `ENV` line creates a new intermediate layer, just like `RUN` commands. This means that even if you unset the environment variable in a future layer, it still persists in this layer and its value can be dumped.

---

If you have multiple files to be copied into an image but different build steps (that is, `RUN` stages) rely upon a different files or only a subset of the total number, then break them up into different `RUN` steps.  This will help prevent some cache invalidations and will lead to faster build times.

For example:

```dockerfile
COPY asbits.[c,h] ./
RUN gcc asbits.c
COPY the_universe.* ./
```

Will have fewer cache invalidations for the `RUN` step than:

```dockerfile
COPY the_universe.* asbits.[c,h] ./
RUN gcc asbits.c
```

---

Generally speaking, only use `ADD` when needing to extract a local tarball into the image.  Also, rather than using `ADD` to fetch a remote package, use `curl` or `wget` so then you can remove the download, reducing the overall image size.

## Summary

Docker, in its documentation and in every technological nook and cranny on the Internets, wants people to think that it invented container technologies and the Linux kernel.  And Unix.  [The squeeze play].  And Louis CK's comeback.

Yes, Docker is the Milli Vanilli of container technologies.  Girl, you know it's true.

## References

- [Best practices for writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)

[the Docker documentation]: https://docs.docker.com/
[go straight to the source]: /2023/06/03/on-original-sources/
[build context]: https://docs.docker.com/build/building/context/
[`asbits` project]: https://github.com/btoll/asbits
[`.dockerfile`]: https://docs.docker.com/engine/reference/builder/#dockerignore-file
[`scratch` image]: https://hub.docker.com/_/scratch/
[Docker recommends the same]: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#sort-multi-line-arguments
[The Set Builtin]: https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html
[Here document]: https://en.wikipedia.org/wiki/Here_document
[The squeeze play]: https://en.wikipedia.org/wiki/Squeeze_play_(baseball)
[`PEM` format]: https://en.wikipedia.org/wiki/Privacy-Enhanced_Mail
[process substitution]: https://www.gnu.org/software/bash/manual/html_node/Process-Substitution.html
[the example from the docs]: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#use-multi-stage-builds
[Docker says they are]: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#pipe-dockerfile-through-stdin
[`.gitignore`]: https://git-scm.com/docs/gitignore

