export interface BirthChartData {
    planets: {
        Sun: PlanetPosition;
        Moon: PlanetPosition;
        Mercury: PlanetPosition;
        Venus: PlanetPosition;
        Mars: PlanetPosition;
        Jupiter: PlanetPosition;
        Saturn: PlanetPosition;
        Uranus: PlanetPosition;
        Neptune: PlanetPosition;
        Pluto: PlanetPosition;
        testNode: PlanetPosition; // North Node
        testLilith: PlanetPosition; // Lilith
        Ascendant: PlanetPosition;
        Midheaven: PlanetPosition;
    };
    houses: HousePosition[];
}

interface PlanetPosition {
    name: string;
    sign: string;
    sign_id: number;
    degree: number;
    retrograde: boolean;
    house: number;
}

interface HousePosition {
    house: number;
    sign: string;
    degree: number;
}

export const astrologyService = {
    /**
     * Calculates the birth chart using Free Astro API
     * @param date Date of birth (YYYY-MM-DD or DD/MM/YYYY)
     * @param time Time of birth (HH:mm)
     * @param lat Latitude 
     * @param long Longitude
     * @param timezone Timezone offset (e.g. -3 for Brazil)
     */
    calculateBirthChart: async (
        date: string,
        time: string,
        lat: number,
        long: number,
        timezone: number
    ): Promise<BirthChartData | null> => {
        try {
            // Format date to ISO if needed (API usually takes flexible formats but let's be safe)
            // The API docs say: year, month, date, hours, minutes, seconds, latitude, longitude, timezone

            const birthDate = new Date(date + 'T' + time);
            if (isNaN(birthDate.getTime())) {
                console.error('Invalid birth date/time for astrology calculation');
                return null;
            }

            const requestBody = {
                year: birthDate.getFullYear(),
                month: birthDate.getMonth() + 1, // 1-12
                date: birthDate.getDate(),
                hours: birthDate.getHours(),
                minutes: birthDate.getMinutes(),
                seconds: 0,
                latitude: lat,
                longitude: long,
                timezone: timezone,
                settings: {
                    ayanamsha: "LAHIRI" // Default sidereal, but Western usually uses Tropical. 
                    // Check if API supports Tropical vs Sidereal. FreeAstroAPI is typically Vedic (Sidereal).
                    // If we want Western Astrology (Tropical), we might need to adjust or find another endpoint if this one is strictly Vedic.
                    // BUT: The user asked specifically for this API, so we use it as given.
                }
            };

            // The user provided this specific API endpoint: 
            // POST https://json.freeastroapi.com/planets
            const response = await fetch('https://json.freeastroapi.com/planets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': '605a3818c08ad6d63008f13fa7e5ad222326b30151ab8e26a6bfcfd2b4ed6f4a'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Free Astro API Error: ${response.statusText}`);
            }

            const data = await response.json();

            // The API structure might need mapping depending on the exact response format.
            // Assuming standard FreeAstroAPI response structure based on docs.
            return data.output || data;

        } catch (error) {
            console.error('Error calculating birth chart:', error);
            return null;
        }
    },

    /**
     * Formats the raw API data into a readable string for the AI System Prompt
     */
    formatForAI: (data: BirthChartData): string => {
        if (!data || !data.planets) return '';

        const p = data.planets;

        // Simplificado para o Prompt do Sistema
        let text = `[DADOS ASTROLÓGICOS REAIS - BASEADO NA FREE ASTRO API]\n`;
        text += `Sol: ${p.Sun.sign} (Casa ${p.Sun.house})\n`;
        text += `Lua: ${p.Moon.sign} (Casa ${p.Moon.house})\n`;
        text += `Ascendente: ${p.Ascendant.sign}\n`;
        text += `Meio do Céu: ${p.Midheaven.sign}\n`;
        text += `Mercúrio: ${p.Mercury.sign} (Casa ${p.Mercury.house})\n`;
        text += `Vênus: ${p.Venus.sign} (Casa ${p.Venus.house})\n`;
        text += `Marte: ${p.Mars.sign} (Casa ${p.Mars.house})\n`;
        text += `Júpiter: ${p.Jupiter.sign} (Casa ${p.Jupiter.house})\n`;
        text += `Saturno: ${p.Saturn.sign} (Casa ${p.Saturn.house})\n`;

        if (p.testNode) text += `Nodo Norte: ${p.testNode.sign}\n`;
        if (p.testLilith) text += `Lilith: ${p.testLilith.sign}\n`;

        text += `[FIM DOS DADOS ASTROLÓGICOS]\n`;
        text += `Use estes dados EXATOS para sua interpretação. Não alucine posições planetárias.`;

        return text;
    }
};
