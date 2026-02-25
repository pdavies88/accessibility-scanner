import { ReactNode } from 'react';

type Props = { children: ReactNode };

export function Layout({ children }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="p-4 border-b">…</header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}