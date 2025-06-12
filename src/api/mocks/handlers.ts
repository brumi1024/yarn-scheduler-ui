import { http, HttpResponse } from 'msw';

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
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const changes = await request.json();
    console.log('Mock: Applying configuration changes:', changes);
    
    return HttpResponse.json({
      response: 'Configuration updated successfully'
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
    // For now, return a simple mock for node labels
    return HttpResponse.json({
      nodeLabels: {
        nodeLabel: [
          { name: 'gpu', numActiveNMs: 2, numInactiveNMs: 0, resourceType: 'EXCLUSIVE' },
          { name: 'fpga', numActiveNMs: 1, numInactiveNMs: 0, resourceType: 'EXCLUSIVE' }
        ]
      }
    });
  }),

  http.get('/ws/v1/cluster/nodes/get-node-to-labels', () => {
    return HttpResponse.json({
      nodeToLabelsInfo: {
        nodeToLabels: [
          { nodeId: 'worker1.example.com:8041', nodeLabels: ['gpu', 'high-memory'] },
          { nodeId: 'worker2.example.com:8041', nodeLabels: ['ssd'] },
          { nodeId: 'worker3.example.com:8041', nodeLabels: [] },
        ]
      }
    });
  }),

  http.get('/ws/v1/cluster/nodes/get-labels-to-nodes', () => {
    return HttpResponse.json({
      labelsToNodesInfo: {
        labelsToNodes: [
          { nodeLabels: ['gpu'], nodeId: ['worker1.example.com:8041'] },
          { nodeLabels: ['high-memory'], nodeId: ['worker1.example.com:8041'] },
          { nodeLabels: ['ssd'], nodeId: ['worker2.example.com:8041'] },
        ]
      }
    });
  }),

  http.post('/ws/v1/cluster/add-node-labels', async ({ request }) => {
    const body = await request.json();
    console.log('Mock: Adding node labels:', body);
    return HttpResponse.json({ message: 'Labels added successfully' });
  }),

  http.post('/ws/v1/cluster/nodes/replace-node-to-labels', async ({ request }) => {
    const body = await request.json();
    console.log('Mock: Replacing node labels:', body);
    return HttpResponse.json({ message: 'Node labels replaced successfully' });
  }),

  http.post('/ws/v1/cluster/remove-node-labels', async ({ request }) => {
    const url = new URL(request.url);
    const nodeLabels = url.searchParams.getAll('nodeLabels');
    console.log('Mock: Removing node labels:', nodeLabels);
    return HttpResponse.json({ message: 'Labels removed successfully' });
  }),
];