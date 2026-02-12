# Deploying the Notification Hub Extension

## Overview

The Notification Hub is an Azure DevOps extension that must be packaged and installed into Azure DevOps to function properly. It cannot run standalone as it depends on the Azure DevOps SDK and APIs.

## Automated Deployment (Recommended)

This repository includes GitHub Actions workflows for automated CI/CD. When you push to the `main` branch, the extension is automatically built, packaged, and published to Azure DevOps.

**Quick Setup**:
1. Configure GitHub secrets (see [.github/workflows/README.md](.github/workflows/README.md))
2. Push changes to `main` branch
3. Extension automatically publishes to https://dev.azure.com/archubbuck/

For detailed CI/CD setup instructions, see [.github/workflows/README.md](.github/workflows/README.md).

## Manual Deployment

If you need to deploy manually, follow these steps:

### Prerequisites

1. **TFX CLI**: Install the Azure DevOps extension packaging tool
   ```bash
   npm install -g tfx-cli
   ```

2. **Publisher Account**: Create a publisher account on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)

3. **Personal Access Token (PAT)**: Generate a PAT with the "Marketplace (publish)" scope from your Azure DevOps organization

## Packaging the Extension

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Update Extension Manifest**
   
   Edit `azure-devops-extension.json` and update the `publisher` field with your publisher ID:
   ```json
   {
     "publisher": "your-publisher-id",
     ...
   }
   ```

3. **Package the Extension**
   ```bash
   tfx extension create --manifest-globs azure-devops-extension.json
   ```

   This creates a `.vsix` file in the root directory.

## Installing the Extension

### Option 1: Install to Your Organization (Recommended for Testing)

1. Go to your Azure DevOps organization: `https://dev.azure.com/{your-org}`

2. Click the **Shopping bag** icon in the top-right corner

3. Select **Manage extensions**

4. Click **Upload new extension**

5. Select the `.vsix` file you created

6. Once uploaded, click **Install** and select the organization(s) where you want to install it

### Option 2: Publish to the Marketplace

1. **Login to TFX CLI**
   ```bash
   tfx login --service-url https://marketplace.visualstudio.com --token YOUR_PAT
   ```

2. **Publish the Extension**
   ```bash
   tfx extension publish --manifest-globs azure-devops-extension.json --share-with your-org-name
   ```

3. The extension will be available in the marketplace (privately shared with your organization)

## Using the Extension

Once installed:

1. Navigate to any project in your Azure DevOps organization

2. Look for the **bell icon** (🔔) in the global header toolbar (top-right area)

3. Click the bell icon to open the Notification Hub side panel

4. The panel will show:
   - @mentions from work items and pull requests
   - Pull request comments
   - Work item updates (assignments, state changes)

5. Click any notification to navigate to the related artifact

6. Use the filter tabs to view specific types of notifications

7. Click "Mark all as read" to clear unread badges

## Configuration

### Updating the Extension

1. Increment the version in `azure-devops-extension.json`
2. Rebuild: `npm run build`
3. Repackage: `tfx extension create --manifest-globs azure-devops-extension.json`
4. Update the extension in the marketplace or your organization

### Customization

- **Notification types**: Modify `src/types/notification.ts` to add new notification types
- **API queries**: Update `src/services/notification.service.ts` to change what notifications are fetched
- **UI styling**: Edit CSS files in `src/components/` to customize the look and feel
- **Polling interval**: Change the refresh interval in `src/app/app.tsx` (default: 60 seconds)

## Troubleshooting

### Extension Not Showing Up

- Verify the extension is installed for your organization
- Check that you have the necessary permissions to view work items and repositories
- Refresh the Azure DevOps page

### No Notifications Appearing

- Ensure you have recent activity in your projects (@mentions, PR comments, work item updates)
- Check browser console for API errors
- Verify the required scopes are granted: `vso.work`, `vso.code`, `vso.notification`

### Performance Issues

- The extension fetches data from multiple APIs in parallel
- Reduce the number of items fetched by modifying the `.slice()` limits in the notification service
- Consider implementing pagination for large datasets

## Security Notes

- The extension uses the current user's permissions to access Azure DevOps APIs
- No data is stored on external servers - all data remains within Azure DevOps
- Read state is stored in browser localStorage
- The extension requires read-only access to work items, repositories, and pull requests

## Development Mode

Note: The extension cannot run standalone via `npm run dev` because it requires the Azure DevOps SDK context. For development:

1. Make code changes
2. Build: `npm run build`
3. Package: `tfx extension create --manifest-globs azure-devops-extension.json`
4. Update in Azure DevOps (uninstall + reinstall for fastest testing)

For faster iteration, consider:
- Using browser DevTools to debug the running extension
- Testing with a development Azure DevOps organization
- Using the `--override` flag with TFX CLI for version updates
