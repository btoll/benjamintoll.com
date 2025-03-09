+++
title = "On Running A Local Image Registry"
date = "2024-09-01T13:57:42-04:00"

+++

Now that I've enticed you into clicking on this article, I've got some bad news for you: I will be using the dreaded Docker Engine* and its implementation of an image registry for this short post.

Sorry about that.

\* [UPDATE]: Of course, even though Docker is ubiquitous in the industry (largely because they got there first), that doesn't mean that we need to play their cynical and diabolical game.  Added to this post is a new section on using the Podman utility to accomplish the same goal.

---

- [Setup](#setup)
- [Use Case](#use-case)
- [Using Podman](#using-podman)
- [References](#references)

---

I have been working on some projects for funzies, and I'm creating test images that I'll need to download (pull) from a container registry.  There are two scenarios I wanted to avoid:

- I didn't want to use the same container registry as my employer.  Accessing and storing credentials and mixing work-in-progress / half-baked ideas with other images doesn't appeal to anyone.
- I didn't want to push to Docker Hub but wanted more control over the environment.

This led me to wonder about how involved it would be to run a local (private) image registry for development.  Of course, I've thought this in passing before, but always just opted for the Docker Hub public registry option like a good little lemming.

Well, it turns out that hosting a local, private image registry is extremely easy to set up (or, stand up, if I were a cool guy).

There is a open-source project called [Distribution], and this is an implementation of the [OCI distribution specification] for standardizing the distribution of content.

## Setup

Create a private Docker registry (using the latest stable version at the time of writing):

```bash
$ docker run --rm -d -p 5000:5000 --name registry registry:2.8.3
```

> Tag images with the prefix `localhost:5000/` to associate them with the local private registry.

Rename the image so it is push to the correct registry:

```bash
$ docker image tag ansible-playbook:latest localhost:5000/ansible-playbook:latest
```

Push an image to the private registry:

```bash
$ docker image push localhost:5000/ansible-playbook:latest
```

List the images available in the private registry:

```bash
$ curl http://localhost:5000/v2/_catalog
{"repositories":["ansible-playbook"]}
```

Pull the image:

```bash
$ docker pull localhost:5000/ansible-playbook:latest
```

Follow the logs:

```bash
$ docker logs -f registry
```

> `registry` is the name of the container.

Remove an image from the local registry:

```bash
$ docker image remove localhost:5000/ansible-playbook:latest
```

Stop the registry container and remove all the data from any anonymous volumes:

```bash
$ docker container stop registry
$ docker container rm --volumes registry
```

## Use Case

A common use case would be to integrate this into a CI/CD pipeline.  For instance, every push to the repository would kick off a build and push the build artifact (the image) to a publicly-accessible endpoint that would the use [`ssh` port forwarding] to send it to my local machine (note that usually it would be pushed to Docker Hub, ECR or some other popular registry).

For this demo, I'm using [Bitbucket Pipelines] and [`ngrok`] to set up the `ssh` port forwarding.

On a side note, I wouldn't use `ngrok` unless you don't have access to a public server which you can use to do the port forwarding.  There's no point in using `ngrok` and tools like it when you can just use the foundational technology on which it's built upon.

`Dockerfile`

```yaml
FROM python:3.12.5-slim-bookworm

ARG ANSIBLE_CORE_VERSION=2.16.3
ARG USER=noroot

RUN apt-get update && apt-get install -y \
    git \
    openssh-client

RUN groupadd --gid 1000 $USER \
    && useradd \
    --create-home \
    --home-dir /home/$USER \
    --uid 1000 \
    --gid 1000 \
    $USER

RUN mkdir -p /root/.ssh && \
    touch /root/.ssh/known_hosts && \
    ssh-keyscan -H bitbucket.org >> /root/.ssh/known_hosts

RUN --mount=type=ssh git clone git@bitbucket.org:kilgore-trout/ansible.git /home/$USER/ansible

USER $USER

ENV PATH="$PATH:/home/noroot/.local/bin"

RUN python -m pip install ansible-core==$ANSIBLE_CORE_VERSION argcomplete boto3 pywinrm && \
    ansible-galaxy collection install \
        ansible.windows \
        community.general \
        community.windows

WORKDIR /home/noroot/ansible

ENTRYPOINT ["ansible-playbook"]
```

Start `ngrok` on your local machine, get the dynamically-generated endpoint, and paste it into the Bitbucket pipeline below (after which you'll push to the repo).

`bitbucket-pipelines.yaml` in the root of the repository:

```yaml
image: atlassian/default-image:3

pipelines:
  default:
    - step:
        script:
          - export DOCKER_BUILDKIT=1
          - docker build --ssh default=$BITBUCKET_SSH_KEY_FILE -t 2d1c-47-14-77-147.ngrok-free.app/ansible-playbook .
          - docker image push 2d1c-47-14-77-147.ngrok-free.app/ansible-playbook
        services:
          - docker

```

> Again, note that the domain here was dynamically generated by `ngrok`.

You'll also have to create an `ssh` keypair and register it with your Bitbucket pipeline, the repository in which you're cloning, and, of course, with your Bitbucket account.  This is outside the scope of this idiotic demo.

After a `push` event, you'll see the Bitbucket pipeline begin the build, after which you should see `ngrok` generate some logs after its endpoint is hit and the subsequent forward to the local machine.  The image should then be ready for download:

```bash
$ docker pull localhost:5000/ansible-playbook:latest
```

## Using Podman

The good news is that you don't need to use crappy Docker.  Instead, we can use the superior [Podman] utility to pull and create a registry in the exact same way as we did with Docker:

```
$ podman run --rm -d -p 5000:5000 --name registry registry:2.8.3
```

> It's the same command except for `s/docker/podman`.

When attempting to push an image to the local registry, I got the following error:

```bash
$ podman image push localhost:5000/alpine:latest
Getting image source signatures
Error: trying to reuse blob sha256:63ca1fbb43ae5034640e5e6cb3e083e05c290072c5366fcaa9d62435a4cced85 at destination: pinging container registry localhost:5000: Get "https://localhost:5000/v2/": http: server gave HTTP response to HTTPS client
```

This is easily remedied by adding a bit of configuration:

`/etc/containers/registries.conf.d/myregistry.conf`

```ini
[[registry]]
location = "localhost:5000"
insecure = true
```

And now:

```bash
$ podman image push localhost:5000/alpine:latest
Getting image source signatures
Copying blob 63ca1fbb43ae done
Copying config 91ef0af61f done
Writing manifest to image destination
Storing signatures
$ curl http://localhost:5000/v2/_catalog
{"repositories":["alpine"]}
```

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

Also, do yourself a favor.  Uninstall Docker and add the following alias to `bash` or whatever shell you use:

```bash
alias docker="podman"
```

## References

- [How to Use Your Own Registry](https://www.docker.com/blog/how-to-use-your-own-registry-2/)
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec)
- [Distribution GitHub Repository](https://github.com/distribution/distribution)
- [Distribution Docker Hub Images](https://hub.docker.com/_/registry)
- [GitHub Packages: Working with the Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

[Distribution]: https://github.com/distribution/distribution
[Distribution Registry]: https://distribution.github.io/distribution/
[OCI distribution specification]: https://github.com/opencontainers/distribution-spec
[`ssh` port forwarding]: /2018/08/24/on-ssh-port-forwarding/
[Bitbucket Pipelines]: https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/
[`ngrok`]: https://ngrok.com/
[Podman]: https://podman.io/

<!--
```bash
$ DOCKER_BUILDKIT=1 docker build --ssh default=$SSH_AUTH_SOCK -t localhost:5000/ansible-playbook .
$ docker run --rm localhost:5000/ansible-playbook -i inventory/infratest1_verisource_useast1.yml playbooks/iis_fileserver_atlas/main.yml
$ docker run --rm localhost:5000/ansible-playbook -i inventory/infratest1_verisource_useast1.yml playbooks/scheduled_tasks/export_scheduled_tasks.yml
# https://support.atlassian.com/bitbucket-cloud/docs/run-docker-commands-in-bitbucket-pipelines/
# https://community.atlassian.com/t5/Bitbucket-questions/Using-docker-compose-build-ssh-with-BuildKit-when-mount-type-ssh/qaq-p/2343556
```
-->

