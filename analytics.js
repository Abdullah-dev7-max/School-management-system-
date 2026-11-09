import { toISODate, formatShortDate } from './format.js'

export function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    ;(acc[row[key]] ||= []).push(row)
    return acc
  }, {})
}

/** Share of sessions the student was present or late. Excused days are ignored. */
export function attendanceRate(rows) {
  const counted = rows.filter((r) => r.status !== 'excused')
  if (!counted.length) return null
  const attended = counted.filter((r) => r.status === 'present' || r.status === 'late').length
  return (attended / counted.length) * 100
}

export function dailyAttendance(rows) {
  const byDate = {}
  rows.forEach((r) => {
    const bucket = (byDate[r.attended_on] ||= { date: r.attended_on, present: 0, late: 0, absent: 0 })
    if (r.status === 'present') bucket.present += 1
    else if (r.status === 'late') bucket.late += 1
    else if (r.status === 'absent') bucket.absent += 1
  })
  return Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => ({ ...b, label: formatShortDate(b.date) }))
}

/** paid | partial | unpaid | overdue, derived from amounts and due date so it never goes stale. */
export function feeState(fee, today = toISODate()) {
  const paid = Number(fee.amount_paid)
  const amount = Number(fee.amount)
  if (paid >= amount) return 'paid'
  if (fee.due_date < today) return 'overdue'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

export function monthlyRevenue(fees, months = 6) {
  const now = new Date()
  const buckets = []
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.push({ key, label: d.toLocaleString('en-GB', { month: 'short' }), revenue: 0 })
  }
  const index = Object.fromEntries(buckets.map((b) => [b.key, b]))
  fees.forEach((fee) => {
    if (!fee.paid_on) return
    const bucket = index[fee.paid_on.slice(0, 7)]
    if (bucket) bucket.revenue += Number(fee.amount_paid)
  })
  return buckets
}

export function gradeFor(percent) {
  if (percent >= 85) return 'A'
  if (percent >= 70) return 'B'
  if (percent >= 55) return 'C'
  return 'D'
}

/** One entry per subject: latest score, change since the previous exam and overall average. */
export function subjectReport(marks) {
  const bySubject = groupBy(marks, 'subject')
  return Object.entries(bySubject)
    .map(([subject, rows]) => {
      const sorted = [...rows].sort((a, b) => (a.exam_date ?? '').localeCompare(b.exam_date ?? ''))
      const toPct = (r) => (Number(r.score) / Number(r.max_score)) * 100
      const latest = sorted[sorted.length - 1]
      const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null
      const average = sorted.reduce((sum, r) => sum + toPct(r), 0) / sorted.length
      return {
        subject,
        latestExam: latest.exam,
        latestPct: toPct(latest),
        delta: previous ? toPct(latest) - toPct(previous) : null,
        average,
        grade: gradeFor(toPct(latest)),
      }
    })
    .sort((a, b) => a.subject.localeCompare(b.subject))
}
