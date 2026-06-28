import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { email, password, fullName, phone, role = 'client' } = await req.json()

        if (!email || !password || !fullName || !phone) {
            return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('MISSING ENV VARS in register')
            return NextResponse.json({
                error: 'Erro de configuração no servidor. Contate o administrador.'
            }, { status: 500 })
        }

        const normalizedEmail = email.trim().toLowerCase()
        const safeRole = role === 'owner' ? 'client' : role
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName.trim(),
                phone,
                role: safeRole
            }
        })

        if (createError) {
            const message = createError.message || ''
            const alreadyExists = message.toLowerCase().includes('already') || message.toLowerCase().includes('registered')
            return NextResponse.json({
                error: alreadyExists ? 'User already registered' : message
            }, { status: alreadyExists ? 409 : 400 })
        }

        const userId = created.user?.id
        if (!userId) {
            return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 500 })
        }

        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('ensure_user_profile', {
            p_user_id: userId,
            p_email: normalizedEmail,
            p_full_name: fullName.trim(),
            p_role: safeRole
        })

        const isSuccessful = Array.isArray(rpcData)
            ? rpcData[0]?.success
            : rpcData?.success

        if (rpcError || !isSuccessful) {
            console.error('Failed to create profile after admin register:', rpcError || rpcData)
            return NextResponse.json({ error: 'Erro ao criar perfil de usuário. Tente novamente.' }, { status: 500 })
        }

        await supabaseAdmin
            .from('profiles')
            .update({ phone })
            .eq('id', userId)

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Error in register route:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
