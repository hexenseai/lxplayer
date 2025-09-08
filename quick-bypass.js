#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Quick Authentication Bypass Enabled');
console.log('📝 Setting environment variables...');

// Set environment variables for bypass
process.env.BYPASS_AUTH = 'true';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

console.log('✅ BYPASS_AUTH=true');
console.log('✅ NEXT_PUBLIC_API_URL=http://localhost:8000');
console.log('');
console.log('🔓 Authentication bypass is now active!');
console.log('🌐 You can access all pages without login');
console.log('👤 Auto-login as superadmin will happen automatically');
console.log('');

// Start the development server
console.log('🚀 Starting development server...');
const child = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'apps/web'),
  stdio: 'inherit',
  env: { ...process.env }
});

child.on('error', (error) => {
  console.error('❌ Error starting server:', error);
});

child.on('close', (code) => {
  console.log(`\n👋 Server stopped with code ${code}`);
});




