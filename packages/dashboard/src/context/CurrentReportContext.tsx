import { createContext, useContext, useState, ReactNode } from 'react';

const STORAGE_KEY = 'accessibility-scanner:last-report';

interface StoredReport { id: string; label: string }

interface CurrentReportContextValue {
  reportId: string | null;
  reportLabel: string | null;
  setCurrentReport: (id: string, label: string) => void;
  clearCurrentReport: () => void;
}

const CurrentReportContext = createContext<CurrentReportContextValue | undefined>(undefined);

function readStored(): StoredReport | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredReport) : null;
  } catch {
    return null;
  }
}

export function CurrentReportProvider({ children }: { children: ReactNode }) {
  const stored = readStored();
  const [reportId, setReportId] = useState<string | null>(stored?.id ?? null);
  const [reportLabel, setReportLabel] = useState<string | null>(stored?.label ?? null);

  function setCurrentReport(id: string, label: string) {
    setReportId(id);
    setReportLabel(label);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, label })); } catch { /* ignore */ }
  }

  function clearCurrentReport() {
    setReportId(null);
    setReportLabel(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  return (
    <CurrentReportContext.Provider value={{ reportId, reportLabel, setCurrentReport, clearCurrentReport }}>
      {children}
    </CurrentReportContext.Provider>
  );
}

export function useCurrentReport() {
  const ctx = useContext(CurrentReportContext);
  if (!ctx) throw new Error('useCurrentReport must be used within CurrentReportProvider');
  return ctx;
}
