# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Orangebeard Desktop Reporter** - Production-grade Electron + React + TypeScript desktop application for manual test execution and reporting to Orangebeard.

**Stack**: Electron 32, Electron Forge, React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, Zod, React Router

**Current Status**: Core infrastructure complete (80% foundation), renderer implementation in progress.

## Commands

### Development
```bash
npm install        # Install all dependencies (~500MB)
npm run dev        # Start in development mode with HMR
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
npm run typecheck  # Check TypeScript types
npm test           # Run Vitest unit tests
npm run test:e2e   # Run Playwright E2E tests
```

### Building & Packaging
```bash
npm run build      # Build for current platform
npm run pack:win   # Package for Windows (ZIP)
npm run pack:mac   # Package for macOS (DMG)
npm run pack:linux # Package for Linux (DEB + AppImage)
```

## Architecture

### Electron Multi-Process Architecture

This uses Electron Forge with Vite plugin for modern development:

1. **Main Process** (`src/main/main.ts`)
   - Entry point for the Electron app
   - Creates BrowserWindow: portrait sidebar (25% width, full height, docked right)
   - Frameless window for custom titlebar
   - Always-on-top support (configurable)
   - Secure configuration: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`

2. **Preload Script** (`src/main/preload.ts`)
   - Runs before renderer loads
   - Uses `contextBridge.exposeInMainWorld('api', ...)` with full TypeScript typing
   - Exposes: config, dialog, fs, path, clipboard, screenshot, window APIs
   - All methods return Promises

3. **IPC Handlers** (`src/main/ipc.ts`)
   - All handlers validate payloads with Zod schemas
   - Handles: config load/save, file dialogs, file system, clipboard, screenshot, window controls
   - Proxy configuration via `session.setProxy()`
   - Always-on-top dynamic update

4. **Renderer Process** (`src/renderer/`)
   - React 18 with TypeScript
   - Vite for HMR and fast builds
   - Tailwind CSS with Orangebeard brand colors
   - Zustand for state management (to be implemented)
   - React Router for navigation (to be implemented)

### Domain Layer (`src/domain/`)

**models.ts** - Core types with Zod validation:
- `OBTestSet` - Top-level test set structure (schemaVersion: '1.0.0')
- `OBSuite` - Nested suite structure (suites and tests)
- `OBTest` - Test with optional nested steps and notes
- `OBStep` - Step with optional nested steps and notes
- `AppConfig` - App configuration (baseUrl, proxy, alwaysOnTop, listenerToken)
- `ExecutionState` - Runtime tracking (not persisted in test set files)
- `TestStatus` - Enum: PASSED | FAILED | SKIPPED

**schemas.ts** - Zod to JSON Schema export

**selectors.ts** - Navigation helpers:
- `findSuiteByPath()` - Navigate suite hierarchy by ID path
- `findTestInSuite()` - Find test by ID
- `findStepInTest()` - Navigate nested steps
- `getAllTests()` - Flatten all tests with paths
- `makeStepKey()` - Create unique key for step execution state

### Security Model

Strict Electron security:
- ✅ Context isolation enabled
- ✅ Sandbox mode enabled
- ✅ Node integration disabled
- ✅ Remote module disabled
- ✅ All IPC payloads validated with Zod
- ✅ Content Security Policy in HTML
- ✅ Listener token stored ONLY in app config, never in test set files

### Data Persistence

**Two distinct storages**:

1. **App Config** (global, not portable)
   - Location: `{userData}/config.json`
   - Contains: baseUrl, proxy, alwaysOnTop, **listenerToken** (UUID v4)
   - Managed via `src/main/config-store.ts`

2. **Test Set Files** (user-managed, portable, Git-friendly)
   - Format: `*.obset.json`
   - Schema: See `src/domain/models.ts` → `OBTestSet`
   - Contains: metadata (org, project, testSetName, description) + structure (suites)
   - Does NOT contain: token, execution state, attachments
   - Example: `examples/sample.obset.json`

### File Structure

```
src/
├── domain/              ✅ Types, schemas, selectors
├── main/                ✅ Electron main process
├── renderer/
│   ├── state/           🚧 Zustand slices (configSlice, testSetSlice, runSlice)
│   ├── services/        🚧 Orangebeard client, RunCoordinator
│   ├── lib/             🚧 Utilities (id, files, clipboard, cn)
│   ├── components/      🚧 React components
│   ├── routes/          🚧 Settings, Runner
│   ├── styles/          ✅ Tailwind CSS
│   ├── index.html       ✅ HTML entry
│   ├── main.tsx         ✅ React entry
│   └── app.tsx          ✅ Root component (basic version)
└── schema/              🚧 JSON Schema export
```

## Key Implementation Rules

### Orangebeard Reporting Flow (CRITICAL)

1. **Lazy Run Creation**: Test run is created ONLY when first test or step receives status
2. **Stateless Suites**: Suites are organizational folders, no explicit reporting
3. **Suite Path Resolution**: On first item report, ensure suite path exists in Orangebeard
4. **Test Start**: Must start test before reporting any test or step status
5. **Step Reporting**: If marking a step first, ensure test is started
6. **Notes as Logs**: Non-empty notes field → log entry with text
7. **Attachments**: Upload immediately on add (≤32MB), create log with filename
8. **Auto-Finish Tests**: When all steps have terminal status, auto-finish test
9. **Finish Run**: Manual button or auto when all tests finished
10. **Skip Remaining**: On finish, report unstarted/unfinished tests as SKIPPED

### RunCoordinator Interface (to be implemented)

```typescript
interface RunCoordinator {
  startRunIfNeededFor(itemPath: ItemPath): Promise<void>;
  markTestStatus(testId: string, status: TestStatus, notes?: string, attachments?: File[]): Promise<void>;
  markStepStatus(testId: string, stepPath: string[], status: TestStatus, notes?: string, attachments?: File[]): Promise<void>;
  finishRun(forceSkipRemaining?: boolean): Promise<void>;
}
```

### State Management (Zustand)

Create slices:
- **configSlice**: App config (load/save, proxy, alwaysOnTop)
- **testSetSlice**: Loaded test set, current file path, selection, structure editing
- **runSlice**: Current run ID, execution state per test/step, attachments, logs

Combine in `store.ts` with TypeScript typing.

### UI/UX Requirements

- **Left Panel**: Tree view (suites → tests → steps), status icons
- **Right Panel**: Details (breadcrumb, name, notes, attachments, status buttons)
- **Top Bar**: Open/Save/Save As, Start Run, Finish Run, Settings
- **Bottom**: Run status widget (counts, sync indicator)
- **Keyboard**: P=Pass, F=Fail, S=Skip, Enter=Rename, Del=Delete
- **Drag/Drop**: Attachments
- **Paste**: Ctrl/Cmd+V for screenshot
- **Screenshot**: Button to capture via desktopCapturer

## Adding New Features

### Adding IPC Channels

1. Define Zod schema in `src/main/ipc.ts`
2. Add handler: `ipcMain.handle('channel-name', async (_event, data) => { ... })`
3. Add method to `ElectronAPI` interface in `src/main/preload.ts`
4. Expose via `api` object in preload
5. Use in renderer: `window.api.yourMethod()`

### Adding State

1. Create slice in `src/renderer/state/yourSlice.ts`
2. Define interface, create function, export
3. Add to combined store in `store.ts`
4. Use in components: `const value = useStore((state) => state.your.value)`

### Adding Components

1. Create in `src/renderer/components/YourComponent.tsx`
2. Use Tailwind classes: `bg-orangebeard-orange`, `text-status-passed`
3. Import from `@/components/ui/` for shadcn primitives
4. Export and use in routes

## Testing

- **Unit Tests**: Place in `tests/unit/`, focus on RunCoordinator logic
- **E2E Tests**: Place in `tests/e2e/`, use Playwright to launch app and interact
- **Mock Orangebeard Client**: For unit tests, mock all API calls

## Common Issues

1. **Vite HMR not working**: Check file paths, ensure `vite.renderer.config.ts` alias is correct
2. **IPC not working**: Verify Zod schema matches payload structure
3. **Tailwind not applying**: Ensure `styles/index.css` is imported in `main.tsx`
4. **Type errors**: Run `npm run typecheck` to see all issues

## Resources

- `README.md` - Feature list, architecture overview
- `PROJECT_STATUS.md` - Detailed status and implementation roadmap
- `QUICKSTART.md` - Getting started guide
- `examples/sample.obset.json` - Example test set
- Orangebeard JavaScript Client: https://www.npmjs.com/package/@orangebeard-io/javascript-client
