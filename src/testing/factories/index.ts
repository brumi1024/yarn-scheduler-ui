/**
 * Re-export all factory functions from domain-specific files
 * This maintains backward compatibility while organizing factories by domain
 */

// For now, re-export from the existing factories file
export * from './factories';

// As the project grows, we can split into domain-specific files:
// export * from './queue-factories';
// export * from './property-factories';
// export * from './staged-change-factories';
// export * from './node-label-factories';
// export * from './scheduler-factories';
// export * from './resource-factories';
