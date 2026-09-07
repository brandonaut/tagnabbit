import { ChevronDown, ChevronUp, CircleGauge, Heart, Music, Search } from "lucide-react"
import { useLocation } from "wouter"

const TABS = [
  { path: "/search", label: "Search", Icon: Search },
  { path: "/favorites", label: "Favorites", Icon: Heart },
  { path: "/player", label: "Player", Icon: Music },
] as const

interface Props {
  tunerOpen: boolean
  onToggleTuner: () => void
  hidden?: boolean
}

export default function TabBar({ tunerOpen, onToggleTuner, hidden = false }: Props) {
  const [location, navigate] = useLocation()

  return (
    <nav
      data-tabbar
      className={`fixed bottom-0 left-0 right-0 z-40 flex bg-[var(--bg-surface)] border-t border-[var(--border)] transition-transform duration-300 ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map(({ path, label, Icon }) => {
        const active = location === path
        return (
          <button
            key={path}
            type="button"
            className="flex-1 flex flex-col items-center gap-0.5 py-2 bg-transparent border-transparent rounded-none"
            style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
            onClick={() => navigate(path)}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} />
            <span className="text-[0.65rem] font-medium">{label}</span>
          </button>
        )
      })}
      <button
        type="button"
        className="flex-1 flex flex-col items-center gap-0.5 py-2 bg-transparent border-transparent rounded-none"
        style={{ color: tunerOpen ? "var(--accent)" : "var(--text-muted)" }}
        onClick={onToggleTuner}
        aria-pressed={tunerOpen}
      >
        <span className="relative flex items-center">
          <CircleGauge size={20} />
          {tunerOpen ? (
            <ChevronDown size={11} strokeWidth={3} className="absolute -top-1.5 -right-2.5" />
          ) : (
            <ChevronUp size={11} strokeWidth={3} className="absolute -top-1.5 -right-2.5" />
          )}
        </span>
        <span className="text-[0.65rem] font-medium">Tuner</span>
      </button>
    </nav>
  )
}
