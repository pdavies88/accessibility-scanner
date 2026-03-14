import { createContext, useContext, useState, ReactNode } from 'react';

interface ScanContextValue {
  scanning: boolean;
  setScanning: (v: boolean) => void;
}

const ScanContext = createContext<ScanContextValue>({ scanning: false, setScanning: () => {} });

export function ScanProvider({ children }: { children: ReactNode }) {
  const [scanning, setScanning] = useState(false);
  return <ScanContext.Provider value={{ scanning, setScanning }}>{children}</ScanContext.Provider>;
}

export function useScanContext() {
  return useContext(ScanContext);
}
