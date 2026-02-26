import { ReactNode } from 'react';

type Props = { children: ReactNode };

export function Layout({ children }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}