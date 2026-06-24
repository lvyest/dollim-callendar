'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { CalendarIcon, MessageIcon, SlidersIcon, StarIcon, UsersIcon } from './icons';

const TABS = [
  { href: '/calendar', label: '캘린더', Icon: CalendarIcon },
  { href: '/events', label: '특이일정', Icon: StarIcon },
  { href: '/guestbook', label: '방명록', Icon: MessageIcon },
  { href: '/members', label: '멤버', Icon: UsersIcon },
  { href: '/mypage', label: '설정', Icon: SlidersIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-stretch border-t border-gray-100 bg-white px-2 pb-6 pt-2.5">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const tone = active ? 'text-primary-500' : 'text-gray-400';
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-1 py-1"
          >
            <Icon className={`h-[21px] w-[21px] ${tone}`} />
            <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'} ${tone}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
