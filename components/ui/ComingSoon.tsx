import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';

interface ComingSoonProps {
	icon: IconDefinition;
	title?: string;
	description: string;
}

export default function ComingSoon({ icon, title = 'Coming Soon', description }: ComingSoonProps) {
	return (
		<div className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface">
			<div className="text-center">
				<div className="w-16 h-16 bg-usdu-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
					<FontAwesomeIcon icon={icon} className="w-8 h-8 text-usdu-orange" />
				</div>
				<h2 className="text-xl font-bold text-usdu-black mb-2">{title}</h2>
				<p className="text-text-secondary">{description}</p>
			</div>
		</div>
	);
}
