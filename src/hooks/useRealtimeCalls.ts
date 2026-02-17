import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export type IncomingCall = {
    id: string
    client_id: string
    client_name?: string
    topic?: string
    created_at: string
    is_using_bonus?: boolean
}

export function useRealtimeCalls() {
    const { profile } = useAuthStore()
    const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
    const [isOnline, setIsOnline] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Initial Status Fetch
    useEffect(() => {
        if (profile?.id && (profile.role === 'oracle' || profile.role === 'owner')) {
            setIsOnline(profile.is_online || false)
        }
    }, [profile])

    // Realtime Subscription
    useEffect(() => {
        if (!profile?.id || (profile.role !== 'oracle' && profile.role !== 'owner')) return

        // Check for existing pending calls on mount
        const checkPending = async () => {
            const { data } = await supabase
                .from('consultations')
                .select(`
                    id, 
                    client_id, 
                    created_at,
                    client:client_id (full_name)
                `)
                .eq('oracle_id', profile.id)
                .eq('status', 'pending')
                .gt('created_at', new Date(Date.now() - 20000).toISOString()) // Only recent (last 20s)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (data) {
                setIncomingCall({
                    id: data.id,
                    client_id: data.client_id,
                    client_name: (data as any).client?.full_name || 'Cliente',
                    created_at: data.created_at
                })
            }
        }

        if (isOnline) {
            checkPending()
        }

        const channel = supabase
            .channel('realtime_calls')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'consultations',
                    filter: `oracle_id=eq.${profile.id}`
                },
                async (payload) => {
                    // Don't ring if already in a call (sala)
                    if (typeof window !== 'undefined' && window.location.pathname.includes('/sala')) return

                    if (payload.new.status === 'pending') {
                        // Fetch client name
                        const { data: userData } = await supabase
                            .from('profiles')
                            .select('full_name')
                            .eq('id', payload.new.client_id)
                            .single()

                        setIncomingCall({
                            id: payload.new.id,
                            client_id: payload.new.client_id,
                            client_name: userData?.full_name || 'Cliente',
                            created_at: payload.new.created_at
                        })
                        playRing()
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'consultations',
                    filter: `oracle_id=eq.${profile.id}`
                },
                (payload) => {
                    // Coping with cancellations or timeouts from other sources
                    if (incomingCall && payload.new.id === incomingCall.id) {
                        if (payload.new.status !== 'pending') {
                            setIncomingCall(null)
                            stopRing()
                        }
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
            stopRing()
        }
    }, [profile?.id, isOnline])

    const playRing = () => {
        if (!audioRef.current) {
            audioRef.current = new Audio('/sounds/ring.mp3') // Ensure this file exists or use a generic URL
            audioRef.current.loop = true
        }
        audioRef.current.play().catch(e => console.log('Audio play failed', e))
    }

    const stopRing = () => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
        }
    }

    const acceptCall = async () => {
        if (!incomingCall) return

        stopRing()
        try {
            const { error } = await supabase
                .from('consultations')
                .update({
                    status: 'active',
                    started_at: new Date().toISOString()
                })
                .eq('id', incomingCall.id)

            if (error) throw error

            // Redirect will be handled by the component consuming this hook or manually
            return incomingCall.id
        } catch (err) {
            toast.error('Erro ao aceitar chamada')
            return null
        }
    }

    const rejectCall = async () => {
        if (!incomingCall) return

        stopRing()
        setIncomingCall(null)
        try {
            await supabase
                .from('consultations')
                .update({
                    status: 'canceled',
                    ended_at: new Date().toISOString()
                })
                .eq('id', incomingCall.id)
        } catch (err) {
            console.error('Error rejecting call:', err)
        }
    }

    const toggleOnline = async () => {
        if (!profile?.id) return

        const newState = !isOnline

        // VALIDATION: Must have at least one channel enabled to go online
        if (newState === true) {
            if (!profile.allows_video && !profile.allows_text) {
                toast.error('Ative Vídeo ou Mensagem para ficar Online!', {
                    icon: '🚫',
                    style: {
                        background: '#ef4444',
                        color: '#fff'
                    }
                })
                return
            }
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_online: newState })
                .eq('id', profile.id)

            if (error) throw error
            setIsOnline(newState)
            useAuthStore.getState().setProfile({ ...profile, is_online: newState })
            toast.success(newState ? 'Você está Online!' : 'Você está Offline')
        } catch (err) {
            toast.error('Erro ao mudar status')
        }
    }

    return {
        isOnline,
        incomingCall,
        acceptCall,
        rejectCall,
        toggleOnline
    }
}
