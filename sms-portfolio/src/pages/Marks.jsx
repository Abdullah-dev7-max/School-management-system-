import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useAsync } from '../hooks/useAsync.js'
import { saveClassMarks, fetchMarksPage } from '../lib/api.js'
import { gradeFor } from '../lib/analytics.js'
import Badge from '../components/ui/Badge.jsx'
import GlassCard from '../components/ui/GlassCard.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import LoadingScreen from '../components/ui/LoadingScreen.jsx'
import { Field, FORM_BUTTON, FormError, ManagementError, SelectField } from '../components/admin/ManagementUi.jsx'
import { useRole } from '../context/RoleContext.jsx'

export default function Marks() {
  const { role, session } = useRole()
  const roleSession = role === 'teacher' && session?.custom ? session.token : null
  const [classId, setClassId] = useState('')
  const [subject, setSubject] = useState('')
  const [exam, setExam] = useState('')
  const [examDate, setExamDate] = useState('')
  const [maxScore, setMaxScore] = useState('')
  const [scores, setScores] = useState({})
  const [saveState, setSaveState] = useState({ loading: false, error: '', message: '' })
  const sheet = useAsync(() => fetchMarksPage(classId, subject, exam, roleSession), [classId, subject, exam, roleSession], ['classes', 'students', 'users', 'marks'])
  const classes = sheet.data?.classes ?? []
  const roster = sheet.data?.roster ?? []
  const max = Number(maxScore)
  const maxValid = Number.isFinite(max) && max > 0

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id)
  }, [classId, classes])

  useEffect(() => {
    if (!sheet.data) return
    setScores(Object.fromEntries(sheet.data.roster.map((student) => [student.id, student.score === '' ? '' : String(Number(student.score))])))
    if (sheet.data.roster.length) {
      setMaxScore(String(sheet.data.roster[0].maxScore))
      setExamDate(sheet.data.roster.find((student) => student.examDate)?.examDate ?? '')
    } else {
      setMaxScore('')
      setExamDate('')
    }
    setSaveState({ loading: false, error: '', message: '' })
  }, [sheet.data])

  const result = useMemo(() => {
    let count = 0
    let sum = 0
    const errors = {}
    roster.forEach((student) => {
      const raw = scores[student.id] ?? ''
      if (raw === '') return
      const score = Number(raw)
      if (!Number.isFinite(score) || score < 0 || !maxValid || score > max) errors[student.id] = `Enter 0 to ${maxValid ? max : 'a valid total'}`
      else { count += 1; sum += (score / max) * 100 }
    })
    return { count, average: count ? sum / count : null, errors }
  }, [roster, scores, maxValid, max])

  const submit = async (event) => {
    event.preventDefault()
    if (!maxValid) {
      setSaveState({ loading: false, error: 'Total marks must be greater than zero.', message: '' })
      return
    }
    if (Object.keys(result.errors).length) {
      setSaveState({ loading: false, error: 'Please fix the invalid marks before saving.', message: '' })
      return
    }
    const rows = roster.filter((student) => scores[student.id] !== undefined && scores[student.id] !== '').map((student) => ({
      student_id: student.id,
      subject,
      exam,
      score: Number(scores[student.id]),
      max_score: max,
      exam_date: examDate || null,
    }))
    if (!rows.length) {
      setSaveState({ loading: false, error: 'Enter at least one mark before saving.', message: '' })
      return
    }
    setSaveState({ loading: true, error: '', message: '' })
    try {
      await saveClassMarks(rows, roleSession, classId)
      setSaveState({ loading: false, error: '', message: `Saved ${rows.length} ${subject} marks for ${exam}.` })
      sheet.reload()
    } catch (error) {
      setSaveState({ loading: false, error: error.message, message: '' })
    }
  }

  if (sheet.error) return <ManagementError error={sheet.error} onRetry={sheet.reload} />
  if (sheet.loading || !sheet.data) return <LoadingScreen label="Preparing the class marksheet" />

  return (
    <form onSubmit={submit} className="space-y-5">
      <GlassCard className="p-5 sm:p-6">
        <SectionHeader title="Marks" description="Select a class and exam, then enter each student's marks." />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SelectField label="Class" value={classId} onChange={(event) => setClassId(event.target.value)} disabled={!classes.length}>
            {!classes.length && <option value="">No classes available</option>}
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name} {item.section}</option>)}
          </SelectField>
          <Field label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} required />
          <Field label="Examination" value={exam} onChange={(event) => setExam(event.target.value)} maxLength={120} required />
          <Field label="Exam date" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} />
          <Field label="Total marks" type="number" min="0.01" step="0.01" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} required />
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
          <SectionHeader title="Student marks" description={`${result.count} of ${roster.length} marks entered`} />
          <Badge tone="info">Class average {result.average == null ? '–' : `${Math.round(result.average)}%`}</Badge>
        </div>
        {!roster.length ? (
          <p className="border-t border-white/70 px-6 py-12 text-center text-sm text-ink/55">{classId ? 'No active students are assigned to this class.' : roleSession ? 'No classes are assigned to you yet. Ask the administrator to select you as the Class teacher in the Classes page.' : 'Create a class to enter marks.'}</p>
        ) : (
          <div className="overflow-x-auto border-t border-white/70">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-white/40 text-xs text-ink/55"><tr>
                {['Student', 'Admission no.', 'Obtained marks', 'Total marks', 'Grade'].map((label) => <th key={label} scope="col" className="px-5 py-3 font-medium">{label}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-white/70">{roster.map((student) => {
                const raw = scores[student.id] ?? ''
                const percent = raw !== '' && maxValid && !result.errors[student.id] ? (Number(raw) / max) * 100 : null
                return <tr key={student.id} className="hover:bg-white/50">
                  <td className="px-5 py-3.5"><p className="font-medium">{student.name}</p><p className="text-xs text-ink/50">Roll {student.rollNo ?? '–'}</p></td>
                  <td className="px-5 py-3.5 text-ink/60">{student.admissionNo}</td>
                  <td className="px-5 py-3.5"><input type="number" min="0" max={maxValid ? max : undefined} step="0.01" inputMode="decimal" value={raw} onChange={(event) => { setScores((current) => ({ ...current, [student.id]: event.target.value })); setSaveState({ loading: false, error: '', message: '' }) }} aria-label={`Obtained marks for ${student.name}`} aria-invalid={Boolean(result.errors[student.id])} className={`h-10 w-32 rounded-xl border bg-white px-3 text-sm outline-none focus-visible:ring-2 ${result.errors[student.id] ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-ink/10 focus-visible:ring-lilac-500/60'}`} />{result.errors[student.id] && <p className="mt-1 text-xs text-rose-700">{result.errors[student.id]}</p>}</td>
                  <td className="px-5 py-3.5 text-ink/60">{maxValid ? max : '–'}</td>
                  <td className="px-5 py-3.5">{percent == null ? '–' : <Badge tone="brand">{gradeFor(percent)} · {Math.round(percent)}%</Badge>}</td>
                </tr>
              })}</tbody>
            </table>
          </div>
        )}
        {saveState.error && <FormError>{saveState.error}</FormError>}
        {saveState.message && <p role="status" className="mx-5 mt-3 flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" />{saveState.message}</p>}
        <div className="flex justify-end p-5">
          <button type="submit" disabled={!roster.length || !subject.trim() || !exam.trim() || saveState.loading || sheet.loading || !sheet.data} className={`${FORM_BUTTON} h-11 rounded-full bg-night-900 px-5 text-white`}>
            {saveState.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save marks
          </button>
        </div>
      </GlassCard>
    </form>
  )
}
