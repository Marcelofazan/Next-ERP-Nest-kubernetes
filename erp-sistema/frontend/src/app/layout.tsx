import type { Metadata } from 'next';
import './globals.css';
import NavBar from './NavBar';
import ClientWrapper from '@/components/ClientWrapper';

export const metadata: Metadata = {
  title: 'ERP Sistema Empresarial',
  description: 'Sistema ERP completo para distribuidora internacional',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-gray-50 min-h-screen">
        <ClientWrapper>
          <NavBar />
          <main>{children}</main>
        </ClientWrapper>
      </body>
    </html>
  );
}
