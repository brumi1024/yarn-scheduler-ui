import { http, HttpResponse } from 'msw';
import type { SchedConfUpdateInfo } from '../../../types/config';

export const handlers = [
  // Scheduler endpoints - use actual mock files
  http.get('/ws/v1/cluster/scheduler', async () => {
    const response = await fetch('/mock/ws/v1/cluster/scheduler.json');
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.get('/ws/v1/cluster/scheduler-conf', async () => {
    const response = await fetch('/mock/ws/v1/cluster/scheduler-conf.json');
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.put('/ws/v1/cluster/scheduler-conf', async ({ request }) => {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 500));

    const changes = await request.json();
    console.log('Mock: Applying configuration changes:', changes);

    return HttpResponse.json({
      response: 'Configuration updated successfully',
    });
  }),

  http.get('/ws/v1/cluster/scheduler-conf/version', () => {
    return HttpResponse.json({
      versionID: 1234567890,
    });
  }),

  // Node endpoints
  http.get('/ws/v1/cluster/nodes', async () => {
    const response = await fetch('/mock/ws/v1/cluster/nodes.json');
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  // Node labels endpoints
  http.get('/ws/v1/cluster/get-node-labels', async () => {
    const response = await fetch('/mock/ws/v1/cluster/get-node-labels.json');
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.get('/ws/v1/cluster/get-node-to-labels', async () => {
    const response = await fetch('/mock/ws/v1/cluster/get-node-to-labels.json');
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.get('/ws/v1/cluster/get-labels-to-nodes', async () => {
    const response = await fetch('/mock/ws/v1/cluster/get-labels-to-nodes.json');
    const data = await response.json();
    return HttpResponse.json(data);
  }),

  http.post('/ws/v1/cluster/add-node-labels', async ({ request }) => {
    const body = await request.json();
    console.log('Mock: Adding node labels:', body);
    return HttpResponse.json({ message: 'Labels added successfully' });
  }),

  http.post('/ws/v1/cluster/replace-node-to-labels', async ({ request }) => {
    const body = await request.json();
    console.log('Mock: Replacing node labels:', body);
    return HttpResponse.json({ message: 'Node labels replaced successfully' });
  }),

  http.post('/ws/v1/cluster/remove-node-labels', async ({ request }) => {
    const body = await request.json();
    console.log('Mock: Removing node labels:', body);
    return HttpResponse.json({ message: 'Labels removed successfully' });
  }),
];
