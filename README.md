# YARN Scheduler UI

A modern web-based interface for managing Apache Hadoop YARN Capacity Scheduler configurations. This application provides visual tools for viewing and editing queue hierarchies, managing capacity allocations, and configuring scheduler settings.

## Features

- **Queue Management**
  - Visual queue hierarchy with interactive tree view
  - Create, edit, and delete queues
  - Configure queue capacities and resource allocations
  - Set queue states (RUNNING, STOPPED, DRAINING)

- **Resource Allocation**
  - Configure queue capacities using percentage, weight, or absolute modes
  - Set minimum and maximum capacity limits
  - Manage user and application limits

- **Node Labels**
  - Create and manage node labels
  - Assign labels to queues
  - Configure label-specific capacities

- **Global Settings**
  - Configure cluster-wide scheduler properties
  - Set maximum applications and AM resource limits
  - Configure resource calculator and other global parameters

- **Staged Changes**
  - Preview all pending configuration changes
  - Apply changes in batch
  - Revert individual changes or clear all

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Routing**: React Router v7
- **State Management**: Zustand
- **UI Components**: Shadcn with Tailwind CSS
- **Data Visualization**: React Flow (xyflow)
- **Build Tool**: Vite
- **Testing**: Vitest with React Testing Library
- **API Client**: Custom YARN REST API client

## Project Structure

```
yarn-scheduler-ui/
├── src/
│   ├── app/              # Application entry points and routes
│   ├── components/       # Shared UI components
│   ├── features/         # Feature-specific modules
│   │   ├── global-settings/
│   │   ├── node-labels/
│   │   ├── property-editor/
│   │   ├── queue-management/
│   │   └── staged-changes/
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and helpers
│   ├── stores/           # Zustand stores
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── public/               # Static assets
├── docs/                 # Documentation
└── tests/                # Test files
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Access to a YARN ResourceManager REST API

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd yarn-scheduler-ui
```

2. Install dependencies:

```bash
npm install
```

3. Configure the YARN API endpoint (optional):
   Create a `.env` file with your YARN ResourceManager URL:

```env
VITE_YARN_API_URL=http://your-yarn-rm:8088
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building

Build for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Testing

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test
```

Run tests with UI:

```bash
npm run test:ui
```

Generate coverage report:

```bash
npm run test:coverage
```

## Code Quality

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Formatting

```bash
npm run format
npm run format:check
```

## Development Guidelines

### Component Structure

- Use functional components with TypeScript
- Place feature-specific components in their feature directory
- Share common components in `src/components`

### State Management

- Global state is managed with Zustand stores
- Keep component state local when possible

### Testing

- Write tests for all new features
- Use React Testing Library for component tests
- Mock external dependencies appropriately

### Type Safety

- TypeScript strict mode is enabled
- Avoid `any` types
- Use proper type definitions for all data structures

## API Integration

The application integrates with YARN ResourceManager REST API endpoints:

- `/ws/v1/cluster/scheduler` - Scheduler information
- `/ws/v1/cluster/scheduler-conf` - Scheduler configuration
- `/ws/v1/cluster/node-labels` - Node label management

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Write/update tests
5. Ensure all tests pass and code quality checks succeed
6. Commit your changes
7. Push to your fork
8. Create a Pull Request

## Support

For issues and feature requests, please use the GitHub issue tracker.
