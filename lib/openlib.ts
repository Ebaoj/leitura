const OPEN_LIBRARY_BASE = 'https://openlibrary.org'
const COVERS_BASE = 'https://covers.openlibrary.org'

export interface OpenLibraryBook {
  key: string
  title: string
  author_name?: string[]
  first_publish_year?: number
  cover_i?: number
  number_of_pages_median?: number
}

export interface OpenLibrarySearchResult {
  docs: OpenLibraryBook[]
  numFound: number
}

export async function searchBooks(query: string, limit = 10): Promise<OpenLibraryBook[]> {
  const response = await fetch(
    `${OPEN_LIBRARY_BASE}/search.json?q=${encodeURIComponent(query)}&limit=${limit}`
  )
  const data: OpenLibrarySearchResult = await response.json()
  return data.docs
}

export async function getBookDetails(workKey: string) {
  const response = await fetch(`${OPEN_LIBRARY_BASE}${workKey}.json`)
  return response.json()
}

export function getCoverUrl(coverId: number | undefined, size: 'S' | 'M' | 'L' = 'M'): string | null {
  if (!coverId) return null
  return `${COVERS_BASE}/b/id/${coverId}-${size}.jpg`
}

export function formatBookFromOpenLibrary(book: OpenLibraryBook) {
  return {
    open_library_key: book.key,
    title: book.title,
    author: book.author_name?.[0] || 'Autor desconhecido',
    cover_url: getCoverUrl(book.cover_i),
    year_published: book.first_publish_year || null,
    pages: book.number_of_pages_median || null,
  }
}
