'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { SkeletonTable } from '@/components/ui/skeleton'
import type { DailyRevenue } from '@/types'

interface RevenueTableProps {
  refreshKey?: number
}

export function RevenueTable({ refreshKey }: RevenueTableProps) {
  const [records, setRecords] = useState<DailyRevenue[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/revenue?days=30')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setRecords(json.data || [])
    } catch {
      // silently fail, table stays empty
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords, refreshKey])

  const monthlySummary = records.reduce(
    (acc, r) => ({
      courtRentals: acc.courtRentals + Number(r.courtRentals),
      memberships: acc.memberships + Number(r.memberships),
      lessons: acc.lessons + Number(r.lessons),
      proShop: acc.proShop + Number(r.proShop),
      events: acc.events + Number(r.events),
      other: acc.other + Number(r.other),
      totalRevenue: acc.totalRevenue + Number(r.totalRevenue),
    }),
    {
      courtRentals: 0,
      memberships: 0,
      lessons: 0,
      proShop: 0,
      events: 0,
      other: 0,
      totalRevenue: 0,
    }
  )

  const exportCSV = () => {
    const headers = [
      'Date',
      'Court Rentals',
      'Memberships',
      'Lessons',
      'Pro Shop',
      'Events',
      'Other',
      'Total',
    ]
    const rows = records.map((r) => [
      new Date(r.date).toISOString().split('T')[0],
      Number(r.courtRentals).toFixed(2),
      Number(r.memberships).toFixed(2),
      Number(r.lessons).toFixed(2),
      Number(r.proShop).toFixed(2),
      Number(r.events).toFixed(2),
      Number(r.other).toFixed(2),
      Number(r.totalRevenue).toFixed(2),
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `revenue-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <SkeletonTable rows={8} columns={8} />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-100">
          Revenue History
          <span className="ml-2 text-xs font-normal text-zinc-500">
            Last 30 days
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchRecords}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Courts</TableHead>
            <TableHead className="text-right">Members</TableHead>
            <TableHead className="text-right">Lessons</TableHead>
            <TableHead className="text-right">Pro Shop</TableHead>
            <TableHead className="text-right">Events</TableHead>
            <TableHead className="text-right">Other</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Monthly summary row */}
          <TableRow className="bg-amber-500/5 border-b-2 border-amber-500/20">
            <TableCell className="font-semibold text-amber-400">
              30-Day Total
            </TableCell>
            <TableCell className="text-right font-medium text-amber-300">
              {formatCurrency(monthlySummary.courtRentals)}
            </TableCell>
            <TableCell className="text-right font-medium text-amber-300">
              {formatCurrency(monthlySummary.memberships)}
            </TableCell>
            <TableCell className="text-right font-medium text-amber-300">
              {formatCurrency(monthlySummary.lessons)}
            </TableCell>
            <TableCell className="text-right font-medium text-amber-300">
              {formatCurrency(monthlySummary.proShop)}
            </TableCell>
            <TableCell className="text-right font-medium text-amber-300">
              {formatCurrency(monthlySummary.events)}
            </TableCell>
            <TableCell className="text-right font-medium text-amber-300">
              {formatCurrency(monthlySummary.other)}
            </TableCell>
            <TableCell className="text-right font-bold text-emerald-400">
              {formatCurrency(monthlySummary.totalRevenue)}
            </TableCell>
          </TableRow>

          {records.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-zinc-500 py-8">
                No revenue data for the last 30 days
              </TableCell>
            </TableRow>
          )}

          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-zinc-200">
                {formatDate(r.date)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(Number(r.courtRentals))}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(Number(r.memberships))}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(Number(r.lessons))}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(Number(r.proShop))}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(Number(r.events))}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(Number(r.other))}
              </TableCell>
              <TableCell className="text-right font-semibold text-zinc-100">
                {formatCurrency(Number(r.totalRevenue))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
