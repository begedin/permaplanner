# syntax = docker/dockerfile:1

ARG NODE_VERSION=26.13.1
ARG ELIXIR_IMAGE=hexpm/elixir:1.20.5-erlang-29.1.3-debian-trixie-20261123-slim

FROM node:${NODE_VERSION}-slim AS frontend

WORKDIR /app

COPY --link package-lock.json package.json ./
RUN npm ci --include=dev

COPY --link . .

RUN npm run build

FROM ${ELIXIR_IMAGE} AS build

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git && \
    mix local.hex --force && \
    mix local.rebar --force

ENV MIX_ENV=prod

COPY mix.exs mix.lock ./
RUN mix deps.get --only prod

COPY config ./config
COPY lib ./lib
COPY src/data/plantCatalog.json ./src/data/plantCatalog.json
COPY priv ./priv
COPY --from=frontend /app/dist ./priv/static

RUN mix release

FROM debian:trixie-slim AS final

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y libstdc++6 libatomic1 openssl libncurses6 libsctp1 ca-certificates && \
    apt-get clean && \
    rm -f /var/lib/apt/lists/*/*

ENV LANG=C.UTF-8
ENV MIX_ENV=prod
ENV PORT=8080

# Historical v8 migration runs its frozen polygon-clipping bundle without npm.
COPY --from=frontend /usr/local/bin/node /usr/local/bin/node
COPY --from=build /app/_build/prod/rel/permaplanner ./

RUN node --version && \
    chown -R nobody:root /app && \
    chmod -R ug+rwx /app

USER nobody

EXPOSE 8080

CMD ["bin/permaplanner", "start"]
