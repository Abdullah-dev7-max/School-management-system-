import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useAsync } from '../hooks/useAsync.js'
import { deleteTimetableSlot, fetchTimetablePage, saveTimetableSlot } from '../lib/api.js'
import { formatTime } from '../lib/format.js'
import Badge from '../components/ui/Badge.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import { Field, FORM_BUTTON, FormError, ManagementError, ManagementModal, SelectField } from '../components/admin/ManagementUi.jsx'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const INITIAL = {
  classId: '',
  teacherId: '',
  dayOfWeek: '1',
  period: '1',
  startsAt: '08:00',
  endsAt: '08:40',
  subject: '',
  room: '',
}

function SlotForm({ slot, classes, teachers, onClose, onSave }) {
  const [values, setValues] = useState(slot ? {
    classId: slot.class_id,
    teacherId: slot.teacher_id ?? '',
    dayOfWeek: String(slot.day_of_week),
    period: String(slot.period),
    startsAt: slot.starts_at.slice(0, 5),
    endsAt: slot.ends_at.slice(0, 5),
    subject: slot.subject,
    room: slot.room ?? '',
  } : {
    ...INITIAL,
    classId: classes[0]?.id ?? '',
    teacherId: teachers[0]?.id ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSave(values)
    } catch (saveError) {
      setError(saveError.code === '23505'
        ? 'This class already has a lesson in that period. Choose another period or edit the existing lesson.'
        : saveError.message)
      setBusy(false)
    }
  }

  return (
    <ManagementModal title={slot ? 'Edit timetable lesson' : 'Add timetable lesson'} description="Publish a class period for teachers and students." onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Class" name="classId" value={values.classId} onChange={change} required>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name} {item.section}</option>)}
          </SelectField>
          <SelectField label="Teacher" name="teacherId" value={values.teacherId} onChange={change}>
            <option value="">Not assigned</option>
            {teachers.map((item) => <option key={item.id} value={item.id}>{item.teacher?.full_name ?? 'Teacher'} · {item.subject}</option>)}
          </SelectField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Day" name="dayOfWeek" value={values.dayOfWeek} onChange={change}>
            {DAYS.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}
          </SelectField>
          <Field label="Period" name="period" type="number" min="1" max="8" value={values.period} onChange={change} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start time" name="startsAt" type="time" value={values.startsAt} onChange={change} required />
          <Field label="End time" name="endsAt" type="time" value={values.endsAt} onChange={change} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject" name="subject" value={values.subject} onChange={change} maxLength={120} required />
          <Field label="Room (optional)" name="room" value={values.room} onChange={change} maxLength={80} />
        </div>
        {error && <FormError>{error}</FormError>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={busy} className={`${FORM_BUTTON} hover:bg-ink/5`}>Cancel</button>
          <button type="submit" disabled={busy || !classes.length} className={`${FORM_BUTTON} bg-night-900 text-white`}>{busy ? 'Saving…' : slot ? 'Save changes' : 'Add lesson'}</button>
        </div>
      </form>
    </ManagementModal>
  )
}

export default function Timetable() {
  const query = useAsync(fetchTimetablePage, [], ['classes', 'teachers', 'timetable_slots'])
  const [editing, setEditing] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const classes = query.data?.classes ?? []
  const teachers = query.data?.teachers ?? []
  const slots = query.data?.slots ?? []

  const save = async (values) => {
    await saveTimetableSlot(values, editing?.id)
    setDialogOpen(false)
    setEditing(null)
    await query.reload()
  }

  const remove = async (slot) => {
    if (!window.confirm(`Delete ${DAYS[slot.day_of_week - 1]} period ${slot.period} for ${slot.subject}?`)) return
    setBusyId(slot.id)
    setError('')
    try {
      await deleteTimetableSlot(slot.id)
      await query.reload()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setBusyId('')
    }
  }

  if (query.error) return <ManagementError error={query.error} onRetry={query.reload} />

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader
          title="Class timetable"
          description="Add lesson periods for students and teachers to view on their dashboards."
          action={<button type="button" onClick={() => { setEditing(null); setDialogOpen(true) }} disabled={!classes.length} className="inline-flex h-10 items-center gap-2 rounded-xl bg-night-900 px-4 text-sm font-medium text-white disabled:opacity-50"><Plus className="h-4 w-4" />Add lesson</button>}
        />
      </GlassCard>
      {!query.data ? (
        <GlassCard className="p-8 text-center text-sm text-ink/55">Loading timetable…</GlassCard>
      ) : !classes.length ? (
        <GlassCard className="p-10 text-center text-sm text-ink/55">Create a class before setting up the timetable.</GlassCard>
      ) : !slots.length ? (
        <GlassCard className="p-10 text-center text-sm text-ink/55">No timetable lessons yet. Add a lesson to publish a schedule to its class.</GlassCard>
      ) : (
        <div className="space-y-5">
          {DAYS.map((day, dayIndex) => {
            const daySlots = slots.filter((slot) => slot.day_of_week === dayIndex + 1)
            if (!daySlots.length) return null
            return (
              <GlassCard key={day} className="overflow-hidden">
                <div className="flex items-center justify-between p-5 sm:px-6"><SectionHeader title={day} description={`${daySlots.length} lessons`} /></div>
                <ul className="divide-y divide-ink/5 border-t border-white/70 px-5 sm:px-6">
                  {daySlots.map((slot) => {
                    const classItem = classes.find((item) => item.id === slot.class_id)
                    const teacher = teachers.find((item) => item.id === slot.teacher_id)
                    return (
                      <li key={slot.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">{formatTime(slot.starts_at)}–{formatTime(slot.ends_at)}</span>
                            <Badge tone="brand">Period {slot.period}</Badge>
                            <Badge tone="info">{classItem ? `${classItem.name} ${classItem.section}` : 'Class'}</Badge>
                          </div>
                          <p className="mt-1 text-sm">{slot.subject} <span className="text-ink/55">· {teacher?.teacher?.full_name ?? 'No teacher'}{slot.room ? ` · Room ${slot.room}` : ''}</span></p>
                        </div>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => { setEditing(slot); setDialogOpen(true) }} aria-label={`Edit ${slot.subject}`} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-lilac-100"><Pencil className="h-4 w-4" /></button>
                          <button type="button" disabled={busyId === slot.id} onClick={() => remove(slot)} aria-label={`Delete ${slot.subject}`} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-rose-100 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </GlassCard>
            )
          })}
        </div>
      )}
      {dialogOpen && query.data && <SlotForm key={editing?.id ?? 'new'} slot={editing} classes={classes} teachers={teachers} onClose={() => setDialogOpen(false)} onSave={save} />}
    </div>
  )
}
