# YARN Scheduler UI - Development Commands

## Primary Development Commands

### Starting Development

```bash
# Start development server (primary command)
npm start

# Alternative development command
npm run dev
```

Both commands start the Vite dev server on http://localhost:8080 with hot reload enabled.

### Code Quality & Formatting

```bash
# Check code quality with ESLint
npm run lint

# Auto-fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Testing

```bash
# Run tests with Vitest
npm test

# Run tests with UI interface
npm test:ui
```

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### CI/CD Commands

```bash
# ESLint for CI with SARIF output
npm run lint:ci
```

## System Commands (Darwin/macOS)

Since this project runs on Darwin (macOS), these standard commands are available:

- `ls` - List directory contents
- `cd` - Change directory
- `grep` - Search text patterns
- `find` - Find files and directories
- `git` - Version control operations
- `open` - Open files/URLs in default applications

## File Watching & Development

The development server automatically watches for changes in:

- TypeScript/JavaScript files (.ts, .tsx, .js)
- CSS files
- HTML files
- Configuration files

## Port Information

- **Development Server**: http://localhost:8080 or http://127.0.0.1:8080
- The application automatically loads with mock data for development
