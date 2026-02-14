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

    // COMENTADO TEMPORARIAMENTE PARA QUEBRAR O LOOP DE REDIRECIONAMENTO
    /*
    // Se não estiver logado e tentar acessar áreas restritas
    if (!session) {
        if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/oracle') || url.pathname.startsWith('/app')) {
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
        console.log('Middleware Session found. Role:', role)

        // Proteção de rotas por Role
        if (url.pathname.startsWith('/admin') && role !== 'owner') {
            url.pathname = role === 'oracle' ? '/oracle' : '/app'
            return NextResponse.redirect(url)
        }

        if (url.pathname.startsWith('/oracle') && role !== 'oracle' && role !== 'owner') {
            url.pathname = role === 'owner' ? '/admin' : '/app'
            return NextResponse.redirect(url)
        }

        if (url.pathname.startsWith('/app') && role !== 'client' && role !== 'owner') {
            url.pathname = role === 'owner' ? '/admin' : '/oracle'
            return NextResponse.redirect(url)
        }

        // Evitar loop no login se já estiver logado
        if (url.pathname === '/') {
            url.pathname = role === 'owner' ? '/admin' : (role === 'oracle' ? '/oracle' : '/app')
            return NextResponse.redirect(url)
        }
    }
    */

    return res
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|background.jpg).*)'],
}
