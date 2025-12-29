import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { AuditLog as AuditLogType } from '../types'
import {
  History,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  FileEdit,
  FilePlus,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react'

const ACTION_ICONS = {
  create: FilePlus,
  update: FileEdit,
  delete: Trash2,
}

const ACTION_COLORS = {
  create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const ENTITY_LABELS: Record<string, string> = {
  profiles: 'User Profile',
  customers: 'Customer',
  products: 'Product',
  orders: 'Order',
  order_items: 'Order Item',
  invoices: 'Invoice',
  payments: 'Payment',
  permissions: 'Permission',
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [entityFilter, setEntityFilter] = useState<string>('')
  const [actionFilter, setActionFilter] = useState<string>('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchLogs()
  }, [entityFilter, actionFilter])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (entityFilter) {
        query = query.eq('entity_type', entityFilter)
      }
      if (actionFilter) {
        query = query.eq('action', actionFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const exportToCsv = async () => {
    setExporting(true)
    try {
      // Fetch all logs for export
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!data || data.length === 0) {
        alert('No data to export')
        return
      }

      // Convert to CSV
      const headers = ['Date', 'User', 'Action', 'Entity Type', 'Entity ID', 'Old Values', 'New Values']
      const csvContent = [
        headers.join(','),
        ...data.map((log) =>
          [
            `"${formatDate(log.created_at)}"`,
            `"${log.user_email}"`,
            log.action,
            log.entity_type,
            log.entity_id,
            `"${JSON.stringify(log.old_values || {}).replace(/"/g, '""')}"`,
            `"${JSON.stringify(log.new_values || {}).replace(/"/g, '""')}"`,
          ].join(',')
        ),
      ].join('\n')

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.user_email.toLowerCase().includes(query) ||
      log.entity_type.toLowerCase().includes(query) ||
      log.entity_id.toLowerCase().includes(query)
    )
  })

  const renderDiff = (oldVal: any, newVal: any) => {
    const allKeys = new Set([
      ...Object.keys(oldVal || {}),
      ...Object.keys(newVal || {}),
    ])

    const changes: { key: string; old: any; new: any }[] = []

    allKeys.forEach((key) => {
      const oldValue = oldVal?.[key]
      const newValue = newVal?.[key]
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        // Skip internal fields
        if (!['created_at', 'updated_at', 'id'].includes(key)) {
          changes.push({ key, old: oldValue, new: newValue })
        }
      }
    })

    if (changes.length === 0) {
      return <p className="text-slate-500 dark:text-slate-400 text-sm">No changes detected</p>
    }

    return (
      <div className="space-y-2">
        {changes.map(({ key, old, new: newValue }) => (
          <div key={key} className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">{key}:</span>
            <div className="ml-4 mt-1 space-y-1">
              {old !== undefined && (
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                    -
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 break-all">
                    {typeof old === 'object' ? JSON.stringify(old) : String(old ?? 'null')}
                  </span>
                </div>
              )}
              {newValue !== undefined && (
                <div className="flex items-start gap-2">
                  <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded">
                    +
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 break-all">
                    {typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue ?? 'null')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={exportToCsv}
          disabled={exporting || logs.length === 0}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user, entity..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Entity Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
            >
              <option value="">All Entities</option>
              <option value="profiles">User Profiles</option>
              <option value="customers">Customers</option>
              <option value="products">Products</option>
              <option value="orders">Orders</option>
              <option value="invoices">Invoices</option>
              <option value="payments">Payments</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">No audit logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredLogs.map((log) => {
              const ActionIcon = ACTION_ICONS[log.action]
              const isExpanded = expandedRows.has(log.id)

              return (
                <div key={log.id}>
                  <button
                    onClick={() => toggleRow(log.id)}
                    className="w-full px-4 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    {/* Expand Icon */}
                    <div className="text-slate-400">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </div>

                    {/* Action Badge */}
                    <div className={`p-2 rounded-lg ${ACTION_COLORS[log.action]}`}>
                      <ActionIcon className="w-4 h-4" />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 dark:text-white capitalize">
                          {log.action}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {ENTITY_LABELS[log.entity_type] || log.entity_type}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                          {log.entity_id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>

                    {/* User */}
                    <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <User className="w-4 h-4" />
                      <span className="truncate max-w-[150px]">{log.user_email}</span>
                    </div>

                    {/* Timestamp */}
                    <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Clock className="w-4 h-4" />
                      {formatDate(log.created_at)}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-16 bg-slate-50 dark:bg-slate-800/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* User Info */}
                        <div className="p-4 bg-white dark:bg-slate-700 rounded-xl">
                          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Details
                          </h4>
                          <dl className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-slate-500 dark:text-slate-400">User:</dt>
                              <dd className="text-slate-900 dark:text-white">{log.user_email}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-slate-500 dark:text-slate-400">Date:</dt>
                              <dd className="text-slate-900 dark:text-white">{formatDate(log.created_at)}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-slate-500 dark:text-slate-400">Entity ID:</dt>
                              <dd className="text-slate-900 dark:text-white font-mono text-xs">{log.entity_id}</dd>
                            </div>
                            {log.ip_address && (
                              <div className="flex justify-between">
                                <dt className="text-slate-500 dark:text-slate-400">IP:</dt>
                                <dd className="text-slate-900 dark:text-white">{log.ip_address}</dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        {/* Changes */}
                        <div className="p-4 bg-white dark:bg-slate-700 rounded-xl">
                          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Changes
                          </h4>
                          {renderDiff(log.old_values, log.new_values)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
