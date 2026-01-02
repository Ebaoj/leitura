'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Flame } from 'lucide-react'

export function ReadingStreak() {
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    calculateStreak()
  }, [])

  const calculateStreak = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get reading progress ordered by date
    const { data: progress } = await supabase
      .from('leitura_reading_progress')
      .select('reading_date')
      .eq('user_id', user.id)
      .order('reading_date', { ascending: false })

    if (!progress || progress.length === 0) {
      setStreak(0)
      setLoading(false)
      return
    }

    // Calculate streak
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const uniqueDates = [...new Set(progress.map(p => p.reading_date))].sort().reverse()

    let currentStreak = 0
    let checkDate = new Date(today)

    // Check if read today or yesterday (to allow current streak)
    const lastReadDate = new Date(uniqueDates[0])
    const diffDays = Math.floor((today.getTime() - lastReadDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays > 1) {
      // Streak broken
      setStreak(0)
      setLoading(false)
      return
    }

    // Count consecutive days
    for (const dateStr of uniqueDates) {
      const date = new Date(dateStr)
      const expectedDate = new Date(checkDate)

      if (date.toDateString() === expectedDate.toDateString()) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (date < expectedDate) {
        // Check if it's the previous day
        expectedDate.setDate(expectedDate.getDate() - 1)
        if (date.toDateString() === expectedDate.toDateString()) {
          currentStreak++
          checkDate = new Date(date)
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
    }

    setStreak(currentStreak)
    setLoading(false)
  }

  if (loading || streak === 0) return null

  return (
    <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">{streak} {streak === 1 ? 'dia' : 'dias'}</p>
            <p className="text-sm text-white/80">de leitura consecutiva</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
