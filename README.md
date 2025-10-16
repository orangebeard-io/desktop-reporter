# Orangebeard Desktop Reporter

A production-grade desktop reporter application for Orangebeard built with **Electron 32**, **React 18**, and **TypeScript**.

Docs: https://docs.orangebeard.io/connecting-test-tools/desktop-reporter/

## Stack

- **Electron 32** + **Electron Forge** - Desktop application framework
- **React 18** + **TypeScript** - UI framework with strong typing
- **Vite** - Fast build tooling and HMR
- **Tailwind CSS** - Utility-first styling with Orangebeard branding
- **shadcn/ui** - Accessible component primitives
- **Zustand** - Lightweight state management
- **Zod** - Schema validation and type safety
- **React Router** - Client-side routing
- **Vitest** + **Playwright** - Unit and E2E testing

## Features

- ✅ **Portrait Sidebar Layout** - 25% width, full height, docked to right edge
- ✅ **Frameless Window** - Custom titlebar with window controls
- ✅ **Secure Electron** - Context isolation, sandbox, no node integration
- ✅ **Always-On-Top** - Configurable window behavior
- ✅ **Proxy Support** - HTTP/HTTPS proxy configuration
- ✅ **File-Based Test Sets** - Portable `.obset.json` files (ideal for Git)
- ✅ **Nested Structure** - Suites → Sub-Suites → Tests → Steps (nested)
- ✅ **Lazy Run Creation** - Run starts on first status mark
- ✅ **Attachment Support** - Drag/drop, paste screenshot, file picker (≤32MB)
- ✅ **Notes & Logs** - Markdown-friendly notes converted to logs
- ✅ **Keyboard Shortcuts** - P/F/S for Pass/Fail/Skip, Enter for rename, Del for delete
- ✅ **Multi-Platform** - Windows (x64/arm64), macOS (Intel/Apple Silicon), Linux (x64)
- ✅ **Drag-and-Drop Reordering** - Reorder suites, tests, and steps within parents

## Project Status

### ✅ Completed (Core Infrastructure)

- Configuration files (Forge, Vite, TypeScript, Tailwind, ESLint, Prettier)
- Domain models with Zod validation
- Main process with window management and IPC handlers
- Preload script with typed contextBridge API
- Config persistence (userData/config.json)
- Example test set with nested structures
- Basic React app with custom titlebar

### ✅ Completed Implementation

- Zustand state management (configSlice, testSetSlice, runSlice)
- Orangebeard client service adapter
- RunCoordinator orchestration
- React components (Tree, DetailsPane, Attachments, etc.)
- Settings and Runner routes
- shadcn/ui component integration
- Utilities (files, clipboard, ID generation)
- Comprehensive unit and E2E tests
- Drag-and-drop reordering functionality
- CI/CD workflows (GitHub Actions)

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v8 or higher

### Installation

```bash
npm install
```

### Development

```bash
# Start with hot reload
npm run dev

# Lint & format
npm run lint
npm run format
npm run typecheck

# Tests
npm test
npm run test:e2e
```

### Building

```bash
# Build for current platform
npm run build

# Package for specific platforms
npm run pack:win      # Windows (MSI)
npm run pack:mac      # macOS (ZIP)
npm run pack:linux    # Linux (DEB + ZIP)
```

## Configuration

App configuration is stored at `{userData}/config.json`:

```json
{
  "baseUrl": "https://app.orangebeard.io",
  "proxy": {
    "host": "proxy.example.com",
    "port": 8080,
    "username": "user",
    "password": "pass"
  },
  "alwaysOnTop": false,
  "listenerToken": "uuid-v4-token-here"
}
```

**Security Note**: The listener token is stored ONLY in config.json, never in test set files.

## Test Set Files (.obset.json)

Test sets are portable JSON files:

```json
{
  "schemaVersion": "1.0.0",
  "metadata": {
    "organization": "my-org",
    "project": "my-project",
    "testSetName": "Sample Suite",
    "description": "Optional description"
  },
  "structure": {
    "suites": [
      {
        "id": "suite-1",
        "name": "Suite Name",
        "suites": [],
        "tests": [
          {
            "id": "test-1",
            "name": "Test Name",
            "notes": "Test notes (markdown allowed)",
            "steps": [
              {
                "id": "step-1",
                "name": "Step Name",
                "notes": "Step notes",
                "steps": []
              }
            ]
          }
        ]
      }
    ]
  }
}
```

See `examples/sample.obset.json` for a complete example.

## Architecture

### Electron Multi-Process

- **Main Process** (`src/main/`) - Window management, IPC handlers, config persistence
- **Preload Script** (`src/main/preload.ts`) - Secure typed bridge via contextBridge
- **Renderer Process** (`src/renderer/`) - React app with Zustand state

### Key Design Decisions

1. **Lazy Run Creation** - Test run is created only when the first test or step receives a status
2. **Stateless Suites** - Suites are organizational folders with no status
3. **Auto-Finish Tests** - Tests automatically finish when all steps have terminal status
4. **Portable Files** - Test set files contain no credentials or execution state
5. **Immediate Upload** - Attachments uploaded immediately on add (with 32MB size validation)
6. **Notes as Logs** - Non-empty notes become log entries when reporting status

## Documentation

- **PROJECT_STATUS.md** - Detailed implementation status and roadmap
- **WARP.md** - Guidance for AI assistants working in this repo
- **examples/** - Sample test set demonstrating schema

## Development Workflow

1. Load/create test set file (.obset.json)
2. Mark tests/steps with P/F/S keyboard shortcuts
3. First status anywhere creates run and reports hierarchy
4. Add notes, attachments as needed
5. Finish run manually or automatically when all tests done
6. Test set file remains reusable for next run

## Security

- ✅ Context isolation enabled
- ✅ Sandbox mode enabled
- ✅ Node integration disabled
- ✅ Remote module disabled
- ✅ All IPC payloads validated with Zod
- ✅ Content Security Policy in HTML
- ✅ Token stored only in app config, not in test files

## CI/CD

The project includes GitHub Actions workflows:

- **CI** (`ci.yml`) - Runs tests on every PR and push to ensure code quality (Linux only for stability)
- **Release** (`release.yml`) - Automated releases with version bumping and multi-platform builds:
  - Windows: MSI installer
  - macOS: ZIP archive (Intel + Apple Silicon universal binary)
  - Linux: DEB package + ZIP archive

## Contributing

The core implementation is complete. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm run lint` and `npm run typecheck`
5. Submit a pull request

## License

ISC
