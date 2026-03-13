import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useReports } from '@/hooks/useReports';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Progress,
} from '@/components/ui';
import { ExternalLink } from '@/components/ExternalLink';

type InputMode = 'url' | 'file' | 'crawl';

interface ScanState {
  phase: 'crawling' | 'scanning' | null;
  scanned: number;
  total: number;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function Dashboard() {
  const { reports, loading, error, refresh } = useReports();
  const location = useLocation();
  const navigate = useNavigate();

  const [mode, setMode] = useState<InputMode>('url');
  const [sitemap, setSitemap] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [crawlUrl, setCrawlUrl] = useState('');
  const [maxPages, setMaxPages] = useState('200');

  const [scanning, setScanning] = useState(false);
  const [scanState, setScanState] = useState<ScanState>({ phase: null, scanned: 0, total: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.title = 'Accessibility Scanner — Reports';
  }, []);

  // Reset form when "New Scan" is confirmed from another page
  useEffect(() => {
    if ((location.state as { newScan?: boolean } | null)?.newScan) {
      setMode('url');
      setSitemap('');
      setFile(null);
      setCrawlUrl('');
      setMaxPages('200');
      setScanError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Clear state so back-navigation doesn't re-trigger
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Clean up SSE + timer on unmount
  useEffect(() => {
    return () => {
      esRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startTimer() {
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function connectToJob(jobId: string) {
    const es = new EventSource(`/api/scan/${jobId}/events`);
    esRef.current = es;

    es.addEventListener('crawling', () => {
      setScanState({ phase: 'crawling', scanned: 0, total: 0 });
    });

    es.addEventListener('scanning', (e) => {
      const data = JSON.parse(e.data);
      setScanState({ phase: 'scanning', scanned: 0, total: data.total ?? 0 });
    });

    es.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      setScanState({ phase: 'scanning', scanned: data.scanned, total: data.total });
    });

    es.addEventListener('complete', () => {
      es.close();
      stopTimer();
      setScanning(false);
      setScanState({ phase: null, scanned: 0, total: 0 });
      setSitemap('');
      setFile(null);
      setCrawlUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      refresh();
    });

    es.addEventListener('error', (e) => {
      es.close();
      stopTimer();
      setScanning(false);
      setScanState({ phase: null, scanned: 0, total: 0 });
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setScanError(data.message || 'Scan failed');
      } catch {
        setScanError('Scan failed');
      }
    });
  }

  const canSubmit = !scanning && (
    mode === 'url'  ? sitemap.trim() !== '' :
    mode === 'file' ? file !== null :
    crawlUrl.trim() !== ''
  );

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setScanError(null);
    setScanning(true);
    startTimer();

    try {
      let body: Record<string, unknown>;
      if (mode === 'file' && file) {
        body = { xmlContent: await file.text(), filename: file.name };
      } else if (mode === 'crawl') {
        body = { crawlUrl, maxPages: Number(maxPages) || 200 };
      } else {
        body = { sitemap };
      }

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Scan failed');
      }

      const { jobId } = await res.json();
      connectToJob(jobId);
    } catch (err) {
      stopTimer();
      setScanning(false);
      setScanError(err instanceof Error ? err.message : 'Scan failed');
    }
  }

  function switchMode(next: InputMode) {
    setMode(next);
    setScanError(null);
  }

  const progressPercent = scanState.total > 0
    ? Math.round((scanState.scanned / scanState.total) * 100)
    : 0;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Accessibility Reports</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>New Scan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex flex-col gap-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              {(['url', 'file', 'crawl'] as InputMode[]).map(m => (
                <Button
                  key={m}
                  type="button"
                  variant={mode === m ? 'default' : 'outline'}
                  onClick={() => switchMode(m)}
                  disabled={scanning}
                >
                  {m === 'url' ? 'Sitemap URL' : m === 'file' ? 'Upload XML' : 'Crawl Site'}
                </Button>
              ))}
            </div>

            {mode === 'url' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sitemap">Sitemap URL or local file path</Label>
                <div className="flex gap-2">
                  <Input
                    id="sitemap"
                    type="text"
                    placeholder="https://example.com/sitemap.xml"
                    value={sitemap}
                    onChange={e => setSitemap(e.target.value)}
                    disabled={scanning}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!canSubmit}>
                    {scanning ? 'Scanning…' : 'Scan'}
                  </Button>
                </div>
              </div>
            )}

            {mode === 'file' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sitemap-file">Sitemap XML file</Label>
                <div className="flex gap-2">
                  <Input
                    id="sitemap-file"
                    ref={fileInputRef}
                    type="file"
                    accept=".xml,application/xml,text/xml"
                    disabled={scanning}
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!canSubmit}>
                    {scanning ? 'Scanning…' : 'Scan'}
                  </Button>
                </div>
                {file && <p className="text-sm text-muted-foreground">{file.name}</p>}
              </div>
            )}

            {mode === 'crawl' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="crawl-url">Site URL to crawl</Label>
                  <div className="flex gap-2">
                    <Input
                      id="crawl-url"
                      type="url"
                      placeholder="https://example.com"
                      value={crawlUrl}
                      onChange={e => setCrawlUrl(e.target.value)}
                      disabled={scanning}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!canSubmit}>
                      {scanning ? 'Running…' : 'Crawl & Scan'}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 w-32">
                  <Label htmlFor="max-pages">Max pages</Label>
                  <Input
                    id="max-pages"
                    type="number"
                    min="1"
                    max="1000"
                    value={maxPages}
                    onChange={e => setMaxPages(e.target.value)}
                    disabled={scanning}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  The crawler will follow internal links and scan up to the max number of pages found.
                </p>
              </div>
            )}

            {/* Progress UI */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className={scanning ? 'flex flex-col gap-2 pt-1' : 'sr-only'}
            >
              {scanning && (
                <>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {scanState.phase === 'crawling' && 'Discovering pages…'}
                      {scanState.phase === 'scanning' && scanState.total > 0 && (
                        `Scanning page ${scanState.scanned} of ${scanState.total}`
                      )}
                      {scanState.phase === 'scanning' && scanState.total === 0 && 'Scanning…'}
                      {!scanState.phase && 'Starting…'}
                    </span>
                    <span className="font-mono" aria-label={`Elapsed time: ${formatElapsed(elapsed)}`}>
                      {formatElapsed(elapsed)}
                    </span>
                  </div>

                  {scanState.phase === 'scanning' && scanState.total > 0 ? (
                    <Progress
                      value={progressPercent}
                      className="h-2"
                      aria-label={`Scan progress: ${progressPercent}%`}
                    />
                  ) : (
                    <div
                      className="h-2 rounded-full bg-secondary overflow-hidden"
                      role="progressbar"
                      aria-label="Scan in progress"
                      aria-valuetext="Indeterminate"
                    >
                      <div className="h-full w-1/3 rounded-full bg-primary animate-[progress-indeterminate_1.5s_ease-in-out_infinite]" />
                    </div>
                  )}
                </>
              )}
            </div>

            {scanError && (
              <p id="scan-error" role="alert" className="text-sm text-destructive">
                {scanError}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {loading && <div>Loading…</div>}
      {error && <div>Error: {error}</div>}

      <div className="grid gap-6">
        {reports?.map(report => (
          <Card key={report.id}>
            <CardHeader>
              <CardTitle>
                {report.sitemap.startsWith('http') ? (
                  <ExternalLink href={new URL(report.sitemap).origin}>
                    {new URL(report.sitemap).hostname}
                  </ExternalLink>
                ) : (
                  <span>{report.sitemap}</span>
                )}
              </CardTitle>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-muted-foreground">
                  Scanned on {new Date(report.startTime).toLocaleString()}
                </p>
                <Link
                  to={`/reports/${report.id}`}
                  className="text-sm underline hover:text-link"
                >
                  View Report
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <Link to={`/reports/${report.id}?tab=pages`} className="group">
                  <p className="text-sm text-muted-foreground">Total Pages</p>
                  <p className="text-2xl font-bold underline decoration-dotted group-hover:decoration-solid">
                    {report.summary.totalPages}
                  </p>
                </Link>
                <Link to={`/reports/${report.id}?tab=violations`} className="group">
                  <p className="text-sm text-muted-foreground">Total Violations</p>
                  <p className="text-2xl font-bold text-red-400 underline decoration-dotted group-hover:decoration-solid">
                    {report.summary.totalViolations}
                  </p>
                </Link>
                <Link to={`/reports/${report.id}?tab=violations&impact=critical`} className="group">
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-red-400 underline decoration-dotted group-hover:decoration-solid">
                    {report.summary.violationsByImpact.critical || 0}
                  </p>
                </Link>
                <Link to={`/reports/${report.id}?tab=violations&impact=serious`} className="group">
                  <p className="text-sm text-muted-foreground">Serious</p>
                  <p className="text-2xl font-bold text-orange-400 underline decoration-dotted group-hover:decoration-solid">
                    {report.summary.violationsByImpact.serious || 0}
                  </p>
                </Link>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Link
                  to={`/reports/${report.id}?tab=violations`}
                  className="underline hover:text-link"
                >
                  {Object.keys(report.summary.violationsByType).length} violation types
                </Link>
                <span>
                  {Math.round(
                    (new Date(report.endTime).getTime() -
                     new Date(report.startTime).getTime()) / 1000
                  )}s scan duration
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
