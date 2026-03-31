import { Header } from '@/components/layout/header'
import { StatCards } from '@/components/dashboard/stat-cards'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { VisitsChart } from '@/components/dashboard/visits-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { ActionItems } from '@/components/dashboard/action-items'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { GoalsSummary } from '@/components/dashboard/goals-summary'
import { SocialSummary } from '@/components/dashboard/social-summary'

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
        {/* Quick Actions */}
        <QuickActions />

        {/* Stat Cards */}
        <StatCards />

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RevenueChart />
          <VisitsChart />
        </div>

        {/* Bottom Row: Activity Feed + Action Items + Goals + Social */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <ActivityFeed />
          <ActionItems />
          <GoalsSummary />
          <SocialSummary />
        </div>
      </main>
    </>
  )
}
