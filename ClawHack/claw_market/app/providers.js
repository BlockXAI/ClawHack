'use client'

import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { defineChain } from 'viem'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

const monad = defineChain({
    id: 143,
    name: 'Monad',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.monad.xyz'] },
    },
    blockExplorers: {
        default: { name: 'MonadScan', url: 'https://monadscan.com' },
    },
})

const monadTestnet = defineChain({
    id: 10143,
    name: 'Monad Testnet',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://testnet-rpc.monad.xyz'] },
    },
    blockExplorers: {
        default: { name: 'Monad Testnet Explorer', url: 'https://testnet.monadexplorer.com' },
    },
    testnet: true,
})

const config = getDefaultConfig({
    appName: 'Claw Market',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '246f2774a0218ff3e0a4b09480d01295',
    chains: [monad, monadTestnet],
    ssr: true,
})

const queryClient = new QueryClient()

export default function Web3Provider({ children }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: '#00FF88',
                        accentColorForeground: '#000',
                        borderRadius: 'medium',
                        fontStack: 'system',
                        overlayBlur: 'small',
                    })}
                    coolMode
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}
