import { useEffect, useRef, useState } from 'react'
import { FileText, LoaderCircle, Upload } from 'lucide-react'
import { useRole } from '../context/RoleContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { fetchTeacherNotes, openClassNote, uploadTeacherNote } from '../lib/api.js'
import { formatDate } from '../lib/format.js'
import Badge from '../components/ui/Badge.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import { Field, FormError, ManagementError, SelectField } from '../components/admin/ManagementUi.jsx'
import LoadingScreen from '../components/ui/LoadingScreen.jsx'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_FILES = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png'
const INPUT = 'mt-1.5 h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60'

export default function TeacherNotes() {
  const { session } = useRole()
  const notesQuery = useAsync(() => fetchTeacherNotes(session?.token), [session?.token])
  const classes = notesQuery.data?.classes ?? []
  const notes = notesQuery.data?.notes ?? []
  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const formRef = useRef(null)

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id)
  }, [classId, classes])

  const submit = async (event) => {
    event.preventDefault()
    if (!file) {
      setError('Choose a notes file to upload.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('The file must be 10 MB or smaller.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await uploadTeacherNote({ sessionToken: session.token, classId, title, subject, file })
      setTitle('')
      setSubject('')
      setFile(null)
      formRef.current?.reset()
      setMessage('Notes uploaded. Students in this class can now download them from their dashboard.')
      await notesQuery.reload()
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setBusy(false)
    }
  }

  if (notesQuery.error) return <ManagementError error={notesQuery.error} onRetry={notesQuery.reload} />
  if (notesQuery.loading || !notesQuery.data) return <LoadingScreen label="Loading class materials" />

  return (
    <div className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader title="Class notes" description="Upload learning materials for students in your assigned classes." />
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <form ref={formRef} onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Class" value={classId} onChange={(event) => setClassId(event.target.value)} disabled={!classes.length}>
              {!classes.length && <option value="">No assigned classes</option>}
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name} {item.section}</option>)}
            </SelectField>
            <Field label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} required />
          </div>
          <Field label="Notes title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required />
          <label className="block text-sm font-medium">File
            <input
              type="file"
              accept={ACCEPTED_FILES}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
              className={`${INPUT} h-auto py-2`}
            />
            <span className="mt-1 block text-xs text-ink/55">PDF, Word, PowerPoint, text, JPG, or PNG · up to 10 MB</span>
          </label>
          {error && <FormError>{error}</FormError>}
          {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={busy || !classes.length || !notesQuery.data} className="inline-flex h-11 items-center gap-2 rounded-xl bg-night-900 px-4 text-sm font-medium text-white disabled:opacity-50">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? 'Uploading…' : 'Upload notes'}
            </button>
          </div>
        </form>
        {!classes.length && notesQuery.data && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">No classes are assigned to you yet. Ask the administrator to select you as the Class teacher in the Classes page.</p>}
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="p-5 sm:p-6"><SectionHeader title="Shared materials" description={`${notes.length} files uploaded by you`} /></div>
        {!notes.length ? (
          <p className="border-t border-white/70 px-6 py-10 text-center text-sm text-ink/55">You have not uploaded any notes yet.</p>
        ) : (
          <ul className="divide-y divide-ink/5 border-t border-white/70 px-5 sm:px-6">
            {notes.map((note) => {
              const classItem = classes.find((item) => item.id === note.class_id)
              return (
                <li key={note.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lilac-100 text-lilac-700"><FileText className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{note.title}</p>
                      <p className="mt-0.5 truncate text-xs text-ink/55">{classItem ? `${classItem.name} ${classItem.section} · ` : ''}{note.subject} · {note.file_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone="info">{formatDate(note.created_at)}</Badge>
                    <button type="button" onClick={() => openClassNote(session.token, note.id).catch((openError) => setError(openError.message))} className="text-sm font-medium text-lilac-700 hover:text-lilac-900">Open</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  )
}
