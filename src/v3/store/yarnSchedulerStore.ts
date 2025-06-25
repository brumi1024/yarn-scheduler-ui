import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {
  QueueNode,
  PropertyChange,
  NodeLabelAssignment,
  PropertyDefinition,
  NodeInfo,
  CommitStatus
} from './types';

interface YarnSchedulerStore {
  queueTree: QueueNode | null;
  originalConfig: Record<string, string>;
  propertyChanges: Map<string, PropertyChange>;
  propertyDefinitions: PropertyDefinition[];
  nodes: Map<string, NodeInfo>;
  nodeLabelChanges: Map<string, NodeLabelAssignment>;
  loading: boolean;
  error: string | null;
  commitStatus: CommitStatus;
  commitError: string | null;

  updateProperty: (propertyPath: string, value: unknown) => void;
  addQueue: (parentPath: string, name: string, initialCapacity: number) => void;
  removeQueue: (queuePath: string) => void;
  commitChanges: () => Promise<void>;
  revertAllChanges: () => void;
  assignNodeLabel: (nodeId: string, label: string) => void;
  removeNodeLabel: (nodeId: string, label: string) => void;

  hasChanges: () => boolean;
  getQueueByPath: (path: string) => QueueNode | null;
  getPropertyValue: (path: string) => { original: unknown; staged: unknown; isDirty: boolean };

  setQueueTree: (tree: QueueNode | null) => void;
  setOriginalConfig: (config: Record<string, string>) => void;
  setNodes: (nodes: Map<string, NodeInfo>) => void;
  reset: () => void;
}

const getInitialState = () => ({
  queueTree: null,
  originalConfig: {},
  propertyChanges: new Map(),
  propertyDefinitions: [],
  nodes: new Map(),
  nodeLabelChanges: new Map(),
  loading: false,
  error: null,
  commitStatus: 'idle' as CommitStatus,
  commitError: null
});

export const useYarnSchedulerStore = create<YarnSchedulerStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...getInitialState(),

      updateProperty: (propertyPath: string, value: unknown) => {
        const { originalConfig, propertyChanges } = get();
        const originalValue = originalConfig[propertyPath];

        if (value === originalValue) {
          propertyChanges.delete(propertyPath);
        } else {
          propertyChanges.set(propertyPath, {
            originalValue,
            stagedValue: value
          });
        }

        set({ propertyChanges: new Map(propertyChanges) });
      },

      addQueue: (parentPath: string, name: string, initialCapacity: number) => {
        const { queueTree, propertyChanges } = get();
        if (!queueTree) return;

        const newQueue: QueueNode = {
          path: `${parentPath}.${name}`,
          name,
          config: { capacity: String(initialCapacity) },
          children: [],
          isNew: true
        };

        const addNodeToTree = (node: QueueNode, targetPath: string, nodeToAdd: QueueNode): QueueNode => {
          if (node.path === targetPath) {
            return {
              ...node,
              children: [...node.children, nodeToAdd]
            };
          }

          return {
            ...node,
            children: node.children.map(child => addNodeToTree(child, targetPath, nodeToAdd))
          };
        };

        const updatedTree = addNodeToTree(queueTree, parentPath, newQueue);

        propertyChanges.set(
          `yarn.scheduler.capacity.${newQueue.path}.capacity`,
          { originalValue: undefined, stagedValue: String(initialCapacity) }
        );

        set({
          queueTree: updatedTree,
          propertyChanges: new Map(propertyChanges)
        });
      },

      removeQueue: (queuePath: string) => {
        const { queueTree, propertyChanges, originalConfig } = get();
        if (!queueTree) return;

        const markQueueAsDeleted = (node: QueueNode, targetPath: string): QueueNode => {
          if (node.path === targetPath) {
            const updatedNode = { ...node, isDeleted: true };

            if (node.config.state === 'RUNNING') {
              const statePath = `yarn.scheduler.capacity.${queuePath}.state`;
              propertyChanges.set(statePath, {
                originalValue: originalConfig[statePath] || 'RUNNING',
                stagedValue: 'STOPPED'
              });
            }

            return updatedNode;
          }

          return {
            ...node,
            children: node.children.map(child => markQueueAsDeleted(child, targetPath))
          };
        };

        const updatedTree = markQueueAsDeleted(queueTree, queuePath);

        set({
          queueTree: updatedTree,
          propertyChanges: new Map(propertyChanges)
        });
      },

      commitChanges: async () => {
        set({ commitStatus: 'committing', commitError: null });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        set({ 
          commitStatus: 'success',
          propertyChanges: new Map(),
          nodeLabelChanges: new Map()
        });
      },

      revertAllChanges: () => {
        const { originalConfig } = get();
        
        set({
          propertyChanges: new Map(),
          nodeLabelChanges: new Map(),
          queueTree: originalConfig ? buildQueueTreeFromConfig(originalConfig) : null
        });
      },

      assignNodeLabel: (nodeId: string, label: string) => {
        const { nodes, nodeLabelChanges } = get();
        const node = nodes.get(nodeId);
        
        if (!node) return;

        const originalLabels = node.nodeLabels || [];
        const existingChange = nodeLabelChanges.get(nodeId);
        const currentLabels = existingChange?.stagedLabels || originalLabels;
        
        if (!currentLabels.includes(label)) {
          nodeLabelChanges.set(nodeId, {
            nodeId,
            originalLabels,
            stagedLabels: [...currentLabels, label]
          });

          set({ nodeLabelChanges: new Map(nodeLabelChanges) });
        }
      },

      removeNodeLabel: (nodeId: string, label: string) => {
        const { nodes, nodeLabelChanges } = get();
        const node = nodes.get(nodeId);
        
        if (!node) return;

        const currentLabels = node.nodeLabels || [];
        const stagedLabels = currentLabels.filter(l => l !== label);

        if (stagedLabels.length !== currentLabels.length) {
          nodeLabelChanges.set(nodeId, {
            nodeId,
            originalLabels: currentLabels,
            stagedLabels
          });

          set({ nodeLabelChanges: new Map(nodeLabelChanges) });
        }
      },

      hasChanges: () => {
        const { propertyChanges, nodeLabelChanges } = get();
        return propertyChanges.size > 0 || nodeLabelChanges.size > 0;
      },

      getQueueByPath: (path: string) => {
        const findQueue = (node: QueueNode | null, targetPath: string): QueueNode | null => {
          if (!node) return null;
          if (node.path === targetPath) return node;
          
          for (const child of node.children) {
            const found = findQueue(child, targetPath);
            if (found) return found;
          }
          
          return null;
        };

        return findQueue(get().queueTree, path);
      },

      getPropertyValue: (path: string) => {
        const { originalConfig, propertyChanges } = get();
        const change = propertyChanges.get(path);
        const original = originalConfig[path];

        return {
          original,
          staged: change?.stagedValue ?? original,
          isDirty: propertyChanges.has(path)
        };
      },

      setQueueTree: (tree: QueueNode | null) => set({ queueTree: tree }),
      setOriginalConfig: (config: Record<string, string>) => set({ originalConfig: config }),
      setNodes: (nodes: Map<string, NodeInfo>) => set({ nodes }),

      reset: () => set(getInitialState())
    })),
    {
      name: 'yarn-scheduler-store'
    }
  )
);

const buildQueueTreeFromConfig = (config: Record<string, string>): QueueNode | null => {
  const rootConfig: Record<string, string> = {};
  Object.entries(config).forEach(([key, value]) => {
    if (key.startsWith('yarn.scheduler.capacity.root.') && !key.includes('.', 29)) {
      const prop = key.substring(29);
      rootConfig[prop] = value;
    }
  });

  return {
    path: 'root',
    name: 'root',
    config: rootConfig,
    children: []
  };
};