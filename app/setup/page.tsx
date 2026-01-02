'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, BookOpen } from 'lucide-react'

export default function SetupPage() {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!username) {
      setUsernameError('')
      return
    }

    const timer = setTimeout(async () => {
      if (username.length < 3) {
        setUsernameError('Username deve ter pelo menos 3 caracteres')
        return
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setUsernameError('Use apenas letras, números e _')
        return
      }

      setCheckingUsername(true)
      const { data } = await supabase
        .from('leitura_profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .single()

      if (data) {
        setUsernameError('Username já está em uso')
      } else {
        setUsernameError('')
      }
      setCheckingUsername(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [username, supabase])

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || usernameError) return

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase
      .from('leitura_profiles')
      .insert({
        id: user.id,
        username: username.toLowerCase(),
        display_name: displayName || username,
        bio: bio || null,
      })

    if (error) {
      console.error('Error creating profile:', error)
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center mb-4">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Complete seu perfil</CardTitle>
          <CardDescription>Escolha um username único para começar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <Label htmlFor="username">Username *</Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">@</span>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="seunome"
                  className="pl-8"
                  disabled={loading}
                />
              </div>
              {checkingUsername && (
                <p className="text-xs text-zinc-500 mt-1">Verificando disponibilidade...</p>
              )}
              {usernameError && (
                <p className="text-xs text-red-500 mt-1">{usernameError}</p>
              )}
            </div>

            <div>
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
                className="mt-1.5"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio (opcional)</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Conte um pouco sobre você e seus livros favoritos..."
                className="mt-1.5"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600"
              disabled={loading || !username || !!usernameError || checkingUsername}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Começar a ler
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
