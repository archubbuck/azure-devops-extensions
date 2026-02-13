# Deployment Patterns and Best Practices

This document describes the improved deployment patterns implemented to prevent frequent CI/CD failures when publishing Azure DevOps extensions.

## Problem Background

The deployment pipeline was experiencing frequent failures due to:

1. **Version downgrade errors**: Publishing was attempted with versions lower than what was already in the marketplace
2. **No marketplace validation**: The workflow didn't check current published versions before attempting to publish
3. **Ineffective retry logic**: Retrying with the same version always failed for version errors
4. **Unnecessary publishes**: Extensions were published even when unchanged

## Solution Overview

The improved deployment pattern includes:

### 1. Marketplace Version Detection

A new script `scripts/check-marketplace-version.mjs` queries the Azure DevOps Marketplace to:
- Retrieve the currently published version of each extension
- Compare it with the local version
- Determine if publishing is needed
- Skip publishing if versions are equal

**Usage:**
```bash
node scripts/check-marketplace-version.mjs --manifest <path> --publisher <id>
```

**Exit codes:**
- `0`: Publish needed (local version is newer or extension not published)
- `1`: Skip publish (versions are equal)
- `2`: Error occurred

### 2. Enhanced Version Management

The `scripts/update-version.mjs` script now:
- Queries marketplace for current published versions
- Ensures local versions are always higher than marketplace versions
- Implements version floor protection using `Math.max()`
- Prevents version downgrades across branches and history changes

**Key features:**
- Per-extension versioning based on git commit count
- Marketplace version checking when `PUBLISHER_ID` is set
- Automatic patch version bumping when needed
- Falls back gracefully when marketplace is unavailable

### 3. Smart Retry Logic

The deployment workflow now distinguishes between error types:

**Non-retryable errors (fail immediately):**
- Version downgrade errors
- Name/ID conflicts in marketplace
- Validation errors

**Retryable errors (linear backoff):**
- Network timeouts
- Connection failures
- Transient marketplace issues

**Retry strategy:**
- 3 attempts maximum
- Linear backoff: 10s, 20s, 30s
- Detailed error reporting

### 4. Conditional Publishing

Extensions are only published when:
1. Local version is higher than marketplace version, OR
2. Extension is not yet published (first time), OR
3. Marketplace version cannot be determined (fail-safe)

This prevents unnecessary publishes and reduces marketplace API load.

## Workflow Changes

### Before
```yaml
- name: Package and Publish Extensions
  run: |
    # Blindly publish all extensions
    for MANIFEST in $MANIFEST_FILES; do
      tfx extension publish --manifest-globs "$MANIFEST"
    done
```

### After
```yaml
- name: Update versions automatically
  env:
    PUBLISHER_ID: ${{ secrets.PUBLISHER_ID }}
  run: node scripts/update-version.mjs

- name: Package and Publish Extensions
  env:
    AZURE_DEVOPS_PAT: ${{ secrets.AZURE_DEVOPS_PAT }}
    PUBLISHER_ID: ${{ secrets.PUBLISHER_ID }}
  run: |
    # Function to check if extension needs publishing
    needs_publish() {
      local MANIFEST=$1
      if node scripts/check-marketplace-version.mjs --manifest "$MANIFEST" --publisher "$PUBLISHER_ID"; then
        return 0  # Needs publish
      else
        return 1  # Skip publish
      fi
    }
    
    # Function to publish extension
    publish_extension() {
      local MANIFEST=$1
      
      # Check marketplace version
      if ! needs_publish "$MANIFEST"; then
        echo "⏭️  Skipping: already up-to-date"
        return 2  # Skipped
      else
        # Publish with smart retry logic
        tfx extension publish --manifest-globs "$MANIFEST"
        return $?
      fi
    }
    
    # Process all extensions
    for MANIFEST in $MANIFEST_FILES; do
      publish_extension "$MANIFEST"
    done
```

## Benefits

### 1. Reduced Failures
- Version conflicts caught early
- No retry loops for non-retryable errors
- Better error messages for debugging

### 2. Faster Deployments
- Skip publishing unchanged extensions
- Shorter retry delays (linear vs exponential)
- Parallel package creation

### 3. Better Visibility
- Detailed logging for each extension
- Clear status reporting (success/skipped/failed)
- Marketplace version shown in logs

### 4. Cost Efficiency
- Fewer API calls to marketplace
- Less CI/CD time consumed
- Reduced retry attempts

## Usage Examples

### Check if extension needs publishing
```bash
# Returns exit code 0 if publish needed
node scripts/check-marketplace-version.mjs \
  --manifest azure-devops-extension-hello-azure.json \
  --publisher my-publisher-id

# Use in shell scripts
if node scripts/check-marketplace-version.mjs --manifest "$MANIFEST" --publisher "$PUBLISHER_ID"; then
  echo "Publish needed"
else
  echo "Skip publish"
fi
```

### Update versions with marketplace checking
```bash
# Set PUBLISHER_ID to enable marketplace checks
export PUBLISHER_ID="my-publisher-id"
node scripts/update-version.mjs
```

### Manual publishing with error handling
```bash
# Capture error output for analysis
PUBLISH_OUTPUT=$(tfx extension publish \
  --manifest-globs azure-devops-extension-hello-azure.json \
  --token $PAT 2>&1)

# Check for specific errors
if echo "$PUBLISH_OUTPUT" | grep -qi "version number must increase"; then
  echo "Version error detected"
  exit 1
fi
```

## Troubleshooting

### Version downgrade error
**Error:** "Version number must increase each time an extension is published"

**Cause:** Local version is lower than or equal to marketplace version

**Solution:**
1. Check marketplace version: `node scripts/check-marketplace-version.mjs ...`
2. Ensure `PUBLISHER_ID` is set in workflow
3. Run versioning script: `node scripts/update-version.mjs`
4. Verify version increased in manifest file

### Name conflict error
**Error:** "The extension 'name' already exists in the Marketplace"

**Cause:** Extension ID is already taken by another publisher

**Solution:**
1. Change the `id` field in your manifest file
2. Use a unique identifier (e.g., add company prefix)
3. Update references to the extension ID in code

### Marketplace query fails
**Error:** Cannot query marketplace or get version

**Cause:** Network issue, PAT invalid, or extension not found

**Solution:**
1. Verify `PUBLISHER_ID` is correct
2. Check TFX CLI is installed: `tfx version`
3. Test marketplace access: `tfx extension show --publisher <id> --extension-id <id>`
4. Workflow will proceed with publish attempt as fail-safe

## Best Practices

### 1. Always set PUBLISHER_ID
```yaml
env:
  PUBLISHER_ID: ${{ secrets.PUBLISHER_ID }}
```

### 2. Use semantic versioning
- `MAJOR.MINOR.PATCH` format
- Manually control `MAJOR.MINOR` in manifest
- Let automation handle `PATCH`

### 3. Monitor deployment logs
- Check "Deployment Summary" in workflow output
- Review skipped extensions to verify correctness
- Investigate warnings about version mismatches

### 4. Test before merging
- Use workflow_dispatch for manual testing
- Verify version updates in PR
- Check that versions increase correctly

### 5. Handle secrets securely
- Store PAT in GitHub Secrets
- Never log PAT values
- Rotate PAT periodically

## Future Improvements

Potential enhancements to consider:

1. **Parallel publishing**: Publish multiple extensions concurrently
2. **Change detection**: Skip publishing based on git diff analysis
3. **Release notes**: Auto-generate from commit messages
4. **Rollback support**: Keep previous versions for quick rollback
5. **Pre-flight validation**: Validate manifests before publishing
6. **Deployment gates**: Require approvals for production publishes

## References

- [Azure DevOps Extension Documentation](https://docs.microsoft.com/en-us/azure/devops/extend/)
- [TFX CLI Reference](https://github.com/microsoft/tfs-cli)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/learn-github-actions/best-practices-for-github-actions)
