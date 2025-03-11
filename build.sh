#!/usr/bin/env bash

set -e

version=$(node -e "console.log(require('./package.json').version)")

echo "Building version $version"

echo "// THIS FILE IS GENERATED" >src/version.ts
echo "export default \"$version\";" >>src/version.ts
git add src/version.ts

# Build CommonJS version
tsc

# Build ESM version
tsc -p tsconfig.esm.json

# Fix ESM imports to include .js extension for better browser/Node.js ESM compatibility
if [ -f "dist/esm/index.js" ]; then
  # Check if we're on macOS (Darwin) or Linux/other
  if [[ "$(uname)" == "Darwin" ]]; then
    # macOS version of sed requires an empty string after -i
    sed -i '' 's/from "\.\//from "\.\//g; s/from "\.\/\([^\.]*\)"/from "\.\/\1\.js"/g' dist/esm/index.js
    sed -i '' 's/from "\.\//from "\.\//g; s/from "\.\/\([^\.]*\)"/from "\.\/\1\.js"/g' dist/esm/*.js
  else
    # Linux version of sed doesn't need the empty string
    sed -i 's/from "\.\//from "\.\//g; s/from "\.\/\([^\.]*\)"/from "\.\/\1\.js"/g' dist/esm/index.js
    sed -i 's/from "\.\//from "\.\//g; s/from "\.\/\([^\.]*\)"/from "\.\/\1\.js"/g' dist/esm/*.js
  fi
fi
