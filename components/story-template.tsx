'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Share2, Download, Copy, Check, BookOpen, Star } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Book, UserBook } from '@/lib/types'

interface StoryTemplateProps {
  book: Book
  userBook?: UserBook
  rating?: number
}

type TemplateStyle = 'minimal' | 'gradient' | 'classic' | 'dark' | 'colorful'

const TEMPLATE_STYLES: Record<TemplateStyle, { name: string; bg: string; text: string; accent: string }> = {
  minimal: {
    name: 'Minimalista',
    bg: 'bg-white',
    text: 'text-zinc-900',
    accent: 'text-amber-500',
  },
  gradient: {
    name: 'Gradiente',
    bg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    text: 'text-white',
    accent: 'text-white',
  },
  classic: {
    name: 'Clássico',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    accent: 'text-amber-600',
  },
  dark: {
    name: 'Escuro',
    bg: 'bg-zinc-900',
    text: 'text-white',
    accent: 'text-amber-400',
  },
  colorful: {
    name: 'Colorido',
    bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500',
    text: 'text-white',
    accent: 'text-white',
  },
}

export function StoryTemplate({ book, userBook, rating }: StoryTemplateProps) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<TemplateStyle>('gradient')
  const [copied, setCopied] = useState(false)
  const templateRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!templateRef.current) return

    try {
      // Use html2canvas if available, otherwise show instructions
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(templateRef.current, {
        scale: 2,
        backgroundColor: null,
      })

      const link = document.createElement('a')
      link.download = `leitura-${book.title.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      toast.success('Imagem baixada!')
    } catch {
      toast.error('Tire um print da imagem para compartilhar')
    }
  }

  const handleCopyText = () => {
    const text = `📚 ${userBook?.status === 'read' ? 'Terminei de ler' : 'Estou lendo'}: "${book.title}" de ${book.author}${rating ? ` ⭐ ${rating}/5` : ''}\n\n#Leitura #Livros #BookClub`

    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Texto copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  const currentStyle = TEMPLATE_STYLES[style]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar leitura</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Style selector */}
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">Estilo</label>
            <Select value={style} onValueChange={(v) => setStyle(v as TemplateStyle)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TEMPLATE_STYLES).map(([key, { name }]) => (
                  <SelectItem key={key} value={key}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Preview */}
          <div
            ref={templateRef}
            className={cn(
              'aspect-[9/16] rounded-lg p-6 flex flex-col items-center justify-center text-center',
              currentStyle.bg
            )}
          >
            {/* Book cover */}
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt=""
                className="w-32 h-48 object-cover rounded-lg shadow-xl mb-6"
              />
            ) : (
              <div className={cn(
                'w-32 h-48 rounded-lg shadow-xl mb-6 flex items-center justify-center',
                style === 'minimal' ? 'bg-zinc-100' : 'bg-white/20'
              )}>
                <BookOpen className={cn('h-12 w-12', currentStyle.accent)} />
              </div>
            )}

            {/* Status badge */}
            <span className={cn(
              'text-xs font-medium px-3 py-1 rounded-full mb-3',
              style === 'minimal' ? 'bg-amber-100 text-amber-700' : 'bg-white/20 text-white'
            )}>
              {userBook?.status === 'read' ? 'Terminei de ler' : 'Estou lendo'}
            </span>

            {/* Title */}
            <h3 className={cn('text-xl font-bold mb-2', currentStyle.text)}>
              {book.title}
            </h3>

            {/* Author */}
            <p className={cn('text-sm opacity-80 mb-4', currentStyle.text)}>
              {book.author}
            </p>

            {/* Rating */}
            {rating && (
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-5 w-5',
                      i < rating
                        ? cn('fill-current', currentStyle.accent)
                        : cn('opacity-30', currentStyle.text)
                    )}
                  />
                ))}
              </div>
            )}

            {/* Branding */}
            <div className={cn('mt-auto text-xs opacity-60', currentStyle.text)}>
              leitura.app
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1 bg-amber-500 hover:bg-amber-600">
              <Download className="h-4 w-4 mr-2" />
              Baixar imagem
            </Button>
            <Button onClick={handleCopyText} variant="outline">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <p className="text-xs text-zinc-500 text-center">
            Compartilhe nos seus stories do Instagram, Twitter ou onde preferir!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
