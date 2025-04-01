"use client"

import { useState } from "react"
import { type Connection, PublicKey, Keypair, type Transaction } from "@solana/web3.js"
import { createMint } from "@solana/spl-token"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Copy, ExternalLink } from "lucide-react"

interface CreateTokenProps {
  walletAddress: string
  connection: Connection
  showNotification: (type: "success" | "error", message: string) => void
}

export default function CreateToken({ walletAddress, connection, showNotification }: CreateTokenProps) {
  const [tokenName, setTokenName] = useState("")
  const [tokenSymbol, setTokenSymbol] = useState("")
  const [decimals, setDecimals] = useState("9")
  const [isLoading, setIsLoading] = useState(false)
  const [createdTokenMint, setCreatedTokenMint] = useState<string | null>(null)

  const createToken = async () => {
    if (!tokenName || !tokenSymbol || !decimals) {
      showNotification("error", "Please fill in all fields")
      return
    }

    setIsLoading(true)
    try {
      // Create a new mint account
      const mintAccount = Keypair.generate()
      const mintAuthority = new PublicKey(walletAddress)
      const freezeAuthority = new PublicKey(walletAddress)

      // Create the token with the specified decimals
      const mint = await createMint(
        connection,
        {
          publicKey: new PublicKey(walletAddress),
          signTransaction: async (transaction: Transaction) => {
            try {
              if (!window.solana) {
                throw new Error("Wallet not connected")
              }

              // Request signature from the user's wallet
              const signedTransaction = await window.solana.signTransaction(transaction)
              return signedTransaction
            } catch (error) {
              console.error("Error signing transaction:", error)
              throw error
            }
          },
          signAllTransactions: async (transactions: Transaction[]) => {
            try {
              if (!window.solana) {
                throw new Error("Wallet not connected")
              }

              // Request signatures from the user's wallet
              const signedTransactions = await window.solana.signAllTransactions(transactions)
              return signedTransactions
            } catch (error) {
              console.error("Error signing transactions:", error)
              throw error
            }
          },
        },
        mintAuthority,
        freezeAuthority,
        Number.parseInt(decimals),
        mintAccount,
      )

      setCreatedTokenMint(mint.toString())
      showNotification("success", "Token created successfully!")
    } catch (error) {
      console.error("Error creating token:", error)
      showNotification("error", "Failed to create token. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showNotification("success", "Token address copied to clipboard")
  }

  const viewOnExplorer = (address: string) => {
    window.open(`https://explorer.solana.com/address/${address}?cluster=devnet`, "_blank")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Token</CardTitle>
        <CardDescription>Create your own SPL token on Solana devnet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tokenName">Token Name</Label>
          <Input
            id="tokenName"
            placeholder="My Token"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tokenSymbol">Token Symbol</Label>
          <Input
            id="tokenSymbol"
            placeholder="MTK"
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value)}
            disabled={isLoading}
            maxLength={5}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="decimals">Decimals</Label>
          <Input
            id="decimals"
            type="number"
            placeholder="9"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            disabled={isLoading}
            min="0"
            max="9"
          />
          <p className="text-sm text-muted-foreground">
            Number of decimal places (0-9). Standard is 9 for most tokens.
          </p>
        </div>

        {createdTokenMint && (
          <div className="p-4 bg-muted rounded-lg mt-4">
            <h4 className="font-medium mb-2">Token Created!</h4>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm break-all">{createdTokenMint}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdTokenMint)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => viewOnExplorer(createdTokenMint)}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Save this token address for minting tokens later</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={createToken}
          disabled={isLoading || !tokenName || !tokenSymbol || !decimals}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Token"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

