# Work Item Tag Manager

A modern Azure DevOps extension that provides an intuitive user interface for managing work item tags.

## Features

### Tag Management
- **View All Tags**: Display all tags in your project with a modern card-based interface
- **Search & Filter**: Quickly find tags using the search functionality
- **Create Tags**: Add new tags to your project
- **Rename Tags**: Update tag names with a simple dialog
- **Delete Tags**: Remove tags with a confirmation dialog
- **Bulk Selection**: Select multiple tags for batch operations

### Statistics Dashboard
- View total number of tags in your project
- Track active tags
- Monitor currently selected tags

### Modern UI
- Responsive design that works on all screen sizes
- Clean, modern interface consistent with Azure DevOps design language
- Interactive card-based tag display
- Visual feedback for selections and actions

## Installation

This extension is part of the azure-devops-extensions monorepo. To build and deploy:

```bash
# Build the extension
npm run build:tag-manager

# Update version numbers
npm run update-version

# Package the extension (requires tfx-cli)
tfx extension create --manifest-globs azure-devops-extension-tag-manager.json --output-path ./output
```

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev:tag-manager

# Lint the code
npx nx lint @better-tag-manager/better-tag-manager

# Build for production
npm run build:tag-manager
```

### Project Structure

```
apps/better-tag-manager/
├── public/
│   ├── SDK.min.js          # Azure DevOps Extension SDK
│   └── favicon.ico         # Extension icon
├── src/
│   ├── app/
│   │   ├── app.tsx         # Main application component
│   │   └── app.css         # Application styles
│   ├── main.tsx            # Application entry point
│   └── styles.css          # Global styles
├── index.html              # HTML template
├── vite.config.mts         # Vite build configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Package metadata
```

## Technical Details

### Azure DevOps Integration

- **Hub Contribution**: Adds a "Tag Manager" hub to the Azure Boards work hub group
- **Required Scopes**: 
  - `vso.work` - Read access to work items
  - `vso.work_write` - Write access to work items
- **API Client**: Uses `WorkItemTrackingRestClient` from azure-devops-extension-api

### Implementation Notes

The extension uses the Azure DevOps REST API to interact with tags. Please note:

1. **Tag Creation**: In Azure DevOps, tags are automatically created when assigned to work items. The current implementation demonstrates the UI for tag creation, but production implementations would need to create or update a work item with the new tag to persist it.

2. **Tag Renaming**: Azure DevOps REST API doesn't support direct tag renaming. A production implementation would need to update all work items that use the old tag to use the new tag name.

3. **Tag Deletion**: Azure DevOps REST API doesn't support direct tag deletion. A production implementation would need to remove the tag from all work items that use it.

### Technology Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Linting**: ESLint with TypeScript support
- **Monorepo**: NX workspace
- **SDK**: Azure DevOps Extension SDK 4.2.0
- **API**: Azure DevOps Extension API 4.266.0

## Usage

1. Navigate to Azure Boards in your Azure DevOps project
2. Click on the "Tag Manager" hub in the work hub group
3. View all tags in your project
4. Use the search bar to filter tags
5. Click "Create Tag" to add a new tag
6. Select tags by clicking on them
7. Use "Rename" to rename a single selected tag
8. Use "Delete" to remove selected tags
9. Click "Refresh" to reload tags from the server

## Keyboard Shortcuts

- **Enter**: Submit forms (Create Tag, Rename Tag modals)
- **Space/Enter**: Select or deselect tag cards
- **Click outside modal**: Close modals (or use Cancel button)

## Browser Support

The extension supports all modern browsers that are supported by Azure DevOps:
- Chrome (latest)
- Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

MIT License - See LICENSE file in the repository root

## Contributing

This extension follows the monorepo structure. When making changes:

1. Follow the existing code style
2. Run linters before committing
3. Test your changes locally
4. Update documentation as needed

## Support

For issues, questions, or contributions, please refer to the main repository.
