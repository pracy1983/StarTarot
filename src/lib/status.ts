export type OracleStatus = 'online' | 'offline'

interface Schedule {
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
}

export function getOracleStatus(isOnline: boolean, schedules: Schedule[] = [], lastHeartbeatAt?: string, isAI: boolean = false): { status: OracleStatus, label: string } {
    const now = new Date()

    const currentDay = now.getDay() // 0-6 (Sunday=0)
    const previousDay = currentDay === 0 ? 6 : currentDay - 1
    const currentTime = now.getHours() * 60 + now.getMinutes()

    // Check today's schedules AND yesterday's (for midnight-crossing schedules like 19:00-03:00)
    const relevantSchedules = schedules.filter(s =>
        s.is_active && (s.day_of_week === currentDay || s.day_of_week === previousDay)
    )

    const isInSchedule = relevantSchedules.some(s => {
        const [startH, startM] = s.start_time.split(':').map(Number)
        const [endH, endM] = s.end_time.split(':').map(Number)
        const startTotal = startH * 60 + startM
        const endTotal = endH * 60 + endM

        if (startTotal <= endTotal) {
            // Normal schedule (e.g. 09:00-18:00): only applies to today's entry
            return s.day_of_week === currentDay && currentTime >= startTotal && currentTime <= endTotal
        } else {
            // Midnight-crossing schedule (e.g. 19:00-03:00)
            if (s.day_of_week === currentDay) {
                // Today's entry: we are in the "evening" portion (>= start)
                return currentTime >= startTotal
            } else {
                // Yesterday's entry: we are in the "morning" portion (<= end)
                return currentTime <= endTotal
            }
        }
    })

    // For AI Oracles, they are online if within schedule
    if (isAI) {
        if (isInSchedule) {
            return { status: 'online', label: 'Online Agora' }
        }
        return { status: 'offline', label: 'Offline' }
    }

    // For Human Oracles, require both is_online flag AND active heartbeat signal
    let isPulseActive = false
    if (lastHeartbeatAt) {
        const lastPulse = new Date(lastHeartbeatAt).getTime()
        // Incremented to 3 minutes (180000ms) to be more forgiving with mobile browsers/tab throttling
        isPulseActive = (now.getTime() - lastPulse) < 180000
    }

    const effectiveOnline = isOnline && isPulseActive

    if (effectiveOnline) {
        return { status: 'online', label: 'Online Agora' }
    }

    return { status: 'offline', label: 'Offline' }
}
