# Extension-Level Versioning with Global Counter

## Overview

This document describes the implementation of per-extension versioning with a global counter for the Azure DevOps Extensions monorepo. The goal is to ensure that all extensions receive unique, monotonically increasing version numbers, with only affected extensions receiving version updates.

## Problem Statement

**Before this implementation:**
- All extensions in the monorepo received the same version number
- Version numbers were based on git commit counts which could be unreliable
- Multiple extensions modified in the same build would get identical versions
- No guarantee of uniqueness across extensions

**After this implementation:**
- Each extension gets a unique version number using a global counter
- Only extensions with changes receive version updates
- Guaranteed monotonic increment - versions never decrease
- Versions are always unique across all extensions

## Technical Implementation

### Changes Made

#### 1. Global Version Counter

Added `.version-counter` file to track the next available version number:
- Starts at a base value (e.g., 10) to avoid conflicts with existing versions
- Increments by 1 for each extension that gets updated
- Persists across builds and deployments
- Guarantees uniqueness even when multiple extensions update simultaneously

#### 2. Updated `scripts/update-version.mjs`

The versioning script now:

1. **Reads global counter**: Loads the current counter value from `.version-counter`
2. **Detects changes**: Uses git history to determine which extensions have changed
3. **Assigns unique versions**: Each updated extension gets the current counter value
4. **Increments counter**: Counter increases after each extension update
5. **Stores metadata**: Records `lastVersionCommit` and `lastVersionUpdate` in manifest

Key functions:
- `readVersionCounter()`: Reads current counter value
- `writeVersionCounter(counter)`: Saves counter value
- `hasExtensionChanges(paths, lastCommit)`: Detects if extension has changes
- `getCurrentCommit()`: Gets current HEAD commit hash
- `getExtensionPaths(manifest)`: Extracts app directories from manifest

### How It Works

The versioning system operates as follows:

1. **Extension Directory Mapping**:
   - better-notification-hub: `apps/better-notification-hub/`
   - better-hello-azure: `apps/better-hello-azure/`
   - better-tag-manager: `apps/tag-manager/`

2. **Change Detection**:
   ```bash
   # Check for changes since last version update
   git log <lastVersionCommit>..HEAD --oneline -- <extension-paths>
   ```
   
   If output exists, extension has changes and needs version update.

3. **Version Assignment**:
   - Read current counter (e.g., 10)
   - For each extension with changes:
     - Assign current counter as PATCH version
     - Increment counter
     - Store new counter value
   - Extensions without changes keep their current version

4. **Version Calculation**:
   - MAJOR.MINOR: Read from extension manifest (manually controlled)
   - PATCH: Assigned from global counter
   - Version Floor Protection: `patch = Math.max(counter, currentPatch + 1, marketplacePatch + 1)`
   - Final version: `${major}.${minor}.${patch}`

5. **Version Floor Protection**:
   - Ensures patch never decreases
   - Respects marketplace versions when `PUBLISHER_ID` is set
   - Handles transitions from previous versioning strategies

### Example Scenarios

#### Scenario 1: Initial Setup - All Extensions at Same Version
```
Before (all at 10.0.1 - problematic):
  - hello-azure: 10.0.1
  - notification-hub: 10.0.1
  - tag-manager: 10.0.1

Run with FORCE_VERSION_UPDATE=true and counter=10:
  - hello-azure: 10.0.1 → 10.0.10 (counter 10, then 11)
  - notification-hub: 10.0.1 → 10.0.11 (counter 11, then 12)
  - tag-manager: 10.0.1 → 10.0.12 (counter 12, then 13)

After (all unique - solved):
  - hello-azure: 10.0.10 ✓
  - notification-hub: 10.0.11 ✓
  - tag-manager: 10.0.12 ✓
  - Counter: 13
```

#### Scenario 2: Modify Only One Extension
```
Initial state (counter=13):
  - hello-azure: 10.0.10
  - notification-hub: 10.0.11
  - tag-manager: 10.0.12

Action: Modify apps/better-hello-azure/src/main.tsx
Commit: "feat: add new feature to hello-azure"

Run update-version.mjs:
  - hello-azure: 10.0.10 → 10.0.13 ✓ (has changes, gets counter 13)
  - notification-hub: 10.0.11 (skipped - no changes)
  - tag-manager: 10.0.12 (skipped - no changes)
  - Counter: 14

Result: Only affected extension updated, versions remain unique
```

#### Scenario 3: Modify Multiple Extensions
```
Initial state (counter=14):
  - hello-azure: 10.0.13
  - notification-hub: 10.0.11
  - tag-manager: 10.0.12

Action: Modify both hello-azure and tag-manager
Commits: "feat: update hello-azure", "feat: update tag-manager"

Run update-version.mjs:
  - hello-azure: 10.0.13 → 10.0.14 (has changes, gets counter 14)
  - notification-hub: 10.0.11 (skipped - no changes)
  - tag-manager: 10.0.12 → 10.0.15 (has changes, gets counter 15)
  - Counter: 16

Result: Each affected extension gets unique version
```

## Testing

### Automated Testing

The implementation has been tested with the following scenarios:

1. **Force update all extensions**: All extensions receive unique sequential versions
2. **Selective update**: Only modified extensions receive version updates
3. **Change detection**: Unmodified extensions correctly skip versioning
4. **Counter persistence**: Counter value persists across script runs
5. **Marketplace integration**: Marketplace versions are respected when PUBLISHER_ID is set

### Manual Testing

To test the versioning system:

```bash
# 1. Check current state
cat .version-counter
cat azure-devops-extension-*.json | jq '.version'

# 2. Force update all extensions (initial setup)
FORCE_VERSION_UPDATE=true node scripts/update-version.mjs

# 3. Make a change to one extension
echo "// test" >> apps/better-hello-azure/src/main.tsx
git add apps/better-hello-azure
git commit -m "test: modify hello-azure"

# 4. Run versioning (only hello-azure should update)
node scripts/update-version.mjs

# 5. Verify results
cat azure-devops-extension-*.json | jq '.version, .metadata'
```

## Benefits

1. **Guaranteed Uniqueness**: No two extensions ever receive the same version number
2. **Monotonic Increment**: Versions always increase, never decrease
3. **Change-Based Updates**: Only affected extensions receive version bumps
4. **Better Change Tracking**: Version numbers clearly indicate which extensions changed
5. **Scalability**: System works for any number of extensions in the monorepo
6. **Marketplace Compliance**: Always respects Azure DevOps Marketplace version requirements
7. **Git History Independent**: Not affected by shallow clones or history rewrites

## Usage

### For Developers

When making changes:
1. Edit code in the extension directory (e.g., `apps/better-notification-hub/`)
2. Commit your changes
3. The CD workflow automatically updates versions during deployment
4. Only the modified extension's version will increment

### For CI/CD

The CD workflow:
1. Runs `node scripts/update-version.mjs` before packaging
2. Each extension gets its version updated based on change detection
3. Global counter ensures uniqueness across all extensions
4. Extensions are packaged and published with their unique versions

### Manual Version Updates

To manually update versions:

```bash
# Update only extensions with changes
node scripts/update-version.mjs

# Force update all extensions (useful for initial setup)
FORCE_VERSION_UPDATE=true node scripts/update-version.mjs

# With marketplace validation
PUBLISHER_ID=your-publisher-id node scripts/update-version.mjs
```

To increment major/minor versions:
1. Edit the extension's manifest (e.g., `azure-devops-extension-notification-hub.json`)
2. Change the version field (e.g., `"version": "11.0"`)
3. Commit and push - the script will use the new major/minor and assign patch from counter

## Compatibility

- **Git Required**: Requires git history to detect changes
- **Counter File**: Requires `.version-counter` file (created automatically if missing)
- **Metadata Storage**: Stores tracking data in manifest `metadata` field
- **Version Floor Protection**: Prevents version downgrades during transitions
- **Backward Compatible**: Existing manifest files work without modification

## File Structure

```
.version-counter                              # Global counter file
scripts/update-version.mjs                    # Versioning script
azure-devops-extension-*.json                 # Extension manifests with metadata
  {
    "version": "10.0.13",
    "metadata": {
      "lastVersionCommit": "abc123...",
      "lastVersionUpdate": "2026-02-14T04:36:38.322Z"
    }
  }
```

## Troubleshooting

### All Extensions Getting Updated

**Problem**: All extensions get version updates even though only one was modified

**Cause**: Metadata `lastVersionCommit` is from before the manifest update commit

**Solution**: This is expected on the first run after implementing the system. Subsequent runs will correctly detect changes:
1. First run: Updates all manifests with current commit hash
2. Commit the manifest updates
3. Second run: Only modified extensions will update

### Version Counter Reset

**Problem**: Version counter appears to reset or show unexpected value

**Cause**: `.version-counter` file was deleted or corrupted

**Solution**:
1. Check if file exists: `cat .version-counter`
2. If missing, recreate with appropriate value (higher than any current patch version)
3. Commit the file to git to persist across builds

### Version Not Incrementing

**Problem**: Extension version doesn't increment after changes

**Cause**: Changes might not be in tracked paths or `lastVersionCommit` is incorrect

**Solution**:
1. Verify changes are in extension directory: `git log HEAD~1..HEAD -- apps/your-extension/`
2. Check manifest metadata: `cat azure-devops-extension-*.json | jq '.metadata'`
3. Use force update to reset: `FORCE_VERSION_UPDATE=true node scripts/update-version.mjs`

### Version Downgrades

**Problem**: Azure DevOps Marketplace rejects version with downgrade error

**Cause**: Local version is lower than marketplace version

**Solution**: The versioning script automatically prevents this:
- Set `PUBLISHER_ID` environment variable
- Script queries marketplace and ensures local version is higher
- Uses `Math.max(counter, currentPatch + 1, marketplacePatch + 1)`

**Example**:
```bash
# Manifest version: 10.0.5
# Counter: 10
# Marketplace version: 10.0.20

# Script calculates: max(10, 6, 21) = 21
# New version: 10.0.21 (exceeds marketplace)
```

## Migration Guide

### Migrating from Old Versioning System

If migrating from commit-count based versioning:

1. **Determine Counter Start Value**:
   ```bash
   # Find highest current patch version
   cat azure-devops-extension-*.json | jq '.version' | cut -d. -f3 | sort -n | tail -1
   ```

2. **Initialize Counter**:
   ```bash
   # Set counter to highest patch + 1
   echo "13" > .version-counter
   git add .version-counter
   git commit -m "chore: initialize version counter"
   ```

3. **Run Initial Update**:
   ```bash
   FORCE_VERSION_UPDATE=true node scripts/update-version.mjs
   git add azure-devops-extension-*.json
   git commit -m "chore: update versions with new counter system"
   ```

4. **Verify Uniqueness**:
   ```bash
   cat azure-devops-extension-*.json | jq '.version'
   # Should show unique versions like 10.0.13, 10.0.14, 10.0.15
   ```

## Future Enhancements

Possible improvements:
1. CI/CD integration with GitHub Actions run number as counter seed
2. Support for pre-release versions (e.g., beta, rc) with separate counters
3. Changelog generation based on commits per extension
4. Version history tracking with rollback support
5. Automatic version bump detection from commit messages (feat:, fix:, etc.)
6. Integration with release management tools

## Related Files

- `scripts/update-version.mjs`: Main versioning script
- `scripts/check-marketplace-version.mjs`: Marketplace version checker
- `.version-counter`: Global version counter file
- `.github/workflows/cd.yml`: CD workflow that uses versioning
- `azure-devops-extension-*.json`: Extension manifest files

## References

- [Semantic Versioning](https://semver.org/)
- [Git Log and History](https://git-scm.com/book/en/v2/Git-Basics-Viewing-the-Commit-History)
- [Azure DevOps Extension Manifest](https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest)
- [Azure DevOps Marketplace Publishing](https://learn.microsoft.com/en-us/azure/devops/extend/publish/overview)
