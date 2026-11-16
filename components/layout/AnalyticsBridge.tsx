import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { track } from '@/lib/analytics';

/** Reports wallet connect and disconnect. Only the wallet name and chain are sent, never the address. */
export default function AnalyticsBridge() {
	const { isConnected, connector, chainId } = useAccount();
	const was = useRef<boolean | null>(null);

	useEffect(() => {
		if (was.current === null) {
			// first render: a restored session is not a new connect
			was.current = isConnected;
			return;
		}
		if (isConnected && !was.current) track('wallet_connected', { wallet: connector?.name ?? 'unknown', chain_id: chainId });
		if (!isConnected && was.current) track('wallet_disconnected');
		was.current = isConnected;
	}, [isConnected, connector, chainId]);

	return null;
}
