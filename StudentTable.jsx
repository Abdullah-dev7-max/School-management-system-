import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, SearchX, Search, X } from 'lucide-react'
import GlassCard from '../ui/GlassCard.jsx'
import SectionHeader from '../ui/SectionHeader.jsx'
import Badge from '../ui/Badge.jsx'
import Avatar from '../ui/Avatar.jsx'
import { EmptyState } from '../ui/States.jsx'
import { initials, pct, pkr } from '../../lib/format.js'

const PAGE_SIZE = 6

const FEE_FILTERS = [
  { value: 'all', label: 'All fees' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due', label: 'Dues pending' },
  { value: 'clear', label: 'Clear' },
]

const FEE_BADGE = {
  overdue: { tone: 'danger', label: 'Overdue' },
  due: { tone: 'warning', label: 'Dues pending' },
  clear: { tone: 'success', label: 'Clear' },
}

function FilterChip({ active, onClick, count, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-lilac-500/60 ${
        active ? 'bg-night-900 text-white' : 'bg-white/70 text-ink/70 hover:bg-white'
      }`}
    >
      {children}
      {count != null && (
        <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-white/20' : 'bg-ink/5'}`}>{count}</span>
      )}
    </button>
  )
}

function SortHeader({ label, sortKey, sort, onSort, className = '' }) {
  const active = sort.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-5 py-3 font-medium ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1.5 rounded-md outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-lilac-500/60"
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? 'text-lilac-600' : ''}`} />
      </button>
    </th>
  )
}

export default function StudentTable({ students }) {
  const [query, setQuery] = useState('')
  const [classKey, setClassKey] = useState('all')
  const [feeFilter, setFeeFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })
  const [page, setPage] = useState(1)

  const classes = useMemo(() => [...new Set(students.map((s) => s.className))].sort(), [students])
  const classCounts = useMemo(
    () => Object.fromEntries(classes.map((c) => [c, students.filter((s) => s.className === c).length])),
    [classes, students]
  )
  const feeCounts = useMemo(
    () => ({
      all: students.length,
      overdue: students.filter((s) => s.feeState === 'overdue').length,
      due: students.filter((s) => s.feeState === 'due').length,
      clear: students.filter((s) => s.feeState === 'clear').length,
    }),
    [students]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = students.filter((s) => {
      if (classKey !== 'all' && s.className !== classKey) return false
      if (feeFilter !== 'all' && s.feeState !== feeFilter) return false
      if (!q) return true
      return [s.name, s.email, s.admissionNo, s.guardian, s.className].some((v) => v?.toLowerCase().includes(q))
    })
    const dir = sort.dir === 'asc' ? 1 : -1
    return rows.sort((a, b) => {
      if (sort.key === 'attendance') return ((a.attendance ?? -1) - (b.attendance ?? -1)) * dir
      return String(a[sort.key]).localeCompare(String(b[sort.key])) * dir
    })
  }, [students, query, classKey, feeFilter, sort])

  useEffect(() => setPage(1), [query, classKey, feeFilter, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const from = filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0
  const filtersActive = query || classKey !== 'all' || feeFilter !== 'all'

  const toggleSort = (key) =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const reset = () => {
    setQuery('')
    setClassKey('all')
    setFeeFilter('all')
  }

  return (
    <GlassCard className="overflow-hidden">
      <div className="space-y-4 p-5 sm:p-6">
        <SectionHeader title="Students" description={`${students.length} enrolled this year`} />

        <label className="flex h-11 items-center gap-2.5 rounded-2xl bg-white/70 px-3.5 text-ink/50 focus-within:ring-2 focus-within:ring-lilac-500/60">
          <Search className="h-4 w-4 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, admission number or guardian"
            aria-label="Search students"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="rounded-md p-1 hover:bg-ink/5">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>

        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by class">
            <FilterChip active={classKey === 'all'} onClick={() => setClassKey('all')} count={students.length}>
              All classes
            </FilterChip>
            {classes.map((c) => (
              <FilterChip key={c} active={classKey === c} onClick={() => setClassKey(c)} count={classCounts[c]}>
                {c}
              </FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by fee status">
            {FEE_FILTERS.map((f) => (
              <FilterChip key={f.value} active={feeFilter === f.value} onClick={() => setFeeFilter(f.value)} count={feeCounts[f.value]}>
                {f.label}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No students match"
          hint="Try a different name or clear the filters."
          action={
            filtersActive && (
              <button type="button" onClick={reset} className="mt-2 h-9 rounded-full bg-night-900 px-4 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-lilac-500 focus-visible:ring-offset-2">
                Clear filters
              </button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto border-t border-white/70">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-white/40 text-xs text-ink/55">
              <tr>
                <SortHeader label="Student" sortKey="name" sort={sort} onSort={toggleSort} />
                <th scope="col" className="px-5 py-3 font-medium">Class</th>
                <th scope="col" className="px-5 py-3 font-medium">Admission no.</th>
                <SortHeader label="Attendance" sortKey="attendance" sort={sort} onSort={toggleSort} />
                <th scope="col" className="px-5 py-3 font-medium">Fees</th>
                <th scope="col" className="px-5 py-3 font-medium">Guardian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/70">
              {visible.map((s) => {
                const fee = FEE_BADGE[s.feeState]
                return (
                  <motion.tr
                    key={s.id}
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="transition-colors hover:bg-white/50"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar initials={initials(s.name)} accent="from-lilac-400 to-lilac-300" size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.name}</p>
                          <p className="truncate text-xs text-ink/50">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><Badge tone="brand">{s.className}</Badge></td>
                    <td className="px-5 py-3.5 tabular-nums text-ink/70">{s.admissionNo}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-10 tabular-nums">{pct(s.attendance)}</span>
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
                          <span
                            className={`block h-full rounded-full ${(s.attendance ?? 0) >= 85 ? 'bg-lilac-500' : 'bg-rose-400'}`}
                            style={{ width: `${s.attendance ?? 0}%` }}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col items-start gap-1">
                        <Badge tone={fee.tone} dot>{fee.label}</Badge>
                        {s.outstanding > 0 && <span className="text-xs text-ink/50">{pkr(s.outstanding)} due</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-ink/70">{s.guardian}</td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-white/70 px-5 py-3 text-sm text-ink/60">
          <p aria-live="polite">
            Showing {from} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/70 outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-lilac-500/60 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 tabular-nums">{page} / {pageCount}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
              aria-label="Next page"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/70 outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-lilac-500/60 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  )
}
