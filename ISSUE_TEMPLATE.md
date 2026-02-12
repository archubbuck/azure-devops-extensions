# Issue: Notification Hub Extension Not Displaying in Azure DevOps

## Issue Type
🐛 Bug Report

## Priority
High - Extension is installed but not visible to users

## Summary
The Notification Hub extension is installed in the Azure DevOps organization but the notification bell icon and panel are not appearing in the user interface despite successful installation.

## Environment
- **Azure DevOps**: Cloud (dev.azure.com)
- **Extension Version**: 1.0.x
- **Browser**: Any
- **Extension Status**: Installed and enabled in organization settings

## Problem Description

After installing the Notification Hub extension in an Azure DevOps organization:
- ✅ Extension appears as "Installed" in organization settings
- ❌ Bell icon does NOT appear in the global header toolbar
- ❌ Notification panel cannot be accessed
- ❌ No error messages visible in browser console

This prevents users from accessing the notification features entirely, making the extension non-functional.

## Steps to Reproduce

1. Package the extension using `tfx extension create`
2. Upload the `.vsix` file to Azure DevOps marketplace (or install directly)
3. Install the extension to an Azure DevOps organization
4. Navigate to any project in the organization
5. Look for the bell icon in the top-right header toolbar
6. **Result**: No bell icon is visible

## Expected Behavior

After installation, users should see:
1. A bell icon (🔔) in the global header toolbar (top-right area)
2. Clicking the bell icon should open a slide-out panel from the right
3. The panel should display notifications (mentions, PR comments, work items)

## Actual Behavior

- No UI elements from the extension are visible
- Extension appears to be "installed" but completely hidden
- No way to access the notification hub functionality

## Root Cause Investigation Needed

Based on the extension manifest and code review, potential areas to investigate:

### 1. Extension Manifest Configuration
- **File**: `azure-devops-extension.json`
- **Area**: Header action contribution configuration
- **Question**: Is the header action properly configured with correct targets?

Current configuration:
```json
{
  "id": "notification-hub-header-action",
  "type": "ms.vss-web.action",
  "targets": ["ms.vss-web.global-header-toolbar-right"],
  "properties": {
    "name": "Notifications",
    "iconName": "Ringer",
    "uri": "apps/notification-hub/dist/action.html"
  }
}
```

**Investigate**:
- Is there ambiguity between `uri` and `command` properties?
- Is the URI path correct and does it point to a valid handler?
- Is the action handler properly initializing the SDK?

### 2. Action Handler Implementation
- **File**: `apps/notification-hub/public/action.html`
- **Question**: Does the action handler properly initialize and execute?

**Investigate**:
- Does `action.html` properly initialize the Azure DevOps SDK?
- Does it correctly call `SDK.notifyLoadSucceeded()`?
- Does it properly open the panel using `IHostPageLayoutService`?
- Is the panel contribution ID correctly referenced?

### 3. Panel Configuration
- **File**: `azure-devops-extension.json`
- **Area**: Panel contribution configuration

**Investigate**:
- Is the panel contribution properly defined?
- Does the panel URI point to the correct HTML file?
- Are panel dimensions appropriate?

### 4. Build and Packaging
- **Question**: Are all necessary files included in the `.vsix` package?

**Investigate**:
- Is `action.html` being copied to the dist folder during build?
- Are all assets properly referenced in the manifest's `files` section?
- Does the build output include all necessary files?

### 5. SDK Initialization
- **Files**: `apps/notification-hub/src/main.tsx`, `apps/notification-hub/public/action.html`

**Investigate**:
- Are there conflicts between multiple SDK initializations?
- Is the SDK being loaded from the correct source (local vs CDN)?
- Are there CSP (Content Security Policy) violations?

## Technical Context

### Extension Architecture
The extension consists of:
1. **Header Action**: Bell icon in global header toolbar
   - Contribution ID: `notification-hub-header-action`
   - Type: `ms.vss-web.action`
   - Target: `ms.vss-web.global-header-toolbar-right`

2. **Panel**: Slide-out panel showing notifications
   - Contribution ID: `notification-hub-panel`
   - Type: `ms.vss-web.panel`
   - Dimensions: 400px width, 100% height

### Expected Interaction Flow
```
User clicks bell icon → action.html loads → 
SDK initializes → IHostPageLayoutService.openPanel() → 
Panel loads index.html → React app renders
```

## Acceptance Criteria

A solution should result in:
- [ ] Bell icon visible in Azure DevOps global header toolbar
- [ ] Clicking bell icon opens the notification panel
- [ ] Panel displays correctly with proper dimensions
- [ ] No console errors related to SDK initialization
- [ ] Extension works across all Azure DevOps pages
- [ ] Clear documentation of root cause and fix

## Additional Information

### Related Files
- `azure-devops-extension.json` - Extension manifest
- `apps/notification-hub/public/action.html` - Action handler
- `apps/notification-hub/src/main.tsx` - React app entry point
- `ROOT_CAUSE_ANALYSIS.md` - May contain previous investigation notes

### Debug Steps Recommended
1. Check browser DevTools Console for errors
2. Verify extension files in `.vsix` package (unzip and inspect)
3. Check Network tab for failed resource loads
4. Verify SDK initialization calls in both action.html and index.html
5. Test with minimal reproduction case

### References
- [Azure DevOps Extension Manifest](https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest)
- [Azure DevOps SDK Documentation](https://github.com/microsoft/azure-devops-extension-sdk)
- [Extension Contributions](https://learn.microsoft.com/en-us/azure/devops/extend/develop/contributions-overview)

---

## Labels Suggested
- `bug`
- `priority: high`
- `component: extension-manifest`
- `component: ui`
- `needs-investigation`

## Assignees
@archubbuck

---

**Note**: This issue template is ready to be copy-pasted into a new GitHub issue. The root cause has likely been documented in `ROOT_CAUSE_ANALYSIS.md`, so review that file before creating the issue to see if a fix has already been identified.
