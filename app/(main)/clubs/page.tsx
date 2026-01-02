'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClubCard } from '@/components/club-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Plus, Users } from 'lucide-react'
import type { Club, ClubMember, Profile } from '@/lib/types'
import { toast } from 'sonner'

type ClubWithMembers = Club & {
  members: (ClubMember & { user: Profile })[]
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<ClubWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  const [newClubName, setNewClubName] = useState('')
  const [newClubDescription, setNewClubDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const supabase = createClient()

  const fetchClubs = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: memberships } = await supabase
      .from('leitura_club_members')
      .select(`
        club_id,
        leitura_clubs(
          *,
          members:leitura_club_members(*, user:leitura_profiles(*))
        )
      `)
      .eq('user_id', user.id)

    const userClubs = memberships?.map(m => m.leitura_clubs as unknown as ClubWithMembers) || []
    setClubs(userClubs)
    setLoading(false)
  }

  useEffect(() => {
    fetchClubs()
  }, [supabase])

  const handleCreateClub = async () => {
    if (!newClubName.trim()) return
    setCreating(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const inviteCode = generateInviteCode()

    // Create club
    const { data: club, error: clubError } = await supabase
      .from('leitura_clubs')
      .insert({
        name: newClubName.trim(),
        description: newClubDescription.trim() || null,
        invite_code: inviteCode,
        created_by: user.id,
      })
      .select()
      .single()

    if (clubError) {
      toast.error('Erro ao criar clube')
      setCreating(false)
      return
    }

    // Add creator as admin
    await supabase
      .from('leitura_club_members')
      .insert({
        club_id: club.id,
        user_id: user.id,
        role: 'admin',
      })

    toast.success('Clube criado com sucesso!')
    setNewClubName('')
    setNewClubDescription('')
    setCreateOpen(false)
    setCreating(false)
    fetchClubs()
  }

  const handleJoinClub = async () => {
    if (!inviteCode.trim()) return
    setJoining(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Find club by invite code
    const { data: club, error: findError } = await supabase
      .from('leitura_clubs')
      .select('id')
      .eq('invite_code', inviteCode.toUpperCase())
      .single()

    if (findError || !club) {
      toast.error('Código de convite inválido')
      setJoining(false)
      return
    }

    // Check if already member
    const { data: existing } = await supabase
      .from('leitura_club_members')
      .select('club_id')
      .eq('club_id', club.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      toast.error('Você já é membro deste clube')
      setJoining(false)
      return
    }

    // Join club
    const { error: joinError } = await supabase
      .from('leitura_club_members')
      .insert({
        club_id: club.id,
        user_id: user.id,
        role: 'member',
      })

    if (joinError) {
      toast.error('Erro ao entrar no clube')
    } else {
      toast.success('Você entrou no clube!')
      setInviteCode('')
      setJoinOpen(false)
      fetchClubs()
    }
    setJoining(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meus Clubes</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setJoinOpen(true)}>
            Entrar com código
          </Button>
          <Button className="bg-amber-500 hover:bg-amber-600" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar clube
          </Button>
        </div>
      </div>

      {clubs.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="font-medium text-lg">Nenhum clube ainda</h3>
          <p className="text-zinc-500 mt-1">
            Crie um clube ou entre em um existente com um código de convite
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clubs.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      )}

      {/* Create Club Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar novo clube</DialogTitle>
            <DialogDescription>
              Crie um clube para compartilhar leituras com amigos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="clubName">Nome do clube *</Label>
              <Input
                id="clubName"
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
                placeholder="Ex: Clube do Livro das Quintas"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="clubDescription">Descrição (opcional)</Label>
              <Textarea
                id="clubDescription"
                value={newClubDescription}
                onChange={(e) => setNewClubDescription(e.target.value)}
                placeholder="Sobre o que é este clube..."
                className="mt-1.5"
              />
            </div>

            <Button
              className="w-full bg-amber-500 hover:bg-amber-600"
              onClick={handleCreateClub}
              disabled={!newClubName.trim() || creating}
            >
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar clube
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Club Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrar em um clube</DialogTitle>
            <DialogDescription>
              Digite o código de convite do clube
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="inviteCode">Código de convite</Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="mt-1.5 text-center text-2xl tracking-widest font-mono"
                maxLength={6}
              />
            </div>

            <Button
              className="w-full bg-amber-500 hover:bg-amber-600"
              onClick={handleJoinClub}
              disabled={inviteCode.length !== 6 || joining}
            >
              {joining && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Entrar no clube
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
