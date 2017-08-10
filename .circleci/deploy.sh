#!/usr/bin/env bash

# Fail if anything within this script returns
# a non-zero exit code
set -e

# CF environment
API="https://api.fr.cloud.gov"
ORG="gsa-hubot"
SPACE="prod"

# This directory is used to persist the CF credentials
mkdir -p $HOME/.cf

# This wonderful image pulls the `cf` tool along with the
# `autopilot` plugin
docker pull adelevie/cf-cli:latest

# For some reason, aliases aren't working here
# so we're using this function instead
cf_run() {
 docker run \
   --rm \
   -v $HOME/.cf:/root/.cf \
   -v $PWD:/app \
   adelevie/cf-cli \
   cf "$@"
}

# Log into CF and push
cf_run login -a $API -u $CF_USERNAME -p $CF_PASSWORD -o $ORG -s $SPACE
cf_run push -f manifest.yml
