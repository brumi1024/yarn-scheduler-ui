# Running Performance Benchmarks

This guide explains how to run and interpret performance benchmarks for the Capacity Scheduler UI. Benchmarks measure queue tree transformation, layout calculation, and search filtering performance at scale.

## Overview

The benchmark suite uses [Vitest's benchmarking feature](https://vitest.dev/guide/features.html#benchmarking) to measure performance of critical operations in the queue visualization pipeline. This helps identify performance regressions and validate optimizations.

## Key Files

- `src/testing/benchmarks/queueTreePerformance.bench.ts` - Main benchmark suite
- `src/testing/utils/generateMockQueues.ts` - Mock data generator for benchmarks
- `src/features/queue-management/hooks/useQueueTreeData.ts` - Code under test

## Running Benchmarks

### Run All Benchmarks

```bash
npx vitest bench src/testing/benchmarks/queueTreePerformance.bench.ts
```

### Run in Watch Mode

```bash
npx vitest bench src/testing/benchmarks/queueTreePerformance.bench.ts --watch
```

### Run with Verbose Output

```bash
npx vitest bench src/testing/benchmarks/queueTreePerformance.bench.ts --reporter=verbose
```

## Benchmark Categories

### Queue Tree Transformation Performance

Measures `flattenQueueTree` performance - converting hierarchical queue data into a flat array for rendering.

| Scenario | Queue Count | Expected Performance |
| -------- | ----------- | -------------------- |
| Small    | ~39         | <0.01ms              |
| Medium   | ~340        | <0.1ms               |
| Large    | ~780        | <0.2ms               |
| Stress   | ~1364       | <0.5ms               |

### Dagre Layout Performance

Measures graph layout calculation time using the Dagre library. This is the most computationally expensive operation.

| Scenario | Node Count | Expected Performance |
| -------- | ---------- | -------------------- |
| Small    | ~39        | ~5ms                 |
| Medium   | ~340       | ~50ms                |
| Large    | ~780       | ~150ms               |
| Stress   | ~1364      | ~320ms               |

### Search Filter Performance

Measures queue search/filter operations on flattened queue arrays.

| Scenario | Queue Count | Expected Performance |
| -------- | ----------- | -------------------- |
| Small    | ~40         | <0.01ms              |
| Medium   | ~341        | <0.1ms               |
| Large    | ~781        | <0.1ms               |
| Stress   | ~1365       | <0.2ms               |

### Combined Transformation Pipeline

End-to-end benchmarks including flatten, layout, and optional search operations.

## Interpreting Results

Benchmark output includes:

- **hz** - Operations per second (higher is better)
- **min/max/mean** - Timing statistics in milliseconds
- **p75/p99/p995/p999** - Percentile timings
- **rme** - Relative margin of error
- **samples** - Number of iterations run

Example output:

```
✓ src/testing/benchmarks/queueTreePerformance.bench.ts > Dagre Layout Performance
   name                                hz      min      max     mean
 · layout 39 nodes (small)         224.50   4.0167   6.7687   4.4544
 · layout 340 nodes (medium)      20.4983  47.1879  50.0475  48.7846
 · layout 780 nodes (large)        6.7551   144.41   159.19   148.04
 · layout 1364 nodes (stress)      3.1324   306.14   331.58   319.24
```

## Test Data Presets

The benchmark uses predefined queue tree configurations:

```typescript
PRESET_CONFIGS = {
  small: {
    // ~39 queues
    topLevelQueues: 4,
    maxDepth: 3,
    childrenPerQueue: { min: 2, max: 4 },
  },
  medium: {
    // ~340 queues
    topLevelQueues: 8,
    maxDepth: 4,
    childrenPerQueue: { min: 3, max: 6 },
  },
  large: {
    // ~780 queues
    topLevelQueues: 12,
    maxDepth: 4,
    childrenPerQueue: { min: 4, max: 8 },
  },
  stress: {
    // ~1364 queues
    topLevelQueues: 15,
    maxDepth: 5,
    childrenPerQueue: { min: 4, max: 8 },
  },
};
```

## Adding New Benchmarks

### 1. Create a Benchmark File

Create a new file with the `.bench.ts` extension:

```typescript
// src/testing/benchmarks/myFeature.bench.ts
import { bench, describe } from 'vitest';

describe('My Feature Performance', () => {
  bench('operation name', () => {
    // Code to benchmark
    myFunction();
  });
});
```

### 2. Use Pre-Generated Test Data

Avoid including data generation time in benchmarks:

```typescript
// Generate data outside the benchmark
const testData = generateTestData();

describe('My Feature Performance', () => {
  bench('operation with test data', () => {
    processData(testData);
  });
});
```

### 3. Include Multiple Scale Points

Test at different scales to understand scaling characteristics:

```typescript
describe('My Feature Performance', () => {
  bench('small dataset (100 items)', () => {
    processData(smallData);
  });

  bench('medium dataset (1000 items)', () => {
    processData(mediumData);
  });

  bench('large dataset (10000 items)', () => {
    processData(largeData);
  });
});
```

## Performance Optimization Patterns

### Layout Caching

The `useQueueTreeData` hook implements layout caching to avoid recalculating positions when only queue properties change:

```typescript
// Cache key based on tree structure (queue paths only)
function getTreeStructureKey(queue: QueueInfo): string {
  const paths: string[] = [];
  const collectPaths = (q: QueueInfo) => {
    paths.push(q.queuePath);
    if (q.queues?.queue) {
      toArray(q.queues.queue).forEach(collectPaths);
    }
  };
  collectPaths(queue);
  return paths.sort().join('|');
}

// Use cached layout when structure hasn't changed
const structureKey = getTreeStructureKey(augmentedRootQueue);
if (layoutCache.current?.key === structureKey) {
  positions = layoutCache.current.positions;
} else {
  positions = layoutEngine.calculatePositions(augmentedRootQueue);
  layoutCache.current = { key: structureKey, positions };
}
```

This optimization reduces property edit latency from ~150ms to <1ms for large queue trees.

### When to Recalculate Layout

Layout recalculation is needed when:

- ✅ Queues are added or removed
- ✅ Search filter changes visible queues
- ✅ Initial page load

Layout recalculation is NOT needed when:

- ❌ Queue properties change (capacity, state, etc.)
- ❌ Staged changes are added/removed (without structural changes)
- ❌ Node label filter changes (structure unchanged)

## Troubleshooting

### Benchmarks Running Slowly

- Ensure you're not running in debug mode
- Close other CPU-intensive applications
- Run multiple times to get stable results

### Inconsistent Results

- Increase sample count by running longer
- Check for background processes
- Use the `p99` percentile for more stable comparisons

### Memory Issues with Large Datasets

- Monitor memory usage during stress tests
- Consider running stress benchmarks in isolation
- Check for memory leaks in tested code

## CI Integration

Benchmarks are not run in CI by default (they're separate from tests). To include them:

```bash
# In CI script
npx vitest bench --run
```

Consider setting up benchmark regression detection by comparing results against a baseline.

## Further Reading

- [Vitest Benchmarking Documentation](https://vitest.dev/guide/features.html#benchmarking)
- `src/features/queue-management/hooks/useQueueTreeData.ts` - Queue tree transformation logic
- `src/features/queue-management/utils/DagreLayout.ts` - Layout calculation implementation
