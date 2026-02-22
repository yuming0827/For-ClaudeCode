import { useState } from 'react'
import { Save, Eye, EyeOff, Bell, Shield, Wifi } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

interface EnvVar {
  key: string
  label: string
  description: string
  sensitive?: boolean
  placeholder?: string
}

const API_KEYS: EnvVar[] = [
  { key: 'BINANCE_API_KEY', label: 'Binance API Key', description: 'For crypto trading', sensitive: true },
  { key: 'BINANCE_SECRET', label: 'Binance Secret', description: 'For crypto trading', sensitive: true },
  { key: 'POLYGON_API_KEY', label: 'Polygon.io Key', description: 'US stock market data', sensitive: true },
  { key: 'ALPHA_VANTAGE_KEY', label: 'Alpha Vantage Key', description: 'Alternative US data source', sensitive: true },
  { key: 'TELEGRAM_TOKEN', label: 'Telegram Bot Token', description: 'From @BotFather', sensitive: true },
  { key: 'TELEGRAM_CHAT_ID', label: 'Telegram Chat ID', description: 'Your personal chat ID', placeholder: '-100xxxxxxxxx' },
]

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [backendUrl, setBackendUrl] = useState(
    localStorage.getItem('VITE_API_URL') ?? 'http://localhost:8000/api/v1',
  )
  const [wsUrl, setWsUrl] = useState(
    localStorage.getItem('VITE_WS_URL') ?? 'ws://localhost:8000',
  )

  const toggle = (key: string) =>
    setVisible((v) => ({ ...v, [key]: !v[key] }))

  const save = () => {
    localStorage.setItem('VITE_API_URL', backendUrl)
    localStorage.setItem('VITE_WS_URL', wsUrl)
    // Update axios instance immediately so new requests use the new URL
    api.defaults.baseURL = backendUrl
    toast.success('Settings saved — connection URL updated')
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      {/* Connection */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Wifi size={16} className="text-accent-blue" />
          <h2 className="text-sm font-semibold text-gray-300">Backend Connection</h2>
        </div>

        <div>
          <label className="label">API Base URL</label>
          <input className="input" value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)} />
        </div>
        <div>
          <label className="label">WebSocket URL</label>
          <input className="input" value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)} />
        </div>
      </div>

      {/* API Keys */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={16} className="text-accent-yellow" />
          <h2 className="text-sm font-semibold text-gray-300">API Keys</h2>
        </div>
        <div className="bg-accent-yellow/10 border border-accent-yellow/30 rounded p-3 text-xs text-accent-yellow">
          API keys are stored in your backend .env file — never in the frontend.
          Configure them directly on your server.
        </div>
        {API_KEYS.map((k) => (
          <div key={k.key}>
            <label className="label">{k.label}</label>
            <p className="text-xs text-gray-600 mb-1">{k.description}</p>
            <div className="relative">
              <input
                type={visible[k.key] ? 'text' : 'password'}
                className="input pr-10"
                placeholder={k.placeholder ?? '(set in .env)'}
                value={values[k.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [k.key]: e.target.value }))}
              />
              {k.sensitive && (
                <button
                  type="button"
                  onClick={() => toggle(k.key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {visible[k.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={16} className="text-accent-green" />
          <h2 className="text-sm font-semibold text-gray-300">Notifications</h2>
        </div>
        <p className="text-xs text-gray-500">
          Configure <strong className="text-gray-300">TELEGRAM_TOKEN</strong> and{' '}
          <strong className="text-gray-300">TELEGRAM_CHAT_ID</strong> in your backend .env
          to enable Telegram push notifications for trade alerts and strategy events.
          Use <code className="text-accent-cyan">/start</code> in your bot to activate.
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            { cmd: '/status', desc: 'Get all positions & PnL' },
            { cmd: '/pnl', desc: 'Detailed PnL breakdown' },
            { cmd: '/strategies', desc: 'List running strategies' },
            { cmd: '/stop <id>', desc: 'Emergency stop a strategy' },
          ].map(({ cmd, desc }) => (
            <div key={cmd} className="card-sm">
              <code className="text-accent-cyan">{cmd}</code>
              <div className="text-gray-500 mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={save} className="btn-primary">
        <Save size={14} /> Save Settings
      </button>
    </div>
  )
}
