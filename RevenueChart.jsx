import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import GlassCard from '../ui/GlassCard.jsx'
import SectionHeader from '../ui/SectionHeader.jsx'
import ChartTooltip from '../charts/ChartTooltip.jsx'
import { pkr, pkrCompact } from '../../lib/format.js'

const tick = { fill: 'rgba(27,22,51,0.55)', fontSize: 12 }

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
                <stop offset="0%" stopColor="#8F68F5" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#C7B5FF" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(27,22,51,0.07)" />
            <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} />
            <YAxis
              tick={tick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => new Intl.NumberFormat('en', { notation: 'compact' }).format(v)}
            />
            <Tooltip content={<ChartTooltip formatter={pkr} />} cursor={{ stroke: '#AB8DFF', strokeDasharray: 4 }} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Collected"
              stroke="#7648E0"
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
