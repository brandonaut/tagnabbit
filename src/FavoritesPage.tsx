import { useLocation } from "wouter"
import type { Tag } from "./api/tags"
import NavTabs from "./NavTabs"
import { TagListItem } from "./TagListItem"

interface Props {
  favorites: Record<string, Tag>
}

export default function FavoritesPage({ favorites }: Props) {
  const [, navigate] = useLocation()
  const favoriteTags = Object.values(favorites)

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="m-0 text-2xl font-bold shrink-0">Tagnabbit</h1>
        <NavTabs />
      </div>

      {favoriteTags.length === 0 ? (
        <p className="text-[var(--text-muted)] text-sm">
          No favorites yet. Open a tag and tap the heart to save it here.
        </p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-2">
          {favoriteTags.map((tag) => (
            <TagListItem
              key={tag.id}
              tag={tag}
              onClick={() => navigate(`/tag/${tag.id}`)}
              isFavorited
            />
          ))}
        </ul>
      )}
    </div>
  )
}
