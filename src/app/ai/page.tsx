import { Header } from '@/components/layout/header'
import { ChatInterface } from '@/components/ai/chat-interface'

export default function AIAgentPage() {
  return (
    <>
      <Header title="AI Agent" />
      <ChatInterface />
    </>
  )
}
