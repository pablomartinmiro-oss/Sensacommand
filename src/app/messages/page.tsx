import { Header } from '@/components/layout/header'
import { MessageCenter } from '@/components/messages/message-center'

export default function MessagesPage() {
  return (
    <>
      <Header title="Messages" />
      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
        <MessageCenter />
      </main>
    </>
  )
}
