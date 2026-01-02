'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { UserPlus, UserMinus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface FollowButtonProps {
  targetUserId: string
  size?: 'default' | 'sm' | 'lg'
  variant?: 'default' | 'outline'
  className?: string
}

export function FollowButton({ targetUserId, size = 'default', variant = 'default', className }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>()
  const supabase = createClient()

  useEffect(() => {
    checkFollowStatus()
  }, [targetUserId])

  const checkFollowStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    setCurrentUserId(user.id)

    // Don't show button for own profile
    if (user.id === targetUserId) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('leitura_follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single()

    setIsFollowing(!!data)
    setLoading(false)
  }

  const handleFollow = async () => {
    if (!currentUserId) {
      toast.error('Você precisa estar logado para seguir')
      return
    }

    setActionLoading(true)

    const { error } = await supabase
      .from('leitura_follows')
      .insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      })

    if (error) {
      toast.error('Erro ao seguir usuário')
    } else {
      toast.success('Você agora está seguindo este usuário!')
      setIsFollowing(true)
    }

    setActionLoading(false)
  }

  const handleUnfollow = async () => {
    if (!currentUserId) return

    setActionLoading(true)

    const { error } = await supabase
      .from('leitura_follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)

    if (error) {
      toast.error('Erro ao deixar de seguir')
    } else {
      toast.success('Você deixou de seguir este usuário')
      setIsFollowing(false)
    }

    setActionLoading(false)
  }

  // Don't render for own profile
  if (!loading && currentUserId === targetUserId) {
    return null
  }

  // Don't render if not logged in
  if (!loading && !currentUserId) {
    return null
  }

  if (loading) {
    return (
      <Button variant="outline" size={size} disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  if (isFollowing) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleUnfollow}
        disabled={actionLoading}
        className={className}
      >
        {actionLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <UserMinus className="h-4 w-4 mr-2" />
        )}
        Seguindo
      </Button>
    )
  }

  return (
    <Button
      size={size}
      onClick={handleFollow}
      disabled={actionLoading}
      className={`bg-amber-500 hover:bg-amber-600 ${className}`}
    >
      {actionLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <UserPlus className="h-4 w-4 mr-2" />
      )}
      Seguir
    </Button>
  )
}
