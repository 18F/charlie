#!/bin/sh

export PORT=$VCAP_APP_PORT
export BIND_ADDRESS=$VCAP_APP_HOST
export PATH=./node_modules/.bin:$PATH
./node_modules/.bin/hubot --adapter slack --name charlie
