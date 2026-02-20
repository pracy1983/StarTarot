import { NextRequest, NextResponse } from 'next/server'
import { RtcTokenBuilder, RtcRole } from 'agora-token'

export async function POST(req: NextRequest) {
    try {
        const { channelName, uid, role } = await req.json()

        if (!channelName || !uid) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
        }

        const appId = process.env.AGORA_APP_ID
        const appCertificate = process.env.AGORA_APP_CERTIFICATE

        if (!appId || !appCertificate) {
            return NextResponse.json({ error: 'Agora credentials not configured' }, { status: 500 })
        }

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
            uid, // Agora accepts string for UserAccount
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
