import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import Layout from '@/components/layout/Layout';
import { AuthProvider } from '@/contexts/AuthContext';
import { ApolloProvider } from '@/lib/graphql/provider';
import AppKitProvider from '@/lib/web3/appkit-provider';
import { store, persistor } from '@/redux/redux.store';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
});

export default function App({ Component, pageProps }: AppProps) {
	return (
		<div className={`${inter.variable} font-sans`}>
			<ReduxProvider store={store}>
				<PersistGate loading={null} persistor={persistor}>
					<AppKitProvider>
						<ApolloProvider>
							<AuthProvider>
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
				</PersistGate>
			</ReduxProvider>
		</div>
	);
}
