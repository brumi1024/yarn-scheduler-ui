# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The YARN Scheduler UI is a web-based interface for managing Apache Hadoop YARN Capacity Scheduler configurations. It provides visual tools for viewing and editing queue hierarchies, managing capacity allocations, and configuring scheduler settings.

## Version 2 Development Instructions

**IMPORTANT**: We are creating Version 2 from scratch using React. The existing metadata files (`js/config/`), mock data (`mock/`), and documentation (`docs/`) should remain in the project for reference and future use.

### Design Principles

1. **Don't overengineer**: Simple beats complex
2. **No fallbacks**: One correct path, no alternatives
3. **One way**: One way to do things, not many
4. **Clarity over compatibility**: Clear code beats backward compatibility
5. **Throw errors**: Fail fast when preconditions aren't met
6. **No backups**: Trust the primary mechanism
7. **Separation of concerns**: Each function should have a single responsibility

### Development Methodology

1. **Surgical changes only**: Make minimal, focused fixes
2. **Evidence-based debugging**: Add minimal, targeted logging
3. **Fix root causes**: Address the underlying issue, not just symptoms
4. **Simple > Complex**: Let TypeScript catch errors instead of excessive runtime checks
5. **Collaborative process**: Work with user to identify most efficient solution
6. **Testing**: Create unit tests after each task for critical paths (not 100% coverage)
7. **Minimal commenting**: JSDoc is ok, specific segment comments are ok, avoid development comments

Follow: KISS, SOLID, DRY, YAGNI

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

- GET `/ws/v1/cluster/scheduler` - Fetch queue hierarchy
- GET `/ws/v1/cluster/scheduler-conf` - Fetch configurations
- PUT `/ws/v1/cluster/scheduler-conf` - Apply staged changes

### Important Implementation Notes

- The YARN API returns flat XML structures that need to be parsed into hierarchical trees
- All changes must be validated client-side before submission
- The UI should support both light and dark themes
- Search functionality should work across queue names and properties
- Change tracking should enable undo/redo capabilities

Refer to `docs/specs.md` for detailed technical specifications and `docs/blueprint.md` for the React implementation approach.
