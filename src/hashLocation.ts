import { useSyncExternalStore } from "react"
import type { BaseLocationHook } from "wouter"

// wouter's built-in "wouter/use-hash-location" keeps the query string in the
// real `location.search` (outside the `#`), producing URLs like
// `?q=foo#/search` instead of the intended `#/search?q=foo`. This hook keeps
// the whole path+search pair inside the hash fragment.

const listeners = new Set<() => void>()

function onHashChange() {
  for (const listener of listeners) listener()
}

function subscribe(callback: () => void) {
  if (listeners.size === 0) addEventListener("hashchange", onHashChange)
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
    if (listeners.size === 0) removeEventListener("hashchange", onHashChange)
  }
}

function rawHash(): string {
  return location.hash.replace(/^#/, "") || "/"
}

function currentPath(): string {
  return `/${rawHash().replace(/^\/?/, "").split("?")[0]}`
}

function currentSearch(): string {
  const [, search] = rawHash().split("?")
  return search ? `?${search}` : ""
}

function navigate(
  to: string,
  { replace = false, state = null }: { replace?: boolean; state?: unknown } = {},
) {
  const url = new URL(location.href)
  url.hash = to.startsWith("/") ? to : `/${to}`
  if (replace) {
    history.replaceState(state, "", url)
  } else {
    history.pushState(state, "", url)
  }
  dispatchEvent(new HashChangeEvent("hashchange"))
}

function useHashSearch(): string {
  return useSyncExternalStore(subscribe, currentSearch)
}

function useHashLocationHook(): [string, typeof navigate] {
  return [useSyncExternalStore(subscribe, currentPath), navigate]
}

useHashLocationHook.searchHook = useHashSearch

export const useHashLocation: BaseLocationHook = useHashLocationHook
