#!/usr/bin/env node

/**
 * Simplified version updater for Azure DevOps extensions
 * 
 * Strategy:
 * - Uses a global version counter that always increments
 * - MAJOR.MINOR from manifests (manually controlled)
 * - PATCH from global counter
 * - No complex change detection or marketplace checking
 * - Simple and reliable
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const VERSION_COUNTER_FILE = join(rootDir, '.version-counter');

/**
 * Read the global version counter
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
  return 1;
}

/**
 * Write the global version counter
 */
function writeVersionCounter(counter) {
  try {
    writeFileSync(VERSION_COUNTER_FILE, `${counter}\n`, 'utf8');
  } catch (error) {
    console.error(`Error: Could not write version counter:`, error.message);
    throw error;
  }
}

/**
 * Get current git commit hash
 */
function getCurrentCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: rootDir,
      encoding: 'utf8'
    }).trim();
  } catch (error) {
    console.warn('Warning: Could not get current commit');
    return null;
  }
}

/**
 * Update a single manifest with new version
 */
function updateManifestVersion(manifestPath, versionCounter, forceUpdate) {
  const manifestContent = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);
  
  const currentVersion = manifest.version;
  if (!currentVersion || typeof currentVersion !== 'string') {
    throw new Error(`Invalid or missing version in ${manifestPath}`);
  }
  
  const versionParts = currentVersion.split('.');
  if (versionParts.length < 2) {
    throw new Error(`Invalid version format: ${currentVersion}. Expected MAJOR.MINOR.PATCH`);
  }
  
  const major = parseInt(versionParts[0], 10);
  const minor = parseInt(versionParts[1], 10);
  const currentPatch = versionParts.length >= 3 ? parseInt(versionParts[2], 10) : 0;
  
  if (isNaN(major) || isNaN(minor) || (versionParts.length >= 3 && isNaN(currentPatch))) {
    throw new Error(`Invalid version numbers in: ${currentVersion}`);
  }
  
  console.log(`\n📦 ${manifest.name} (${manifest.id})`);
  console.log(`   Current: ${currentVersion}`);
  
  // Determine if we should update
  let shouldUpdate = forceUpdate;
  
  if (!forceUpdate) {
    // Check if there are uncommitted changes or new commits since last version
    const lastCommit = manifest.metadata?.lastVersionCommit;
    if (!lastCommit) {
      shouldUpdate = true; // No last commit recorded
    } else {
      try {
        // Check if there are new commits
        const commits = execFileSync('git', ['log', `${lastCommit}..HEAD`, '--oneline'], {
          cwd: rootDir,
          encoding: 'utf8'
        }).trim();
        shouldUpdate = commits.length > 0;
      } catch (error) {
        shouldUpdate = true; // On error, assume update needed
      }
    }
  }
  
  if (!shouldUpdate) {
    console.log(`   ⏭️  Skipped (no changes)`);
    return {
      updated: false,
      extensionId: manifest.id,
      version: currentVersion
    };
  }
  
  // Use version counter, but ensure it's higher than current patch
  const patch = Math.max(versionCounter, currentPatch + 1);
  const newVersion = `${major}.${minor}.${patch}`;
  
  console.log(`   New:     ${newVersion}`);
  
  // Update manifest
  manifest.version = newVersion;
  
  // Store metadata
  if (!manifest.metadata) {
    manifest.metadata = {};
  }
  const currentCommit = getCurrentCommit();
  if (currentCommit) {
    manifest.metadata.lastVersionCommit = currentCommit;
    manifest.metadata.lastVersionUpdate = new Date().toISOString();
  }
  
  // Write back
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  
  console.log(`   ✅ Updated`);
  
  return {
    updated: true,
    extensionId: manifest.id,
    oldVersion: currentVersion,
    newVersion: newVersion
  };
}

/**
 * Main function
 */
function main() {
  const forceUpdate = process.env.FORCE_VERSION_UPDATE === 'true';
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Azure DevOps Extensions - Version Update');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (forceUpdate) {
    console.log('Mode: Force update (all extensions will be updated)');
  } else {
    console.log('Mode: Smart update (only changed extensions)');
  }
  
  // Get current counter
  let versionCounter = readVersionCounter();
  console.log(`Starting counter: ${versionCounter}`);
  
  // Find manifests
  const files = readdirSync(rootDir);
  const manifestFiles = files.filter(f => 
    f.startsWith('azure-devops-extension-') && f.endsWith('.json')
  );
  
  if (manifestFiles.length === 0) {
    throw new Error('No extension manifests found');
  }
  
  console.log(`Found ${manifestFiles.length} extension(s)`);
  
  const results = [];
  let updated = 0;
  
  // Process each manifest
  for (const file of manifestFiles) {
    const manifestPath = join(rootDir, file);
    const result = updateManifestVersion(manifestPath, versionCounter, forceUpdate);
    results.push(result);
    
    if (result.updated) {
      updated++;
      versionCounter++;
    }
  }
  
  // Update counter if any extensions were updated
  if (updated > 0) {
    writeVersionCounter(versionCounter);
  }
  
  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (updated > 0) {
    console.log(`✅ Updated ${updated} extension(s)`);
    console.log(`Final counter: ${versionCounter}`);
  } else {
    console.log('ℹ️  No extensions updated');
  }
  
  return results;
}

try {
  main();
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
