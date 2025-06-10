import { http, HttpResponse } from 'msw';
import { mockSchedulerData } from './mockData';
import { mockConfigurationData } from './mockConfigData';
import { mockNodeLabelsData, mockNodesData } from './mockNodeData';

export const handlers = [
  // Scheduler endpoints
  http.get('/ws/v1/cluster/scheduler', () => {
    return HttpResponse.json(mockSchedulerData);
  }),

  http.get('/ws/v1/cluster/scheduler-conf', () => {
    return HttpResponse.json(mockConfigurationData);
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
  http.get('/ws/v1/cluster/nodes', () => {
    return HttpResponse.json(mockNodesData);
  }),

  // Node labels endpoints
  http.get('/ws/v1/cluster/get-node-labels', () => {
    return HttpResponse.json(mockNodeLabelsData);
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