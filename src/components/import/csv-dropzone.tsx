'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CSVDropzoneProps {
  onFileLoaded: (text: string, fileName: string) => void
}

export function CSVDropzone({ onFileLoaded }: CSVDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<{ name: string; size: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const readFile = useCallback(
    async (f: File) => {
      const isCSV = f.name.endsWith('.csv') || f.type === 'text/csv'
      const isExcel = f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.type.includes('spreadsheet')

      if (!isCSV && !isExcel) {
        alert('Please upload a .csv or .xlsx file')
        return
      }

      setFile({ name: f.name, size: f.size })

      if (isExcel) {
        // Parse xlsx on client side using SheetJS
        const XLSX = (await import('xlsx')).default
        const reader = new FileReader()
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const csvText = XLSX.utils.sheet_to_csv(ws)
          if (csvText) onFileLoaded(csvText, f.name)
        }
        reader.readAsArrayBuffer(f)
      } else {
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target?.result as string
          if (text) onFileLoaded(text, f.name)
        }
        reader.readAsText(f)
      }
    },
    [onFileLoaded],
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) readFile(f)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) readFile(f)
  }

  function clearFile() {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors',
          dragging
            ? 'border-amber-500 bg-amber-500/5'
            : file
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-[#D1D5DB] bg-white/30 hover:border-[#D1D5DB] hover:bg-[#F8F7F4]',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={handleInputChange}
          className="hidden"
        />

        {file ? (
          <div className="flex flex-col items-center gap-3">
            <FileText className="w-12 h-12 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-[#1A1A2E]">{file.name}</p>
              <p className="text-xs text-[#9CA3AF] mt-1">{formatSize(file.size)}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                clearFile()
              }}
            >
              <X className="w-4 h-4" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload
              className={cn(
                'w-12 h-12',
                dragging ? 'text-amber-400' : 'text-[#9CA3AF]',
              )}
            />
            <div>
              <p className="text-sm font-medium text-[#374151]">
                Drop your CSV or Excel file here, or{' '}
                <span className="text-amber-400 underline">browse</span>
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Accepts .csv, .xlsx, and .xls files
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
