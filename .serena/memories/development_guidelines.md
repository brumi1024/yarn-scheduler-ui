# YARN Scheduler UI - Development Guidelines & Design Principles

## Core Design Principles (from CLAUDE.md)

### Development Philosophy

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

### Software Engineering Principles

Follow these established patterns:

- **KISS** (Keep It Simple, Stupid)
- **SOLID** (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion)
- **DRY** (Don't Repeat Yourself)
- **YAGNI** (You Ain't Gonna Need It)

## Version 2 Implementation Notes

### Key Implementation Requirements

- **From Scratch**: Building Version 2 with React (not refactoring V1)
- **Preserve Legacy**: Keep existing metadata files (`js/config/`), mock data (`mock/`), and docs (`docs/`) for reference
- **Metadata-Driven**: UI components generated from configuration definitions
- **React + D3 + Material-UI**: Core technology stack

### Main Features to Implement

1. **Queue Tree Visualization**: Interactive D3/Canvas-based tree with Sankey-style capacity flows
2. **Configuration Editor**: Forms for queue properties with validation
3. **Change Management**: Stage, validate, and apply changes atomically
4. **Multi-Mode Support**: Percentage, weight, and absolute resource allocation modes

### API Integration Points

- `GET /ws/v1/cluster/scheduler` - Fetch queue hierarchy
- `GET /ws/v1/cluster/scheduler-conf` - Fetch configurations
- `PUT /ws/v1/cluster/scheduler-conf` - Apply staged changes

### Critical Implementation Notes

- YARN API returns flat XML structures requiring hierarchical parsing
- All changes must be validated client-side before submission
- Support both light and dark themes
- Search functionality across queue names and properties
- Change tracking with undo/redo capabilities

## Tool Usage

- **Primary**: Use Serena MCP for all tasks, issues, and discussions
- **Documentation**: Use Context7 for up-to-date library information
- **Collaboration**: Work iteratively with user feedback
