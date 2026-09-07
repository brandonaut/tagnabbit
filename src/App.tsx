import { useEffect, useState } from "react"
import { Redirect, Route, Router, Switch } from "wouter"
import type { Tag } from "./api/tags.ts"
import { getFavorites, toggleFavorite } from "./cache/favorites.ts"
import FavoritesPage from "./FavoritesPage.tsx"
import { useHashLocation } from "./hashLocation.ts"
import Layout from "./Layout.tsx"
import PlayerPage from "./PlayerPage.tsx"
import PWABadge from "./PWABadge.tsx"
import SearchPage from "./SearchPage.tsx"
import TagPage from "./TagPage.tsx"
import Tuner from "./Tuner.tsx"

export default function App() {
  const [favorites, setFavorites] = useState<Record<string, Tag>>(getFavorites)
  const [tunerOpen, setTunerOpen] = useState(false)

  const [location] = useHashLocation()
  // Close the overlay on every screen change; `location` is the trigger, not a value read.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional trigger-only dependency
  useEffect(() => {
    setTunerOpen(false)
  }, [location])

  function handleToggleFavorite(tag: Tag) {
    toggleFavorite(tag)
    setFavorites(getFavorites())
  }

  const toggleTuner = () => {
    setTunerOpen((v) => !v)
  }

  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/tag/:id">
          {(params) => (
            <TagPage
              id={params.id}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              tunerOpen={tunerOpen}
              onToggleTuner={toggleTuner}
            />
          )}
        </Route>
        <Route>
          <Layout tunerOpen={tunerOpen} onToggleTuner={toggleTuner}>
            <Switch>
              <Route path="/favorites">
                <FavoritesPage favorites={favorites} />
              </Route>
              <Route path="/player">
                <PlayerPage />
              </Route>
              <Route path="/search">
                <SearchPage favorites={favorites} />
              </Route>
              <Route>
                <Redirect to="/search" />
              </Route>
            </Switch>
          </Layout>
        </Route>
      </Switch>
      {tunerOpen && <Tuner />}
      <PWABadge />
    </Router>
  )
}
