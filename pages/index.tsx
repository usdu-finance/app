import { useAuth } from '@/contexts/AuthContext'
import { useAppKit } from '@reown/appkit/react'

export default function HomePage() {
  const { isConnected, address } = useAuth()
  const { open } = useAppKit()

  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold mb-8 text-text-primary">
        Welcome to USDU Finance
      </h1>
      
      <div className="space-y-6">
        <p className="text-xl text-text-secondary">
          A decentralized finance application for the USDU protocol
        </p>
        
        <div className="bg-dark-card p-6 rounded-xl max-w-md mx-auto">
          <h2 className="text-lg font-semibold mb-4">Wallet Connection</h2>
          
          {isConnected && address ? (
            <div className="space-y-2">
              <p className="text-text-secondary">Connected:</p>
              <p className="font-mono text-sm bg-dark-surface p-2 rounded break-all">
                {address}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-text-muted">Connect your wallet to get started</p>
              <button
                onClick={() => open()}
                className="w-full bg-accent-orange hover:bg-accent-gold text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}