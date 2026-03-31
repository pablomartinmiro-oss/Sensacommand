'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { CSVDropzone } from '@/components/import/csv-dropzone'
import { ImportPreview } from '@/components/import/import-preview'

export default function ImportPage() {
  const [csvData, setCsvData] = useState<{ text: string; name: string } | null>(null)

  function handleFileLoaded(text: string, fileName: string) {
    setCsvData({ text, name: fileName })
  }

  return (
    <>
      <Header title="Import Data" />
      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-lg font-heading font-semibold text-zinc-200 mb-1">
              Import Players & Visits
            </h2>
            <p className="text-sm text-zinc-500">
              Upload a CSV file from your booking system (PlayByPoint, CourtReserve, etc.)
              to import players, visits, and payments.
            </p>
          </div>

          <CSVDropzone onFileLoaded={handleFileLoaded} />

          {csvData && (
            <div className="mt-6">
              <ImportPreview csvText={csvData.text} fileName={csvData.name} />
            </div>
          )}
        </div>
      </main>
    </>
  )
}
