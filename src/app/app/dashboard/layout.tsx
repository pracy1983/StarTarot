'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { GlassCard } from '@/components/ui/GlassCard'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { profile, isLoading: loading } = useAuthStore()
    const router = useRouter()
    const [isAuthorized, setIsAuthorized] = useState(false)

    useEffect(() => {
        if (loading) return

        if (!profile) {
            router.push('/')
            return
        }

        if (profile.role === 'owner') {
            setIsAuthorized(true)
            return
        }

        if (profile.role === 'oracle') {
            if (profile.application_status === 'approved') {
                setIsAuthorized(true)
            } else if (profile.application_status === 'pending') {
                router.push('/app/tornar-se-oraculo')
            } else {
                // Rejected or suspended or just role set without application ??
                router.push('/app')
            }
            return
        }

        // If client tries to access
        router.push('/app')

    }, [profile, loading, router])

    if (loading || !isAuthorized) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-deep-space">
                <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
            </div>
        )
    }

    return <>{children}</>
}
