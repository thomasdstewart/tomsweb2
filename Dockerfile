FROM docker.io/debian:trixie

RUN apt-get update \
    && apt-get -y --no-install-recommends install awscli ca-certificates curl git golang-go \
    && curl -vL https://github.com/gohugoio/hugo/releases/download/v0.154.1/hugo_extended_0.154.1_linux-amd64.tar.gz | tar --extract --verbose --gzip --file - --directory /usr/local/bin hugo \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

CMD [ "/usr/bin/bash" ]
