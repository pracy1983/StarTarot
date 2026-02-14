// Evolution API WhatsApp Integration Service

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || process.env.NEXT_PUBLIC_EVOLUTION_API_URL || 'https://pracy-evolution-api.vrdrcy.easypanel.host'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || process.env.NEXT_PUBLIC_EVOLUTION_API_KEY || '5DDE367613D4-4254-99E6-E393189459E5'
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || process.env.NEXT_PUBLIC_EVOLUTION_INSTANCE || 'PracyAT'

interface SendMessageParams {
    phone: string
    message: string
}

export class EvolutionWhatsAppService {
    private baseUrl: string
    private apiKey: string
    private instance: string

    constructor() {
        this.baseUrl = EVOLUTION_API_URL
        this.apiKey = EVOLUTION_API_KEY
        this.instance = EVOLUTION_INSTANCE
    }

    /**
     * Envia mensagem de texto via WhatsApp
     */
    async sendTextMessage({ phone, message }: SendMessageParams): Promise<boolean> {
        try {
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
                return false
            }

            const data = await response.json()
            console.log('WhatsApp message sent successfully:', data)
            return true
        } catch (error) {
            console.error('Error sending WhatsApp message:', error)
            return false
        }
    }

    /**
     * Envia notificação de consulta respondida
     */
    async sendConsultationAnsweredNotification(phone: string, clientName: string, oracleName: string): Promise<boolean> {
        const message = `✨ *Sua consulta foi respondida!*

Olá ${clientName}! 👋

O oraculista *${oracleName}* respondeu suas perguntas.

🔮 Acesse agora para ver as respostas:
https://startarot.netlify.app/app/mensagens

⭐`

        return this.sendTextMessage({ phone, message })
    }

    /**
     * Formata número de telefone para padrão internacional
     * Aceita: (11) 98765-4321, 11987654321, +5511987654321
     * Retorna: 5511987654321
     */
    private formatPhone(phone: string): string {
        // Remove todos os caracteres não numéricos
        let cleaned = phone.replace(/\D/g, '')

        // Se não começar com 55 (código do Brasil), adiciona
        if (!cleaned.startsWith('55')) {
            cleaned = '55' + cleaned
        }

        return cleaned
    }

    /**
     * Verifica se a instância está conectada
     */
    async checkConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/instance/connectionState/${this.instance}`, {
                headers: {
                    'apikey': this.apiKey
                }
            })

            if (!response.ok) return false

            const data = await response.json()
            return data.state === 'open'
        } catch (error) {
            console.error('Error checking Evolution API connection:', error)
            return false
        }
    }
}

// Singleton instance
export const whatsappService = new EvolutionWhatsAppService()
