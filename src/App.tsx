import { useState } from "react"
import { Redirect, Route, Router, Switch } from "wouter"
import type { Tag } from "./api/tags.ts"
import { getFavorites, toggleFavorite } from "./cache/favorites.ts"
import FavoritesPage from "./FavoritesPage.tsx"
import { useHashLocation } from "./hashLocation.ts"
import PWABadge from "./PWABadge.tsx"
import SearchPage from "./SearchPage.tsx"
import TagPage from "./TagPage.tsx"

export default function App() {
  const [favorites, setFavorites] = useState<Record<string, Tag>>(getFavorites)

  function handleToggleFavorite(tag: Tag) {
    toggleFavorite(tag)
    setFavorites(getFavorites())
  }

  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/tag/:id">
          {(params) => (
            <TagPage id={params.id} favorites={favorites} onToggleFavorite={handleToggleFavorite} />
          )}
        </Route>
        <Route path="/favorites">
          <FavoritesPage favorites={favorites} />
        </Route>
        <Route path="/search">
          <SearchPage favorites={favorites} />
        </Route>
        <Route>
          <Redirect to="/search" />
        </Route>
      </Switch>
      <PWABadge />
    </Router>
  )
}
