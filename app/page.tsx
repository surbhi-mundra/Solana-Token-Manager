"use client"

import { useState, useEffect } from "react"
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Wallet } from "lucide-react"
import WalletConnect from "@/components/wallet-connect"
import CreateToken from "@/components/create-token"
import MintToken from "@/components/mint-token"
import SendToken from "@/components/send-token"
import TransactionHistory from "@/components/transaction-history"

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [solBalance, setSolBalance] = useState<number>(0)
  const [notification, setNotification] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })

  // Connection to Solana devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed")

  // Get SOL balance when wallet is connected
  useEffect(() => {
    const getBalance = async () => {
      if (walletAddress) {
        try {
          const balance = await connection.getBalance(new PublicKey(walletAddress))
          setSolBalance(balance / LAMPORTS_PER_SOL)
        } catch (error) {
          console.error("Error fetching balance:", error)
        }
      }
    }

    getBalance()
    // Set up interval to refresh balance every 15 seconds
    const intervalId = setInterval(getBalance, 15000)
    return () => clearInterval(intervalId)
  }, [walletAddress, connection])

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message })
    // Clear notification after 5 seconds
    setTimeout(() => {
      setNotification({ type: null, message: "" })
    }, 5000)
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8">Solana Token Manager</h1>

      {/* Wallet Connection */}
      <WalletConnect
        walletAddress={walletAddress}
        setWalletAddress={setWalletAddress}
        solBalance={solBalance}
        showNotification={showNotification}
      />

      {/* Notification */}
      {notification.type && (
        <Alert
          variant={notification.type === "success" ? "default" : "destructive"}
          className="my-4 animate-in fade-in slide-in-from-top-5 duration-300"
        >
          {notification.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{notification.type === "success" ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      {/* Main Content - Only show when wallet is connected */}
      {walletAddress ? (
        <Tabs defaultValue="create" className="mt-6">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="create">Create Token</TabsTrigger>
            <TabsTrigger value="mint">Mint Token</TabsTrigger>
            <TabsTrigger value="send">Send Token</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <CreateToken walletAddress={walletAddress} connection={connection} showNotification={showNotification} />
          </TabsContent>

          <TabsContent value="mint">
            <MintToken walletAddress={walletAddress} connection={connection} showNotification={showNotification} />
          </TabsContent>

          <TabsContent value="send">
            <SendToken walletAddress={walletAddress} connection={connection} showNotification={showNotification} />
          </TabsContent>

          <TabsContent value="history">
            <TransactionHistory walletAddress={walletAddress} connection={connection} />
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Welcome to Solana Token Manager</CardTitle>
            <CardDescription>Connect your wallet to create, mint, and send tokens on Solana devnet.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Wallet className="h-16 w-16 mb-4 text-primary" />
              <p className="text-lg mb-4">Please connect your Solana wallet to get started.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

