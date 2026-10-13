'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';

import { IconBook, IconChart, IconHome, IconInbox, IconMegaphone } from './icons';

const NAV: Array<{
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}> = [
  { href: '/', label: 'Dashboard', icon: IconHome },
  { href: '/campaigns', label: 'Campaigns', icon: IconMegaphone },
  { href: '/review', label: 'Review queue', icon: IconInbox },
  { href: '/knowledge', label: 'Policies', icon: IconBook },
  { href: '/admin', label: 'Admin', icon: IconChart },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ variant }: { variant: 'sidebar' | 'top' }) {
  const pathname = usePathname() ?? '/';

  if (variant === 'top') {
    return (
      <nav className="flex gap-1 overflow-x-auto px-4 pb-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                active ? 'bg-brand-500/10 text-brand-300' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <Icon width={16} height={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-white/10 text-white'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className={active ? 'text-brand-200' : 'text-slate-400'} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
