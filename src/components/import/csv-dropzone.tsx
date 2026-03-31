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
    (f: File) => {
      if (!f.name.endsWith('.csv') && f.type !== 'text/csv') {
        alert('Please upload a .csv file')
        return
      }

      setFile({ name: f.name, size: f.size })
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (text) onFileLoaded(text, f.name)
      }
      reader.readAsText(f)
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
          accept=".csv,text/csv"
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
                Drop your CSV file here, or{' '}
                <span className="text-amber-400 underline">browse</span>
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Accepts .csv files only
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
