'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { CSVDropzone } from '@/components/import/csv-dropzone'
import { cn } from '@/lib/utils'
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react'

type ImportMode = 'bookings' | 'members'

interface ImportResult {
  newPlayers: number
  matchedPlayers: number
  visits: number
  payments: number
  totalRevenue: number
  errors: string[]
}

// Common column name aliases for auto-detection
const COLUMN_ALIASES: Record<string, string[]> = {
  firstName: ['first name', 'first_name', 'firstname', 'fname'],
  lastName: ['last name', 'last_name', 'lastname', 'lname', 'surname'],
  name: ['name', 'player name', 'player', 'full name', 'fullname', 'customer', 'member'],
  email: ['email', 'e-mail', 'email address', 'emailaddress'],
  phone: ['phone', 'phone number', 'telephone', 'mobile', 'cell'],
  date: ['date', 'reservation date', 'booking date', 'visit date', 'session date'],
  startTime: ['start time', 'start_time', 'starttime', 'time', 'check in', 'checkin'],
  endTime: ['end time', 'end_time', 'endtime', 'check out', 'checkout'],
  court: ['court', 'court name', 'court number', 'court_name', 'resource'],
  amount: ['amount', 'price', 'amount paid', 'total', 'cost', 'fee', 'payment'],
  type: ['type', 'booking type', 'visit type', 'session type', 'category'],
  duration: ['duration', 'length', 'time_length', 'minutes'],
  membershipType: ['membership', 'membership type', 'plan', 'plan name', 'tier'],
  startDate: ['start date', 'member since', 'join date', 'enrollment date'],
  monthlyRate: ['rate', 'monthly rate', 'monthly', 'price', 'amount'],
  status: ['status', 'booking status', 'state'],
}

function autoDetectColumn(headers: string[], targetField: string): string {
  const aliases = COLUMN_ALIASES[targetField] || []
  for (const header of headers) {
    const lower = header.toLowerCase().trim()
    if (lower === targetField.toLowerCase()) return header
    for (const alias of aliases) {
      if (lower === alias || lower.includes(alias)) return header
    }
  }
  return ''
}

function parseCSVRaw(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    fields.push(current.trim())
    return fields
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(parseRow).filter(r => r.some(cell => cell.length > 0))
  return { headers, rows }
}

export default function ImportPage() {
  const [csvText, setCsvText] = useState<string | null>(null)
  const [mode, setMode] = useState<ImportMode>('bookings')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  // Column mapping state
  const [mapping, setMapping] = useState<Record<string, string>>({})

  const parsed = useMemo(() => {
    if (!csvText) return null
    return parseCSVRaw(csvText)
  }, [csvText])

  // Auto-detect columns on first parse
  const autoMapping = useMemo(() => {
    if (!parsed) return {}
    const m: Record<string, string> = {}
    const fields = mode === 'bookings'
      ? ['name', 'firstName', 'lastName', 'email', 'phone', 'date', 'startTime', 'endTime', 'court', 'amount', 'type']
      : ['name', 'firstName', 'lastName', 'email', 'phone', 'membershipType', 'startDate', 'monthlyRate']
    for (const field of fields) {
      m[field] = autoDetectColumn(parsed.headers, field)
    }
    return m
  }, [parsed, mode])

  const activeMapping = { ...autoMapping, ...mapping }

  function handleFileLoaded(text: string) {
    setCsvText(text)
    setResult(null)
    setMapping({})
  }

  async function handleImport() {
    if (!parsed || !csvText) return
    setImporting(true)
    setResult(null)

    try {
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          mapping: activeMapping,
          rows: parsed.rows.map(row => {
            const obj: Record<string, string> = {}
            parsed.headers.forEach((h, i) => { obj[h] = row[i] || '' })
            return obj
          }),
        }),
      })
      const json = await res.json()
      if (json.data) setResult(json.data)
      else setResult({ newPlayers: 0, matchedPlayers: 0, visits: 0, payments: 0, totalRevenue: 0, errors: [json.error || 'Import failed'] })
    } catch {
      setResult({ newPlayers: 0, matchedPlayers: 0, visits: 0, payments: 0, totalRevenue: 0, errors: ['Network error'] })
    }
    setImporting(false)
  }

  const requiredFields = mode === 'bookings' ? ['date'] : []
  const hasName = activeMapping.name || (activeMapping.firstName && activeMapping.lastName)
  const canImport = parsed && parsed.rows.length > 0 && hasName && requiredFields.every(f => activeMapping[f])

  return (
    <>
      <Header title="Import Data" />
      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
        <div className="max-w-4xl mx-auto">
          {/* Mode toggle */}
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => { setMode('bookings'); setMapping({}) }} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', mode === 'bookings' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-[#6B7280] border border-[#D1D5DB]')}>
              Player & Booking Data
            </button>
            <button onClick={() => { setMode('members'); setMapping({}) }} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', mode === 'members' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-[#6B7280] border border-[#D1D5DB]')}>
              Member List
            </button>
          </div>

          <p className="text-sm text-[#9CA3AF] mb-4">
            {mode === 'bookings'
              ? 'Upload a CSV from PlayByPoint or your booking system. We\'ll import players, visits, and payments.'
              : 'Upload a member list CSV. We\'ll create or update player records with membership data.'}
          </p>

          <CSVDropzone onFileLoaded={handleFileLoaded} />

          {/* Column Mapping */}
          {parsed && parsed.headers.length > 0 && !result && (
            <div className="mt-6 bg-white border border-[#E8E4DD] rounded-xl p-5 space-y-5">
              <h3 className="text-sm font-semibold text-[#1A1A2E]">Map Columns</h3>
              <p className="text-xs text-[#9CA3AF]">We auto-detected some columns. Adjust if needed.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(mode === 'bookings'
                  ? [
                    { key: 'name', label: 'Full Name', required: !activeMapping.firstName },
                    { key: 'firstName', label: 'First Name', required: !activeMapping.name },
                    { key: 'lastName', label: 'Last Name', required: !activeMapping.name },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'date', label: 'Date *', required: true },
                    { key: 'startTime', label: 'Start Time' },
                    { key: 'endTime', label: 'End Time' },
                    { key: 'court', label: 'Court' },
                    { key: 'amount', label: 'Amount Paid' },
                    { key: 'type', label: 'Booking Type' },
                  ]
                  : [
                    { key: 'name', label: 'Full Name', required: !activeMapping.firstName },
                    { key: 'firstName', label: 'First Name', required: !activeMapping.name },
                    { key: 'lastName', label: 'Last Name', required: !activeMapping.name },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'membershipType', label: 'Membership Type' },
                    { key: 'startDate', label: 'Start Date' },
                    { key: 'monthlyRate', label: 'Monthly Rate' },
                  ]
                ).map(field => (
                  <div key={field.key}>
                    <label className="text-xs text-[#6B7280] mb-1 block">{field.label}</label>
                    <select
                      value={activeMapping[field.key] || ''}
                      onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full h-9 rounded-lg border border-[#D1D5DB] bg-white px-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="">— Not mapped —</option>
                      {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div>
                <h4 className="text-xs font-medium text-[#6B7280] mb-2">Preview (first 3 rows)</h4>
                <div className="overflow-x-auto border border-[#E8E4DD] rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#F8F7F4] border-b border-[#E8E4DD]">
                        {parsed.headers.map(h => (
                          <th key={h} className="px-3 py-2 text-left text-[#6B7280] font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b border-[#E8E4DD]">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 text-[#374151] whitespace-nowrap max-w-[200px] truncate">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-1">{parsed.rows.length} total rows</p>
              </div>

              <div className="flex justify-end">
                <button onClick={handleImport} disabled={importing || !canImport} className="flex items-center gap-2 h-9 px-5 rounded-lg bg-amber-500 text-black text-sm font-semibold disabled:opacity-50 hover:bg-amber-600 transition-colors">
                  <Upload className="w-4 h-4" />
                  {importing ? 'Importing...' : `Import ${parsed.rows.length} rows`}
                </button>
              </div>
            </div>
          )}

          {/* Import Result */}
          {result && (
            <div className="mt-6 bg-white border border-[#E8E4DD] rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                {result.errors.length === 0 ? (
                  <><CheckCircle className="w-5 h-5 text-emerald-500" /><h3 className="text-sm font-semibold text-emerald-700">Import Complete</h3></>
                ) : (
                  <><AlertTriangle className="w-5 h-5 text-amber-500" /><h3 className="text-sm font-semibold text-amber-700">Import Complete with Warnings</h3></>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="text-center p-3 bg-[#F8F7F4] rounded-lg">
                  <p className="text-lg font-bold text-[#1A1A2E]">{result.newPlayers}</p>
                  <p className="text-[10px] text-[#9CA3AF]">New Players</p>
                </div>
                <div className="text-center p-3 bg-[#F8F7F4] rounded-lg">
                  <p className="text-lg font-bold text-[#1A1A2E]">{result.matchedPlayers}</p>
                  <p className="text-[10px] text-[#9CA3AF]">Matched Existing</p>
                </div>
                <div className="text-center p-3 bg-[#F8F7F4] rounded-lg">
                  <p className="text-lg font-bold text-[#1A1A2E]">{result.visits}</p>
                  <p className="text-[10px] text-[#9CA3AF]">Visits Imported</p>
                </div>
                <div className="text-center p-3 bg-[#F8F7F4] rounded-lg">
                  <p className="text-lg font-bold text-[#1A1A2E]">{result.payments}</p>
                  <p className="text-[10px] text-[#9CA3AF]">Payments</p>
                </div>
                <div className="text-center p-3 bg-[#F8F7F4] rounded-lg">
                  <p className="text-lg font-bold text-amber-600">${result.totalRevenue.toLocaleString()}</p>
                  <p className="text-[10px] text-[#9CA3AF]">Total Revenue</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-700 mb-1">{result.errors.length} error(s):</p>
                  <div className="max-h-[150px] overflow-y-auto space-y-1">
                    {result.errors.slice(0, 20).map((err, i) => (
                      <p key={i} className="text-xs text-red-600">{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
