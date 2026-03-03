import { useState, useEffect } from 'react'
import PWABadge from './PWABadge.tsx'
import SearchPage from './SearchPage.tsx'
import TagPage from './TagPage.tsx'
import { type Tag, type SearchResult } from './api/tags.ts'

interface SearchState {
  query: string;
  result: SearchResult | null;
}

export default function App() {
  const [searchState, setSearchState] = useState<SearchState>({ query: '', result: null })
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null)

  useEffect(() => {
    const handlePopState = () => setSelectedTag(null)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return (
    <>
      {selectedTag
        ? <TagPage
            tag={selectedTag}
            onBack={() => history.back()}
          />
        : <SearchPage
            initialQuery={searchState.query}
            initialResult={searchState.result}
            onSelectTag={(tag, query, result) => {
              setSearchState({ query, result })
              setSelectedTag(tag)
              history.pushState({}, '')
            }}
          />
      }
      <PWABadge />
    </>
  )
}
