import { CircleGauge, Heart, Music, Search } from "lucide-react"
import { useLocation } from "wouter"

const TABS = [
  { path: "/search", label: "Search", Icon: Search },
  { path: "/favorites", label: "Favorites", Icon: Heart },
  { path: "/player", label: "Player", Icon: Music },
  { path: "/tuner", label: "Tuner", Icon: CircleGauge },
] as const

export default function TabBar() {
  const [location, navigate] = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex bg-[var(--bg-surface)] border-t border-[var(--border)]"
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
    </nav>
  )
}
