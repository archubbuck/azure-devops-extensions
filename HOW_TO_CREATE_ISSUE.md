# How to Create the GitHub Issue

## Important Note
⚠️ **This repository uses automated agents that cannot directly create GitHub issues.** This guide will help you manually create the issue using the prepared documentation.

## Quick Steps

### Option 1: Simple Issue (Recommended for Quick Tracking)
1. Go to: https://github.com/archubbuck/azure-devops-extensions/issues/new
2. Copy the title from `GITHUB_ISSUE_CONTENT.md` (first code block)
3. Copy the description from `GITHUB_ISSUE_CONTENT.md` (everything under "Description")
4. Add labels: `bug`, `priority: high`, `needs-investigation`, `component: ui`, `component: extension-manifest`
5. Click "Submit new issue"

### Option 2: Detailed Issue (For Comprehensive Documentation)
1. Go to: https://github.com/archubbuck/azure-devops-extensions/issues/new
2. Copy the entire content from `ISSUE_TEMPLATE.md`
3. Paste into the issue description
4. Add suggested labels from the template
5. Click "Submit new issue"

## What's Included

### 📄 GITHUB_ISSUE_CONTENT.md
- **Best for**: Quick issue creation
- **Length**: ~2,600 characters
- **Contains**: Concise problem description, investigation areas, acceptance criteria
- **Format**: Ready to copy-paste

### 📄 ISSUE_TEMPLATE.md
- **Best for**: Comprehensive documentation
- **Length**: ~6,200 characters
- **Contains**: Detailed problem analysis, technical context, debug steps, references
- **Format**: Full GitHub issue template

### 📄 ISSUE_INVESTIGATION_README.md
- **Best for**: Understanding context
- **Contains**: Overview of all documents, quick start guide, key findings summary
- **Format**: Navigation and reference guide

### 📄 ROOT_CAUSE_ANALYSIS.md (Pre-existing)
- **Status**: ✅ Already exists in repository
- **Contains**: Complete analysis of the issue and implemented solution
- **Note**: Review this first - the issue may already be resolved!

## Before Creating the Issue

### ⚠️ Important: Check if Already Fixed
1. Read `ROOT_CAUSE_ANALYSIS.md` first
2. The issue was already investigated and fixed in PR #7
3. The root cause was:
   - Ambiguous header action configuration (both `uri` and `command`)
   - Incorrect app architecture (mixing icon and panel rendering)
4. **Solution already implemented**:
   - Created dedicated `action.html` handler
   - Fixed extension manifest
   - Simplified React app

### Should You Still Create an Issue?

**Create an issue if:**
- ✅ The problem is still occurring in your environment
- ✅ You need to track this for documentation purposes
- ✅ You want to verify the fix in your organization
- ✅ You need to coordinate testing with team members

**Don't create an issue if:**
- ❌ The problem is already fixed and verified
- ❌ You just need information (read ROOT_CAUSE_ANALYSIS.md instead)
- ❌ You want to understand the technical details (they're in ROOT_CAUSE_ANALYSIS.md)

## Example Issue Title
```
Notification Hub extension not displaying in Azure DevOps despite being installed
```

## Example Issue Labels
```
bug
priority: high
needs-investigation
component: ui
component: extension-manifest
```

## After Creating the Issue

1. Link to PR #7 in the issue: https://github.com/archubbuck/azure-devops-extensions/pull/7
2. Reference `ROOT_CAUSE_ANALYSIS.md` for technical details
3. Test the latest version to verify if issue persists
4. Update issue status based on testing results
5. Close issue if fix is verified working

## Need Help?

- **For technical details**: Read `ROOT_CAUSE_ANALYSIS.md`
- **For investigation steps**: See `ISSUE_TEMPLATE.md`
- **For quick reference**: See `GITHUB_ISSUE_CONTENT.md`
- **For navigation**: See `ISSUE_INVESTIGATION_README.md`

---

## Manual Issue Creation Steps (Detailed)

Since the automated agent cannot create issues directly, follow these steps:

1. **Open GitHub in your browser**
   - Navigate to: https://github.com/archubbuck/azure-devops-extensions

2. **Go to Issues tab**
   - Click on "Issues" in the top navigation

3. **Create new issue**
   - Click the green "New issue" button

4. **Fill in the title**
   - Copy from `GITHUB_ISSUE_CONTENT.md` or use:
   - "Notification Hub extension not displaying in Azure DevOps despite being installed"

5. **Fill in the description**
   - Option A: Copy content from `GITHUB_ISSUE_CONTENT.md` (concise)
   - Option B: Copy content from `ISSUE_TEMPLATE.md` (detailed)

6. **Add labels** (on the right sidebar)
   - Click "Labels" → Select relevant labels
   - Suggested: `bug`, `priority: high`, `needs-investigation`

7. **Assign** (optional)
   - Click "Assignees" → Select @archubbuck or relevant person

8. **Submit**
   - Click "Submit new issue"

9. **Follow up**
   - Add comment linking to `ROOT_CAUSE_ANALYSIS.md`
   - Reference PR #7 if related
   - Update as investigation proceeds

---

**Created**: 2026-02-12  
**Repository**: archubbuck/azure-devops-extensions  
**Purpose**: Provide manual issue creation guide for automation-limited agents
