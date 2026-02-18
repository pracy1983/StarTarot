export type OracleStatus = 'online' | 'offline'

interface Schedule {
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
}

export function getOracleStatus(isOnline: boolean, schedules: Schedule[] = [], lastHeartbeatAt?: string): { status: OracleStatus, label: string } {
    const now = new Date()

    // Check if heartbeat is active (within last 2 minutes)
    let isPulseActive = false
    if (lastHeartbeatAt) {
        const lastPulse = new Date(lastHeartbeatAt).getTime()
        isPulseActive = (now.getTime() - lastPulse) < 120000 // 2 minutes
    }

    // Require both is_online flag AND active heartbeat signal
    const effectiveOnline = isOnline && isPulseActive

    if (!effectiveOnline && schedules.length === 0) {
        return { status: 'offline', label: 'Offline' }
    }

    const currentDay = now.getDay() // 0-6
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const todaySchedules = schedules.filter(s => s.day_of_week === currentDay && s.is_active)

    const isInSchedule = todaySchedules.some(s => {
        const [startH, startM] = s.start_time.split(':').map(Number)
        const [endH, endM] = s.end_time.split(':').map(Number)
        const startTotal = startH * 60 + startM
        const endTotal = endH * 60 + endM
        return currentTime >= startTotal && currentTime <= endTotal
    })

    if (effectiveOnline) {
        return { status: 'online', label: 'Online Agora' }
    }

    return { status: 'offline', label: 'Offline' }
}
