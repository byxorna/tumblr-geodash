#!/bin/bash

set -e
for dir in ./agent ./server ; do
  pushd $dir
  godep go build
  popd
done
