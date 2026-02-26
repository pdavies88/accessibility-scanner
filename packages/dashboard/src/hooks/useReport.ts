import { useState, useEffect } from 'react';
import { ScanReport } from '@accessibility-scanner/shared';

export function useReport(id: string | undefined) {
  const [report, setReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/reports/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch report');
        return res.json();
      })
      .then(setReport)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { report, loading, error };
}