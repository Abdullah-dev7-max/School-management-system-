import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import GlassCard from '../ui/GlassCard.jsx'
import SectionHeader from '../ui/SectionHeader.jsx'
import { EmptyState } from '../ui/States.jsx'
import ChartTooltip from '../charts/ChartTooltip.jsx'

const tick = { fill: 'rgba(24,49,58,0.62)', fontSize: 12 }

export default function AttendanceChart({ data }) {
  return (
    <GlassCard className="p-5 sm:p-6">
      <SectionHeader title="Attendance overview" description="Daily registers for the last two weeks" />
      {data.length === 0 ? (
        <EmptyState title="No attendance yet" hint="Registers appear here once teachers mark attendance." />
      ) : (
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(24,49,58,0.1)" />
              <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} />
              <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(52,143,120,0.1)' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="present" name="Present" stackId="a" fill="#348F78" />
              <Bar dataKey="late" name="Late" stackId="a" fill="#F7B955" />
              <Bar dataKey="absent" name="Absent" stackId="a" fill="#F472B6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  )
}
