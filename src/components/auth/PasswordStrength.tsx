'use client'

import React from 'react'
import { Check, X } from 'lucide-react'
import { PasswordRequirements } from '@/utils/passwordUtils'

interface PasswordStrengthProps {
    requirements: PasswordRequirements;
    password: string;
}

export const PasswordStrength = ({ requirements, password }: PasswordStrengthProps) => {
    if (!password) return null;

    const items = [
        { label: 'Pelo menos 8 caracteres', checked: requirements.length },
        { label: 'Uma letra maiúscula', checked: requirements.uppercase },
        { label: 'Uma letra minúscula', checked: requirements.lowercase },
        { label: 'Um número', checked: requirements.number },
        { label: 'Um símbolo (!@#$%^&*)', checked: requirements.special },
    ];

    return (
        <div className="mt-2 space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Requisitos de Segurança</p>
            <div className="grid grid-cols-1 gap-1.5">
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                        <div className={`flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center ${item.checked ? 'bg-green-500/20 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {item.checked ? <Check size={10} /> : <X size={10} />}
                        </div>
                        <span className={`text-[11px] transition-colors ${item.checked ? 'text-green-500/80' : 'text-slate-500'}`}>
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
