'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AnnotationCard } from '@/components/annotation-card'
import { BookRecommendations } from '@/components/book-recommendations'
import { ReadingGoal } from '@/components/reading-goal'
import { ReadingStreak } from '@/components/reading-streak'
import { ReadingStats } from '@/components/reading-stats'
import { FriendActivityFeed } from '@/components/user-follow'
import { QuotesList } from '@/components/quotes-list'
import { ReadingChallenge } from '@/components/reading-challenge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, PenLine } from 'lucide-react'
import type { Annotation, Profile, Reaction, Reply, Club } from '@/lib/types'
import Link from 'next/link'

type AnnotationWithDetails = Annotation & {
  user: Profile
  reactions: Reaction[]
  replies: (Reply & { user: Profile })[]
  book: { id: string; title: string; cover_url: string | null }
}

export default function FeedPage() {
  const [annotations, setAnnotations] = useState<AnnotationWithDetails[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | string>('all')
  const [currentUserId, setCurrentUserId] = useState<string>()
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      // Get user's clubs
      const { data: memberships } = await supabase
        .from('leitura_club_members')
        .select('club_id, leitura_clubs(*)')
        .eq('user_id', user.id)

      const userClubs = memberships?.map(m => m.leitura_clubs as unknown as Club) || []
      setClubs(userClubs)

      const clubIds = userClubs.map(c => c.id)

      // Fetch annotations from clubs the user is in
      let query = supabase
        .from('leitura_annotations')
        .select(`
          *,
          user:leitura_profiles(*),
          book:leitura_books(*),
          reactions:leitura_reactions(*),
          replies:leitura_replies(*, user:leitura_profiles(*))
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (clubIds.length > 0) {
        query = query.in('club_id', clubIds)
      }

      if (filter !== 'all') {
        query = query.eq('club_id', filter)
      }

      const { data } = await query

      setAnnotations(data as AnnotationWithDetails[] || [])
      setLoading(false)
    }

    fetchData()
  }, [supabase, filter])

  const handleReact = async (annotationId: string, emoji: '❤️' | '💡' | '😂' | '🤔') => {
    if (!currentUserId) return

    const annotation = annotations.find(a => a.id === annotationId)
    const existingReaction = annotation?.reactions.find(r => r.user_id === currentUserId)

    if (existingReaction) {
      // Remove reaction
      await supabase
        .from('leitura_reactions')
        .delete()
        .eq('annotation_id', annotationId)
        .eq('user_id', currentUserId)

      setAnnotations(prev =>
        prev.map(a =>
          a.id === annotationId
            ? { ...a, reactions: a.reactions.filter(r => r.user_id !== currentUserId) }
            : a
        )
      )
    } else {
      // Add reaction
      await supabase
        .from('leitura_reactions')
        .insert({ annotation_id: annotationId, user_id: currentUserId, emoji })

      setAnnotations(prev =>
        prev.map(a =>
          a.id === annotationId
            ? { ...a, reactions: [...a.reactions, { annotation_id: annotationId, user_id: currentUserId, emoji }] }
            : a
        )
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Feed Column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Feed</h1>
          <Link href="/shelf">
            <Button className="bg-amber-500 hover:bg-amber-600">
              <PenLine className="h-4 w-4 mr-2" />
              Nova Anotação
            </Button>
          </Link>
        </div>

        {/* Reading Streak */}
        <ReadingStreak />

        {/* Book Recommendations */}
        <BookRecommendations />

      {clubs.length > 0 && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | string)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            {clubs.map(club => (
              <TabsTrigger key={club.id} value={club.id}>
                {club.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {annotations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <PenLine className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="font-medium text-lg">Nenhuma anotação ainda</h3>
          <p className="text-zinc-500 mt-1">
            {clubs.length === 0
              ? 'Entre em um clube para ver anotações no feed'
              : 'Seja o primeiro a compartilhar uma anotação!'}
          </p>
          {clubs.length === 0 && (
            <Link href="/clubs">
              <Button className="mt-4 bg-amber-500 hover:bg-amber-600">
                Explorar clubes
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {annotations.map((annotation) => (
            <AnnotationCard
              key={annotation.id}
              annotation={annotation}
              currentUserId={currentUserId}
              onReact={(emoji) => handleReact(annotation.id, emoji)}
              showBook
            />
          ))}
        </div>
      )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <ReadingGoal />
        <ReadingStats />
        <ReadingChallenge />
        <FriendActivityFeed />
        <QuotesList />
      </div>
    </div>
  )
}
