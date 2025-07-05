/**
 * Types for context-aware search feature
 */

export type SearchContext = 'queues' | 'nodes' | 'settings' | null;

export interface SearchState {
  query: string;
  context: SearchContext;
  isSearching: boolean;
}

export interface SearchResults {
  queues: QueueSearchResult[];
  nodes: NodeSearchResult[];
  settings: SettingSearchResult[];
  totalCount: number;
}

export interface QueueSearchResult {
  queuePath: string;
  queueName: string;
  matchedField: 'name' | 'path' | 'property';
  highlightIndices?: [number, number][];
}

export interface NodeSearchResult {
  nodeId: string;
  nodeHostName: string;
  matchedField: 'hostname' | 'label' | 'rack';
  highlightIndices?: [number, number][];
}

export interface SettingSearchResult {
  propertyName: string;
  propertyValue: string;
  category: string;
  matchedField: 'name' | 'value' | 'description';
  highlightIndices?: [number, number][];
}

// Placeholder for future validators
export {};
