# Azure DevOps Extensions

This repository is an Nx-powered monorepo engineered to develop and scale multiple enterprise-grade Azure DevOps extensions. By utilizing a React and TypeScript architecture, it provides a unified development environment for building native-looking UI contributions that integrate seamlessly with the Azure DevOps web interface.

## Project Overview

This monorepo currently contains:

### Hello Azure DevOps

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
# Start the development server (note: extension requires Azure DevOps context to run)
npm run dev

# Build the project
npm run build

# Run linting
npm run lint

# Run tests
npm run test
```

**Note**: The extension cannot run standalone in a browser because it requires the Azure DevOps SDK context. See [DEPLOYMENT.md](./DEPLOYMENT.md) for instructions on packaging and testing the extension in Azure DevOps.

### Building the Extension

The extension can be built and packaged as an Azure DevOps extension:

```bash
# Build the application
npm run build

# The built files will be in apps/hello-azure/dist/
```

**Build Output**: The build process uses Nx with Vite to create an optimized production bundle in `apps/hello-azure/dist/`:
- `index.html` - Main HTML entry point
- `assets/` - JavaScript and CSS bundles
- `favicon.ico` - Extension icon
- `SDK.min.js` - Azure DevOps SDK (bundled locally to avoid CSP issues)

The build is configured in:
- `apps/hello-azure/vite.config.mts` - Vite build configuration
- `package.json` - Build script that runs: `npx nx build @hello-azure/hello-azure`
- `azure-devops-extension.json` - Extension manifest that references the dist folder

### CI/CD Pipeline

This repository includes automated CI/CD workflows:

- **CI (Pull Requests)**: Automatically runs linting, tests, and builds on all PRs
- **CD (Main Branch)**: Automatically publishes extension updates to https://dev.azure.com/archubbuck/

#### Automatic Versioning

The extension uses automatic versioning to prevent version conflicts during publishing:

- **Format**: `MAJOR.MINOR.PATCH` (semantic versioning)
- **MAJOR.MINOR**: Manually controlled in `azure-devops-extension.json`
- **PATCH**: Auto-generated based on git commit count during CI/CD

To manually update the version locally:
```bash
npm run update-version
```

The CD pipeline automatically updates the version before publishing, ensuring each deployment has a unique version number.

To set up automated publishing:
1. Configure required secrets in GitHub (see [.github/workflows/README.md](.github/workflows/README.md))
2. Push changes to `main` branch
3. Extension automatically publishes to Azure DevOps

### Extension Manifest

The extension manifest is located at `azure-devops-extension.json`. This file defines:
- Extension metadata (name, description, version)
- Contributions (header action, panel)
- Required scopes (work items, code, notifications)
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
