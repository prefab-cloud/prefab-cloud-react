#!/usr/bin/env bash

set -e

echo "Building and publishing pre-release version..."

npm test

# Build package
npm run build

# Publish with pre tag
npm publish --tag pre

echo "Pre-release published successfully! To install it, use:"
echo "npm install @prefab-cloud/prefab-cloud-react@pre"
