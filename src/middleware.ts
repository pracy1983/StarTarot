import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

    const {
        data: { session },
    } = await supabase.auth.getSession()

    console.log('Middleware Path:', req.nextUrl.pathname, 'Session active:', !!session)

    const url = req.nextUrl.clone()

    // Se não estiver logado e tentar acessar áreas restritas
    if (!session) {
        if (url.pathname.startsWith('/admin') || (url.pathname.startsWith('/app') && !url.pathname.startsWith('/app/oraculo/'))) {
            url.pathname = '/'
            return NextResponse.redirect(url)
        }
    }

    // Se estiver logado, verificar role para redirecionamento correto
    if (session) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        const role = profile?.role
        // console.log('Middleware Session found. Role:', role)

        // Proteção de rotas por Role
        if (role === 'owner') {
            // Owner has access to everything
            return res
        }

        if (url.pathname.startsWith('/admin') && role !== 'owner') {
            // Redirect unauthorized users from admin
            url.pathname = role === 'oracle' ? '/app/dashboard' : '/app'
            return NextResponse.redirect(url)
        }

        if (url.pathname.startsWith('/app/dashboard') && role !== 'oracle') {
            // Redirect clients/others from oracle dashboard
            // Owner is handled above
            url.pathname = '/app'
            return NextResponse.redirect(url)
        }

        // Oracle trying to access client area?
        // Oracles might want to see marketplace, but maybe not use it as client?
        // Let's allow access to /app for oracles for now, to see their own profile or others.
        // But if they go to /app (root of client), maybe we should keep them there or redirect?
        // User's previous logic had strict separation.
        // "if (url.pathname.startsWith('/app') && role !== 'client')" -> blocked oracles.
        // But now oracles have /app/dashboard inside /app structure? No, /app/dashboard is inside /app folder?
        // Wait, list_dir src/app/app/dashboard -> Yes, it is src/app/app/dashboard.
        // So the route is /app/dashboard.
        // And client route is /app.
        // So both start with /app.

        // If I am Oracle:
        // /app -> Allowed (Marketplace)
        // /app/dashboard -> Allowed (My Dashboard)
        // /admin -> Blocked.

        // If I am Client:
        // /app -> Allowed
        // /app/dashboard -> Blocked (Oracle only).
        // /admin -> Blocked.

        // So we only need to protect /app/dashboard and /admin.

        // Oracle is allowed to access /app (marketplace)
        // No further checks needed for /app root as it is public-ish for authenticated users

        // Evitar loop no login se já estiver logado
        // REMOVIDO PARA EVITAR LOOP INFINITO E PERMITIR ACESSO A LANDING PAGE
        /*
        if (url.pathname === '/') {
            url.pathname = role === 'owner' ? '/admin' : (role === 'oracle' ? '/oracle' : '/app')
            return NextResponse.redirect(url)
        }
        */
    }

    return res
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|background.jpg).*)'],
}
