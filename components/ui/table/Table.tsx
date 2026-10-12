interface Props {
	children: React.ReactElement | React.ReactElement[];
}

export default function Table({ children }: Props) {
	return (
		<section>
			<div className="-mx-2 rounded-lg">{children}</div>
		</section>
	);
}
