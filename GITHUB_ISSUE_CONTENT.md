# GitHub Issue - Quick Copy

## Title
```
Notification Hub extension not displaying in Azure DevOps despite being installed
```

## Labels
```
bug, priority: high, needs-investigation, component: ui, component: extension-manifest
```

## Description
Copy the text below for the issue description:

---

## Problem
The Notification Hub extension is installed in the Azure DevOps organization but the notification bell icon is not appearing in the UI, making the extension completely inaccessible to users.

## Environment
- Azure DevOps: Cloud (dev.azure.com)
- Extension Version: 1.0.x
- Extension Status: Installed and enabled

## Symptoms
- ✅ Extension shows as "Installed" in organization settings
- ❌ Bell icon NOT visible in global header toolbar
- ❌ No way to access notification panel
- ❌ No error messages in browser console

## Expected Behavior
After installation:
1. Bell icon (🔔) should appear in top-right global header toolbar
2. Clicking bell should open slide-out notification panel
3. Panel should display notifications from @mentions, PR comments, and work items

## Investigation Areas

### 1. Extension Manifest (`azure-devops-extension.json`)
Potential issues with header action contribution:
- Ambiguous configuration between `uri` and `command` properties
- Incorrect target specification
- Missing or incorrect icon configuration

### 2. Action Handler (`action.html`)
Potential issues:
- SDK initialization failures
- Missing `SDK.notifyLoadSucceeded()` call
- Incorrect panel opening logic
- Wrong panel contribution ID reference

### 3. Build/Packaging
Potential issues:
- `action.html` not included in `.vsix` package
- Missing files in dist folder
- Incorrect file paths in manifest

### 4. SDK Integration
Potential issues:
- CSP (Content Security Policy) violations
- SDK loading from CDN instead of local bundle
- Multiple conflicting SDK initializations

## Acceptance Criteria
- [ ] Bell icon visible in Azure DevOps header
- [ ] Clicking bell opens notification panel
- [ ] No console errors
- [ ] Extension works across all Azure DevOps pages
- [ ] Root cause documented

## Next Steps
1. Review `ROOT_CAUSE_ANALYSIS.md` if it exists
2. Inspect `.vsix` package contents
3. Check browser console for errors
4. Verify SDK initialization in both action.html and index.html
5. Test header action contribution configuration

## Files to Investigate
- `azure-devops-extension.json`
- `apps/notification-hub/public/action.html`
- `apps/notification-hub/src/main.tsx`
- `apps/notification-hub/dist/` (build output)

---

**Created by**: Automated investigation request
**Created at**: 2026-02-12
