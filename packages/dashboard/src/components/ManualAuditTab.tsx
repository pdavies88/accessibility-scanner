import React, { useRef, useState } from 'react';
import {
  ManualAudit,
  ManualAuditStatus,
  ManualCheckResult,
  PREDEFINED_CHECKS,
  CATEGORY_ORDER,
  CATEGORY_DESCRIPTIONS,
} from '@accessibility-scanner/shared';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Trash2,
  Keyboard,
  Image as ImageIcon,
  Palette,
  FormInput,
  Link,
  AlignLeft,
  Video,
  ChevronDown,
  Code2,
  Upload,
  Clipboard,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Lookup map: check id → predefined metadata (category, priority, level)
// ---------------------------------------------------------------------------

const PREDEFINED_MAP = Object.fromEntries(PREDEFINED_CHECKS.map(c => [c.id, c]));

// ---------------------------------------------------------------------------
// Pill colors
// ---------------------------------------------------------------------------

// 800 text on 100 background clears WCAG AA (4.5:1) for text-xs across all hues.
// (700 on 100 fails for several — e.g. blue-700/blue-100 ≈ 3.8:1.)
const CATEGORY_COLORS: Record<string, string> = {
  'Keyboard & Focus':    'bg-blue-100   text-blue-800   border-blue-200',
  'Images & Media':      'bg-orange-100 text-orange-800 border-orange-200',
  'Color & Visual':      'bg-purple-100 text-purple-800 border-purple-200',
  'Forms & Input':       'bg-green-100  text-green-800  border-green-200',
  'Links & Navigation':  'bg-cyan-100   text-cyan-800   border-cyan-200',
  'Content & Structure': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Video & Audio':       'bg-rose-100   text-rose-800   border-rose-200',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Keyboard & Focus':    Keyboard,
  'Images & Media':      ImageIcon,
  'Color & Visual':      Palette,
  'Forms & Input':       FormInput,
  'Links & Navigation':  Link,
  'Content & Structure': AlignLeft,
  'Video & Audio':       Video,
};

const LEVEL_COLORS: Record<string, string> = {
  A:   'bg-indigo-100  text-indigo-800  border-indigo-200',
  AA:  'bg-violet-100  text-violet-800  border-violet-200',
  AAA: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
};

// ---------------------------------------------------------------------------
// View mode
// ---------------------------------------------------------------------------

type ViewMode = 'wcag' | 'category' | 'priority' | 'status';

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'wcag',     label: 'WCAG Level' },
  { value: 'category', label: 'Category' },
  { value: 'priority', label: 'Priority' },
  { value: 'status',   label: 'Status' },
];

interface CheckGroup {
  id: string;
  label: string;
  description?: string;
  checks: ManualCheckResult[];
  /** render custom check cards instead of check rows (status mode mixes types) */
  mixed?: boolean;
}

function buildGroups(audit: ManualAudit, mode: ViewMode): CheckGroup[] {
  const wcagChecks = audit.checks.filter(c => c.type === 'wcag');

  switch (mode) {
    case 'wcag':
      return [
        { id: 'level-a',  label: 'WCAG Level A',  checks: wcagChecks.filter(c => c.level === 'A') },
        { id: 'level-aa', label: 'WCAG Level AA', checks: wcagChecks.filter(c => c.level === 'AA') },
      ].filter(g => g.checks.length > 0);

    case 'category':
      return CATEGORY_ORDER.map(cat => ({
        id: `cat-${cat}`,
        label: cat,
        description: CATEGORY_DESCRIPTIONS[cat],
        checks: wcagChecks.filter(c => PREDEFINED_MAP[c.id]?.category === cat),
      })).filter(g => g.checks.length > 0);

    case 'priority':
      return [
        {
          id: 'priority-high',
          label: 'High Impact',
          description: 'Core issues that affect most users on most pages — test these first.',
          checks: wcagChecks.filter(c => PREDEFINED_MAP[c.id]?.priority === 'high'),
        },
        {
          id: 'priority-medium',
          label: 'Medium Impact',
          description: 'Important criteria that depend on specific conditions or content types.',
          checks: wcagChecks.filter(c => PREDEFINED_MAP[c.id]?.priority === 'medium'),
        },
        {
          id: 'priority-low',
          label: 'Low / Situational',
          description: 'Only applicable when specific media or interaction patterns are present on this page.',
          checks: wcagChecks.filter(c => PREDEFINED_MAP[c.id]?.priority === 'low'),
        },
      ].filter(g => g.checks.length > 0);

    case 'status': {
      // All checks (predefined + custom) sorted by status
      const ORDER: ManualAuditStatus[] = ['fail', 'not-tested', 'pass', 'na'];
      const STATUS_GROUP_LABELS: Record<ManualAuditStatus, string> = {
        fail:         '✗ Fail',
        'not-tested': '? Not Tested',
        pass:         '✓ Pass',
        na:           '— N/A',
      };
      return ORDER.map(s => ({
        id: `status-${s}`,
        label: STATUS_GROUP_LABELS[s],
        checks: audit.checks.filter(c => c.status === s),
        mixed: true,
      })).filter(g => g.checks.length > 0);
    }
  }
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ManualAuditStatus, string> = {
  pass:         '✓ Pass',
  fail:         '✗ Fail',
  na:           '— N/A',
  'not-tested': '? Not Tested',
};

const STATUS_COLORS: Record<ManualAuditStatus, string> = {
  pass:         'text-green-600',
  fail:         'text-red-600',
  na:           'text-muted-foreground',
  'not-tested': 'text-muted-foreground',
};

// ---------------------------------------------------------------------------
// Level filter
// ---------------------------------------------------------------------------

type LevelFilter = 'all' | 'A' | 'AA' | 'AAA';

const LEVEL_FILTER_OPTIONS: { value: LevelFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'A',   label: 'A' },
  { value: 'AA',  label: 'AA' },
  { value: 'AAA', label: 'AAA' },
];

function LevelFilterSelector({
  value,
  onChange,
}: {
  value: LevelFilter;
  onChange: (v: LevelFilter) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-xs text-muted-foreground mr-2 shrink-0">Level</span>
      <div
        className="inline-flex items-center rounded-md border bg-muted p-0.5 gap-0.5"
        role="group"
        aria-label="Filter by WCAG level"
      >
        {LEVEL_FILTER_OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={cn(
              'px-2.5 py-1 text-xs rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              value === o.value
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground cursor-pointer',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ViewModeSelector
// ---------------------------------------------------------------------------

function ViewModeSelector({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-xs text-muted-foreground mr-2 shrink-0">Group by</span>
      <div
        className="inline-flex items-center rounded-md border bg-muted p-0.5 gap-0.5"
        role="group"
        aria-label="Group checks by"
      >
        {VIEW_MODES.map(m => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            aria-pressed={value === m.value}
            className={cn(
              'px-2.5 py-1 text-xs rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              value === m.value
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground cursor-pointer',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusSelect — compact inline dropdown for a single check
// ---------------------------------------------------------------------------

function StatusSelect({
  value,
  onChange,
}: {
  value: ManualAuditStatus;
  onChange: (s: ManualAuditStatus) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Select ref={ref} value={value} onValueChange={v => onChange(v as ManualAuditStatus)}>
      <SelectTrigger className="w-36 h-7 text-xs px-2">
        <span className={STATUS_COLORS[value]}>{STATUS_LABELS[value]}</span>
      </SelectTrigger>
      <SelectContent>
        {(['pass', 'fail', 'na', 'not-tested'] as ManualAuditStatus[]).map(s => (
          <SelectItem key={s} value={s} className="text-xs">
            <span className={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// CheckRow — a single predefined WCAG check row
// ---------------------------------------------------------------------------

function CheckRow({
  check,
  showMeta,
  onStatusChange,
  onNotesChange,
  onEvidenceChange,
  onLevelClick,
  onCategoryClick,
}: {
  check: ManualCheckResult;
  /** show level + category badges (used when the group doesn't already convey this) */
  showMeta?: boolean;
  onStatusChange: (status: ManualAuditStatus) => void;
  onNotesChange: (notes: string) => void;
  onEvidenceChange: (codeSnippet: string | undefined, screenshotDataUrl: string | undefined) => void;
  onLevelClick?: (level: 'A' | 'AA' | 'AAA') => void;
  onCategoryClick?: (category: string) => void;
}) {
  const [localNotes, setLocalNotes] = useState(check.notes ?? '');
  const [showQuestions, setShowQuestions] = useState(false);
  const [showEvidence, setShowEvidence] = useState(
    !!(check.codeSnippet || check.screenshotDataUrl),
  );
  const [localCode, setLocalCode] = useState(check.codeSnippet ?? '');
  const [screenshot, setScreenshot] = useState<string | undefined>(check.screenshotDataUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const meta = check.wcagCriterion ? PREDEFINED_MAP[check.wcagCriterion] : undefined;
  const questions = meta?.questions ?? [];

  function commitCode(value: string) {
    if (value !== (check.codeSnippet ?? '')) {
      onEvidenceChange(value || undefined, screenshot);
    }
  }

  function applyScreenshot(dataUrl: string) {
    setScreenshot(dataUrl);
    onEvidenceChange(localCode || undefined, dataUrl);
  }

  function removeScreenshot() {
    setScreenshot(undefined);
    onEvidenceChange(localCode || undefined, undefined);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result;
      if (typeof result === 'string') applyScreenshot(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handlePasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = ev => {
            const result = ev.target?.result;
            if (typeof result === 'string') applyScreenshot(result);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch {
      // Clipboard API not available or denied — silently ignore
    }
  }

  return (
    <div className="border-b last:border-b-0 py-3 px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            {check.wcagCriterion && (
              <span className="font-mono text-sm text-muted-foreground shrink-0">
                {check.wcagCriterion}
              </span>
            )}
            <span className="text-base font-medium">{check.title}</span>
            {showMeta && (
              <>
                {check.level && (
                  onLevelClick ? (
                    <button
                      type="button"
                      onClick={() => onLevelClick(check.level as 'A' | 'AA' | 'AAA')}
                      aria-label={`Filter by level ${check.level}`}
                      className={cn('inline-flex items-center rounded border text-xs h-5 px-1.5 py-0 font-medium transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer', LEVEL_COLORS[check.level])}
                    >
                      {check.level}
                    </button>
                  ) : (
                    <Badge variant="outline" className={cn('text-xs h-5 px-1.5 py-0', LEVEL_COLORS[check.level])}>
                      {check.level}
                    </Badge>
                  )
                )}
                {meta?.category && (() => {
                  const Icon = CATEGORY_ICONS[meta.category];
                  const colorClass = CATEGORY_COLORS[meta.category];
                  return onCategoryClick ? (
                    <button
                      type="button"
                      onClick={() => onCategoryClick(meta.category)}
                      aria-label={`Filter by category ${meta.category}`}
                      className={cn('inline-flex items-center gap-1 rounded border text-xs h-5 px-1.5 py-0 font-normal transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer', colorClass)}
                    >
                      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
                      {meta.category}
                    </button>
                  ) : (
                    <Badge variant="outline" className={cn('text-xs h-5 px-1.5 py-0 font-normal gap-1', colorClass)}>
                      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
                      {meta.category}
                    </Badge>
                  );
                })()}
              </>
            )}
          </div>

          {check.description && (
            <p className="text-sm text-muted-foreground mb-2">{check.description}</p>
          )}

          {/* How to test */}
          {questions.length > 0 && (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setShowQuestions(v => !v)}
                aria-expanded={showQuestions}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
              >
                <ChevronDown
                  className={cn('h-3 w-3 transition-transform', showQuestions && 'rotate-180')}
                  aria-hidden="true"
                />
                How to test
              </button>
              {showQuestions && (
                <ul className="mt-1.5 space-y-1 pl-3 border-l-2 border-muted">
                  {questions.map((q, i) => (
                    <li key={i} className="text-xs text-muted-foreground leading-snug">{q}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Evidence toggle */}
          <button
            type="button"
            onClick={() => setShowEvidence(v => !v)}
            aria-expanded={showEvidence}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
          >
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', showEvidence && 'rotate-180')}
              aria-hidden="true"
            />
            Evidence
            {(check.codeSnippet || check.screenshotDataUrl) && (
              <span className="ml-1 text-primary">●</span>
            )}
          </button>

          {/* Evidence panel */}
          {showEvidence && (
            <div className="mt-2 space-y-3 pl-1">
              {/* Code snippet */}
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Code2 className="h-3 w-3" aria-hidden="true" />
                  Code snippet
                </label>
                <textarea
                  value={localCode}
                  onChange={e => setLocalCode(e.target.value)}
                  onBlur={() => commitCode(localCode)}
                  placeholder="Paste relevant HTML or code here…"
                  rows={3}
                  spellCheck={false}
                  className="w-full font-mono text-xs rounded border border-border bg-muted/40 px-2 py-1.5 resize-y focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Screenshot */}
              <div className="space-y-1.5">
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <ImageIcon className="h-3 w-3" aria-hidden="true" />
                  Screenshot
                </span>
                {screenshot ? (
                  <div className="relative inline-block">
                    <img
                      src={screenshot}
                      alt="Screenshot of affected area"
                      className="max-w-full max-h-48 rounded border border-border object-contain"
                    />
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      aria-label="Remove screenshot"
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-3 w-3" />
                      Upload
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={handlePasteFromClipboard}
                    >
                      <Clipboard className="h-3 w-3" />
                      Paste from clipboard
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      aria-hidden="true"
                      tabIndex={-1}
                      onChange={handleFileChange}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <input
            type="text"
            placeholder="Add notes…"
            value={localNotes}
            onChange={e => setLocalNotes(e.target.value)}
            onBlur={() => {
              if (localNotes !== (check.notes ?? '')) onNotesChange(localNotes);
            }}
            className="w-full text-sm border-0 border-b border-dashed border-muted-foreground/30 bg-transparent px-0 py-0.5 mt-2 focus:outline-none focus:border-muted-foreground placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="shrink-0">
          <StatusSelect value={check.status} onChange={onStatusChange} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CustomCheckItem — a single custom issue card
// ---------------------------------------------------------------------------

function CustomCheckItem({
  check,
  showMeta,
  onStatusChange,
  onNotesChange,
  onDelete,
}: {
  check: ManualCheckResult;
  showMeta?: boolean;
  onStatusChange: (status: ManualAuditStatus) => void;
  onNotesChange: (notes: string) => void;
  onDelete: () => void;
}) {
  const [localNotes, setLocalNotes] = useState(check.notes ?? '');

  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{check.title}</p>
            {showMeta && (
              <Badge variant="outline" className="text-xs h-4 px-1 py-0 font-normal bg-slate-100 text-slate-700 border-slate-200">
                Custom
              </Badge>
            )}
          </div>
          {check.description && (
            <p className="text-xs text-muted-foreground">{check.description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
          onClick={onDelete}
          aria-label={`Delete custom issue: ${check.title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {check.impact && (
          <Badge variant="outline" className="text-xs capitalize">
            {check.impact}
          </Badge>
        )}
        <StatusSelect value={check.status} onChange={onStatusChange} />
      </div>
      <input
        type="text"
        placeholder="Add notes…"
        value={localNotes}
        onChange={e => setLocalNotes(e.target.value)}
        onBlur={() => {
          if (localNotes !== (check.notes ?? '')) {
            onNotesChange(localNotes);
          }
        }}
        className="w-full text-xs border-0 border-b border-dashed border-muted-foreground/30 bg-transparent px-0 py-0.5 focus:outline-none focus:border-muted-foreground placeholder:text-muted-foreground/50"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CheckGroupSection — renders one group of checks
// ---------------------------------------------------------------------------

function CheckGroupSection({
  group,
  onStatusChange,
  onNotesChange,
  onEvidenceChange,
  onDeleteCustomCheck,
  onLevelClick,
  onCategoryClick,
}: {
  group: CheckGroup;
  onStatusChange: (checkId: string, status: ManualAuditStatus) => void;
  onNotesChange: (checkId: string, notes: string) => void;
  onEvidenceChange: (checkId: string, codeSnippet: string | undefined, screenshotDataUrl: string | undefined) => void;
  onDeleteCustomCheck: (checkId: string) => void;
  onLevelClick?: (level: 'A' | 'AA' | 'AAA') => void;
  onCategoryClick?: (category: string) => void;
}) {
  const headingId = `group-${group.id}`;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2">
        <h2
          id={headingId}
          className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
        >
          {group.label}
          <span className="ml-1.5 normal-case font-normal">
            ({group.checks.length})
          </span>
        </h2>
        {group.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
        )}
      </div>

      {group.mixed ? (
        // Status view — mixed predefined + custom, use appropriate row type
        <div className="space-y-2">
          {group.checks.map(check =>
            check.type === 'custom' ? (
              <CustomCheckItem
                key={check.id}
                check={check}
                showMeta
                onStatusChange={status => onStatusChange(check.id, status)}
                onNotesChange={notes => onNotesChange(check.id, notes)}
                onDelete={() => onDeleteCustomCheck(check.id)}
              />
            ) : (
              <div key={check.id} className="border rounded">
                <CheckRow
                  check={check}
                  showMeta
                  onStatusChange={status => onStatusChange(check.id, status)}
                  onNotesChange={notes => onNotesChange(check.id, notes)}
                  onEvidenceChange={(code, img) => onEvidenceChange(check.id, code, img)}
                  onLevelClick={onLevelClick}
                  onCategoryClick={onCategoryClick}
                />
              </div>
            ),
          )}
        </div>
      ) : (
        <div className="border rounded">
          {group.checks.map(check => (
            <CheckRow
              key={check.id}
              check={check}
              showMeta
              onStatusChange={status => onStatusChange(check.id, status)}
              onNotesChange={notes => onNotesChange(check.id, notes)}
              onEvidenceChange={(code, img) => onEvidenceChange(check.id, code, img)}
              onLevelClick={onLevelClick}
              onCategoryClick={onCategoryClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// AddCustomCheckDialog
// ---------------------------------------------------------------------------

type ImpactLevel = 'minor' | 'moderate' | 'serious' | 'critical';

interface CustomCheckFormData {
  title: string;
  description: string;
  impact: ImpactLevel | '';
  status: ManualAuditStatus;
  notes: string;
}

function AddCustomCheckDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: Omit<CustomCheckFormData, 'impact'> & { impact?: ImpactLevel }) => void;
}) {
  const impactRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<CustomCheckFormData>({
    title: '',
    description: '',
    impact: '',
    status: 'not-tested',
    notes: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onAdd({
      ...form,
      title: form.title.trim(),
      impact: form.impact || undefined,
    });
    setForm({ title: '', description: '', impact: '', status: 'not-tested', notes: '' });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="custom-title">Title <span aria-hidden="true">*</span></Label>
            <Input
              id="custom-title"
              required
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Videos autoplay with sound"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-desc">Description</Label>
            <Textarea
              id="custom-desc"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe the issue…"
              className="min-h-[60px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Impact</Label>
              <Select
                ref={impactRef}
                value={form.impact}
                onValueChange={v => setForm(p => ({ ...p, impact: v as ImpactLevel }))}
              >
                <SelectTrigger className="text-sm">
                  {form.impact
                    ? <span className="capitalize">{form.impact}</span>
                    : <span className="text-muted-foreground">Select…</span>}
                </SelectTrigger>
                <SelectContent>
                  {(['minor', 'moderate', 'serious', 'critical'] as const).map(i => (
                    <SelectItem key={i} value={i} className="capitalize text-sm">{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                ref={statusRef}
                value={form.status}
                onValueChange={v => setForm(p => ({ ...p, status: v as ManualAuditStatus }))}
              >
                <SelectTrigger className="text-sm">
                  <span className={STATUS_COLORS[form.status]}>{STATUS_LABELS[form.status]}</span>
                </SelectTrigger>
                <SelectContent>
                  {(['pass', 'fail', 'na', 'not-tested'] as ManualAuditStatus[]).map(s => (
                    <SelectItem key={s} value={s} className="text-sm">
                      <span className={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-notes">Notes</Label>
            <Textarea
              id="custom-notes"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Additional context…"
              className="min-h-[60px]"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.title.trim()}>
              Add Issue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ManualAuditTab — main exported component
// ---------------------------------------------------------------------------

interface ManualAuditTabProps {
  audit: ManualAudit;
  onStatusChange: (checkId: string, status: ManualAuditStatus) => void;
  onNotesChange: (checkId: string, notes: string) => void;
  onEvidenceChange: (checkId: string, codeSnippet: string | undefined, screenshotDataUrl: string | undefined) => void;
  onAddCustomCheck: (data: {
    title: string;
    description?: string;
    impact?: ImpactLevel;
    status: ManualAuditStatus;
    notes?: string;
  }) => void;
  onDeleteCustomCheck: (checkId: string) => void;
  onAuditorNotesChange: (notes: string) => void;
}

export function ManualAuditTab({
  audit,
  onStatusChange,
  onNotesChange,
  onEvidenceChange,
  onAddCustomCheck,
  onDeleteCustomCheck,
  onAuditorNotesChange,
}: ManualAuditTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('wcag');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [auditorNotes, setAuditorNotes] = useState(audit.auditorNotes ?? '');

  function handleLevelClick(level: 'A' | 'AA' | 'AAA') {
    setLevelFilter(prev => prev === level ? 'all' : level);
  }

  function handleCategoryClick(category: string) {
    setCategoryFilter(prev => prev === category ? null : category);
    setViewMode('category');
  }

  // Apply level + category filters — custom checks always visible
  const visibleChecks = audit.checks.filter(c => {
    if (c.type === 'custom') return true;
    if (levelFilter !== 'all' && c.level !== levelFilter) return false;
    if (categoryFilter && PREDEFINED_MAP[c.id]?.category !== categoryFilter) return false;
    return true;
  });
  const filteredAudit = { ...audit, checks: visibleChecks };

  const customChecks = visibleChecks.filter(c => c.type === 'custom');
  const groups = buildGroups(filteredAudit, viewMode);

  // Progress stats scoped to the current level filter
  const total = visibleChecks.length;
  const counts = {
    pass:         visibleChecks.filter(c => c.status === 'pass').length,
    fail:         visibleChecks.filter(c => c.status === 'fail').length,
    na:           visibleChecks.filter(c => c.status === 'na').length,
    'not-tested': visibleChecks.filter(c => c.status === 'not-tested').length,
  };
  const checked = total - counts['not-tested'];
  const progressPct = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress panel */}
      <div className="border rounded p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground uppercase tracking-wide text-xs">
            Audit Progress
          </span>
          <span className="text-sm text-muted-foreground">
            {checked}/{total} checked
          </span>
        </div>
        <Progress value={progressPct} aria-label={`${progressPct}% of checks completed`} />
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-green-600">● {counts.pass} Pass</span>
          <span className="text-red-600">● {counts.fail} Fail</span>
          <span className="text-muted-foreground">● {counts.na} N/A</span>
          <span className="text-muted-foreground">● {counts['not-tested']} Not Tested</span>
        </div>
        <div className="space-y-1">
          <label htmlFor="auditor-notes" className="text-xs font-medium text-muted-foreground">
            Auditor Notes
          </label>
          <Textarea
            id="auditor-notes"
            placeholder="Overall notes for this page…"
            value={auditorNotes}
            onChange={e => setAuditorNotes(e.target.value)}
            onBlur={() => {
              if (auditorNotes !== (audit.auditorNotes ?? '')) {
                onAuditorNotesChange(auditorNotes);
              }
            }}
            className="min-h-[60px] text-sm"
          />
        </div>
      </div>

      {/* Controls row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <ViewModeSelector value={viewMode} onChange={setViewMode} />
          <LevelFilterSelector value={levelFilter} onChange={setLevelFilter} />
        </div>
        {categoryFilter && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtered by:</span>
            {(() => {
              const Icon = CATEGORY_ICONS[categoryFilter];
              return (
                <button
                  type="button"
                  onClick={() => setCategoryFilter(null)}
                  aria-label={`Remove filter: ${categoryFilter}`}
                  className={cn(
                    'inline-flex items-center gap-1 rounded border text-xs px-2 py-0.5 font-normal transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    CATEGORY_COLORS[categoryFilter],
                  )}
                >
                  {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
                  {categoryFilter}
                  <X className="h-3 w-3 ml-0.5" aria-hidden="true" />
                </button>
              );
            })()}
          </div>
        )}
      </div>

      {/* Check groups */}
      {groups.map(group => (
        <CheckGroupSection
          key={group.id}
          group={group}
          onStatusChange={onStatusChange}
          onNotesChange={onNotesChange}
          onEvidenceChange={onEvidenceChange}
          onDeleteCustomCheck={onDeleteCustomCheck}
          onLevelClick={handleLevelClick}
          onCategoryClick={handleCategoryClick}
        />
      ))}

      {/* Custom Issues — shown separately for all modes except status (which already includes them) */}
      {viewMode !== 'status' && (
        <section aria-labelledby="custom-issues-heading">
          <div className="flex items-center justify-between mb-2">
            <h2
              id="custom-issues-heading"
              className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
            >
              Custom Issues
              <span className="ml-1.5 normal-case font-normal">({customChecks.length})</span>
            </h2>
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Issue
            </Button>
          </div>
          {customChecks.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded p-4 text-center">
              No custom issues added yet.
            </p>
          ) : (
            <div className="space-y-2">
              {customChecks.map(check => (
                <CustomCheckItem
                  key={check.id}
                  check={check}
                  onStatusChange={status => onStatusChange(check.id, status)}
                  onNotesChange={notes => onNotesChange(check.id, notes)}
                  onDelete={() => onDeleteCustomCheck(check.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* In status mode, show the Add Issue button separately since custom checks are in the groups */}
      {viewMode === 'status' && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Custom Issue
          </Button>
        </div>
      )}

      <AddCustomCheckDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={onAddCustomCheck}
      />
    </div>
  );
}
