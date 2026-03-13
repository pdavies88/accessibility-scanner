# Accessibility Scanner

A comprehensive TypeScript tool for automated accessibility testing using axe-core and Puppeteer. Allows for viewing data via a Vite Dashboard and exporting data as .csv or .xlsx.

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

- Node.js >= 20.19+ or 22.12+
- npm >= 10

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/accessibility-scanner.git
cd accessibility-scanner

# Install dependencies
npm install
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
  spreadsheet workbook this format is perfect for Teamwork.

Both formats can be downloaded from the dashboard or obtained via the API:

```bash
# csv export
curl -X POST http://localhost:3003/api/reports/{reportId}/export/csv > report.csv

# excel export
curl -X POST http://localhost:3003/api/reports/{reportId}/export/excel > report.xlsx
```
