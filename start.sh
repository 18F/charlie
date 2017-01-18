#!/bin/sh

redishost=$(echo $VCAP_SERVICES | ./node_modules/.bin/json "redis28[0].credentials.hostname")
redisport=$(echo $VCAP_SERVICES | ./node_modules/.bin/json "redis28[0].credentials.port")
redispass=$(echo $VCAP_SERVICES | ./node_modules/.bin/json "redis28[0].credentials.password")

# Redis doesn't use usernames, so it can be anything.
export REDIS_URL="redis://anyvalue:$redispass@$redishost:$redisport"

export PORT=$PORT
export BIND_ADDRESS=0.0.0.0
export PATH=./node_modules/.bin:$PATH

./node_modules/.bin/hubot --adapter slack --name charlie
