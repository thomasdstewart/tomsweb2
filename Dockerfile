FROM docker.io/alpine:latest

RUN apk add --no-cache aws-cli curl go git openssh \
    && mkdir -p  ~/.aws ~/.ssh \
    && ssh-keyscan github.com >> ~/.ssh/known_hosts \
    && v=$(curl https://raw.githubusercontent.com/nunocoracao/blowfish/refs/heads/main/config.toml | awk '/max/{print $3}' | xargs) \
    && curl -L https://github.com/gohugoio/hugo/releases/download/v${v}/hugo_${v}_linux-amd64.tar.gz | tar xvzf - --directory /usr/local/bin hugo \
    && git clone https://gitlab.com/thomasdstewart/tomsweb2.git ~/tomsweb2

CMD [ "/bin/sh" ]
