#!/usr/bin/env node

/**
 * Marketplace version checker for Azure DevOps extensions
 * 
 * This script checks the current published version of extensions in the marketplace
 * and compares with local versions to determine if publishing is needed.
 * 
 * Features:
 * - Queries Azure DevOps Marketplace for current published versions
 * - Compares with local manifest versions
 * - Returns exit code 0 if publish is needed, exit code 1 if not
 * - Outputs detailed version information for CI/CD decision-making
 */

import { readFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Get current published version from marketplace using tfx CLI
 * @param {string} publisherId - The publisher ID
 * @param {string} extensionId - The extension ID
 * @returns {string|null} Current published version or null if not published
 */
function getMarketplaceVersion(publisherId, extensionId) {
  // Validate inputs to prevent command injection
  // Publisher ID and extension ID should be alphanumeric with hyphens/underscores only
  const validIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validIdPattern.test(publisherId) || !validIdPattern.test(extensionId)) {
    console.error(`Error: Invalid publisher ID or extension ID format`);
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
    
    const data = JSON.parse(output);
    return data?.versions?.[0]?.version || null;
  } catch (error) {
    // Extension not found or other error
    if (error.stderr?.includes('not found') || error.stderr?.includes('does not exist')) {
      return null; // Extension not yet published
    }
    console.error(`Warning: Could not query marketplace for ${publisherId}.${extensionId}:`, error.message);
    return null;
  }
}

/**
 * Compare two semantic versions
 * @param {string} version1 - First version (e.g., "1.0.5")
 * @param {string} version2 - Second version (e.g., "1.0.10")
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
function compareVersions(version1, version2) {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1 = v1Parts[i] || 0;
    const v2 = v2Parts[i] || 0;
    
    if (v1 < v2) return -1;
    if (v1 > v2) return 1;
  }
  
  return 0;
}

/**
 * Check if an extension needs to be published
 * @param {string} manifestPath - Path to the manifest file
 * @param {string} publisherId - The publisher ID
 * @returns {object} Result object with needsPublish flag and details
 */
function checkExtension(manifestPath, publisherId) {
  const manifestContent = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);
  
  const extensionId = manifest.id;
  const localVersion = manifest.version;
  const extensionName = manifest.name;
  
  console.log(`\nChecking ${extensionName} (${extensionId})...`);
  console.log(`  Local version: ${localVersion}`);
  
  if (!publisherId) {
    console.log(`  ⚠️  No publisher ID provided, cannot check marketplace version`);
    return {
      extensionId,
      extensionName,
      localVersion,
      marketplaceVersion: null,
      needsPublish: true,
      reason: 'No publisher ID provided'
    };
  }
  
  const marketplaceVersion = getMarketplaceVersion(publisherId, extensionId);
  
  if (marketplaceVersion === null) {
    console.log(`  Marketplace version: Not published yet`);
    console.log(`  ✅ Needs publish: First time publication`);
    return {
      extensionId,
      extensionName,
      localVersion,
      marketplaceVersion: null,
      needsPublish: true,
      reason: 'Not yet published'
    };
  }
  
  console.log(`  Marketplace version: ${marketplaceVersion}`);
  
  const comparison = compareVersions(localVersion, marketplaceVersion);
  
  if (comparison > 0) {
    console.log(`  ✅ Needs publish: Local version is newer`);
    return {
      extensionId,
      extensionName,
      localVersion,
      marketplaceVersion,
      needsPublish: true,
      reason: 'Local version is newer'
    };
  } else if (comparison === 0) {
    console.log(`  ⏭️  Skip publish: Versions are equal`);
    return {
      extensionId,
      extensionName,
      localVersion,
      marketplaceVersion,
      needsPublish: false,
      reason: 'Versions are equal'
    };
  } else {
    console.log(`  ⚠️  Warning: Local version is older than marketplace!`);
    console.log(`  This should not happen. The version script should prevent downgrades.`);
    return {
      extensionId,
      extensionName,
      localVersion,
      marketplaceVersion,
      needsPublish: false,
      reason: 'Local version is older (downgrade not allowed)',
      warning: true
    };
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  let manifestPath = null;
  let publisherId = process.env.PUBLISHER_ID || null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--manifest' && i + 1 < args.length) {
      manifestPath = args[i + 1];
      i++;
    } else if (args[i] === '--publisher' && i + 1 < args.length) {
      publisherId = args[i + 1];
      i++;
    }
  }
  
  if (!manifestPath) {
    console.error('Error: --manifest argument is required');
    console.error('Usage: node check-marketplace-version.mjs --manifest <path> [--publisher <id>]');
    process.exit(2);
  }
  
  if (!existsSync(manifestPath)) {
    console.error(`Error: Manifest file not found: ${manifestPath}`);
    process.exit(2);
  }
  
  try {
    const result = checkExtension(manifestPath, publisherId);
    
    // Output result as JSON for easy parsing in CI
    console.log('\nResult:');
    console.log(JSON.stringify(result, null, 2));
    
    // Exit with appropriate code
    // 0 = needs publish, 1 = skip publish, 2 = error
    process.exit(result.needsPublish ? 0 : 1);
  } catch (error) {
    console.error('\nError checking extension:', error.message);
    process.exit(2);
  }
}

main();
