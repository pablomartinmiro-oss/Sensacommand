import { Header } from '@/components/layout/header'
import { MemberDashboard } from '@/components/members/member-dashboard'

export default function MembersPage() {
  return (
    <>
      <Header title="Members" />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
        <div>
          <p className="text-sm text-[#9CA3AF]">
            Membership health, churn risk, and renewal tracking.
          </p>
        </div>

        <MemberDashboard />
      </main>
    </>
  )
}
