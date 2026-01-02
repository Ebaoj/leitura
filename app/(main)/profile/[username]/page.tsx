'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/user-avatar'
import { BookCard } from '@/components/book-card'
import { AnnotationCard } from '@/components/annotation-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, BookOpen, Users, FileText, Calendar, Settings } from 'lucide-react'
import type { Profile, Book, UserBook, Annotation, Reaction, Reply } from '@/lib/types'
import { toast } from 'sonner'
import { UserFollow } from '@/components/user-follow'
import { ReadingGoal } from '@/components/reading-goal'
import { ReadingStreak } from '@/components/reading-streak'

type UserBookWithBook = UserBook & { book: Book }

type AnnotationWithDetails = Annotation & {
  user: Profile
  reactions: Reaction[]
  replies: (Reply & { user: Profile })[]
  book: Book
}

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [recentBooks, setRecentBooks] = useState<UserBookWithBook[]>([])
  const [recentAnnotations, setRecentAnnotations] = useState<AnnotationWithDetails[]>([])
  const [stats, setStats] = useState({
    booksThisYear: 0,
    totalPages: 0,
    clubsCount: 0,
    annotationsCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>()
  const supabase = createClient()

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
    }

    // Fetch profile by username
    const { data: profileData } = await supabase
      .from('leitura_profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (!profileData) {
      router.push('/')
      return
    }

    setProfile(profileData)
    setIsOwnProfile(user?.id === profileData.id)
    setEditDisplayName(profileData.display_name || '')
    setEditBio(profileData.bio || '')

    // Fetch stats
    const currentYear = new Date().getFullYear()

    // Books read this year
    const { data: booksThisYear } = await supabase
      .from('leitura_user_books')
      .select('id, book:leitura_books(pages)')
      .eq('user_id', profileData.id)
      .eq('status', 'read')
      .gte('finished_at', `${currentYear}-01-01`)

    // Calculate total pages
    const totalPages = booksThisYear?.reduce((acc, ub) => {
      const book = ub.book as unknown as Book
      return acc + (book?.pages || 0)
    }, 0) || 0

    // Clubs count
    const { count: clubsCount } = await supabase
      .from('leitura_club_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profileData.id)

    // Annotations count
    const { count: annotationsCount } = await supabase
      .from('leitura_annotations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profileData.id)

    setStats({
      booksThisYear: booksThisYear?.length || 0,
      totalPages,
      clubsCount: clubsCount || 0,
      annotationsCount: annotationsCount || 0,
    })

    // Recent read books
    const { data: recentBooksData } = await supabase
      .from('leitura_user_books')
      .select('*, book:leitura_books(*)')
      .eq('user_id', profileData.id)
      .eq('status', 'read')
      .order('finished_at', { ascending: false })
      .limit(6)

    setRecentBooks(recentBooksData as UserBookWithBook[] || [])

    // Recent annotations (public/non-club)
    const { data: annotationsData } = await supabase
      .from('leitura_annotations')
      .select(`
        *,
        user:leitura_profiles(*),
        book:leitura_books(*),
        reactions:leitura_reactions(*),
        replies:leitura_replies(*, user:leitura_profiles(*))
      `)
      .eq('user_id', profileData.id)
      .is('club_id', null)
      .order('created_at', { ascending: false })
      .limit(5)

    setRecentAnnotations(annotationsData as AnnotationWithDetails[] || [])

    setLoading(false)
  }

  useEffect(() => {
    fetchProfile()
  }, [username, supabase])

  const handleSaveProfile = async () => {
    if (!profile) return

    const { error } = await supabase
      .from('leitura_profiles')
      .update({
        display_name: editDisplayName.trim() || null,
        bio: editBio.trim() || null,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Erro ao salvar perfil')
    } else {
      toast.success('Perfil atualizado!')
      setEditOpen(false)
      fetchProfile()
    }
  }

  const handleReact = async (annotationId: string, emoji: '❤️' | '💡' | '😂' | '🤔') => {
    if (!currentUserId) return

    const annotation = recentAnnotations.find(a => a.id === annotationId)
    const existingReaction = annotation?.reactions.find(r => r.user_id === currentUserId)

    if (existingReaction) {
      await supabase
        .from('leitura_reactions')
        .delete()
        .eq('annotation_id', annotationId)
        .eq('user_id', currentUserId)
    } else {
      await supabase
        .from('leitura_reactions')
        .insert({ annotation_id: annotationId, user_id: currentUserId, emoji })
    }

    fetchProfile()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-start gap-4">
        <UserAvatar
          src={profile.avatar_url}
          name={profile.display_name || profile.username}
          className="h-20 w-20"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              {profile.display_name || profile.username}
            </h1>
            {isOwnProfile && (
              <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-zinc-500">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">{profile.bio}</p>
          )}
          <div className="mt-3">
            <UserFollow userId={profile.id} compact />
          </div>
        </div>
      </div>

      {/* Reading Streak */}
      <ReadingStreak />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Livros {new Date().getFullYear()}</span>
            </div>
            <p className="text-2xl font-bold">{stats.booksThisYear}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Páginas lidas</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalPages.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">Clubes</span>
            </div>
            <p className="text-2xl font-bold">{stats.clubsCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Anotações</span>
            </div>
            <p className="text-2xl font-bold">{stats.annotationsCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Books */}
      {recentBooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimos Lidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {recentBooks.map((userBook) => (
                <BookCard
                  key={userBook.id}
                  book={userBook.book}
                  rating={userBook.rating}
                  compact
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Annotations */}
      {recentAnnotations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Anotações Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAnnotations.map((annotation) => (
              <AnnotationCard
                key={annotation.id}
                annotation={annotation}
                currentUserId={currentUserId}
                onReact={(emoji) => handleReact(annotation.id, emoji)}
                showBook
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Reading Goal and Follow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReadingGoal />
        <UserFollow userId={profile.id} />
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input
                id="displayName"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Seu nome"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Conte um pouco sobre você..."
                className="mt-1.5"
              />
            </div>

            <Button
              className="w-full bg-amber-500 hover:bg-amber-600"
              onClick={handleSaveProfile}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
