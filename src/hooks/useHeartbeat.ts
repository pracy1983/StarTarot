import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useHeartbeat() {
    const { profile, isAuthenticated } = useAuthStore()

    useEffect(() => {
        if (!isAuthenticated || !profile?.id) return
        if (profile.role !== 'oracle' && profile.role !== 'owner') return

        // Oracle must be online to send heartbeat
        // Or maybe we send always if they are an oracle to "heal" states?
        // Let's only send if they are "online" state in the UI/Store

        let interval: NodeJS.Timeout | null = null

        const sendHeartbeat = async () => {
            // We only heartbeat if they are marked as online
            // This prevents heartbeating while they explicitly chose to be offline
            if (profile.is_online) {
                try {
                    await supabase.rpc('update_oracle_heartbeat', { p_user_id: profile.id })
                } catch (err) {
                    console.error('Heartbeat failed', err)
                }
            }
        }

        // Initial heartbeat
        sendHeartbeat()

        // Every 45 seconds (Marketplace considers online if < 2 min)
        interval = setInterval(sendHeartbeat, 45000)

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [profile?.id, profile?.is_online, isAuthenticated])
}
