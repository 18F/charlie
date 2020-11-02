#!/usr/bin/env bash

if [ "${CIRCLE_BRANCH}" == "main" ]
then
  # Fail if anything within this script returns
  # a non-zero exit code
  set -e

  # Install CF CLI
  curl -v -L -o cf-cli_amd64.deb 'https://cli.run.pivotal.io/stable?release=debian64&source=github'
  sudo dpkg -i cf-cli_amd64.deb
  rm cf-cli_amd64.deb

  # Log into CF and push
  cf login -a $CF_API -u $CF_USERNAME -p $CF_PASSWORD -o $CF_ORG -s $CF_SPACE
  cf push -f manifest.yml
else
  echo "Not on the main branch.  Not deploying."
fi
