import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Rotas que não precisam de autenticação
const publicRoutes = [
  '/login',
  '/cadastro',
  '/esqueci-senha',
  '/nova-senha',
  '/verificar-email',
  '/',
  '/api/auth/login'
]

// Rotas que precisam de permissão de admin
const adminRoutes = [
  '/admin',
  '/api/admin'
]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Verificar se é uma rota pública
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Pegar o token do cookie
  const token = request.cookies.get('token')?.value

  // Se não tiver token
  if (!token) {
    // Se for uma rota de API, retorna 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    // Se for uma rota normal, redireciona para login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // Verificar o token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

    // Verificar se é uma rota de admin
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      if (!payload.isAdmin) {
        // Se for uma rota de API, retorna 403
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }
        // Se for uma rota normal, redireciona para dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return NextResponse.next()
  } catch (error) {
    // Se o token for inválido
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

// Configurar quais rotas o middleware deve processar
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. _next/static (static files)
     * 2. _next/image (image optimization files)
     * 3. favicon.ico (favicon file)
     * 4. public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|assets/).*)',
  ],
}
