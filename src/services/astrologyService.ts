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
        birthPlace?: string  // Nome da cidade (opcional, mais preciso)
    ): Promise<BirthChartData | null> => {
        try {
            const birthDate = new Date(date + 'T' + time)
            if (isNaN(birthDate.getTime())) {
                console.error('[Astrology] Invalid birth date/time:', date, time)
                return null
            }

            const apiKey = process.env.NEXT_PUBLIC_FREE_ASTRO_API_KEY || ''
            if (!apiKey) {
                console.error('[Astrology] FREE_ASTRO_API_KEY not set')
                return null
            }

            // Nova API espera: year, month, day, hour, minute, city (ou lat/lng)
            const requestBody: any = {
                year: birthDate.getFullYear(),
                month: birthDate.getMonth() + 1,
                day: birthDate.getDate(),
                hour: birthDate.getHours(),
                minute: birthDate.getMinutes(),
                // Usa cidade se disponível, senão usa coordenadas
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
                body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error(`[Astrology] API Error ${response.status}:`, errorText)
                return null
            }

            const data = await response.json()
            console.log('[Astrology] API Response received, planets count:', data.planets?.length || 0)

            return data
        } catch (error) {
            console.error('[Astrology] Error calculating birth chart:', error)
            return null
        }
    },

    /**
     * Formata os dados da API nova (planets como array) para o prompt da IA
     */
    formatForAI: (data: BirthChartData): string => {
        if (!data || !data.planets || !Array.isArray(data.planets)) return ''

        const find = (id: string) => data.planets.find(p => p.id === id || p.name?.toLowerCase() === id.toLowerCase())

        const sun = find('sun')
        const moon = find('moon')
        const mercury = find('mercury')
        const venus = find('venus')
        const mars = find('mars')
        const jupiter = find('jupiter')
        const saturn = find('saturn')
        const uranus = find('uranus')
        const neptune = find('neptune')
        const pluto = find('pluto')
        const chiron = find('chiron')

        const asc = data.angles_details?.asc
        const mc = data.angles_details?.mc

        const signMap: Record<string, string> = {
            'ari': 'Áries', 'tau': 'Touro', 'gem': 'Gêmeos', 'can': 'Câncer',
            'leo': 'Leão', 'vir': 'Virgem', 'lib': 'Libra', 'sco': 'Escorpião',
            'sag': 'Sagitário', 'cap': 'Capricórnio', 'aqu': 'Aquário', 'pis': 'Peixes'
        }
        const sign = (s?: string) => s ? (signMap[s.toLowerCase().substring(0, 3)] || s) : 'N/D'
        const fmt = (p?: PlanetItem | null) => p ? `${sign(p.sign)} (Casa ${p.house}${p.retrograde ? ', Retrógrado' : ''})` : 'N/D'

        let text = `[MAPA NATAL - DADOS ASTROLÓGICOS REAIS]\n`
        if (sun) text += `Sol: ${fmt(sun)}\n`
        if (moon) text += `Lua: ${fmt(moon)}\n`
        if (asc) text += `Ascendente: ${sign(asc.sign)} (Casa ${asc.house})\n`
        if (mc) text += `Meio do Céu: ${sign(mc.sign)} (Casa ${mc.house})\n`
        if (mercury) text += `Mercúrio: ${fmt(mercury)}\n`
        if (venus) text += `Vênus: ${fmt(venus)}\n`
        if (mars) text += `Marte: ${fmt(mars)}\n`
        if (jupiter) text += `Júpiter: ${fmt(jupiter)}\n`
        if (saturn) text += `Saturno: ${fmt(saturn)}\n`
        if (uranus) text += `Urano: ${fmt(uranus)}\n`
        if (neptune) text += `Netuno: ${fmt(neptune)}\n`
        if (pluto) text += `Plutão: ${fmt(pluto)}\n`
        if (chiron) text += `Quíron: ${fmt(chiron)}\n`

        text += `[FIM DO MAPA NATAL]\n`
        text += `Use estes dados EXATOS para sua interpretação. Não invente posições planetárias.`

        return text
    }
}
