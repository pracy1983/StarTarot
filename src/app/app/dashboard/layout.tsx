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

        const hasAccess = profile.role === 'owner' || profile.role === 'oracle' || !!profile.application_status
        if (hasAccess) {
            setIsAuthorized(true)
        } else {
            router.push('/app')
        }

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
