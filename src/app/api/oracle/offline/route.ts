import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { userId } = await req.json()
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

        // AUTORIZAÇÃO: só o próprio usuário (ou um owner) pode marcar-se offline.
        // Evita que terceiros forcem qualquer oráculo para offline (IDOR).
        const supabaseAuth = createRouteHandlerClient({ cookies })
        const { data: { session } } = await supabaseAuth.auth.getSession()
        if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        if (session.user.id !== userId) {
            const { data: caller } = await supabaseAuth
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .maybeSingle()
            if (caller?.role !== 'owner') {
                return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
            }
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({
                is_online: false
            })
            .eq('id', userId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Error in offline route:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
