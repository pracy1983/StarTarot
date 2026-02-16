import React from 'react'
import { Power } from 'lucide-react'

interface OracleStatusToggleProps {
    isOnline: boolean
    onToggle: () => void
    applicationStatus?: string
}

export function OracleStatusToggle({ isOnline, onToggle, applicationStatus }: OracleStatusToggleProps) {
    const isApproved = applicationStatus === 'approved'

    return (
        <button
            onClick={isApproved ? onToggle : undefined}
            disabled={!isApproved}
            title={!isApproved ? 'Sua conta ainda está em análise. Você poderá ficar online assim que for aprovado.' : (isOnline ? 'Ficar Offline' : 'Ficar Online')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${!isApproved ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500 border-white/5' :
                isOnline
                    ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.2)]'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                }`}
        >
            <div className={`w-2 h-2 rounded-full ${!isApproved ? 'bg-slate-600' : isOnline ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-xs font-bold uppercase tracking-wider">
                {!isApproved ? 'Pendente' : (isOnline ? 'Online' : 'Offline')}
            </span>
            <Power size={14} className={!isApproved ? 'text-slate-600' : (isOnline ? 'text-green-400' : 'text-slate-500')} />
        </button>
    )
}
