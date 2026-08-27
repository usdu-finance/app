interface Props {
	children: React.ReactElement | React.ReactElement[];
}

export default function Grid({ children }: Props) {
	return (
		<section>
			<div className="rounded-lg">{children}</div>
		</section>
	);
}
