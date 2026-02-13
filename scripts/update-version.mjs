#!/usr/bin/env node

/**
 * Automatic version updater for Azure DevOps extensions
 * 
 * This script automatically updates the version in all extension manifests
 * based on git history to prevent version conflicts during publishing.
 * 
 * Versioning strategy:
 * - MAJOR.MINOR.PATCH format (semantic versioning)
 * - MAJOR.MINOR from manifest files (manually controlled)
 * - PATCH auto-incremented based on per-extension git commit count
 * 
 * Each extension tracks commits to its specific directory (derived from manifest.files)
 * and its manifest file to ensure independent versioning.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Maximum fallback version for timestamp-based versioning when git is unavailable
// Limits to 4 digits (0-9999) to keep version numbers reasonable
const MAX_FALLBACK_VERSION = 10000;

/**
 * Get git commit count for specific paths
 * @param {string[]} paths - Array of paths to track
 * @returns {number} Number of commits affecting these paths
 */
function getGitCommitCount(paths) {
  try {
    // Build git command args to count commits for specific paths
    // Use union approach: count commits that touch ANY of the tracked paths
    const args = ['rev-list', '--count', 'HEAD', '--', ...paths];
    
    const count = execFileSync('git', args, { 
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

/**
 * Extract tracked paths from manifest file
 * Converts dist paths to source paths since dist is in .gitignore
 * @param {object} manifest - Parsed manifest object
 * @param {string} manifestPath - Path to manifest file
 * @returns {string[]} Array of paths to track for versioning
 */
function getTrackedPaths(manifest, manifestPath) {
  const trackedPaths = [];
  
  // Add the manifest file itself
  trackedPaths.push(manifestPath);
  
  // Extract extension directories from files array
  if (manifest.files && Array.isArray(manifest.files)) {
    for (const file of manifest.files) {
      if (file.path && file.addressable) {
        // Convert dist path to source path (dist is in .gitignore)
        // Example: apps/notification-hub/dist -> apps/notification-hub/
        const distPath = file.path;
        if (distPath.endsWith('/dist')) {
          const sourcePath = distPath.slice(0, -5) + '/'; // Remove '/dist', add trailing slash
          trackedPaths.push(sourcePath);
        } else {
          // If not a dist path, track it as-is
          trackedPaths.push(file.path);
        }
      }
    }
  }
  
  return trackedPaths;
}

function updateManifestVersion(manifestPath) {
  // Read the current manifest
  const manifestContent = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);
  
  // Parse current version
  const currentVersion = manifest.version;
  if (!currentVersion || typeof currentVersion !== 'string') {
    throw new Error(`Invalid or missing version in ${manifestPath}`);
  }
  
  const versionParts = currentVersion.split('.');
  if (versionParts.length < 2) {
    throw new Error(`Invalid version format: ${currentVersion}. Expected MAJOR.MINOR format (PATCH is generated automatically).`);
  }
  
  const major = parseInt(versionParts[0], 10);
  const minor = parseInt(versionParts[1], 10);
  
  if (isNaN(major) || isNaN(minor)) {
    throw new Error(`Invalid version numbers in: ${currentVersion}. Major and minor must be integers.`);
  }
  
  // Get tracked paths for this extension
  const trackedPaths = getTrackedPaths(manifest, manifestPath);
  
  // Calculate new patch version based on git commit count for this extension's paths
  const commitCount = getGitCommitCount(trackedPaths);
  const patch = commitCount;
  
  // Generate new version
  const newVersion = `${major}.${minor}.${patch}`;
  
  console.log(`\nUpdating ${manifestPath}`);
  console.log(`  Version: ${currentVersion} → ${newVersion}`);
  console.log(`  - Major: ${major} (from manifest)`);
  console.log(`  - Minor: ${minor} (from manifest)`);
  console.log(`  - Patch: ${patch} (git commit count for extension)`);
  console.log(`  - Tracked paths: ${trackedPaths.join(', ')}`);
  
  // Update manifest with new version
  manifest.version = newVersion;
  
  // Write back to file with nice formatting
  writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );
  
  console.log(`  ✓ Version updated successfully`);
  
  return newVersion;
}

function updateAllVersions() {
  // Find all azure-devops-extension-*.json files
  const files = readdirSync(rootDir);
  const manifestFiles = files.filter(file => 
    file.startsWith('azure-devops-extension-') && file.endsWith('.json')
  );
  
  if (manifestFiles.length === 0) {
    throw new Error('No extension manifest files found (azure-devops-extension-*.json)');
  }
  
  console.log(`Found ${manifestFiles.length} extension manifest(s) to update:`);
  manifestFiles.forEach(file => console.log(`  - ${file}`));
  
  const updatedVersions = {};
  
  for (const file of manifestFiles) {
    const manifestPath = join(rootDir, file);
    try {
      const newVersion = updateManifestVersion(manifestPath);
      updatedVersions[file] = newVersion;
    } catch (error) {
      console.error(`Error updating ${file}:`, error.message);
      throw error;
    }
  }
  
  console.log('\n✓ All extension versions updated successfully:');
  for (const [file, version] of Object.entries(updatedVersions)) {
    console.log(`  - ${file}: ${version}`);
  }
  
  return updatedVersions;
}

// Run the update
try {
  updateAllVersions();
  process.exit(0);
} catch (error) {
  console.error('\nError updating versions:', error.message);
  process.exit(1);
}
