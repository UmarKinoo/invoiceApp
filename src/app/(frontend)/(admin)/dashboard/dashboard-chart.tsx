'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type ChartDataPoint = { name: string; amount: number }

/* Light curve/fill so the chart is visible on dark card background */
const CHART_STROKE = 'oklch(0.92 0 0)'
const CHART_FILL_TOP = 'oklch(0.92 0 0)'
const CHART_FILL_BOTTOM = 'oklch(0.92 0 0)'
const GRID_STROKE = 'oklch(1 0 0 / 0.18)'
const TICK_FILL = 'oklch(0.65 0.01 285)'

export function DashboardChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <div className="h-64 lg:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_FILL_TOP} stopOpacity={0.45} />
              <stop offset="95%" stopColor={CHART_FILL_BOTTOM} stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: TICK_FILL, fontSize: 11 }}
            dy={10}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: TICK_FILL, fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: 'oklch(0.155 0.005 285)',
              borderRadius: '12px',
              border: '1px solid oklch(1 0 0 / 0.12)',
              color: 'oklch(0.98 0 0)',
              fontSize: '11px',
            }}
            cursor={{ stroke: CHART_STROKE, strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={CHART_STROKE}
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorAmt)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
