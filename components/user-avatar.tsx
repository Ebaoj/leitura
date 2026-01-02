'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  className?: string
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function UserAvatar({ src, name, className }: UserAvatarProps) {
  return (
    <Avatar className={cn('', className)}>
      <AvatarImage src={src || undefined} alt={name || 'Avatar'} />
      <AvatarFallback className="bg-amber-100 text-amber-700 font-medium">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
