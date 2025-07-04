import { http, HttpResponse } from 'msw';
import type { SchedConfUpdateInfo } from '../../../types/config';

// Base URL pattern that matches the API configuration
// Use the same base URL as the API client for consistency
const BASE_URL = import.meta.env.VITE_YARN_API_URL || 'http://localhost:8088/ws/v1/cluster';

export const handlers = [
  // Scheduler endpoints - use actual mock files
  http.get(`${BASE_URL}/scheduler`, async () => {
    const response = await fetch('/mock/ws/v1/cluster/scheduler.json');
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.get(`${BASE_URL}/scheduler-conf`, async () => {
    const response = await fetch('/mock/ws/v1/cluster/scheduler-conf.json');
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.put(`${BASE_URL}/scheduler-conf`, async ({ request }) => {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 500));

    const changes = await request.json();
    console.log('Mock: Applying configuration changes:', changes);

    return HttpResponse.json({
      response: 'Configuration updated successfully',
    });
  }),

  http.get(`${BASE_URL}/scheduler-conf/version`, () => {
    return HttpResponse.json({
      versionID: 1234567890,
    });
  }),

  // Node endpoints
  http.get(`${BASE_URL}/nodes`, async () => {
    const response = await fetch('/mock/ws/v1/cluster/nodes.json');
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  // Node labels endpoints
  http.get(`${BASE_URL}/get-node-labels`, async () => {
    const response = await fetch('/mock/ws/v1/cluster/get-node-labels.json');
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.get(`${BASE_URL}/get-node-to-labels`, async () => {
    const response = await fetch('/mock/ws/v1/cluster/get-node-to-labels.json');
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.get(`${BASE_URL}/get-labels-to-nodes`, async () => {
    const response = await fetch('/mock/ws/v1/cluster/get-labels-to-nodes.json');
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.post(`${BASE_URL}/add-node-labels`, async ({ request }) => {
    const body = await request.json();
    console.log('Mock: Adding node labels:', body);
    return HttpResponse.json({ message: 'Labels added successfully' });
  }),

  http.post(`${BASE_URL}/replace-node-to-labels`, async ({ request }) => {
    const body = await request.json();
    console.log('Mock: Replacing node labels:', body);
    return HttpResponse.json({ message: 'Node labels replaced successfully' });
  }),

  http.post(`${BASE_URL}/remove-node-labels`, async ({ request }) => {
    const body = await request.json();
    console.log('Mock: Removing node labels:', body);
    return HttpResponse.json({ message: 'Labels removed successfully' });
  }),
];
