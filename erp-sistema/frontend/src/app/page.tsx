import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-2xl w-full text-center">
        <div className="text-5xl mb-4">🏢</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">ERP Sistema Empresarial</h1>
        <p className="text-gray-500 mb-8">
          Plataforma integrada de gestão para distribuidoras internacionais
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { href: '/dashboard', label: 'Dashboard', icon: '📊', desc: 'Estatísticas gerais' },
            { href: '/users', label: 'Usuários', icon: '👥', desc: 'Gestão de usuários' },
            { href: '/products', label: 'Produtos', icon: '📦', desc: 'Catálogo de produtos' },
            { href: '/orders', label: 'Ordens', icon: '🛒', desc: 'Gestão de pedidos' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all text-left group"
            >
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="font-semibold text-gray-800 group-hover:text-blue-700">{item.label}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </Link>
          ))}
        </div>

        <Link
          href="/dashboard"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
        >
          Ir para o Dashboard
        </Link>
      </div>
    </div>
  );
}