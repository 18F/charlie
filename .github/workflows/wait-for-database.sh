#!/usr/bin/env bash

STATUS="$(cf service charlie-brain | grep "  status:" | awk -F ":" '{print $2}' | xargs)"
while [ "$STATUS"  != "create succeeded" ]
do
  echo "Waiting for database service to be ready..."
  sleep 10
  $STATUS=$(cf service charlie-brain | grep "  status:" | awk -F ":" '{print $2}' | xargs)
done
