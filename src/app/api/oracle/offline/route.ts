import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { userId } = await req.json()
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({
                is_online: false,
                allows_video: false,
                allows_text: false
            })
            .eq('id', userId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Error in offline route:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
