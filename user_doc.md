# Orangebeard Desktop Reporter — User Guide

A lightweight desktop app to compose manual test sets, execute them, and report results to Orangebeard with rich logs and attachments.

[placeholder: hero screenshot of the app]

## 1. Installation

### 1.1 Windows
- Download the latest Windows installer.
- Double-click the installer and follow the prompts.
- Launch “Orangebeard Desktop Reporter” from the Start Menu.

[placeholder: screenshot of Windows installer]

### 1.2 macOS
- Download the macOS app archive and move “Orangebeard Reporter.app” to Applications.
- If macOS Gatekeeper blocks the app, run:
```bash
xattr -d com.apple.quarantine "/Applications/Orangebeard Reporter.app"
```
- Open “Orangebeard Reporter” from Applications.

[placeholder: screenshot of macOS app in /Applications]

### 1.3 Linux
- Debian/Ubuntu: download the .deb package and install:
```bash
sudo apt install ./orangebeard-desktop-reporter_<version>_amd64.deb
```
- Other distros: if no native package is available, run from source (see 1.4).

[placeholder: screenshot of Linux app running]

### 1.4 Run from source (all platforms)
- Requirements: Node.js 18+, npm.
- Steps:
```bash
git clone <your-repo-url>
cd orangebeard-desktop-reporter
npm install
npm run dev
```

## 2. Quick Start

1. Open the app.
2. Click Settings and fill at least:
   - Base URL
   - Listener Token (UUID)
3. Create a new test set (or open an existing one).
4. Fill test set metadata: Organization, Project, Test Set Name.
5. Click Start Run to begin execution.
6. Mark tests/steps as Passed/Failed/Skipped, add remarks, and attach files.
7. Click Finish Run to report and close the run.

[placeholder: screenshot of top toolbar and Settings]

## 3. UI Overview

### 3.1 Titlebar
- Window controls (minimize, maximize, close).

### 3.2 Top Toolbar
- New: create a new empty test set.
- Open: open an existing test set file.
- Save / Save As: save the current test set to disk (JSON).
- + Suite: add a new root suite to your test set.
- Start Run: begin a reporting session to Orangebeard.
- Finish Run: report and close the current run.
- Settings: open application configuration.

[placeholder: screenshot of top toolbar]

### 3.3 Settings
- Base URL: Orangebeard endpoint (e.g., https://app.orangebeard.io).
- Listener Token (UUID).
- Proxy (optional): host and port.
- Appearance: System/Light/Dark.
- Always on top: keep the window above others.

Notes:
- You can save an incomplete configuration (e.g., empty Listener Token). This is convenient if you’re still collecting credentials.
- However, to start a run the app requires Base URL, Listener Token, plus Organization, Project, and Test Set Name in your test set metadata.

[placeholder: screenshot of Settings screen]

### 3.4 Test Set Info (top of content area)
- Organization, Project, Test Set Name, Description.
- These fields are used to initialize and label runs in Orangebeard.

[placeholder: screenshot of Test Set Info section]

### 3.5 Left Tree (structure)
- Hierarchical view of Suites and Tests.
- Hide finished toggle: hides items with a finished status when enabled.
- Resizable divider between tree and details.

[placeholder: screenshot of Test Tree with Hide finished enabled]

### 3.6 Details Pane (right side)
Context-aware editor for the selected suite/test/step:
- Name: rename the selected item (Save button).
- Delete: remove the selected item (disabled during active run).
- Notes (markdown): persistent notes saved with the test set file.
- Current Execution remarks (markdown, shown only during an active run):
  - Run-specific observations that are not saved to the test set file.
  - Will be sent as log messages when you mark status.
- Mark Status: Pass/Fail/Skip the current test or step.
- Attachments:
  - Attach File (from disk).
  - Paste Image (from clipboard).
  - Preview images in-app.

[placeholder: screenshot of Details Pane with Notes, Remarks, and Status buttons]
[placeholder: screenshot of image preview]

### 3.7 Bottom Status Bar
- Shows execution status and current run information.

[placeholder: screenshot of status bar during an active run]

## 4. Managing Test Sets

### 4.1 Create a New Test Set
- Click New.
- Use + Suite to add root suites.
- In the Details Pane, use Add Test / Add Step to build structure.

### 4.2 Open/Save
- Open: load `.json` test sets (e.g., `my-tests.obtest.json`).
- Save: writes to the current file.
- Save As: write to a new file.

### 4.3 Editing Structure
- Drag and drop tests to reorder or move between suites.
- Drag and drop steps to reorder or nest under other steps.

[placeholder: screenshot of drag & drop in the tree]

## 5. Running and Reporting

### 5.1 Prerequisites to Start a Run
- Settings:
  - Base URL
  - Listener Token (UUID)
- Test Set Metadata:
  - Organization
  - Project
  - Test Set Name

If any are missing, you’ll see a clear message listing what’s required.

### 5.2 Start a Run
- Click Start Run.
- The run is created in Orangebeard when the first status is reported (lazy creation).
- The app shows that a run is active; deletion of items is disabled during a run.

[placeholder: screenshot of active run indicator]

### 5.3 During a Run
- Select a Test or Step, then:
  - Write Notes (saved to file).
  - Write Current Execution remarks (run-only; not saved to file). Remarks are sent as log messages when you mark status.
  - Attach files or paste images (each attachment creates its own log entry).
  - Mark Status: Pass, Fail, or Skip.

Rules and behaviors:
- Failure logging:
  - When marking FAILED, both Notes and Current Execution remarks (if present) are sent as ERROR logs.
- Pass/Skip with failed steps:
  - Tests can’t be marked Passed/Skipped if they have failed steps.
- Unreported steps:
  - The app auto-skips any unreported steps when a test is finished to keep run state consistent.

[placeholder: screenshot of Orangebeard run detail with logs and attachments]

### 5.4 Attachments
- File size limit: 32 MB.
- Each attachment is associated to a single log entry created at upload time (no duplication).
- Attach to Test or specific Step (based on current selection).

### 5.5 Finish a Run
- Click Finish Run.
- The app:
  - Completes the run in Orangebeard.
  - Shows “Test run finished and reported in Orangebeard!”
  - Clears all execution state (statuses, remarks) so:
    - Your “Hide finished” filter won’t hide items anymore.
    - You’re ready to Start Run again.

[placeholder: screenshot of success message]

## 6. Settings Details

### 6.1 Proxy
- Optional HTTP proxy configuration (host + port).
- Useful in restricted network environments.

### 6.2 Theme
- System, Light, or Dark.
- Toggle at any time from Settings.

### 6.3 Always on Top
- Keeps the window floating above others—handy during test execution.

## 7. Tips and Best Practices

- Save configuration early; you can leave the Listener Token empty and add later.
- Use Notes for documentation you want to keep in the test set file.
- Use Current Execution remarks for one-off observations that belong in the run log but shouldn’t alter the test set.
- Prefer steps for granular reporting; attachments can be tied to steps for clarity.

## 8. Troubleshooting

- Can’t start run:
  - Ensure Base URL, Listener Token, Organization, Project, and Test Set Name are set.
- File attachments failing:
  - Verify the file is under 32 MB.
- Nothing appears in Orangebeard:
  - Confirm Listener Token is valid.
  - Check Proxy settings if your network requires one.
- macOS won’t open the app:
  - Run the Gatekeeper bypass command (see 1.2).

## 9. Uninstall

- Windows: Remove via “Add or Remove Programs.”
- macOS: Delete “Orangebeard Reporter.app” from Applications.
- Linux (Debian/Ubuntu): 
```bash
sudo apt remove orangebeard-desktop-reporter
```

## 10. Appendix

### 10.1 Keyboard Navigation
[placeholder: table of keyboard shortcuts if applicable]

### 10.2 Where data is stored
- Test sets: wherever you saved your `.json` files.
- App configuration: stored in your OS’s standard application data folder.

---

Need more examples or screenshots? Add them at the placeholders above to generate a neat navigation and visual flow in Docusaurus.
