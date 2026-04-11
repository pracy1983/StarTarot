// Evolution API WhatsApp Integration Service

const EVOLUTION_API_URL = process.env.NEXT_PUBLIC_EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.NEXT_PUBLIC_EVOLUTION_API_KEY || process.env.EVOLUTION_API_KEY
const EVOLUTION_INSTANCE = process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE

interface SendMessageParams {
    phone: string
    message: string
}

export type WhatsAppResult = {
    success: boolean
    error?: string
}

export class EvolutionWhatsAppService {
    private baseUrl: string
    private apiKey: string
    private instance: string

    constructor() {
        this.baseUrl = EVOLUTION_API_URL || ''
        this.apiKey = EVOLUTION_API_KEY || ''
        this.instance = EVOLUTION_INSTANCE || ''
    }

    /**
     * Envia mensagem de texto via WhatsApp
     */
    async sendTextMessage({ phone, message }: SendMessageParams): Promise<WhatsAppResult> {
        try {
            if (!this.baseUrl || !this.apiKey || !this.instance) {
                console.error('WhatsApp Service not configured. Missing environment variables.')
                return { success: false, error: 'Serviço de WhatsApp não configurado.' }
            }

            const formattedPhone = this.formatPhone(phone)

            const response = await fetch(`${this.baseUrl}/message/sendText/${this.instance}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.apiKey
                },
                body: JSON.stringify({
                    number: formattedPhone,
                    text: message
                })
            })

            if (!response.ok) {
                const errorData = await response.text()
                console.error('Evolution API Error:', errorData)
                try {
                    const jsonError = JSON.parse(errorData)
                    return { success: false, error: jsonError.message || errorData }
                } catch {
                    return { success: false, error: errorData }
                }
            }

            const data = await response.json()
            console.log('WhatsApp message sent successfully:', data)
            return { success: true }
        } catch (error: any) {
            console.error('Error sending WhatsApp message:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Envia notificação de consulta respondida
     */
    async sendConsultationAnsweredNotification(phone: string, clientName: string, oracleName: string): Promise<WhatsAppResult> {
        const message = `✨ *Star Tarot* \n\nOlá ${clientName}, sua consulta com o oraculista *${oracleName}* foi respondida! \n\nAcesse o histórico do app para ver sua resposta.`
        return this.sendTextMessage({ phone, message })
    }

    /**
     * Envia notificação de nova consulta para o oráculo
     */
    async sendNewConsultationNotification(phone: string, clientName: string): Promise<WhatsAppResult> {
        const message = `✨ *Star Tarot* \n\nVocê recebeu uma nova consulta de *${clientName}*! \n\nAcesse o painel do oraculista para responder.`
        return this.sendTextMessage({ phone, message })
    }

    /**
     * Envia notificação de que o oráculo está online para os seguidores
     */
    async sendOracleOnlineNotification(phone: string, oracleName: string): Promise<WhatsAppResult> {
        const message = `✨ *Star Tarot* \n\n*${oracleName}* acabou de entrar online! Aproveite para tirar suas dúvidas agora mesmo.`
        return this.sendTextMessage({ phone, message })
    }

    private formatPhone(phone: string): string {
        const clean = phone.replace(/\D/g, '')
        if (clean.length === 11 && clean.startsWith('1')) {
            // Se for número BR sem DDI mas com DDD
            return '55' + clean
        }
        return clean
    }

    async getConnectionState(): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/instance/connectionState/${this.instance}`, {
                headers: { 'apikey': this.apiKey }
            })
            const data = await response.json()
            return data.instance.state || 'DISCONNECTED'
        } catch (error) {
            console.error('Error getting connection state:', error)
            return 'ERROR'
        }
    }
}

export const whatsappService = new EvolutionWhatsAppService()
