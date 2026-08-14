import axios from 'axios';

/**
 * Cliente HTTP.
 * - withCredentials: true envía la cookie HttpOnly access_token automáticamente.
 */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, 
});

// Flag temporária para evitar múltiplos redirecionamentos simultâneos para a tela de login
let isRedirecting = false;

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // CORREÇÃO 1: Evita interceptar chamadas do Next.js de pré-carregamento de páginas (_next/data)
    if (err.config?.url?.includes('_next')) {
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && typeof window !== 'undefined') {
      if (!isRedirecting) {
        isRedirecting = true;
        clearSession();
        // CORREÇÃO 2: Usa o histórico do navegador para evitar quebra de estado em cliques rápidos do menu
        window.location.replace('/login');
      }
    }
    return Promise.reject(err);
  },
);

// ── Perfil de usuario (no sensible, se guarda en localStorage) ──

export const getUser = (): { id: number; email: string; role?: { name: string } } | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const raw = localStorage.getItem('postgres');
    if (!raw) return null;
    
    const parsed = JSON.parse(raw);
    // Garante que o objeto retornado possui a estrutura mínima esperada
    if (parsed && typeof parsed === 'object' && 'id' in parsed) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Erro ao ler perfil do localStorage:', error);
    return null;
  }
};

/**
 * Grava o perfil de forma segura garantindo a execução exclusiva no cliente.
 */
export const setSession = (user: object) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('postgres', JSON.stringify(user));
    window.dispatchEvent(new Event('erp:auth-change'));
  } catch (error) {
    console.error('Erro ao gravar sessão no localStorage:', error);
  }
};

/**
 * Limpa a sessão limpando os estados e emitindo o evento global.
 */
export const clearSession = () => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('postgres');
    window.dispatchEvent(new Event('erp:auth-change'));
  } catch (error) {
    console.error('Erro ao limpar sessão do localStorage:', error);
  }
};

export default api;