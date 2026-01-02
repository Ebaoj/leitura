export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export interface Club {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  invite_code: string
  created_by: string
  created_at: string
}

export interface ClubMember {
  club_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface Book {
  id: string
  open_library_key: string | null
  title: string
  author: string | null
  cover_url: string | null
  year_published: number | null
  pages: number | null
}

export interface UserBook {
  id: string
  user_id: string
  book_id: string
  status: 'want' | 'reading' | 'read' | 'abandoned'
  rating: number | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  book?: Book
}

export interface ClubReading {
  id: string
  club_id: string
  book_id: string
  status: 'active' | 'finished'
  started_at: string
  target_date: string | null
  created_at: string
  book?: Book
}

export interface Annotation {
  id: string
  user_id: string
  book_id: string
  club_id: string | null
  content: string
  page_number: number | null
  chapter: string | null
  is_spoiler: boolean
  created_at: string
  user?: Profile
  book?: Book
  reactions?: Reaction[]
  replies?: Reply[]
}

export interface Reaction {
  annotation_id: string
  user_id: string
  emoji: '❤️' | '💡' | '😂' | '🤔'
}

export interface Reply {
  id: string
  annotation_id: string
  user_id: string
  content: string
  created_at: string
  user?: Profile
}

export type BookStatus = 'want' | 'reading' | 'read' | 'abandoned'

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  want: 'Quero Ler',
  reading: 'Lendo',
  read: 'Lidos',
  abandoned: 'Abandonados',
}

export const REACTION_EMOJIS = ['❤️', '💡', '😂', '🤔'] as const
