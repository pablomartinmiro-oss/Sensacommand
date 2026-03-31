'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { AlertTriangle, CheckCircle, Upload, Loader2 } from 'lucide-react'

interface PreviewRow {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  courtNumber: number
  date: string
  startTime: string
  endTime: string
  visitType: string
  amountPaid: number
  errors: string[]
  exists: boolean
}

interface PreviewData {
  rows: PreviewRow[]
  errors: { row: number; message: string }[]
  totalRows: number
  validRows: number
  existingPlayerCount: number
}

interface ImportResult {
  playersCreated: number
  playersUpdated: number
  visitsCreated: number
  paymentsCreated: number
  errors: { row: number; message: string }[]
}

interface ImportPreviewProps {
  csvText: string
  fileName: string
}

export function ImportPreview({ csvText, fileName }: ImportPreviewProps) {
  const { toast } = useToast()
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingImport, setLoadingImport] = useState(false)

  async function handlePreview() {
    setLoadingPreview(true)
    setResult(null)
    try {
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, action: 'preview' }),
      })
      if (!res.ok) throw new Error('Failed to parse CSV')
      const json = await res.json()
      setPreview(json.data)
    } catch {
      toast('error', 'Failed to parse CSV file')
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handleImport() {
    if (!confirm('This will create/update players, visits, and payments. Continue?')) return
    setLoadingImport(true)
    try {
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, action: 'import' }),
      })
      if (!res.ok) throw new Error('Import failed')
      const json = await res.json()
      setResult(json.data)
      toast('success', 'Import completed successfully')
    } catch {
      toast('error', 'Import failed')
    } finally {
      setLoadingImport(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* File info + Parse button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B7280]">
          File: <span className="text-[#1A1A2E]">{fileName}</span>
        </p>
        <Button
          size="sm"
          onClick={handlePreview}
          loading={loadingPreview}
          disabled={loadingPreview}
        >
          Parse & Preview
        </Button>
      </div>

      {/* Preview results */}
      {preview && !result && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-[#E8E4DD] bg-white p-4 text-center">
              <p className="text-2xl font-heading font-bold text-[#1A1A2E]">
                {preview.totalRows}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">Total Rows</p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
              <p className="text-2xl font-heading font-bold text-emerald-400">
                {preview.validRows}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">Valid Rows</p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <p className="text-2xl font-heading font-bold text-amber-400">
                {preview.existingPlayerCount}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">Existing Players</p>
            </div>
          </div>

          {/* Error summary */}
          {preview.errors.length > 0 && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-sm font-medium text-red-400">
                  {preview.errors.length} row(s) have errors
                </p>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {preview.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-300/70">
                    Row {err.row}: {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Preview table */}
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row, idx) => {
                  const hasErrors = row.errors.length > 0
                  return (
                    <TableRow
                      key={idx}
                      className={cn(
                        hasErrors && 'bg-red-500/5',
                      )}
                    >
                      <TableCell className="text-xs text-[#9CA3AF]">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium text-[#1A1A2E]">
                        {row.firstName} {row.lastName}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-xs',
                          row.exists ? 'text-amber-400' : 'text-[#6B7280]',
                        )}
                      >
                        {row.email || '--'}
                        {row.exists && (
                          <AlertTriangle className="w-3 h-3 inline ml-1 text-amber-400" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-[#6B7280]">
                        {row.phone || '--'}
                      </TableCell>
                      <TableCell>{row.courtNumber}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(row.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{row.visitType}</Badge>
                      </TableCell>
                      <TableCell className="text-emerald-400">
                        ${row.amountPaid}
                      </TableCell>
                      <TableCell>
                        {hasErrors ? (
                          <Badge variant="error" className="text-xs">
                            {row.errors.join('; ')}
                          </Badge>
                        ) : (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Import button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleImport}
              loading={loadingImport}
              disabled={preview.validRows === 0}
            >
              <Upload className="w-4 h-4" />
              Import {preview.validRows} Valid Row(s)
            </Button>
          </div>
        </>
      )}

      {/* Import results */}
      {result && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-heading font-semibold text-emerald-300">
              Import Complete
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-heading font-bold text-[#1A1A2E]">
                {result.playersCreated}
              </p>
              <p className="text-xs text-[#9CA3AF]">Players Created</p>
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-[#1A1A2E]">
                {result.playersUpdated}
              </p>
              <p className="text-xs text-[#9CA3AF]">Players Matched</p>
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-[#1A1A2E]">
                {result.visitsCreated}
              </p>
              <p className="text-xs text-[#9CA3AF]">Visits Created</p>
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-[#1A1A2E]">
                {result.paymentsCreated}
              </p>
              <p className="text-xs text-[#9CA3AF]">Payments Created</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <p className="text-xs text-amber-400 mt-3">
              {result.errors.length} row(s) skipped due to errors.
            </p>
          )}
        </div>
      )}

      {/* Loading state */}
      {loadingImport && (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
          <p className="text-sm text-[#6B7280]">Importing data...</p>
        </div>
      )}
    </div>
  )
}
