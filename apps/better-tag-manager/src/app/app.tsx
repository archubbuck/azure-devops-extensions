import { useEffect, useState, useCallback, useRef } from 'react';
import * as SDK from 'azure-devops-extension-sdk';
import { getClient, IProjectPageService } from 'azure-devops-extension-api';
import { WorkItemTrackingRestClient } from 'azure-devops-extension-api/WorkItemTracking';
import './app.css';

interface Tag {
  id: string;
  name: string;
  active: boolean;
  lastUpdated?: string;
}

interface ProjectInfo {
  id: string;
  name: string;
}

interface AppProps {
  onReady?: () => void;
}

export function App({ onReady }: AppProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [renameTagId, setRenameTagId] = useState<string | null>(null);
  const [renameTagName, setRenameTagName] = useState('');
  const [projectName, setProjectName] = useState('');
  const hasNotifiedReady = useRef(false);

  // Fetch tags from Azure DevOps
  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const client = getClient(WorkItemTrackingRestClient);
      
      // Get project information using the project page service
      const projectService = await SDK.getService<IProjectPageService>('ms.vss-tfs-web.tfs-page-data-service');
      const project = await projectService.getProject();
      
      if (!project) {
        throw new Error('Unable to determine current project');
      }
      
      const projectInfo: ProjectInfo = { id: project.id, name: project.name };
      setProjectName(projectInfo.name);
      
      // Notify ready immediately after we have project info - UI is visible now
      if (!hasNotifiedReady.current && onReady) {
        hasNotifiedReady.current = true;
        onReady();
      }

      // Get all tags from the project
      const workItemTags = await client.getTags(projectInfo.id);
      
      const tagList: Tag[] = workItemTags.map((tag) => ({
        id: tag.id || tag.name,
        name: tag.name,
        active: tag.active !== false,
        lastUpdated: tag.lastUpdated?.toISOString(),
      }));

      setTags(tagList);
      setFilteredTags(tagList);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tags');
      setLoading(false);
      
      // Still notify ready even on error so the extension doesn't hang
      if (!hasNotifiedReady.current && onReady) {
        hasNotifiedReady.current = true;
        onReady();
      }
    }
  }, [onReady]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Filter tags based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTags(tags);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tags.filter((tag) =>
        tag.name.toLowerCase().includes(query)
      );
      setFilteredTags(filtered);
    }
  }, [searchQuery, tags]);

  // Toggle tag selection
  const toggleTagSelection = (tagId: string) => {
    const newSelection = new Set(selectedTags);
    if (newSelection.has(tagId)) {
      newSelection.delete(tagId);
    } else {
      newSelection.add(tagId);
    }
    setSelectedTags(newSelection);
  };

  // Create a new tag
  // Note: In Azure DevOps, tags are automatically created when assigned to work items.
  // This implementation adds the tag to local state only. In a production implementation,
  // you would create or update a work item with this tag to persist it to Azure DevOps.
  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      return;
    }

    try {
      const tagName = newTagName.trim();
      
      // For demonstration purposes, add to local state
      // TODO: In production, create/update a work item with this tag to persist it
      const newTag: Tag = {
        id: `tag-${Date.now()}`,
        name: tagName,
        active: true,
        lastUpdated: new Date().toISOString(),
      };
      
      setTags(prevTags => [...prevTags, newTag]);
      setNewTagName('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create tag:', err);
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    }
  };

  // Rename a tag
  // Note: Azure DevOps REST API doesn't support direct tag renaming.
  // This implementation updates local state only. In a production implementation,
  // you would need to update all work items that have the old tag to use the new tag name.
  const handleRenameTag = async () => {
    if (!renameTagId || !renameTagName.trim()) {
      return;
    }

    try {
      // For demonstration purposes, update in local state
      // TODO: In production, update all work items with the old tag to use the new tag name
      setTags(prevTags => prevTags.map(tag => 
        tag.id === renameTagId 
          ? { ...tag, name: renameTagName.trim(), lastUpdated: new Date().toISOString() }
          : tag
      ));
      
      setRenameTagId(null);
      setRenameTagName('');
      setShowRenameModal(false);
      setSelectedTags(new Set());
    } catch (err) {
      console.error('Failed to rename tag:', err);
      setError(err instanceof Error ? err.message : 'Failed to rename tag');
    }
  };

  // Delete selected tags
  // Note: Azure DevOps REST API doesn't support direct tag deletion.
  // This implementation updates local state only. In a production implementation,
  // you would need to remove the tags from all work items that use them.
  const handleDeleteTags = async () => {
    if (selectedTags.size === 0) {
      return;
    }

    setShowDeleteModal(true);
  };

  const confirmDeleteTags = async () => {
    try {
      // For demonstration purposes, update in local state
      // TODO: In production, remove the tags from all work items that use them
      setTags(prevTags => prevTags.filter(tag => !selectedTags.has(tag.id)));
      setSelectedTags(new Set());
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Failed to delete tags:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete tags');
    }
  };

  // Start renaming a tag
  const startRename = () => {
    if (selectedTags.size !== 1) {
      return;
    }
    
    const tagId = Array.from(selectedTags)[0];
    const tag = tags.find(t => t.id === tagId);
    
    if (tag) {
      setRenameTagId(tag.id);
      setRenameTagName(tag.name);
      setShowRenameModal(true);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="header">
          <h1>Work Item Tag Manager</h1>
          <p>Manage tags for work items in {projectName || 'your project'}</p>
        </div>

        {error && (
          <div className="error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="stats">
          <div className="stat-card">
            {/* Using skeleton-text class which makes text transparent via CSS */}
            <div className="stat-value skeleton-text" aria-hidden="true">...</div>
            <div className="stat-label">Total Tags</div>
          </div>
          <div className="stat-card">
            <div className="stat-value skeleton-text" aria-hidden="true">...</div>
            <div className="stat-label">Active Tags</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">0</div>
            <div className="stat-label">Selected</div>
          </div>
        </div>

        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search tags..."
            disabled={true}
          />
        </div>

        <div className="actions">
          <button className="btn btn-primary" disabled={true}>
            Create Tag
          </button>
          <button className="btn" disabled={true}>
            Rename
          </button>
          <button className="btn btn-danger" disabled={true}>
            Delete (0)
          </button>
          <button className="btn" disabled={true}>
            Refresh
          </button>
        </div>

        <div className="tags-grid">
          <div className="skeleton-tag-card"></div>
          <div className="skeleton-tag-card"></div>
          <div className="skeleton-tag-card"></div>
          <div className="skeleton-tag-card"></div>
          <div className="skeleton-tag-card"></div>
          <div className="skeleton-tag-card"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>Work Item Tag Manager</h1>
        <p>Manage tags for work items in {projectName || 'your project'}</p>
      </div>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="stats">
        <div className="stat-card">
          <div className="stat-value">{tags.length}</div>
          <div className="stat-label">Total Tags</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{tags.filter(t => t.active).length}</div>
          <div className="stat-label">Active Tags</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{selectedTags.size}</div>
          <div className="stat-label">Selected</div>
        </div>
      </div>

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          Create Tag
        </button>
        <button
          className="btn"
          onClick={startRename}
          disabled={selectedTags.size !== 1}
        >
          Rename
        </button>
        <button
          className="btn btn-danger"
          onClick={handleDeleteTags}
          disabled={selectedTags.size === 0}
        >
          Delete ({selectedTags.size})
        </button>
        <button className="btn" onClick={fetchTags}>
          Refresh
        </button>
      </div>

      {filteredTags.length === 0 ? (
        <div className="empty-state">
          <h2>{searchQuery ? 'No tags found' : 'No tags yet'}</h2>
          <p>
            {searchQuery
              ? 'Try a different search query'
              : 'Create your first tag to get started'}
          </p>
        </div>
      ) : (
        <div className="tags-grid">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className={`tag-card ${selectedTags.has(tag.id) ? 'selected' : ''}`}
              onClick={() => toggleTagSelection(tag.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleTagSelection(tag.id);
                }
              }}
            >
              <div className="tag-name">{tag.name}</div>
              <div className="tag-details">
                {tag.active ? '✓ Active' : '✗ Inactive'}
                {tag.lastUpdated && (
                  <> · {new Date(tag.lastUpdated).toLocaleDateString()}</>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Tag Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Tag</h2>
            <div className="form-group">
              <label htmlFor="tagName">Tag Name</label>
              <input
                id="tagName"
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Enter tag name..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateTag();
                  }
                }}
              />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Tag Modal */}
      {showRenameModal && (
        <div className="modal-overlay" onClick={() => setShowRenameModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Rename Tag</h2>
            <div className="form-group">
              <label htmlFor="renameTagName">New Tag Name</label>
              <input
                id="renameTagName"
                type="text"
                value={renameTagName}
                onChange={(e) => setRenameTagName(e.target.value)}
                placeholder="Enter new tag name..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameTag();
                  }
                }}
              />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowRenameModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleRenameTag}
                disabled={!renameTagName.trim()}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Tags</h2>
            <p>Are you sure you want to delete {selectedTags.size} tag(s)?</p>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDeleteTags}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
