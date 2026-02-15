export type OracleStatus = 'online' | 'horario' | 'offline'

interface Schedule {
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
}

export function getOracleStatus(isOnline: boolean, schedules: Schedule[] = []): { status: OracleStatus, label: string } {
    if (!isOnline && schedules.length === 0) {
        return { status: 'offline', label: 'Offline' }
    }

    const now = new Date()
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

    if (isOnline && isInSchedule) {
        return { status: 'online', label: 'Online Agora' }
    }

    if (isInSchedule) {
        return { status: 'horario', label: 'No Horário' }
    }

    if (isOnline) {
        // Caso esteja online mas fora do horário (ex: atendendo extra)
        return { status: 'online', label: 'Online Agora' }
    }

    return { status: 'offline', label: 'Offline' }
}
