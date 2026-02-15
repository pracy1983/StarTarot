const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

export const asaasService = {
    async createCustomer(name: string, cpfCnpj: string, email: string) {
        try {
            const response = await fetch(`${ASAAS_API_URL}/customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'access_token': ASAAS_API_KEY!
                },
                body: JSON.stringify({
                    name,
                    cpfCnpj,
                    email
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.errors?.[0]?.description || 'Erro ao criar cliente no Asaas');
            return data;
        } catch (error: any) {
            console.error('Asaas createCustomer error:', error);
            throw error;
        }
    },

    async createPayment(customerId: string, value: number, description: string, externalReference: string, billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' = 'PIX') {
        try {
            const response = await fetch(`${ASAAS_API_URL}/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'access_token': ASAAS_API_KEY!
                },
                body: JSON.stringify({
                    customer: customerId,
                    billingType,
                    value,
                    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0], // 24h expiration
                    description,
                    externalReference
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.errors?.[0]?.description || 'Erro ao criar pagamento no Asaas');
            return data;
        } catch (error: any) {
            console.error('Asaas createPayment error:', error);
            throw error;
        }
    },

    async getPixQrCode(paymentId: string) {
        try {
            const response = await fetch(`${ASAAS_API_URL}/payments/${paymentId}/pixQrCode`, {
                method: 'GET',
                headers: {
                    'access_token': ASAAS_API_KEY!
                }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.errors?.[0]?.description || 'Erro ao buscar QR Code PIX');
            return data;
        } catch (error: any) {
            console.error('Asaas getPixQrCode error:', error);
            throw error;
        }
    }
};
