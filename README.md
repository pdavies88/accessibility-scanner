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
- 📁 Export functionality (CSV / Excel) for task‑tracking tools
- ⚡ Concurrent page scanning for performance
- 💾 Local storage in a simple JSON file (`data/reports.json`)
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

Execute a sitemap-based scan against the target site. At minimum you must
specify the sitemap URL:

```bash
npm run scan -- scan -s https://example.com/sitemap.xml
```

Additional options allow you to control concurrency (`-c`) or run the
headless browser in non‑UI mode (`--headless`).

### Dashboard

Report data lives in a plain JSON file at `data/reports.json`.  It's easy to inspect or overwrite manually; the API also exposes a delete endpoint if you want to clear it programmatically:

```bash
npm run scan -- clear
```

Start both API server and dashboard in development mode (no HTML pages are generated – the React app handles rendering):

```bash
npm run dev
```

Or start them individually:

```bash
npm run dev:server    # API server on port 3003
npm run dev:dashboard # Dashboard on port 5173
```

### Exporting results

The dashboard offers two tabular export formats that are compatible with
most project management tools (Teamwork, Trello, Excel, etc.):

* **CSV** – matches the sample layout provided in the import file.  The
  `DESCRIPTION` column supports Markdown so your remediation notes can be
  rich text.
* **Excel** (`.xlsx`) – identical contents to the CSV but packaged as a
  spreadsheet workbook.

Both formats can be downloaded from the dashboard or obtained via the API:

```bash
# csv export
curl -X POST http://localhost:3003/api/reports/{reportId}/export/csv > report.csv

# excel export
curl -X POST http://localhost:3003/api/reports/{reportId}/export/excel > report.xlsx
```
