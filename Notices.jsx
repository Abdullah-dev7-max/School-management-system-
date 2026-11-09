import { Megaphone, Pin } from 'lucide-react'
import GlassCard from '../ui/GlassCard.jsx'
import SectionHeader from '../ui/SectionHeader.jsx'
import Badge from '../ui/Badge.jsx'
import { EmptyState, Skeleton } from '../ui/States.jsx'
import { timeAgo } from '../../lib/format.js'

const CATEGORY = {
  academic: { tone: 'brand', label: 'Academic' },
  event: { tone: 'info', label: 'Event' },
  finance: { tone: 'warning', label: 'Finance' },
  holiday: { tone: 'success', label: 'Holiday' },
  general: { tone: 'neutral', label: 'General' },
}

/** Scrolling strip of headlines. Pauses on hover or focus; static and scrollable with reduced motion. */
export function NoticeTicker({ notices, loading }) {
  if (loading) return <Skeleton className="h-12 rounded-2xl" />
  if (!notices?.length) return null

  // The list is rendered twice so the loop is seamless; the copy is hidden from assistive tech.
  const renderList = (hidden) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-8 pr-8">
      {notices.map((n) => (
        <li key={n.id} className="flex items-center gap-2.5 whitespace-nowrap text-sm">
          <Badge tone={CATEGORY[n.category]?.tone ?? 'neutral'}>{CATEGORY[n.category]?.label ?? 'Notice'}</Badge>
          <span className="font-medium">{n.title}</span>
          <span className="text-ink/30" aria-hidden="true">/</span>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="glass group relative flex h-12 items-center overflow-hidden rounded-2xl" role="region" aria-label="Latest school notices">
      <span className="z-10 flex h-full shrink-0 items-center gap-2 bg-night-900 px-4 text-sm font-medium text-white">
        <Megaphone className="h-4 w-4" />
        Notices
      </span>
      <div className="min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto">
        <div className="flex w-max animate-marquee pl-8 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {renderList(false)}
          {renderList(true)}
        </div>
      </div>
    </div>
  )
}

export function NoticeList({ notices, loading }) {
  return (
    <GlassCard className="p-5 sm:p-6">
      <SectionHeader title="Recent notices" description="From the school office" />
      {loading ? (
        <div className="mt-4 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !notices?.length ? (
        <EmptyState icon={Megaphone} title="No notices" hint="New announcements will show up here." />
      ) : (
        <ul className="mt-4 space-y-3">
          {notices.slice(0, 5).map((n) => (
            <li key={n.id} className="rounded-2xl bg-white/60 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={CATEGORY[n.category]?.tone ?? 'neutral'}>{CATEGORY[n.category]?.label ?? 'Notice'}</Badge>
                <span className="flex items-center gap-1.5 text-xs text-ink/50">
                  {n.pinned && <Pin className="h-3 w-3" aria-label="Pinned" />}
                  {timeAgo(n.published_at)}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{n.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/60">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}
