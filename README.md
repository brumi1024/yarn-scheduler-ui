# YARN Scheduler UI

A modern web interface for managing Apache Hadoop YARN Capacity Scheduler configurations. The app provides visual tools for exploring queue hierarchies, adjusting capacities, validating placement rules, and applying changes with confidence.

## Features

- **Queue Management**
  - Draggable, zoomable tree view
  - Create, edit, and delete queues with live validation
  - Configure capacities, states (RUNNING, STOPPED, DRAINING), ACLs, and limits
- **Placement Rules**
  - Author and validate placement rules with guided forms
  - Preview rule evaluation context before applying updates
- **Queue Comparison**
  - Compare staged changes against the live scheduler configuration
  - Highlight deltas before saving
- **Node Labels**
  - Manage labels and assignments with per-label capacity controls
- **Global Settings**
  - Configure cluster-wide scheduler properties and resource calculators
- **Staged Changes**
  - Review all pending edits, apply in batches, or revert granularly

## Tech Stack & Tooling

- **Framework**: React 19 + TypeScript (strict mode)
- **Routing & Bundler**: React Router v7 CLI (SPA mode, powered by Vite tooling)
- **Compiler**: React Compiler (babel-plugin-react-compiler) for automatic optimization
- **State Management**: Zustand with Immer
- **UI / Styling**: Tailwind CSS + shadcn/ui + Radix primitives
- **Data Visualization**: XYFlow (React Flow)
- **Forms & Validation**: React Hook Form + Zod
- **Testing**: Vitest, React Testing Library, MSW
- **Code Quality**: ESLint, Prettier, Husky/lint-staged

## Project Structure

```
yarn-scheduler-ui/
├── src/
│   ├── app/               # React Router entry points and route modules
│   ├── config/            # Scheduler schemas, defaults, property metadata
│   ├── features/          # Feature slices (queues, placement-rules, comparison, etc.)
│   ├── hooks/             # Shared React hooks
│   ├── lib/               # API client, msw handlers, utilities
│   ├── stores/            # Zustand stores and selectors
│   ├── testing/           # Test factories, mocks, and setup utilities
│   ├── types/             # Shared TypeScript types and constants
│   └── utils/             # Domain-specific helpers and validation
├── public/                # Static assets and mock API payloads
├── docs/                  # YARN scheduler reference docs
├── react-router.config.ts # React Router bundler configuration
└── vitest.config.ts       # Vitest configuration
```

## Getting Started

### Prerequisites

- Node.js 22.16.0 (see `.tool-versions`)
- npm 10+
- Access to a YARN ResourceManager REST API (for live integrations)

### Installation

```bash
git clone <repository-url>
cd yarn-scheduler-ui
npm install
```

### Environment configuration

Create a `.env` file to describe how the UI should reach YARN APIs:

```env
# Base ResourceManager endpoint (optional; defaults to /ws/v1/cluster relative to the origin)
VITE_YARN_API_URL=http://rm-host:8088/ws/v1/cluster

# Mock service modes (defaults to `static` in dev builds)
# static  - serves JSON fixtures from public/mock/ws/v1/cluster via MSW
# cluster - proxies browser requests to the configured cluster target
# off     - disables the mock service worker entirely
VITE_API_MOCK_MODE=static

# Required when VITE_API_MOCK_MODE=cluster to proxy through the dev server
VITE_CLUSTER_PROXY_TARGET=http://rm-host:8088
VITE_MOCK_CLUSTER_URL=/ws/v1/cluster

# Username used for simple-authenticated clusters
VITE_YARN_USER_NAME=yarn
```

Mock payloads live in `public/mock/ws/v1/cluster/*.json` and are served automatically when `VITE_API_MOCK_MODE=static` (the default for `npm run dev`).

## Development

Start the development server:

```bash
npm run dev
```

The React Router dev server runs at `http://localhost:5173`. In development, MSW boots automatically when mock mode is `static`.

To switch between mocked data and a live cluster, update `.env` and restart the dev server. The bundler is configured for SPA mode (`react-router.config.ts` sets `ssr: false`); flip this flag if you need server rendering.

## Building & Deployment

Build the production bundles:

```bash
npm run build
```

Serve the built app locally (uses `react-router-serve`):

```bash
npm start
```

Artifacts are emitted to `./build`. Provide the same environment variables at runtime to point at the desired ResourceManager.

## Testing & Quality

- **Unit / integration tests (watch)**: `npm run test`
- **CI-friendly test run**: `npm run test:run`
- **Coverage report**: `npm run test:coverage`
- **Interactive test UI**: `npm run test:ui`
- **Type generation + type checking**: `npm run typecheck`
- **Linting**: `npm run lint` (or `npm run lint:fix` to auto-fix)
- **Lint SARIF for CI**: `npm run lint:ci` (generates SARIF report for CI pipelines)
- **Formatting**: `npm run format` / `npm run format:check`

## Contributing

1. Fork the repository and create a feature branch (`git checkout -b feature/your-feature`).
2. Make changes and add tests where appropriate.
3. Run linting, formatting, typecheck, and the relevant test commands.
4. Commit with clear messages and push to your fork.
5. Open a Pull Request describing the change and any manual verification performed.

## Support

Report bugs and request features through the GitHub issue tracker. Contributions, questions, and feedback are welcome!
