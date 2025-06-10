# Capacity Scheduler Configuration API Reference

This document provides a comprehensive reference for all REST APIs needed to build a UI for managing YARN Capacity Scheduler configuration, including queues, placement rules, global scheduler settings, and node labels.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Authentication](#authentication)
- [Scheduler State API](#scheduler-state-api)
- [Configuration Mutation API](#configuration-mutation-api)
- [Node Labels Management APIs](#node-labels-management-apis)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Prerequisites

### Enable Configuration Mutations
To enable dynamic configuration updates via REST API, add the following to `yarn-site.xml`:

```xml
<property>
  <name>yarn.scheduler.configuration.store.class</name>
  <value>memory</value> <!-- Options: "memory", "leveldb", "zk" -->
</property>
```

### Base URL
All API endpoints are prefixed with:
```
http://<resource-manager-host>:<port>/ws/v1/cluster
```
Default port is `8088`.

## Authentication

### Methods
1. **Simple Authentication**: Add `?user.name=<username>` to the URL
2. **Kerberos**: When security is enabled
3. **Delegation Token**: Use `Hadoop-YARN-RM-Delegation-Token` header

### Authorization
- Configuration mutations require admin privileges
- Node label operations require specific ACL permissions

## Scheduler State API

### Get Scheduler Information
Retrieves the complete scheduler state including queue hierarchy, capacities, and current usage.

**Endpoint**: `GET /scheduler`

**Response**: `SchedulerTypeInfo` object containing:
- Queue hierarchy with all queue details
- Current capacities and usage
- Queue states and statistics
- User and application information

**Example Response** (Capacity Scheduler):
```json
{
  "scheduler": {
    "schedulerInfo": {
      "type": "capacityScheduler",
      "capacity": 100.0,
      "usedCapacity": 25.5,
      "maxCapacity": 100.0,
      "queueName": "root",
      "queues": {
        "queue": [
          {
            "capacity": 90.0,
            "usedCapacity": 20.0,
            "maxCapacity": 100.0,
            "absoluteCapacity": 90.0,
            "absoluteUsedCapacity": 18.0,
            "absoluteMaxCapacity": 100.0,
            "numApplications": 5,
            "queueName": "default",
            "state": "RUNNING",
            "resourcesUsed": {
              "memory": 8192,
              "vCores": 8
            },
            "users": {
              "user": [
                {
                  "username": "user1",
                  "resourcesUsed": {
                    "memory": 4096,
                    "vCores": 4
                  },
                  "numActiveApplications": 2,
                  "numPendingApplications": 0
                }
              ]
            }
          }
        ]
      }
    }
  }
}
```

## Configuration Mutation API

### Update Scheduler Configuration
Dynamically update scheduler configuration including queues, placement rules, and global settings.

**Endpoint**: `PUT /scheduler-conf`

**Headers**:
- `Content-Type: application/json` or `application/xml`

**Request Body**: `SchedConfUpdateInfo` object

**Request Format**:
```json
{
  "add-queue": [
    {
      "queue-name": "root.newqueue",
      "params": {
        "capacity": "10",
        "maximum-capacity": "50",
        "minimum-user-limit-percent": "100",
        "user-limit-factor": "1.0",
        "state": "RUNNING",
        "accessible-node-labels": "gpu,ssd",
        "accessible-node-labels.gpu.capacity": "100",
        "accessible-node-labels.ssd.capacity": "50",
        "default-node-label-expression": "gpu",
        "acl_submit_applications": "user1,user2 group1,group2",
        "acl_administer_queue": "admin1,admin2"
      }
    }
  ],
  "update-queue": [
    {
      "queue-name": "root.default",
      "params": {
        "capacity": "90",
        "maximum-capacity": "100"
      }
    }
  ],
  "remove-queue": [
    "root.oldqueue"
  ],
  "global-updates": {
    "yarn.scheduler.capacity.maximum-applications": "10000",
    "yarn.scheduler.capacity.maximum-am-resource-percent": "0.1",
    "yarn.scheduler.capacity.resource-calculator": "org.apache.hadoop.yarn.util.resource.DominantResourceCalculator",
    "yarn.scheduler.capacity.queue-mappings": "u:user1:queue1,g:group1:queue2",
    "yarn.scheduler.capacity.queue-mappings-override.enable": "true"
  }
}
```

**Response**:
- **Success**: HTTP 200
  ```json
  {
    "response": "Configuration change successfully applied."
  }
  ```
- **Error**: HTTP 400/403/500 with error details

**Important Queue Parameters**:
- `capacity`: Queue capacity as percentage of parent
- `maximum-capacity`: Maximum queue capacity
- `minimum-user-limit-percent`: Minimum guaranteed capacity per user
- `user-limit-factor`: Multiple of queue capacity that a single user can consume
- `state`: RUNNING or STOPPED
- `accessible-node-labels`: Comma-separated list of accessible node labels
- `accessible-node-labels.<label>.capacity`: Capacity for specific label
- `default-node-label-expression`: Default label for applications
- `acl_submit_applications`: ACL for submitting applications
- `acl_administer_queue`: ACL for administering queue

**Placement Rules Configuration** (via global-updates):
- `yarn.scheduler.capacity.queue-mappings`: User/group to queue mappings
- `yarn.scheduler.capacity.queue-mappings-override.enable`: Enable mapping overrides
- `yarn.scheduler.queue-placement-rules.app-name`: Application name based placement

### Get Current Configuration
Retrieve the current scheduler configuration.

**Endpoint**: `GET /scheduler-conf`

**Response**: Key-value pairs of configuration properties
```json
{
  "property": [
    {
      "key": "yarn.scheduler.capacity.root.queues",
      "value": "default,production"
    },
    {
      "key": "yarn.scheduler.capacity.root.default.capacity",
      "value": "30"
    }
  ]
}
```

### Get Configuration Version
Get the current configuration version (useful for detecting changes).

**Endpoint**: `GET /scheduler-conf/version`

**Response**:
```json
{
  "versionId": 1234567890
}
```

## Node Labels Management APIs

### Add Node Labels to Cluster
Add new node labels to the cluster.

**Endpoint**: `POST /add-node-labels`

**Request Body**:
```json
{
  "nodeLabelsInfo": {
    "nodeLabelInfo": [
      {
        "name": "gpu",
        "exclusivity": true
      },
      {
        "name": "ssd",
        "exclusivity": false
      }
    ]
  }
}
```

**Response**: HTTP 200 on success

### Remove Node Labels from Cluster
Remove existing node labels from the cluster.

**Endpoint**: `POST /remove-node-labels?labels=label1,label2`

**Query Parameters**:
- `labels`: Comma-separated list of labels to remove

**Response**: HTTP 200 on success

### Get All Cluster Node Labels
Retrieve all node labels in the cluster.

**Endpoint**: `GET /get-node-labels`

**Response**:
```json
{
  "nodeLabelsInfo": {
    "nodeLabelInfo": [
      {
        "name": "gpu",
        "exclusivity": true,
        "partitionInfo": {
          "resourceAvailable": {
            "memory": 32768,
            "vCores": 16
          },
          "resourceTotal": {
            "memory": 65536,
            "vCores": 32
          }
        }
      }
    ]
  }
}
```

### Get Extended Node Label Information
Get node labels with ResourceManager-specific details.

**Endpoint**: `GET /get-rm-node-labels`

**Response**: Similar to above but includes active node manager counts and additional resource information.

### Replace Labels on Multiple Nodes
Bulk update node-to-label assignments.

**Endpoint**: `POST /replace-node-to-labels`

**Request Body**:
```json
{
  "nodeToLabelsEntryList": {
    "nodeToLabels": [
      {
        "nodeId": "node1.example.com:8041",
        "nodeLabels": ["gpu", "ssd"]
      },
      {
        "nodeId": "node2.example.com:8041",
        "nodeLabels": ["ssd"]
      }
    ]
  }
}
```

**Response**: HTTP 200 on success

### Replace Labels on Single Node
Update labels for a specific node.

**Endpoint**: `POST /nodes/{nodeId}/replace-labels?labels=label1,label2`

**Path Parameters**:
- `nodeId`: Node ID (e.g., "node1.example.com:8041")

**Query Parameters**:
- `labels`: Comma-separated list of labels to assign

**Response**: HTTP 200 on success

### Get Labels on Specific Node
Retrieve labels assigned to a specific node.

**Endpoint**: `GET /nodes/{nodeId}/get-labels`

**Response**:
```json
{
  "nodeLabelsInfo": {
    "nodeLabelInfo": [
      {
        "name": "gpu"
      },
      {
        "name": "ssd"
      }
    ]
  }
}
```

### Get Node-to-Labels Mapping
Get the complete mapping of nodes to their assigned labels.

**Endpoint**: `GET /get-node-to-labels`

**Response**:
```json
{
  "nodeToLabelsInfo": {
    "nodeToLabels": [
      {
        "nodeId": "node1.example.com:8041",
        "nodeLabels": ["gpu", "ssd"]
      }
    ]
  }
}
```

### Get Labels-to-Nodes Mapping
Get nodes that have specific labels.

**Endpoint**: `GET /label-mappings?labels=gpu,ssd`

**Query Parameters** (optional):
- `labels`: Filter by specific labels

**Response**:
```json
{
  "labelsToNodesInfo": {
    "labelsToNodes": [
      {
        "nodeLabels": ["gpu"],
        "nodeId": ["node1.example.com:8041", "node2.example.com:8041"]
      }
    ]
  }
}
```

### List All Cluster Nodes
Get all available nodes in the cluster for adding to labels.

**Endpoint**: `GET /nodes`

**Query Parameters** (optional):
- `states`: Filter by node states (comma-separated). Valid states: `NEW`, `RUNNING`, `UNHEALTHY`, `DECOMMISSIONING`, `DECOMMISSIONED`, `LOST`, `REBOOTED`, `SHUTDOWN`

**Response**:
```json
{
  "nodes": {
    "node": [
      {
        "rack": "/default-rack",
        "state": "RUNNING",
        "id": "node1.example.com:8041",
        "nodeHostName": "node1.example.com",
        "nodeHTTPAddress": "node1.example.com:8042",
        "lastHealthUpdate": 1476995346399,
        "version": "3.0.0",
        "healthReport": "",
        "numContainers": 2,
        "usedMemoryMB": 4096,
        "availMemoryMB": 12288,
        "usedVirtualCores": 4,
        "availableVirtualCores": 12,
        "memUtilization": 25.0,
        "cpuUtilization": 15.5,
        "nodeLabels": ["gpu", "ssd"],
        "resourceUtilization": {
          "nodePhysicalMemoryMB": 4096,
          "nodeVirtualMemoryMB": 4096,
          "nodeCPUUsage": 0.155,
          "aggregatedContainersPhysicalMemoryMB": 3072,
          "aggregatedContainersVirtualMemoryMB": 3072,
          "containersCPUUsage": 0.12
        },
        "usedResource": {
          "memory": 4096,
          "vCores": 4
        },
        "availableResource": {
          "memory": 12288,
          "vCores": 12
        },
        "totalResource": {
          "memory": 16384,
          "vCores": 16
        }
      }
    ]
  }
}
```

**Key Node Fields**:
- `id`: Node identifier (use this for label assignment operations)
- `nodeHostName`: Human-readable hostname
- `state`: Current node state
- `nodeLabels`: Currently assigned labels
- `availableResource`: Resources available on the node
- `totalResource`: Total resources on the node

## Error Handling

### Common HTTP Status Codes
- **200 OK**: Successful operation
- **400 Bad Request**: Invalid request or configuration
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

### Error Response Format
```json
{
  "RemoteException": {
    "exception": "BadRequestException",
    "message": "Configuration change only supported by MutableConfScheduler",
    "javaClassName": "org.apache.hadoop.yarn.webapp.BadRequestException"
  }
}
```

### Common Error Messages
- "Configuration change only supported by MutableConfScheduler" - Mutation API not enabled
- "Queue root.xyz already exists" - Attempting to add duplicate queue
- "The queue root.xyz has apps running" - Cannot delete queue with active applications
- "Queue root.xyz is not a leaf queue" - Cannot delete parent queue
- "Node label=xyz already exists" - Duplicate node label
- "Node label=xyz cannot be found" - Invalid node label reference

## Examples

### Example 1: Create a New Queue with Node Label Support
```bash
curl -X PUT http://rm-host:8088/ws/v1/cluster/scheduler-conf \
  -H "Content-Type: application/json" \
  -d '{
    "add-queue": [{
      "queue-name": "root.gpu-jobs",
      "params": {
        "capacity": "20",
        "maximum-capacity": "50",
        "accessible-node-labels": "gpu",
        "accessible-node-labels.gpu.capacity": "100",
        "default-node-label-expression": "gpu"
      }
    }],
    "update-queue": [{
      "queue-name": "root.default",
      "params": {
        "capacity": "80"
      }
    }]
  }'
```

### Example 2: Add Node Labels and Assign to Nodes
```bash
# Step 1: Add labels to cluster
curl -X POST http://rm-host:8088/ws/v1/cluster/add-node-labels \
  -H "Content-Type: application/json" \
  -d '{
    "nodeLabelsInfo": {
      "nodeLabelInfo": [
        {"name": "gpu", "exclusivity": true},
        {"name": "ssd", "exclusivity": false}
      ]
    }
  }'

# Step 2: Assign labels to nodes
curl -X POST http://rm-host:8088/ws/v1/cluster/replace-node-to-labels \
  -H "Content-Type: application/json" \
  -d '{
    "nodeToLabelsEntryList": {
      "nodeToLabels": [
        {
          "nodeId": "node1.example.com:8041",
          "nodeLabels": ["gpu", "ssd"]
        }
      ]
    }
  }'
```

### Example 3: Update Placement Rules
```bash
curl -X PUT http://rm-host:8088/ws/v1/cluster/scheduler-conf \
  -H "Content-Type: application/json" \
  -d '{
    "global-updates": {
      "yarn.scheduler.capacity.queue-mappings": "u:alice:root.production,u:bob:root.development,g:analysts:root.analytics",
      "yarn.scheduler.capacity.queue-mappings-override.enable": "true"
    }
  }'
```

### Example 4: Stop and Remove a Queue
```bash
# Step 1: Stop the queue
curl -X PUT http://rm-host:8088/ws/v1/cluster/scheduler-conf \
  -H "Content-Type: application/json" \
  -d '{
    "update-queue": [{
      "queue-name": "root.oldqueue",
      "params": {
        "state": "STOPPED"
      }
    }]
  }'

# Step 2: Remove the queue (after ensuring no apps are running)
curl -X PUT http://rm-host:8088/ws/v1/cluster/scheduler-conf \
  -H "Content-Type: application/json" \
  -d '{
    "remove-queue": ["root.oldqueue"]
  }'
```

## Best Practices

1. **Always check scheduler state** before making changes to understand current configuration
2. **Validate queue capacity** - Ensure sibling queues' capacities sum to 100%
3. **Check for running applications** before deleting queues
4. **Use configuration versioning** to detect concurrent modifications
5. **Handle errors gracefully** - Parse error messages to provide meaningful feedback
6. **Batch operations** when possible to reduce API calls
7. **Monitor node label assignments** to ensure nodes are properly labeled before queue configuration