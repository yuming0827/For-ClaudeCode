import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, FlaskConical,
  BarChart2, Settings, LogOut, Zap,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { useStrategyStore } from '../../store/strategies'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useCallback } from 'react'
import DemoBanner from './DemoBanner'
import LiveTicker from './LiveTicker'
import { isDemoMode } from '../../utils/api'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/strategies', icon: TrendingUp, label: 'Strategies' },
  { to: '/backtest', icon: FlaskConical, label: 'Backtest' },
  { to: '/market', icon: BarChart2, label: 'Market' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const logout = useAuthStore((s) => s.logout)
  const setFromWS = useStrategyStore((s) => s.setFromWS)

  const onWsMessage = useCallback((data: unknown) => {
    const msg = data as { type: string; data: unknown }
    if (msg.type === 'strategies') setFromWS(msg.data as ReturnType<typeof useStrategyStore.getState>['strategies'])
  }, [setFromWS])

  useWebSocket('/ws/strategies', onWsMessage, !isDemoMode)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface">
      {/* Top bars */}
      <DemoBanner />
      <LiveTicker />

      {/* Body row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-16 lg:w-56 flex flex-col bg-surface-50 border-r border-border flex-shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center flex-shrink-0">
              <Zap size={16} className="text-accent-blue" />
            </div>
            <span className="hidden lg:block text-sm font-bold text-white tracking-tight">
              QUANT<span className="text-accent-blue">AGENT</span>
            </span>
          </div>

          {/* Nav Links */}
          <div className="flex-1 py-4 space-y-1 px-2">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-surface-200'
                  }`
                }
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="hidden lg:block">{label}</span>
              </NavLink>
            ))}
          </div>

          {/* Logout */}
          <div className="px-2 py-4 border-t border-border">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-400
                         hover:text-accent-red hover:bg-accent-red/10 transition-colors w-full"
            >
              <LogOut size={16} />
              <span className="hidden lg:block">Logout</span>
            </button>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
