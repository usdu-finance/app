import { Address } from 'viem';

// Addresses intentionally excluded from @usdu-finance/usdu-core's published ADDRESS
// registry (external tokens, wound-down modules) but still needed by the app.
// Source: usdu-core commit 6ec2d61 "deprecate wound-down USDU adapters, trim exported
// address registry".

// Mainnet USDC — external token, not a protocol contract.
export const USDC_MAINNET: Address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// usduCurveAdapterV1_1_USDC_2 — Curve adapter module, wound down and expired as a
// governance module, but the contract still holds LP tokens being unwound.
export const USDU_CURVE_ADAPTER_V1_1_USDC_2: Address = '0x77cBb2f180F55dd2916bfC78F879A2C2dE37f638';
