import { useMemo, useState } from 'react'
import { Plus, Search, Trash2, UserRoundPen, X } from 'lucide-react'
import { useAsync } from '../hooks/useAsync.js'
import { createTeacher, deleteTeacher, fetchTeachersPage, updateTeacher } from '../lib/api.js'
import Badge from '../components/ui/Badge.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import { Skeleton } from '../components/ui/States.jsx'
import { Field, FORM_BUTTON, FormError, ManagementError, ManagementModal, SelectField } from '../components/admin/ManagementUi.jsx'

const STATUS = {
  active: { label: 'Active', tone: 'success' },
  inactive: { label: 'Inactive', tone: 'warning' },
}

function TeacherForm({ teacher, onClose, onSave }) {
  const [form, setForm] = useState({
    fullName: teacher?.teacher?.full_name ?? '',
    email: teacher?.teacher?.email ?? '',
    phone: teacher?.teacher?.phone ?? '',
    employeeCode: teacher?.employee_code ?? '',
    subject: teacher?.subject ?? '',
    status: teacher?.status ?? 'active',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const change = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        employeeCode: form.employeeCode.trim(),
        subject: form.subject.trim(),
        phone: form.phone.trim(),
      })
    } catch (saveError) {
      setError(saveError.message)
      setSaving(false)
    }
  }

  return (
    <ManagementModal
      title={teacher ? 'Edit teacher' : 'Add new teacher'}
      description="Teacher profile and employment details"
      onClose={onClose}
    >
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="Full name" name="fullName" value={form.fullName} onChange={change} maxLength={120} required autoFocus />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" type="email" name="email" value={form.email} onChange={change} maxLength={255} required />
          <Field label="Phone" type="tel" name="phone" value={form.phone} onChange={change} maxLength={32} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee code" name="employeeCode" value={form.employeeCode} onChange={change} maxLength={64} required />
          <Field label="Subject" name="subject" value={form.subject} onChange={change} maxLength={120} required />
        </div>
        <SelectField label="Status" name="status" value={form.status} onChange={change}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className={`${FORM_BUTTON} hover:bg-ink/5`}>Cancel</button>
          <button type="submit" disabled={saving} className={`${FORM_BUTTON} bg-night-900 text-white`}>{saving ? 'Saving…' : teacher ? 'Save changes' : 'Add teacher'}</button>
        </div>
      </form>
    </ManagementModal>
  )
}

export default function Teachers() {
  const teachersQuery = useAsync(fetchTeachersPage, [], ['teachers', 'users'])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const teachers = teachersQuery.data ?? []

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return teachers.filter((teacher) =>
      [teacher.teacher?.full_name, teacher.teacher?.email, teacher.teacher?.phone, teacher.subject, teacher.employee_code]
        .some((value) => String(value ?? '').toLowerCase().includes(term))
    )
  }, [teachers, query])

  const openForm = (teacher = null) => {
    setEditing(teacher)
    setDialogOpen(true)
    setError('')
  }

  const save = async (values) => {
    if (editing) await updateTeacher(editing, values)
    else await createTeacher(values)
    setDialogOpen(false)
    setEditing(null)
    await teachersQuery.reload()
  }

  const remove = async (teacher) => {
    const name = teacher.teacher?.full_name ?? teacher.employee_code
    if (!window.confirm(`Delete teacher ${name}? Assigned classes will become unassigned.`)) return
    setBusyId(teacher.id)
    setError('')
    try {
      await deleteTeacher(teacher.user_id)
      await teachersQuery.reload()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setBusyId(null)
    }
  }

  if (teachersQuery.error) return <ManagementError error={teachersQuery.error} onRetry={teachersQuery.reload} />

  return (
    <div className="space-y-5">
      {error && <div role="alert" className="flex justify-between rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss"><X className="h-4 w-4" /></button></div>}
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader
          title="Teachers"
          description="Manage teaching staff and subjects."
          action={<button type="button" onClick={() => openForm()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-night-900 px-4 text-sm font-medium text-white"><Plus className="h-4 w-4" />Add new teacher</button>}
        />
      </GlassCard>
      {!teachersQuery.data ? (
        <GlassCard className="space-y-3 p-5"><Skeleton className="h-11" /><Skeleton className="h-64" /></GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="p-4 sm:p-5">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 text-ink/50 focus-within:ring-2 focus-within:ring-lilac-500/60">
              <Search className="h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search teachers" placeholder="Search name, subject, email, or employee code" className="w-full bg-transparent text-sm text-ink outline-none" />
            </label>
          </div>
          <div className="overflow-x-auto border-t border-white/70">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-white/40 text-xs text-ink/55"><tr>
                {['Name', 'Subject', 'Email', 'Phone', 'Status'].map((label) => <th key={label} scope="col" className="px-5 py-3 font-medium">{label}</th>)}
                <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-white/70">
                {filtered.map((teacher) => {
                  const status = STATUS[teacher.status] ?? STATUS.active
                  return <tr key={teacher.id} className="hover:bg-white/50">
                    <td className="px-5 py-3.5"><p className="font-medium">{teacher.teacher?.full_name ?? 'Unknown teacher'}</p><p className="text-xs text-ink/50">{teacher.employee_code}</p></td>
                    <td className="px-5 py-3.5">{teacher.subject}</td>
                    <td className="px-5 py-3.5">{teacher.teacher?.email ?? '–'}</td>
                    <td className="px-5 py-3.5">{teacher.teacher?.phone || '–'}</td>
                    <td className="px-5 py-3.5"><Badge tone={status.tone} dot>{status.label}</Badge></td>
                    <td className="px-5 py-3.5"><div className="flex justify-end gap-1">
                      <button type="button" aria-label={`Edit ${teacher.teacher?.full_name}`} onClick={() => openForm(teacher)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-lilac-100"><UserRoundPen className="h-4 w-4" /></button>
                      <button type="button" aria-label={`Delete ${teacher.teacher?.full_name}`} disabled={busyId === teacher.id} onClick={() => remove(teacher)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-rose-100 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                    </div></td>
                  </tr>
                })}
                {!filtered.length && <tr><td colSpan="6" className="px-5 py-12 text-center text-ink/55">No teachers found.</td></tr>}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
      {dialogOpen && <TeacherForm key={editing?.id ?? 'new'} teacher={editing} onClose={() => setDialogOpen(false)} onSave={save} />}
    </div>
  )
}
