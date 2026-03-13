import { ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCurrentReport } from '@/context/CurrentReportContext';
import { useReports } from '@/hooks/useReports';

type Props = { children: ReactNode };

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function Layout({ children }: Props) {
  const { reportId, reportLabel } = useCurrentReport();
  const { reports, refresh: refreshReports } = useReports();
  const [showModal, setShowModal] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reportsButtonRef = useRef<HTMLButtonElement>(null);
  const reportsDropdownRef = useRef<HTMLDivElement>(null);

  const reportPageMatch = location.pathname.match(/^\/reports\/([^/]+)/);
  const onReportPage = Boolean(reportPageMatch);
  const activeReportId = reportPageMatch?.[1] ?? reportId;
  const onDashboard = location.pathname === '/';

  const navLink = (active: boolean) =>
    active
      ? 'text-sm font-medium text-foreground border-b-2 border-link pb-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm'
      : 'text-sm text-muted-foreground hover:text-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm';

  // ── Reports dropdown ────────────────────────────────────────────────────────

  function openReportsDropdown() {
    refreshReports();
    setShowReports(true);
  }

  function closeReportsDropdown() {
    setShowReports(false);
    reportsButtonRef.current?.focus();
  }

  // Close on outside click
  useEffect(() => {
    if (!showReports) return;
    function handleDown(e: MouseEvent) {
      if (
        reportsDropdownRef.current &&
        !reportsDropdownRef.current.contains(e.target as Node) &&
        !reportsButtonRef.current?.contains(e.target as Node)
      ) {
        setShowReports(false);
      }
    }
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [showReports]);

  // Escape closes dropdown
  useEffect(() => {
    if (!showReports) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); closeReportsDropdown(); }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showReports]);

  // Focus first item when dropdown opens
  useEffect(() => {
    if (showReports) {
      const first = reportsDropdownRef.current?.querySelector<HTMLElement>('a, button');
      first?.focus();
    }
  }, [showReports]);

  // ── New Scan modal ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (showModal) {
      const first = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
      first?.focus();
    } else if (!showReports) {
      triggerRef.current?.focus();
    }
  }, [showModal]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!showModal) return;
    if (e.key === 'Escape') { e.preventDefault(); setShowModal(false); return; }
    if (e.key === 'Tab') {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }, [showModal]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function closeModal() { setShowModal(false); }

  function confirmNewScan() {
    setShowModal(false);
    navigate('/', { state: { newScan: true } });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function reportNavLabel(sitemap: string) {
    try { return new URL(sitemap).hostname; } catch { return sitemap; }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:outline-none"
      >
        Skip to main content
      </a>

      <header className="border-b border-border">
        <nav aria-label="Main navigation" className="container mx-auto px-6 py-3 flex items-center gap-6">
          {/* Brand */}
          <Link
            to="/"
            aria-current={onDashboard ? 'page' : undefined}
            className={`font-semibold ${navLink(onDashboard)}`}
          >
            Accessibility Scanner
          </Link>

          {/* Reports dropdown */}
          <div className="flex items-center gap-4 flex-1 relative">
            <button
              ref={reportsButtonRef}
              onClick={() => showReports ? closeReportsDropdown() : openReportsDropdown()}
              aria-haspopup="listbox"
              aria-expanded={showReports}
              aria-controls="reports-dropdown"
              className={`flex items-center gap-1 ${navLink(onReportPage)}`}
            >
              Reports
              <svg
                aria-hidden="true"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={`transition-transform duration-150 ${showReports ? 'rotate-180' : ''}`}
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {showReports && (
              <div
                id="reports-dropdown"
                ref={reportsDropdownRef}
                role="listbox"
                aria-label="Scanned reports"
                className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-border bg-card text-card-foreground shadow-xl z-40 py-1 max-h-80 overflow-y-auto"
              >
                {reports.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">No reports yet.</p>
                ) : (
                  reports.map(report => {
                    const label = reportNavLabel(report.sitemap);
                    const isActive = report.id === activeReportId;
                    return (
                      <a
                        key={report.id}
                        href={`/reports/${report.id}`}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => setShowReports(false)}
                        className={`flex items-start justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring transition-colors ${
                          isActive ? 'bg-primary/10 text-foreground font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        <span className="truncate">{label}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(report.startTime).toLocaleDateString()}
                        </span>
                      </a>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* New Scan */}
          <button
            ref={triggerRef}
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium px-4 py-1.5 hover:bg-primary/90 hover:text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors"
          >
            New Scan
          </button>
        </nav>
      </header>

      <main id="main-content" className="flex-1 p-4" tabIndex={-1}>
        {children}
      </main>

      <footer className="border-t border-border py-4">
        <p className="container mx-auto px-6 text-xs text-muted-foreground">
          Accessibility Scanner — powered by axe-core
        </p>
      </footer>

      {/* New Scan confirmation modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-scan-title"
          aria-describedby="new-scan-desc"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} aria-hidden="true" />
          <div ref={panelRef} className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-xl p-6 mx-4">
            <button
              onClick={closeModal}
              aria-label="Close dialog"
              className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            <h2 id="new-scan-title" className="text-lg font-semibold mb-2 pr-8">
              Start a new scan?
            </h2>
            <p id="new-scan-desc" className="text-sm text-muted-foreground mb-6">
              {onReportPage
                ? `This will leave the ${reportLabel ?? 'current'} report. Would you like to export your results first?`
                : 'This will clear all form fields and start fresh.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              {onReportPage && (
                <Link
                  to={`/reports/${activeReportId}?tab=export`}
                  onClick={closeModal}
                  className="flex-1 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium px-5 py-3 hover:bg-primary/90 hover:text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors"
                >
                  Export Results First
                </Link>
              )}
              <button
                onClick={confirmNewScan}
                className="flex-1 inline-flex items-center justify-center rounded-md border border-border text-sm font-medium px-5 py-3 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors"
              >
                {onReportPage ? 'Skip & Start New Scan' : 'Start New Scan'}
              </button>
            </div>

            <button
              onClick={closeModal}
              className="w-full inline-flex items-center justify-center rounded-md text-sm text-muted-foreground px-5 py-2.5 hover:text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
