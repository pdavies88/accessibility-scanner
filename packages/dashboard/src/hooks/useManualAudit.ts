import { useState, useCallback } from 'react';
import {
  ManualAudit,
  ManualAuditStatus,
  createDefaultChecks,
} from '@accessibility-scanner/shared';

function buildInitialAudit(serverAudit: ManualAudit | undefined): ManualAudit {
  if (serverAudit) return serverAudit;
  return {
    lastUpdated: new Date().toISOString(),
    checks: createDefaultChecks(),
  };
}

export function useManualAudit(
  reportId: string,
  pageId: string,
  initialAudit: ManualAudit | undefined,
) {
  const [audit, setAudit] = useState<ManualAudit>(() => buildInitialAudit(initialAudit));

  const updateCheck = useCallback(
    async (checkId: string, status: ManualAuditStatus, notes?: string) => {
      // Optimistic update
      setAudit(prev => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        checks: prev.checks.map(c =>
          c.id === checkId
            ? { ...c, status, notes: notes !== undefined ? notes : c.notes, updatedAt: new Date().toISOString() }
            : c,
        ),
      }));

      try {
        await fetch(`/api/reports/${reportId}/pages/${pageId}/manual-audit/checks/${checkId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, notes }),
        });
      } catch (err) {
        console.error('Failed to update check:', err);
      }
    },
    [reportId, pageId],
  );

  const updateNotes = useCallback(
    async (checkId: string, notes: string) => {
      setAudit(prev => ({
        ...prev,
        checks: prev.checks.map(c =>
          c.id === checkId ? { ...c, notes, updatedAt: new Date().toISOString() } : c,
        ),
      }));

      try {
        const check = audit.checks.find(c => c.id === checkId);
        if (!check) return;
        await fetch(`/api/reports/${reportId}/pages/${pageId}/manual-audit/checks/${checkId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: check.status, notes }),
        });
      } catch (err) {
        console.error('Failed to update notes:', err);
      }
    },
    [reportId, pageId, audit],
  );

  const addCustomCheck = useCallback(
    async (data: {
      title: string;
      description?: string;
      impact?: 'minor' | 'moderate' | 'serious' | 'critical';
      status: ManualAuditStatus;
      notes?: string;
    }) => {
      try {
        const res = await fetch(`/api/reports/${reportId}/pages/${pageId}/manual-audit/checks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (json.manualAudit) setAudit(json.manualAudit);
      } catch (err) {
        console.error('Failed to add custom check:', err);
      }
    },
    [reportId, pageId],
  );

  const deleteCustomCheck = useCallback(
    async (checkId: string) => {
      // Optimistic update
      setAudit(prev => ({
        ...prev,
        checks: prev.checks.filter(c => c.id !== checkId),
      }));

      try {
        await fetch(`/api/reports/${reportId}/pages/${pageId}/manual-audit/checks/${checkId}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed to delete check:', err);
      }
    },
    [reportId, pageId],
  );

  const updateAuditorNotes = useCallback(
    async (notes: string) => {
      setAudit(prev => ({ ...prev, auditorNotes: notes }));

      try {
        await fetch(`/api/reports/${reportId}/pages/${pageId}/manual-audit`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auditorNotes: notes }),
        });
      } catch (err) {
        console.error('Failed to update auditor notes:', err);
      }
    },
    [reportId, pageId],
  );

  return { audit, updateCheck, updateNotes, addCustomCheck, deleteCustomCheck, updateAuditorNotes };
}
