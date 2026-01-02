import { Sidebar } from '@/components/sidebar'
import { Toaster } from '@/components/ui/sonner'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  )
}
