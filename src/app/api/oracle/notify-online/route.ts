import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { whatsappService } from '@/lib/whatsapp'

// Helper function for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function POST(req: Request) {
    try {
        const { oracleId } = await req.json()
        if (!oracleId) return NextResponse.json({ error: 'Missing oracleId' }, { status: 400 })

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Get Oracle Name
        const { data: oracle } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', oracleId)
            .single()

        if (!oracle) return NextResponse.json({ error: 'Oracle not found' }, { status: 404 })

        // 2. Find all clients who want notifications
        const { data: followers, error: followersError } = await supabaseAdmin
            .from('user_favorites')
            .select(`
                user:user_id (
                    id,
                    full_name,
                    phone
                )
            `)
            .eq('oracle_id', oracleId)
            .eq('notify_online', true)

        if (followersError) throw followersError

        // 3. Send notifications with rate limiting (PROTECTION AGAINST BAN)
        // Recommendations:
        // - Use a delay between messages (e.g., 2-5 seconds)
        // - Avoid sending to hundreds of people at the exact same second
        // - Consider using a queue system (like BullMQ or Inngest) for large volumes
        if (followers && followers.length > 0) {
            const sendWithDelay = async () => {
                for (const f of followers) {
                    const client = Array.isArray(f.user) ? f.user[0] : f.user
                    if (client?.phone) {
                        try {
                            await whatsappService.sendOracleOnlineNotification(
                                client.phone,
                                client.full_name || 'Cliente',
                                oracle.full_name
                            )
                            // Delay of 3 seconds between each participant to avoid WhatsApp flags
                            await sleep(3000)
                        } catch (err) {
                            console.error(`Failed to notify ${client.id}:`, err)
                        }
                    }
                }
            }

            // Execute in background so we don't timeout the API request
            sendWithDelay()
        }

        return NextResponse.json({
            success: true,
            notifiedCount: followers?.length || 0,
            note: 'Notifications are being sent with a 3s delay to protect the WhatsApp number.'
        })
    } catch (err: any) {
        console.error('Error in notify-online route:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
