import { type Address } from 'viem'

// Common types
export interface User {
  id: string
  address: Address
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
}

export interface ApiError {
  message: string
  code?: string
  status?: number
}

// Network types
export interface NetworkConfig {
  name: string
  chainId: number
  rpcUrl: string
  blockExplorer: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

// Transaction types
export interface BaseTransaction {
  id: string
  hash?: string
  status: 'pending' | 'confirmed' | 'failed'
  timestamp: number
}

// UI Component types
export interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}