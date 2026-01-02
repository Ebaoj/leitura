'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { UserAvatar } from '@/components/user-avatar'
import { Users } from 'lucide-react'
import type { Club, ClubMember, ClubReading, Profile } from '@/lib/types'

interface ClubCardProps {
  club: Club & {
    members?: (ClubMember & { user: Profile })[]
    current_reading?: ClubReading & { book: { title: string; cover_url: string | null } }
  }
}

export function ClubCard({ club }: ClubCardProps) {
  const memberCount = club.members?.length || 0

  return (
    <Link href={`/club/${club.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="relative h-24 bg-gradient-to-br from-amber-400 to-amber-600">
            {club.cover_url && (
              <Image
                src={club.cover_url}
                alt={club.name}
                fill
                className="object-cover"
              />
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg">{club.name}</h3>
            {club.description && (
              <p className="text-sm text-zinc-500 line-clamp-2 mt-1">{club.description}</p>
            )}

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-1 text-sm text-zinc-500">
                <Users className="h-4 w-4" />
                <span>{memberCount} membro{memberCount !== 1 ? 's' : ''}</span>
              </div>

              {club.members && club.members.length > 0 && (
                <div className="flex -space-x-2">
                  {club.members.slice(0, 4).map((member) => (
                    <UserAvatar
                      key={member.user_id}
                      src={member.user?.avatar_url}
                      name={member.user?.display_name || member.user?.username}
                      className="h-7 w-7 border-2 border-white dark:border-zinc-900"
                    />
                  ))}
                  {memberCount > 4 && (
                    <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900 flex items-center justify-center">
                      <span className="text-xs font-medium">+{memberCount - 4}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {club.current_reading && (
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2">Lendo agora</p>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-12 bg-zinc-200 dark:bg-zinc-700 rounded shrink-0">
                    {club.current_reading.book.cover_url && (
                      <Image
                        src={club.current_reading.book.cover_url}
                        alt={club.current_reading.book.title}
                        fill
                        className="object-cover rounded"
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium line-clamp-2">
                    {club.current_reading.book.title}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
