# CI/CD Configuration

This directory contains GitHub Actions workflows for continuous integration and deployment of Azure DevOps extensions.

**Note**: This configuration is set up for the `archubbuck` organization. If you're using a different organization, you'll need to update the `ORGANIZATION_NAME` environment variable in `.github/workflows/cd.yml` and replace references to `archubbuck` throughout this documentation with your organization name.

## Workflows

### CI Workflow (`ci.yml`)

**Trigger**: Pull requests to `main` branch

**Purpose**: Validate code changes before merging

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run linting
5. Run tests
6. Build the extension
7. Upload build artifacts

### CD Workflow (`cd.yml`)

**Trigger**: 
- Push to `main` branch
- Manual workflow dispatch

**Purpose**: Automatically build, package, and publish extensions to Azure DevOps for testing

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Build the extension
5. Install TFX CLI
6. Create extension package (.vsix)
7. Publish to Azure DevOps marketplace
8. Upload package artifacts
9. Create release summary

## Setup Instructions

### Prerequisites

Before the workflows can publish extensions, you need to configure secrets in your GitHub repository:

### Required Secrets

1. **`AZURE_DEVOPS_PAT`** (Required for publishing)
   - Personal Access Token from Azure DevOps
   - Must have **Marketplace (publish)** scope
   - Create at: https://dev.azure.com/{your-organization}/_usersSettings/tokens
   - For this repository: https://dev.azure.com/archubbuck/_usersSettings/tokens

2. **`PUBLISHER_ID`** (Optional)
   - Your Azure DevOps Marketplace publisher ID
   - The workflow always uses the publisher ID from `azure-devops-extension.json`; setting this secret overrides that value during the manifest update step
   - Create/find at: https://marketplace.visualstudio.com/manage

### Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the name and value as described above

### Creating an Azure DevOps Publisher

If you don't have a publisher account:

1. Go to https://marketplace.visualstudio.com/manage
2. Click **Create Publisher**
3. Fill in the required details:
   - Publisher ID (unique identifier, lowercase with hyphens)
   - Display Name
   - Description
4. Save the publisher ID to use in GitHub secrets

### Creating a Personal Access Token (PAT)

1. Go to https://dev.azure.com/{your-organization}/_usersSettings/tokens (e.g., https://dev.azure.com/archubbuck/_usersSettings/tokens)
2. Click **New Token**
3. Configure the token:
   - Name: `GitHub Actions Extension Publisher`
   - Organization: All accessible organizations
   - Expiration: Set as needed (recommend 90 days or less)
   - Scopes: Select **Marketplace** → **Publish**
4. Click **Create**
5. Copy the token immediately (you won't see it again!)
6. Add it to GitHub secrets as `AZURE_DEVOPS_PAT`

## Usage

### Automatic Deployment

Once secrets are configured:

1. **Create a PR**: CI workflow runs automatically
   - Lints, tests, and builds your changes
   - Ensures code quality before merge

2. **Merge to main**: CD workflow runs automatically
   - Builds the extension
   - Creates a .vsix package
   - Publishes to Azure DevOps marketplace
   - Shares with the configured organization (default: `archubbuck`)

3. **Install the extension**:
   - Go to https://dev.azure.com/{your-organization}/_settings/extensions (e.g., https://dev.azure.com/archubbuck/_settings/extensions)
   - Find your extension in the list
   - Click **Install** to add it to your organization

### Manual Deployment

You can also trigger deployment manually:

1. Go to **Actions** tab in GitHub
2. Select **CD - Publish Extension** workflow
3. Click **Run workflow**
4. Select the branch (usually `main`)
5. Click **Run workflow**

## Extension Versioning

The extension uses **automatic versioning** to prevent version conflicts during publishing.

### Versioning Strategy

**Format**: `MAJOR.MINOR.PATCH` (semantic versioning)

- **MAJOR.MINOR**: Manually controlled in `azure-devops-extension.json`
- **PATCH**: Automatically generated based on git commit count during CD workflow

### How It Works

The CD workflow automatically updates the version before publishing:

1. Reads the current `MAJOR.MINOR` from `azure-devops-extension.json`
2. Calculates `PATCH` version using `git rev-list --count HEAD`
3. Updates manifest with new version (e.g., `1.0.5`)
4. Packages and publishes with the new version

This ensures:
- Each deployment has a unique version number
- No manual version bumping required
- Prevents "Version number must increase" errors from Azure DevOps marketplace

### Manual Version Updates

To manually update the version locally:

```bash
npm run update-version
```

### Incrementing Major or Minor Version

To release a new major or minor version:

1. Update the version in `azure-devops-extension.json`:
   ```json
   {
     "version": "2.0.0",
     ...
   }
   ```
   
2. Follow [semantic versioning](https://semver.org/):
   - **Major** (1.0.x → 2.0.0): Breaking changes
   - **Minor** (1.0.x → 1.1.0): New features (backward compatible)

3. Commit and push to `main` branch
4. The CD workflow will automatically set the patch version and publish (e.g., `2.0.15`)

### Handling Version Conflicts

If you encounter "Version number must increase" errors during publishing:

**Cause**: This typically happens when:
- The git history has been rewritten (rebased, grafted, or shallow cloned)
- The commit count no longer matches the published version history
- The calculated PATCH version is less than or equal to an already-published version

**Solution**: Increment the MINOR or MAJOR version in `azure-devops-extension.json`:

```json
{
  "version": "1.1.0",  // Changed from 1.0.x
  ...
}
```

This ensures the next automatic version (e.g., `1.1.2`) will be higher than any previously published version in the 1.0.x series.

## Troubleshooting

### Workflow fails with "Publisher not found"

- Ensure `PUBLISHER_ID` secret is set correctly
- Verify the publisher exists at https://marketplace.visualstudio.com/manage

### Workflow fails with "Authentication failed"

- Check that `AZURE_DEVOPS_PAT` secret is set
- Verify the token has not expired
- Ensure the token has **Marketplace (publish)** scope
- Regenerate the token if needed

### Extension doesn't appear in Azure DevOps

- Check the workflow run summary for the installation link
- Verify the extension is shared with your organization (check the `ORGANIZATION_NAME` in the workflow)
- Go to https://dev.azure.com/{your-organization}/_settings/extensions
- You may need to refresh the page or wait a few minutes

### Build fails during CI

- Check the workflow logs for specific errors
- Run `npm run lint`, `npm run test`, and `npm run build` locally
- Fix any issues and push changes

## Monitoring

### Viewing Workflow Runs

1. Go to the **Actions** tab in your GitHub repository
2. Click on a workflow run to see details
3. Review logs for each step
4. Check the summary for deployment information

### Extension Management

Monitor your extensions at:
- **Marketplace Management**: https://marketplace.visualstudio.com/manage
- **Organization Extensions**: https://dev.azure.com/{your-organization}/_settings/extensions

## Security Notes

- Never commit PATs or secrets to the repository
- Rotate PATs regularly (recommended: every 90 days)
- Use the minimum required scopes for PATs
- Review who has access to repository secrets
- Audit workflow runs regularly

## Advanced Configuration

### Publishing to Multiple Organizations

To share with multiple organizations, modify the `cd.yml` workflow:

```yaml
run: |
  tfx extension publish \
    --manifest-globs azure-devops-extension.json \
    --share-with org1 org2 org3 \
    --token $AZURE_DEVOPS_PAT \
    --no-prompt
```

### Custom Build Steps

Add custom build steps in the workflow before packaging:

```yaml
- name: Custom build step
  run: npm run custom-script

- name: Create extension package
  run: tfx extension create ...
```

### Environment-Specific Deployments

Create separate workflows for staging/production:

- `cd-staging.yml`: Deploy to test organization
- `cd-production.yml`: Deploy to production organization

Use different secrets for each environment.

## Additional Resources

- [Azure DevOps Extension Documentation](https://learn.microsoft.com/en-us/azure/devops/extend/)
- [TFX CLI Documentation](https://github.com/microsoft/tfs-cli)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
