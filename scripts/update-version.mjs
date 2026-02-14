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
 * 
 * Version floor protection:
 * - The patch version uses MAX(git-commit-count, current-patch-version)
 * - This prevents version downgrades when switching versioning strategies
 * - Ensures versions are always monotonically increasing for marketplace compliance
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
 * Decode HTML entities in a string
 * @param {string} text - Text with HTML entities
 * @returns {string} Decoded text
 */
function decodeHtmlEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x2F;': '/',
    '&#x27;': "'"
  };
  
  return text.replace(/&(?:amp|lt|gt|quot|#39|apos|#x2F|#x27);/g, (entity) => entities[entity] || entity);
}

/**
 * Extract the source directory paths from a manifest's files array
 * @param {object} manifest - The parsed manifest object
 * @returns {string[]} Array of source directory paths to track for versioning
 */
function getExtensionPaths(manifest) {
  const paths = new Set();
  
  // Extract paths from the files array
  if (manifest.files && Array.isArray(manifest.files)) {
    for (const file of manifest.files) {
      if (file.path && typeof file.path === 'string') {
        // The manifest typically references dist directories (e.g., 'apps/notification-hub/dist')
        // These dist directories are build artifacts and not tracked in git (in .gitignore)
        // For versioning, we need to track the source directory instead since that's what's committed
        // Extract the app directory path (e.g., 'apps/notification-hub/dist' -> 'apps/notification-hub/')
        const pathParts = file.path.split('/');
        if (pathParts.length >= 2 && pathParts[0] === 'apps') {
          // Track the app directory (apps/notification-hub/)
          const appPath = `${pathParts[0]}/${pathParts[1]}/`;
          paths.add(appPath);
        } else {
          // For non-app paths, track them as-is (now deduplicated via Set)
          paths.add(file.path);
        }
      }
    }
  }
  
  return Array.from(paths);
}

/**
 * Get current published version from marketplace
 * @param {string} publisherId - The publisher ID
 * @param {string} extensionId - The extension ID
 * @returns {string|null} Current published version or null if not published
 */
function getMarketplaceVersion(publisherId, extensionId) {
  if (!publisherId || !extensionId) {
    return null; // Cannot query without required parameters
  }
  
  // Validate inputs to prevent command injection
  // Publisher ID and extension ID should be alphanumeric with hyphens/underscores only
  const validIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validIdPattern.test(publisherId) || !validIdPattern.test(extensionId)) {
    console.error(`Warning: Invalid publisher ID or extension ID format`);
    return null;
  }
  
  try {
    // Use execFileSync with array args to prevent shell injection
    const output = execFileSync(
      'tfx',
      [
        'extension',
        'show',
        '--publisher',
        publisherId,
        '--extension-id',
        extensionId,
        '--json'
      ],
      { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );
    
    // Decode HTML entities that may be present in the JSON output
    const decodedOutput = decodeHtmlEntities(output);
    
    const data = JSON.parse(decodedOutput);
    const version = data?.versions?.[0]?.version || null;
    return version;
  } catch (error) {
    // Extension not found or other error - this is expected for new extensions
    return null;
  }
}

/**
 * Parse a semantic version string into parts
 * @param {string} version - Version string (e.g., "1.0.5")
 * @returns {object} Object with major, minor, patch numbers
 */
function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

function updateManifestVersion(manifestPath, publisherId = null) {
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
  // Default to 0 if no patch version exists (e.g., "1.0" → patch = 0)
  // This ensures version floor protection works even for new extensions
  const currentPatch = versionParts.length >= 3 ? parseInt(versionParts[2], 10) : 0;
  
  if (isNaN(major) || isNaN(minor) || (versionParts.length >= 3 && isNaN(currentPatch))) {
    throw new Error(`Invalid version numbers in: ${currentVersion}. Major, minor, and patch (if present) must be integers.`);
  }
  
  // Get the paths associated with this extension
  const extensionPaths = getExtensionPaths(manifest);
  
  // Always include the manifest file itself so manifest-only changes bump the PATCH version
  let manifestRepoPath = manifestPath;
  if (manifestRepoPath.startsWith(rootDir + '/') || manifestRepoPath.startsWith(rootDir + '\\')) {
    manifestRepoPath = manifestRepoPath.slice(rootDir.length + 1);
  }
  if (manifestRepoPath && !extensionPaths.includes(manifestRepoPath)) {
    extensionPaths.push(manifestRepoPath);
  }
  
  if (extensionPaths.length === 0) {
    throw new Error(`No file paths found in manifest ${manifestPath}. Cannot determine extension directory.`);
  }
  
  // Calculate commit count based on changes to extension-specific paths
  // Use a single git command with all paths (union) to ensure any change to any path increments the version
  // This ensures monotonic version increments when any tracked path changes
  let commitCount = 0;
  try {
    const args = ['rev-list', '--count', 'HEAD', '--', ...extensionPaths];
    const count = execFileSync('git', args, { 
      cwd: rootDir,
      encoding: 'utf8' 
    }).trim();
    commitCount = parseInt(count, 10);
  } catch (error) {
    console.error(`Warning: Could not get git commit count for paths:`, error.message);
    // Fallback to timestamp-based versioning if git is not available
    commitCount = Math.floor(Date.now() / 1000) % MAX_FALLBACK_VERSION;
  }
  
  // Prevent version downgrades by ensuring patch version never decreases
  // This is critical when switching versioning strategies or when the manifest
  // already contains a higher version (e.g., from previous full-repo commit counting)
  let patch = Math.max(commitCount, currentPatch);
  
  // Also check marketplace version to ensure we're always higher
  const extensionId = manifest.id;
  const marketplaceVersion = getMarketplaceVersion(publisherId, extensionId);
  
  if (marketplaceVersion) {
    const marketplaceParsed = parseVersion(marketplaceVersion);
    console.log(`  Marketplace version: ${marketplaceVersion} (patch: ${marketplaceParsed.patch})`);
    
    // Ensure our version is higher than marketplace
    // If major.minor matches, patch must be higher
    if (major === marketplaceParsed.major && minor === marketplaceParsed.minor) {
      if (patch <= marketplaceParsed.patch) {
        patch = marketplaceParsed.patch + 1;
        console.log(`  ⚠️  Bumping patch to ${patch} to exceed marketplace version`);
      }
    }
    // If major.minor is different, version comparison is more complex
    // but we trust the major.minor from manifest (manually controlled)
  } else {
    console.log(`  Marketplace version: Not published yet (new extension)`);
  }
  
  // Generate new version
  const newVersion = `${major}.${minor}.${patch}`;
  
  console.log(`\nUpdating ${manifestPath}`);
  console.log(`  Version: ${currentVersion} → ${newVersion}`);
  console.log(`  - Major: ${major} (from manifest)`);
  console.log(`  - Minor: ${minor} (from manifest)`);
  console.log(`  - Patch: ${patch} (commits: ${commitCount}, current: ${currentPatch}, using max)`);
  console.log(`  Extension paths tracked:`);
  for (const path of extensionPaths) {
    console.log(`    - ${path}`);
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
  // Get publisher ID from environment if available
  const publisherId = process.env.PUBLISHER_ID || null;
  
  if (publisherId) {
    console.log(`Using publisher ID: ${publisherId} for marketplace version checks`);
  } else {
    console.log(`No PUBLISHER_ID set - skipping marketplace version checks`);
  }
  console.log('');
  
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
      const newVersion = updateManifestVersion(manifestPath, publisherId);
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
