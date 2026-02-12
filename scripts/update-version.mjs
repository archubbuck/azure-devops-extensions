#!/usr/bin/env node

/**
 * Automatic version updater for Azure DevOps extension
 * 
 * This script automatically updates the version in azure-devops-extension.json
 * based on git history to prevent version conflicts during publishing.
 * 
 * Versioning strategy:
 * - MAJOR.MINOR.PATCH format (semantic versioning)
 * - MAJOR.MINOR from azure-devops-extension.json (manually controlled)
 * - PATCH auto-incremented based on commit count since last tag or initial commit
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Maximum fallback version for timestamp-based versioning when git is unavailable
// Limits to 4 digits (0-9999) to keep version numbers reasonable
const MAX_FALLBACK_VERSION = 10000;

function getGitCommitCount() {
  try {
    // Get commit count from the beginning of the repository
    const count = execSync('git rev-list --count HEAD', { 
      cwd: rootDir,
      encoding: 'utf8' 
    }).trim();
    return parseInt(count, 10);
  } catch (error) {
    console.error('Warning: Could not get git commit count:', error.message);
    // Fallback to timestamp-based versioning if git is not available
    // Use modulo to keep version number reasonable (0-9999)
    return Math.floor(Date.now() / 1000) % MAX_FALLBACK_VERSION;
  }
}

function updateVersion() {
  const manifestPath = join(rootDir, 'azure-devops-extension.json');
  
  // Read the current manifest
  const manifestContent = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);
  
  // Parse current version
  const currentVersion = manifest.version;
  if (!currentVersion || typeof currentVersion !== 'string') {
    throw new Error('Invalid or missing version in azure-devops-extension.json');
  }
  
  const versionParts = currentVersion.split('.');
  if (versionParts.length < 2) {
    throw new Error(`Invalid version format: ${currentVersion}. Expected MAJOR.MINOR.PATCH format.`);
  }
  
  const major = parseInt(versionParts[0], 10);
  const minor = parseInt(versionParts[1], 10);
  
  if (isNaN(major) || isNaN(minor)) {
    throw new Error(`Invalid version numbers in: ${currentVersion}. Major and minor must be integers.`);
  }
  
  // Calculate new patch version based on git commit count
  const commitCount = getGitCommitCount();
  const patch = commitCount;
  
  // Generate new version
  const newVersion = `${major}.${minor}.${patch}`;
  
  console.log(`Updating version from ${currentVersion} to ${newVersion}`);
  console.log(`  - Major: ${major} (from manifest)`);
  console.log(`  - Minor: ${minor} (from manifest)`);
  console.log(`  - Patch: ${patch} (git commit count)`);
  
  // Update manifest with new version
  manifest.version = newVersion;
  
  // Write back to file with nice formatting
  writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );
  
  console.log(`✓ Version updated successfully in ${manifestPath}`);
  
  return newVersion;
}

// Run the update
try {
  updateVersion();
  process.exit(0);
} catch (error) {
  console.error('Error updating version:', error);
  process.exit(1);
}
