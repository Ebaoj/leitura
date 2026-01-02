'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface AnnotationFormProps {
  bookId: string
  clubId?: string
  onSubmit: (data: {
    content: string
    page_number?: number
    chapter?: string
    is_spoiler: boolean
  }) => Promise<void>
  onCancel?: () => void
}

export function AnnotationForm({ bookId, clubId, onSubmit, onCancel }: AnnotationFormProps) {
  const [content, setContent] = useState('')
  const [pageNumber, setPageNumber] = useState('')
  const [chapter, setChapter] = useState('')
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    try {
      await onSubmit({
        content: content.trim(),
        page_number: pageNumber ? parseInt(pageNumber) : undefined,
        chapter: chapter.trim() || undefined,
        is_spoiler: isSpoiler,
      })
      setContent('')
      setPageNumber('')
      setChapter('')
      setIsSpoiler(false)
    } catch (error) {
      console.error('Error creating annotation:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nova Anotação</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="content">O que você achou?</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Compartilhe seus pensamentos sobre este livro..."
              className="mt-1.5 min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="page">Página (opcional)</Label>
              <Input
                id="page"
                type="number"
                value={pageNumber}
                onChange={(e) => setPageNumber(e.target.value)}
                placeholder="123"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="chapter">Capítulo (opcional)</Label>
              <Input
                id="chapter"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="Capítulo 5"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="spoiler"
                checked={isSpoiler}
                onCheckedChange={setIsSpoiler}
              />
              <Label htmlFor="spoiler" className="text-sm">
                Contém spoiler
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={!content.trim() || loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publicar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
