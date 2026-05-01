#!/usr/bin/env node
/**
 * Render (and other CI) sometimes inject NPM_TOKEN / NODE_AUTH_TOKEN. An empty
 * or stale value makes npm send Authorization to registry.npmjs.org and get E401
 * for public packages. This script unsets those and runs `npm ci` in backend/.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const backend = path.join(__dirname, '..', 'backend');
const env = { ...process.env };
delete env.NPM_TOKEN;
delete env.NODE_AUTH_TOKEN;
delete env.npm_config__auth;
delete env.NPM_CONFIG__AUTH;
env.NPM_CONFIG_REGISTRY = 'https://registry.npmjs.org/';
env.NPM_CONFIG_ALWAYS_AUTH = 'false';

const r = spawnSync('npm', ['ci', '--no-audit', '--no-fund'], {
  cwd: backend,
  env,
  stdio: 'inherit',
  shell: false,
});
process.exit(r.status !== null && r.status !== undefined ? r.status : 1);
