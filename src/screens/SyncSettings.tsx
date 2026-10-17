/** Settings → Sync: connect this device to your private GitHub repository, see the status. */
import { useEffect, useState } from 'react';
import { connectSync, disconnectSync, PasswordMismatchError, syncNow, useSyncStatus } from '../core/sync';
import { timeAgo } from '../lib/date';
import { Icon } from '../components/Icon';

/** Re-render every 30 s so "5 min ago" stays true. */
function useMinuteTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
}

export function SyncSettings() {
  const status = useSyncStatus();
  useMinuteTick();
  return (
    <section className="card card-pad stack" style={{ '--gap': '14px' } as React.CSSProperties} id="sync">
      <h2>Sync between devices</h2>
      {status.phase === 'off' ? <Connect /> : <Connected />}
    </section>
  );
}

function Connected() {
  const s = useSyncStatus();
  const [busy, setBusy] = useState(false);
  const devices = Object.entries(s.devices ?? {}).sort((a, b) => b[1].at - a[1].at);
  return (
    <>
      <div className={`sync-status ${s.phase}`} role="status">
        <span className="sync-dot" aria-hidden="true" />
        <div>
          <b>
            {s.phase === 'syncing'
              ? 'Syncing…'
              : s.phase === 'error'
                ? 'Sync problem'
                : s.lastSync
                  ? `Synced ${timeAgo(s.lastSync)}`
                  : 'Connected'}
          </b>
          <div className="faint small">
            with <span className="nowrap">{s.repo}</span> on GitHub · encrypted
          </div>
        </div>
      </div>
      {s.phase === 'error' && s.error && <div className="notice bad small">{s.error}</div>}

      {devices.length > 0 && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Devices</div>
          <ul className="sync-devices">
            {devices.map(([id, d]) => (
              <li key={id}>
                <Icon name={/iPhone|Android phone/.test(d.name) ? 'phone' : 'laptop'} size={18} />
                <span>
                  {d.name}
                  {id === s.deviceId && <span className="tag tag-accent" style={{ marginLeft: 8 }}>this device</span>}
                </span>
                <span className="faint small">{timeAgo(d.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="faint small">
        Synced: progress, daily history, settings, word lists, kanji list and your self-introduction. Stays on each device: theme, voice
        speed, sound, recordings – and the course pack, which you unlock once per device.
      </p>
      <div className="row">
        <button
          className="btn"
          disabled={busy || s.phase === 'syncing'}
          onClick={async () => {
            setBusy(true);
            await syncNow();
            setBusy(false);
          }}
        >
          <Icon name="refresh" size={16} /> Sync now
        </button>
        <button
          className="btn btn-ghost btn-danger"
          onClick={() => confirm('Disconnect this device? Your progress stays here and on GitHub.') && disconnectSync()}
        >
          Disconnect this device
        </button>
      </div>
    </>
  );
}

function Connect() {
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'good' | 'bad' | 'warn'; text: string } | null>(null);
  const [mismatch, setMismatch] = useState(false);

  const connect = async (startFresh = false) => {
    if (startFresh && !confirm('Start fresh with this password? The sync file on GitHub is replaced by this device’s data; your other devices then need to connect again with the new password.')) return;
    setBusy(true);
    setMsg(null);
    setMismatch(false);
    try {
      const r = await connectSync(repo, token, password, startFresh);
      setToken('');
      setPassword('');
      if (r.publicRepo) setMsg({ kind: 'warn', text: 'Connected. Note: this repository is public – your data is encrypted, but making it private is better.' });
    } catch (e) {
      setMismatch(e instanceof PasswordMismatchError);
      setMsg({ kind: 'bad', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="muted small">
        Keep your progress the same on your phone and laptop. It’s free: the app saves one file in a <b>private repository in your own
        GitHub account</b>, encrypted with your sync password before it leaves the device. Syncing runs in the background and never
        slows you down; offline you just keep studying.
      </p>

      <ol className="sync-steps">
        <li>
          <p>
            <b>Create a private repository</b> called <code>nihongo-sync</code> – leave it empty.
          </p>
          <div>
            <a className="btn btn-sm" href="https://github.com/new?name=nihongo-sync&visibility=private" target="_blank" rel="noreferrer">
              Open GitHub <Icon name="right" size={14} />
            </a>
          </div>
        </li>
        <li>
          <p>
            <b>Create an access token</b> that may only use this repository:
          </p>
          <dl className="sync-token">
            <dt>Token name</dt>
            <dd>Nihongo sync</dd>
            <dt>Expiration</dt>
            <dd>the longest offered</dd>
            <dt>Repository access</dt>
            <dd>Only select repositories → nihongo-sync</dd>
            <dt>Permissions</dt>
            <dd>
              Repository permissions → <b>Contents: Read and write</b>
            </dd>
          </dl>
          <p>Then generate it and copy it. Keep it in your password manager – you paste the same token on your other device.</p>
          <div>
            <a className="btn btn-sm" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
              Create token <Icon name="right" size={14} />
            </a>
          </div>
        </li>
        <li>
          <p>
            <b>Connect</b> – on every device, with the same sync password.
          </p>
        </li>
      </ol>

      <form
        className="sync-form"
        onSubmit={(e) => {
          e.preventDefault();
          void connect();
        }}
      >
        <label className="field">
          <span className="field-label">Repository</span>
          <input className="input" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="your-github-name/nihongo-sync" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        </label>
        <label className="field">
          <span className="field-label">Access token</span>
          <input className="input" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" autoComplete="off" spellCheck={false} />
        </label>
        <label className="field">
          <span className="field-label">Sync password</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="the same on all your devices" autoComplete="new-password" />
          <span className="field-hint">Encrypts your data – you can reuse your course-pack passphrase. Forgot it? You can start fresh with a new one.</span>
        </label>
        <div>
          <button className="btn btn-primary" disabled={busy || !repo || !token || !password}>
            <Icon name="refresh" size={16} /> {busy ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </form>
      {msg && (
        <div className={`notice ${msg.kind} small`}>
          {msg.text}
          {mismatch && (
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-sm btn-wrap" onClick={() => void connect(true)} disabled={busy}>
                Forgot it? Start fresh
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
