import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function ExternalLink({ href, children, className }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('underline hover:text-link', className)}
    >
      {children}
      <span className="sr-only"> (opens in new window)</span>
    </a>
  );
}
