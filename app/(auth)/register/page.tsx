'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, BookOpen, Mail } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?new=true`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle>Verifique seu email</CardTitle>
            <CardDescription>
              Enviamos um link para <strong>{email}</strong>. Clique no link para criar sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSent(false)}
            >
              Usar outro email
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
          <CardTitle className="text-2xl">Criar conta</CardTitle>
          <CardDescription>Junte-se à comunidade de leitores</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="mt-1.5"
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar conta
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-500 mt-6">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-amber-600 hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
