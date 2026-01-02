'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Target, Pencil, Trophy } from 'lucide-react'
import { toast } from 'sonner'

export function ReadingGoal() {
  const [goal, setGoal] = useState<{ target: number; read: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [newTarget, setNewTarget] = useState('')
  const supabase = createClient()
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    fetchGoal()
  }, [])

  const fetchGoal = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get goal
    const { data: goalData } = await supabase
      .from('leitura_reading_goals')
      .select('target_books')
      .eq('user_id', user.id)
      .eq('year', currentYear)
      .single()

    // Count books read this year
    const startOfYear = `${currentYear}-01-01`
    const { count } = await supabase
      .from('leitura_user_books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'read')
      .gte('finished_at', startOfYear)

    if (goalData) {
      setGoal({ target: goalData.target_books, read: count || 0 })
      setNewTarget(goalData.target_books.toString())
    } else {
      setGoal({ target: 0, read: count || 0 })
    }
    setLoading(false)
  }

  const handleSaveGoal = async () => {
    const target = parseInt(newTarget)
    if (isNaN(target) || target < 1) {
      toast.error('Defina uma meta válida')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('leitura_reading_goals')
      .upsert({
        user_id: user.id,
        year: currentYear,
        target_books: target,
      }, {
        onConflict: 'user_id,year'
      })

    if (error) {
      toast.error('Erro ao salvar meta')
    } else {
      toast.success('Meta atualizada!')
      setGoal(prev => prev ? { ...prev, target } : { target, read: 0 })
      setEditOpen(false)
    }
  }

  if (loading) return null

  const progress = goal && goal.target > 0 ? Math.min((goal.read / goal.target) * 100, 100) : 0
  const isComplete = goal && goal.read >= goal.target && goal.target > 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-500" />
            Meta {currentYear}
          </div>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Definir meta de leitura</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-500">
                    Quantos livros você quer ler em {currentYear}?
                  </label>
                  <Input
                    type="number"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    min={1}
                    className="mt-2"
                  />
                </div>
                <Button onClick={handleSaveGoal} className="w-full bg-amber-500 hover:bg-amber-600">
                  Salvar meta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {goal && goal.target > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {goal.read} de {goal.target} livros
              </span>
              {isComplete && (
                <span className="flex items-center gap-1 text-amber-500">
                  <Trophy className="h-4 w-4" />
                  Meta atingida!
                </span>
              )}
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-zinc-500">
              {goal.target - goal.read > 0
                ? `Faltam ${goal.target - goal.read} livros para completar sua meta`
                : 'Parabéns! Você atingiu sua meta!'}
            </p>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-zinc-500 mb-2">Nenhuma meta definida</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              Definir meta
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
