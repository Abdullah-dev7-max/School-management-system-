import { useEffect, useState } from 'react'
import { LoaderCircle, Megaphone } from 'lucide-react'
import { useRole } from '../context/RoleContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { createClassAnnouncement, fetchTeacherAnnouncements } from '../lib/api.js'
import { formatDate } from '../lib/format.js'
import Badge from '../components/ui/Badge.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import { Field, FormError, ManagementError, SelectField } from '../components/admin/ManagementUi.jsx'

const TYPES = [
  { value: 'test', label: 'Test' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'notice', label: 'Important notice' },
]
const INPUT = 'mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60'
const TONES = { test: 'danger', assignment: 'brand', quiz: 'warning', notice: 'info' }

export default function TeacherAnnouncements() {
  const { session } = useRole()
  const query = useAsync(() => fetchTeacherAnnouncements(session?.token), [session?.token])
  const classes = query.data?.classes ?? []
  const announcements = query.data?.announcements ?? []
  const [classId, setClassId] = useState('')
  const [announcementType, setAnnouncementType] = useState('test')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id)
  }, [classId, classes])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await createClassAnnouncement(session.token, {
        classId,
        announcementType,
        title,
        body,
        eventDate: eventDate || null,
      })
      setTitle('')
      setBody('')
      setEventDate('')
      setMessage('Announcement shared with the selected class.')
      await query.reload()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  if (query.error) return <ManagementError error={query.error} onRetry={query.reload} />

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader title="Class announcements" description="Share tests, assignments, quizzes, and important updates with your class." />
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Class" value={classId} onChange={(event) => setClassId(event.target.value)} disabled={!classes.length}>
              {!classes.length && <option value="">No assigned classes</option>}
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name} {item.section}</option>)}
            </SelectField>
            <SelectField label="Announcement type" value={announcementType} onChange={(event) => setAnnouncementType(event.target.value)}>
              {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </SelectField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required />
            <Field label="Test / due date (optional)" type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
          </div>
          <label className="block text-sm font-medium">Message for students
            <textarea value={body} onChange={(event) => setBody(event.target.value)} required maxLength={4000} rows={5} className={`${INPUT} h-auto py-3`} />
          </label>
          {error && <FormError>{error}</FormError>}
          {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          {!classes.length && query.data && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">No classes are assigned to you yet. Ask the administrator to select you as the Class teacher in the Classes page.</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={busy || !classes.length || !query.data} className="inline-flex h-11 items-center gap-2 rounded-xl bg-night-900 px-4 text-sm font-medium text-white disabled:opacity-50">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
              {busy ? 'Sharing…' : 'Share announcement'}
            </button>
          </div>
        </form>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="p-5 sm:p-6"><SectionHeader title="Your announcements" description={`${announcements.length} updates shared with your classes`} /></div>
        {!query.data ? (
          <div className="border-t border-white/70 p-6 text-sm text-ink/55">Loading announcements…</div>
        ) : !announcements.length ? (
          <p className="border-t border-white/70 px-6 py-10 text-center text-sm text-ink/55">No announcements yet.</p>
        ) : (
          <ul className="divide-y divide-ink/5 border-t border-white/70 px-5 sm:px-6">
            {announcements.map((announcement) => {
              const classItem = classes.find((item) => item.id === announcement.class_id)
              const type = TYPES.find((item) => item.value === announcement.announcement_type)
              return (
                <li key={announcement.id} className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={TONES[announcement.announcement_type]}>{type?.label ?? announcement.announcement_type}</Badge>
                    <span className="text-xs text-ink/55">{classItem ? `${classItem.name} ${classItem.section}` : 'Class'} · {formatDate(announcement.created_at)}</span>
                    {announcement.event_date && <span className="text-xs font-medium text-ink/70">Date: {formatDate(announcement.event_date)}</span>}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{announcement.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink/70">{announcement.body}</p>
                </li>
              )
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  )
}
