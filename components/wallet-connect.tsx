"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, LogOut, Wallet } from "lucide-react"
import { truncateAddress } from "@/lib/utils"

interface WalletConnectProps {
  walletAddress: string | null
  setWalletAddress: (address: string | null) => void
  solBalance: number
  showNotification: (type: "success" | "error", message: string) => void
}

export default function WalletConnect({
  walletAddress,
  setWalletAddress,
  solBalance,
  showNotification,
}: WalletConnectProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false)

  // Check if Phantom wallet is installed
  useEffect(() => {
    const checkPhantomWallet = () => {
      if ("solana" in window && window.solana?.isPhantom) {
        setIsPhantomInstalled(true)

        // Check if already connected
        if (window.solana.isConnected) {
          const address = window.solana.publicKey?.toString()
          if (address) {
            setWalletAddress(address)
          }
        }
      }
    }

    // Check immediately and after a short delay to ensure window.solana is available
    checkPhantomWallet()
    const timeoutId = setTimeout(checkPhantomWallet, 500)

    return () => clearTimeout(timeoutId)
  }, [setWalletAddress])

  const connectWallet = async () => {
    try {
      setIsLoading(true)

      if (!isPhantomInstalled) {
        window.open("https://phantom.app/", "_blank")
        showNotification("error", "Please install Phantom wallet")
        return
      }

      const { solana } = window

      if (solana) {
        const response = await solana.connect()
        const address = response.publicKey.toString()
        setWalletAddress(address)
        showNotification("success", "Wallet connected successfully")
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
      showNotification("error", "Failed to connect wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    try {
      if (window.solana) {
        window.solana.disconnect()
      }
      setWalletAddress(null)
      showNotification("success", "Wallet disconnected")
    } catch (error) {
      console.error("Error disconnecting wallet:", error)
      showNotification("error", "Failed to disconnect wallet")
    }
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {walletAddress ? (
              <div className="flex flex-col">
                <span className="font-medium">{truncateAddress(walletAddress)}</span>
                <span className="text-sm text-muted-foreground">{solBalance.toFixed(4)} SOL</span>
              </div>
            ) : (
              <span>Not connected</span>
            )}
          </div>

          {walletAddress ? (
            <Button variant="outline" onClick={disconnectWallet} className="w-full sm:w-auto">
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          ) : (
            <Button onClick={connectWallet} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Wallet
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

