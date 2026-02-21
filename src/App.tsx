import { useState } from 'react'
import PWABadge from './PWABadge.tsx'
import SearchPage from './SearchPage.tsx'
import TagPage from './TagPage.tsx'
import { type Tag } from './api/tags.ts'
import './App.css'

type View = { name: 'search' } | { name: 'tag'; tag: Tag }

export default function App() {
  const [view, setView] = useState<View>({ name: 'search' })

  return (
    <>
      {view.name === 'search'
        ? <SearchPage onSelectTag={tag => setView({ name: 'tag', tag })} />
        : <TagPage tag={view.tag} onBack={() => setView({ name: 'search' })} />
      }
      <PWABadge />
    </>
  )
}
