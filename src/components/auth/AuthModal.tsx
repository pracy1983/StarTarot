'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { GlowInput } from '@/components/ui/GlowInput'
import { Mail, Lock, User, ArrowLeft, Phone, ShieldCheck } from 'lucide-react'
import { whatsappService } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const countryCodes = [
    { code: '+55', country: 'Brasil', flag: '🇧🇷' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { code: '+1', country: 'EUA/Canadá', flag: '🇺🇸' },
    { code: '+34', country: 'Espanha', flag: '🇪🇸' },
    { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+598', country: 'Uruguai', flag: '🇺🇾' }
]

const TEST_PHONE = '11986224808'

export const AuthModal = () => {
    const router = useRouter()
    const { login, signUp, showAuthModal, setShowAuthModal, authMode, setAuthMode, registrationRole, setRegistrationRole } = useAuthStore()

    const isRegistering = authMode === 'register'
    const setIsRegistering = (val: boolean) => setAuthMode(val ? 'register' : 'login')
    const [showOtpScreen, setShowOtpScreen] = useState(false)

    // Form States
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [whatsapp, setWhatsapp] = useState('')
    const [countryPrefix, setCountryPrefix] = useState('+55')
    const [error, setError] = useState('')
    const [formLoading, setFormLoading] = useState(false)
    const [otpCode, setOtpCode] = useState('')
    const [generatedOtp, setGeneratedOtp] = useState('')
    const [existingUser, setExistingUser] = useState<any>(null)
    const [upgradeMode, setUpgradeMode] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)

    React.useEffect(() => {
        const savedEmail = localStorage.getItem('remembered_email')
        const savedRemember = localStorage.getItem('remember_me') === 'true'
        setRememberMe(savedRemember)
        if (savedEmail && savedRemember) {
            setEmail(savedEmail)
        }
    }, [])

    React.useEffect(() => {
        localStorage.setItem('remember_me', rememberMe.toString())
        if (!rememberMe) {
            localStorage.removeItem('remembered_email')
        }
    }, [rememberMe])

    const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString()

    const handleStartRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setUpgradeMode(false)
        setExistingUser(null)
        setFormLoading(true)

        try {
            const fullPhone = countryPrefix + whatsapp.replace(/\D/g, '')
            const isTestNumber = whatsapp.replace(/\D/g, '') === TEST_PHONE

            if (!isTestNumber) {
                const { data: foundUser } = await supabase
                    .from('profiles')
                    .select('id, email, phone, role, is_oracle')
                    .or(`email.eq.${email.trim().toLowerCase()},phone.eq.${fullPhone}`)
                    .maybeSingle()

                if (foundUser) {
                    setExistingUser(foundUser)
                    setUpgradeMode(true)
                    // Não retornamos erro, deixamos prosseguir para verificar o WhatsApp
                    // O login será tentado no final ao invés do cadastro
                }
            }

            const code = generateOtp()
            setGeneratedOtp(code)

            const success = await whatsappService.sendTextMessage({
                phone: fullPhone,
                message: `✨ *Star Tarot* \n\nSeu código de verificação é: *${code}*\n\nNão compartilhe este código com ninguém.`
            })

            if (success) {
                setShowOtpScreen(true)
                toast.success(`Código enviado para o WhatsApp ${fullPhone}`)
            } else {
                setError('Erro ao enviar código para o WhatsApp. Verifique o número.')
                // Em caso de erro no envio, podemos resetar o upgradeMode se necessário, 
                // mas aqui paramos o fluxo de qualquer forma.
            }
        } catch (err) {
            console.error(err)
            setError('Ocorreu um erro inesperado')
        } finally {
            setFormLoading(false)
        }
    }

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setFormLoading(true)

        const isTestNumber = whatsapp.replace(/\D/g, '') === TEST_PHONE
        if (!isTestNumber && otpCode !== generatedOtp) {
            setError('Código inválido. Verifique o WhatsApp.')
            setFormLoading(false)
            return
        }

        try {
            const fullPhone = countryPrefix + whatsapp.replace(/\D/g, '')

            // Se já sabemos que é usuário existente, tentamos login direto
            if (upgradeMode || existingUser) {
                await performLogin(email, password, fullPhone)
                return
            }

            // Tenta cadastro
            const result = await signUp(email, password, fullName, fullPhone, registrationRole)
            if (!result.success) {
                // Se falhar por usuário já existente, tenta login
                if (result.error?.includes('already registered') || result.error?.includes('já está cadastrado')) {
                    await performLogin(email, password, fullPhone)
                } else {
                    setError(result.error || 'Erro ao criar conta')
                    setFormLoading(false)
                }
            } else {
                const loginResult = await login(email, password)
                if (loginResult.success) {
                    toast.success('Bem-vindo ao Templo!')
                    setShowAuthModal(false)
                    router.push('/app')
                } else {
                    setError('Conta criada! Por favor, faça login.')
                    setIsRegistering(false)
                    setShowOtpScreen(false)
                    setFormLoading(false)
                }
            }
        } catch (err) {
            setError('Erro na finalização do cadastro')
            setFormLoading(false)
        }
    }

    const performLogin = async (email: string, pass: string, phone: string) => {
        const loginResult = await login(email, pass)
        if (loginResult.success) {
            // Atualiza role e telefone se necessário
            const updates: any = { phone: phone } // Confirmamos o telefone via OTP

            if (registrationRole === 'oracle') {
                updates.is_oracle = true
                updates.role = 'oracle' // Força role oracle se solicitado
            }

            await supabase
                .from('profiles')
                .update(updates)
                .eq('email', email.trim().toLowerCase())

            if (rememberMe) {
                localStorage.setItem('remembered_email', email)
            } else {
                localStorage.removeItem('remembered_email')
            }

            toast.success('Acesso recuperado e atualizado!')
            setShowAuthModal(false)
            router.push('/app')
        } else {
            setError('Conta já existente, mas a senha informada está incorreta.')
            setFormLoading(false)
        }
    }

    const handleSubmitLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setFormLoading(true)

        try {
            const result = await login(email, password)
            if (!result.success) {
                setError(result.error || 'Erro ao fazer login')
            } else {
                // If we were in upgrade mode, activate the other role
                if (upgradeMode || registrationRole === 'oracle') {
                    await supabase
                        .from('profiles')
                        .update({ is_oracle: true })
                        .eq('email', email.trim().toLowerCase())
                }
                if (rememberMe) {
                    localStorage.setItem('remembered_email', email)
                } else {
                    localStorage.removeItem('remembered_email')
                }

                setShowAuthModal(false)
                router.push('/app')
            }
        } catch (err) {
            setError('Erro ao entrar no portal')
        } finally {
            setFormLoading(false)
        }
    }

    const handleUpgradeSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await handleSubmitLogin(e)
    }

    if (!showAuthModal) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={() => !formLoading && setShowAuthModal(false)}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-md relative z-10"
            >
                <GlassCard glowColor={registrationRole === 'oracle' ? 'gold' : 'purple'} className="p-8">
                    {showOtpScreen ? (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="text-center space-y-2 mb-4">
                                <h2 className="text-2xl font-bold text-white">Verificação Especial</h2>
                                <p className="text-sm text-slate-300">Enviamos um código para o seu WhatsApp.</p>
                                <p className="text-xs text-neon-cyan font-mono font-bold">{countryPrefix} {whatsapp}</p>
                            </div>

                            <GlowInput
                                label="Código de 6 dígitos"
                                type="text"
                                maxLength={6}
                                placeholder="000000"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                icon={<ShieldCheck size={18} />}
                                required
                                className="text-center tracking-[0.5em] text-2xl font-bold"
                            />

                            {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center">{error}</div>}

                            <NeonButton type="submit" variant="purple" fullWidth loading={formLoading} size="lg">
                                Confirmar e Entrar
                            </NeonButton>

                            <button type="button" onClick={() => setShowOtpScreen(false)} className="w-full text-xs text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-1">
                                <ArrowLeft size={12} /> Digitei o número errado
                            </button>
                        </form>
                    ) : isRegistering ? (
                        <form onSubmit={handleStartRegister} className="space-y-4">
                            <h2 className="text-2xl font-bold text-center mb-6 text-white">
                                {registrationRole === 'oracle' ? 'Cadastro de Oraculista' : 'Criar Nova Conta'}
                            </h2>
                            <GlowInput
                                label="Nome Completo"
                                type="text"
                                placeholder="Seu nome"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                icon={<User size={18} />}
                                required
                            />
                            <GlowInput
                                label="E-mail"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                icon={<Mail size={18} />}
                                required
                            />
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-400 ml-1">WhatsApp</label>
                                <div className="flex gap-2">
                                    <select
                                        value={countryPrefix}
                                        onChange={(e) => setCountryPrefix(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-white text-sm outline-none focus:border-neon-purple/50 transition-all cursor-pointer"
                                    >
                                        {countryCodes.map(c => (
                                            <option key={c.code} value={c.code} className="bg-deep-space">{c.flag} {c.code}</option>
                                        ))}
                                    </select>
                                    <GlowInput
                                        type="tel"
                                        placeholder="(00) 00000-0000"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        icon={<Phone size={18} />}
                                        required
                                    />
                                </div>
                            </div>
                            <GlowInput
                                label="Senha"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                icon={<Lock size={18} />}
                                required
                            />
                            {upgradeMode && (
                                <div className="p-3 bg-neon-purple/10 border border-neon-purple/20 rounded-xl text-xs text-slate-300 leading-relaxed">
                                    Ao fazer login, sua conta atual será mantida e você ganhará acesso extra como <strong>{registrationRole === 'oracle' ? 'Oraculista' : 'Membro'}</strong>.
                                </div>
                            )}
                            {error && <div className={`text-sm p-3 rounded-lg border text-center ${upgradeMode ? 'text-neon-gold bg-neon-gold/10 border-neon-gold/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>{error}</div>}
                            <NeonButton type="submit" variant={registrationRole === 'oracle' ? 'gold' : 'purple'} fullWidth loading={formLoading} size="lg">
                                {upgradeMode ? 'Fazer Login e Ativar' : 'Gerar Código WhatsApp'}
                            </NeonButton>
                            <button type="button" onClick={() => { setIsRegistering(false); setUpgradeMode(false); setExistingUser(null); setError('') }} className="w-full text-sm text-slate-400 hover:text-white flex items-center justify-center pt-2">
                                <ArrowLeft size={14} className="mr-2" /> {upgradeMode ? 'Usar outro e-mail' : 'Já tenho uma conta'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmitLogin} className="space-y-6">
                            <h2 className="text-2xl font-bold text-center mb-6 text-white">Acesse o Portal</h2>
                            <GlowInput
                                label="E-mail"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                icon={<Mail size={18} />}
                                required
                            />
                            <GlowInput
                                label="Senha"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                icon={<Lock size={18} />}
                                required
                            />

                            <div className="flex items-center space-x-2 px-1">
                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-neon-purple focus:ring-neon-purple transition-all cursor-pointer"
                                />
                                <label htmlFor="rememberMe" className="text-sm text-slate-400 cursor-pointer select-none">
                                    Lembrar de mim
                                </label>
                            </div>

                            {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-center">{error}</div>}
                            <NeonButton type="submit" variant="purple" fullWidth loading={formLoading} size="lg">
                                Entrar no Portal
                            </NeonButton>
                            <div className="pt-4 flex flex-col space-y-4 text-center">
                                <p className="text-sm text-slate-500">
                                    Deseja ser atendido E atender? <button type="button" onClick={() => { setIsRegistering(true); setRegistrationRole('oracle'); }} className="text-neon-gold hover:underline">Entre como Oraculista</button>
                                </p>
                                <p className="text-sm text-slate-500">
                                    Novo no templo? <button type="button" onClick={() => { setIsRegistering(true); setRegistrationRole('client'); }} className="text-neon-gold hover:underline">Iniciar jornada</button>
                                </p>
                            </div>
                        </form>
                    )}
                </GlassCard>
            </motion.div>
        </div>
    )
}
