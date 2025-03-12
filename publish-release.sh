#!/usr/bin/env bash

set -e

echo "Building and publishing standard release..."

# Run tests
npm test

# Build package
npm run build

# Bump version
# This will trigger the version script which will:
# - run release tasks
# - rebuild to update version.ts
# - stage the updated version.ts
# Then npm will commit and tag, and postversion will push
npm version patch

# Publish with latest tag
npm publish

echo "Release published successfully!"
