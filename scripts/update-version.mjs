#!/usr/bin/env node

/**
 * Automatic version updater for Azure DevOps extensions
 * 
 * This script automatically updates the version in all extension manifests
 * using a global version counter to guarantee unique, incrementing versions.
 * 
 * Versioning strategy:
 * - MAJOR.MINOR.PATCH format (semantic versioning)
 * - MAJOR.MINOR from manifest files (manually controlled)
 * - PATCH uses a global counter that increments for each deployment
 * 
 * Global counter approach:
 * - Uses a .version-counter file to track the last used version number
 * - Counter increments for each build affecting any extension
 * - Only affected extensions get the new counter value
 * - Guarantees unique versions across all extensions
 * - Never decreases, preventing version downgrades
 * 
 * Change detection:
 * - Detects which extensions have changes since last version update
 * - Only affected extensions get version bumps
 * - Uses git history and stored metadata for tracking
 * 
 * Version floor protection:
 * - Ensures versions never decrease (max of counter, current, marketplace)
 * - Marketplace versions always respected when PUBLISHER_ID is set
 * - Handles transitions from old versioning strategies gracefully
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Path to the global version counter file
const VERSION_COUNTER_FILE = join(rootDir, '.version-counter');

// Maximum fallback version for timestamp-based versioning when git is unavailable
// Limits to 4 digits (0-9999) to keep version numbers reasonable
const MAX_FALLBACK_VERSION = 10000;

/**
 * Read the global version counter
 * @returns {number} Current counter value
 */
function readVersionCounter() {
  try {
    if (existsSync(VERSION_COUNTER_FILE)) {
      const content = readFileSync(VERSION_COUNTER_FILE, 'utf8').trim();
      const counter = parseInt(content, 10);
      if (!isNaN(counter) && counter > 0) {
        return counter;
      }
    }
  } catch (error) {
    console.error(`Warning: Could not read version counter:`, error.message);
  }
  
  // Default to 1 if file doesn't exist or is invalid
  return 1;
}

/**
 * Write the global version counter
 * @param {number} counter - New counter value
 */
function writeVersionCounter(counter) {
  try {
    writeFileSync(VERSION_COUNTER_FILE, `${counter}\n`, 'utf8');
  } catch (error) {
    console.error(`Warning: Could not write version counter:`, error.message);
  }
}

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
  
  // Replace known entities; unrecognized entities are left as-is (safe fallback)
  // Pattern matches both named (&amp;) and numeric (&#39;, &#x2F;) entities
  return text.replace(/&(?:amp|lt|gt|quot|apos|#39|#x2F|#x27);/g, (entity) => entities[entity] || entity);
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

/**
 * Get the current HEAD commit hash
 * @returns {string|null} Current commit hash or null if unavailable
 */
function getCurrentCommit() {
  try {
    const hash = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: rootDir,
      encoding: 'utf8'
    }).trim();
    return hash;
  } catch (error) {
    console.error(`Warning: Could not get current commit:`, error.message);
    return null;
  }
}

/**
 * Check if an extension has changes since its last version update
 * @param {string[]} extensionPaths - Paths to check for changes
 * @param {string|null} lastCommit - Last commit hash when version was updated
 * @returns {boolean} True if extension has changes
 */
function hasExtensionChanges(extensionPaths, lastCommit) {
  if (!lastCommit) {
    // No last commit recorded, assume changes exist
    return true;
  }
  
  try {
    // Check if there are any commits affecting these paths since lastCommit
    const args = ['log', `${lastCommit}..HEAD`, '--oneline', '--', ...extensionPaths];
    const output = execFileSync('git', args, { 
      cwd: rootDir,
      encoding: 'utf8' 
    }).trim();
    
    return output.length > 0; // If output exists, there are changes
  } catch (error) {
    console.error(`Warning: Could not check for changes:`, error.message);
    // On error, assume changes exist to be safe
    return true;
  }
}

function updateManifestVersion(manifestPath, versionCounter, publisherId = null, forceUpdate = false) {
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
  
  // Check if this extension has changes since last version
  const lastCommit = manifest.metadata?.lastVersionCommit || null;
  const hasChanges = forceUpdate || hasExtensionChanges(extensionPaths, lastCommit);
  
  console.log(`\nProcessing ${manifestPath}`);
  console.log(`  Extension ID: ${manifest.id}`);
  console.log(`  Current version: ${currentVersion}`);
  console.log(`  Last version commit: ${lastCommit ? lastCommit.substring(0, 8) : 'N/A'}`);
  console.log(`  Has changes: ${hasChanges ? 'Yes' : 'No'}`);
  
  // If no changes, keep current version
  if (!hasChanges) {
    console.log(`  ⏭️  Skipping: No changes detected since last version update`);
    return {
      extensionId: manifest.id,
      oldVersion: currentVersion,
      newVersion: currentVersion,
      updated: false
    };
  }
  
  // Calculate new patch version using global counter
  let patch = Math.max(versionCounter, currentPatch + 1);
  
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
  
  console.log(`  New version: ${newVersion}`);
  console.log(`  - Major: ${major} (from manifest)`);
  console.log(`  - Minor: ${minor} (from manifest)`);
  console.log(`  - Patch: ${patch} (counter: ${versionCounter}, current: ${currentPatch}, marketplace: ${marketplaceVersion ? parseVersion(marketplaceVersion).patch : 'N/A'})`);
  console.log(`  Extension paths tracked:`);
  for (const path of extensionPaths) {
    console.log(`    - ${path}`);
  }
  
  // Update manifest with new version
  manifest.version = newVersion;
  
  // Store metadata for change tracking
  if (!manifest.metadata) {
    manifest.metadata = {};
  }
  const currentCommit = getCurrentCommit();
  if (currentCommit) {
    manifest.metadata.lastVersionCommit = currentCommit;
    manifest.metadata.lastVersionUpdate = new Date().toISOString();
  }
  
  // Write back to file with nice formatting
  writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );
  
  console.log(`  ✓ Version updated successfully`);
  
  return {
    extensionId: manifest.id,
    oldVersion: currentVersion,
    newVersion: newVersion,
    updated: true
  };
}

function updateAllVersions() {
  // Get publisher ID from environment if available
  const publisherId = process.env.PUBLISHER_ID || null;
  const forceUpdate = process.env.FORCE_VERSION_UPDATE === 'true';
  
  console.log('='.repeat(70));
  console.log('Azure DevOps Extensions - Automatic Versioning');
  console.log('='.repeat(70));
  console.log('');
  
  if (publisherId) {
    console.log(`Publisher ID: ${publisherId} (marketplace version checks enabled)`);
  } else {
    console.log(`Publisher ID: Not set (skipping marketplace version checks)`);
  }
  
  if (forceUpdate) {
    console.log(`Force update: Enabled (all extensions will be updated)`);
  }
  console.log('');
  
  // Get current version counter
  let versionCounter = readVersionCounter();
  console.log(`Starting version counter: ${versionCounter}`);
  
  // Find all azure-devops-extension-*.json files
  const files = readdirSync(rootDir);
  const manifestFiles = files.filter(file => 
    file.startsWith('azure-devops-extension-') && file.endsWith('.json')
  );
  
  if (manifestFiles.length === 0) {
    throw new Error('No extension manifest files found (azure-devops-extension-*.json)');
  }
  
  console.log(`Found ${manifestFiles.length} extension manifest(s) to check:`);
  manifestFiles.forEach(file => console.log(`  - ${file}`));
  console.log('');
  
  const results = [];
  
  // Process each manifest
  for (const file of manifestFiles) {
    const manifestPath = join(rootDir, file);
    try {
      const result = updateManifestVersion(manifestPath, versionCounter, publisherId, forceUpdate);
      results.push(result);
      
      // If extension was updated, increment counter for next extension
      if (result.updated) {
        versionCounter++;
        writeVersionCounter(versionCounter);
      }
    } catch (error) {
      console.error(`Error updating ${file}:`, error.message);
      throw error;
    }
  }
  
  // Summary
  console.log('');
  console.log('='.repeat(70));
  console.log('Summary');
  console.log('='.repeat(70));
  
  const updated = results.filter(r => r.updated);
  const skipped = results.filter(r => !r.updated);
  
  if (updated.length > 0) {
    console.log(`\n✅ Updated extensions (${updated.length}):`);
    updated.forEach(r => {
      console.log(`  - ${r.extensionId}: ${r.oldVersion} → ${r.newVersion}`);
    });
  }
  
  if (skipped.length > 0) {
    console.log(`\n⏭️  Skipped extensions (${skipped.length}):`);
    skipped.forEach(r => {
      console.log(`  - ${r.extensionId}: ${r.oldVersion} (no changes detected)`);
    });
  }
  
  if (updated.length === 0) {
    console.log('\n⏭️  No extensions updated (no changes detected)');
  } else {
    console.log(`\n✓ Successfully updated ${updated.length} extension(s)`);
    console.log(`Final version counter: ${versionCounter}`);
  }
  
  return results;
}

// Run the update
try {
  updateAllVersions();
  process.exit(0);
} catch (error) {
  console.error('\nError updating versions:', error.message);
  process.exit(1);
}
