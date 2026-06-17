import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
    const supabase = createRouteHandlerClient({ cookies })

    try {
        // 1. Verificar autenticação e role do chamador
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Usar a mesma sessão e conexão que já autorizaram o acesso ao painel.
        // A conexão administrativa fica restrita à operação de exclusão.
        const { data: callerProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.error('Error checking delete-user caller profile:', profileError)
            return NextResponse.json({ error: 'Não foi possível validar o acesso administrativo' }, { status: 500 })
        }

        if (callerProfile?.role !== 'owner') {
            return NextResponse.json({ error: 'Acesso negado: apenas owners podem deletar usuários' }, { status: 403 })
        }

        // 2. Extrair userId do body
        const { userId } = await req.json()
        if (!userId) {
            return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
        }

        // 3. Não permitir auto-deleção
        if (userId === user.id) {
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
