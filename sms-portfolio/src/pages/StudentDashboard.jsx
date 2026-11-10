import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BookOpen, CalendarCheck, Download, GraduationCap, Wallet } from 'lucide-react'
import { useRole } from '../context/RoleContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { fetchRoleDashboard, openClassNote } from '../lib/api.js'
import { formatDate, pkr } from '../lib/format.js'
import Badge from '../components/ui/Badge.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import { ManagementError } from '../components/admin/ManagementUi.jsx'
import { Skeleton } from '../components/ui/States.jsx'

export default function StudentDashboard() {
  const { profile, session } = useRole()
  const navigate = useNavigate()
  const [noteError, setNoteError] = useState('')
  const [openingNoteId, setOpeningNoteId] = useState('')
  const hasRoleSession = Boolean(window.localStorage.getItem('scholara.role.session') && session?.token)
  const dashboard = useAsync(
    () => fetchRoleDashboard(profile, session?.token),
    [profile.id, profile.role, session?.token]
  )
  const student = dashboard.data?.students?.[0]
  const outstanding = (dashboard.data?.fees ?? []).reduce(
    (total, fee) => total + Math.max(0, Number(fee.amount) + Number(fee.late_fine_total ?? 0) - Number(fee.discount_total ?? 0) - Number(fee.amount_paid)),
    0
  )
  const attendance = dashboard.data?.attendance ?? []
  const present = attendance.filter((record) => record.status === 'present' || record.status === 'late').length
  const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : null
  const openNote = async (noteId) => {
    setOpeningNoteId(noteId)
    setNoteError('')
    try {
      await openClassNote(session.token, noteId)
    } catch (error) {
      setNoteError(error.message)
      setOpeningNoteId('')
    }
  }

  useEffect(() => {
    if (dashboard.error?.status === 401 || dashboard.error?.status === 403) {
      window.localStorage.removeItem('scholara.role.session')
      navigate('/login', { replace: true })
    }
  }, [dashboard.error, navigate])

  if (!hasRoleSession) return <Navigate to="/login" replace />
  if (dashboard.error) return <ManagementError error={dashboard.error} onRetry={dashboard.reload} />

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader
          title={`Welcome, ${profile.full_name}`}
          description={student?.classes ? `${student.classes.name} ${student.classes.section} · Student dashboard` : 'Your personal academic and fee overview'}
        />
      </GlassCard>
      {!dashboard.data ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-32 rounded-3xl" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={GraduationCap} label="Class" value={student?.classes ? `${student.classes.name} ${student.classes.section}` : 'Unassigned'} hint={`Roll no. ${student?.roll_no ?? '—'}`} />
            <StatCard icon={Wallet} label="Outstanding fees" value={pkr(outstanding)} hint="Across your fee invoices" accent="from-amber-500 to-amber-300" />
            <StatCard icon={CalendarCheck} label="Recent attendance" value={attendanceRate == null ? '—' : `${attendanceRate}%`} hint={`${attendance.length} recent records`} accent="from-sky-500 to-sky-300" />
          </div>

          <GlassCard className="overflow-hidden">
            <div className="p-5 sm:p-6"><SectionHeader title="My fee ledger" description="Your personal invoices and current balances" /></div>
            <div className="overflow-x-auto border-t border-white/70">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-white/40 text-xs text-ink/55">
                  <tr>{['Month / title', 'Due date', 'Amount', 'Paid', 'Balance', 'Status'].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {(dashboard.data.fees ?? []).map((fee) => {
                    const balance = Math.max(0, Number(fee.amount) + Number(fee.late_fine_total ?? 0) - Number(fee.discount_total ?? 0) - Number(fee.amount_paid))
                    const status = balance === 0 ? 'Paid' : Number(fee.amount_paid) > 0 ? 'Partial' : 'Unpaid'
                    return (
                      <tr key={fee.id}>
                        <td className="px-4 py-3 font-medium">{fee.title}</td>
                        <td className="px-4 py-3 text-ink/65">{formatDate(fee.due_date)}</td>
                        <td className="px-4 py-3">{pkr(fee.amount)}</td>
                        <td className="px-4 py-3">{pkr(fee.amount_paid)}</td>
                        <td className="px-4 py-3">{pkr(balance)}</td>
                        <td className="px-4 py-3"><Badge tone={status === 'Paid' ? 'success' : status === 'Partial' ? 'warning' : 'danger'}>{status}</Badge></td>
                      </tr>
                    )
                  })}
                  {!dashboard.data.fees?.length && <tr><td colSpan="6" className="px-4 py-10 text-center text-ink/55">No fee invoices are available.</td></tr>}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="p-5 sm:p-6"><SectionHeader title="Payment history" description="Recorded payments against your invoices" /></div>
            <div className="overflow-x-auto border-t border-white/70">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-white/40 text-xs text-ink/55">
                  <tr>{['Date', 'Month / title', 'Receipt no.', 'Amount paid', 'Remaining'].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {(dashboard.data.payments ?? []).map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3">{formatDate(payment.paid_on)}</td>
                      <td className="px-4 py-3">{payment.title}</td>
                      <td className="px-4 py-3">{payment.receipt_no}</td>
                      <td className="px-4 py-3">{pkr(payment.amount)}</td>
                      <td className="px-4 py-3">{pkr(payment.remaining_balance)}</td>
                    </tr>
                  ))}
                  {!dashboard.data.payments?.length && <tr><td colSpan="5" className="px-4 py-10 text-center text-ink/55">No payments have been recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="p-5 sm:p-6"><SectionHeader title="Recent attendance" description="Your individual attendance records" /></div>
            <ul className="divide-y divide-ink/5 border-t border-white/70 px-5 sm:px-6">
              {attendance.slice(0, 10).map((record) => (
                <li key={`${record.attended_on}-${record.student_id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>{formatDate(record.attended_on)}</span>
                  <Badge tone={record.status === 'present' ? 'success' : record.status === 'late' || record.status === 'excused' ? 'warning' : 'danger'}>{record.status}</Badge>
                </li>
              ))}
              {!attendance.length && <li className="py-8 text-center text-sm text-ink/55">No attendance records are available.</li>}
            </ul>
          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="p-5 sm:p-6"><SectionHeader title="Class notes" description="Learning materials shared by your teacher" /></div>
            {noteError && <p role="alert" className="mx-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 sm:mx-6">{noteError}</p>}
            <ul className="divide-y divide-ink/5 border-t border-white/70 px-5 sm:px-6">
              {(dashboard.data.notes ?? []).map((note) => (
                <li key={note.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700"><BookOpen className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{note.title}</p>
                      <p className="mt-0.5 truncate text-xs text-ink/55">{note.subject} · {note.file_name} · {formatDate(note.created_at)}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => openNote(note.id)} disabled={openingNoteId === note.id} className="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 text-sm font-medium hover:bg-lilac-50 disabled:opacity-50">
                    <Download className="h-4 w-4" />{openingNoteId === note.id ? 'Opening…' : 'Open notes'}
                  </button>
                </li>
              ))}
              {!dashboard.data.notes?.length && <li className="py-9 text-center text-sm text-ink/55">Your teacher has not shared any notes yet.</li>}
            </ul>
          </GlassCard>
        </>
      )}
    </div>
  )
}
