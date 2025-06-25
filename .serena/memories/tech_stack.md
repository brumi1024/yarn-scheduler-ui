# YARN Scheduler UI - Technology Stack

## Core Technologies

- **React**: 19.1.0 (Latest stable)
- **TypeScript**: ~5.8.3
- **Vite**: 6.3.5 (Build tool and dev server)
- **Node.js**: Version 14+ required

## UI Framework & Styling

- **Material-UI (MUI)**: 6.2.0 (Primary UI component library)
- **Emotion**: 11.14.0 (CSS-in-JS styling)

## Data Visualization

- **D3 Libraries**: Multiple D3 modules for data visualization
    - d3-array, d3-ease, d3-interpolate, d3-path, d3-scale, d3-timer
- **XY Flow React**: 12.7.0 (For flowchart/node-based visualizations)
- **Dagre**: 0.8.5 (Graph layout algorithm)

## State Management & API

- **Zustand**: 5.0.5 (Lightweight state management)
- **TanStack React Query**: 5.80.7 (Server state management & caching)
- **React Hook Form**: 7.57.0 (Form state management)
- **Zod**: 3.25.64 (Schema validation)

## Development Tools

- **ESLint**: 9.28.0 (Code linting)
- **Prettier**: 3.2.5 (Code formatting)
- **Vitest**: 2.1.8 (Testing framework)
- **Happy DOM**: 18.0.1 (DOM environment for testing)
- **MSW**: 2.10.2 (API mocking for development)

## Utility Libraries

- **Lodash**: 4.17.21 (Utility functions)
- **Nanoid**: 5.1.5 (ID generation)
- **Use-debounce**: 10.0.5 (Debouncing hook)

## Build Configuration

- **TypeScript Project References**: Uses composite tsconfig setup
- **ES Modules**: Type: "module" in package.json
- **Vite Dev Server**: Configured to run on port 8080
