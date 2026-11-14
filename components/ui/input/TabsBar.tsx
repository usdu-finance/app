import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Row for a PillTabs and its CurrencyTabs: the tabs come first and the stablecoin filter below on mobile, side by side on desktop. */
export default function TabsBar({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn('flex flex-col gap-4 md:flex-row md:items-center md:justify-between', className)}>{children}</div>;
}
