# Azure DevOps Extensions

This repository is an Nx-powered monorepo engineered to develop and scale multiple enterprise-grade Azure DevOps extensions. By utilizing a React and TypeScript architecture, it provides a unified development environment for building native-looking UI contributions that integrate seamlessly with the Azure DevOps web interface.

## Project Overview

This monorepo currently contains:

### The Notification Hub

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

The Notification Hub can be built and packaged as an Azure DevOps extension:

```bash
# Build the application
npm run build

# The built files will be in apps/notification-hub/dist/
```

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
│   └── notification-hub/          # The Notification Hub React app
│       ├── src/
│       │   ├── app/                # Main app component
│       │   ├── components/         # React components
│       │   │   ├── NotificationBell.tsx
│       │   │   ├── NotificationItem.tsx
│       │   │   └── NotificationPanel.tsx
│       │   ├── services/           # API services
│       │   │   └── notification.service.ts
│       │   ├── types/              # TypeScript types
│       │   │   └── notification.ts
│       │   ├── main.tsx            # Entry point with SDK initialization
│       │   └── styles.css          # Global styles
│       ├── public/                 # Static assets
│       └── dist/                   # Built output
├── azure-devops-extension.json    # Extension manifest
├── nx.json                        # Nx configuration
└── package.json                   # Root package.json
```

## Notification Hub Architecture

### Components

1. **NotificationBell**: A bell icon component with badge count displayed in the header
2. **NotificationPanel**: A side panel that slides in from the right showing all notifications
3. **NotificationItem**: Individual notification card with metadata and actions

### Services

- **NotificationService**: Singleton service that:
  - Fetches notifications from Azure DevOps REST APIs
  - Aggregates @mentions from work items
  - Collects PR comments where user is mentioned
  - Tracks work item updates (assignments, state changes)
  - Manages read/unread state with localStorage
  - Provides filtering capabilities

### Azure DevOps SDK Integration

The extension uses `azure-devops-extension-sdk` to:
- Initialize and authenticate with Azure DevOps
- Access REST API clients for Work Item Tracking and Git
- Apply Azure DevOps theme to the UI
- Navigate to artifacts via deep links

### Data Flow

1. App initializes and SDK authenticates
2. NotificationService fetches data from multiple sources in parallel
3. Notifications are aggregated, sorted by timestamp
4. UI components display notifications with filters
5. User interactions (mark as read, click) update state
6. State persists to localStorage for offline access

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
