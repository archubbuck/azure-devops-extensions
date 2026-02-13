# Azure DevOps Extensions

This repository is an Nx-powered monorepo engineered to develop and scale multiple enterprise-grade Azure DevOps extensions. By utilizing a React and TypeScript architecture, it provides a unified development environment for building native-looking UI contributions that integrate seamlessly with the Azure DevOps web interface.

## Project Overview

This monorepo currently contains two extensions:

### 1. Notification Hub

A centralized notification hub for Azure DevOps that aggregates activity across your projects.

**Features:**
- 🔔 **Global Bell Icon**: Accessible from the Azure DevOps header with unread count badge
- 📱 **Side Panel Activity Feed**: Slide-out panel displaying all your notifications
- 💬 **@Mentions**: Get notified when someone mentions you in work items or pull requests
- 🗨️ **PR Comments**: Track new comments on your pull requests
- 📋 **Work Item Updates**: Stay informed about state changes and assignments
- ✅ **Mark as Read**: Mark individual or all notifications as read
- 🔍 **Filters**: Filter notifications by type (All, Unread, Mentions, PRs, Work Items)
- 🔗 **Deep Links**: Click any notification to navigate directly to the artifact

### 2. Hello Azure DevOps

A basic Azure DevOps extension that demonstrates automated deployment via CI/CD pipeline.

**Features:**
- 👋 **Simple Hub**: A clean welcome page accessible from the project admin hub group
- 📋 **User Information**: Displays current user and host information
- ✓ **Deployment Status**: Shows extension version and deployment status
- 🎨 **Modern UI**: Clean, gradient-based design with responsive layout

This extension serves as a minimal example following Azure DevOps best practices and can be used as a template for creating new extensions.

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm or yarn
- Azure DevOps account (for testing the extension)

### Installation

```bash
# Clone the repository
git clone https://github.com/archubbuck/azure-devops-extensions.git
cd azure-devops-extensions

# Install dependencies
npm install
```

### Development

```bash
# Build all extensions
npm run build

# Build individual extensions
npm run build:notification-hub
npm run build:hello-azure

# Start development server for notification-hub (default)
npm run dev

# Start development server for hello-azure
npm run dev:hello-azure

# Run linting for all extensions
npm run lint

# Run tests for all extensions
npm run test
```

**Note**: Extensions cannot run standalone in a browser because they require the Azure DevOps SDK context. See [DEPLOYMENT.md](./DEPLOYMENT.md) for instructions on packaging and testing the extensions in Azure DevOps.

### Building the Extensions

All extensions can be built and packaged as Azure DevOps extensions:

```bash
# Build all extensions
npm run build

# The built files will be in:
# - apps/notification-hub/dist/
# - apps/hello-azure/dist/
```

**Build Output**: The build process uses Nx with Vite to create optimized production bundles:
- `index.html` - Main HTML entry point
- `assets/` - JavaScript and CSS bundles
- `favicon.ico` - Extension icon
- `SDK.min.js` - Azure DevOps SDK (bundled locally to avoid CSP issues)

The build is configured in:
- `apps/*/vite.config.mts` - Vite build configuration for each extension
- `package.json` - Build scripts for all extensions
- `azure-devops-extension-*.json` - Extension manifests that reference the dist folders

### CI/CD Pipeline

This repository includes automated CI/CD workflows that support multiple extensions:

- **CI (Pull Requests)**: Automatically runs linting, tests, and builds on all PRs
- **CD (Main Branch)**: Automatically builds and publishes all extensions to https://dev.azure.com/archubbuck/

#### Improved Deployment Patterns

The deployment pipeline uses intelligent patterns to prevent failures and optimize publishing:

**Key Features:**
- 🔍 **Marketplace Version Detection**: Checks current published versions before deploying
- ⏭️ **Conditional Publishing**: Skips extensions that are already up-to-date
- 🔄 **Smart Retry Logic**: Distinguishes between retryable and non-retryable errors
- 📊 **Enhanced Reporting**: Clear status for each extension (success/skipped/failed)

**How it works:**
1. Query Azure DevOps Marketplace for current versions
2. Compare with local versions
3. Only publish if local version is newer
4. Skip unchanged extensions automatically
5. Retry only on transient errors (network issues)

For detailed information, see [Deployment Patterns Documentation](docs/DEPLOYMENT_PATTERNS.md).

#### Automatic Versioning

All extensions use automatic versioning to prevent version conflicts during publishing:

- **Format**: `MAJOR.MINOR.PATCH` (semantic versioning)
- **MAJOR.MINOR**: Manually controlled in each `azure-devops-extension-*.json` file
- **PATCH**: Auto-generated based on git commit count during CI/CD
- **Version Floor**: Ensures versions never decrease (uses `Math.max()`)
- **Marketplace Sync**: Checks published version and bumps if needed

To manually update versions for all extensions locally:
```bash
npm run update-version
```

The CD pipeline automatically updates all extension versions before publishing, ensuring each deployment has unique version numbers.

#### Multi-Extension Deployment

When changes are pushed to the `main` branch:
1. All extensions are built
2. Versions are automatically updated based on git commit count and marketplace check
3. Each extension is packaged into a separate `.vsix` file
4. Extensions are conditionally published (only if version increased)
5. Successful extensions are automatically shared with the `archubbuck` organization

To set up automated publishing:
1. Configure required secrets in GitHub (see [.github/workflows/README.md](.github/workflows/README.md))
2. Push changes to `main` branch
3. Extensions automatically publish to Azure DevOps (if versions changed)

### Extension Manifests

Each extension has its own manifest file:
- `azure-devops-extension-notification-hub.json` - Notification Hub extension
- `azure-devops-extension-hello-azure.json` - Hello Azure DevOps extension

These files define:
- Extension metadata (name, description, version)
- Contributions (hubs, actions, panels, etc.)
- Required scopes
- File paths for deployment

For detailed instructions on packaging and deploying the extension, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Project Structure

```
azure-devops-extensions/
├── apps/
│   ├── hello-azure/                # Hello Azure DevOps extension
│   │   ├── src/
│   │   │   ├── app/                # Main app component
│   │   │   │   ├── app.tsx         # App component
│   │   │   │   └── app.css         # App styles
│   │   │   ├── main.tsx            # Entry point with SDK initialization
│   │   │   └── styles.css          # Global styles
│   │   ├── public/                 # Static assets
│   │   │   ├── SDK.min.js          # Azure DevOps SDK
│   │   │   └── favicon.ico         # Extension icon
│   │   ├── vite.config.mts         # Vite configuration
│   │   └── dist/                   # Built output (ignored by git)
│   └── notification-hub/           # Legacy notification hub app
├── azure-devops-extension.json     # Extension manifest
├── nx.json                         # Nx configuration
└── package.json                    # Root package.json
```

## Extension Architecture

### Hello Azure DevOps Extension

A simple hub contribution that demonstrates:
- Azure DevOps SDK initialization with proper logging
- User and host information retrieval
- Extension context access
- Clean React component structure
- Modern styling with CSS

The extension is configured as a hub contribution in the project admin hub group, making it accessible from the project settings area in Azure DevOps.

## Technology Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Nx 22.5 with Vite
- **Azure DevOps SDK**: v4.2.0
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint with TypeScript support
- **Package Manager**: npm

## Contributing

When adding new features or fixes:

1. Follow the existing code structure and patterns
2. Use TypeScript for type safety
3. Add appropriate tests
4. Update documentation as needed
5. Follow the Azure DevOps extension guidelines

## License

MIT
