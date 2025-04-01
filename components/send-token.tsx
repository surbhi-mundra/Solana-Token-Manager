"use client"

import { useState, useEffect } from "react"
import { type Connection, PublicKey, Transaction } from "@solana/web3.js"
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  getMint,
} from "@solana/spl-token"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SendTokenProps {
  walletAddress: string
  connection: Connection
  showNotification: (type: "success" | "error", message: string) => void
}

interface TokenBalance {
  mint: string
  balance: number
  decimals: number
  symbol?: string
}

export default function SendToken({ walletAddress, connection, showNotification }: SendTokenProps) {
  const [recipientAddress, setRecipientAddress] = useState("")
  const [selectedToken, setSelectedToken] = useState("")
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)

  // Fetch token accounts owned by the user
  useEffect(() => {
    const fetchTokenAccounts = async () => {
      if (!walletAddress) return

      setIsLoadingTokens(true)
      try {
        const accounts = await connection.getParsedTokenAccountsByOwner(new PublicKey(walletAddress), {
          programId: TOKEN_PROGRAM_ID,
        })

        const balances: TokenBalance[] = []

        for (const account of accounts.value) {
          const parsedInfo = account.account.data.parsed.info
          const mintAddress = parsedInfo.mint
          const tokenBalance = parsedInfo.tokenAmount.uiAmount

          if (tokenBalance > 0) {
            try {
              const mintInfo = await getMint(connection, new PublicKey(mintAddress))
              balances.push({
                mint: mintAddress,
                balance: tokenBalance,
                decimals: mintInfo.decimals,
                // You could fetch token metadata here if available
              })
            } catch (error) {
              console.error(`Error fetching mint info for ${mintAddress}:`, error)
            }
          }
        }

        setTokenBalances(balances)
      } catch (error) {
        console.error("Error fetching token accounts:", error)
        showNotification("error", "Failed to load your tokens")
      } finally {
        setIsLoadingTokens(false)
      }
    }

    fetchTokenAccounts()
  }, [walletAddress, connection, showNotification])

  const sendToken = async () => {
    if (!selectedToken || !recipientAddress || !amount) {
      showNotification("error", "Please fill in all fields")
      return
    }

    setIsLoading(true)
    try {
      const mintPublicKey = new PublicKey(selectedToken)
      const senderPublicKey = new PublicKey(walletAddress)
      const recipientPublicKey = new PublicKey(recipientAddress)

      // Find the selected token's decimals
      const selectedTokenInfo = tokenBalances.find((t) => t.mint === selectedToken)
      if (!selectedTokenInfo) {
        throw new Error("Selected token not found in your balances")
      }

      // Calculate the amount to send based on decimals
      const amountToSend = Math.floor(Number.parseFloat(amount) * Math.pow(10, selectedTokenInfo.decimals))

      // Get the sender's token account
      const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        {
          publicKey: senderPublicKey,
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
        senderPublicKey,
      )

      // Get or create the recipient's token account
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        {
          publicKey: senderPublicKey,
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
        recipientPublicKey,
      )

      // Create the transfer instruction
      const transaction = new Transaction().add(
        createTransferInstruction(
          senderTokenAccount.address,
          recipientTokenAccount.address,
          senderPublicKey,
          amountToSend,
        ),
      )

      // Send the transaction
      if (!window.solana) {
        throw new Error("Wallet not connected")
      }

      // Set recent blockhash and sign transaction
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.feePayer = senderPublicKey

      const signed = await window.solana.signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signed.serialize())

      await connection.confirmTransaction(signature, "confirmed")

      showNotification("success", `Successfully sent ${amount} tokens!`)
      setAmount("")
      setRecipientAddress("")
    } catch (error) {
      console.error("Error sending token:", error)
      showNotification("error", "Failed to send tokens. Please check the recipient address and your balance.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Tokens</CardTitle>
        <CardDescription>Send tokens to another wallet address</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tokenSelect">Select Token</Label>
          <Select
            value={selectedToken}
            onValueChange={setSelectedToken}
            disabled={isLoadingTokens || tokenBalances.length === 0}
          >
            <SelectTrigger id="tokenSelect">
              <SelectValue placeholder={isLoadingTokens ? "Loading tokens..." : "Select a token"} />
            </SelectTrigger>
            <SelectContent>
              {tokenBalances.map((token) => (
                <SelectItem key={token.mint} value={token.mint}>
                  {token.symbol || token.mint.slice(0, 4) + "..." + token.mint.slice(-4)} ({token.balance})
                </SelectItem>
              ))}
              {tokenBalances.length === 0 && !isLoadingTokens && (
                <SelectItem value="no-tokens" disabled>
                  No tokens found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipientAddress">Recipient Address</Label>
          <Input
            id="recipientAddress"
            placeholder="Enter recipient's Solana address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter amount to send"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
            min="0"
          />
          {selectedToken && (
            <p className="text-sm text-muted-foreground">
              Balance: {tokenBalances.find((t) => t.mint === selectedToken)?.balance || 0}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={sendToken}
          disabled={isLoading || !selectedToken || !recipientAddress || !amount}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send Tokens"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

