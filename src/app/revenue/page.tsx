'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { RevenueForm } from '@/components/revenue/revenue-form'
import { RevenueTable } from '@/components/revenue/revenue-table'
import { RevenueCharts } from '@/components/revenue/revenue-charts'

export default function RevenuePage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSaved = () => {
    setRefreshKey((k) => k + 1)
  }

  return (
    <>
      <Header title="Revenue" />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
        {/* Daily Entry Form */}
        <RevenueForm onSaved={handleSaved} />

        {/* Revenue Charts */}
        <RevenueCharts refreshKey={refreshKey} />

        {/* Revenue History Table */}
        <RevenueTable refreshKey={refreshKey} />
      </main>
    </>
  )
}
