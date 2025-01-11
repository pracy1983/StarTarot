'use client'

import Link from 'next/link'
import { 
  UserGroupIcon, 
  ChartBarIcon, 
  CreditCardIcon, 
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline'

const adminMenuItems = [
  {
    title: 'Usuários',
    description: 'Gerencie usuários e permissões',
    icon: UserGroupIcon,
    href: '/admin/users'
  },
  {
    title: 'Estatísticas',
    description: 'Visualize métricas e relatórios',
    icon: ChartBarIcon,
    href: '/admin/stats'
  },
  {
    title: 'Pagamentos',
    description: 'Gerencie transações e créditos',
    icon: CreditCardIcon,
    href: '/admin/payments'
  },
  {
    title: 'Consultas',
    description: 'Gerencie consultas e mensagens',
    icon: ChatBubbleLeftRightIcon,
    href: '/admin/consultations'
  }
]

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-8">
        Painel Administrativo
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {adminMenuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.title}
              href={item.href}
              className="bg-black/40 backdrop-blur-md border border-primary/20 rounded-lg p-6 hover:bg-primary/5 transition-all duration-200"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-primary mb-2">
                {item.title}
              </h3>
              <p className="text-gray-400">
                {item.description}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
