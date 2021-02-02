FROM alpine:3.13.1@sha256:3747d4eb5e7f0825d54c8e80452f1e245e24bd715972c919d189a62da97af2ae

LABEL description="Docker container for building and serving static sites with Hugo <https://gohugo.io/>."
LABEL maintainer="Benjamin Toll <benjam72@yahoo.com>"

ARG VERSION=0.80.0
RUN wget -O - https://github.com/gohugoio/hugo/releases/download/v${VERSION}/hugo_${VERSION}_Linux-64bit.tar.gz | tar -xz -C /tmp \
    && mkdir -p /usr/local/bin \
    && mv /tmp/hugo /usr/local/bin/hugo

WORKDIR /src
COPY hugo.sh .
EXPOSE 1313

CMD ["sh", "hugo.sh"]

