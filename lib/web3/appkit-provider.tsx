'use client';

import React, { ReactNode } from 'react';
import { WAGMI_CONFIG, WAGMI_ADAPTER, WAGMI_METADATA, WAGMI_CHAINS, WAGMI_CHAIN } from './config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Config, State, WagmiProvider } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';

const queryClient = new QueryClient();

createAppKit({
	adapters: [WAGMI_ADAPTER],
	projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID!,
	// @ts-expect-error - AppKit networks type mismatch
	networks: WAGMI_CHAINS,
	defaultNetwork: WAGMI_CHAIN,
	metadata: WAGMI_METADATA,
	features: {
		analytics: true,
	},
	themeMode: 'light',
	themeVariables: {
		'--w3m-color-mix': '#f2f0ec',
		'--w3m-color-mix-strength': 20,
		'--w3m-accent': '#f16325',
		'--w3m-border-radius-master': '12px',
		'--w3m-font-family': 'Avenir, system-ui, sans-serif',
	},
});

export default function AppKitProvider({ children, initialState }: { children: ReactNode; initialState?: State }) {
	return (
		<WagmiProvider config={WAGMI_CONFIG as Config} initialState={initialState}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</WagmiProvider>
	);
}
