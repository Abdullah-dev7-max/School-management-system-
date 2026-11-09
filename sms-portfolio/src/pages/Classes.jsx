import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAsync } from '../hooks/useAsync.js'
import { createClass, deleteClass, fetchClassesPage, updateClass } from '../lib/api.js'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import { Skeleton } from '../components/ui/States.jsx'
import { Field, FORM_BUTTON, FormError, ManagementError, ManagementModal, SelectField } from '../components/admin/ManagementUi.jsx'

function ClassForm({ classItem, teachers, onClose, onSave }) {
  const [form, setForm] = useState({
    name: classItem?.name ?? '',
    section: classItem?.section ?? '',
    room: classItem?.room ?? '',
    academicYear: classItem?.academic_year ?? `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, '0')}`,
    classTeacherId: classItem?.class_teacher_id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const change = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ ...form, name: form.name.trim(), section: form.section.trim(), room: form.room.trim() })
    } catch (saveError) {
      setError(saveError.message)
      setSaving(false)
    }
  }

  return (
    <ManagementModal title={classItem ? 'Edit class' : 'Create new class'} description="Set up the class, section, and assigned teacher." onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Class name" name="name" value={form.name} onChange={change} maxLength={80} required autoFocus />
          <Field label="Section" name="section" value={form.section} onChange={change} placeholder="A" maxLength={24} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Room" name="room" value={form.room} onChange={change} maxLength={80} />
          <Field label="Academic year" name="academicYear" value={form.academicYear} onChange={change} maxLength={20} required />
        </div>
        <SelectField label="Class teacher" name="classTeacherId" value={form.classTeacherId} onChange={change}>
          <option value="">Unassigned</option>
          {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.teacher?.full_name} · {teacher.subject}</option>)}
        </SelectField>
        <FormError>{error}</FormError>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={saving} className={`${FORM_BUTTON} hover:bg-ink/5`}>Cancel</button>
          <button type="submit" disabled={saving} className={`${FORM_BUTTON} bg-night-900 text-white`}>{saving ? 'Saving…' : classItem ? 'Save changes' : 'Create class'}</button>
        </div>
      </form>
    </ManagementModal>
  )
}

export default function Classes() {
  const classesQuery = useAsync(fetchClassesPage, [], ['classes', 'students', 'teachers', 'users'])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  const save = async (values) => {
    if (editing) await updateClass(editing.id, values)
    else await createClass(values)
    setDialogOpen(false)
    setEditing(null)
    await classesQuery.reload()
  }

  const remove = async (classItem) => {
    if (!window.confirm(`Delete ${classItem.name} ${classItem.section}? Enrolled students will become unassigned.`)) return
    setBusyId(classItem.id)
    setActionError('')
    try {
      await deleteClass(classItem.id)
      await classesQuery.reload()
    } catch (error) {
      setActionError(error.message)
    } finally {
      setBusyId(null)
    }
  }

  if (classesQuery.error) return <ManagementError error={classesQuery.error} onRetry={classesQuery.reload} />

  return (
    <div className="space-y-5">
      {actionError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p>}
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader
          title="Classes"
          description="View class rosters, student totals, and assigned teachers."
          action={<button type="button" onClick={() => { setEditing(null); setDialogOpen(true) }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-night-900 px-4 text-sm font-medium text-white"><Plus className="h-4 w-4" />Create new class</button>}
        />
      </GlassCard>
      {!classesQuery.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-44 rounded-3xl" />)}</div>
      ) : classesQuery.data.classes.length === 0 ? (
        <GlassCard className="p-12 text-center text-sm text-ink/55">No classes yet. Create a class to get started.</GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classesQuery.data.classes.map((item) => (
            <GlassCard key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-lilac-600">{item.academic_year}</p>
                  <h2 className="mt-1 text-xl font-semibold">{item.name} <span className="text-ink/50">{item.section}</span></h2>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => { setEditing(item); setDialogOpen(true) }} aria-label={`Edit ${item.name} ${item.section}`} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-lilac-100"><Pencil className="h-4 w-4" /></button>
                  <button type="button" disabled={busyId === item.id} onClick={() => remove(item)} aria-label={`Delete ${item.name} ${item.section}`} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-rose-100 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                </div>
                <span className="rounded-xl bg-lilac-100 px-3 py-1.5 text-sm font-semibold text-lilac-600">{item.studentCount} students</span>
              </div>
              <dl className="mt-5 space-y-2 border-t border-ink/5 pt-4 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-ink/55">Class teacher</dt><dd className="text-right font-medium">{item.classTeacher ?? 'Unassigned'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink/55">Room</dt><dd className="font-medium">{item.room ?? '–'}</dd></div>
              </dl>
            </GlassCard>
          ))}
        </div>
      )}
      {dialogOpen && <ClassForm key={editing?.id ?? 'new'} classItem={editing} teachers={classesQuery.data?.teachers ?? []} onClose={() => setDialogOpen(false)} onSave={save} />}
    </div>
  )
}
