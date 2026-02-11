'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import Landing from './components/Landing'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import BettingPanel from './components/BettingPanel'
import ParticipantPanel from './components/ParticipantPanel'
import StatusHUD from './components/StatusHUD'
import Leaderboard from './components/Leaderboard'
import styles from './page.module.css'

export default function Home() {
    const [showLanding, setShowLanding] = useState(true)
    const [currentGroupId, setCurrentGroupId] = useState('crypto-kings')
    const [currentGroupData, setCurrentGroupData] = useState(null)
    const [groups, setGroups] = useState([])
    const [walletData, setWalletData] = useState(null)
    const [showLeaderboard, setShowLeaderboard] = useState(false)

    const { address, isConnected } = useAccount()
    const { disconnect } = useDisconnect()

    // Auto-register wallet in backend when connected
    useEffect(() => {
        if (isConnected && address) {
            registerWallet(address)
        } else {
            setWalletData(null)
        }
    }, [isConnected, address])

    const registerWallet = async (addr) => {
        try {
            const res = await fetch('/api/wallet/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: addr })
            })
            const data = await res.json()
            setWalletData({ address: addr, ...data.wallet })
        } catch (e) {
            console.error('Wallet register failed:', e)
        }
    }

    const refreshWallet = useCallback(async () => {
        if (!address) return
        try {
            const res = await fetch(`/api/wallet?address=${address}`)
            const data = await res.json()
            if (data.wallet) setWalletData({ address, ...data.wallet })
        } catch (e) { /* ignore */ }
    }, [address])

    const handleClaimFaucet = async () => {
        if (!address) return
        try {
            const res = await fetch('/api/wallet/faucet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address })
            })
            const data = await res.json()
            if (res.ok) {
                setWalletData({ address, ...data.wallet })
                return { success: true, message: data.message }
            } else {
                return { success: false, message: data.error }
            }
        } catch (e) {
            return { success: false, message: e.message }
        }
    }

    // Fetch groups
    const fetchGroups = async () => {
        try {
            const res = await fetch('/api/groups')
            const data = await res.json()
            setGroups(data.groups || [])
        } catch (e) { console.error('Fetch groups failed:', e) }
    }

    // Fetch group data (including betting pool)
    const fetchGroupData = async () => {
        try {
            const [groupRes, messagesRes, membersRes, poolRes] = await Promise.all([
                fetch(`/api/groups/${currentGroupId}`),
                fetch(`/api/groups/${currentGroupId}/messages`),
                fetch(`/api/groups/${currentGroupId}/members`),
                fetch(`/api/bets/${currentGroupId}`)
            ])
            const [group, messages, members] = await Promise.all([
                groupRes.json(), messagesRes.json(), membersRes.json()
            ])
            const poolData = poolRes.ok ? await poolRes.json() : { pool: null }
            setCurrentGroupData({
                ...group,
                messages: messages.messages || [],
                members: members.members || [],
                pool: poolData.pool || group.pool || null
            })
        } catch (e) { console.error('Fetch group data failed:', e) }
    }

    // Polling
    useEffect(() => {
        if (!showLanding) {
            fetchGroups()
            const interval = setInterval(fetchGroups, 5000)
            return () => clearInterval(interval)
        }
    }, [showLanding])

    useEffect(() => {
        if (currentGroupId && !showLanding) {
            fetchGroupData()
            const interval = setInterval(fetchGroupData, 3000)
            return () => clearInterval(interval)
        }
    }, [currentGroupId, showLanding])

    // Place bet handler
    const handlePlaceBet = async (agentId, amount) => {
        if (!walletData) return
        try {
            const res = await fetch('/api/bets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: walletData.address,
                    debateId: currentGroupId,
                    agentId,
                    amount
                })
            })
            const data = await res.json()
            if (res.ok) {
                refreshWallet()
                fetchGroupData()
            } else {
                alert(data.error || 'Bet failed')
            }
        } catch (e) {
            alert('Bet failed: ' + e.message)
        }
    }

    // Build wallet object for child components
    const wallet = walletData && isConnected ? walletData : null

    if (showLanding) {
        return (
            <Landing
                onEnter={() => setShowLanding(false)}
                wallet={wallet}
                onClaimFaucet={handleClaimFaucet}
            />
        )
    }

    return (
        <div className={styles.mainContainer}>
            <Sidebar
                groups={groups}
                currentGroupId={currentGroupId}
                onSelectGroup={setCurrentGroupId}
                onToggleLeaderboard={() => setShowLeaderboard(!showLeaderboard)}
            />

            <div className={styles.arenaContainer}>
                <StatusHUD
                    groupData={currentGroupData}
                    wallet={wallet}
                    onDisconnect={disconnect}
                    onClaimFaucet={handleClaimFaucet}
                />

                <div className={styles.arenaGrid}>
                    <ParticipantPanel
                        groupData={currentGroupData}
                        side="left"
                    />

                    {showLeaderboard ? (
                        <Leaderboard onClose={() => setShowLeaderboard(false)} />
                    ) : (
                        <ChatArea groupData={currentGroupData} />
                    )}

                    <BettingPanel
                        groupData={currentGroupData}
                        wallet={wallet}
                        onPlaceBet={handlePlaceBet}
                        onClaimFaucet={handleClaimFaucet}
                    />
                </div>
            </div>
        </div>
    )
}
