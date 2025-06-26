# CLAUDE.md

This file provides project-specific guidance to Claude Code (claude.ai/code) when working with the YARN Scheduler UI repository. It extends the global CLAUDE.md configuration and focuses on project-specific details.

**Note**: For general development practices, testing methodology, TypeScript guidelines, and code style conventions, refer to the global CLAUDE.md file (~/.claude/CLAUDE.md).

## Project Overview

The YARN Scheduler UI is a web-based interface for managing Apache Hadoop YARN Capacity Scheduler configurations. It provides visual tools for viewing and editing queue hierarchies, managing capacity allocations, and configuring scheduler settings.

## Version 2 Development Instructions

**IMPORTANT**: We are creating Version 2 from scratch using React. The existing metadata files (`js/config/`), mock data (`mock/`), and documentation (`docs/`) should remain in the project for reference and future use.

## Tool uses

- **IMPORTANT**: Let's use serena MCP for all tasks, issues, and discussions. Use Context7 for up-to-date information about libraries. Always use sequential-thinking and also playwright.

## Development Commands

```bash
# Start development server on http://localhost:8080
npm start

# Run ESLint
npm run lint

# Auto-fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format
```

## Architecture

### Version 2 Implementation

Version 2 uses React + D3 + Material-UI as documented in `docs/blueprint.md` and `docs/todo.md`. The implementation follows a metadata-driven architecture where UI components are generated from configuration definitions.

**Key architectural decisions from v4 design:**
- **Dual-loading approach**: Load queue tree structure from `/scheduler` (no parsing needed) and configuration values from `/scheduler-conf`
- **State management**: Use Zustand with Immer for immutable state updates
- **Staged changes**: Track configuration changes locally before applying atomically via mutation API
- **Property parsing**: Use `lastIndexOf('.')` to split queue paths from property names
- **Queue name validation**: Queue names cannot contain dots (.) as YARN uses dots as path separators

### Key Components

**Configuration Metadata** (`js/config/`):

- `config-metadata-queue.js`: Queue property definitions
- `config-metadata-global.js`: System-wide settings
- `config-metadata-node-labels.js`: Node label configurations
- `config-metadata-scheduler-info.js`: Scheduler information
- `config-metadata-auto-creation.js`: Auto-creation policies

**Mock Data** (`mock/ws/v1/cluster/`):

- API response structures for development
- Queue hierarchy and configuration samples

### Main Features to Implement

1. **Queue Tree Visualization**: Interactive D3/Canvas-based tree with Sankey-style capacity flows
2. **Configuration Editor**: Forms for queue properties with validation
3. **Change Management**: Stage, validate, and apply changes atomically
4. **Multi-Mode Support**: Percentage, weight, and absolute resource allocation modes

### API Integration

The UI will interact with YARN REST APIs:

**Primary Endpoints:**
- GET `/ws/v1/cluster/scheduler` - Fetch queue hierarchy with live metrics (tree structure pre-built by YARN)
- GET `/ws/v1/cluster/scheduler-conf` - Fetch current configuration properties
- PUT `/ws/v1/cluster/scheduler-conf` - Apply staged changes atomically
- POST `/ws/v1/cluster/scheduler-conf/validate` - Validate changes without applying

**Node Label Endpoints:**
- POST `/ws/v1/cluster/add-node-labels` - Add new labels
- POST `/ws/v1/cluster/remove-node-labels` - Remove labels
- GET `/ws/v1/cluster/get-node-labels` - List all labels
- GET `/ws/v1/cluster/get-node-to-labels` - Get node-to-label mappings

**Core Workflow:**
1. Load both `/scheduler` and `/scheduler-conf` in parallel for initial data
2. User edits properties through metadata-driven forms
3. Changes are staged locally with validation
4. Apply changes via mutation API
5. Refresh data to reflect new configuration

### Important Implementation Notes

- The `/scheduler` endpoint returns pre-built queue hierarchy - no parsing needed!
- The `/scheduler-conf` endpoint returns flat property list that needs to be mapped to queues
- Queue names cannot contain dots (.) - YARN uses dots as path separators with no escaping mechanism
- Use property parsing algorithm: `lastIndexOf('.')` to split queue paths from property names
- All changes must be validated client-side before submission
- Support metadata-driven property descriptors for dynamic form generation
- The UI should support both light and dark themes
- Search functionality should work across queue names and properties
- Change tracking should enable undo/redo capabilities
- Node label properties add an extra dimension: `<queue-path>.accessible-node-labels.<label>.<property>`