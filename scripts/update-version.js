#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Read package.json to get the version
const packageJsonPath = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;

// Generate the version.ts file
const versionFilePath = path.resolve(__dirname, "../src/version.ts");
const versionContent = `// THIS FILE IS GENERATED
export default "${version}";
`;

// Write the file
fs.writeFileSync(versionFilePath, versionContent);

console.log(`Updated version.ts to version ${version}`);
