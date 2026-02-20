export interface BirthChartData {
    // New API response format (FreeAstroAPI v2)
    planets: PlanetItem[]
    houses: HouseItem[]
    angles_details?: {
        asc?: { sign: string; pos: number; house: number }
        mc?: { sign: string; pos: number; house: number }
    }
}

interface PlanetItem {
    id: string
    name: string
    sign: string
    pos: number
    house: number
    retrograde: boolean
}

interface HouseItem {
    house: number
    sign: string
    pos: number
}

export const astrologyService = {
    /**
     * Calcula o mapa natal via FreeAstroAPI v2
     * Endpoint: POST https://astro-api-1qnc.onrender.com/api/v1/natal/calculate
     * Auth: x-api-key header
     */
    calculateBirthChart: async (
        date: string,   // YYYY-MM-DD
        time: string,   // HH:mm
        lat: number,
        long: number,
        timezone: number,
        birthPlace?: string
    ): Promise<BirthChartData | null> => {
        try {
            // Extração direta para evitar conversões automáticas de fuso horário do objeto Date
            const [year, month, day] = date.split('-').map(Number)
            const [hour, minute] = time.split(':').map(Number)

            const apiKey = process.env.NEXT_PUBLIC_FREE_ASTRO_API_KEY || ''
            if (!apiKey) {
                console.error('[Astrology] FREE_ASTRO_API_KEY not set')
                return null
            }

            const requestBody: any = {
                year,
                month,
                day,
                hour,
                minute,
                ...(birthPlace ? { city: birthPlace } : { lat, lng: long })
            }

            console.log('[Astrology] Calling FreeAstroAPI:', JSON.stringify(requestBody))

            const response = await fetch('https://astro-api-1qnc.onrender.com/api/v1/natal/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify(requestBody),
                cache: 'no-store'
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error(`[Astrology] API Error ${response.status}:`, errorText)
                return null
            }

            const data = await response.json()
            return data
        } catch (error) {
            console.error('[Astrology] Error calculating birth chart:', error)
            return null
        }
    },

    /**
     * Formata todos os dados (Planetas + 12 Casas) para o prompt da IA
     */
    formatForAI: (data: BirthChartData): string => {
        if (!data || !data.planets || !Array.isArray(data.planets)) return ''

        const signMap: Record<string, string> = {
            'ari': 'Áries', 'tau': 'Touro', 'gem': 'Gêmeos', 'can': 'Câncer',
            'leo': 'Leão', 'vir': 'Virgem', 'lib': 'Libra', 'sco': 'Escorpião',
            'sag': 'Sagitário', 'cap': 'Capricórnio', 'aqu': 'Aquário', 'pis': 'Peixes'
        }
        const sign = (s?: string) => s ? (signMap[s.toLowerCase().substring(0, 3)] || s) : 'N/D'

        let text = `[MAPA NATAL COMPLETO - DADOS REAIS DA API]\n\n`

        text += `POSIÇÕES PLANETÁRIAS:\n`
        data.planets.forEach(p => {
            text += `- ${p.name}: ${sign(p.sign)} a ${p.pos.toFixed(1)}° (Casa ${p.house}${p.retrograde ? ', Retrógrado' : ''})\n`
        })

        if (data.angles_details) {
            const { asc, mc } = data.angles_details
            text += `\nPONTOS ANGULARES:\n`
            if (asc) text += `- Ascendente: ${sign(asc.sign)} a ${asc.pos.toFixed(1)}°\n`
            if (mc) text += `- Meio do Céu (MC): ${sign(mc.sign)} a ${mc.pos.toFixed(1)}°\n`
        }

        if (data.houses && Array.isArray(data.houses)) {
            text += `\nCÚSPIDES DAS 12 CASAS:\n`
            data.houses.forEach(h => {
                text += `- Casa ${h.house}: ${sign(h.sign)} a ${h.pos.toFixed(1)}°\n`
            })
        }

        text += `\n[FIM DOS DADOS TÉCNICOS]\n`
        text += `INSTRUÇÃO: Use EXCLUSIVAMENTE os dados acima. Se houver divergência entre o que você acha e os dados técnicos acima, os dados acima PREVALECEM. Não diga que o ascendente é X se a API diz que é Y.`

        return text
    }
}

