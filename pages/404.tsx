import { useRouter } from 'next/router';
import NotFound from '@/components/ui/NotFound';

export default function Custom404() {
	const router = useRouter();
	const isDashboard = router.asPath.startsWith('/dashboard');

	return (
		<div className={isDashboard ? 'space-y-8' : 'max-w-2xl mx-auto px-4 py-24'}>
			<NotFound
				ctaLabel={isDashboard ? 'Back to Dashboard' : 'Back to Home'}
				ctaHref={isDashboard ? '/dashboard' : '/'}
			/>
		</div>
	);
}
