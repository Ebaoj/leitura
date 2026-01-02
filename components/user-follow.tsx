'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, Search, UserPlus, UserMinus, BookOpen, Star, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Profile, Book } from '@/lib/types'

interface UserFollowProps {
  userId?: string
  compact?: boolean
}

interface FollowUser extends Profile {
  is_following?: boolean
}

interface FriendActivity {
  id: string
  user: Profile
  type: 'added_book' | 'finished_book' | 'rating' | 'annotation'
  book: Book
  rating?: number
  content?: string
  created_at: string
}

export function UserFollow({ userId, compact = false }: UserFollowProps) {
  const [followers, setFollowers] = useState<FollowUser[]>([])
  const [following, setFollowing] = useState<FollowUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FollowUser[]>([])
  const [searching, setSearching] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchFollowData()
  }, [userId])

  const fetchFollowData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const targetUserId = userId || user.id

    // Fetch followers
    const { data: followersData } = await supabase
      .from('leitura_follows')
      .select('follower_id')
      .eq('following_id', targetUserId)

    if (followersData) {
      const followerIds = followersData.map(f => f.follower_id)
      if (followerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('leitura_profiles')
          .select('*')
          .in('id', followerIds)

        setFollowers(profiles || [])
      }
    }

    // Fetch following
    const { data: followingData } = await supabase
      .from('leitura_follows')
      .select('following_id')
      .eq('follower_id', targetUserId)

    if (followingData) {
      const followingIds = followingData.map(f => f.following_id)
      if (followingIds.length > 0) {
        const { data: profiles } = await supabase
          .from('leitura_profiles')
          .select('*')
          .in('id', followingIds)

        setFollowing(profiles || [])
      }
    }

    setLoading(false)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profiles } = await supabase
      .from('leitura_profiles')
      .select('*')
      .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .neq('id', user.id)
      .limit(10)

    if (profiles) {
      // Check which users are already followed
      const followingIds = following.map(f => f.id)
      const results = profiles.map(p => ({
        ...p,
        is_following: followingIds.includes(p.id),
      }))
      setSearchResults(results)
    }
    setSearching(false)
  }

  const handleFollow = async (targetId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('leitura_follows')
      .insert({
        follower_id: user.id,
        following_id: targetId,
      })

    if (error) {
      toast.error('Erro ao seguir usuário')
    } else {
      toast.success('Você agora está seguindo este usuário!')
      setSearchResults(prev =>
        prev.map(u => u.id === targetId ? { ...u, is_following: true } : u)
      )
      fetchFollowData()
    }
  }

  const handleUnfollow = async (targetId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('leitura_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetId)

    if (error) {
      toast.error('Erro ao deixar de seguir')
    } else {
      toast.success('Você deixou de seguir este usuário')
      setSearchResults(prev =>
        prev.map(u => u.id === targetId ? { ...u, is_following: false } : u)
      )
      setFollowing(prev => prev.filter(u => u.id !== targetId))
    }
  }

  if (loading) return null

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <span className="text-zinc-500">
          <strong className="text-zinc-900 dark:text-white">{followers.length}</strong> seguidores
        </span>
        <span className="text-zinc-500">
          <strong className="text-zinc-900 dark:text-white">{following.length}</strong> seguindo
        </span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            Conexões
          </div>
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <UserPlus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Encontrar pessoas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Buscar por nome ou email..."
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={searching}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="h-64">
                  {searchResults.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-8">
                      {searching ? 'Buscando...' : 'Busque por usuários para seguir'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        >
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.display_name?.charAt(0) || user.username?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{user.display_name || user.username || 'Usuário'}</p>
                            <p className="text-xs text-zinc-500 truncate">@{user.username}</p>
                          </div>
                          {user.is_following ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnfollow(user.id)}
                            >
                              <UserMinus className="h-4 w-4 mr-1" />
                              Seguindo
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleFollow(user.id)}
                              className="bg-amber-500 hover:bg-amber-600"
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Seguir
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{followers.length}</p>
            <p className="text-xs text-zinc-500">Seguidores</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{following.length}</p>
            <p className="text-xs text-zinc-500">Seguindo</p>
          </div>
        </div>

        {following.length > 0 && (
          <div>
            <p className="text-sm text-zinc-500 mb-2">Seguindo</p>
            <div className="flex flex-wrap gap-2">
              {following.slice(0, 6).map((user) => (
                <Avatar key={user.id} className="h-10 w-10">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {user.display_name?.charAt(0) || user.username?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {following.length > 6 && (
                <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                  +{following.length - 6}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Friend Activity Feed Component
export function FriendActivityFeed() {
  const [activities, setActivities] = useState<FriendActivity[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get users I'm following
    const { data: followingData } = await supabase
      .from('leitura_follows')
      .select('following_id')
      .eq('follower_id', user.id)

    if (!followingData || followingData.length === 0) {
      setLoading(false)
      return
    }

    const followingIds = followingData.map(f => f.following_id)

    // Get recent user_books activities
    const { data: bookActivities } = await supabase
      .from('leitura_user_books')
      .select('*, book:leitura_books(*), user:leitura_profiles(*)')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(20)

    if (bookActivities) {
      const activities: FriendActivity[] = bookActivities.map((activity) => ({
        id: activity.id,
        user: activity.user as Profile,
        type: activity.status === 'read' ? 'finished_book' : 'added_book',
        book: activity.book as Book,
        rating: activity.rating,
        created_at: activity.created_at,
      }))

      setActivities(activities)
    }

    setLoading(false)
  }

  const getActivityText = (activity: FriendActivity) => {
    switch (activity.type) {
      case 'finished_book':
        return 'terminou de ler'
      case 'added_book':
        return 'adicionou à estante'
      case 'rating':
        return 'avaliou'
      case 'annotation':
        return 'comentou sobre'
      default:
        return ''
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    return `${days}d`
  }

  if (loading) return null

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            Atividade dos Amigos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-sm text-zinc-500">
              Siga outros leitores para ver a atividade deles aqui!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-500" />
          Atividade dos Amigos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activity.user.avatar_url || undefined} />
                  <AvatarFallback>
                    {activity.user.display_name?.charAt(0) || activity.user.username?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <strong>{activity.user.display_name || activity.user.username || 'Usuário'}</strong>
                    {' '}{getActivityText(activity)}{' '}
                    <strong>{activity.book.title}</strong>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {activity.rating && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: activity.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-zinc-500">
                      {formatTimeAgo(activity.created_at)}
                    </span>
                  </div>
                </div>
                {activity.book.cover_url && (
                  <img
                    src={activity.book.cover_url}
                    alt=""
                    className="w-10 h-14 object-cover rounded"
                  />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
