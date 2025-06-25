# YARN Capacity Scheduler - Capacity Format Guide for Mutation API

## Overview

This guide provides essential information for applications using the YARN Capacity Scheduler Mutation API to update capacity configurations.

## API Endpoint

**PUT** `/ws/v1/cluster/scheduler-conf`

## Supported Capacity Formats

### 1. Percentage Format (Default)

- **Syntax**: `"50"` or `"50%"`
- **Example**:
    ```json
    {
        "capacity": "50",
        "maximum-capacity": "100"
    }
    ```
- **Range**: 0-100
- **Note**: Numeric values without suffix are treated as percentages

### 2. Weight Format

- **Syntax**: `"<value>w"`
- **Example**:
    ```json
    {
        "capacity": "6w",
        "maximum-capacity": "10w"
    }
    ```
- **Use Case**: Proportional resource sharing between sibling queues

### 3. Absolute Resource Format

- **Syntax**: `"[resource1=value1, resource2=value2, ...]"`
- **Example**:
    ```json
    {
        "capacity": "[memory=4096Mi, vcores=4]",
        "maximum-capacity": "[memory=32Gi, vcores=32]"
    }
    ```
- **Supported Memory Units**: Mi, Gi, Ti (converted to MB internally)
- **Required**: Memory must always be specified in absolute format

## API Request Structure

### Update Queue Capacity

```json
{
    "update-queue": [
        {
            "queue-name": "root.production",
            "params": {
                "capacity": "[memory=8192Mi, vcores=8]",
                "maximum-capacity": "[memory=64Gi, vcores=64]"
            }
        }
    ]
}
```

### Add New Queue with Capacity

```json
{
    "add-queue": [
        {
            "queue-name": "root.development.team-a",
            "params": {
                "capacity": "30",
                "maximum-capacity": "50"
            }
        }
    ]
}
```

### Update Node Label Specific Capacity

```json
{
    "update-queue": [
        {
            "queue-name": "root.production",
            "params": {
                "accessible-node-labels.gpu-nodes.capacity": "[memory=16Gi, vcores=16, yarn.io/gpu=4]",
                "accessible-node-labels.gpu-nodes.maximum-capacity": "[memory=128Gi, vcores=128, yarn.io/gpu=32]"
            }
        }
    ]
}
```

## Validation Rules

### Format-Specific Rules

1. **Percentage Mode**:
    - Values must be between 0-100
    - Child queue capacities should sum to parent's capacity
2. **Weight Mode**:
    - Values must be positive numbers
    - No sum constraint (weights are relative)
3. **Absolute Mode**:
    - Memory specification is mandatory
    - Values validated against cluster resources

### General Rules

- `maximum-capacity` must be >= `capacity`
- Root queue always has 100% capacity (read-only)
- Capacity values must be non-negative

## Mixed Resource Types

The API supports mixed capacity types within a single resource vector:

```json
{
    "capacity": "[memory=1024, vcores=50%, yarn.io/gpu=6w]"
}
```

- Memory: 1024 MB (absolute)
- VCores: 50% of parent's vcores
- GPU: weight of 6 relative to siblings

## Error Handling

### Common Validation Errors

1. **Invalid Format**:

    - Response: `400 Bad Request`
    - Message: "Invalid capacity format: <value>"

2. **Capacity Exceeds Maximum**:

    - Response: `400 Bad Request`
    - Message: "Capacity cannot exceed maximum capacity"

3. **Missing Required Resource**:
    - Response: `400 Bad Request`
    - Message: "Memory must be specified in absolute resource format"

## Best Practices

1. **Always validate format** before sending to API:

    - Percentage: Regex `^\d+(\.\d+)?%?$`
    - Weight: Regex `^\d+(\.\d+)?w$`
    - Absolute: Regex `^\[[\w\.,\-_%\ /]+=([\w\.,\-_%\ /]+)\]$`

2. **Use consistent formats** within a queue hierarchy to avoid confusion

3. **Include units** for memory in absolute format (Mi, Gi, Ti)

4. **Check cluster resources** before setting absolute values

5. **Test configuration changes** in a staging environment first

## Example API Client Code (Python)

```python
import requests
import json

def update_queue_capacity(rm_host, queue_name, capacity, max_capacity):
    url = f"http://{rm_host}:8088/ws/v1/cluster/scheduler-conf"

    payload = {
        "update-queue": [{
            "queue-name": queue_name,
            "params": {
                "capacity": capacity,
                "maximum-capacity": max_capacity
            }
        }]
    }

    response = requests.put(url, json=payload)

    if response.status_code == 200:
        return {"success": True, "message": "Capacity updated successfully"}
    else:
        return {"success": False, "error": response.json()}

# Examples
# Percentage format
update_queue_capacity("rm-host", "root.production", "70", "100")

# Weight format
update_queue_capacity("rm-host", "root.dev", "3w", "5w")

# Absolute format
update_queue_capacity("rm-host", "root.batch",
                     "[memory=16Gi, vcores=16]",
                     "[memory=128Gi, vcores=128]")
```

## References

- YARN REST API Documentation: `/ws/v1/cluster/scheduler-conf`
- Capacity Scheduler Configuration: `yarn.scheduler.capacity.*`
