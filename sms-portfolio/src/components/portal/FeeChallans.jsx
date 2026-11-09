import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ReceiptText } from 'lucide-react'
import GlassCard from '../ui/GlassCard.jsx'
import SectionHeader from '../ui/SectionHeader.jsx'
import Badge from '../ui/Badge.jsx'
import { EmptyState } from '../ui/States.jsx'
import { feeState } from '../../lib/analytics.js'
import { formatDate, pkr } from '../../lib/format.js'

const STATUS = {
  paid: { tone: 'success', label: 'Paid' },
  unpaid: { tone: 'warning', label: 'Unpaid' },
  partial: { tone: 'info', label: 'Partially paid' },
  overdue: { tone: 'danger', label: 'Overdue' },
}

const challanNo = (fee) => `CH-${fee.due_date.slice(0, 4)}-${fee.id.slice(0, 4).toUpperCase()}`

export default function FeeChallans({ fees }) {
  const rows = useMemo(() => fees.map((f) => ({ ...f, state: feeState(f) })), [fees])
  const totals = useMemo(
    () => ({
      billed: rows.reduce((s, f) => s + Number(f.amount), 0),
      paid: rows.reduce((s, f) => s + Number(f.amount_paid), 0),
      overdue: rows.filter((f) => f.state === 'overdue').length,
    }),
    [rows]
  )
  const outstanding = totals.billed - totals.paid

  return (
    <GlassCard className="overflow-hidden">
      <div className="p-5 sm:p-6">
        <SectionHeader
          title="Fee challans"
          description="Every invoice issued for this student"
          action={totals.overdue > 0 ? <Badge tone="danger" dot>{totals.overdue} overdue</Badge> : <Badge tone="success" dot>Nothing overdue</Badge>}
        />

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ['Total billed', pkr(totals.billed)],
            ['Paid so far', pkr(totals.paid)],
            ['Outstanding', pkr(outstanding)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/60 px-4 py-3">
              <dt className="text-xs text-ink/55">{label}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No challans issued" hint="Invoices will be listed here when the school issues them." />
      ) : (
        <div className="overflow-x-auto border-t border-white/70">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-white/40 text-xs text-ink/55">
              <tr>
                {['Challan', 'Description', 'Due date', 'Amount', 'Balance', 'Status'].map((h, i) => (
                  <th key={h} scope="col" className={`px-5 py-3 font-medium ${i >= 3 && i < 5 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/70">
              {rows.map((f, i) => {
                const status = STATUS[f.state]
                const balance = Math.max(0, Number(f.amount) - Number(f.amount_paid))
                return (
                  <motion.tr
                    key={f.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03 }}
                    className="hover:bg-white/50"
                  >
                    <td className="px-5 py-3.5 tabular-nums text-ink/60">{challanNo(f)}</td>
                    <td className="px-5 py-3.5 font-medium">{f.title}</td>
                    <td className="px-5 py-3.5 text-ink/70">{formatDate(f.due_date)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{pkr(f.amount)}</td>
                    <td className={`px-5 py-3.5 text-right tabular-nums ${balance > 0 ? 'font-medium' : 'text-ink/40'}`}>{pkr(balance)}</td>
                    <td className="px-5 py-3.5"><Badge tone={status.tone} dot>{status.label}</Badge></td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  )
}
