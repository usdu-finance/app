import React, { createContext, useContext, useReducer } from 'react'
import { useAppKitAccount } from '@reown/appkit-controllers/react'

// Basic auth state for now
interface AuthState {
  isConnected: boolean
  address: string | null
  isLoading: boolean
  error: string | null
}

interface AuthContextType extends AuthState {
  clearError: () => void
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION'; payload: { isConnected: boolean; address: string | null } }
  | { type: 'CLEAR_ERROR' }

const initialAuthState: AuthState = {
  isConnected: false,
  address: null,
  isLoading: false,
  error: null,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'SET_CONNECTION':
      return {
        ...state,
        isConnected: action.payload.isConnected,
        address: action.payload.address,
        error: null,
        isLoading: false,
      }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    default:
      return state
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState)
  const { address, isConnected } = useAppKitAccount()

  // Simple connection tracking
  React.useEffect(() => {
    dispatch({
      type: 'SET_CONNECTION',
      payload: { isConnected: !!isConnected, address: address || null }
    })
  }, [isConnected, address])

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  const contextValue: AuthContextType = {
    ...state,
    clearError,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}