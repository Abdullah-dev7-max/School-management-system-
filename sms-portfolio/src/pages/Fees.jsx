import { useMemo, useState } from 'react'
import { Plus, Printer, ReceiptText, Search, Users, Wallet, X } from 'lucide-react'
import { useAsync } from '../hooks/useAsync.js'
import { fetchFeesPage, generateMonthlyFeeVouchers, issueFeeVoucher, recordFeePayment, updateClassFee } from '../lib/api.js'
import { formatDate, pkr, toISODate } from '../lib/format.js'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { ErrorState, Skeleton } from '../components/ui/States.jsx'

const FIELD = 'mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60'
const BUTTON = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-night-900 px-4 text-sm font-medium text-white disabled:opacity-50'

function currentMonth() {
  return toISODate().slice(0, 7)
}

function monthLabel(value) {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T00:00:00`))
}

function DialogFrame({ title, description, onClose, children, maxWidth = 'max-w-3xl' }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4">
      <button type="button" aria-label="Close dialog" onClick={onClose} className="fixed inset-0 bg-night-950/60 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="fees-dialog-title" className={`glass-strong relative z-10 my-auto max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-3xl p-5 sm:p-7`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="fees-dialog-title" className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink/55">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-xl p-2 hover:bg-ink/5"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

function ClassFeeSettings({ classes, onSave, onClose }) {
  const [values, setValues] = useState({})
  const [savingId, setSavingId] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  const update = (classItem, key, value) => {
    setValues((current) => ({
      ...current,
      [classItem.id]: {
        monthlyFee: current[classItem.id]?.monthlyFee ?? classItem.monthly_fee ?? '',
        feeDueDay: current[classItem.id]?.feeDueDay ?? classItem.fee_due_day ?? '10',
        [key]: value,
      },
    }))
    setFeedback('')
    setError('')
  }

  const save = async (classItem) => {
    const monthlyFee = values[classItem.id]?.monthlyFee ?? classItem.monthly_fee ?? ''
    const feeDueDay = values[classItem.id]?.feeDueDay ?? classItem.fee_due_day ?? '10'
    setSavingId(classItem.id)
    setError('')
    setFeedback('')
    try {
      await onSave(classItem.id, monthlyFee, feeDueDay)
      setFeedback(`Saved fee settings for ${classItem.name} ${classItem.section}.`)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSavingId('')
    }
  }

  return (
    <DialogFrame title="Set class fees" description="Set each class's monthly fee and recurring due day." onClose={onClose}>
      {feedback && <p role="status" className="mt-4 text-sm text-emerald-700">{feedback}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="mt-4 divide-y divide-ink/5">
        {classes.map((classItem) => {
          const monthlyFee = values[classItem.id]?.monthlyFee ?? classItem.monthly_fee ?? ''
          const feeDueDay = values[classItem.id]?.feeDueDay ?? classItem.fee_due_day ?? '10'
          return (
            <div key={classItem.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
              <p className="pb-2 text-sm font-semibold">{classItem.name} {classItem.section}</p>
              <label className="text-sm font-medium">Monthly fee (PKR)
                <input type="number" min="0" step="0.01" value={monthlyFee} onChange={(event) => update(classItem, 'monthlyFee', event.target.value)} className={FIELD} placeholder="Not set" />
              </label>
              <label className="text-sm font-medium">Due day of month
                <input type="number" min="1" max="31" step="1" value={feeDueDay} onChange={(event) => update(classItem, 'feeDueDay', event.target.value)} className={FIELD} />
              </label>
              <button type="button" onClick={() => save(classItem)} disabled={savingId === classItem.id} className="h-11 rounded-xl bg-night-900 px-4 text-sm font-medium text-white disabled:opacity-50">
                {savingId === classItem.id ? 'Saving…' : 'Save'}
              </button>
            </div>
          )
        })}
        {!classes.length && <p className="py-8 text-center text-sm text-ink/55">Create a class before setting monthly fees.</p>}
      </div>
    </DialogFrame>
  )
}

function IssueVoucherDialog({ students, onSave, onClose }) {
  const [studentId, setStudentId] = useState('')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(toISODate())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await issueFeeVoucher({ studentId, title, amount, dueDate })
      await onSave()
      onClose()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogFrame title="Issue voucher" description="Create an additional fee invoice for a student." onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm font-medium">Student
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)} required className={FIELD}>
            <option value="">Select a student</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.admission_no ?? 'No admission no.'}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Fee description
          <input value={title} onChange={(event) => setTitle(event.target.value)} required className={FIELD} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Amount (PKR)
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required className={FIELD} />
          </label>
          <label className="block text-sm font-medium">Due date
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required className={FIELD} />
          </label>
        </div>
        {!students.length && <p className="text-sm text-amber-800">Add a student before issuing a voucher.</p>}
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl px-4 text-sm hover:bg-ink/5">Cancel</button>
          <button type="submit" disabled={saving || !students.length} className={BUTTON}>{saving ? 'Saving…' : 'Issue voucher'}</button>
        </div>
      </form>
    </DialogFrame>
  )
}

function BulkVoucherDialog({ classes, onSave, onClose }) {
  const [month, setMonth] = useState(currentMonth)
  const [classId, setClassId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const generatedCount = await generateMonthlyFeeVouchers(month, classId || null)
      await onSave(month)
      if (generatedCount === 0) {
        setError('No new vouchers were generated. Check that the selected class has a monthly fee and due day configured, and that eligible invoices do not already exist.')
        setSaving(false)
        return
      }
      onClose()
    } catch (saveError) {
      setError(saveError.message)
      setSaving(false)
    }
  }

  return (
    <DialogFrame title="Generate monthly vouchers" description="Create invoices for active students in classes with monthly fees configured." onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm font-medium">Billing month
          <input type="month" min="2000-01" value={month} onChange={(event) => setMonth(event.target.value)} required className={FIELD} />
        </label>
        <label className="block text-sm font-medium">Class
          <select value={classId} onChange={(event) => setClassId(event.target.value)} className={FIELD}>
            <option value="">All configured classes</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name} {classItem.section} · {classItem.monthly_fee == null ? 'Monthly fee not set' : pkr(classItem.monthly_fee)}
              </option>
            ))}
          </select>
        </label>
        <p className="rounded-xl bg-white/70 p-3 text-xs text-ink/60">Set each class's monthly fee and due day in “Set Class Fees” first. Existing invoices with payments or concessions are preserved.</p>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl px-4 text-sm hover:bg-ink/5">Cancel</button>
          <button type="submit" disabled={saving || !month} className={BUTTON}>{saving ? 'Generating…' : 'Generate vouchers'}</button>
        </div>
      </form>
    </DialogFrame>
  )
}

function PaymentDialog({ fee, student, onSave, onClose }) {
  const [amount, setAmount] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [lateFine, setLateFine] = useState('0')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [paidOn, setPaidOn] = useState(toISODate())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const balance = Number(fee.balance ?? (
    Number(fee.amount)
      + Number(fee.late_fine_total ?? 0)
      - Number(fee.discount_total ?? 0)
      - Number(fee.amount_paid)
  ))
  const newBalance = Math.max(
    0,
    balance + (Number(lateFine) || 0) - (Number(discount) || 0) - (Number(amount) || 0)
  )

  const submit = async (event) => {
    event.preventDefault()
    const payment = {
      amount: Number(amount) || 0,
      discount: Number(discount) || 0,
      lateFine: Number(lateFine) || 0,
      paidOn,
      paymentMode,
    }
    if (payment.amount < 0 || payment.discount < 0 || payment.lateFine < 0) {
      setError('Amounts cannot be negative.')
      return
    }
    if (payment.amount + payment.discount <= 0) {
      setError('Enter an amount received or a concession.')
      return
    }
    if (payment.amount + payment.discount > balance + payment.lateFine) {
      setError('Amount received and concession cannot exceed the outstanding balance plus the late fine.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(fee, payment, student)
      onClose()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogFrame title="Collect payment" description={`${student.name} · ${fee.title}`} onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={submit} className="mt-5 space-y-4">
        <p className="rounded-xl bg-white/70 p-3 text-sm">Outstanding balance: <strong>{pkr(balance)}</strong></p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Receiving amount (PKR)
            <input type="number" min="0" max={balance + (Number(lateFine) || 0)} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required className={FIELD} />
          </label>
          <label className="block text-sm font-medium">Discount / concession (PKR)
            <input type="number" min="0" max={balance + (Number(lateFine) || 0)} step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} className={FIELD} />
          </label>
          <label className="block text-sm font-medium">Late fine add-on (PKR)
            <input type="number" min="0" step="0.01" value={lateFine} onChange={(event) => setLateFine(event.target.value)} className={FIELD} />
          </label>
          <label className="block text-sm font-medium">Payment mode
            <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)} className={FIELD}>
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Easypaisa/JazzCash</option>
              <option>Cheque</option>
            </select>
          </label>
          <label className="block text-sm font-medium sm:col-span-2">Payment date
            <input type="date" max={toISODate()} value={paidOn} onChange={(event) => setPaidOn(event.target.value)} required className={FIELD} />
          </label>
        </div>
        <p className="text-xs text-ink/55">Balance after this transaction: <strong>{pkr(newBalance)}</strong></p>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl px-4 text-sm hover:bg-ink/5">Cancel</button>
          <button type="submit" disabled={saving} className={BUTTON}>{saving ? 'Saving…' : 'Collect payment'}</button>
        </div>
      </form>
    </DialogFrame>
  )
}

function StudentHistoryDialog({ student, onClose }) {
  if (!student) return null
  return (
    <DialogFrame title={`${student.name} · Fee history`} description={`Roll ${student.roll_no ?? '–'} · Admission ${student.admission_no ?? '–'} · ${student.className}`} onClose={onClose}>
      <div className="mt-5 max-h-[65vh] overflow-auto rounded-2xl bg-white/60">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 bg-white/90 text-xs text-ink/55"><tr>{['Payment date', 'Month', 'Amount received', 'Discount', 'Late fine', 'Mode', 'Remaining fee', 'Receipt no.'].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-ink/5">
            {student.history.map((payment) => <tr key={payment.id}><td className="px-4 py-3">{formatDate(payment.paid_on)}</td><td className="px-4 py-3">{payment.month?.length === 7 ? monthLabel(payment.month) : payment.month}</td><td className="px-4 py-3">{pkr(payment.amount)}</td><td className="px-4 py-3">{pkr(payment.discount)}</td><td className="px-4 py-3">{pkr(payment.late_fine)}</td><td className="px-4 py-3">{payment.payment_mode}</td><td className="px-4 py-3">{pkr(payment.remainingBalance)}</td><td className="px-4 py-3 font-mono text-xs">{payment.receipt_no ?? '–'}</td></tr>)}
            {!student.history.length && <tr><td colSpan="8" className="px-4 py-10 text-center text-ink/50">No payments recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </DialogFrame>
  )
}

function ReceiptDialog({ receipt, student, schoolName, month, onClose }) {
  if (!receipt || !student) return null
  const print = () => window.print()
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-night-950/60 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <h2 id="receipt-title" className="text-lg font-semibold">Fee receipt</h2>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm hover:bg-ink/5">Close</button>
        </div>
        <article className="fee-receipt mx-auto mt-5 max-w-lg border border-ink/15 p-6 text-ink sm:p-8">
          <header className="border-b border-dashed border-ink/25 pb-5 text-center">
            <h1 className="text-2xl font-bold">{schoolName}</h1>
            <p className="mt-1 text-sm text-ink/55">Fee payment receipt</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest">Receipt No. {receipt.receipt_no}</p>
          </header>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="text-ink/55">Student</dt><dd className="text-right font-semibold">{student.name}</dd>
            <dt className="text-ink/55">Roll Number</dt><dd className="text-right">{student.roll_no ?? '–'}</dd>
            <dt className="text-ink/55">Class</dt><dd className="text-right">{student.className}</dd>
            <dt className="text-ink/55">Fee month</dt><dd className="text-right">{monthLabel(month)}</dd>
            <dt className="text-ink/55">Payment date</dt><dd className="text-right">{formatDate(receipt.paid_on)}</dd>
            <dt className="text-ink/55">Payment mode</dt><dd className="text-right">{receipt.payment_mode}</dd>
          </dl>
          <div className="mt-6 space-y-3 border-t border-dashed border-ink/25 pt-4 text-sm">
            <p className="flex justify-between gap-4"><span>Amount paid</span><strong>{pkr(receipt.amount_paid)}</strong></p>
            {Number(receipt.discount) > 0 && <p className="flex justify-between gap-4"><span>Discount / concession</span><strong>{pkr(receipt.discount)}</strong></p>}
            {Number(receipt.late_fine) > 0 && <p className="flex justify-between gap-4"><span>Late fine</span><strong>{pkr(receipt.late_fine)}</strong></p>}
            <p className="flex justify-between gap-4 text-base"><span>Remaining balance</span><strong>{pkr(receipt.remaining_balance)}</strong></p>
          </div>
          <p className="mt-8 border-t border-ink/10 pt-4 text-center text-xs text-ink/45">Please retain this receipt for your records.</p>
        </article>
        <div className="mt-5 flex justify-end print:hidden">
          <button type="button" onClick={print} className="inline-flex h-11 items-center gap-2 rounded-xl bg-night-900 px-4 text-sm font-medium text-white"><Printer className="h-4 w-4" />Print receipt</button>
        </div>
        <style>{'@media print { body * { visibility: hidden !important; } .fee-receipt, .fee-receipt * { visibility: visible !important; } .fee-receipt { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: 100% !important; border: 0 !important; margin: 0 !important; } }'}</style>
      </section>
    </div>
  )
}

export default function Fees() {
  const [month, setMonth] = useState(currentMonth)
  const [activeTab, setActiveTab] = useState('ledger')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [classSettingsOpen, setClassSettingsOpen] = useState(false)
  const [voucherOpen, setVoucherOpen] = useState(false)
  const [bulkVoucherOpen, setBulkVoucherOpen] = useState(false)
  const [paymentFeeId, setPaymentFeeId] = useState('')
  const [historyStudentId, setHistoryStudentId] = useState('')
  const [receiptInfo, setReceiptInfo] = useState(null)
  const page = useAsync(() => fetchFeesPage(month), [month], ['classes', 'students', 'users', 'fees', 'fee_payments'])
  const data = page.data

  const studentsById = useMemo(
    () => Object.fromEntries((data?.students ?? []).map((student) => [student.id, student])),
    [data?.students]
  )
  const selectedHistoryStudent = data?.students.find((student) => student.id === historyStudentId) ?? null
  const selectedPaymentFee = data?.fees.find((fee) => fee.id === paymentFeeId) ?? null
  const selectedPaymentStudent = selectedPaymentFee ? studentsById[selectedPaymentFee.student_id] : null
  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (data?.fees ?? []).filter((fee) => {
      const student = studentsById[fee.student_id]
      if (!student) return false
      const balance = Number(fee.balance)
      const isPaid = balance === 0
      const isPartial = !isPaid && (
        Number(fee.amount_paid) > 0 || Number(fee.discount_total ?? 0) > 0
      )
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'paid' && isPaid)
        || (statusFilter === 'partial' && isPartial)
        || (statusFilter === 'unpaid' && !isPaid && !isPartial)
      const matchesSearch = !term || [student.name, student.roll_no, student.admission_no]
        .some((value) => String(value ?? '').toLowerCase().includes(term))
      return matchesStatus && matchesSearch
    })
  }, [data?.fees, search, statusFilter, studentsById])

  const onSaveClassFee = async (classId, monthlyFee, dueDay) => {
    await updateClassFee(classId, monthlyFee, dueDay)
    await page.reload()
  }

  const onGenerateVouchers = async (selectedMonth) => {
    setMonth(selectedMonth)
    await page.reload()
  }

  const submitPayment = async (fee, payment, student) => {
    const savedReceipt = await recordFeePayment(fee, payment)
    setReceiptInfo({
      receipt: savedReceipt,
      student,
      month: savedReceipt.fee_month?.slice(0, 7) ?? fee.fee_month?.slice(0, 7) ?? month,
    })
    await page.reload()
  }

  if (page.error) return <ErrorState error={page.error} onRetry={page.reload} />
  const visibleFeeIds = new Set(visibleRows.map((fee) => fee.id))
  const visiblePayments = (data?.payments ?? []).filter((payment) =>
    payment.paid_on.startsWith(month) && visibleFeeIds.has(payment.fee_id)
  )
  const collected = visiblePayments.reduce((total, payment) => total + Number(payment.amount), 0)
  const pending = data?.pending ?? 0
  const defaulterCount = new Set((data?.defaulters ?? []).map((fee) => fee.student_id)).size
  const filteredPayments = (data?.payments ?? []).filter((payment) => {
    const term = search.trim().toLowerCase()
    return payment.paid_on.startsWith(month)
      && (!term || [
        payment.student?.name,
        payment.student?.roll_no,
        payment.student?.admission_no,
        payment.receipt_no,
        payment.title,
      ].some((value) => String(value ?? '').toLowerCase().includes(term)))
  })

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader title="Fee collection" description="Manage school receivables, concessions, and payment transactions." />
          <label className="block min-w-48 text-sm font-medium">Fee month
            <input type="month" value={month} min="2000-01" max={currentMonth()} onChange={(event) => event.target.value && setMonth(event.target.value)} className={FIELD} />
          </label>
        </div>
      </GlassCard>

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-32 rounded-3xl" />)}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Wallet} label="Collected this month" value={pkr(collected)} hint={`${monthLabel(month)} · current ledger filters`} accent="from-emerald-500 to-emerald-300" />
            <StatCard icon={ReceiptText} label="Pending receivables" value={pkr(pending)} hint="Remaining balance across all active invoices" accent="from-amber-500 to-amber-300" />
            <StatCard icon={Users} label="Defaulter accounts" value={defaulterCount} hint="Unique students past due with a balance" accent="from-rose-500 to-rose-300" />
          </div>

          <div className="flex gap-6 border-b border-ink/10">
            <button type="button" onClick={() => setActiveTab('ledger')} className={`border-b-2 pb-3 text-sm font-semibold ${activeTab === 'ledger' ? 'border-lilac-600 text-night-900' : 'border-transparent text-ink/55 hover:text-ink'}`}>Fee invoices & ledger</button>
            <button type="button" onClick={() => setActiveTab('transactions')} className={`border-b-2 pb-3 text-sm font-semibold ${activeTab === 'transactions' ? 'border-lilac-600 text-night-900' : 'border-transparent text-ink/55 hover:text-ink'}`}>Transaction history ({filteredPayments.length})</button>
          </div>

          {activeTab === 'ledger' ? (
          <GlassCard className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
              <SectionHeader title="Student fee ledger" description={`Search, filter, and manage ${monthLabel(month)} fee records.`} />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setVoucherOpen(true)} className={BUTTON}><Plus className="h-4 w-4" />Issue voucher</button>
                <button type="button" onClick={() => setBulkVoucherOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-4 text-sm font-medium hover:bg-lilac-50">Generate monthly vouchers</button>
                <button type="button" onClick={() => setClassSettingsOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-4 text-sm font-medium hover:bg-lilac-50">Set Class Fees</button>
              </div>
            </div>
            <div className="grid gap-3 border-t border-white/70 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
              <label className="block text-sm font-medium">Search by student name, roll number, or admission number
                <span className="relative mt-1.5 block">
                  <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students…" className={`${FIELD} pl-10`} />
                </span>
              </label>
              <label className="block min-w-52 text-sm font-medium">Payment status
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={FIELD}>
                  <option value="all">All</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
            </div>
            <div className="overflow-x-auto border-t border-white/70">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-white/40 text-xs text-ink/55"><tr>{['Roll / Adm no.', 'Student name', 'Month / title', 'Total amount', 'Paid', 'Balance', 'Status', 'Actions'].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-white/70">
                  {visibleRows.map((fee) => {
                    const student = studentsById[fee.student_id]
                    const balance = Number(fee.balance)
                    const isPaid = balance === 0
                    const isPartial = !isPaid && (
                      Number(fee.amount_paid) > 0 || Number(fee.discount_total ?? 0) > 0
                    )
                    const status = isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'
                    const badge = isPaid
                      ? 'bg-emerald-50 text-emerald-700'
                      : isPartial ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'
                    return (
                      <tr key={fee.id} className="cursor-pointer hover:bg-white/45" onClick={() => setHistoryStudentId(student.id)}>
                        <td className="px-4 py-3.5"><span className="block">{student.roll_no ?? '–'}</span><span className="mt-0.5 block text-xs text-ink/50">{student.admission_no ?? '–'}</span></td>
                        <td className="px-4 py-3.5"><button type="button" onClick={(event) => { event.stopPropagation(); setHistoryStudentId(student.id) }} className="text-left font-semibold text-night-900 underline-offset-2 hover:underline">{student.name}</button><p className="mt-0.5 text-xs text-ink/45">{student.className}</p></td>
                        <td className="px-4 py-3.5"><span className="block">{monthLabel((fee.fee_month ?? fee.due_date).slice(0, 7))}</span><span className="mt-0.5 block text-xs text-ink/50">{fee.title}</span></td>
                        <td className="px-4 py-3.5">{pkr(Number(fee.amount) + Number(fee.late_fine_total ?? 0))}</td>
                        <td className="px-4 py-3.5">{pkr(fee.amount_paid)}</td>
                        <td className="px-4 py-3.5 font-medium">{pkr(balance)}</td>
                        <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge}`}>{status}</span></td>
                        <td className="px-4 py-3.5">{!isPaid && <button type="button" onClick={(event) => { event.stopPropagation(); setPaymentFeeId(fee.id) }} className="rounded-lg bg-night-900 px-3 py-2 text-xs font-medium text-white">Collect Payment</button>}</td>
                      </tr>
                    )
                  })}
                  {!visibleRows.length && <tr><td colSpan="8" className="px-5 py-10 text-center text-ink/50">No fee records match this search and status filter.</td></tr>}
                </tbody>
              </table>
            </div>
          </GlassCard>
          ) : (
            <GlassCard className="overflow-hidden">
              <div className="flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
                <SectionHeader title="Transaction receipt history" description={`Payments recorded in ${monthLabel(month)}.`} />
                <label className="block min-w-56 text-sm font-medium">Search transactions
                  <span className="relative mt-1.5 block">
                    <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Student or receipt number" className={`${FIELD} pl-10`} />
                  </span>
                </label>
              </div>
              <div className="overflow-x-auto border-t border-white/70">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead className="bg-white/40 text-xs text-ink/55"><tr>{['Receipt no.', 'Student', 'Invoice', 'Amount received', 'Discount', 'Late fine', 'Mode', 'Date'].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
                  <tbody className="divide-y divide-white/70">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-white/45">
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold">{payment.receipt_no}</td>
                        <td className="px-4 py-3.5 font-medium">{payment.student?.name ?? 'Unknown student'}<p className="mt-0.5 text-xs text-ink/45">Roll {payment.student?.roll_no ?? '–'} · Adm {payment.student?.admission_no ?? '–'}</p></td>
                        <td className="px-4 py-3.5">{payment.title}</td>
                        <td className="px-4 py-3.5 font-semibold text-emerald-700">{pkr(payment.amount)}</td>
                        <td className="px-4 py-3.5">{pkr(payment.discount)}</td>
                        <td className="px-4 py-3.5">{pkr(payment.late_fine)}</td>
                        <td className="px-4 py-3.5">{payment.payment_mode}</td>
                        <td className="px-4 py-3.5">{formatDate(payment.paid_on)}</td>
                      </tr>
                    ))}
                    {!filteredPayments.length && <tr><td colSpan="8" className="px-5 py-10 text-center text-ink/50">No payment transactions found for this month.</td></tr>}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </>
      )}
      {classSettingsOpen && data && <ClassFeeSettings classes={data.classes} onSave={onSaveClassFee} onClose={() => setClassSettingsOpen(false)} />}
      {voucherOpen && data && <IssueVoucherDialog students={data.students} onSave={page.reload} onClose={() => setVoucherOpen(false)} />}
      {bulkVoucherOpen && data && <BulkVoucherDialog classes={data.classes} onSave={onGenerateVouchers} onClose={() => setBulkVoucherOpen(false)} />}
      {selectedPaymentFee && selectedPaymentStudent && <PaymentDialog fee={selectedPaymentFee} student={selectedPaymentStudent} onSave={submitPayment} onClose={() => setPaymentFeeId('')} />}
      {selectedHistoryStudent && <StudentHistoryDialog student={selectedHistoryStudent} onClose={() => setHistoryStudentId('')} />}
      {receiptInfo && <ReceiptDialog receipt={receiptInfo.receipt} student={receiptInfo.student} schoolName={data?.schoolName ?? 'School'} month={receiptInfo.month} onClose={() => setReceiptInfo(null)} />}
    </div>
  )
}
