import { Download, Heart } from "lucide-react"
import type { Tag } from "./api/tags"
import { formatKey } from "./formatKey"

// Character ranges [start, end] (inclusive) from Fuse match indices
export type MatchRanges = ReadonlyArray<readonly [number, number]>
// Per-field match ranges for one tag, keyed by field name
export type FieldMatches = Record<string, MatchRanges>

function highlight(text: string, query: string): React.ReactNode {
  const q = query.trim().toLowerCase()
  if (!q || !text) return text

  const parts: React.ReactNode[] = []
  const lower = text.toLowerCase()
  let last = 0
  let idx = lower.indexOf(q)

  while (idx !== -1) {
    if (idx > last) parts.push(text.slice(last, idx))
    parts.push(<mark key={idx}>{text.slice(idx, idx + q.length)}</mark>)
    last = idx + q.length
    idx = lower.indexOf(q, last)
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

function highlightWithIndices(text: string, indices: MatchRanges): React.ReactNode {
  if (!indices.length) return text
  const parts: React.ReactNode[] = []
  let last = 0
  for (const [start, end] of indices) {
    if (start > last) parts.push(text.slice(last, start))
    parts.push(<mark key={start}>{text.slice(start, end + 1)}</mark>)
    last = end + 1
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

export function formatDownloads(n: number): string {
  if (n < 100) return String(n)
  if (n < 1000) return `${Math.floor(n / 100) * 100}+`
  if (n < 10000) return `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "")}k+`
  return `${Math.floor(n / 1000)}k+`
}

interface TagListItemProps {
  tag: Tag
  onClick: () => void
  fieldMatches?: FieldMatches
  query?: string
  isFavorited?: boolean
}

export function TagListItem({
  tag,
  onClick,
  fieldMatches,
  query = "",
  isFavorited,
}: TagListItemProps) {
  const hlField = (text: string, field: string) =>
    fieldMatches?.[field] ? highlightWithIndices(text, fieldMatches[field]) : highlight(text, query)

  return (
    <li
      className="py-3 px-4 border border-[var(--border)] rounded-lg cursor-pointer transition-colors duration-150 hover:bg-[var(--accent)]/10 hover:outline hover:outline-2 hover:outline-[var(--accent)] focus:bg-[var(--accent)]/10 focus:outline focus:outline-2 focus:outline-[var(--accent)]"
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="flex justify-between items-baseline gap-2">
        <div className="min-w-0">
          <span className="font-semibold">{hlField(tag.title, "title")}</span>
          {tag.altTitle && (
            <span className="text-[var(--text-muted)] text-[0.9em]">
              {" "}
              — {hlField(tag.altTitle, "altTitle")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isFavorited && <Heart size={12} fill="var(--accent)" color="var(--accent)" />}
          <span className="text-[0.8rem] text-[var(--text-muted)] whitespace-nowrap">
            #{hlField(tag.id, "id")}
          </span>
        </div>
      </div>
      {tag.version && (
        <div className="text-[0.85em] text-[var(--text-muted)] italic">
          {hlField(tag.version, "version")}
        </div>
      )}
      <div className="flex flex-wrap gap-3 text-[0.8rem] text-[var(--text-muted)]">
        {tag.arranger && <span>{hlField(tag.arranger, "arranger")}</span>}
        {tag.key && <span>{formatKey(tag.key)}</span>}
        {tag.parts && <span>{tag.parts} parts</span>}
        <span className="inline-flex items-center gap-1">
          <Download size={11} />
          {formatDownloads(tag.downloaded)}
        </span>
      </div>
    </li>
  )
}
