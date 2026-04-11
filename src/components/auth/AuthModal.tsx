'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { NeonButton } from '@/components/ui/NeonButton'
import { GlowInput } from '@/components/ui/GlowInput'
import { Mail, Lock, User, ArrowLeft, Phone, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { validatePassword, isPasswordStrong } from '@/utils/passwordUtils'
import { PasswordStrength } from './PasswordStrength'

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
    const {
        login,
        signUp,
        showAuthModal,
        setShowAuthModal,
        authMode,
        setAuthMode,
        registrationRole,
        setRegistrationRole,
        updatePassword,
        requestPasswordReset,
        verifyResetOtp,
        completePasswordReset,
        profile
    } = useAuthStore()

    const isRegistering = authMode === 'register'
    const setIsRegistering = (val: boolean) => setAuthMode(val ? 'register' : 'login')
    const [showOtpScreen, setShowOtpScreen] = useState(false)
    const [localAuthMode, setLocalAuthMode] = useState<'auth' | 'forgot' | 'reset-otp' | 'new-password' | 'force-change'>(
        profile?.force_password_change ? 'force-change' : 'auth'
    )

    // Form States
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
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
    const [resetEmail, setResetEmail] = useState('')
    const [resetWhatsapp, setResetWhatsapp] = useState('')
    const [resetUserId, setResetUserId] = useState<string | null>(null)

    const passwordReqs = validatePassword(isRegistering ? password : newPassword)
    const isStrong = isPasswordStrong(passwordReqs)

    React.useEffect(() => {
        if (profile?.force_password_change) {
            setLocalAuthMode('force-change')
        }
    }, [profile])

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
            const requirements = validatePassword(password)
            if (!isPasswordStrong(requirements)) {
                setError('A senha deve ser forte para prosseguir.')
                setFormLoading(false)
                return
            }

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

            const response = await fetch('/api/auth/send-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: fullPhone, code })
            })

            const data = await response.json()
            if (response.ok) {
                setShowOtpScreen(true)
                toast.success(`Código enviado para o WhatsApp ${fullPhone}`)
            } else {
                setError(data.error || 'Erro ao enviar código para o WhatsApp. Verifique o número.')
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

            // ESTRATÉGIA: SignUp primeiro, fallback para Login se já existir.
            // NÃO podemos fazer login-first porque o Supabase retorna o mesmo erro
            // "Invalid login credentials" tanto para "não existe" quanto para "senha errada".
            const result = await signUp(email, password, fullName, fullPhone, registrationRole)

            if (result.success) {
                // Cadastro criado com sucesso, faz login automático
                const loginResult = await login(email, password)
                if (loginResult.success) {
                    toast.success('Bem-vindo ao Templo! 🔮')
                    setShowAuthModal(false)
                    router.push('/app')
                } else {
                    // Cadastro OK mas login falhou (raro)
                    setError('Conta criada! Por favor, faça login manualmente.')
                    setIsRegistering(false)
                    setShowOtpScreen(false)
                    setFormLoading(false)
                }
                return
            }

            // SignUp falhou — verificar se é porque já existe
            const alreadyExists = result.error?.toLowerCase().includes('already registered') ||
                result.error?.toLowerCase().includes('already been registered') ||
                result.error?.toLowerCase().includes('já está cadastrado') ||
                result.error?.toLowerCase().includes('user already registered')

            if (alreadyExists) {
                // Usuário existe no Auth — tentar login com a senha fornecida
                await performLogin(email, password, fullPhone)
            } else {
                // Outro erro qualquer
                setError(result.error || 'Erro ao criar conta. Tente novamente.')
                setFormLoading(false)
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
            setError(loginResult.error || 'Erro ao entrar na conta.')
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
                setFormLoading(false)
            } else {
                // Login bem sucedido - checkAuth foi chamado no login do store
                // O useEffect acima cuidará de mudar o modo se for force-change
                if (rememberMe) {
                    localStorage.setItem('remembered_email', email)
                } else {
                    localStorage.removeItem('remembered_email')
                }

                if (!useAuthStore.getState().profile?.force_password_change) {
                    setShowAuthModal(false)
                    router.push('/app')
                }
            }
        } catch (err) {
            setError('Erro ao entrar no portal')
            setFormLoading(false)
        }
    }

    const handleForceChange = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isStrong) return setError('Senha muito fraca.')
        if (newPassword !== confirmPassword) return setError('Senhas não conferem.')

        setFormLoading(true)
        const result = await updatePassword(newPassword)
        if (result.success) {
            toast.success('Senha atualizada com sucesso!')
            setShowAuthModal(false)
            router.push('/app')
        } else {
            setError(result.error || 'Erro ao atualizar senha.')
        }
        setFormLoading(false)
    }

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormLoading(true)

        // Formata telefone
        const fullPhone = countryPrefix + resetWhatsapp.replace(/\D/g, '')

        const result = await requestPasswordReset(resetEmail, fullPhone)
        if (result.success) {
            toast.success('Código enviado via WhatsApp!')
            setLocalAuthMode('reset-otp')
        } else {
            setError(result.error || 'Erro ao enviar código.')
        }
        setFormLoading(false)
    }

    const handleVerifyResetOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormLoading(true)
        const fullPhone = countryPrefix + resetWhatsapp.replace(/\D/g, '')
        const result = await verifyResetOtp(fullPhone, otpCode)
        if (result.success) {
            setResetUserId(result.userId!)
            setLocalAuthMode('new-password')
        } else {
            setError(result.error || 'Código inválido.')
        }
        setFormLoading(false)
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isStrong) return setError('Senha muito fraca.')
        if (newPassword !== confirmPassword) return setError('Senhas não conferem.')
        if (!otpCode) return setError('Código de verificação ausente.')

        setFormLoading(true)
        const fullPhone = countryPrefix + resetWhatsapp.replace(/\D/g, '')
        
        const result = await completePasswordReset(fullPhone, otpCode, newPassword)

        if (result.success) {
            toast.success('Senha redefinida com sucesso!')
            setLocalAuthMode('auth')
            setIsRegistering(false)
            // Limpa estados de reset
            setOtpCode('')
            setResetEmail('')
            setResetWhatsapp('')
        } else {
            setError(result.error || 'Erro ao redefinir senha.')
        }
        setFormLoading(false)
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
                    {localAuthMode === 'force-change' ? (
                        <form onSubmit={handleForceChange} className="space-y-6">
                            <div className="text-center space-y-2 mb-4">
                                <h2 className="text-2xl font-bold text-white">Segurança Star Tarot</h2>
                                <p className="text-sm text-slate-300">Como parte da nossa atualização de segurança, você precisa definir uma senha forte.</p>
                            </div>

                            <GlowInput
                                label="Nova Senha"
                                type="password"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                icon={<Lock size={18} />}
                                required
                            />

                            <PasswordStrength requirements={passwordReqs} password={newPassword} />

                            <GlowInput
                                label="Confirmar Nova Senha"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                icon={<ShieldCheck size={18} />}
                                required
                            />

                            {error && (
                                <div className="text-red-400 text-[10px] sm:text-sm bg-red-400/10 p-2 sm:p-3 rounded-lg border border-red-400/20 text-center break-words overflow-hidden max-h-32 overflow-y-auto">
                                    {error}
                                </div>
                            )}

                            <NeonButton type="submit" variant="purple" fullWidth loading={formLoading} size="lg" disabled={!isStrong}>
                                Atualizar e Entrar
                            </NeonButton>
                        </form>
                    ) : localAuthMode === 'forgot' ? (
                        <form onSubmit={handleRequestReset} className="space-y-6">
                            <div className="text-center space-y-2 mb-4">
                                <h2 className="text-2xl font-bold text-white">Esqueci a Senha</h2>
                                <p className="text-sm text-slate-300">Por segurança, confirme seus dados para receber o código no WhatsApp.</p>
                            </div>

                            <GlowInput
                                label="E-mail Cadastrado"
                                type="email"
                                placeholder="seu@email.com"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                icon={<Mail size={18} />}
                                required
                            />

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-400 ml-1">WhatsApp Cadastrado</label>
                                <div className="flex gap-2">
                                    <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm flex items-center justify-center">
                                        🇧🇷 +55
                                    </div>
                                    <GlowInput
                                        type="tel"
                                        placeholder="(00) 00000-0000"
                                        value={resetWhatsapp}
                                        onChange={(e) => setResetWhatsapp(e.target.value)}
                                        icon={<Phone size={18} />}
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-400 text-[10px] sm:text-sm bg-red-400/10 p-2 sm:p-3 rounded-lg border border-red-400/20 text-center break-words overflow-hidden max-h-32 overflow-y-auto">
                                    {error}
                                </div>
                            )}

                            <NeonButton type="submit" variant="purple" fullWidth loading={formLoading} size="lg">
                                Validar e Enviar Código
                            </NeonButton>

                            <button type="button" onClick={() => setLocalAuthMode('auth')} className="w-full text-xs text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-1">
                                <ArrowLeft size={12} /> Voltar para o Login
                            </button>
                        </form>
                    ) : localAuthMode === 'reset-otp' ? (
                        <form onSubmit={handleVerifyResetOtp} className="space-y-6">
                            <div className="text-center space-y-2 mb-4">
                                <h2 className="text-2xl font-bold text-white">Verificação Especial</h2>
                                <p className="text-sm text-slate-300">Digite o código enviado para o seu WhatsApp.</p>
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

                            {error && (
                                <div className="text-red-400 text-[10px] sm:text-sm bg-red-400/10 p-2 sm:p-3 rounded-lg border border-red-400/20 text-center break-words overflow-hidden max-h-32 overflow-y-auto">
                                    {error}
                                </div>
                            )}

                            <NeonButton type="submit" variant="purple" fullWidth loading={formLoading} size="lg">
                                Validar Código
                            </NeonButton>

                            <button type="button" onClick={() => setLocalAuthMode('forgot')} className="w-full text-xs text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-1">
                                <ArrowLeft size={12} /> Digitei errado
                            </button>
                        </form>
                    ) : localAuthMode === 'new-password' ? (
                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div className="text-center space-y-2 mb-4">
                                <h2 className="text-2xl font-bold text-white">Nova Senha Forte</h2>
                                <p className="text-sm text-slate-300">Agora escolha sua nova senha segura.</p>
                            </div>

                            <GlowInput
                                label="Nova Senha"
                                type="password"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                icon={<Lock size={18} />}
                                required
                            />

                            <PasswordStrength requirements={passwordReqs} password={newPassword} />

                            <GlowInput
                                label="Confirmar Nova Senha"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                icon={<ShieldCheck size={18} />}
                                required
                            />

                            {error && (
                                <div className="text-red-400 text-[10px] sm:text-sm bg-red-400/10 p-2 sm:p-3 rounded-lg border border-red-400/20 text-center break-words overflow-hidden max-h-32 overflow-y-auto">
                                    {error}
                                </div>
                            )}

                            <NeonButton type="submit" variant="purple" fullWidth loading={formLoading} size="lg" disabled={!isStrong}>
                                Redefinir Senha
                            </NeonButton>
                        </form>
                    ) : showOtpScreen ? (
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

                            {error && (
                                <div className="text-red-400 text-[10px] sm:text-sm bg-red-400/10 p-2 sm:p-3 rounded-lg border border-red-400/20 text-center break-words overflow-hidden max-h-32 overflow-y-auto">
                                    {error}
                                </div>
                            )}

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

                            <PasswordStrength requirements={passwordReqs} password={password} />

                            {upgradeMode && (
                                <div className="p-3 bg-neon-purple/10 border border-neon-purple/20 rounded-xl text-xs text-slate-300 leading-relaxed">
                                    Ao fazer login, sua conta atual será mantida e você ganhará acesso extra como <strong>{registrationRole === 'oracle' ? 'Oraculista' : 'Membro'}</strong>.
                                </div>
                            )}

                            {/* Aviso Interno para Oraculistas (Astrologia) */}
                            {registrationRole === 'oracle' && (
                                <div className="p-2 border border-blue-500/20 bg-blue-500/5 rounded-lg text-[10px] text-blue-300/70 text-center uppercase tracking-widest font-mono">
                                    <span className="opacity-50">System:</span> Free Astro API Integration Active
                                </div>
                            )}

                            {error && <div className={`text-sm p-3 rounded-lg border text-center ${upgradeMode ? 'text-neon-gold bg-neon-gold/10 border-neon-gold/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>{error}</div>}
                            <NeonButton type="submit" variant={registrationRole === 'oracle' ? 'gold' : 'purple'} fullWidth loading={formLoading} size="lg" disabled={!isStrong}>
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
                            <div className="space-y-1">
                                <GlowInput
                                    label="Senha"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    icon={<Lock size={18} />}
                                    required
                                />
                                <div className="flex justify-end">
                                    <button type="button" onClick={() => setLocalAuthMode('forgot')} className="text-xs text-neon-gold hover:underline">
                                        Esqueci a senha
                                    </button>
                                </div>
                            </div>

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

                            {error && (
                                <div className="text-red-400 text-[10px] sm:text-sm bg-red-400/10 p-2 sm:p-3 rounded-lg border border-red-400/20 text-center break-words overflow-hidden max-h-32 overflow-y-auto">
                                    {error}
                                </div>
                            )}
                            <NeonButton type="submit" variant="purple" fullWidth loading={formLoading} size="lg">
                                Entrar no Portal
                            </NeonButton>
                            <div className="pt-4 flex flex-col space-y-4 text-center">
                                <p className="text-sm text-slate-500">
                                    Deseja ser atendido E atender? <button type="button" onClick={() => { setIsRegistering(true); setRegistrationRole('oracle'); }} className="text-neon-gold hover:underline">Cadastrar como Oraculista</button>
                                </p>
                                <p className="text-sm text-slate-500">
                                    Novo no templo? <button type="button" onClick={() => { setIsRegistering(true); setRegistrationRole('client'); }} className="text-neon-gold hover:underline">Cadastrar</button>
                                </p>
                            </div>
                        </form>
                    )}
                </GlassCard>
            </motion.div>
        </div>
    )
}
