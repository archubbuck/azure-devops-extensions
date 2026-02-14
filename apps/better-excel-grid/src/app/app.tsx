import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import * as SDK from 'azure-devops-extension-sdk';
import { getClient, IProjectPageService } from 'azure-devops-extension-api';
import { WorkItemTrackingRestClient, WorkItem } from 'azure-devops-extension-api/WorkItemTracking';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridReadyEvent, CellEditingStoppedEvent } from 'ag-grid-community';
import DOMPurify from 'dompurify';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './app.css';

interface AppProps {
  onReady?: () => void;
}

interface WorkItemRow {
  id: number;
  title: string;
  workItemType: string;
  state: string;
  assignedTo?: string;
  description?: string;
  tags?: string;
  priority?: number;
  [key: string]: unknown;
}

interface OfflineChange {
  id: number;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: number;
}

const STORAGE_KEY = 'excel-grid-offline-changes';
const DATA_CACHE_KEY = 'excel-grid-cached-data';
const MAX_WORK_ITEMS_TO_LOAD = 10000;
const API_BATCH_SIZE = 200;

export function App({ onReady }: AppProps) {
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [offlineChanges, setOfflineChanges] = useState<OfflineChange[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const hasNotifiedReady = useRef(false);
  const gridRef = useRef<AgGridReact>(null);
  const workItemClientRef = useRef<WorkItemTrackingRestClient | null>(null);
  const projectIdRef = useRef<string>('');

  // Load offline changes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setOfflineChanges(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load offline changes:', err);
    }
  }, []);

  // Save offline changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(offlineChanges));
    } catch (err) {
      console.error('Failed to save offline changes:', err);
    }
  }, [offlineChanges]);

  // Sync offline changes to server - memoized to prevent recreation on every render
  const syncOfflineChanges = useCallback(async () => {
    if (!isOnline || offlineChanges.length === 0 || syncing) return;
    
    setSyncing(true);
    const client = workItemClientRef.current;
    if (!client) {
      setSyncing(false);
      return;
    }

    const successfulSyncs: number[] = [];
    
    for (let i = 0; i < offlineChanges.length; i++) {
      const change = offlineChanges[i];
      try {
        const document = [
          {
            op: 'replace',
            path: `/fields/${change.field}`,
            value: change.newValue,
          },
        ];

        await client.updateWorkItem(document, change.id);
        successfulSyncs.push(i);
        console.log(`Synced change for work item ${change.id}`);
      } catch (err) {
        console.error(`Failed to sync change for work item ${change.id}:`, err);
      }
    }

    // Remove successfully synced changes
    if (successfulSyncs.length > 0) {
      setOfflineChanges((prev) => prev.filter((_, index) => !successfulSyncs.includes(index)));
    }

    setSyncing(false);
  }, [isOnline, offlineChanges, syncing]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Connection restored - syncing pending changes...');
    };
    const handleOffline = () => {
      setIsOnline(false);
      console.log('Connection lost - changes will be queued for sync');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // When online and there are offline changes, sync them after state updates
  useEffect(() => {
    if (isOnline && offlineChanges.length > 0 && !syncing) {
      syncOfflineChanges();
    }
  }, [isOnline, offlineChanges, syncing, syncOfflineChanges]);

  // Column definitions for AG Grid with editable cells
  const columnDefs = useMemo<ColDef<WorkItemRow>[]>(
    () => [
      {
        field: 'id',
        headerName: 'ID',
        width: 100,
        pinned: 'left',
        editable: false,
        filter: 'agNumberColumnFilter',
      },
      {
        field: 'workItemType',
        headerName: 'Type',
        width: 120,
        editable: false,
        filter: 'agTextColumnFilter',
      },
      {
        field: 'title',
        headerName: 'Title',
        width: 300,
        editable: true,
        filter: 'agTextColumnFilter',
        cellEditor: 'agTextCellEditor',
      },
      {
        field: 'state',
        headerName: 'State',
        width: 150,
        editable: true,
        filter: 'agTextColumnFilter',
        cellEditor: 'agTextCellEditor',
      },
      {
        field: 'assignedTo',
        headerName: 'Assigned To',
        width: 200,
        editable: true,
        filter: 'agTextColumnFilter',
        cellEditor: 'agTextCellEditor',
      },
      {
        field: 'tags',
        headerName: 'Tags',
        width: 200,
        editable: true,
        filter: 'agTextColumnFilter',
        cellEditor: 'agTextCellEditor',
      },
      {
        field: 'priority',
        headerName: 'Priority',
        width: 100,
        editable: true,
        filter: 'agNumberColumnFilter',
        cellEditor: 'agNumberCellEditor',
      },
      {
        field: 'description',
        headerName: 'Description',
        width: 400,
        editable: true,
        filter: 'agTextColumnFilter',
        cellEditor: 'agLargeTextCellEditor',
        cellEditorParams: {
          maxLength: 10000,
          rows: 10,
          cols: 50,
        },
        cellRenderer: (params: { value?: string }) => {
          if (!params.value) return '';
          // Use DOMPurify to safely sanitize HTML content
          const sanitized = DOMPurify.sanitize(params.value, {
            ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'a'],
            ALLOWED_ATTR: ['href', 'title'],
            ALLOW_DATA_ATTR: false,
          });
          // Return text content for display in grid
          const div = document.createElement('div');
          div.innerHTML = sanitized;
          return div.textContent || div.innerText || '';
        },
      },
    ],
    []
  );

  // Default column properties
  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      filter: true,
      floatingFilter: true,
    }),
    []
  );

  // Handle cell editing
  const onCellEditingStopped = useCallback(
    (event: CellEditingStoppedEvent<WorkItemRow>) => {
      if (!event.data || event.oldValue === event.newValue) return;

      const workItemId = event.data.id;
      const field = event.colDef.field;
      
      if (!field) return;

      // Map field names to Azure DevOps field names
      const fieldMap: Record<string, string> = {
        title: 'System.Title',
        state: 'System.State',
        assignedTo: 'System.AssignedTo',
        tags: 'System.Tags',
        priority: 'Microsoft.VSTS.Common.Priority',
        description: 'System.Description',
      };

      const azdoField = fieldMap[field] || field;

      // Store the change for offline sync
      const change: OfflineChange = {
        id: workItemId,
        field: azdoField,
        oldValue: event.oldValue,
        newValue: event.newValue,
        timestamp: Date.now(),
      };

      setOfflineChanges((prev) => [...prev, change]);
    },
    []
  );

  // Fetch work items from Azure DevOps
  const fetchWorkItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const client = getClient(WorkItemTrackingRestClient);
      workItemClientRef.current = client;
      
      // Get project information using the project page service
      const projectService = await SDK.getService<IProjectPageService>('ms.vss-tfs-web.tfs-page-data-service');
      const project = await projectService.getProject();
      
      if (!project) {
        throw new Error('Unable to determine current project');
      }
      
      projectIdRef.current = project.id;
      setProjectName(project.name);

      // Escape single quotes in the project name to safely embed it in the WIQL string literal
      const escapedProjectName = project.name.replace(/'/g, "''");
      
      // Query for work items - get a large batch (up to MAX_WORK_ITEMS_TO_LOAD)
      const wiql = {
        query: `SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.AssignedTo], [System.Tags], [System.Description], [Microsoft.VSTS.Common.Priority] FROM WorkItems WHERE [System.TeamProject] = '${escapedProjectName}' ORDER BY [System.Id] DESC`,
      };

      const queryResult = await client.queryByWiql(wiql, { project: project.name });
      
      if (!queryResult.workItems || queryResult.workItems.length === 0) {
        setWorkItems([]);
        setLoading(false);
        
        // Cache empty data
        localStorage.setItem(DATA_CACHE_KEY, JSON.stringify([]));
        
        if (!hasNotifiedReady.current && onReady) {
          hasNotifiedReady.current = true;
          onReady();
        }
        return;
      }

      // Get work item IDs (limit to MAX_WORK_ITEMS_TO_LOAD for initial load)
      const workItemIds = queryResult.workItems
        .slice(0, MAX_WORK_ITEMS_TO_LOAD)
        .map((wi) => wi.id)
        .filter((id): id is number => id !== undefined);
      
      // Batch fetch work items (API limit is API_BATCH_SIZE per request)
      const allWorkItems: WorkItem[] = [];
      
      for (let i = 0; i < workItemIds.length; i += API_BATCH_SIZE) {
        const batch = workItemIds.slice(i, i + API_BATCH_SIZE);
        const items = await client.getWorkItems(batch, undefined, undefined, undefined, project.name);
        allWorkItems.push(...items);
      }

      // Transform to grid rows
      const rows: WorkItemRow[] = allWorkItems
        .filter((wi) => wi.id !== undefined)
        .map((wi) => {
        const fields = wi.fields || {};
        return {
          id: wi.id as number,
          title: fields['System.Title'] || '',
          workItemType: fields['System.WorkItemType'] || '',
          state: fields['System.State'] || '',
          assignedTo: fields['System.AssignedTo']?.displayName || '',
          description: fields['System.Description'] || '',
          tags: fields['System.Tags'] || '',
          priority: fields['Microsoft.VSTS.Common.Priority'] || 0,
        };
      });

      setWorkItems(rows);
      setLoading(false);
      
      // Cache data for offline use
      try {
        localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(rows));
      } catch (err) {
        console.warn('Failed to cache data:', err);
      }
      
      // Notify that the app is ready after initial load
      if (!hasNotifiedReady.current && onReady) {
        hasNotifiedReady.current = true;
        onReady();
      }
    } catch (err) {
      console.error('Failed to fetch work items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load work items');
      
      // Try to load from cache
      try {
        const cached = localStorage.getItem(DATA_CACHE_KEY);
        if (cached) {
          setWorkItems(JSON.parse(cached));
          setError('Using cached data - connection unavailable');
        }
      } catch (cacheErr) {
        console.error('Failed to load cached data:', cacheErr);
      }
      
      setLoading(false);
      
      // Still notify ready even on error so the extension doesn't hang
      if (!hasNotifiedReady.current && onReady) {
        hasNotifiedReady.current = true;
        onReady();
      }
    }
  }, [onReady]);

  useEffect(() => {
    fetchWorkItems();
  }, [fetchWorkItems]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    console.log('Grid is ready with', params.api.getDisplayedRowCount(), 'rows');
  }, []);

  return (
    <div className="excel-grid-container">
      <div className="header">
        <h1>Excel-Native Web Grid</h1>
        <div className="status-bar">
          <span className="project-name">Project: {projectName}</span>
          <span className="connection-status">
            <span role="img" aria-label={isOnline ? 'Online' : 'Offline'}>
              {isOnline ? '🟢' : '🔴'}
            </span>{' '}
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {offlineChanges.length > 0 && (
            <span className="pending-changes">
              <span role="img" aria-label="Pending changes">
                ⏳
              </span>{' '}
              {offlineChanges.length} pending change{offlineChanges.length !== 1 ? 's' : ''}
            </span>
          )}
          {syncing && (
            <span className="syncing">
              <span role="img" aria-label="Syncing">
                🔄
              </span>{' '}
              Syncing...
            </span>
          )}
          <button onClick={fetchWorkItems} disabled={loading} className="refresh-btn">
            <span role="img" aria-label="Refresh">
              🔄
            </span>{' '}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          <span role="img" aria-label="Warning">
            ⚠️
          </span>{' '}
          {error}
        </div>
      )}

      {loading && workItems.length === 0 ? (
        <div className="loading-container">
          <div className="loading-spinner">Loading work items...</div>
        </div>
      ) : (
        <div className="ag-theme-alpine grid-wrapper">
          <AgGridReact
            ref={gridRef}
            rowData={workItems}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onGridReady={onGridReady}
            onCellEditingStopped={onCellEditingStopped}
            rowSelection="multiple"
            enableRangeSelection={true}
            animateRows={true}
            pagination={false}
            suppressRowClickSelection={true}
            enableCellTextSelection={true}
            domLayout="normal"
          />
        </div>
      )}

      <div className="footer">
        <div className="stats">
          Total Work Items: {workItems.length.toLocaleString()}
        </div>
        <div className="help-text">
          <span role="img" aria-label="Tip">
            💡
          </span>{' '}
          Double-click any cell to edit. Changes sync automatically when online.
        </div>
      </div>
    </div>
  );
}

export default App;
