import { useEffect, useState, type FormEvent, type CSSProperties } from 'react';
import App from './App';
import { CrmProvider } from './store';
import { ApiError, request } from '../secure/api';
import type { RealIdentity } from './real-workspace';

const center: CSSProperties = {
  minHeight: '100dvh', display: 'grid', placeItems: 'center',
  background: '#eaf2fb', padding: '24px', color: '#002d59',
  fontFamily: 'Inter, Arial, sans-serif'
};
const box: CSSProperties = {
  width: 'min(100%, 420px)', padding: '32px',
  background: '#fff', borderRadius: '14px',
  border: '1px solid #d7e5f3'
};
const field: CSSProperties = {
  display: 'block', width: '100%', margin: '8px 0 18px',
  padding: '13px 14px', boxSizing: 'border-box',
  border: '1px solid #b9cbe0', borderRadius: '8px',
  fontSize: '16px'
};
const action: CSSProperties = {
  background: '#01488e', color: 'white', width: '100%',
  padding: '14px', border: 0, borderRadius: '8px',
  cursor: 'pointer', fontWeight: 700
};

export default function RealGate() {
  const [phase, setPhase] = useState<'checking'|'guest'|'ready'|'fault'>('checking');
  const [identity, setIdentity] = useState<RealIdentity | null>(null);
  const [username, setUsername] = useState('direccion');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    request<RealIdentity>('/api/me')
      .then(user => {
        if (!active) return;
        setIdentity(user);
        setPhase('ready');
      })
      .catch(reason => {
        if (!active) return;
        setPhase(reason instanceof ApiError && reason.status === 401 ? 'guest' : 'fault');
      });
    return () => { active = false; };
  }, []);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorking(true); setError('');
    try {
      await request('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      const user = await request<RealIdentity>('/api/me');
      setIdentity(user);
      setPhase('ready');
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 401
        ? 'Usuario o contraseña incorrectos.'
        : 'No se ha podido verificar el acceso. No se han cargado datos.');
    } finally {
      setPassword('');
      setWorking(false);
    }
  };
  const logout = async () => {
    try {
      await request('/api/logout', { method: 'POST' });
      setIdentity(null); setPhase('guest'); setPassword('');
    } catch {
      window.alert('No se ha podido revocar la sesión. Vuelve a intentarlo.');
    }
  };

  if (phase === 'ready' && identity?.role === 'direccion') {
    return <CrmProvider key={identity.username} realIdentity={identity}>
      <App onSecureLogout={logout}/>
    </CrmProvider>;
  }
  return <main style={center}>
    <section style={box} aria-label="Acceso al CRM Depofibra">
      <img
        src="https://depofibra.com/images/depofibra_brand_assets/depofibra-logo-horizontal.png?v=20261113"
        width={200} alt="Depofibra" style={{ maxWidth: '100%', height: 'auto' }}
      />
      {phase === 'checking' ? <p>Comprobando tu sesión segura…</p>
      : phase === 'fault' ? <>
        <h1>Conexión no disponible</h1>
        <p>El servidor no ha confirmado la sesión. No se cargarán datos de demostración.</p>
        <button style={action} onClick={() => window.location.reload()}>Reintentar</button>
      </>
      : phase === 'ready' ? <>
        <h1>Acceso pendiente</h1>
        <p>El espacio operativo completo está habilitado únicamente para Dirección.
          No se habilitarán permisos de Oficina hasta verificarlos en el servidor.</p>
        <button style={action} onClick={() => void logout()}>Cerrar sesión</button>
      </>
      : <>
        <h1>Acceso privado</h1>
        <p>Entra con tu usuario real. Los datos se guardarán en PostgreSQL, no en este navegador.</p>
        <form onSubmit={login}>
          <label htmlFor="real-username">Usuario</label>
          <input id="real-username" style={field} autoComplete="username" value={username}
            required minLength={3} maxLength={64}
            onChange={event => setUsername(event.target.value)}/>
          <label htmlFor="real-password">Contraseña</label>
          <input id="real-password" style={field} type="password" autoComplete="current-password"
            value={password} required onChange={event => setPassword(event.target.value)}/>
          {error && <p role="alert" style={{ color: '#a11919' }}>{error}</p>}
          <button type="submit" style={action} disabled={working}>
            {working ? 'Comprobando…' : 'Entrar al CRM'}
          </button>
        </form>
      </>}
    </section>
  </main>;
}
