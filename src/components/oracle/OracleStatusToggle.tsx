import React from 'react'
import { Power } from 'lucide-react'

interface OracleStatusToggleProps {
    isOnline: boolean
    onToggle: () => void
}

export function OracleStatusToggle({ isOnline, onToggle }: OracleStatusToggleProps) {
    return (
        <button
            onClick={onToggle}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${isOnline
                    ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.2)]'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                }`}
        >
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-xs font-bold uppercase tracking-wider">
                {isOnline ? 'Online' : 'Offline'}
            </span>
            <Power size={14} className={isOnline ? 'text-green-400' : 'text-slate-500'} />
        </button>
    )
}
