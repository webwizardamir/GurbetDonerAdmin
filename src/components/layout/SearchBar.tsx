// Global search bar component for the header.
// Provides desktop and mobile search with debounced results dropdown.

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  X,
  Loader2,
  ShoppingCart,
  Users,
  Package,
} from 'lucide-react'
import { globalSearch, type SearchResult } from '../../services/search'

const TYPE_ICONS = {
  order: ShoppingCart,
  customer: Users,
  product: Package,
}

interface SearchBarProps {
  showMobileSearch: boolean
  onCloseMobileSearch: () => void
}

export default function SearchBar({ showMobileSearch, onCloseMobileSearch }: SearchBarProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Handle search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (searchQuery.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    setSearchLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await globalSearch(searchQuery)
        setSearchResults(results)
        setShowSearchResults(true)
      } catch (err) { console.error('Search error:', err) }
      finally { setSearchLoading(false) }
    }, 300)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchSelect = (result: SearchResult) => {
    setSearchQuery('')
    setShowSearchResults(false)
    navigate(result.url)
  }

  const renderResults = (onSelect?: () => void) => (
    <>
      {showSearchResults && searchResults.length > 0 && (
        <div className="mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-h-80 overflow-y-auto z-50">
          {searchResults.map((result) => {
            const Icon = TYPE_ICONS[result.type]
            return (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => { handleSearchSelect(result); onSelect?.() }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
              >
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-600">
                  <Icon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{result.title}</p>
                  {result.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{result.subtitle}</p>}
                </div>
                <span className="text-xs text-slate-400 capitalize">{result.type}</span>
              </button>
            )
          })}
        </div>
      )}
      {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
        <div className="mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 text-center z-50">
          <p className="text-sm text-slate-500 dark:text-slate-400">No results found</p>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Desktop Search */}
      <div ref={searchRef} className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
          placeholder="Search orders, customers, products..."
          className="w-64 lg:w-80 pl-10 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
        />
        {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}

        {/* Desktop Search Results */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-h-80 overflow-y-auto z-50">
            {searchResults.map((result) => {
              const Icon = TYPE_ICONS[result.type]
              return (
                <button key={`${result.type}-${result.id}`} onClick={() => handleSearchSelect(result)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-600"><Icon className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{result.title}</p>
                    {result.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{result.subtitle}</p>}
                  </div>
                  <span className="text-xs text-slate-400 capitalize">{result.type}</span>
                </button>
              )
            })}
          </div>
        )}
        {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 text-center z-50">
            <p className="text-sm text-slate-500 dark:text-slate-400">No results found</p>
          </div>
        )}
      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="absolute top-full left-0 right-0 p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              placeholder="Search orders, customers, products..." autoFocus
              className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
            {searchLoading && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
            <button onClick={() => { onCloseMobileSearch(); setSearchQuery(''); setShowSearchResults(false) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          {renderResults(onCloseMobileSearch)}
        </div>
      )}
    </>
  )
}
