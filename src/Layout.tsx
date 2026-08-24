import type { ReactNode } from "react"
import TabBar from "./TabBar"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ paddingBottom: "calc(3.75rem + env(safe-area-inset-bottom))" }}>
      {children}
      <TabBar />
    </div>
  )
}
