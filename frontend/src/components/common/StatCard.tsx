import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  subValue?: ReactNode
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export default function StatCard({
  label, value, subValue, icon, trend, className,
}: StatCardProps) {
  return (
    <div className={clsx('card flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        {icon && (
          <span className="text-gray-500">{icon}</span>
        )}
      </div>
      <div className={clsx(
        'text-2xl font-bold tracking-tight',
        trend === 'up' && 'text-accent-green',
        trend === 'down' && 'text-accent-red',
        trend === 'neutral' && 'text-white',
        !trend && 'text-white',
      )}>
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-gray-500">{subValue}</div>
      )}
    </div>
  )
}
