#!/bin/bash

set -e
for dir in ./agent ./server ./firehose-agent ; do
  pushd $dir
  godep go install
  popd
done
