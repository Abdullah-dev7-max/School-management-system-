import { useMemo, useState } from 'react'
import { Check, Loader2, Plus, Wallet } from 'lucide-react'
import { useAsync } from '../hooks/useAsync.js'
import { feeState } from '../lib/analytics.js'
import { formatDate, pkr, toISODate } from '../lib/format.js'
import { fetchFeesPage, issueFeeVoucher, recordFeePayment } from '../lib/api.js'
import Badge from '../components/ui/Badge.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import { Skeleton } from '../components/ui/States.jsx'
import { Field, FORM_BUTTON, FormError, ManagementError, ManagementModal, SelectField } from '../components/admin/ManagementUi.jsx'

const STATE = {
  paid: { label: 'Paid', tone: 'success' },
  partial: { label: 'Partially paid', tone: 'info' },
  unpaid: { label: 'Unpaid', tone: 'warning' },
  overdue: { label: 'Overdue', tone: 'danger' },
}

function PaymentForm({ fee, onClose, onSave }) {
  const balance = Math.max(0, Number(fee.amount) - Number(fee.amount_paid))
  const [amount, setAmount] = useState(String(balance))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0 || value > balance) {
      setError(`Enter a payment greater than zero and no more than ${pkr(balance)}.`)
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(value)
    } catch (saveError) {
      setError(saveError.message)
      setSaving(false)
    }
  }

  return (
    <ManagementModal title="Record payment" description={`${fee.student?.name ?? 'Student'} · ${fee.title}`} onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="rounded-xl bg-white/70 p-3 text-sm"><span className="text-ink/55">Remaining balance</span><strong className="ml-2">{pkr(balance)}</strong></div>
        <Field label="Payment amount (PKR)" type="number" min="0.01" max={balance} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required autoFocus />
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className={`${FORM_BUTTON} hover:bg-ink/5`}>Cancel</button>
          <button type="submit" disabled={saving} className={`${FORM_BUTTON} bg-night-900 text-white`}>{saving ? 'Saving…' : 'Save payment'}</button>
        </div>
      </form>
    </ManagementModal>
  )
}

function VoucherForm({ students, onClose, onSave }) {
  const [form, setForm] = useState({ studentId: '', title: '', amount: '', dueDate: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (saveError) {
      setError(saveError.message || 'Could not issue the fee voucher.')
      setSaving(false)
    }
  }

  return (
    <ManagementModal title="Issue fee voucher" description="Create an invoice for a student." onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <SelectField label="Student" value={form.studentId} onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))} required>
          <option value="">Select a student</option>
          {students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.admission_no}</option>)}
        </SelectField>
        <Field label="Voucher description" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} maxLength={160} required autoFocus />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (PKR)" type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required />
          <Field label="Due date" type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} required />
        </div>
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className={`${FORM_BUTTON} hover:bg-ink/5`}>Cancel</button>
          <button type="submit" disabled={saving || !students.length} className={`${FORM_BUTTON} bg-night-900 text-white`}>{saving ? 'Saving…' : 'Issue voucher'}</button>
        </div>
      </form>
    </ManagementModal>
  )
}

export default function Fees() {
  const feesQuery = useAsync(fetchFeesPage, [], ['fees', 'fee_payments', 'students', 'users'])
  const [selectedFee, setSelectedFee] = useState(null)
  const [voucherOpen, setVoucherOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fees = feesQuery.data?.fees ?? []
  const students = feesQuery.data?.students ?? []

  const totals = useMemo(() => fees.reduce(
    (result, fee) => {
      result.collected += Number(fee.amount_paid)
      result.pending += Math.max(0, Number(fee.amount) - Number(fee.amount_paid))
      return result
    },
    { collected: 0, pending: 0 }
  ), [fees])

  const savePayment = async (amount) => {
    setSaving(true)
    setError('')
    try {
      await recordFeePayment(selectedFee, amount, toISODate())
      setSelectedFee(null)
      setMessage(`Recorded ${pkr(amount)} payment.`)
      await feesQuery.reload()
    } catch (saveError) {
      throw saveError
    } finally {
      setSaving(false)
    }
  }

  const saveVoucher = async (voucher) => {
    await issueFeeVoucher(voucher)
    setVoucherOpen(false)
    setMessage('Fee voucher issued.')
    await feesQuery.reload()
  }

  if (feesQuery.error) return <ManagementError error={feesQuery.error} onRetry={feesQuery.reload} />

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <GlassCard className="p-5">
          <p className="text-sm text-ink/60">Total collected</p>
          <p className="mt-2 text-2xl font-semibold">{pkr(totals.collected)}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-sm text-ink/60">Pending dues</p>
          <p className="mt-2 text-2xl font-semibold">{pkr(totals.pending)}</p>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <SectionHeader
            title="Fee records"
            description={`${fees.length} invoices across all students`}
            action={<button type="button" onClick={() => { setVoucherOpen(true); setMessage(''); setError('') }} disabled={!students.length} className="inline-flex h-10 items-center gap-2 rounded-xl bg-night-900 px-4 text-sm font-medium text-white disabled:opacity-50"><Plus className="h-4 w-4" />Issue voucher</button>}
          />
        </div>
        {error && <p role="alert" className="mx-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {message && <p role="status" className="mx-5 flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" />{message}</p>}
        {!feesQuery.data ? (
          <div className="space-y-3 p-5"><Skeleton className="h-11" /><Skeleton className="h-64" /></div>
        ) : !fees.length ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center"><Wallet className="h-8 w-8 text-lilac-500" /><p className="font-semibold">No fee records yet</p><p className="text-sm text-ink/55">Fee records will appear here when invoices are added.</p></div>
        ) : (
          <div className="mt-4 overflow-x-auto border-t border-white/70">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-white/40 text-xs text-ink/55"><tr>
                {['Student name', 'Fee', 'Amount', 'Due date', 'Status'].map((label) => <th key={label} scope="col" className="px-5 py-3 font-medium">{label}</th>)}
                <th scope="col" className="px-5 py-3 text-right font-medium">Payment</th>
              </tr></thead>
              <tbody className="divide-y divide-white/70">{fees.map((fee) => {
                const state = feeState(fee)
                const status = STATE[state]
                const balance = Math.max(0, Number(fee.amount) - Number(fee.amount_paid))
                return <tr key={fee.id} className="hover:bg-white/50">
                  <td className="px-5 py-3.5"><p className="font-medium">{fee.student?.name ?? 'Unknown student'}</p><p className="text-xs text-ink/50">{fee.student?.admission_no ?? ''}</p></td>
                  <td className="px-5 py-3.5">{fee.title}</td>
                  <td className="px-5 py-3.5 tabular-nums">
                    {pkr(fee.amount)}
                    <p className="text-xs text-ink/50">Paid {pkr(fee.amount_paid)} · Due {pkr(balance)}</p>
                    {fee.fee_payments?.map((payment) => <p key={payment.id} className="text-xs text-ink/45">{formatDate(payment.paid_on)} · {pkr(payment.amount)}</p>)}
                  </td>
                  <td className="px-5 py-3.5">{formatDate(fee.due_date)}</td>
                  <td className="px-5 py-3.5"><Badge tone={status.tone} dot>{status.label}</Badge></td>
                  <td className="px-5 py-3.5 text-right">{balance > 0 ? <button type="button" disabled={saving} onClick={() => { setSelectedFee(fee); setMessage(''); setError('') }} className="h-9 rounded-lg bg-lilac-100 px-3 text-xs font-medium text-lilac-600 hover:bg-lilac-200 disabled:opacity-50">Record payment</button> : <span className="text-xs text-ink/45">Settled</span>}</td>
                </tr>
              })}</tbody>
            </table>
          </div>
        )}
      </GlassCard>
      {selectedFee && <PaymentForm key={selectedFee.id} fee={selectedFee} onClose={() => setSelectedFee(null)} onSave={savePayment} />}
      {voucherOpen && <VoucherForm students={students} onClose={() => setVoucherOpen(false)} onSave={saveVoucher} />}
      {saving && <span className="sr-only" aria-live="polite"><Loader2 className="animate-spin" />Saving payment</span>}
    </div>
  )
}
