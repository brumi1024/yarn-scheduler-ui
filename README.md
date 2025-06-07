# YARN Scheduler UI

A modern web-based interface for managing Apache Hadoop YARN Capacity Scheduler configurations. This tool provides an intuitive visual interface for viewing, editing, and managing queue hierarchies in YARN clusters.

## Features

- **Visual Queue Tree**: Interactive hierarchical view of scheduler queues
- **Multi-mode Capacity Management**: Support for percentage, weight, and absolute resource modes
- **Batch Operations**: Stage multiple changes and apply them atomically
- **Real-time Validation**: Client-side validation with capacity totals checking
- **Search & Sort**: Find queues quickly with search and sorting options
- **Change Tracking**: Visual indicators for pending additions, modifications, and deletions

<img width="3200" alt="Screenshot 2025-06-02 at 9 47 02" src="https://github.com/user-attachments/assets/6c23a8e3-e5f8-4c47-bf8f-20aaae547e9b" />
<img width="3200" alt="Screenshot 2025-06-02 at 9 47 11" src="https://github.com/user-attachments/assets/47402e7a-3335-4aca-82fc-a2112dd0c941" />
<img width="3200" alt="Screenshot 2025-06-02 at 9 47 15" src="https://github.com/user-attachments/assets/4e11fc47-2d98-4125-8aae-9ef70afad06e" />

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/brumi1024/yarn-scheduler-ui.git
    cd yarn-scheduler-ui
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

### Running the Application

Start the development server:

```bash
npm start
```

This will start a local HTTP server on port 8080. Open your browser and navigate to:

- http://localhost:8080
- http://127.0.0.1:8080

The application will automatically load with mock data for development and testing.

### Available Scripts

- `npm start` - Start the development server
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Automatically fix ESLint issues
- `npm run format` - Format code with Prettier

## Important

The project is currently under development, and later it will be part of the Hadoop repository.

## Live demo

[Here](https://brumi1024.github.io/yarn-scheduler-ui/)
