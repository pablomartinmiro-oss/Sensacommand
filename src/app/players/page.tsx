'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { PlayerTable } from '@/components/players/player-table'
import { PlayerForm } from '@/components/players/player-form'

export default function PlayersPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSaved = () => {
    setRefreshKey((k) => k + 1)
  }

  return (
    <>
      <Header
        title="Players"
        action={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add Player
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
        <PlayerTable refreshKey={refreshKey} />
      </main>

      <PlayerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </>
  )
}
