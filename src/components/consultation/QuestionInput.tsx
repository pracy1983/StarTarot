'use client'

import React, { useState } from 'react'
import { Plus, X, Sparkles, Calendar, User as UserIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface QuestionInputProps {
    questions: string[]
    onChange: (questions: string[]) => void
    pricePerQuestion: number
}

export const QuestionInput = ({ questions, onChange, pricePerQuestion }: QuestionInputProps) => {
    const addQuestion = () => {
        onChange([...questions, ''])
    }

    const removeQuestion = (index: number) => {
        if (questions.length > 1) {
            onChange(questions.filter((_, i) => i !== index))
        }
    }

    const updateQuestion = (index: number, value: string) => {
        const updated = [...questions]
        updated[index] = value
        onChange(updated)
    }

    const totalCredits = questions.length * pricePerQuestion

    return (
        <div className="space-y-6">
            <AnimatePresence mode="popLayout">
                {questions.map((q, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="relative"
                    >
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center text-neon-purple text-sm font-bold mt-2">
                                {idx + 1}
                            </div>
                            <div className="flex-1">
                                <textarea
                                    value={q}
                                    onChange={(e) => updateQuestion(idx, e.target.value)}
                                    placeholder={idx === 0 ? "Digite sua primeira pergunta..." : "Digite mais uma pergunta..."}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 focus:border-neon-purple/50 outline-none transition-all resize-none"
                                    rows={3}
                                />
                            </div>
                            {questions.length > 1 && (
                                <button
                                    onClick={() => removeQuestion(idx)}
                                    className="flex-shrink-0 p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors mt-2"
                                    title="Remover pergunta"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            <button
                onClick={addQuestion}
                className="flex items-center space-x-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:border-neon-purple/30 rounded-xl text-slate-400 hover:text-neon-purple transition-all group"
                title="Adicionar mais uma pergunta"
            >
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                <span className="text-sm font-medium">Adicionar Pergunta</span>
            </button>

            {/* Preview de Créditos */}
            <div className="flex items-center justify-between p-4 bg-neon-gold/5 border border-neon-gold/20 rounded-xl">
                <div className="flex items-center space-x-2 text-sm text-slate-300">
                    <Sparkles size={16} className="text-neon-gold" />
                    <span>
                        {questions.length} {questions.length === 1 ? 'pergunta' : 'perguntas'} × {pricePerQuestion} CR
                    </span>
                </div>
                <div className="text-lg font-bold text-neon-gold">
                    Total: {totalCredits} CR
                </div>
            </div>
        </div>
    )
}

interface SubjectInfoProps {
    subjectName: string
    subjectBirthdate: string
    subjectBirthtime?: string
    onNameChange: (value: string) => void
    onBirthdateChange: (value: string) => void
    onBirthtimeChange?: (value: string) => void
    isMandatory?: boolean
}

export const SubjectInfo = ({
    subjectName,
    subjectBirthdate,
    subjectBirthtime = '',
    onNameChange,
    onBirthdateChange,
    onBirthtimeChange,
    isMandatory = false
}: SubjectInfoProps) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                    {isMandatory
                        ? 'Informações obrigatórias para esta consulta:'
                        : 'Se a consulta for sobre outra pessoa, informe abaixo (opcional):'}
                </p>
                {isMandatory && (
                    <span className="text-[10px] bg-neon-purple/20 text-neon-purple px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-neon-purple/30">
                        Obrigatório
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-xs text-slate-500 font-medium flex items-center">
                        Nome Completo {isMandatory && <span className="text-neon-purple ml-1">*</span>}
                    </label>
                    <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            value={subjectName}
                            onChange={(e) => onNameChange(e.target.value)}
                            placeholder="Ex: Maria dos Santos"
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:border-neon-purple/50 outline-none transition-all"
                            required={isMandatory}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-slate-500 font-medium flex items-center">
                        Data de nascimento {isMandatory && <span className="text-neon-purple ml-1">*</span>}
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="date"
                            value={subjectBirthdate}
                            onChange={(e) => onBirthdateChange(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:border-neon-purple/50 outline-none transition-all"
                            required={isMandatory}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-slate-500 font-medium">
                        Hora de nascimento (opcional)
                    </label>
                    <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="time"
                            value={subjectBirthtime}
                            onChange={(e) => onBirthtimeChange?.(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:border-neon-purple/50 outline-none transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
import { Clock } from 'lucide-react'
