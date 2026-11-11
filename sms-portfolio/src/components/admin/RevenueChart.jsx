import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import GlassCard from '../ui/GlassCard.jsx'
import SectionHeader from '../ui/SectionHeader.jsx'
import ChartTooltip from '../charts/ChartTooltip.jsx'
import { pkr, pkrCompact } from '../../lib/format.js'

const tick = { fill: 'rgba(24,49,58,0.62)', fontSize: 12 }

export default function RevenueChart({ data }) {
  const total = data.reduce((sum, m) => sum + m.revenue, 0)

  return (
    <GlassCard className="p-5 sm:p-6">
      <SectionHeader title="Monthly collection" description={`${pkrCompact(total)} received in the last 6 months`} />
      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#348F78" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#C4E3D9" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(24,49,58,0.1)" />
            <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} />
            <YAxis
              tick={tick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => new Intl.NumberFormat('en', { notation: 'compact' }).format(v)}
            />
            <Tooltip content={<ChartTooltip formatter={pkr} />} cursor={{ stroke: '#68B49D', strokeDasharray: 4 }} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Collected"
              stroke="#24735F"
              strokeWidth={2.5}
              fill="url(#revenueFill)"
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}
