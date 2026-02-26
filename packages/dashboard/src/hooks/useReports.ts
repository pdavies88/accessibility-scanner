import { useState, useEffect } from 'react';
import { ScanReport } from '@accessibility-scanner/shared';

export function useReports() {
  const [reports, setReports] = useState<ScanReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/reports')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch reports');
        return res.json();
      })
      .then(setReports)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { reports, loading, error };
}