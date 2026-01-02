const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1'

export interface GoogleBook {
  id: string
  volumeInfo: {
    title: string
    subtitle?: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    pageCount?: number
    categories?: string[]
    averageRating?: number
    ratingsCount?: number
    imageLinks?: {
      thumbnail?: string
      smallThumbnail?: string
      small?: string
      medium?: string
      large?: string
    }
    language?: string
    industryIdentifiers?: {
      type: string
      identifier: string
    }[]
  }
}

export interface GoogleBooksSearchResult {
  kind: string
  totalItems: number
  items?: GoogleBook[]
}

export async function searchBooks(query: string, limit = 20): Promise<GoogleBook[]> {
  const response = await fetch(
    `${GOOGLE_BOOKS_API}/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}&langRestrict=pt&orderBy=relevance`
  )
  const data: GoogleBooksSearchResult = await response.json()
  return data.items || []
}

export async function searchBooksByTitle(title: string, limit = 10): Promise<GoogleBook[]> {
  const response = await fetch(
    `${GOOGLE_BOOKS_API}/volumes?q=intitle:${encodeURIComponent(title)}&maxResults=${limit}`
  )
  const data: GoogleBooksSearchResult = await response.json()
  return data.items || []
}

export async function searchBooksByAuthor(author: string, limit = 10): Promise<GoogleBook[]> {
  const response = await fetch(
    `${GOOGLE_BOOKS_API}/volumes?q=inauthor:${encodeURIComponent(author)}&maxResults=${limit}`
  )
  const data: GoogleBooksSearchResult = await response.json()
  return data.items || []
}

export async function searchBooksByISBN(isbn: string): Promise<GoogleBook | null> {
  const response = await fetch(
    `${GOOGLE_BOOKS_API}/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`
  )
  const data: GoogleBooksSearchResult = await response.json()
  return data.items?.[0] || null
}

export async function getBookById(volumeId: string): Promise<GoogleBook | null> {
  const response = await fetch(`${GOOGLE_BOOKS_API}/volumes/${volumeId}`)
  if (!response.ok) return null
  return response.json()
}

export function getCoverUrl(book: GoogleBook, size: 'small' | 'medium' | 'large' = 'medium'): string | null {
  const imageLinks = book.volumeInfo.imageLinks
  if (!imageLinks) return null

  // Try to get the best quality available
  // Google Books returns HTTP URLs, we convert to HTTPS
  const url = imageLinks[size] || imageLinks.thumbnail || imageLinks.smallThumbnail
  if (!url) return null

  // Convert to HTTPS and remove edge=curl for cleaner images
  return url.replace('http://', 'https://').replace('&edge=curl', '')
}

export function getISBN(book: GoogleBook): string | null {
  const identifiers = book.volumeInfo.industryIdentifiers
  if (!identifiers) return null

  // Prefer ISBN-13 over ISBN-10
  const isbn13 = identifiers.find(i => i.type === 'ISBN_13')
  if (isbn13) return isbn13.identifier

  const isbn10 = identifiers.find(i => i.type === 'ISBN_10')
  return isbn10?.identifier || null
}

export function formatBookFromGoogle(book: GoogleBook) {
  const info = book.volumeInfo
  const coverUrl = getCoverUrl(book)

  // Extract year from publishedDate (can be "2020", "2020-01", or "2020-01-15")
  const yearMatch = info.publishedDate?.match(/^(\d{4})/)
  const year = yearMatch ? parseInt(yearMatch[1]) : null

  return {
    google_books_id: book.id,
    title: info.title,
    subtitle: info.subtitle || null,
    author: info.authors?.join(', ') || 'Autor desconhecido',
    cover_url: coverUrl,
    year_published: year,
    pages: info.pageCount || null,
    description: info.description || null,
    publisher: info.publisher || null,
    categories: info.categories || null,
    average_rating: info.averageRating || null,
    ratings_count: info.ratingsCount || null,
    isbn: getISBN(book),
    language: info.language || null,
  }
}

// For backwards compatibility with existing code
export type { GoogleBook as BookResult }
