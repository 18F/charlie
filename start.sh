#!/bin/sh

export PORT=$PORT
export BIND_ADDRESS=0.0.0.0
export PATH=./node_modules/.bin:$PATH
./node_modules/.bin/hubot --adapter slack --name charlie
