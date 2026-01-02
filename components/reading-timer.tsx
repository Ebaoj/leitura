'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Timer, Play, Pause, Square, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import type { Book } from '@/lib/types'

interface ReadingTimerProps {
  book: Book
  onSessionEnd?: () => void
}

export function ReadingTimer({ book, onSessionEnd }: ReadingTimerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [pagesStart, setPagesStart] = useState('')
  const [pagesEnd, setPagesEnd] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const supabase = createClient()

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    startTimeRef.current = new Date()

    // Create session in database
    const { data, error } = await supabase
      .from('leitura_reading_sessions')
      .insert({
        user_id: user.id,
        book_id: book.id,
        started_at: startTimeRef.current.toISOString(),
      })
      .select()
      .single()

    if (error) {
      toast.error('Erro ao iniciar sessão')
      return
    }

    setSessionId(data.id)
    setIsRunning(true)

    intervalRef.current = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)
  }

  const handlePause = () => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  const handleResume = () => {
    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)
  }

  const handleStop = () => {
    handlePause()
    setShowEndDialog(true)
  }

  const handleEndSession = async () => {
    if (!sessionId) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const duration = Math.floor(seconds / 60)
    const pagesStartNum = pagesStart ? parseInt(pagesStart) : null
    const pagesEndNum = pagesEnd ? parseInt(pagesEnd) : null

    // Update session
    await supabase
      .from('leitura_reading_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_minutes: duration,
        pages_start: pagesStartNum,
        pages_end: pagesEndNum,
      })
      .eq('id', sessionId)

    // Add to reading progress if pages were read
    if (pagesStartNum && pagesEndNum && pagesEndNum > pagesStartNum) {
      await supabase
        .from('leitura_reading_progress')
        .insert({
          user_id: user.id,
          book_id: book.id,
          pages_read: pagesEndNum - pagesStartNum,
          minutes_read: duration,
          reading_date: new Date().toISOString().split('T')[0],
        })
    }

    toast.success(`Sessão de ${duration} minutos registrada!`)

    // Reset state
    setSeconds(0)
    setSessionId(null)
    setPagesStart('')
    setPagesEnd('')
    setShowEndDialog(false)
    onSessionEnd?.()
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-5 w-5 text-amber-500" />
            Cronômetro de Leitura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4 text-sm text-zinc-500">
            <BookOpen className="h-4 w-4" />
            <span className="truncate">{book.title}</span>
          </div>

          <div className="text-center mb-4">
            <span className="text-4xl font-mono font-bold">
              {formatTime(seconds)}
            </span>
          </div>

          <div className="flex justify-center gap-2">
            {!isRunning && seconds === 0 ? (
              <Button onClick={handleStart} className="bg-green-500 hover:bg-green-600">
                <Play className="h-4 w-4 mr-2" />
                Iniciar
              </Button>
            ) : isRunning ? (
              <>
                <Button onClick={handlePause} variant="outline">
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </Button>
                <Button onClick={handleStop} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Parar
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleResume} className="bg-green-500 hover:bg-green-600">
                  <Play className="h-4 w-4 mr-2" />
                  Continuar
                </Button>
                <Button onClick={handleStop} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Parar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar sessão de leitura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Você leu por {formatTime(seconds)}. Registre quantas páginas leu:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-500">Página inicial</label>
                <Input
                  type="number"
                  value={pagesStart}
                  onChange={(e) => setPagesStart(e.target.value)}
                  placeholder="Ex: 50"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-500">Página final</label>
                <Input
                  type="number"
                  value={pagesEnd}
                  onChange={(e) => setPagesEnd(e.target.value)}
                  placeholder="Ex: 75"
                />
              </div>
            </div>
            <Button onClick={handleEndSession} className="w-full bg-amber-500 hover:bg-amber-600">
              Salvar sessão
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
