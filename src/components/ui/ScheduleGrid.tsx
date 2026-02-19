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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {DAYS.map((dayName, dayIndex) => {
                    const dayData = schedule[dayIndex] || []
                    const isActive = dayData.length > 0 && dayData[0].active

                    return (
                        <div
                            key={dayIndex}
                            className={`p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between ${isActive ? 'bg-neon-purple/5 border-neon-purple/30 shadow-[0_0_15px_rgba(168,85,247,0.05)]' : 'bg-white/5 border-white/10 opacity-60'
                                }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`font-bold tracking-tight ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                        {dayName}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => toggleDayActive(dayIndex)}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${isActive ? 'bg-neon-purple' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isActive ? 'right-0.5' : 'left-0.5'}`} />
                                    </button>
                                </div>

                                {isActive && (
                                    <div className="space-y-3">
                                        {dayData.map((slot, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 bg-black/20 p-2 rounded-lg border border-white/5 overflow-hidden">
                                                <div className="flex-1 min-w-0">
                                                    <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1 ml-1 truncate">Início</label>
                                                    <input
                                                        type="time"
                                                        value={slot.start}
                                                        onChange={(e) => updateTime(dayIndex, idx, 'start', e.target.value)}
                                                        className="bg-deep-space border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white w-full outline-none focus:border-neon-purple/50 transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                                                    />
                                                </div>
                                                <div className="pt-4 text-slate-600 font-black text-[10px]">:</div>
                                                <div className="flex-1 min-w-0">
                                                    <label className="text-[9px] uppercase font-bold text-slate-500 block mb-1 ml-1 truncate">Fim</label>
                                                    <input
                                                        type="time"
                                                        value={slot.end}
                                                        onChange={(e) => updateTime(dayIndex, idx, 'end', e.target.value)}
                                                        className="bg-deep-space border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white w-full outline-none focus:border-neon-purple/50 transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {isActive && (
                                <button
                                    type="button"
                                    onClick={() => replicateToAll(dayIndex)}
                                    className="text-[9px] text-neon-cyan/60 hover:text-neon-cyan font-bold uppercase tracking-widest pt-4 transition-colors"
                                >
                                    Replicar para todos
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
