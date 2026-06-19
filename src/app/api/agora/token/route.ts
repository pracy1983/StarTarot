import { NextRequest, NextResponse } from 'next/server'
import { RtcTokenBuilder, RtcRole } from 'agora-token'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
    try {
        const { channelName } = await req.json()

        if (!channelName) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
        }

        // 1. Exigir sessão autenticada
        const supabase = createRouteHandlerClient({ cookies })
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // 2. O channelName é o id da consulta. Verificar que o solicitante é
        // realmente participante (cliente ou oraculista) daquela consulta.
        const { data: consultation, error: consultationError } = await supabaseAdmin
            .from('consultations')
            .select('client_id, oracle_id')
            .eq('id', channelName)
            .single()

        if (consultationError || !consultation) {
            return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
        }

        const isParticipant =
            consultation.client_id === session.user.id ||
            consultation.oracle_id === session.user.id

        if (!isParticipant) {
            return NextResponse.json({ error: 'Acesso negado a esta sala' }, { status: 403 })
        }

        const appId = process.env.AGORA_APP_ID
        const appCertificate = process.env.AGORA_APP_CERTIFICATE

        if (!appId || !appCertificate) {
            return NextResponse.json({ error: 'Agora credentials not configured' }, { status: 500 })
        }

        // 3. O uid é SEMPRE o id do próprio usuário autenticado (nunca confiar
        // no valor enviado pelo cliente — evita personificação).
        const uid = session.user.id

        // Ambos precisam publicar áudio/vídeo
        const agoraRole = RtcRole.PUBLISHER

        // Expiração (2 horas para garantir que não caia no meio)
        const expirationTimeInSeconds = 3600 * 2
        const currentTimestamp = Math.floor(Date.now() / 1000)
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

        const token = RtcTokenBuilder.buildTokenWithUserAccount(
            appId,
            appCertificate,
            channelName,
            uid,
            agoraRole,
            privilegeExpiredTs,
            privilegeExpiredTs // tokenExpireTs
        )

        return NextResponse.json({
            token,
            appId,
            channelName,
            uid
        })

    } catch (err: any) {
        console.error('Error generating Agora token:', err)
        return NextResponse.json({ error: 'Token generation failed' }, { status: 500 })
    }
}
