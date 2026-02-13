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
 * Per-extension versioning:
 * - Each extension's version is based on commits that affect files in its directory
 * - Directories are determined from the manifest's "files" array
 * - Only changes to extension-specific files increment that extension's version
 * - This prevents unnecessary version bumps when other extensions are modified
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Maximum fallback version for timestamp-based versioning when git is unavailable
// Limits to 4 digits (0-9999) to keep version numbers reasonable
const MAX_FALLBACK_VERSION = 10000;

/**
 * Get the commit count for a specific path in the repository
 * @param {string} path - The path to count commits for (e.g., 'apps/notification-hub/')
 * @returns {number} The number of commits affecting the path
 */
function getGitCommitCountForPath(path) {
  try {
    // Get commit count for specific path from the beginning of the repository
    const count = execSync(`git rev-list --count HEAD -- ${path}`, { 
      cwd: rootDir,
      encoding: 'utf8' 
    }).trim();
    return parseInt(count, 10);
  } catch (error) {
    console.error(`Warning: Could not get git commit count for path ${path}:`, error.message);
    // Fallback to timestamp-based versioning if git is not available
    // Use modulo to keep version number reasonable (0-9999)
    return Math.floor(Date.now() / 1000) % MAX_FALLBACK_VERSION;
  }
}

/**
 * Extract the source directory paths from a manifest's files array
 * @param {object} manifest - The parsed manifest object
 * @returns {string[]} Array of source directory paths to track for versioning
 */
function getExtensionPaths(manifest) {
  const paths = [];
  
  // Extract paths from the files array
  if (manifest.files && Array.isArray(manifest.files)) {
    for (const file of manifest.files) {
      if (file.path && typeof file.path === 'string') {
        // The manifest typically references dist directories (e.g., 'apps/notification-hub/dist')
        // But git only tracks source files, so we need to track the parent directory instead
        // Extract the app directory path (e.g., 'apps/notification-hub/dist' -> 'apps/notification-hub/')
        const pathParts = file.path.split('/');
        if (pathParts.length >= 2 && pathParts[0] === 'apps') {
          // Track the app directory (apps/notification-hub/)
          const appPath = `${pathParts[0]}/${pathParts[1]}/`;
          if (!paths.includes(appPath)) {
            paths.push(appPath);
          }
        } else {
          // For non-app paths, track them as-is
          paths.push(file.path);
        }
      }
    }
  }
  
  return paths;
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
  
  // Get the paths associated with this extension
  const extensionPaths = getExtensionPaths(manifest);
  
  if (extensionPaths.length === 0) {
    throw new Error(`No file paths found in manifest ${manifestPath}. Cannot determine extension directory.`);
  }
  
  // Calculate commit count based on changes to extension-specific paths
  // Use the maximum commit count across all paths to ensure we capture all relevant changes
  let maxCommitCount = 0;
  const pathCommits = {};
  
  for (const path of extensionPaths) {
    const commitCount = getGitCommitCountForPath(path);
    pathCommits[path] = commitCount;
    maxCommitCount = Math.max(maxCommitCount, commitCount);
  }
  
  const patch = maxCommitCount;
  
  // Generate new version
  const newVersion = `${major}.${minor}.${patch}`;
  
  console.log(`\nUpdating ${manifestPath}`);
  console.log(`  Version: ${currentVersion} → ${newVersion}`);
  console.log(`  - Major: ${major} (from manifest)`);
  console.log(`  - Minor: ${minor} (from manifest)`);
  console.log(`  - Patch: ${patch} (commits affecting extension paths)`);
  console.log(`  Extension paths tracked:`);
  for (const [path, count] of Object.entries(pathCommits)) {
    console.log(`    - ${path}: ${count} commit(s)`);
  }
  
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
