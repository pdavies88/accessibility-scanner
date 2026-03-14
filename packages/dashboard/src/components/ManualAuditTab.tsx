import React, { useRef, useState } from 'react';
import {
  ManualAudit,
  ManualAuditStatus,
  ManualCheckResult,
} from '@accessibility-scanner/shared';
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
import { Plus, Trash2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ManualAuditStatus, string> = {
  pass: '✓ Pass',
  fail: '✗ Fail',
  na: '— N/A',
  'not-tested': '? Not Tested',
};

const STATUS_COLORS: Record<ManualAuditStatus, string> = {
  pass: 'text-green-600',
  fail: 'text-red-600',
  na: 'text-muted-foreground',
  'not-tested': 'text-muted-foreground',
};

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
  onStatusChange,
  onNotesChange,
}: {
  check: ManualCheckResult;
  onStatusChange: (status: ManualAuditStatus) => void;
  onNotesChange: (notes: string) => void;
}) {
  const [localNotes, setLocalNotes] = useState(check.notes ?? '');

  return (
    <div className="border-b last:border-b-0 py-3 px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {check.wcagCriterion && (
              <span className="font-mono text-xs text-muted-foreground shrink-0">
                {check.wcagCriterion}
              </span>
            )}
            <span className="text-sm font-medium">{check.title}</span>
          </div>
          {check.description && (
            <p className="text-xs text-muted-foreground mb-2">{check.description}</p>
          )}
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
  onStatusChange,
  onNotesChange,
  onDelete,
}: {
  check: ManualCheckResult;
  onStatusChange: (status: ManualAuditStatus) => void;
  onNotesChange: (notes: string) => void;
  onDelete: () => void;
}) {
  const [localNotes, setLocalNotes] = useState(check.notes ?? '');

  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{check.title}</p>
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
                  {form.impact ? (
                    <span className="capitalize">{form.impact}</span>
                  ) : (
                    <span className="text-muted-foreground">Select…</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {(['minor', 'moderate', 'serious', 'critical'] as const).map(i => (
                    <SelectItem key={i} value={i} className="capitalize text-sm">
                      {i}
                    </SelectItem>
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
  onAddCustomCheck,
  onDeleteCustomCheck,
  onAuditorNotesChange,
}: ManualAuditTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [auditorNotes, setAuditorNotes] = useState(audit.auditorNotes ?? '');

  const wcagChecks = audit.checks.filter(c => c.type === 'wcag');
  const customChecks = audit.checks.filter(c => c.type === 'custom');

  const levelAChecks = wcagChecks.filter(c => c.level === 'A');
  const levelAAChecks = wcagChecks.filter(c => c.level === 'AA');

  // Progress stats
  const total = wcagChecks.length + customChecks.length;
  const counts = {
    pass: audit.checks.filter(c => c.status === 'pass').length,
    fail: audit.checks.filter(c => c.status === 'fail').length,
    na: audit.checks.filter(c => c.status === 'na').length,
    'not-tested': audit.checks.filter(c => c.status === 'not-tested').length,
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

      {/* Level A checks */}
      {levelAChecks.length > 0 && (
        <section aria-labelledby="wcag-level-a-heading">
          <h2
            id="wcag-level-a-heading"
            className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2"
          >
            WCAG Level A ({levelAChecks.length} criteria)
          </h2>
          <div className="border rounded">
            {levelAChecks.map(check => (
              <CheckRow
                key={check.id}
                check={check}
                onStatusChange={status => onStatusChange(check.id, status)}
                onNotesChange={notes => onNotesChange(check.id, notes)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Level AA checks */}
      {levelAAChecks.length > 0 && (
        <section aria-labelledby="wcag-level-aa-heading">
          <h2
            id="wcag-level-aa-heading"
            className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2"
          >
            WCAG Level AA ({levelAAChecks.length} criteria)
          </h2>
          <div className="border rounded">
            {levelAAChecks.map(check => (
              <CheckRow
                key={check.id}
                check={check}
                onStatusChange={status => onStatusChange(check.id, status)}
                onNotesChange={notes => onNotesChange(check.id, notes)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Custom Issues */}
      <section aria-labelledby="custom-issues-heading">
        <div className="flex items-center justify-between mb-2">
          <h2
            id="custom-issues-heading"
            className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
          >
            Custom Issues
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

      <AddCustomCheckDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={onAddCustomCheck}
      />
    </div>
  );
}
