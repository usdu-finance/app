import React from 'react';
import Link from 'next/link';

// Small typographic helpers shared by all docs pages.
export const H2 = ({ children }: { children: React.ReactNode }) => (
	<h2 className="text-xl font-semibold text-usdu-black mt-10 mb-3">{children}</h2>
);
export const P = ({ children }: { children: React.ReactNode }) => <p className="text-text-secondary leading-relaxed mb-4">{children}</p>;
export const UL = ({ children }: { children: React.ReactNode }) => (
	<ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed mb-4">{children}</ul>
);
export const OL = ({ children }: { children: React.ReactNode }) => (
	<ol className="list-decimal pl-5 space-y-2 text-text-secondary leading-relaxed mb-4">{children}</ol>
);
export const Callout = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<div className="rounded-xl border border-usdu-surface bg-usdu-bg px-4 py-3 my-6">
		<p className="text-sm font-semibold text-usdu-black mb-1">{title}</p>
		<div className="text-sm text-text-secondary leading-relaxed">{children}</div>
	</div>
);
export const A = ({ href, children }: { href: string; children: React.ReactNode }) =>
	href.startsWith('/') ? (
		<Link href={href} className="text-usdu-orange hover:underline">
			{children}
		</Link>
	) : (
		<a href={href} target="_blank" rel="noopener noreferrer" className="text-usdu-orange hover:underline">
			{children}
		</a>
	);
export const Code = ({ children }: { children: React.ReactNode }) => (
	<code className="font-mono text-[0.85em] bg-usdu-surface rounded px-1.5 py-0.5 text-usdu-black break-all">{children}</code>
);
