import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, TriangleAlert, Users } from 'lucide-react'
import GlassCard from '../ui/GlassCard.jsx'
import SectionHeader from '../ui/SectionHeader.jsx'
import Badge from '../ui/Badge.jsx'
import Avatar from '../ui/Avatar.jsx'
import { EmptyState, ErrorState, Skeleton } from '../ui/States.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { fetchMarksSheet, saveMarks } from '../../services/supabaseService.js'
import { gradeFor } from '../../lib/analytics.js'
import { initials } from '../../lib/format.js'

const EXAMS = {
  'Unit test 1': '2026-09-15',
  'Mid-term': '2026-10-20',
  'Final term': '2026-12-15',
}
const BASE_SUBJECTS = ['Mathematics', 'English', 'Science', 'Urdu', 'Computer Science']

const field =
  'h-11 w-full rounded-xl bg-white/70 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-lilac-500/60'

export default function MarksEntryForm({ classId, classLabel, teacher }) {
  const subjects = useMemo(() => [teacher.subject, ...BASE_SUBJECTS.filter((s) => s !== teacher.subject)], [teacher.subject])
  const [subject, setSubject] = useState(teacher.subject)
  const [exam, setExam] = useState('Mid-term')
  const [maxScore, setMaxScore] = useState('100')
  const [scores, setScores] = useState({})
  const [save, setSave] = useState({ state: 'idle', message: '' })

  const sheet = useAsync(() => fetchMarksSheet(classId, subject, exam), [classId, subject, exam])

  useEffect(() => {
    if (!sheet.data) return
    setScores(sheet.data.scores)
    setMaxScore(String(sheet.data.maxScore ?? 100))
    setSave({ state: 'idle', message: '' })
  }, [sheet.data])

  const roster = sheet.data?.roster ?? []
  const max = Number(maxScore)
  const maxValid = Number.isFinite(max) && max > 0

  const { errors, entered, average } = useMemo(() => {
    const errs = {}
    let count = 0
    let sum = 0
    roster.forEach((s) => {
      const raw = scores[s.id]
      if (raw === undefined || raw === '') return
      const n = Number(raw)
      if (Number.isNaN(n) || n < 0 || (maxValid && n > max)) {
        errs[s.id] = `Enter a number from 0 to ${maxValid ? max : '…'}`
      } else if (maxValid) {
        count += 1
        sum += (n / max) * 100
      }
    })
    return { errors: errs, entered: count, average: count ? sum / count : null }
  }, [roster, scores, max, maxValid])

  const hasErrors = Object.keys(errors).length > 0 || !maxValid

  const onChange = (id, value) => {
    setScores((prev) => ({ ...prev, [id]: value }))
    setSave({ state: 'idle', message: '' })
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const rows = roster
      .filter((s) => scores[s.id] !== undefined && scores[s.id] !== '')
      .map((s) => ({
        student_id: s.id,
        subject,
        exam,
        score: Number(scores[s.id]),
        max_score: max,
        exam_date: EXAMS[exam],
        teacher_id: teacher.teacherId,
      }))
    if (!rows.length) {
      setSave({ state: 'error', message: 'Enter at least one mark before saving.' })
      return
    }
    setSave({ state: 'saving', message: '' })
    try {
      await saveMarks(rows)
      setSave({ state: 'saved', message: `Saved ${rows.length} ${subject} marks for ${exam}` })
    } catch (error) {
      const hint = /row-level security|permission/i.test(error.message) ? ' Run database/step2_migration.sql to allow demo writes.' : ''
      setSave({ state: 'error', message: `${error.message}.${hint}` })
    }
  }

  return (
    <GlassCard className="p-5 sm:p-6">
      <SectionHeader title="Enter exam marks" description={`${classLabel}. Existing marks load automatically so you can correct them.`} />

      <form onSubmit={onSubmit} className="mt-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink/60">Subject</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className={field}>
              {subjects.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink/60">Exam</span>
            <select value={exam} onChange={(e) => setExam(e.target.value)} className={field}>
              {Object.keys(EXAMS).map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink/60">Total marks</span>
            <input type="number" min="1" step="1" inputMode="numeric" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className={field} />
          </label>
        </div>

        {sheet.error ? (
          <div className="mt-5"><ErrorState error={sheet.error} onRetry={sheet.reload} /></div>
        ) : sheet.loading && !sheet.data ? (
          <div className="mt-5 space-y-2.5" aria-busy="true">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : roster.length === 0 ? (
          <EmptyState icon={Users} title="No students in this class" />
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{entered} of {roster.length} entered</Badge>
              <Badge tone="info">Class average {average == null ? '–' : `${Math.round(average)}%`}</Badge>
            </div>

            <ul className="mt-4 divide-y divide-ink/5 rounded-2xl bg-white/50">
              {roster.map((s) => {
                const raw = scores[s.id] ?? ''
                const n = Number(raw)
                const showGrade = raw !== '' && !errors[s.id] && maxValid
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar initials={initials(s.name)} accent="from-lilac-400 to-lilac-300" size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-ink/50">Roll {s.rollNo ?? '–'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {errors[s.id] && <span id={`err-${s.id}`} className="text-xs text-rose-700">{errors[s.id]}</span>}
                      {showGrade && <Badge tone="brand">{Math.round((n / max) * 100)}% · {gradeFor((n / max) * 100)}</Badge>}
                      <input
                        type="number"
                        step="0.5"
                        inputMode="decimal"
                        value={raw}
                        onChange={(e) => onChange(s.id, e.target.value)}
                        aria-label={`Marks for ${s.name}`}
                        aria-invalid={Boolean(errors[s.id])}
                        aria-describedby={errors[s.id] ? `err-${s.id}` : undefined}
                        placeholder={`/ ${maxValid ? max : ''}`}
                        className={`h-10 w-24 rounded-xl bg-white px-3 text-right text-sm tabular-nums outline-none focus-visible:ring-2 ${
                          errors[s.id] ? 'ring-2 ring-rose-400 focus-visible:ring-rose-500' : 'focus-visible:ring-lilac-500/60'
                        }`}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p role="status" aria-live="polite" className={`flex items-center gap-2 text-sm ${save.state === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>
                {save.state === 'saved' && <Check className="h-4 w-4" />}
                {save.state === 'error' && <TriangleAlert className="h-4 w-4 shrink-0" />}
                {save.message}
              </p>
              <button
                type="submit"
                disabled={save.state === 'saving' || hasErrors}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-night-900 px-5 text-sm font-medium text-white shadow-lg shadow-night-900/20 outline-none focus-visible:ring-2 focus-visible:ring-lilac-500 focus-visible:ring-offset-2 disabled:opacity-50"
              >
                {save.state === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
                {save.state === 'saving' ? 'Saving' : 'Save marks'}
              </button>
            </div>
          </>
        )}
      </form>
    </GlassCard>
  )
}
