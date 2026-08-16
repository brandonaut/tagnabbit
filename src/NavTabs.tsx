import { useLocation } from "wouter"

export default function NavTabs() {
  const [location, navigate] = useLocation()
  const activeTab = location === "/favorites" ? "favorites" : "search"

  return (
    <div className="relative flex bg-[var(--text-muted)]/25 rounded-full p-0.5 text-sm">
      <div
        className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-200 bg-[var(--accent)]"
        style={{
          left: activeTab === "search" ? "2px" : "50%",
          right: activeTab === "favorites" ? "2px" : "50%",
        }}
      />
      <button
        type="button"
        className={`relative z-10 px-3 py-0.5 w-1/2 rounded-full transition-colors duration-150 font-medium ${activeTab === "search" ? "bg-[var(--accent)]/25 text-[var(--bg-surface)]" : "bg-[var(--bg)] text-[var(--text-muted)]"}`}
        onClick={() => navigate("/search")}
      >
        Search
      </button>
      <button
        type="button"
        className={`relative z-10 px-3 py-0.5 w-1/2 rounded-full transition-colors duration-150 font-medium ${activeTab === "favorites" ? "bg-[var(--accent)]/25 text-[var(--bg-surface)]" : "bg-[var(--bg)] text-[var(--text-muted)]"}`}
        onClick={() => navigate("/favorites")}
      >
        Favorites
      </button>
    </div>
  )
}
