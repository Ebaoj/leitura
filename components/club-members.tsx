'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Users, UserPlus, UserMinus, Crown, BookOpen, Star, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Profile, ClubMember } from '@/lib/types'

interface ClubMemberWithProfile extends ClubMember {
  user: Profile
}

interface ClubMembersProps {
  clubId: string
  members: ClubMemberWithProfile[]
  isAdmin?: boolean
  onMemberRemoved?: () => void
}

interface MemberStats {
  books_read: number
  avg_rating: number | null
}

export function ClubMembers({ clubId, members, isAdmin = false, onMemberRemoved }: ClubMembersProps) {
  const [currentUserId, setCurrentUserId] = useState<string>()
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [memberStats, setMemberStats] = useState<Record<string, MemberStats>>({})
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (dialogOpen && members.length > 0) {
      fetchMemberStats()
    }
  }, [dialogOpen, members])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    // Fetch who current user is following
    const { data: followingData } = await supabase
      .from('leitura_follows')
      .select('following_id')
      .eq('follower_id', user.id)

    if (followingData) {
      setFollowing(new Set(followingData.map(f => f.following_id)))
    }
  }

  const fetchMemberStats = async () => {
    const memberIds = members.map(m => m.user_id)

    // Fetch reading stats for each member
    const { data: booksData } = await supabase
      .from('leitura_user_books')
      .select('user_id, status, rating')
      .in('user_id', memberIds)
      .eq('status', 'read')

    if (booksData) {
      const stats: Record<string, MemberStats> = {}

      memberIds.forEach(id => {
        const userBooks = booksData.filter(b => b.user_id === id)
        const ratings = userBooks.filter(b => b.rating).map(b => b.rating as number)

        stats[id] = {
          books_read: userBooks.length,
          avg_rating: ratings.length > 0
            ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
            : null
        }
      })

      setMemberStats(stats)
    }
  }

  const handleFollow = async (targetId: string) => {
    if (!currentUserId) return
    setLoading(true)

    const { error } = await supabase
      .from('leitura_follows')
      .insert({
        follower_id: currentUserId,
        following_id: targetId,
      })

    if (error) {
      toast.error('Erro ao seguir usuário')
    } else {
      toast.success('Você agora está seguindo este usuário!')
      setFollowing(prev => new Set([...prev, targetId]))
    }
    setLoading(false)
  }

  const handleUnfollow = async (targetId: string) => {
    if (!currentUserId) return
    setLoading(true)

    const { error } = await supabase
      .from('leitura_follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetId)

    if (error) {
      toast.error('Erro ao deixar de seguir')
    } else {
      toast.success('Você deixou de seguir este usuário')
      setFollowing(prev => {
        const newSet = new Set(prev)
        newSet.delete(targetId)
        return newSet
      })
    }
    setLoading(false)
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!isAdmin) return

    const { error } = await supabase
      .from('leitura_club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', memberId)

    if (error) {
      toast.error('Erro ao remover membro')
    } else {
      toast.success('Membro removido do clube')
      onMemberRemoved?.()
    }
  }

  const admins = members.filter(m => m.role === 'admin')
  const regularMembers = members.filter(m => m.role === 'member')

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            Membros ({members.length})
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                Ver todos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Membros do Clube</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {/* Admins */}
                  {admins.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1">
                        <Crown className="h-3 w-3" /> Administradores
                      </p>
                      <div className="space-y-2">
                        {admins.map((member) => (
                          <MemberCard
                            key={member.user_id}
                            member={member}
                            stats={memberStats[member.user_id]}
                            isCurrentUser={member.user_id === currentUserId}
                            isFollowing={following.has(member.user_id)}
                            isAdmin={isAdmin}
                            canRemove={false}
                            onFollow={() => handleFollow(member.user_id)}
                            onUnfollow={() => handleUnfollow(member.user_id)}
                            onRemove={() => handleRemoveMember(member.user_id)}
                            loading={loading}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regular Members */}
                  {regularMembers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-2">Membros</p>
                      <div className="space-y-2">
                        {regularMembers.map((member) => (
                          <MemberCard
                            key={member.user_id}
                            member={member}
                            stats={memberStats[member.user_id]}
                            isCurrentUser={member.user_id === currentUserId}
                            isFollowing={following.has(member.user_id)}
                            isAdmin={isAdmin}
                            canRemove={isAdmin}
                            onFollow={() => handleFollow(member.user_id)}
                            onUnfollow={() => handleUnfollow(member.user_id)}
                            onRemove={() => handleRemoveMember(member.user_id)}
                            loading={loading}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Preview - Avatar Stack */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            {members.slice(0, 5).map((member) => (
              <Link
                key={member.user_id}
                href={`/profile/${member.user.username}`}
                className="relative group"
              >
                <Avatar className="h-10 w-10 border-2 border-white dark:border-zinc-900 transition-transform hover:scale-110 hover:z-10">
                  <AvatarImage src={member.user.avatar_url || undefined} />
                  <AvatarFallback>
                    {member.user.display_name?.charAt(0) || member.user.username?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                {member.role === 'admin' && (
                  <Crown className="absolute -top-1 -right-1 h-3 w-3 text-amber-500" />
                )}
              </Link>
            ))}
            {members.length > 5 && (
              <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-xs font-medium text-zinc-500">
                +{members.length - 5}
              </div>
            )}
          </div>
        </div>

        {/* Quick member list */}
        <div className="mt-4 space-y-2">
          {members.slice(0, 3).map((member) => (
            <Link
              key={member.user_id}
              href={`/profile/${member.user.username}`}
              className="flex items-center gap-2 p-2 -mx-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.user.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {member.user.display_name?.charAt(0) || member.user.username?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {member.user.display_name || member.user.username}
                </p>
                <p className="text-xs text-zinc-500">@{member.user.username}</p>
              </div>
              {member.role === 'admin' && (
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Member Card Component
interface MemberCardProps {
  member: ClubMemberWithProfile
  stats?: MemberStats
  isCurrentUser: boolean
  isFollowing: boolean
  isAdmin: boolean
  canRemove: boolean
  onFollow: () => void
  onUnfollow: () => void
  onRemove: () => void
  loading: boolean
}

function MemberCard({
  member,
  stats,
  isCurrentUser,
  isFollowing,
  isAdmin,
  canRemove,
  onFollow,
  onUnfollow,
  onRemove,
  loading,
}: MemberCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
      <Link href={`/profile/${member.user.username}`}>
        <Avatar className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all">
          <AvatarImage src={member.user.avatar_url || undefined} />
          <AvatarFallback>
            {member.user.display_name?.charAt(0) || member.user.username?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${member.user.username}`}
            className="font-medium text-sm truncate hover:text-amber-600 transition-colors"
          >
            {member.user.display_name || member.user.username}
          </Link>
          {member.role === 'admin' && (
            <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          )}
        </div>
        <p className="text-xs text-zinc-500">@{member.user.username}</p>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {stats.books_read} livros
            </span>
            {stats.avg_rating && (
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Star className="h-3 w-3" />
                {stats.avg_rating}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Link href={`/profile/${member.user.username}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Link>

        {!isCurrentUser && (
          <>
            {isFollowing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onUnfollow}
                disabled={loading}
                className="h-8"
              >
                <UserMinus className="h-3.5 w-3.5 mr-1" />
                Seguindo
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onFollow}
                disabled={loading}
                className="h-8 bg-amber-500 hover:bg-amber-600"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Seguir
              </Button>
            )}
          </>
        )}

        {canRemove && !isCurrentUser && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            Remover
          </Button>
        )}

        {isCurrentUser && (
          <Badge variant="secondary" className="text-xs">
            Você
          </Badge>
        )}
      </div>
    </div>
  )
}
