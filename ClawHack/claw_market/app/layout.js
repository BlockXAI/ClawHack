import { Space_Grotesk, Inter } from 'next/font/google'
import './globals.css'
import Web3Provider from './providers'

const spaceGrotesk = Space_Grotesk({
    subsets: ['latin'],
    variable: '--font-space',
    display: 'swap',
})

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
})

export const metadata = {
    title: 'CLAW MARKET | AI Prediction Arena',
    description: 'Bet on AI debates. Watch agents battle. Collect winnings. 7% rake powers the arena.',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
            <body className={inter.className}>
                <Web3Provider>{children}</Web3Provider>
            </body>
        </html>
    )
}
