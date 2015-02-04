#!/bin/sh

export PORT=$VCAP_APP_PORT
export BIND_ADDRESS=$VCAP_APP_HOST
./node_modules/.bin/hubot --adapter slack --name charlie
