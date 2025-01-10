import Image from 'next/image'
import Link from 'next/link'

export default function CadastroPage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background com overlay */}
      <div 
        className="fixed inset-0 w-screen h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/background.jpg)' }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-10 bg-black/40 p-8 rounded-2xl backdrop-blur-md border border-primary/20">
          {/* Logo e Título */}
          <div className="text-center space-y-6">
            <div className="w-44 h-44 mx-auto">
              <img
                src="/logo.png"
                alt="StarTarot Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-raleway text-5xl font-bold text-primary mb-4">Criar Conta</h1>
              <p className="text-xl text-gray-300 font-light leading-relaxed">
                Comece sua jornada espiritual
                <br />e descubra seu caminho.
              </p>
            </div>
          </div>

          {/* Formulário */}
          <form className="space-y-6">
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Nome completo"
                  className="w-full px-4 py-3 bg-black/40 border border-primary/20 rounded-lg
                           focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
                           text-white placeholder-gray-400 transition-all duration-200"
                  required
                />
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-3 bg-black/40 border border-primary/20 rounded-lg
                           focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
                           text-white placeholder-gray-400 transition-all duration-200"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Senha"
                  className="w-full px-4 py-3 bg-black/40 border border-primary/20 rounded-lg
                           focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
                           text-white placeholder-gray-400 transition-all duration-200"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Confirmar senha"
                  className="w-full px-4 py-3 bg-black/40 border border-primary/20 rounded-lg
                           focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
                           text-white placeholder-gray-400 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-center text-sm">
              <Link 
                href="/" 
                className="text-primary hover:text-primary-light transition-colors duration-200"
              >
                Já tem uma conta? Faça login
              </Link>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 bg-primary hover:bg-primary-light text-black font-semibold
                       rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02]"
            >
              Criar Conta
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
