import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faDownload } from '@fortawesome/free-solid-svg-icons';

const auditReports = [
	{
		title: 'Q4 2023 Security Audit',
		auditor: 'Trail of Bits',
		date: 'December 2023',
		status: 'Completed',
		link: '#',
	},
	{
		title: 'Reserve Verification Report',
		auditor: 'Armanino LLP',
		date: 'January 2024',
		status: 'Completed',
		link: '#',
	},
	{
		title: 'Smart Contract Assessment',
		auditor: 'OpenZeppelin',
		date: 'November 2023',
		status: 'Completed',
		link: '#',
	},
];

export default function AuditReports() {
	return (
		<section className="relative px-4 md:px-8 lg:px-16 py-16 bg-usdu-card">
			<div className="">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="text-center mb-12"
				>
					<h2 className="text-3xl font-bold text-usdu-black mb-4">Security & Audit Reports</h2>
					<p className="text-lg text-text-secondary max-w-3xl mx-auto">
						Independent third-party audits ensure protocol security and reserve verification.
					</p>
				</motion.div>

				<div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
					{auditReports.map((report, index) => (
						<motion.div
							key={report.title}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.6,
								delay: index * 0.1,
							}}
							viewport={{ once: true }}
							className="bg-usdu-bg p-6 rounded-xl border border-usdu-surface"
						>
							<div className="w-12 h-12 bg-usdu-orange/10 rounded-lg flex items-center justify-center mb-4">
								<FontAwesomeIcon icon={faFileAlt} className="w-6 h-6 text-usdu-orange" />
							</div>
							<h3 className="text-lg font-bold text-usdu-black mb-3">{report.title}</h3>
							<div className="space-y-2 mb-4">
								<div className="text-sm text-text-secondary">
									<span className="font-medium">Auditor:</span> {report.auditor}
								</div>
								<div className="text-sm text-text-secondary">
									<span className="font-medium">Date:</span> {report.date}
								</div>
								<div>
									<span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
										{report.status}
									</span>
								</div>
							</div>
							<button className="inline-flex items-center gap-2 text-usdu-orange hover:text-opacity-80 font-medium text-sm">
								<FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
								Download Report
							</button>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
