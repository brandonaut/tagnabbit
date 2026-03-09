import { useEffect, useState } from "react"
import type { SearchResult, Tag } from "./api/tags.ts"
import { getFavorites, removeFavorite, toggleFavorite } from "./cache/favorites.ts"
import PWABadge from "./PWABadge.tsx"
import SearchPage from "./SearchPage.tsx"
import TagPage from "./TagPage.tsx"

interface SearchState {
  query: string
  result: SearchResult | null
}

export default function App() {
  const [searchState, setSearchState] = useState<SearchState>({ query: "", result: null })
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null)
  const [favorites, setFavorites] = useState<Record<string, Tag>>(getFavorites)

  useEffect(() => {
    const handlePopState = () => setSelectedTag(null)
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  function handleToggleFavorite(tag: Tag) {
    toggleFavorite(tag)
    setFavorites(getFavorites())
  }

  function handleRemoveFavorite(id: string) {
    removeFavorite(id)
    setFavorites(getFavorites())
  }

  return (
    <>
      {selectedTag ? (
        <TagPage
          tag={selectedTag}
          onBack={() => history.back()}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      ) : (
        <SearchPage
          initialQuery={searchState.query}
          initialResult={searchState.result}
          favorites={favorites}
          onSelectTag={(tag, query, result) => {
            setSearchState({ query, result })
            setSelectedTag(tag)
            history.pushState({}, "")
          }}
          onRemoveFavorite={handleRemoveFavorite}
        />
      )}
      <PWABadge />
    </>
  )
}
