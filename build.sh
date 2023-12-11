#!/usr/bin/env bash

set -e

version=$(node -e "console.log(require('./package.json').version)")

echo "Building version $version"

echo "// THIS FILE IS GENERATED" >src/version.ts
echo "export default \"$version\";" >>src/version.ts

tsc
