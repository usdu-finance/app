import React from 'react';
import { ADDRESS } from '@usdu-finance/usdu-core';
import { mainnet } from 'viem/chains';
import { A, Callout, Code, CodeBlock, H2, OL, P, UL } from '@/components/docs/Prose';
import { SOCIAL } from '@/lib/constants';

const addr = ADDRESS[mainnet.id];
const etherscan = (a: string) => `https://etherscan.io/address/${a}`;

const AddressTable = ({ rows }: { rows: [string, string][] }) => (
	<div className="overflow-x-auto mb-6 rounded-xl border border-usdu-surface">
		<table className="w-full text-sm">
			<thead className="bg-usdu-bg text-left text-text-secondary">
				<tr>
					<th className="px-4 py-2 font-medium">Contract</th>
					<th className="px-4 py-2 font-medium">Address</th>
				</tr>
			</thead>
			<tbody>
				{rows.map(([name, a]) => (
					<tr key={name + a} className="border-t border-usdu-surface">
						<td className="px-4 py-2 whitespace-nowrap">{name}</td>
						<td className="px-4 py-2 font-mono text-xs break-all">
							<A href={etherscan(a)}>{a}</A>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	</div>
);

// One entry per slug in lib/docs/navigation.ts ('' is the landing page).
export const docsContent: Record<string, React.ReactNode> = {
	'': (
		<>
			<P>
				USDU Finance issues three governed stablecoins: <strong>USDU</strong> (US dollar), <strong>EURU</strong> (euro) and{' '}
				<strong>CHFU</strong> (Swiss franc). They are protocol-issued and non-algorithmic: a stablecoin can only be minted or burned by a{' '}
				<em>module</em> that the Aragon DAO has approved, and every flow can be traced on-chain.
			</P>
			<H2>Where to start</H2>
			<UL>
				<li>
					New here? Read <A href="/docs/stablecoins">USDU, EURU &amp; CHFU</A> and <A href="/docs/how-it-works">How it works</A>.
				</li>
				<li>
					Want to use the protocol? See <A href="/docs/swap-modules">Swap modules</A>, <A href="/docs/liquidity">Liquidity pools</A> and{' '}
					<A href="/docs/rewards">Strategies &amp; rewards</A>.
				</li>
				<li>
					Reviewing security? See <A href="/docs/governance">DAO structure</A>, <A href="/docs/module-lifecycle">Module lifecycle</A> and{' '}
					<A href="/docs/risks">Risks</A>.
				</li>
				<li>
					Integrating? Find every deployment under <A href="/docs/contracts">Contract addresses</A>.
				</li>
			</UL>
			<Callout title="Outdated docs">
				The previous documentation on GitBook described an older, single-stablecoin version of the protocol and is no longer maintained.
				This site is the source of truth.
			</Callout>
		</>
	),

	stablecoins: (
		<>
			<P>The protocol runs three independent stablecoins that share the same design and governance.</P>
			<AddressTable
				rows={[
					['USDU (US dollar)', addr.usduStable],
					['EURU (euro)', addr.euruStable],
					['CHFU (Swiss franc)', addr.chfuStable],
				]}
			/>
			<H2>Issuance</H2>
			<P>
				Nobody mints a stablecoin directly. Only modules approved by the DAO can mint and burn, and each module is proposed per
				stablecoin: the same contract on USDU, EURU and CHFU is three separate modules, each with its own proposal, status and expiry.
			</P>
			<H2>Backing</H2>
			<P>
				Each stablecoin is backed by equivalent assets of the same currency. The backing is deployed into a yield-bearing strategy vault,
				and the yield becomes protocol revenue. Today that means:
			</P>
			<UL>
				<li>
					<strong>USDU:</strong> USDC and USDT.
				</li>
				<li>
					<strong>EURU:</strong> EURC and dEURO.
				</li>
				<li>
					<strong>CHFU:</strong> ZCHF.
				</li>
			</UL>
			<P>
				The list is not fixed. The DAO can link a new, similar asset (for example DAI for USDU) by approving a module for it, and every
				module has its own mint limit. See <A href="/docs/swap-modules">Swap modules</A> for how this works.
			</P>
			<H2>Try it</H2>
			<P>Read a balance straight from the contract, for example with viem. Addresses come from the protocol&apos;s core package.</P>
			<CodeBlock>{`import { createPublicClient, http, erc20Abi } from 'viem';
import { mainnet } from 'viem/chains';
import { ADDRESS } from '@usdu-finance/usdu-core';

const client = createPublicClient({ chain: mainnet, transport: http() });

const balance = await client.readContract({
  address: ADDRESS[mainnet.id].usduStable,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: ['0xYourAddress'],
});`}</CodeBlock>
		</>
	),

	'how-it-works': (
		<>
			<OL>
				<li>
					<strong>Governed issuance.</strong> The Aragon DAO, the curator of every stablecoin, approves modules. Only approved modules
					can mint and burn. See <A href="/docs/module-lifecycle">Module lifecycle</A>.
				</li>
				<li>
					<strong>Swap in and out.</strong> A swap router connects a stablecoin to its backing assets through bridge modules, and each
					bridge deploys the backing into a yield-bearing strategy vault. Anyone can mint by depositing a backing asset and redeem by
					returning the stablecoin, without permission.
				</li>
				<li>
					<strong>Liquidity.</strong> Curve pools connect USDU to USDC and to EURU and CHFU, so the coins can also be traded without
					touching a module.
				</li>
				<li>
					<strong>Rewards.</strong> Revenue earned by the protocol is streamed to holders who stake a stablecoin in its reward vault
					(rUSDU, rEURU, rCHFU).
				</li>
			</OL>
			<Callout title="Everything is on-chain">
				Proposals, modules, flows and balances are readable on-chain. The <A href="/transparency">Transparency</A> and{' '}
				<A href="/modules">Modules</A> pages show them live.
			</Callout>
		</>
	),

	'swap-modules': (
		<>
			<P>
				A swap module lets you mint or redeem a stablecoin against a backing asset at a known rate, with live fees and capacity. Swaps run
				through a per-stablecoin <strong>swap router</strong> that routes to one or more <strong>bridge modules</strong>.
			</P>
			<P>
				Issuance is restricted, access is open: only modules approved by the DAO can mint and burn, but anyone can use an active module.
				Each module has its own fees and mint limit, which caps how much a single backing asset can issue.
			</P>
			<H2>Bridges</H2>
			<UL>
				<li>
					<strong>USDU:</strong> steakUSDC and steakUSDT vault bridges.
				</li>
				<li>
					<strong>EURU:</strong> steakEURC and dEURO vault bridges.
				</li>
				<li>
					<strong>CHFU:</strong> ZCHF vault bridge.
				</li>
			</UL>
			<P>
				Funds deposited through a bridge are deployed into the underlying yield-bearing strategy vault, and the yield becomes protocol
				revenue. New backing assets are added by approving another bridge module. Open
				the <A href="/dashboard/swap">Swap</A> page to see each module&apos;s current fees and remaining capacity.
			</P>
			<H2>Router addresses</H2>
			<AddressTable
				rows={[
					['USDU swap router', addr.usduSwapRouterV1],
					['EURU swap router', addr.euruSwapRouterV1],
					['CHFU swap router', addr.chfuSwapRouterV1],
				]}
			/>
		</>
	),

	liquidity: (
		<>
			<P>
				Curve pools give the stablecoins deep, permissionless liquidity. You can swap against them directly from the{' '}
				<A href="/dashboard/swap">Swap</A> page or provide liquidity from the <A href="/dashboard/liquidity">Liquidity</A> page.
			</P>
			<AddressTable
				rows={[
					['USDC / USDU (StableSwap NG)', addr.curveStableSwapNG_USDCUSDU],
					['USDC / USDU gauge', addr.curveStableSwapNG_USDCUSDU_gauge],
					['USDU / EURU (Twocrypto NG)', addr.curveTwocryptoNG_USDUEURU],
					['USDU / CHFU (Twocrypto NG)', addr.curveTwocryptoNG_USDUCHFU],
				]}
			/>
			<P>
				Liquidity providers earn Curve trading fees. Providing liquidity carries the usual risks of AMM pools, see{' '}
				<A href="/docs/risks">Risks</A>.
			</P>
		</>
	),

	rewards: (
		<>
			<P>
				Each stablecoin has a streamer vault. Stake the stablecoin and you receive a vault share (rUSDU, rEURU or rCHFU). Protocol revenue
				is streamed into the vault over time, so the share becomes redeemable for more of the stablecoin.
			</P>
			<UL>
				<li>No lock-up: deposit and withdraw at any time.</li>
				<li>Rewards accrue continuously rather than in discrete payouts.</li>
				<li>Compare vaults and stake on the <A href="/dashboard/strategy">Strategy</A> page.</li>
			</UL>
			<AddressTable
				rows={[
					['rUSDU streamer vault', addr.usduStreamerVaultV1],
					['rEURU streamer vault', addr.euruStreamerVaultV1],
					['rCHFU streamer vault', addr.chfuStreamerVaultV1],
				]}
			/>
		</>
	),

	zap: (
		<>
			<P>
				The zapper lets you pay with any token and end up in USDU, EURU, CHFU or one of their reward vaults in a single transaction. It
				finds a route for you, so there is no need to swap, mint and stake by hand.
			</P>
			<P>
				Open <A href="/dashboard/zap/swap">Zap in</A> to try it. Zaps use on-chain routing, so always check the quoted output and slippage
				before signing.
			</P>
			<AddressTable rows={[['Zapper (Enso)', addr.zapperSwapEnsoV1]]} />
		</>
	),

	governance: (
		<>
			<P>
				The USDU DAO, governed on Aragon, is the <strong>curator</strong> of the stablecoins: it alone can submit modules, change the time lock or appoint a
				guardian.
			</P>
			<UL>
				<li>
					<strong>Aragon DAO:</strong> the core contract and curator of the stablecoins.
				</li>
				<li>
					<strong>Multisig:</strong> creates and approves proposals for the DAO.
				</li>
				<li>
					<strong>Delayed action:</strong> stages approved proposals and executes them on the DAO only after the delay has passed.
				</li>
				<li>
					<strong>Veto multisig:</strong> can veto a staged proposal during the delay window, before it reaches the DAO.
				</li>
			</UL>
			<AddressTable
				rows={[
					['Aragon DAO (curator)', addr.aragonDao],
					['Multisig', addr.aragonMultiSig],
					['Delayed action', addr.aragonDelayedAction],
					['Veto multisig', addr.aragonVetoMultiSig],
				]}
			/>
			<P>
				Follow the DAO on <A href={SOCIAL.Aragon}>Aragon</A> and see the <A href="/governance">Governance</A> page for the current setup.
			</P>
		</>
	),

	'module-lifecycle': (
		<>
			<OL>
				<li>
					<strong>Propose.</strong> The curator submits a module with an expiry date and a public message. The stablecoin stores it as
					pending.
				</li>
				<li>
					<strong>Delay window.</strong> A change becomes valid only after the stablecoin&apos;s time lock has passed. The time lock can be
					set between 7 days and 4 weeks.
				</li>
				<li>
					<strong>Veto possible.</strong> While pending, the curator or the guardian can revoke the change. On the Aragon side the veto
					multisig can stop a staged proposal during its own delay.
				</li>
				<li>
					<strong>Active.</strong> After the delay anyone can accept the pending change.
				</li>
				<li>
					<strong>Expiry.</strong> A module is valid until its expiry date. After that it can no longer mint or move funds.
				</li>
			</OL>
			<P>
				Pending, active, revoked and expired modules are listed on the <A href="/modules">Modules</A> page.
			</P>
		</>
	),

	risks: (
		<>
			<P>USDU stablecoins are designed to be conservative, but no DeFi protocol is risk-free.</P>
			<UL>
				<li>
					<strong>Smart contract risk.</strong> Bugs in protocol or third-party contracts (vaults, Curve, Aragon) can lead to loss of funds.
				</li>
				<li>
					<strong>Backing asset risk.</strong> A swap module is only as safe as the asset and vault behind it. A depeg or loss in a backing
					asset can affect the stablecoin it supports.
				</li>
				<li>
					<strong>Liquidity risk.</strong> Redemptions depend on the capacity of the module and its underlying vault at that moment.
				</li>
				<li>
					<strong>Market risk.</strong> Curve pool prices can deviate from the peg, and liquidity providers face impermanent loss.
				</li>
				<li>
					<strong>Governance risk.</strong> The DAO controls which modules can issue. The time lock, veto and expiry limit, but do not
					remove, this risk.
				</li>
			</UL>
			<Callout title="Not financial advice">Only use funds you can afford to lose and review the audits and contracts yourself.</Callout>
		</>
	),

	contracts: (
		<>
			<P>All contracts are deployed on Ethereum mainnet.</P>
			<H2>Stablecoins and rewards</H2>
			<AddressTable
				rows={[
					['USDU', addr.usduStable],
					['EURU', addr.euruStable],
					['CHFU', addr.chfuStable],
					['rUSDU streamer vault', addr.usduStreamerVaultV1],
					['rEURU streamer vault', addr.euruStreamerVaultV1],
					['rCHFU streamer vault', addr.chfuStreamerVaultV1],
				]}
			/>
			<H2>Swap routers and bridges</H2>
			<AddressTable
				rows={[
					['USDU swap router', addr.usduSwapRouterV1],
					['USDU bridge: steakUSDC', addr.usduSwapBridgeMorphoV1_steakUSDC_module],
					['USDU bridge: steakUSDT', addr.usduSwapBridgeMorphoV1_steakUSDT_module],
					['EURU swap router', addr.euruSwapRouterV1],
					['EURU bridge: steakEURC', addr.euruSwapBridgeMorphoV1_steakEURC_module],
					['EURU bridge: dEURO', addr.euruSwapBridgeMorphoV1_dEURO_module],
					['CHFU swap router', addr.chfuSwapRouterV1],
					['CHFU bridge: ZCHF', addr.chfuSwapBridgeMorphoV1_ZCHF_module],
				]}
			/>
			<H2>Liquidity</H2>
			<AddressTable
				rows={[
					['USDC / USDU pool', addr.curveStableSwapNG_USDCUSDU],
					['USDC / USDU gauge', addr.curveStableSwapNG_USDCUSDU_gauge],
					['USDU / EURU pool', addr.curveTwocryptoNG_USDUEURU],
					['USDU / CHFU pool', addr.curveTwocryptoNG_USDUCHFU],
				]}
			/>
			<H2>Governance and tools</H2>
			<AddressTable
				rows={[
					['Aragon DAO (curator)', addr.aragonDao],
					['Multisig', addr.aragonMultiSig],
					['Delayed action', addr.aragonDelayedAction],
					['Veto multisig', addr.aragonVetoMultiSig],
					['Zapper', addr.zapperSwapEnsoV1],
					['Merkl distributor', addr.merklDistributor],
				]}
			/>
		</>
	),

	audits: (
		<>
			<P>
				The protocol code has been reviewed by <strong>BlockBite</strong> in 2025.
			</P>
			<UL>
				<li>
					<A href="/documents/BlockBite-USDU-Security-Audit-2025.pdf">
						BlockBite USDU Security Audit 2025 (PDF)
					</A>
				</li>
			</UL>
			<P>
				Source code is available on <A href={SOCIAL.Github_user}>GitHub</A> and verified on Etherscan. Modules deployed after the audit are
				listed on the <A href="/modules">Modules</A> page; review them before use.
			</P>
		</>
	),

	community: (
		<>
			<UL>
				<li>
					<A href={SOCIAL.Twitter}>X (Twitter)</A>
				</li>
				<li>
					<A href={SOCIAL.Telegram}>Telegram</A>
				</li>
				<li>
					<A href={SOCIAL.Github_user}>GitHub</A>
				</li>
				<li>
					<A href={SOCIAL.Aragon}>Aragon DAO</A>
				</li>
				<li>
					<A href={SOCIAL.Defillama}>DefiLlama</A>
				</li>
				<li>
					<A href={SOCIAL.Coingecko}>CoinGecko</A>
				</li>
				<li>
					USDU token on <A href={SOCIAL.Etherscan}>Etherscan</A> (<Code>{addr.usduStable}</Code>)
				</li>
			</UL>
		</>
	),
};
