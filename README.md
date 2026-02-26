# Accessibility Scanner

A comprehensive TypeScript tool for automated accessibility testing using axe-core.

---

## Updating dependencies

To bump every workspace package to the latest stable version use `npm-check-updates` (ncu). We've added a helper script to the root `package.json`:

```sh
# run from repository root
npm run update:deps
```

> **Note:** the script uses `--workspaces` (plural) so all workspace packages are updated; previous versions of ncu required passing specific workspace names.

This will modify all `package.json` files, then install the new versions. You can also run the commands manually:

```sh
npx npm-check-updates -u --workspace          # update all workspaces
npx lerna exec -- npx npm-check-updates -u    # ensure subpackages are updated
npm install                                   # install changes
```

Always run your tests and manual smoke checks after upgrading.

---

## Features

- 🔍 Automated website scanning via sitemap
- ♿ Powered by axe-core for WCAG compliance testing
- 📊 React dashboard for visualizing results
- 🎫 Export functionality for Jira ticket creation
- ⚡ Concurrent page scanning for performance
- 💾 Local database storage (JSON file in `data/reports.json`)
- 📈 Detailed reports with violation tracking

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/accessibility-scanner.git
cd accessibility-scanner

# Install dependencies
npm install
# Lerna v7 removed the `bootstrap` command; npm workspaces handle linking automatically
```

### Build all packages

```bash
npm run build
```

## Usage

### Run a scan

```bash
npm run scan -- scan -s https://example.com/sitemap.xml
```

With options:

```bash
npm run scan -- scan -s https://example.com/sitemap.xml -c 10 --headless
```

### Dashboard

Data is stored in a simple JSON database at `data/reports.json` by default.  This is intended to be transient – you can remove the file manually or use the API to clear the history:

```bash
curl -X DELETE http://localhost:3003/api/reports
```

Start both API server and dashboard in development mode:

```bash
npm run dev
```

Or start them individually:

```bash
npm run dev:server    # API server on port 3003
npm run dev:dashboard # Dashboard on port 5173
```

### Export for Jira

The dashboard provides an export feature that generates JSON files compatible with Jira's bulk import feature. You can also use the API directly:

```bash
curl -X POST http://localhost:3003/api/reports/{reportId}/export > jira-issues.json
```