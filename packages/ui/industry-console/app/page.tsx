export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function getHealth(): Promise<{ status: string; uptime: number } | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as { status: string; uptime: number };
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await getHealth();
  const online = health?.status === 'ok';
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: 'linear-gradient(135deg, #0f172a 0%, #0e7490 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Industry Console</h1>
      <p style={{ fontSize: '1.15rem', opacity: 0.85, marginTop: '0.5rem' }}>Catalog, rights & royalties management</p>
      <div
        style={{
          marginTop: '2rem',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            marginRight: 8,
            background: online ? '#22c55e' : '#ef4444',
          }}
        />
        {online
          ? `API online · uptime ${Math.floor(health!.uptime)}s`
          : 'API offline — start the API service'}
      </div>
      <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', opacity: 0.6 }}>
        Connected to {API_URL}
      </p>
    </main>
  );
}
