import type { ReactNode } from "react"
import TabBar from "./TabBar"

interface Props {
  children: ReactNode
  tunerOpen: boolean
  onToggleTuner: () => void
}

export default function Layout({ children, tunerOpen, onToggleTuner }: Props) {
  return (
    <div style={{ paddingBottom: "calc(3.75rem + env(safe-area-inset-bottom))" }}>
      {children}
      <TabBar tunerOpen={tunerOpen} onToggleTuner={onToggleTuner} />
    </div>
  )
}
