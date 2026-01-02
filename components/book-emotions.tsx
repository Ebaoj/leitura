'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { EMOTION_LABELS, type EmotionType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BookEmotionsProps {
  bookId: string
  compact?: boolean
}

export function BookEmotions({ bookId, compact = false }: BookEmotionsProps) {
  const [selectedEmotions, setSelectedEmotions] = useState<EmotionType[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchEmotions()
  }, [bookId])

  const fetchEmotions = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('leitura_book_emotions')
      .select('emotion')
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    if (data) {
      setSelectedEmotions(data.map(e => e.emotion as EmotionType))
    }
    setLoading(false)
  }

  const toggleEmotion = async (emotion: EmotionType) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const isSelected = selectedEmotions.includes(emotion)

    if (isSelected) {
      // Remove emotion
      await supabase
        .from('leitura_book_emotions')
        .delete()
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('emotion', emotion)

      setSelectedEmotions(prev => prev.filter(e => e !== emotion))
    } else {
      // Add emotion
      const { error } = await supabase
        .from('leitura_book_emotions')
        .insert({
          user_id: user.id,
          book_id: bookId,
          emotion,
        })

      if (!error) {
        setSelectedEmotions(prev => [...prev, emotion])
        toast.success(`${EMOTION_LABELS[emotion].emoji} ${EMOTION_LABELS[emotion].label}`)
      }
    }
  }

  if (loading) return null

  const emotions = Object.entries(EMOTION_LABELS) as [EmotionType, { emoji: string; label: string }][]

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {emotions.map(([key, { emoji }]) => (
          <button
            key={key}
            onClick={() => toggleEmotion(key)}
            className={cn(
              'text-lg p-1 rounded transition-transform hover:scale-125',
              selectedEmotions.includes(key) ? 'opacity-100' : 'opacity-40 hover:opacity-70'
            )}
            title={EMOTION_LABELS[key].label}
          >
            {emoji}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-500">Como você se sentiu lendo?</p>
      <div className="flex flex-wrap gap-2">
        {emotions.map(([key, { emoji, label }]) => (
          <Button
            key={key}
            variant={selectedEmotions.includes(key) ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleEmotion(key)}
            className={cn(
              selectedEmotions.includes(key) && 'bg-amber-500 hover:bg-amber-600'
            )}
          >
            {emoji} {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
