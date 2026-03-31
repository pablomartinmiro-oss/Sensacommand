import Papa from 'papaparse'
import { parse, isValid } from 'date-fns'

export interface CSVRow {
  date: string
  time: string
  court: string
  playerName: string
  playerEmail: string
  playerPhone: string
  duration: string
  amountPaid: string
  bookingType: string
}

export interface ParsedRow {
  date: Date
  startTime: Date
  endTime: Date
  courtNumber: number
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  amountPaid: number
  visitType: string
  raw: Record<string, string>
  errors: string[]
}

export interface ParseResult {
  rows: ParsedRow[]
  errors: { row: number; message: string }[]
  totalRows: number
  validRows: number
}

const DATE_FORMATS = [
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'dd/MM/yyyy',
  'M/d/yyyy',
  'MM-dd-yyyy',
  'dd-MM-yyyy',
]

function parseDate(dateStr: string): Date | null {
  for (const fmt of DATE_FORMATS) {
    const parsed = parse(dateStr.trim(), fmt, new Date())
    if (isValid(parsed)) return parsed
  }
  const fallback = new Date(dateStr)
  return isValid(fallback) ? fallback : null
}

function parseTime(dateStr: string, timeStr: string): Date | null {
  const date = parseDate(dateStr)
  if (!date) return null

  const timeParts = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!timeParts) return null

  let hours = parseInt(timeParts[1])
  const minutes = parseInt(timeParts[2])
  const ampm = timeParts[3]

  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0
  }

  date.setHours(hours, minutes, 0, 0)
  return date
}

function cleanPhone(phone: string): string | null {
  if (!phone || phone.trim() === '') return null
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  if (cleaned.length < 7) return null
  if (!cleaned.startsWith('+') && cleaned.length === 10) return `+1${cleaned}`
  if (!cleaned.startsWith('+')) return `+${cleaned}`
  return cleaned
}

function mapBookingType(type: string): string {
  const lower = type.toLowerCase().trim()
  if (lower.includes('lesson') || lower.includes('class')) return 'LESSON'
  if (lower.includes('tournament') || lower.includes('tourney')) return 'TOURNAMENT'
  if (lower.includes('private') || lower.includes('event')) return 'PRIVATE_EVENT'
  if (lower.includes('member')) return 'MEMBER_SESSION'
  return 'CASUAL'
}

const COLUMN_ALIASES: Record<string, string[]> = {
  date: ['date', 'booking date', 'reservation date', 'day'],
  time: ['time', 'start time', 'booking time', 'start'],
  court: ['court', 'court number', 'court #', 'court_number'],
  playerName: ['player name', 'name', 'player', 'full name', 'customer name', 'customer'],
  playerEmail: ['email', 'player email', 'e-mail', 'customer email'],
  playerPhone: ['phone', 'player phone', 'telephone', 'mobile', 'cell', 'customer phone'],
  duration: ['duration', 'length', 'time (min)', 'minutes', 'duration (min)'],
  amountPaid: ['amount', 'amount paid', 'price', 'total', 'payment', 'cost'],
  bookingType: ['type', 'booking type', 'reservation type', 'category'],
}

function findColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {}
  const lowerHeaders = headers.map(h => h.toLowerCase().trim())

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const idx = lowerHeaders.indexOf(alias)
      if (idx !== -1) {
        mapping[field] = idx
        break
      }
    }
  }

  return mapping
}

export function parseCSV(csvText: string): ParseResult {
  const result = Papa.parse(csvText, {
    skipEmptyLines: true,
    header: false,
  })

  const rawRows = result.data as string[][]
  if (rawRows.length < 2) {
    return { rows: [], errors: [{ row: 0, message: 'CSV is empty or has no data rows' }], totalRows: 0, validRows: 0 }
  }

  const headers = rawRows[0]
  const columnMap = findColumnMapping(headers)
  const rows: ParsedRow[] = []
  const errors: { row: number; message: string }[] = []

  for (let i = 1; i < rawRows.length; i++) {
    const raw = rawRows[i]
    if (raw.every(cell => !cell || cell.trim() === '')) continue

    const rowErrors: string[] = []
    const rawObj: Record<string, string> = {}
    headers.forEach((h, idx) => { rawObj[h] = raw[idx] || '' })

    const dateStr = columnMap.date !== undefined ? raw[columnMap.date] || '' : ''
    const timeStr = columnMap.time !== undefined ? raw[columnMap.time] || '' : ''
    const courtStr = columnMap.court !== undefined ? raw[columnMap.court] || '' : ''
    const nameStr = columnMap.playerName !== undefined ? raw[columnMap.playerName] || '' : ''
    const emailStr = columnMap.playerEmail !== undefined ? raw[columnMap.playerEmail] || '' : ''
    const phoneStr = columnMap.playerPhone !== undefined ? raw[columnMap.playerPhone] || '' : ''
    const durationStr = columnMap.duration !== undefined ? raw[columnMap.duration] || '' : ''
    const amountStr = columnMap.amountPaid !== undefined ? raw[columnMap.amountPaid] || '' : ''
    const typeStr = columnMap.bookingType !== undefined ? raw[columnMap.bookingType] || '' : ''

    const date = parseDate(dateStr)
    if (!date) rowErrors.push(`Invalid date: "${dateStr}"`)

    const startTime = parseTime(dateStr, timeStr || '9:00 AM')
    const durationMin = parseInt(durationStr) || 90
    const endTime = startTime ? new Date(startTime.getTime() + durationMin * 60000) : null

    const courtNumber = parseInt(courtStr.replace(/\D/g, '')) || 1
    if (courtNumber < 1 || courtNumber > 6) rowErrors.push(`Invalid court number: ${courtNumber}`)

    const nameParts = nameStr.trim().split(/\s+/)
    const firstName = nameParts[0] || 'Unknown'
    const lastName = nameParts.slice(1).join(' ') || 'Player'

    const amount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0

    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, message: rowErrors.join('; ') })
    }

    rows.push({
      date: date || new Date(),
      startTime: startTime || new Date(),
      endTime: endTime || new Date(),
      courtNumber: Math.min(Math.max(courtNumber, 1), 6),
      firstName,
      lastName,
      email: emailStr.trim() || null,
      phone: cleanPhone(phoneStr),
      amountPaid: amount,
      visitType: mapBookingType(typeStr),
      raw: rawObj,
      errors: rowErrors,
    })
  }

  return {
    rows,
    errors,
    totalRows: rawRows.length - 1,
    validRows: rows.filter(r => r.errors.length === 0).length,
  }
}
