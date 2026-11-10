import { useMemo, useState } from 'react'
import { Plus, Printer, ReceiptText, Search, Users, Wallet, X } from 'lucide-react'
import { useAsync } from '../hooks/useAsync.js'
import { fetchFeesPage, issueFeeVoucher, recordFeePayment, updateClassFee } from '../lib/api.js'
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

function PaymentDialog({ fee, student, onSave, onClose }) {
  const [amount, setAmount] = useState('')
  const [paidOn, setPaidOn] = useState(toISODate())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const balance = Math.max(0, Number(fee.amount) - Number(fee.amount_paid))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(fee, Number(amount), paidOn, student)
      onClose()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogFrame title="Record payment" description={`${student.name} · ${fee.title}`} onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={submit} className="mt-5 space-y-4">
        <p className="rounded-xl bg-white/70 p-3 text-sm">Outstanding balance: <strong>{pkr(balance)}</strong></p>
        <label className="block text-sm font-medium">Amount paid (PKR)
          <input type="number" min="0.01" max={balance} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required className={FIELD} />
        </label>
        <label className="block text-sm font-medium">Payment date
          <input type="date" max={toISODate()} value={paidOn} onChange={(event) => setPaidOn(event.target.value)} required className={FIELD} />
        </label>
        <p className="text-xs text-ink/55">Remaining after payment: {pkr(Math.max(0, balance - (Number(amount) || 0)))}</p>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl px-4 text-sm hover:bg-ink/5">Cancel</button>
          <button type="submit" disabled={saving} className={BUTTON}>{saving ? 'Saving…' : 'Save payment'}</button>
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
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="sticky top-0 bg-white/90 text-xs text-ink/55"><tr>{['Payment date', 'Month', 'Amount paid', 'Remaining fee', 'Receipt no.'].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-ink/5">
            {student.history.map((payment) => <tr key={payment.id}><td className="px-4 py-3">{formatDate(payment.paid_on)}</td><td className="px-4 py-3">{payment.month?.length === 7 ? monthLabel(payment.month) : payment.month}</td><td className="px-4 py-3">{pkr(payment.amount)}</td><td className="px-4 py-3">{pkr(payment.remainingBalance)}</td><td className="px-4 py-3 font-mono text-xs">{payment.receipt_no ?? '–'}</td></tr>)}
            {!student.history.length && <tr><td colSpan="5" className="px-4 py-10 text-center text-ink/50">No payments recorded yet.</td></tr>}
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
          </dl>
          <div className="mt-6 space-y-3 border-t border-dashed border-ink/25 pt-4 text-sm">
            <p className="flex justify-between gap-4"><span>Amount paid</span><strong>{pkr(receipt.amount_paid)}</strong></p>
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [classSettingsOpen, setClassSettingsOpen] = useState(false)
  const [voucherOpen, setVoucherOpen] = useState(false)
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
  const currentDefaulters = (data?.defaulters ?? []).map((fee) => ({
    ...fee,
    student: studentsById[fee.student_id],
  }))
  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (data?.fees ?? []).filter((fee) => {
      const student = studentsById[fee.student_id]
      if (!student) return false
      const balance = Math.max(0, Number(fee.amount) - Number(fee.amount_paid))
      const isPaid = balance === 0
      const overdue = fee.due_date < toISODate() && !isPaid
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'paid' && isPaid)
        || (statusFilter === 'unpaid' && overdue)
      const matchesSearch = !term || [student.name, student.roll_no, student.admission_no, student.className]
        .some((value) => String(value ?? '').toLowerCase().includes(term))
      return matchesStatus && matchesSearch
    })
  }, [data?.fees, search, statusFilter, studentsById])

  const onSaveClassFee = async (classId, monthlyFee, dueDay) => {
    await updateClassFee(classId, monthlyFee, dueDay)
    await page.reload()
  }

  const submitPayment = async (fee, value, paidOn, student) => {
    const savedReceipt = await recordFeePayment(fee, value, paidOn)
    setReceiptInfo({
      receipt: savedReceipt,
      student,
      month: savedReceipt.fee_month?.slice(0, 7) ?? fee.fee_month?.slice(0, 7) ?? month,
    })
    await page.reload()
  }

  if (page.error) return <ErrorState error={page.error} onRetry={page.reload} />

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader title="Fee management" description="Configure class fees, record student payments, and review receipts." />
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
            <StatCard icon={Wallet} label="Collected this month" value={pkr(data.collected)} hint={monthLabel(month)} accent="from-emerald-500 to-emerald-300" />
            <StatCard icon={ReceiptText} label="Pending this month" value={pkr(data.pending)} hint="Unpaid balance on monthly invoices" accent="from-amber-500 to-amber-300" />
            <StatCard icon={Users} label="Defaulters" value={currentDefaulters.length} hint={`Overdue in ${monthLabel(month)}`} accent="from-rose-500 to-rose-300" />
          </div>

          <GlassCard className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
              <SectionHeader title="Student fee ledger" description={`Search, filter, and manage ${monthLabel(month)} fee records.`} />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setVoucherOpen(true)} className={BUTTON}><Plus className="h-4 w-4" />Issue voucher</button>
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
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid (Defaulters)</option>
                </select>
              </label>
            </div>
            <div className="overflow-x-auto border-t border-white/70">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-white/40 text-xs text-ink/55"><tr>{['Student', 'Roll no.', 'Admission no.', 'Class', 'Month', 'Amount', 'Paid', 'Balance', 'Status', 'Actions'].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-white/70">
                  {visibleRows.map((fee) => {
                    const student = studentsById[fee.student_id]
                    const balance = Math.max(0, Number(fee.amount) - Number(fee.amount_paid))
                    const isPaid = balance === 0
                    const overdue = fee.due_date < toISODate() && !isPaid
                    return (
                      <tr key={fee.id} className="cursor-pointer hover:bg-white/45" onClick={() => setHistoryStudentId(student.id)}>
                        <td className="px-4 py-3.5"><button type="button" onClick={(event) => { event.stopPropagation(); setHistoryStudentId(student.id) }} className="text-left font-semibold text-night-900 underline-offset-2 hover:underline">{student.name}</button><p className="mt-0.5 text-xs text-ink/45">{fee.title}</p></td>
                        <td className="px-4 py-3.5">{student.roll_no ?? '–'}</td>
                        <td className="px-4 py-3.5">{student.admission_no ?? '–'}</td>
                        <td className="px-4 py-3.5">{student.className}</td>
                        <td className="px-4 py-3.5">{monthLabel((fee.fee_month ?? fee.due_date).slice(0, 7))}</td>
                        <td className="px-4 py-3.5">{pkr(fee.amount)}</td>
                        <td className="px-4 py-3.5">{pkr(fee.amount_paid)}</td>
                        <td className="px-4 py-3.5 font-medium">{pkr(balance)}</td>
                        <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isPaid ? 'bg-emerald-50 text-emerald-700' : overdue ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{isPaid ? 'Paid' : overdue ? 'Overdue' : 'Unpaid'}</span></td>
                        <td className="px-4 py-3.5">{!isPaid && <button type="button" onClick={(event) => { event.stopPropagation(); setPaymentFeeId(fee.id) }} className="rounded-lg bg-night-900 px-3 py-2 text-xs font-medium text-white">Record Payment</button>}</td>
                      </tr>
                    )
                  })}
                  {!visibleRows.length && <tr><td colSpan="10" className="px-5 py-10 text-center text-ink/50">No fee records match this search and status filter.</td></tr>}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
      {classSettingsOpen && data && <ClassFeeSettings classes={data.classes} onSave={onSaveClassFee} onClose={() => setClassSettingsOpen(false)} />}
      {voucherOpen && data && <IssueVoucherDialog students={data.students} onSave={page.reload} onClose={() => setVoucherOpen(false)} />}
      {selectedPaymentFee && selectedPaymentStudent && <PaymentDialog fee={selectedPaymentFee} student={selectedPaymentStudent} onSave={submitPayment} onClose={() => setPaymentFeeId('')} />}
      {selectedHistoryStudent && <StudentHistoryDialog student={selectedHistoryStudent} onClose={() => setHistoryStudentId('')} />}
      {receiptInfo && <ReceiptDialog receipt={receiptInfo.receipt} student={receiptInfo.student} schoolName={data?.schoolName ?? 'School'} month={receiptInfo.month} onClose={() => setReceiptInfo(null)} />}
    </div>
  )
}
