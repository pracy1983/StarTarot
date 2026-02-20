import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies })

    try {
        // 1. Verificar autenticação e role do chamador
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: callerProfile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (callerProfile?.role !== 'owner') {
            return NextResponse.json({ error: 'Acesso negado: apenas owners podem deletar usuários' }, { status: 403 })
        }

        // 2. Extrair userId do body
        const { userId } = await req.json()
        if (!userId) {
            return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
        }

        // 3. Não permitir auto-deleção
        if (userId === session.user.id) {
            return NextResponse.json({ error: 'Não é possível deletar a própria conta' }, { status: 400 })
        }

        // 4. Deletar do Auth (cascata apaga profiles e demais tabelas com FK)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (error) {
            console.error('Error deleting user from auth:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Usuário deletado com sucesso' })
    } catch (error: any) {
        console.error('Delete user error:', error)
        return NextResponse.json({ error: error.message || 'Erro ao deletar usuário' }, { status: 500 })
    }
}
