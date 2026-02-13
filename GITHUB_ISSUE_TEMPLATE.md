# GitHub Issue: Set up versioning at the extension level

## NOTE: Implementation Already Complete! ✅

This issue was resolved in PR #[INSERT_PR_NUMBER_HERE]. The implementation is complete and tested.
However, per the task requirements, this document provides the issue content for manual GitHub issue creation.

## To create this issue on GitHub (for documentation purposes):

1. Go to: https://github.com/archubbuck/azure-devops-extensions/issues/new
2. Copy the content below
3. Note in the issue that it has been implemented in PR #[INSERT_PR_NUMBER_HERE]

---

## Issue Title
Set up versioning at the extension level so code changes only increment the version for affected extensions

## Issue Description

### Problem
Currently, the versioning system increments versions for all extensions in the monorepo whenever any code change is made, regardless of which extension was actually modified.

**Current behavior:**
- All extensions (notification-hub, hello-azure) receive the same version number based on total git commit count
- Changing extension A when extensions A and B exist results in both extensions bumping their version
- This causes unnecessary version increments for unaffected extensions

**Expected behavior:**
- Only the extension with code changes should have its version incremented
- In the scenario above, only extension A should increment its version
- Extension B should maintain its current version

### Impact
- Unnecessary version bumps for unaffected extensions
- Potential version conflicts in Azure DevOps Marketplace
- Misleading version history (version increases without actual changes)
- Inefficient deployment process

### Proposed Solution
Implement per-extension versioning that:
1. Tracks git commit history for each extension's directory separately
2. Calculates PATCH versions based on commits affecting specific extension paths
3. Updates only the affected extension's version in its manifest file
4. Maintains independent version evolution for each extension

### Technical Approach
Modify `scripts/update-version.mjs` to:
- Extract extension directories from manifest files
- Use `git rev-list --count HEAD -- <extension-path>` for per-extension commit counts
- Calculate independent version numbers for each extension

### Acceptance Criteria
- [ ] Modifying only extension A increments only extension A's version
- [ ] Extension B's version remains unchanged when only extension A is modified
- [ ] Both extensions increment when both are modified
- [ ] Version calculation is based on git history per extension directory
- [ ] Existing CD workflow works without modification
- [ ] Documentation is updated to explain the new versioning system

### Related Files
- `scripts/update-version.mjs` - Versioning script
- `azure-devops-extension-notification-hub.json` - Notification Hub manifest
- `azure-devops-extension-hello-azure.json` - Hello Azure manifest
- `.github/workflows/cd.yml` - CD workflow
- `.github/workflows/README.md` - Workflow documentation

### Labels
- `enhancement`
- `versioning`
- `monorepo`
- `ci-cd`

---

## ✅ IMPLEMENTATION STATUS: COMPLETE

**This issue has been fully implemented and tested.**

See PR #[INSERT_PR_NUMBER_HERE] for the complete implementation including:
- Updated versioning script with per-extension tracking
- Comprehensive test suite (all tests passing)
- Full documentation
- Code review and security checks completed

The implementation is ready for use - no further action required on this issue.

---

## Implementation Reference

The implementation has been completed in PR #[INSERT_PR_NUMBER_HERE]. Key changes include:

1. **Updated versioning script**: `scripts/update-version.mjs` now tracks per-extension commit counts
2. **Updated documentation**: `.github/workflows/README.md` explains the new system
3. **Testing**: Comprehensive tests validate the implementation
4. **Implementation guide**: `VERSIONING_IMPLEMENTATION.md` provides detailed documentation

See the PR for full details and test results.
