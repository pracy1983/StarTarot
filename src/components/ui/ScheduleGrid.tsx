'use client'

import React from 'react'

interface ScheduleGridProps {
    schedule: Record<number, { start: string, end: string, active: boolean }[]>
    onChange: (schedule: Record<number, { start: string, end: string, active: boolean }[]>) => void
}

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export const ScheduleGrid = ({ schedule, onChange }: ScheduleGridProps) => {
    const toggleDayActive = (day: number) => {
        const newSchedule = { ...schedule }
        const daySchedule = newSchedule[day] || []

        if (daySchedule.length > 0 && daySchedule[0].active) {
            newSchedule[day] = daySchedule.map(s => ({ ...s, active: false }))
        } else {
            newSchedule[day] = daySchedule.length > 0
                ? daySchedule.map(s => ({ ...s, active: true }))
                : [{ start: '09:00', end: '18:00', active: true }]
        }
        onChange(newSchedule)
    }

    const updateTime = (day: number, index: number, field: 'start' | 'end', value: string) => {
        const newSchedule = { ...schedule }
        newSchedule[day][index][field] = value
        onChange(newSchedule)
    }

    const replicateToAll = (sourceDay: number) => {
        const sourceSchedule = schedule[sourceDay]
        if (!sourceSchedule || sourceSchedule.length === 0) return

        const newSchedule: Record<number, any> = {}
        for (let i = 0; i < 7; i++) {
            newSchedule[i] = JSON.parse(JSON.stringify(sourceSchedule))
        }
        onChange(newSchedule)
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {DAYS.map((dayName, dayIndex) => {
                    const dayData = schedule[dayIndex] || []
                    const isActive = dayData.length > 0 && dayData[0].active

                    return (
                        <div
                            key={dayIndex}
                            className={`p-4 rounded-xl border transition-all duration-300 ${isActive ? 'bg-neon-purple/5 border-neon-purple/30' : 'bg-white/5 border-white/10 opacity-60'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className={`font-semibold ${isActive ? 'text-neon-purple' : 'text-slate-400'}`}>
                                    {dayName}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => toggleDayActive(dayIndex)}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${isActive ? 'bg-neon-purple' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isActive ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>

                            {isActive && (
                                <div className="space-y-3">
                                    {dayData.map((slot, idx) => (
                                        <div key={idx} className="flex items-center space-x-2">
                                            <input
                                                type="time"
                                                value={slot.start}
                                                onChange={(e) => updateTime(dayIndex, idx, 'start', e.target.value)}
                                                className="bg-deep-space border border-white/10 rounded px-2 py-1 text-xs text-white"
                                            />
                                            <span className="text-slate-500 text-xs">às</span>
                                            <input
                                                type="time"
                                                value={slot.end}
                                                onChange={(e) => updateTime(dayIndex, idx, 'end', e.target.value)}
                                                className="bg-deep-space border border-white/10 rounded px-2 py-1 text-xs text-white"
                                            />
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => replicateToAll(dayIndex)}
                                        className="text-[10px] text-neon-cyan hover:underline w-full text-left mt-2 block"
                                    >
                                        Replicar para todos os dias
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
