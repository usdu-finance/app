import React from 'react';
import Link from 'next/link';
import { GetStaticPaths, GetStaticProps } from 'next';
import { NextSeo } from 'next-seo';
import { APP_NAME, APP_URL } from '@/lib/constants';
import { docsPages, docsHref } from '@/lib/docs/navigation';
import { docsContent } from '@/lib/docs/content';

interface Props {
	slug: string;
}

export const getStaticPaths: GetStaticPaths = async () => ({
	paths: docsPages.map((p) => ({ params: { slug: p.slug ? [p.slug] : [] } })),
	fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => ({
	props: { slug: ((params?.slug as string[] | undefined) ?? []).join('/') },
});

export default function DocsPage({ slug }: Props) {
	const index = docsPages.findIndex((p) => p.slug === slug);
	const page = docsPages[index];
	const prev = docsPages[index - 1];
	const next = docsPages[index + 1];
	const title = `${page.title} - Docs - ${APP_NAME}`;

	return (
		<>
			<NextSeo
				title={title}
				description={page.description}
				openGraph={{ title, description: page.description, type: 'article', url: `${APP_URL}${docsHref(slug)}` }}
			/>

			<h1 className="text-3xl font-bold text-usdu-black mb-2">{page.title}</h1>
			<p className="text-text-secondary mb-8">{page.description}</p>

			{docsContent[slug]}

			<div className="grid grid-cols-2 gap-4 mt-12 pt-6 border-t border-usdu-surface">
				{prev ? (
					<Link href={docsHref(prev.slug)} className="rounded-xl border border-usdu-surface p-4 hover:border-usdu-orange transition-colors">
						<p className="text-xs text-text-secondary">Previous</p>
						<p className="font-medium text-usdu-black">{prev.title}</p>
					</Link>
				) : (
					<div />
				)}
				{next && (
					<Link
						href={docsHref(next.slug)}
						className="rounded-xl border border-usdu-surface p-4 text-right hover:border-usdu-orange transition-colors"
					>
						<p className="text-xs text-text-secondary">Next</p>
						<p className="font-medium text-usdu-black">{next.title}</p>
					</Link>
				)}
			</div>
		</>
	);
}
