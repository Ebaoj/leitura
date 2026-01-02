'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, BookOpen, Clock, Calendar } from 'lucide-react'

interface Stats {
  totalBooks: number
  totalPages: number
  totalMinutes: number
  booksThisMonth: number
  pagesThisMonth: number
  readingDays: number
  monthlyData: { month: string; books: number }[]
}

export function ReadingStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const startOfYear = `${now.getFullYear()}-01-01`

    // Total books read
    const { count: totalBooks } = await supabase
      .from('leitura_user_books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'read')

    // Books this month
    const { count: booksThisMonth } = await supabase
      .from('leitura_user_books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'read')
      .gte('finished_at', startOfMonth)

    // Reading progress stats
    const { data: progressData } = await supabase
      .from('leitura_reading_progress')
      .select('pages_read, minutes_read, reading_date')
      .eq('user_id', user.id)
      .gte('reading_date', startOfYear)

    const totalPages = progressData?.reduce((sum, p) => sum + p.pages_read, 0) || 0
    const totalMinutes = progressData?.reduce((sum, p) => sum + (p.minutes_read || 0), 0) || 0
    const pagesThisMonth = progressData
      ?.filter(p => p.reading_date >= startOfMonth)
      .reduce((sum, p) => sum + p.pages_read, 0) || 0
    const readingDays = new Set(progressData?.map(p => p.reading_date)).size

    // Monthly book data for the year
    const { data: monthlyBooks } = await supabase
      .from('leitura_user_books')
      .select('finished_at')
      .eq('user_id', user.id)
      .eq('status', 'read')
      .gte('finished_at', startOfYear)
      .not('finished_at', 'is', null)

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(now.getFullYear(), i, 1)
      const monthStr = month.toLocaleDateString('pt-BR', { month: 'short' })
      const books = monthlyBooks?.filter(b => {
        if (!b.finished_at) return false
        const date = new Date(b.finished_at)
        return date.getMonth() === i && date.getFullYear() === now.getFullYear()
      }).length || 0
      return { month: monthStr, books }
    })

    setStats({
      totalBooks: totalBooks || 0,
      totalPages,
      totalMinutes,
      booksThisMonth: booksThisMonth || 0,
      pagesThisMonth,
      readingDays,
      monthlyData,
    })
    setLoading(false)
  }

  if (loading || !stats) return null

  const maxBooks = Math.max(...stats.monthlyData.map(m => m.books), 1)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-500" />
          Estatísticas de Leitura
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="chart">Gráfico</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-xs">Total de livros</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalBooks}</p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Este mês</span>
                </div>
                <p className="text-2xl font-bold">{stats.booksThisMonth}</p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-xs">Páginas lidas</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalPages.toLocaleString()}</p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Horas lendo</span>
                </div>
                <p className="text-2xl font-bold">{Math.round(stats.totalMinutes / 60)}</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Você leu em <strong>{stats.readingDays}</strong> dias diferentes este ano!
              </p>
            </div>
          </TabsContent>

          <TabsContent value="chart" className="mt-4">
            <p className="text-sm text-zinc-500 mb-4">Livros lidos por mês em {new Date().getFullYear()}</p>
            <div className="flex items-end gap-1 h-32">
              {stats.monthlyData.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-amber-500 rounded-t transition-all"
                    style={{ height: `${(m.books / maxBooks) * 100}%`, minHeight: m.books > 0 ? '4px' : '0' }}
                  />
                  <span className="text-xs text-zinc-500 mt-1">{m.month}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
