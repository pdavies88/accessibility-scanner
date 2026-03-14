# Accessibility Scanner

A comprehensive TypeScript tool for automated accessibility testing using axe-core and Puppeteer. Allows for viewing data via a Vite Dashboard and exporting data as .csv or .xlsx.

## Features

- 🔍 Automated website scanning via sitemap URL, XML file upload, or site crawl
- ♿ Powered by axe-core for WCAG compliance testing
- 📊 React dashboard for visualizing results with WCAG criteria and level details
- 📁 Export functionality (CSV / Excel) formatted for task‑tracking tools (Teamwork, etc.)
- ⚡ Concurrent page scanning for performance
- 💾 Local storage in a simple JSON file (`data/reports.json`)
- 📈 Detailed reports with violation tracking, impact, WCAG level, and criteria
- 🛑 Abort a running scan at any time

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

### Dashboard

Start both API server and dashboard in development mode:

```bash
npm run dev
```

Or start them individually:

```bash
npm run dev:server    # API server on port 3003
npm run dev:dashboard # Dashboard on port 5173
```

### Starting a Scan

The dashboard supports three scan input modes:

| Mode | Description |
|------|-------------|
| **Sitemap URL** | Provide a URL to an XML sitemap (e.g. `https://example.com/sitemap.xml`) or a local file path |
| **Upload XML** | Upload a sitemap XML file directly from your machine |
| **Crawl Site** | Provide a starting URL — the scanner follows internal links downward from that path |

#### Crawl mode tips

- The crawler only follows links **at or below** the starting path — e.g. starting at `https://example.com/blog/` will not crawl `/about/` or the homepage.
- Default max pages: **200** (~5–10 min at default concurrency).
- Max pages cap: **500** — larger crawls can take 30+ min and use significantly more memory.
- A scan in progress can be **aborted** at any time using the Abort button; no partial data is saved.

### Managing Reports

- Reports are listed on the dashboard home page.
- Each report can be **removed** individually via the Remove button on its card.
- When a scan is running the **New Scan** button in the nav is disabled until it completes or is aborted.

### Report Detail

Each report includes:

- **Overview** — violations by impact, violations by WCAG level, and top violation types (with friendly names, WCAG criteria, and level)
- **Violations** — full table grouped by violation type, filterable by impact, with WCAG level and criteria columns
- **Pages** — per-page results with a detail panel showing violations including WCAG level and criteria badges
- **Export** — download a formatted task list (see below)

#### Page & Violation Detail

Individual violation and page detail views show:

- WCAG success criterion number (e.g. `2.4.2`) prepended to the violation name
- **Level** column — conformance level badge (A, AA, AAA, or best-practice)
- **WCAG Criteria** column — individual criterion badges (e.g. `2.4.2`)

### Exporting Results

The **Export** tab on any report lets you download a formatted task list for import into Teamwork or similar tools.

**Export options:**

- **Format** — Teamwork `.xlsx` or `.csv`
- **Tasklist Name** — name for the task group in your project management tool
- **File Name** — custom filename for the downloaded file (defaults to `accessibility-issues-{reportId}`)
- **Select Violations** — export all violation types or a single selected type

**Each exported task includes:**

- **Task name** — formatted as `2.4.2 Documents must have <title> element | AA`
- **Tags** — `Accessibility`, severity level (e.g. `Major Issue`), and WCAG conformance level (e.g. `AA`)
- **Description** — structured Markdown template with:
  1. Description of issue (pre-filled)
  2. Level of severity (pre-filled with impact label)
  3. WCAG criteria (pre-filled)
  4. Code snippet placeholder
  5. Screenshot placeholder
  6. Affected pages list
  7. Remediation section (pre-filled with axe help text and link)
  8. Steps to QA placeholder
  9. Recommended assignee checklist (Content / Design / Engineer)

Both formats can also be obtained via the API:

```bash
# CSV export
curl -X POST http://localhost:3003/api/reports/{reportId}/export/csv \
  -H "Content-Type: application/json" \
  -d '{"tasklistName":"Accessibility Updates"}' > report.csv

# Excel export
curl -X POST http://localhost:3003/api/reports/{reportId}/export/excel \
  -H "Content-Type: application/json" \
  -d '{"tasklistName":"Accessibility Updates"}' > report.xlsx
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reports` | List all reports |
| `GET` | `/api/reports/:id` | Get a single report |
| `DELETE` | `/api/reports/:id` | Delete a report |
| `POST` | `/api/scan` | Start a new scan job |
| `GET` | `/api/scan/:jobId/events` | SSE stream for scan progress |
| `DELETE` | `/api/scan/:jobId` | Abort a running scan |
| `POST` | `/api/reports/:id/export/csv` | Export report as CSV |
| `POST` | `/api/reports/:id/export/excel` | Export report as Excel |
