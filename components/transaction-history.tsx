"use client"

import { useState, useEffect } from "react"
import { type Connection, PublicKey } from "@solana/web3.js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { truncateAddress } from "@/lib/utils"

interface TransactionHistoryProps {
  walletAddress: string
  connection: Connection
}

interface Transaction {
  signature: string
  blockTime: number
  slot: number
  type: string
  status: "confirmed" | "failed"
}

export default function TransactionHistory({ walletAddress, connection }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!walletAddress) return

      setIsLoading(true)
      try {
        const publicKey = new PublicKey(walletAddress)
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 })

        const txs = await Promise.all(
          signatures.map(async (sig) => {
            const tx = await connection.getParsedTransaction(sig.signature, "confirmed")

            let type = "Unknown"
            if (tx?.meta && tx.transaction.message.instructions) {
              // Try to determine transaction type
              const instructions = tx.transaction.message.instructions
              if (
                instructions.some((ix) => ix.programId?.toString() === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
              ) {
                type = "Token"
              } else if (instructions.some((ix) => ix.programId?.toString() === "11111111111111111111111111111111")) {
                type = "SOL Transfer"
              }
            }

            return {
              signature: sig.signature,
              blockTime: sig.blockTime || 0,
              slot: sig.slot,
              type,
              status: sig.err ? "failed" : "confirmed",
            }
          }),
        )

        setTransactions(txs)
      } catch (error) {
        console.error("Error fetching transactions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [walletAddress, connection])

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "Unknown"
    return new Date(timestamp * 1000).toLocaleString()
  }

  const viewOnExplorer = (signature: string) => {
    window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, "_blank")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Recent transactions from your wallet</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.signature}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{truncateAddress(tx.signature)}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        tx.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(tx.blockTime)} • {tx.type}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 sm:mt-0"
                  onClick={() => viewOnExplorer(tx.signature)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No transactions found</div>
        )}
      </CardContent>
    </Card>
  )
}

