#!/usr/bin/env node

// Entry point for Apache to execute Node.js application
// This file should be placed in the api directory on GoDaddy hosting

const path = require('path');
const fs = require('fs');

// Check if we're in the correct directory structure
const serverPath = path.join(__dirname, 'src', 'server.js');

if (fs.existsSync(serverPath)) {
  // Load and start the main server application
  require('./src/server.js');
} else {
  console.error('Server file not found at:', serverPath);
  console.error('Current directory:', __dirname);
  console.error('Available files:', fs.readdirSync(__dirname));
  process.exit(1);
}