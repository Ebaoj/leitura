'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Book, BookStatus } from '@/lib/types'

interface BookCardProps {
  book: Book
  status?: BookStatus
  rating?: number | null
  onClick?: () => void
  className?: string
  compact?: boolean
}

const STATUS_COLORS: Record<BookStatus, string> = {
  want: 'bg-blue-500',
  reading: 'bg-amber-500',
  read: 'bg-green-500',
  abandoned: 'bg-zinc-500',
}

const STATUS_LABELS: Record<BookStatus, string> = {
  want: 'Quero Ler',
  reading: 'Lendo',
  read: 'Lido',
  abandoned: 'Abandonado',
}

export function BookCard({ book, status, rating, onClick, className, compact }: BookCardProps) {
  const content = (
    <Card
      className={cn(
        'overflow-hidden cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="relative aspect-[2/3] bg-zinc-100 dark:bg-zinc-800">
          {book.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full p-4 text-center">
              <span className="text-sm text-zinc-500 font-medium">{book.title}</span>
            </div>
          )}
          {status && (
            <Badge className={cn('absolute top-2 right-2 text-white', STATUS_COLORS[status])}>
              {STATUS_LABELS[status]}
            </Badge>
          )}
        </div>
        {!compact && (
          <div className="p-3">
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{book.title}</h3>
            <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{book.author || 'Autor desconhecido'}</p>
            {rating && (
              <div className="flex items-center gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={cn(
                      'text-sm',
                      star <= rating ? 'text-amber-400' : 'text-zinc-300'
                    )}
                  >
                    ★
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (onClick) {
    return content
  }

  return (
    <Link href={`/book/${book.id}`}>
      {content}
    </Link>
  )
}
