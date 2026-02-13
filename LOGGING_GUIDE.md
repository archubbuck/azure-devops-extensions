# Logging Guide for Notification Hub Extension

## Overview

This document describes the enhanced logging that has been added to the Notification Hub extension to help diagnose issues where the extension doesn't show up in Azure DevOps.

## Logging Locations

### 1. Header Action (`action.html`)

The header action (bell icon in toolbar) now logs detailed information during initialization and execution:

#### Initialization Logs
- **Extension start**: Logs when the action handler starts loading
- **Document state**: Current document readyState and location
- **SDK initialization**: Timing of SDK.init() call
- **Extension context**: Publisher ID, extension ID, version
- **Contribution ID**: The full contribution ID being registered
- **Host information**: Azure DevOps host details (id, name, service version)
- **User information**: Current user details (display name, id, descriptor)

#### Action Execution Logs
- **Action triggered**: When the bell icon is clicked
- **Panel ID**: The computed panel contribution ID
- **Service requests**: Getting the layout service
- **Panel open**: Success or failure of opening the panel

### 2. Panel (`main.tsx`)

The notification panel logs initialization and rendering:

#### Startup Logs
- **Panel start**: When the panel starts loading
- **Document state**: Current document readyState, location, and user agent
- **SDK initialization**: Timing and success/failure
- **Extension context**: Publisher ID, extension ID, version
- **Contribution ID**: The panel's contribution ID
- **Host information**: Azure DevOps host details
- **User information**: Current user details
- **Configuration**: Panel configuration from Azure DevOps
- **React rendering**: Success or failure of mounting the React app

#### Error Handling
- **Enhanced error UI**: If initialization fails, an expandable error UI shows:
  - Error message
  - Stack trace
  - Troubleshooting steps

### 3. React Components

#### App Component (`app.tsx`)
- Component initialization
- Notification refresh operations with timing
- Success/failure of notification fetches

#### NotificationPanel Component (`NotificationPanel.tsx`)
- Panel mount and visibility changes
- Loading operations with timing and count
- Filter operations showing results
- Mark as read operations

#### NotificationService (`notification.service.ts`)
Already had good logging for:
- Service initialization
- Notification fetching (mentions, PR comments, work items)
- LocalStorage operations
- API calls and errors

## How to Use the Logs for Debugging

### Step 1: Open Browser DevTools

1. Open Azure DevOps in your browser
2. Press `F12` or right-click and select "Inspect"
3. Go to the **Console** tab

### Step 2: Filter the Logs

Use the browser's console filter to show only Notification Hub logs:

```
[Notification Hub
```

This will show all logs from the extension.

### Step 3: Check for Common Issues

#### Issue: Extension doesn't appear in toolbar

Look for these logs:
1. `=== Notification Hub Action Starting ===` - Confirms action.html loaded
2. `SDK initialized successfully in XXms` - Confirms SDK initialization
3. `Extension Context:` - Verify publisher ID and extension ID match your manifest
4. `Current Contribution ID:` - Verify this matches the contribution defined in azure-devops-extension.json
5. `Action handler registered successfully` - Confirms the handler was registered

**If missing**: The action.html file may not be loading. Check:
- Extension installation status
- Contribution configuration in azure-devops-extension.json
- File paths in the manifest

#### Issue: Bell icon appears but panel doesn't open

Look for these logs after clicking the bell:
1. `=== Action Execute Called ===` - Confirms the click was received
2. `Attempting to open panel with ID:` - Shows the panel ID being used
3. `Layout service obtained successfully` - Confirms the service is available
4. `Panel opened successfully` - Confirms the panel opened

**If panel open fails**: Check the error logs for:
- Panel contribution ID mismatch
- Panel contribution not properly registered
- Permission issues

#### Issue: Panel opens but content doesn't load

Look for these logs:
1. `=== Notification Hub Panel Starting ===` - Confirms panel HTML loaded
2. `SDK initialized successfully in XXms` - Confirms SDK initialization in panel context
3. `Extension Context:` - Verify context is available in panel
4. `Root element found` - Confirms the DOM is ready
5. `React app rendered successfully` - Confirms React mounted
6. `=== Notification Hub Panel Ready ===` - Confirms full initialization

**If React fails**: Check:
- Error logs for SDK initialization issues
- Error UI rendered in the panel
- Console errors from React or dependencies

### Step 4: Check Timing Information

All initialization steps include timing:
- `SDK initialized successfully in XXms` - Should be < 1000ms typically
- `Loaded XX notifications in XXms` - Network request timing
- Performance issues will be evident from these logs

### Step 5: Check Error Details

All errors now include:
- Timestamp
- Error message
- Error name and type
- Stack trace (where applicable)
- Context information (what was being attempted)

## Log Format

All logs follow this format:

```
[TIMESTAMP] [COMPONENT] MESSAGE DATA
```

Examples:
```
[2026-02-13T01:15:23.456Z] [Notification Hub Action] SDK initialized successfully in 245ms
[2026-02-13T01:15:23.789Z] [Notification Hub Panel] Extension Context: {id: "...", ...}
[2026-02-13T01:15:24.123Z] [NotificationService] Fetched 5 mentions, 3 PR comments, 12 work item updates
```

## Known Success Patterns

When the extension loads successfully, you should see this sequence:

### Action Handler (action.html)
```
[Notification Hub Action] === Notification Hub Action Starting ===
[Notification Hub Action] Document readyState: complete
[Notification Hub Action] Initializing Azure DevOps SDK...
[Notification Hub Action] SDK initialized successfully in XXms
[Notification Hub Action] Extension Context: {...}
[Notification Hub Action] Current Contribution ID: notification-hub-publisher.notification-hub.notification-hub-header-action
[Notification Hub Action] Azure DevOps Host: {...}
[Notification Hub Action] Current User: {...}
[Notification Hub Action] Registering action handler...
[Notification Hub Action] ✓ Action handler registered successfully
[Notification Hub Action] ✓ Notified SDK of successful load
[Notification Hub Action] === Notification Hub Action Ready ===
```

### Panel (main.tsx + components) - After clicking bell
```
[Notification Hub Panel] === Notification Hub Panel Starting ===
[Notification Hub Panel] Document readyState: interactive
[Notification Hub Panel] Initializing Azure DevOps SDK...
[Notification Hub Panel] SDK initialized successfully in XXms
[Notification Hub Panel] Extension Context: {...}
[Notification Hub Panel] Current Contribution ID: notification-hub-publisher.notification-hub.notification-hub-panel
[Notification Hub Panel] Root element found, rendering React app...
[Notification Hub Panel] ✓ React app rendered successfully
[Notification Hub Panel] ✓ Notified SDK of successful load
[Notification Hub Panel] === Notification Hub Panel Ready ===
[Notification Hub App] App component initializing...
[NotificationPanel] NotificationPanel mounted. isOpen: true
[NotificationPanel] Panel visibility changed. isOpen: true
[NotificationPanel] Panel is open, triggering notification load
[NotificationPanel] Starting to load notifications...
[NotificationService] Starting to fetch notifications
[NotificationService] Fetching notifications for project: ProjectName (...)
[NotificationService] Fetched X mentions, Y PR comments, Z work item updates
[NotificationPanel] Loaded X notifications in XXms
[NotificationPanel] Applied filter 'all': X of X notifications shown
[NotificationPanel] Rendering panel UI
```

## Troubleshooting Tips

1. **Clear cache**: If logs show old extension IDs or versions, clear browser cache
2. **Check manifest**: Verify azure-devops-extension.json has correct contribution IDs
3. **Verify build**: Ensure the dist folder contains the latest built files
4. **Check installation**: Verify the extension is installed and enabled in Azure DevOps
5. **Browser console**: Some browsers suppress console logs - ensure they're enabled
6. **Check permissions**: Extension needs proper scopes in manifest

## Additional Resources

- [Azure DevOps Extension SDK Documentation](https://learn.microsoft.com/en-us/azure/devops/extend/)
- [Extension Manifest Reference](https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest)
- Repository: `/azure-devops-extension.json` - Extension manifest
- Repository: `/apps/notification-hub/public/action.html` - Header action handler
- Repository: `/apps/notification-hub/src/main.tsx` - Panel entry point
