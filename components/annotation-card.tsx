'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { UserAvatar } from '@/components/user-avatar'
import { cn } from '@/lib/utils'
import type { Annotation, Reaction, Reply, Profile } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageCircle, AlertTriangle } from 'lucide-react'

interface AnnotationCardProps {
  annotation: Annotation & { user: Profile; reactions: Reaction[]; replies: Reply[] }
  currentUserId?: string
  onReact?: (emoji: '❤️' | '💡' | '😂' | '🤔') => void
  onReply?: (content: string) => void
  showBook?: boolean
}

const EMOJIS = ['❤️', '💡', '😂', '🤔'] as const

export function AnnotationCard({
  annotation,
  currentUserId,
  onReact,
  onReply,
  showBook = false,
}: AnnotationCardProps) {
  const [showSpoiler, setShowSpoiler] = useState(false)
  const [showReplies, setShowReplies] = useState(false)

  const reactionCounts = EMOJIS.reduce((acc, emoji) => {
    acc[emoji] = annotation.reactions?.filter((r) => r.emoji === emoji).length || 0
    return acc
  }, {} as Record<string, number>)

  const userReaction = annotation.reactions?.find((r) => r.user_id === currentUserId)?.emoji

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <UserAvatar
            src={annotation.user?.avatar_url}
            name={annotation.user?.display_name || annotation.user?.username}
            className="h-10 w-10"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {annotation.user?.display_name || annotation.user?.username}
              </span>
              {annotation.is_spoiler && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Spoiler
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>
                {formatDistanceToNow(new Date(annotation.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
              {annotation.page_number && <span>• Página {annotation.page_number}</span>}
              {annotation.chapter && <span>• {annotation.chapter}</span>}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {showBook && annotation.book && (
          <p className="text-xs text-zinc-500 mb-2">
            Em <span className="font-medium text-zinc-700">{annotation.book.title}</span>
          </p>
        )}

        {annotation.is_spoiler && !showSpoiler ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSpoiler(true)}
            className="w-full"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Clique para revelar spoiler
          </Button>
        ) : (
          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {annotation.content}
          </p>
        )}

        <div className="flex items-center gap-2 mt-4">
          {EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              onClick={() => onReact?.(emoji)}
              className={cn(
                'h-8 px-2 gap-1',
                userReaction === emoji && 'bg-amber-100 dark:bg-amber-900'
              )}
            >
              <span>{emoji}</span>
              {reactionCounts[emoji] > 0 && (
                <span className="text-xs text-zinc-500">{reactionCounts[emoji]}</span>
              )}
            </Button>
          ))}

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplies(!showReplies)}
            className="h-8 px-2 gap-1"
          >
            <MessageCircle className="h-4 w-4" />
            {annotation.replies?.length > 0 && (
              <span className="text-xs text-zinc-500">{annotation.replies.length}</span>
            )}
          </Button>
        </div>

        {showReplies && annotation.replies && annotation.replies.length > 0 && (
          <div className="mt-4 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-3">
            {annotation.replies.map((reply) => (
              <div key={reply.id} className="flex gap-2">
                <UserAvatar
                  src={reply.user?.avatar_url}
                  name={reply.user?.display_name || reply.user?.username}
                  className="h-6 w-6"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {reply.user?.display_name || reply.user?.username}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {formatDistanceToNow(new Date(reply.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{reply.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
