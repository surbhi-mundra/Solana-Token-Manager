"use client"

import { useState, useEffect } from "react"
import { type Connection, PublicKey, Transaction } from "@solana/web3.js"
import { createMintToInstruction, getOrCreateAssociatedTokenAccount, getMint } from "@solana/spl-token"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface MintTokenProps {
  walletAddress: string
  connection: Connection
  showNotification: (type: "success" | "error", message: string) => void
}

export default function MintToken({ walletAddress, connection, showNotification }: MintTokenProps) {
  const [tokenMintAddress, setTokenMintAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [tokenDecimals, setTokenDecimals] = useState<number>(9)
  const [recentTokens, setRecentTokens] = useState<string[]>([])

  // Load recent tokens from localStorage
  useEffect(() => {
    const savedTokens = localStorage.getItem("recentTokens")
    if (savedTokens) {
      try {
        setRecentTokens(JSON.parse(savedTokens))
      } catch (e) {
        console.error("Failed to parse saved tokens", e)
      }
    }
  }, [])

  // Update token decimals when mint address changes
  useEffect(() => {
    const fetchTokenDecimals = async () => {
      if (!tokenMintAddress || tokenMintAddress.length < 32) return

      try {
        const mintInfo = await getMint(connection, new PublicKey(tokenMintAddress))
        setTokenDecimals(mintInfo.decimals)
      } catch (error) {
        console.error("Error fetching token info:", error)
        // Keep default decimals if there's an error
      }
    }

    fetchTokenDecimals()
  }, [tokenMintAddress, connection])

  const mintToken = async () => {
    if (!tokenMintAddress || !amount) {
      showNotification("error", "Please fill in all fields")
      return
    }

    setIsLoading(true)
    try {
      const mintPublicKey = new PublicKey(tokenMintAddress)
      const userPublicKey = new PublicKey(walletAddress)

      // Get the token account of the wallet address, create it if it doesn't exist
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        {
          publicKey: userPublicKey,
          signTransaction: async (transaction: Transaction) => {
            if (!window.solana) {
              throw new Error("Wallet not connected")
            }
            return await window.solana.signTransaction(transaction)
          },
          signAllTransactions: async (transactions: Transaction[]) => {
            if (!window.solana) {
              throw new Error("Wallet not connected")
            }
            return await window.solana.signAllTransactions(transactions)
          },
        },
        mintPublicKey,
        userPublicKey,
      )

      // Calculate the amount to mint based on decimals
      const amountToMint = Math.floor(Number.parseFloat(amount) * Math.pow(10, tokenDecimals))

      // Create the mint instruction
      const transaction = new Transaction().add(
        createMintToInstruction(mintPublicKey, tokenAccount.address, userPublicKey, amountToMint),
      )

      // Send the transaction
      if (!window.solana) {
        throw new Error("Wallet not connected")
      }

      // Set recent blockhash and sign transaction
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.feePayer = userPublicKey

      const signed = await window.solana.signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signed.serialize())

      await connection.confirmTransaction(signature, "confirmed")

      // Save token to recent tokens
      if (!recentTokens.includes(tokenMintAddress)) {
        const updatedTokens = [tokenMintAddress, ...recentTokens].slice(0, 5)
        setRecentTokens(updatedTokens)
        localStorage.setItem("recentTokens", JSON.stringify(updatedTokens))
      }

      showNotification("success", `Successfully minted ${amount} tokens!`)
      setAmount("")
    } catch (error) {
      console.error("Error minting token:", error)
      showNotification("error", "Failed to mint tokens. Make sure you are the mint authority.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mint Tokens</CardTitle>
        <CardDescription>Mint tokens to your wallet (you must be the mint authority)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tokenMintAddress">Token Mint Address</Label>
          <Input
            id="tokenMintAddress"
            placeholder="Enter token mint address"
            value={tokenMintAddress}
            onChange={(e) => setTokenMintAddress(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {recentTokens.length > 0 && (
          <div className="space-y-2">
            <Label>Recent Tokens</Label>
            <div className="flex flex-wrap gap-2">
              {recentTokens.map((token, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setTokenMintAddress(token)}
                  className="text-xs"
                >
                  {token.slice(0, 4)}...{token.slice(-4)}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter amount to mint"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
            min="0"
            step="0.000000001"
          />
          <p className="text-sm text-muted-foreground">Token has {tokenDecimals} decimal places</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={mintToken} disabled={isLoading || !tokenMintAddress || !amount} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Minting...
            </>
          ) : (
            "Mint Tokens"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

