import { mainnet, base } from 'viem/chains'

// Supported networks
export const SUPPORTED_NETWORKS = {
  MAINNET: mainnet.id,
  BASE: base.id,
} as const

// Network configurations
export const NETWORK_CONFIG = {
  [SUPPORTED_NETWORKS.MAINNET]: {
    name: 'Ethereum Mainnet',
    chainId: SUPPORTED_NETWORKS.MAINNET,
    rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_RPC_URL}`,
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  [SUPPORTED_NETWORKS.BASE]: {
    name: 'Base',
    chainId: SUPPORTED_NETWORKS.BASE,
    rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_RPC_URL}`,
    blockExplorer: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
} as const

// Wallet connection timeouts
export const CONNECTION_TIMEOUT = 30000 // 30 seconds
export const SIGNATURE_TIMEOUT = 60000 // 60 seconds

// Message validation patterns
export const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
export const SIGNATURE_REGEX = /^0x[a-fA-F0-9]{130}$/

// Authentication message constants
export const AUTH_MESSAGE_PREFIX = 'Signing this message confirms your control over the wallet address:'
export const DEFAULT_MESSAGE_VALIDITY = 300000 // 5 minutes in milliseconds
export const DEFAULT_MESSAGE_EXPIRY = 600000 // 10 minutes in milliseconds