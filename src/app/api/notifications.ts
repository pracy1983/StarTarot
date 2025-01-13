import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { data: mensagens, error } = await supabase
        .from('mensagens')
        .select('*')
        .eq('lida', false)
        .order('data', { ascending: false });

      if (error) {
        return res.status(500).json({ error: 'Erro ao buscar notificações' });
      }

      res.status(200).json(mensagens);
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
