import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { Toaster } from 'react-hot-toast';
import AnalyticsBridge from '@/components/layout/AnalyticsBridge';
import Layout from '@/components/layout/Layout';
import { AuthProvider } from '@/contexts/AuthContext';
import { ApolloProvider } from '@/lib/graphql/provider';
import AppKitProvider from '@/lib/web3/appkit-provider';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
});

export default function App({ Component, pageProps }: AppProps) {
	return (
		<>
			{process.env.NEXT_PUBLIC_UMAMI_URL && (
				<Script
					src={`${process.env.NEXT_PUBLIC_UMAMI_URL}/script.js`}
					data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
					// only report from the production host, so previews and localhost stay out of the data
					data-domains={process.env.NEXT_PUBLIC_UMAMI_DOMAINS || undefined}
					data-do-not-track="true"
					// prefill params (?from=&to=, ?tab=) would split one page into many, events carry that instead
					data-exclude-search="true"
					strategy="afterInteractive"
				/>
			)}
			<div className={`${inter.variable} font-sans`}>
				<AppKitProvider>
					<ApolloProvider>
						<AuthProvider>
							<AnalyticsBridge />
							<Layout>
								<Component {...pageProps} />
							</Layout>
							<Toaster
								position="bottom-right"
								toastOptions={{
									style: {
										display: 'flex',
										alignItems: 'center',
										gap: '16px',
										padding: '16px',
										position: 'relative',
									},
									duration: 6000,
								}}
							/>
						</AuthProvider>
					</ApolloProvider>
				</AppKitProvider>
			</div>
		</>
	);
}
