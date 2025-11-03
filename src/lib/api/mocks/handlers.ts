import { http, HttpResponse, type HttpHandler } from 'msw';
import { API_CONFIG } from '~/lib/api/config';

// Base URL pattern that matches the API configuration
// Use the same base URL as the API client for consistency

const { baseUrl, mockMode } = API_CONFIG;
const MOCK_ASSET_BASE = '/mock/ws/v1/cluster';

const staticHandlers: HttpHandler[] = [
  // Scheduler endpoints - serve local mock files
  http.get(`${baseUrl}/scheduler`, async () => {
    const response = await fetch(`${MOCK_ASSET_BASE}/scheduler.json`);
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.get(`${baseUrl}/scheduler-conf`, async () => {
    const response = await fetch(`${MOCK_ASSET_BASE}/scheduler-conf.json`);
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.put(`${baseUrl}/scheduler-conf`, async ({ request }) => {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 500));

    const changes = await request.json();
    console.log('Mock: Applying configuration changes:', changes);

    return HttpResponse.json({
      response: 'Configuration updated successfully',
    });
  }),

  http.get(`${baseUrl}/scheduler-conf/version`, () => {
    return HttpResponse.json({
      versionId: 15,
    });
  }),

  // Node endpoints
  http.get(`${baseUrl}/nodes`, async () => {
    const response = await fetch(`${MOCK_ASSET_BASE}/nodes.json`);
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  // Node labels endpoints
  http.get(`${baseUrl}/get-node-labels`, async () => {
    const response = await fetch(`${MOCK_ASSET_BASE}/get-node-labels.json`);
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.get(`${baseUrl}/get-node-to-labels`, async () => {
    const response = await fetch(`${MOCK_ASSET_BASE}/get-node-to-labels.json`);
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.get(`${baseUrl}/get-labels-to-nodes`, async () => {
    const response = await fetch(`${MOCK_ASSET_BASE}/get-labels-to-nodes.json`);
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.post(`${baseUrl}/add-node-labels`, async ({ request }) => {
    const body = await request.json();
    console.log('Mock: Adding node labels:', body);
    return HttpResponse.json({ message: 'Labels added successfully' });
  }),

  http.post(`${baseUrl}/replace-node-to-labels`, async ({ request }) => {
    const body = await request.json();
    console.log('Mock: Replacing node labels:', body);
    return HttpResponse.json({ message: 'Node labels replaced successfully' });
  }),

  http.post(`${baseUrl}/remove-node-labels`, async ({ request }) => {
    const body = await request.text();
    console.log('Mock: Removing node labels:', body);
    return HttpResponse.json({ message: 'Labels removed successfully' });
  }),

  // Configuration endpoint (at root level, not under baseUrl)
  http.get('/conf', ({ request }) => {
    const url = new URL(request.url);
    const configName = url.searchParams.get('name');

    // Handle security authentication mode query
    if (configName === 'hadoop.security.authentication') {
      return HttpResponse.json({
        property: {
          name: 'hadoop.security.authentication',
          value: 'simple',
        },
      });
    }

    // Handle read-only mode query
    // TODO: change this to the actual config value
    if (configName === 'yarn.scheduler.capacity.ui.readonly') {
      // Default to false (writable mode) for development
      // Set VITE_READONLY_MODE=true to test read-only mode
      const readOnlyValue = import.meta.env.VITE_READONLY_MODE === 'true' ? 'true' : 'false';
      return HttpResponse.json({
        property: {
          name: 'yarn.scheduler.capacity.ui.readonly',
          value: readOnlyValue,
        },
      });
    }

    // Return empty/not found for unknown configs
    return HttpResponse.json(
      {
        property: {
          name: configName || '',
          value: '',
        },
      },
      { status: 404 },
    );
  }),
];

export const handlers: HttpHandler[] = mockMode === 'cluster' ? [] : staticHandlers;
