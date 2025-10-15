# CI/CD Documentation

This project uses GitHub Actions for continuous integration and automated releases.

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Pull requests to `master` or `main` branches
- Pushes to `master` or `main` branches

**What it does:**
- Runs on Ubuntu, Windows, and macOS
- Executes the following checks:
  - TypeScript type checking (`npm run typecheck`)
  - ESLint linting (`npm run lint`)
  - Unit tests (`npm test`)
  - Application build (`npm run build`)
  - End-to-end tests (`npm run test:e2e`)

**Requirements:**
- All tests must pass before a PR can be merged
- Tests run in parallel on all three platforms

### 2. Release Workflow (`release.yml`)

**Triggers:**
- Pushes to `master` or `main` branches (after PR merge)

**What it does:**
1. **Version and Tag:**
   - Checks if there are commits since the last tag
   - Bumps the patch version automatically
   - Creates a new git tag
   - Pushes the version bump commit and tag back to the repository

2. **Build and Release:**
   - Builds distributable packages for:
     - **Windows:** `.zip` file (x64)
     - **macOS:** `.dmg` file (Universal - Intel & Apple Silicon)
     - **Linux:** `.deb` file (Debian/Ubuntu) and `.zip` file
   - Uploads artifacts from each platform

3. **Create Release:**
   - Downloads all build artifacts
   - Generates release notes from git commit history
   - Creates a GitHub Release with:
     - Tag: `vX.Y.Z`
     - Release notes
     - All platform-specific installers as assets

## Release Process

### Automatic Releases (Recommended)

1. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. Push and create a PR:
   ```bash
   git push origin feature/my-feature
   ```

4. Once the PR is approved and CI passes, merge to `master`

5. The release workflow will automatically:
   - Bump the version (e.g., 1.0.0 → 1.0.1)
   - Build packages for all platforms
   - Create a GitHub Release with all installers

### Version Bumping

The workflow automatically bumps the **patch** version (X.Y.Z → X.Y.Z+1).

To bump minor or major versions manually before merging:

```bash
# Minor version (1.0.0 → 1.1.0)
npm version minor

# Major version (1.0.0 → 2.0.0)
npm version major

git push origin master --follow-tags
```

## Skipping Releases

To push to master without creating a release, include `[skip ci]` in your commit message:

```bash
git commit -m "docs: update README [skip ci]"
```

Note: The release workflow checks for new commits since the last tag, so it won't create duplicate releases.

## Distribution Files

After a successful release, users can download:

### Windows
- `orangebeard-desktop-reporter-win32-x64-X.Y.Z.zip`
  - Extract and run `orangebeard-desktop-reporter.exe`

### macOS
- `Orangebeard Desktop Reporter-X.Y.Z.dmg`
  - Open the DMG and drag to Applications folder
  - Works on both Intel and Apple Silicon Macs

### Linux
- `orangebeard-desktop-reporter_X.Y.Z_amd64.deb` (Debian/Ubuntu)
  - Install with: `sudo dpkg -i orangebeard-desktop-reporter_X.Y.Z_amd64.deb`
- `orangebeard-desktop-reporter-linux-x64-X.Y.Z.zip` (other distributions)
  - Extract and run the executable

## Troubleshooting

### Build Failures

If a platform-specific build fails:

1. Check the workflow logs in the Actions tab
2. Common issues:
   - Missing dependencies (check `package.json`)
   - Asset files not found (check `forge.config.ts`)
   - Platform-specific code errors

### Release Not Created

If a release isn't created after merging:

1. Check if there were commits since the last tag:
   ```bash
   git describe --tags --abbrev=0
   git log <last-tag>..HEAD
   ```

2. Verify the workflow ran in the Actions tab
3. Check that `[skip ci]` wasn't in any commit messages

### Missing Artifacts

If some platform builds are missing from the release:

1. Check individual build job logs in the Actions tab
2. Verify the makers are configured in `forge.config.ts`
3. Ensure the correct scripts are in `package.json`

## Local Testing

To test builds locally before releasing:

```bash
# Windows
npm run pack:win

# macOS
npm run pack:mac

# Linux
npm run pack:linux
```

Build artifacts will be in the `out/make` directory.
