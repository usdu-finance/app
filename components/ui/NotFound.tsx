import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompass } from '@fortawesome/free-solid-svg-icons';
import Button from './Button';

interface NotFoundProps {
	title?: string;
	description?: string;
	ctaLabel?: string;
	ctaHref?: string;
}

export default function NotFound({
	title = 'Page Not Found',
	description = "The page you're looking for doesn't exist or may have been moved.",
	ctaLabel = 'Back to Home',
	ctaHref = '/',
}: NotFoundProps) {
	return (
		<div className="flex flex-col items-center justify-center text-center min-h-[50vh] py-8">
			<div className="w-16 h-16 bg-usdu-orange/10 rounded-full flex items-center justify-center mb-4">
				<FontAwesomeIcon icon={faCompass} className="w-8 h-8 text-usdu-orange" />
			</div>
			<p className="text-5xl font-bold text-usdu-black mb-2">404</p>
			<h2 className="text-xl font-bold text-usdu-black mb-2">{title}</h2>
			<p className="text-text-secondary mb-6">{description}</p>
			<Button href={ctaHref}>{ctaLabel}</Button>
		</div>
	);
}
