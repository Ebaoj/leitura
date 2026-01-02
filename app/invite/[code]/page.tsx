'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Users, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [club, setClub] = useState<{ id: string; name: string; description: string | null; member_count: number } | null>(null)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkStatusAndClub = async () => {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      // Check if user has profile
      if (user) {
        const { data: profile } = await supabase
          .from('leitura_profiles')
          .select('id')
          .eq('id', user.id)
          .single()
        setHasProfile(!!profile)
      }

      // Find club by invite code
      const { data: clubData, error: clubError } = await supabase
        .from('leitura_clubs')
        .select('id, name, description')
        .eq('invite_code', code.toUpperCase())
        .single()

      if (clubError || !clubData) {
        setError('Convite inválido ou expirado')
        setLoading(false)
        return
      }

      // Get member count
      const { count } = await supabase
        .from('leitura_club_members')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubData.id)

      setClub({
        ...clubData,
        member_count: count || 0
      })

      // If user is logged in and has profile, check if already member
      if (user && hasProfile) {
        const { data: membership } = await supabase
          .from('leitura_club_members')
          .select('club_id')
          .eq('club_id', clubData.id)
          .eq('user_id', user.id)
          .single()

        if (membership) {
          // Already a member, redirect to club
          router.push(`/club/${clubData.id}`)
          return
        }
      }

      setLoading(false)
    }

    checkStatusAndClub()
  }, [code, supabase, router, hasProfile])

  const handleJoin = async () => {
    if (!isLoggedIn) {
      // Save invite code and redirect to register
      localStorage.setItem('pendingInviteCode', code.toUpperCase())
      router.push('/register')
      return
    }

    if (!hasProfile) {
      // Save invite code and redirect to setup
      localStorage.setItem('pendingInviteCode', code.toUpperCase())
      router.push('/setup')
      return
    }

    // User is logged in and has profile, join the club
    setJoining(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !club) return

    const { error: joinError } = await supabase
      .from('leitura_club_members')
      .insert({
        club_id: club.id,
        user_id: user.id,
        role: 'member',
      })

    if (joinError) {
      toast.error('Erro ao entrar no clube')
      setJoining(false)
      return
    }

    toast.success('Bem-vindo ao clube!')
    router.push(`/club/${club.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-800">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-red-500" />
            </div>
            <CardTitle className="text-xl">Convite inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => router.push('/')}
            >
              Voltar para o início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center mb-4">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-xl">Convite para clube</CardTitle>
          <CardDescription>Você foi convidado para participar de</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {club?.name}
            </h2>
            {club?.description && (
              <p className="text-zinc-500 mt-2">{club.description}</p>
            )}
            <div className="flex items-center justify-center gap-1 mt-3 text-sm text-zinc-500">
              <Users className="h-4 w-4" />
              <span>{club?.member_count} membro{club?.member_count !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <Button
            className="w-full bg-amber-500 hover:bg-amber-600"
            onClick={handleJoin}
            disabled={joining}
          >
            {joining && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {!isLoggedIn ? 'Criar conta e entrar' : 'Entrar no clube'}
          </Button>

          {!isLoggedIn && (
            <p className="text-center text-sm text-zinc-500">
              Já tem uma conta?{' '}
              <button
                onClick={() => {
                  localStorage.setItem('pendingInviteCode', code.toUpperCase())
                  router.push('/login')
                }}
                className="text-amber-600 hover:underline font-medium"
              >
                Fazer login
              </button>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
