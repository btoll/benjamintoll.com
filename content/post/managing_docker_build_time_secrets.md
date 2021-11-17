+++
title = "On Managing Docker Build-Time Secrets"
date = "2021-04-26T00:14:55-04:00"

+++

With the release of 18.09 version of the [Docker Engine], build-time secrets can now be handled safely and efficiently using [BuildKit].  This now can be accomplished using the [`--ssh`] and [`--secret`] flags.

Prior to this, it took some doing to get secrets used at build-time from appearing in any of the image layers.  There were many [discussions] and many [hacks]\* and many ways to unknowingly expose the secrets in prior layers.

# The Problem

For instance, here is something you definitely don't want to do.  In the following example, a user wants to clone a private repository on GitHub.  In the Dockerfile, they naively think that removing the private key after using it to authenticate to GitHub will remove it from the image.  Let's take a look and see what happens.

`Dockerfile`

<pre class="math">
FROM alpine

RUN apk add --no-cache openssh-client git

COPY test-key /
RUN chmod 600 /test-key && \
    { \
        echo "IdentityFile /test-key"; \
        echo "StrictHostKeyChecking no"; \
    } >> /etc/ssh/ssh_config && \
    git clone git@github.com:btoll/private-repo.git

RUN rm test-key
</pre>

Here, we're copying the private key in the build context into the container.  After successfully authenticating, the private repository is cloned and the private key is removed.

```
$ docker build -t test .
Sending build context to Docker daemon  5.632kB
Step 1/5 : FROM alpine
 ---> 4dd97cefde62
Step 2/5 : RUN apk add --no-cache openssh-client git
 ---> Using cache
 ---> d8836283df88
Step 3/5 : COPY test-key /
 ---> 361abf16c6cc
Step 4/5 : RUN chmod 600 /test-key &&     {         echo "IdentityFile /test-key";         echo "StrictHostKeyChecking no";     } >> /etc/ssh/ssh_config &&     git clone git@github.com:btoll/private-repo.git
 ---> Running in 6fc40b60a171
Cloning into 'private-repo'...
Warning: Permanently added 'github.com,140.82.113.3' (RSA) to the list of known hosts.
Removing intermediate container 6fc40b60a171
 ---> a1a757aaf720
Step 5/5 : RUN rm test-key
 ---> Running in ed30419f8b46
Removing intermediate container ed30419f8b46
 ---> ba08f46515a3
Successfully built ba08f46515a3
Successfully tagged test:latest
```

Let's check if the `test-key` private key is still in the container:

```
$ docker run --rm -it test stat /test-key
stat: cannot stat '/test-key': No such file or directory
```

It's not there, we're good!

Uh, not so fast, bucko.  Put your pants back on.

Let's check the history of the new `test` image:

```
$ docker history test
IMAGE          CREATED          CREATED BY                                      SIZE      COMMENT
ba08f46515a3   17 seconds ago   /bin/sh -c rm test-key                          0B
a1a757aaf720   18 seconds ago   /bin/sh -c chmod 600 /test-key &&     {     …   102kB
361abf16c6cc   19 seconds ago   /bin/sh -c #(nop) COPY file:fe73489ced88c069…   1.68kB
d8836283df88   14 minutes ago   /bin/sh -c apt update && apt install git -y     130MB
4dd97cefde62   7 weeks ago      /bin/sh -c #(nop)  CMD ["/bin/bash"]            0B
<missing>      7 weeks ago      /bin/sh -c mkdir -p /run/systemd && echo 'do…   7B
<missing>      7 weeks ago      /bin/sh -c [ -z "$(apt-get indextargets)" ]     0B
<missing>      7 weeks ago      /bin/sh -c set -xe   && echo '#!/bin/sh' > /…   811B
<missing>      7 weeks ago      /bin/sh -c #(nop) ADD file:c77338d21e6d1587d…   72.9MB
$
$ docker images test
REPOSITORY   TAG       IMAGE ID       CREATED         SIZE
test         latest    ba08f46515a3   4 seconds ago   23.6MB
```

I have a sneaking suspicion that we'd better check all of those layers!

> Curious about the `<missing>` layers?  See [this SO answer] for more information.

```
$ docker run --rm -it ba0 stat /test-key
stat: cannot stat '/test-key': No such file or directory
$
$ docker run --rm -it a1a stat /test-key
  File: /test-key
  Size: 1675            Blocks: 8          IO Block: 4096   regular file
Device: 93h/147d        Inode: 15074267    Links: 1
Access: (0600/-rw-------)  Uid: (    0/    root)   Gid: (    0/    root)
Access: 2021-04-26 22:28:38.000000000 +0000
Modify: 2021-04-26 22:28:38.000000000 +0000
Change: 2021-04-26 23:08:20.648765437 +0000
 Birth: -
$
$ docker run --rm -it 361 stat /test-key
  File: /test-key
  Size: 1675            Blocks: 8          IO Block: 4096   regular file
Device: 93h/147d        Inode: 14942377    Links: 1
Access: (0600/-rw-------)  Uid: (    0/    root)   Gid: (    0/    root)
Access: 2021-04-26 22:28:38.000000000 +0000
Modify: 2021-04-26 22:28:38.000000000 +0000
Change: 2021-04-26 22:53:46.424193280 +0000
 Birth: -
$
$ docker run --rm -it d88 stat /test-key
stat: cannot stat '/test-key': No such file or directory
$
$ docker run --rm -it 4dd stat /test-key
stat: cannot stat '/test-key': No such file or directory
```
[Ruh roh!]  The private key is still available in two of the layers!  Holy [Rickety Cricket!]

> Although this example uses an SSH private key, it's the same result for any secret that is copied in one layer and removed in a subsequent one.  Don't do it!

# The Solution

Now that we know what the problem is, what is the solution?  Well, let's first take a look at the `--ssh` flag that was introduced by Docker to handle the problem in a way that didn't involve [misusing current features].

### Enable Buildkit Builds

First, we need to [enable BuildKit builds].  We can do this in a number of different ways:

1. Setting the DOCKER_BUILDKIT environment variable.

        $ export DOCKER_BUILDKIT=1

1. Setting the environment variable when invoking the build command:

        $ DOCKER_BUILDKIT=1 docker build .

1. Enable by default (restart the daemon afterwards):

        $ cat << EOF >> /etc/docker/daemon.json
        { "features": { "buildkit": true } }
        EOF

### `--ssh` option

`Dockerfile`

<pre class="math">
FROM alpine

RUN apk add --no-cache openssh-client git
RUN mkdir -p -m 0600 ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts
RUN --mount=type=ssh git clone git@github.com:btoll/private-repo.git
</pre>

Note that only the `RUN` commands that have explicitly mounted as `type=ssh` have access to the forwarded agent.  The other `RUN` commands aren't aware of the SSH agent and are merrily going about their little lives in blissful ignorance.  This syntax will set up the `SSH_AUTH_SOCK` environment variable, which contains the location of the [Unix domain socket] that the agent uses in communication with other processes.

Let's now build the image with the `--ssh` option to allow for the SSH connectivity via the agent.  First, make sure that the SSH agent on the host has been started and the private key added to it via the `ssh-add` command (use `ssh-add -l` to list the fingerprints currently known to the agent):

```
$ eval $(ssh-agent) && ssh-add
Agent pid 2269
Enter passphrase for /home/kilgoretrout/.ssh/private.key:
Identity added: /home/kilgoretrout/.ssh/private.key (fizzbuzz@example.com)
$
$ DOCKER_BUILDKIT=1 docker build -t test --ssh default .
[+] Building 5.4s (9/9) FINISHED
 => [internal] load build definition from Dockerfile                                                                                                                   0.0s
 => => transferring dockerfile: 38B                                                                                                                                    0.0s
 => [internal] load .dockerignore                                                                                                                                      0.0s
 => => transferring context: 2B                                                                                                                                        0.0s
 => [internal] load metadata for docker.io/library/alpine:latest                                                                                                       0.7s
 => [auth] library/alpine:pull token for registry-1.docker.io                                                                                                          0.0s
 => [1/4] FROM docker.io/library/alpine@sha256:69e70a79f2d41ab5d637de98c1e0b055206ba40a8145e7bddb55ccc04e13cf8f                                                        0.5s
 => => resolve docker.io/library/alpine@sha256:69e70a79f2d41ab5d637de98c1e0b055206ba40a8145e7bddb55ccc04e13cf8f                                                        0.0s
 => => sha256:69e70a79f2d41ab5d637de98c1e0b055206ba40a8145e7bddb55ccc04e13cf8f 1.64kB / 1.64kB                                                                         0.0s
 => => sha256:def822f9851ca422481ec6fee59a9966f12b351c62ccb9aca841526ffaa9f748 528B / 528B                                                                             0.0s
 => => sha256:6dbb9cc54074106d46d4ccb330f2a40a682d49dda5f4844962b7dce9fe44aaec 1.47kB / 1.47kB                                                                         0.0s
 => => sha256:540db60ca9383eac9e418f78490994d0af424aab7bf6d0e47ac8ed4e2e9bcbba 2.81MB / 2.81MB                                                                         0.3s
 => => extracting sha256:540db60ca9383eac9e418f78490994d0af424aab7bf6d0e47ac8ed4e2e9bcbba                                                                              0.1s
 => [2/4] RUN apk add --no-cache openssh-client git                                                                                                                    2.2s
 => [3/4] RUN mkdir -p -m 0600 ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts                                                                                  0.6s
 => [4/4] RUN --mount=type=ssh git clone git@github.com:btoll/private-repo.git                                                                                              1.0s
 => exporting to image                                                                                                                                                 0.2s
 => => exporting layers                                                                                                                                                0.1s
 => => writing image sha256:2514edbea523e05e44965e809d7cd23deb06a62e367f7f2fc0896a75854b986b                                                                           0.0s
 => => naming to docker.io/library/test                                                                                                                                0.0s
```

> In the example above, `--ssh default` denotes the default identity whose SSH key that must be represented in the SSH Agent.

The `--ssh` option allows the Docker Engine to [forward the SSH agent] connection into the container, obviating the need to physically copy the private key into the container.

```
$ docker history test
IMAGE          CREATED          CREATED BY                                      SIZE      COMMENT
2514edbea523   17 seconds ago   RUN /bin/sh -c git clone git@github.com:btol…   98kB      buildkit.dockerfile.v0
<missing>      18 seconds ago   RUN /bin/sh -c mkdir -p -m 0600 ~/.ssh && ss…   392B      buildkit.dockerfile.v0
<missing>      19 seconds ago   RUN /bin/sh -c apk add --no-cache openssh-cl…   17.8MB    buildkit.dockerfile.v0
<missing>      12 days ago      /bin/sh -c #(nop)  CMD ["/bin/sh"]              0B
<missing>      12 days ago      /bin/sh -c #(nop) ADD file:8ec69d882e7f29f06…   5.61MB
```

And we can see that there's only one layer.  Nice!  But, did it work?

```
$ docker run --rm -it test stat private-repo
  File: private-repo
  Size: 4096            Blocks: 8          IO Block: 4096   directory
Device: 92h/146d        Inode: 1721696     Links: 6
Access: (0755/drwxr-xr-x)  Uid: (    0/    root)   Gid: (    0/    root)
Access: 2021-04-26 23:42:53.564363995 +0000
Modify: 2021-04-26 23:42:53.484363958 +0000
Change: 2021-04-26 23:42:53.484363958 +0000
```

It did, the private repository has been cloned and is in the filesystem!  Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee!

```
$ docker images test
REPOSITORY   TAG       IMAGE ID       CREATED              SIZE
test         latest    2514edbea523   About a minute ago   23.6MB
```

The images built from the two example Dockerfiles are the same size, but the second build is significantly better as it's simpler, has only one layer and doesn't leak any secrets.

The second example involves other types of secrets, such as files that contain login credentials and certificates.

### `--secret` option

For the sake of time, I'll use the same example [from the documentation] to demonstrate the use of the `--secret` option:

<pre class="math">
FROM alpine

# shows secret from default secret location:
RUN --mount=type=secret,id=mysecret cat /run/secrets/mysecret

# shows secret from custom secret location:
RUN --mount=type=secret,id=mysecret,dst=/foobar cat /foobar
</pre>

Create the secret and build the image (using plain output, i.e., `--progress=plain`):

```
$ echo THIS IS A SECRET > mysecret.txt
$
$ DOCKER_BUILDKIT=1 docker build --no-cache --progress=plain \
> --secret id=mysecret,src=mysecret.txt -t test .
#1 [internal] load build definition from Dockerfile
#1 sha256:895647c2c2e6286090f8b8411dc99b15df757351e21731b4c96a6aa575bf8cd5
#1 transferring dockerfile: 38B done
#1 DONE 0.0s

#2 [internal] load .dockerignore
#2 sha256:498c517faae89eb09690f26283477e3b892bc5e39f62bddd50f32b74b088f837
#2 transferring context: 2B done
#2 DONE 0.0s

#3 [internal] load metadata for docker.io/library/alpine:latest
#3 sha256:d4fb25f5b5c00defc20ce26f2efc4e288de8834ed5aa59dff877b495ba88fda6
#3 DONE 0.0s

#4 [1/3] FROM docker.io/library/alpine
#4 sha256:665ba8b2cdc0cb0200e2a42a6b3c0f8f684089f4cd1b81494fbb9805879120f7
#4 CACHED

#5 [2/3] RUN --mount=type=secret,id=mysecret cat /run/secrets/mysecret
#5 sha256:75601a522ebe80ada66dedd9dd86772ca932d30d7e1b11bba94c04aa55c237de
#5 0.336 THIS IS A SECRET
#5 DONE 0.4s

#6 [3/3] RUN --mount=type=secret,id=mysecret,dst=/foobar cat /foobar
#6 sha256:a1db940558822fcffbe7da0dc8b9f590a2870c01ea3a701051b7ce68412dc694
#6 0.455 THIS IS A SECRET
#6 DONE 0.5s

#7 exporting to image
#7 sha256:e8c613e07b0b7ff33893b694f7759a10d42e180f2b4dc349fb57dc6b71dcab00
#7 exporting layers 0.0s done
#7 writing image sha256:3d824dc7264543299f2a4aa4ec7feb1bdeb244b6fcac052c20021a6d730e72ef done
#7 naming to docker.io/library/test done
#7 DONE 0.0s
```

We can see from the output that the secret is indeed accessible by each layer created by `RUN`.  Now, let's see if the secret is in the final image:

```
$ docker history test
IMAGE          CREATED         CREATED BY                                      SIZE      COMMENT
ff6efbcda070   5 minutes ago   RUN /bin/sh -c cat /foobar # buildkit           0B        buildkit.dockerfile.v0
<missing>      5 minutes ago   RUN /bin/sh -c cat /run/secrets/mysecret # b…   0B        buildkit.dockerfile.v0
<missing>      12 days ago     /bin/sh -c #(nop)  CMD ["/bin/sh"]              0B
<missing>      12 days ago     /bin/sh -c #(nop) ADD file:8ec69d882e7f29f06…   5.61MB
$
$ docker run --rm -it ff6 stat /run/secrets/mysecret
stat: can't stat '/run/secrets/mysecret': No such file or directory
$
$ docker run --rm -it ff6 stat /foobar
stat: can't stat '/foobar': No such file or directory
```

> If you're not seeing your secret, ensure that the `--no-cache` flag is part of your `docker build` command.

Nope, it's not there!  [Kool Moe Dee].

Of course, we suspected as much because the `/run` directory is a [`tmpfs`] filesystem:

```
$ df /run
Filesystem     1K-blocks  Used Available Use% Mounted on
tmpfs            1614340  1800   1612540   1% /run
```

Fun fact: in those distributions adhering to the [Filesystem Hierarchy Standard], the `/var/run` directory is a symbolic link to the `/run` directory.

> [In the official docs], the examples all have (as of this writing, at least) a BuildKit frontend [parser directive] hardcoded at the top of the Dockerfile:
>
>       # syntax=docker/dockerfile:1
>
> I found that I didn't need to use it.  Here is my Docker version:
>
>       $ docker -v
>       Docker version 20.10.6, build 370c289

\* And by hacks, I mean something clever.

# Conclusion

The end.

# References

- [ssh(1)](https://www.man7.org/linux/man-pages/man1/ssh.1.html)

[Docker Engine]: https://docs.docker.com/engine/
[BuildKit]: https://docs.docker.com/develop/develop-images/build_enhancements/
[`--ssh`]: https://docs.docker.com/develop/develop-images/build_enhancements/#using-ssh-to-access-private-data-in-builds
[`--secret`]: https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information
[from the documentation]: https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information
[parser directive]: https://docs.docker.com/engine/reference/builder/#parser-directives
[discussions]: https://github.com/moby/moby/issues/13490
[hacks]: https://pythonspeed.com/articles/docker-build-secrets/
[this SO answer]: https://stackoverflow.com/questions/35310212/docker-missing-layer-ids-in-output#35312577
[Ruh roh!]: https://www.youtube.com/watch?v=R3SaxRRfJ4E
[Rickety Cricket!]: https://www.youtube.com/watch?v=qBAcmJdAKV8
[misusing current features]: https://github.com/moby/moby/issues/13490#issue-81134963
[enable BuildKit builds]: https://docs.docker.com/develop/develop-images/build_enhancements/#to-enable-buildkit-builds
[`tmpfs`]: https://en.wikipedia.org/wiki/Tmpfs
[Filesystem Hierarchy Standard]: https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard
[In the official docs]: https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information
[Unix domain socket]: https://en.wikipedia.org/wiki/Unix_domain_socket
[forward the SSH agent]: https://www.ssh.com/academy/ssh/agent
[Kool Moe Dee]: https://en.wikipedia.org/wiki/Kool_Moe_Dee
[if this isn't nice, I don't know what is]: https://bookriot.com/kurt-vonnegut-quotes/

