import { useMemo, useState } from 'react'
import { Check, Printer, ReceiptText, Search, Users, Wallet } from 'lucide-react'
import { useAsync } from '../hooks/useAsync.js'
import { fetchFeesPage, recordFeePayment, updateClassFee } from '../lib/api.js'
import { formatDate, pkr, toISODate } from '../lib/format.js'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { ErrorState, Skeleton } from '../components/ui/States.jsx'

const FIELD = 'mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60'

function currentMonth() {
  return toISODate().slice(0, 7)
}

function monthLabel(value) {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T00:00:00`))
}

function ClassFeeSettings({ classes, onSave }) {
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
    <GlassCard className="p-5 sm:p-6">
      <SectionHeader title="Class monthly fees" description="Set each class's monthly fee and recurring due day." />
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
    </GlassCard>
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
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [receipt, setReceipt] = useState(null)
  const page = useAsync(() => fetchFeesPage(month), [month], ['classes', 'students', 'users', 'fees', 'fee_payments'])
  const data = page.data

  const feeByStudent = useMemo(
    () => Object.fromEntries((data?.fees ?? []).map((fee) => [fee.student_id, fee])),
    [data?.fees]
  )
  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (data?.students ?? []).filter((student) =>
      !term || [student.name, student.roll_no, student.admission_no, student.className]
        .some((value) => String(value ?? '').toLowerCase().includes(term))
    )
  }, [data?.students, search])
  const selectedStudent = data?.students.find((student) => student.id === selectedStudentId) ?? null
  const selectedFee = selectedStudent ? feeByStudent[selectedStudent.id] : null
  const remaining = selectedFee ? Math.max(0, Number(selectedFee.amount) - Number(selectedFee.amount_paid)) : 0
  const currentDefaulters = (data?.defaulters ?? []).map((fee) => ({
    ...fee,
    student: data.students.find((student) => student.id === fee.student_id),
  }))

  const onSaveClassFee = async (classId, monthlyFee, dueDay) => {
    await updateClassFee(classId, monthlyFee, dueDay)
    await page.reload()
  }

  const submitPayment = async (event) => {
    event.preventDefault()
    if (!selectedStudent || !selectedFee) return
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0 || value > remaining) {
      setError(`Enter a payment greater than zero and no more than ${pkr(remaining)}.`)
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const savedReceipt = await recordFeePayment(selectedFee, value, toISODate())
      setReceipt(savedReceipt)
      setMessage(`Recorded ${pkr(value)} payment for ${selectedStudent.name}.`)
      setAmount('')
      await page.reload()
    } catch (paymentError) {
      setError(paymentError.message)
    } finally {
      setSaving(false)
    }
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
            <StatCard icon={Users} label="Defaulters" value={currentDefaulters.length} hint={month === currentMonth() ? 'Due date passed, balance remaining' : 'Shown for the current month only'} accent="from-rose-500 to-rose-300" />
          </div>

          <ClassFeeSettings classes={data.classes} onSave={onSaveClassFee} />

          <GlassCard className="p-5 sm:p-6">
            <SectionHeader title="Student payment" description={`Search a student and collect their ${monthLabel(month)} fee.`} />
            <label className="mt-4 block text-sm font-medium">Search by student name, roll number, or admission number
              <span className="relative mt-1.5 block">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students…" className={`${FIELD} pl-10`} />
              </span>
            </label>
            {search && (
              <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-ink/10 bg-white">
                {filteredStudents.slice(0, 8).map((student) => (
                  <button key={student.id} type="button" onClick={() => { setSelectedStudentId(student.id); setSearch(student.name); setAmount(''); setError('') }} className="block w-full border-b border-ink/5 px-4 py-3 text-left text-sm last:border-0 hover:bg-lilac-50">
                    <span className="font-medium">{student.name}</span><span className="ml-2 text-ink/50">Roll {student.roll_no ?? '–'} · {student.className}</span>
                  </button>
                ))}
                {!filteredStudents.length && <p className="px-4 py-3 text-sm text-ink/50">No students match this search.</p>}
              </div>
            )}

            {selectedStudent && (
              <div className="mt-5 rounded-2xl bg-white/65 p-4 sm:p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div><h3 className="font-semibold">{selectedStudent.name}</h3><p className="mt-1 text-sm text-ink/55">Roll {selectedStudent.roll_no ?? '–'} · {selectedStudent.admission_no} · {selectedStudent.className}</p></div>
                  {selectedFee && <div className="text-right"><p className="text-xs text-ink/50">Total fee · {monthLabel(month)}</p><p className="text-lg font-semibold">{pkr(selectedFee.amount)}</p><p className="text-xs text-ink/50">Due {formatDate(selectedFee.due_date)}</p></div>}
                </div>
                {!selectedFee ? (
                  <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No monthly fee is configured for this student's class, or there is no active class assignment.</p>
                ) : (
                  <>
                    <p className="mt-4 text-sm">Paid to date: <strong>{pkr(selectedFee.amount_paid)}</strong> · Remaining: <strong>{pkr(remaining)}</strong></p>
                    {remaining > 0 && <form onSubmit={submitPayment} className="mt-4 flex flex-wrap items-end gap-3">
                      <label className="block min-w-48 flex-1 text-sm font-medium">Amount paid (PKR)
                        <input type="number" min="0.01" max={remaining} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required className={FIELD} />
                      </label>
                      <button type="submit" disabled={saving} className="h-11 rounded-xl bg-night-900 px-5 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : 'Submit payment'}</button>
                      <p className="w-full text-xs text-ink/55">Balance after this payment: {pkr(Math.max(0, remaining - (Number(amount) || 0)))}</p>
                    </form>}
                  </>
                )}
              </div>
            )}
            {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            {message && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" />{message}</p>}
          </GlassCard>

          {selectedStudent && (
            <GlassCard className="overflow-hidden">
              <div className="p-5 sm:p-6"><SectionHeader title={`${selectedStudent.name} · Payment history`} description="All recorded fee payments for this student." /></div>
              <div className="overflow-x-auto border-t border-white/70">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-white/40 text-xs text-ink/55"><tr>{['Payment date', 'Month', 'Amount paid', 'Remaining fee', 'Receipt no.'].map((label) => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead>
                  <tbody className="divide-y divide-white/70">
                    {selectedStudent.history.map((payment) => <tr key={payment.id}><td className="px-5 py-3.5">{formatDate(payment.paid_on)}</td><td className="px-5 py-3.5">{payment.month?.length === 7 ? monthLabel(payment.month) : payment.month}</td><td className="px-5 py-3.5">{pkr(payment.amount)}</td><td className="px-5 py-3.5">{pkr(payment.remainingBalance)}</td><td className="px-5 py-3.5 font-mono text-xs">{payment.receipt_no ?? '–'}</td></tr>)}
                    {!selectedStudent.history.length && <tr><td colSpan="5" className="px-5 py-10 text-center text-ink/50">No payments recorded yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          <GlassCard className="overflow-hidden">
            <div className="p-5 sm:p-6"><SectionHeader title="Unpaid / defaulters" description="Students with a remaining monthly fee after the due date has passed." /></div>
            <div className="overflow-x-auto border-t border-white/70">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-white/40 text-xs text-ink/55"><tr>{['Student', 'Roll no.', 'Class', 'Due date', 'Pending amount'].map((label) => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-white/70">
                  {currentDefaulters.map((fee) => <tr key={fee.id}><td className="px-5 py-3.5 font-medium">{fee.student?.name ?? 'Unknown student'}</td><td className="px-5 py-3.5">{fee.student?.roll_no ?? '–'}</td><td className="px-5 py-3.5">{fee.student?.className ?? 'Unassigned'}</td><td className="px-5 py-3.5">{formatDate(fee.due_date)}</td><td className="px-5 py-3.5 font-semibold">{pkr(Number(fee.amount) - Number(fee.amount_paid))}</td></tr>)}
                  {!currentDefaulters.length && <tr><td colSpan="5" className="px-5 py-10 text-center text-ink/50">{month === currentMonth() ? 'No overdue students for this month.' : 'Defaulters are shown for the current month only.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
      {receipt && <ReceiptDialog receipt={receipt} student={selectedStudent} schoolName={data?.schoolName ?? 'School'} month={month} onClose={() => setReceipt(null)} />}
    </div>
  )
}
