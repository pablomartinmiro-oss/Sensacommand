import { Header } from '@/components/layout/header'
import { LeadBoard } from '@/components/leads/lead-board'

export default function LeadsPage() {
  return (
    <>
      <Header title="Leads Pipeline" />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              Track prospects from first visit to membership conversion.
            </p>
          </div>
        </div>

        <LeadBoard />
      </main>
    </>
  )
}
