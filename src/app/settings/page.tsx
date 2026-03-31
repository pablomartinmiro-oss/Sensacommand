import { Header } from '@/components/layout/header'
import { SettingsForm } from '@/components/settings/settings-form'

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" />
      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
        <div className="max-w-3xl mx-auto">
          <SettingsForm />
        </div>
      </main>
    </>
  )
}
