#!/usr/bin/env bash

# Fail if anything within this script returns
# a non-zero exit code
set -e

# CF environment
API="https://api.fr.cloud.gov"
ORG="gsa-18f-hubot"
SPACE="prod"

# Install CF CLI
curl -v -L -o cf-cli_amd64.deb 'https://cli.run.pivotal.io/stable?release=debian64&source=github'
sudo dpkg -i cf-cli_amd64.deb
rm cf-cli_amd64.deb

# Log into CF and push
cf login -a $API -u $CF_USERNAME -p $CF_PASSWORD -o $ORG -s $SPACE
cf push -f /app/manifest.yml
