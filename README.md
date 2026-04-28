# Option Sync

Option Sync is a local Minecraft Bedrock options manager for Windows. It scans local Bedrock account folders, previews changes, creates restore-point backups, and syncs `options.txt` settings between accounts or from an uploaded file.

## Features

- Detects numeric Minecraft Bedrock account folders automatically.
- Marks the most recently active profile when local profile data is available.
- Syncs a full `options.txt`, selected categories, or individual option keys.
- Supports uploaded `options.txt` files as a source.
- Creates ZIP backups before sync operations by default.
- Includes a backup manager for manual restore points, downloads, and cleanup.
- Stores session errors in a local error dump for troubleshooting.

## Requirements

- Windows
- Node.js 18 or newer
- Minecraft Bedrock local account data

The default user folder is:

```text
%APPDATA%\Minecraft Bedrock\Users
```

You can change this path in Advanced Mode if your Minecraft Bedrock data is stored somewhere else.

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

Build the CSS bundle when changing `public/tailwind.css`:

```bash
npm run build:css
```

## Usage

Start the local web app:

```bash
npm start
```

Then open:

```text
http://localhost:4321
```

On Windows, you can also run:

```text
RunSyncTool.bat
```

or:

```powershell
.\SyncMinecraftOptions.ps1
```

## Sync Modes

### Fast Mode

Fast Mode copies the full `options.txt` from one source account to selected target accounts. Backups are enabled automatically. Account-related options are never copied.

### Advanced Mode

Advanced Mode gives direct control over:

- the Minecraft Bedrock `Users` path
- source account or uploaded source file
- target accounts
- full-file, category, or key-based sync
- per-option value editing for syncable account-source options
- backup creation and backup management

Account-related `options.txt` keys, including `last_*`, `xbl`, `account`, `client`, `server`, `realms`, `mp_*`, and `dev_*` entries, are protected and never synced to another account.

## Project Structure

```text
Option-Sync/
├─ public/
│  ├─ index.html
│  ├─ app.js
│  ├─ tailwind.css
│  ├─ styles.css
│  └─ assets/
├─ src/
│  └─ server.js
├─ backups/
├─ uploads/
├─ RunSyncTool.bat
├─ SyncMinecraftOptions.ps1
├─ package.json
└─ tailwind.config.js
```

`backups/` and `uploads/` are local runtime folders and are ignored by Git.

## Safety Notes

- Close Minecraft Bedrock before syncing to avoid locked files.
- Keep backups enabled unless you have another restore point.
- Account-related option keys are intentionally preserved per target account.
- Preview changes in Advanced Mode before applying selective syncs.
- Run the tool as administrator only if Windows blocks access to an account folder.

## Development

Run syntax checks:

```bash
npm run lint
```

Run the CSS build:

```bash
npm run build:css
```

Start in development mode with auto-restart:

```bash
npm run dev
```

## License

No license has been declared yet. Add a license before publishing or redistributing this project.
