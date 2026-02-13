# Extension-Level Versioning Implementation

## Overview

This document describes the implementation of per-extension versioning for the Azure DevOps Extensions monorepo. The goal is to ensure that code changes only increment the version for affected extensions, preventing unnecessary version bumps for unaffected extensions.

## Problem Statement

**Before this implementation:**
- All extensions in the monorepo (notification-hub, hello-azure) received the same version number
- Version numbers were based on the total git commit count of the entire repository
- Changing extension A when extensions A and B exist would result in both extensions bumping their version
- This caused unnecessary version increments and potential deployment issues

**After this implementation:**
- Each extension tracks its own version based on commits affecting its specific directory
- Changing extension A only increments extension A's version
- Extension B maintains its current version if not modified
- Independent version evolution for each extension

## Technical Implementation

### Changes Made

#### 1. Updated `scripts/update-version.mjs`

The versioning script now:

1. **Extracts extension paths from manifests**: Reads the `files` array from each extension's manifest to determine which directories to track
2. **Tracks per-extension commits**: Uses `git rev-list --count HEAD -- <path>` to count commits affecting each extension's directory
3. **Calculates independent versions**: Each extension gets its PATCH version based on commits to its specific directory

Key functions added:
- `getGitCommitCountForPath(path)`: Counts commits affecting a specific path
- `getExtensionPaths(manifest)`: Extracts app directories from manifest's files array

#### 2. Updated Documentation

Updated `.github/workflows/README.md` to explain:
- Per-extension versioning strategy
- How the system tracks changes for each extension
- Examples of version behavior when specific extensions are modified
- How to increment major/minor versions for individual extensions

### How It Works

The versioning system operates as follows:

1. **Extension Directory Mapping**:
   - notification-hub: `apps/notification-hub/`
   - hello-azure: `apps/hello-azure/`

2. **Commit Tracking**:
   ```bash
   # For notification-hub (example commands - actual script includes error handling)
   git rev-list --count HEAD -- apps/notification-hub/
   
   # For hello-azure (example commands - actual script includes error handling)
   git rev-list --count HEAD -- apps/hello-azure/
   ```
   
   Note: The actual script includes fallback behavior when git commands fail.

3. **Version Calculation**:
   - MAJOR.MINOR: Read from extension manifest (e.g., `azure-devops-extension-notification-hub.json`)
   - PATCH: Calculated from git commit count for that extension's directory
   - Final version: `${major}.${minor}.${commitCount}`

### Example Scenarios

#### Scenario 1: Modify Only notification-hub
```
Initial state:
  - hello-azure: 1.0.1 (1 commit affecting apps/hello-azure/)
  - notification-hub: 1.1.1 (1 commit affecting apps/notification-hub/)

Action: Modify apps/notification-hub/src/main.tsx
Result after commit:
  - hello-azure: 1.0.1 (unchanged - still 1 commit)
  - notification-hub: 1.1.2 (incremented - now 2 commits)
```

#### Scenario 2: Modify Only hello-azure
```
Initial state:
  - hello-azure: 1.0.1 (1 commit)
  - notification-hub: 1.1.2 (2 commits)

Action: Modify apps/hello-azure/src/main.tsx
Result after commit:
  - hello-azure: 1.0.2 (incremented - now 2 commits)
  - notification-hub: 1.1.2 (unchanged - still 2 commits)
```

#### Scenario 3: Modify Both Extensions
```
Initial state:
  - hello-azure: 1.0.2 (2 commits)
  - notification-hub: 1.1.2 (2 commits)

Action: Modify both apps/hello-azure/ and apps/notification-hub/
Result after commit:
  - hello-azure: 1.0.3 (incremented - now 3 commits)
  - notification-hub: 1.1.3 (incremented - now 3 commits)
```

## Testing

### Manual Testing Procedures

The implementation was verified through manual testing scenarios:

```bash
# Test scenarios executed:
1. Initial state: Both extensions have correct commit counts
2. Modify notification-hub only: Only notification-hub version increments
3. Modify hello-azure only: Only hello-azure version increments
```

Manual verification confirmed:
- ✅ Affected extensions get version increments
- ✅ Unaffected extensions maintain their versions
- ✅ Version tracking is accurate per extension

### Manual Testing

To manually test the versioning:

```bash
# Run the versioning script
npm run update-version

# Make changes to one extension
echo "// test" >> apps/notification-hub/src/main.tsx
git add apps/notification-hub/src/main.tsx
git commit -m "Test: modify notification-hub"

# Run versioning again and verify only notification-hub version changed
npm run update-version
```

## Benefits

1. **Accurate Version History**: Each extension's version reflects its actual change history
2. **Reduced Conflicts**: Fewer unnecessary version bumps reduce marketplace version conflicts
3. **Independent Deployment**: Extensions can evolve at their own pace
4. **Better Change Tracking**: Version numbers indicate which extensions actually changed
5. **Scalability**: System works for any number of extensions in the monorepo

## Usage

### For Developers

When making changes:
1. Edit code in the extension directory (e.g., `apps/notification-hub/`)
2. Commit your changes
3. The CD workflow automatically updates versions during deployment
4. Only the modified extension's version will increment

### For CI/CD

The CD workflow:
1. Runs `npm run update-version` before packaging
2. Each extension gets its version updated based on its commit history
3. Extensions are packaged and published with their independent versions

### Manual Version Updates

To manually update versions:

```bash
npm run update-version
```

To increment major/minor versions:
1. Edit the extension's manifest (e.g., `azure-devops-extension-notification-hub.json`)
2. Change the version field (e.g., `"version": "2.0.0"`)
3. Commit and push - the script will use the new major/minor and calculate the patch

## Compatibility

- **Backward Compatible**: Existing manifest files work without modification
- **Git Required**: Requires git history to calculate versions
- **Fallback**: If git is unavailable, falls back to timestamp-based versioning

## Future Enhancements

Possible improvements:
1. Add version history tracking in manifest files
2. Support for pre-release versions (e.g., beta, rc)
3. Changelog generation based on commits per extension
4. Integration with semantic version bump detection

## Related Files

- `scripts/update-version.mjs`: Main versioning script
- `.github/workflows/cd.yml`: CD workflow that uses the versioning
- `.github/workflows/README.md`: Documentation for workflows
- `azure-devops-extension-*.json`: Extension manifest files

## References

- [Semantic Versioning](https://semver.org/)
- [Git revision selection](https://git-scm.com/book/en/v2/Git-Tools-Revision-Selection)
- [Azure DevOps Extension Manifest](https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest)
