import { useEffect, useState, useCallback } from 'react';
import * as SDK from 'azure-devops-extension-sdk';
import { WorkItemTrackingRestClient } from 'azure-devops-extension-api/WorkItemTracking';
import './app.css';

interface Tag {
  id: string;
  name: string;
  active: boolean;
  lastUpdated?: string;
}

export function App() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [renameTagId, setRenameTagId] = useState<string | null>(null);
  const [renameTagName, setRenameTagName] = useState('');
  const [projectName, setProjectName] = useState('');

  // Fetch tags from Azure DevOps
  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const client = SDK.getClient(WorkItemTrackingRestClient);
      const context = SDK.getConfiguration();
      const project = context.project || (await SDK.getService('ms.vss-tfs-web.tfs-page-data-service')).then((service: unknown) => (service as { getProjectInfo: () => unknown }).getProjectInfo());
      
      let projectId: string;
      if (typeof project === 'string') {
        projectId = project;
        setProjectName(project);
      } else {
        projectId = project.id;
        setProjectName(project.name);
      }

      // Get all tags from the project
      const workItemTags = await client.getTags(projectId);
      
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
    }
  }, []);

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
  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      return;
    }

    try {
      // Create the tag by creating a work item tag reference
      const tagName = newTagName.trim();
      
      // Note: In Azure DevOps, tags are created automatically when assigned to work items
      // This is a simplified approach - in a real implementation, you would need to
      // create or update a work item with this tag
      
      console.log('Creating tag:', tagName, 'for project:', projectName);
      
      // For now, add it to the local state
      const newTag: Tag = {
        id: `tag-${Date.now()}`,
        name: tagName,
        active: true,
        lastUpdated: new Date().toISOString(),
      };
      
      setTags([...tags, newTag]);
      setNewTagName('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create tag:', err);
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    }
  };

  // Rename a tag
  const handleRenameTag = async () => {
    if (!renameTagId || !renameTagName.trim()) {
      return;
    }

    try {
      // Note: Azure DevOps REST API doesn't support direct tag renaming
      // This would typically require updating all work items with the old tag
      console.log('Renaming tag:', renameTagId, 'to:', renameTagName);
      
      // Update in local state
      setTags(tags.map(tag => 
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
  const handleDeleteTags = async () => {
    if (selectedTags.size === 0) {
      return;
    }

    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to delete ${selectedTags.size} tag(s)?`)) {
      return;
    }

    try {
      // Note: Azure DevOps REST API doesn't support direct tag deletion
      // This would typically require removing the tag from all work items
      console.log('Deleting tags:', Array.from(selectedTags));
      
      // Update in local state
      setTags(tags.filter(tag => !selectedTags.has(tag.id)));
      setSelectedTags(new Set());
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
        <div className="loading">Loading tags...</div>
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
    </div>
  );
}

export default App;
