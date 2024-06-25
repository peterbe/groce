# https://github.com/casey/just
# https://just.systems/


dev:
    yarn emulate

dev-with-prod-data:
    PREACT_APP_USE_EMULATOR=false yarn dev

lint:
    yarn run lint
    cd functions && yarn run lint

install:
    yarn
    cd functions && yarn

build:
    yarn build

deploy: build
    firebase deploy

build-functions:
    cd functions && yarn build

deploy-functions: build-functions
    cd functions && yarn deploy
