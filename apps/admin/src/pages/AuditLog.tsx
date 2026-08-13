import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import { AuditLog as AuditLogType, AuditAction } from '../types'
import {
  History,
  Filter,
  ChevronDown,
  ChevronRight,
  Clock,
  FileEdit,
  FilePlus,
  Trash2,
  Loader2,
  RefreshCw,
  Cog,
  Copy,
  Check,
  Layers,
  AlertTriangle,
} from 'lucide-react'
import ExportMenu from '../components/ui/ExportMenu'
import type { ComboOption } from '../components/ui/ComboPicker'
import ListToolbar from '../components/ui/ListToolbar'
import type { FilterDef } from '../components/ui/filterTypes'
import { formatDateTime, formatRelativeTime } from '../utils/format'
import { ymdInAms } from '../utils/dateRange'
import {
  type TFn,
  type NameResolver,
  type AuditItem,
  deriveEntityTitle,
  summarizeChange,
  documentSnapshotSummary,
  getChangedFields,
  formatAuditValue,
  fieldLabel,
  entityLabel,
  entityBadgeClass,
  groupAuditLogs,
  groupSummary,
  isSystemActor,
  actorInitials,
  AUDIT_ENTITY_TYPES,
} from '../utils/audit'

const PAGE_SIZE = 50

const ACTION_ICONS = { create: FilePlus, update: FileEdit, delete: Trash2 }
const ACTION_COLORS = {
  create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

type DatePreset = 'today' | '7' | '30' | 'all'

export default function AuditLog() {
  const { t: rawT, i18n } = useTranslation()
  const t = rawT as unknown as TFn
  const locale = i18n.language?.startsWith('en') ? 'en' : 'nl'
  const { isOwner } = useAuth()

  const [logs, setLogs] = useState<AuditLogType[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('') // debounced, drives the query
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [userFilter, setUserFilter] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [grouped, setGrouped] = useState(true)

  const [actors, setActors] = useState<ComboOption[]>([])
  const [resolver, setResolver] = useState<NameResolver>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // ---- date range derived from preset (or custom inputs) ----
  const dateRange = useMemo(() => {
    const startOfDay = (d: Date) => {
      const x = new Date(d)
      x.setHours(0, 0, 0, 0)
      return x
    }
    if (datePreset === 'today') {
      const from = startOfDay(new Date())
      return { fromISO: from.toISOString(), toISO: null as string | null }
    }
    if (datePreset === '7' || datePreset === '30') {
      const days = datePreset === '7' ? 7 : 30
      const from = startOfDay(new Date(Date.now() - (days - 1) * 86400000))
      return { fromISO: from.toISOString(), toISO: null }
    }
    // custom
    const fromISO = dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : null
    const toISO = dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : null
    return { fromISO, toISO }
  }, [datePreset, dateFrom, dateTo])

  const hasActiveFilters =
    !!searchQuery || !!entityFilter || !!actionFilter || !!userFilter || datePreset !== 'all' || !!dateFrom || !!dateTo

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(searchQuery), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  // ---- server-side filter/search params (shared by list + export) ----
  // Search runs server-side across the WHOLE table via the search_audit_logs
  // RPC, including a substring match inside the snapshot JSON — so order numbers
  // and customer names (which live in new_values/old_values) are findable.
  const rpcFilters = useMemo(
    () => ({
      p_search: searchTerm.trim() || null,
      p_entity_type: entityFilter || null,
      p_action: actionFilter || null,
      p_user_email: userFilter || null,
      p_from: dateRange.fromISO,
      p_to: dateRange.toISO,
    }),
    [searchTerm, entityFilter, actionFilter, userFilter, dateRange],
  )

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const { data, error: err } = await supabase.rpc('search_audit_logs', {
        ...rpcFilters,
        p_cursor: cursor,
        p_limit: PAGE_SIZE + 1,
      })
      if (err) throw err
      const rows = (data ?? []) as unknown as AuditLogType[]
      const more = rows.length > PAGE_SIZE
      return { rows: more ? rows.slice(0, PAGE_SIZE) : rows, more }
    },
    [rpcFilters],
  )

  // reset + fetch when filters change
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    fetchPage(null)
      .then(({ rows, more }) => {
        if (cancelled) return
        setLogs(rows)
        setHasMore(more)
      })
      .catch((e) => {
        console.error('Error fetching audit logs:', e)
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchPage])

  const loadMore = async () => {
    if (logs.length === 0) return
    setLoadingMore(true)
    try {
      const cursor = logs[logs.length - 1].created_at
      const { rows, more } = await fetchPage(cursor)
      setLogs((prev) => [...prev, ...rows])
      setHasMore(more)
    } catch (e) {
      console.error('Error loading more audit logs:', e)
    } finally {
      setLoadingMore(false)
    }
  }

  // ---- actors for the user dropdown (owner-gated RPC) ----
  useEffect(() => {
    supabase.rpc('get_audit_actors').then(({ data, error: err }) => {
      if (err || !data) return
      const opts: ComboOption[] = (data as { user_id: string | null; user_email: string }[]).map((a) => {
        const system = isSystemActor(a.user_email)
        return {
          value: a.user_email,
          label: system ? t('auditLog.filters.systemActor') : a.user_email,
          sublabel: system ? undefined : undefined,
        }
      })
      setActors(opts)
    })
  }, [t])

  // ---- batch-resolve FK product ids referenced by customer_prices rows ----
  useEffect(() => {
    const productIds = new Set<string>()
    for (const log of logs) {
      // price_list_items / product_unit_prices carry product_id too (00108), and
    // without resolving it their titles degrade to a raw UUID stub.
    if (
      log.entity_type === 'customer_prices' ||
      log.entity_type === 'price_list_items' ||
      log.entity_type === 'product_unit_prices'
    ) {
        const snap = (log.new_values ?? log.old_values ?? {}) as Record<string, unknown>
        const pid = snap.product_id
        if (typeof pid === 'string') productIds.add(pid)
      }
    }
    if (productIds.size === 0) return
    let cancelled = false
    supabase
      .from('products')
      .select('id,name')
      .in('id', [...productIds])
      .then(({ data }) => {
        if (cancelled || !data) return
        const map = new Map(data.map((p: { id: string; name: string }) => [p.id, p.name]))
        setResolver({ product: (id) => map.get(id) })
      })
    return () => {
      cancelled = true
    }
  }, [logs])

  // Search + filtering already happened server-side; render the rows as-is.
  const filteredLogs = logs

  const items: AuditItem[] = useMemo(
    () => (grouped ? groupAuditLogs(filteredLogs) : filteredLogs.map((log) => ({ kind: 'single', log }))),
    [filteredLogs, grouped],
  )

  // ---- summary stats over the loaded, filtered set ----
  const stats = useMemo(() => {
    const s = { total: filteredLogs.length, create: 0, update: 0, delete: 0, users: new Set<string>() }
    for (const l of filteredLogs) {
      s[l.action]++
      s.users.add(l.user_email)
    }
    return s
  }, [filteredLogs])

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const clearFilters = () => {
    setSearchQuery('')
    setEntityFilter('')
    setActionFilter('')
    setUserFilter(null)
    setDatePreset('all')
    setDateFrom('')
    setDateTo('')
  }


  const setPreset = (p: DatePreset) => {
    setDatePreset(p)
    if (p !== 'all') {
      setDateFrom('')
      setDateTo('')
    }
  }

  // ---- export scoped to the active filters + search (whole matching set) ----
  const fetchAllForExport = async () => {
    const { data, error: err } = await supabase.rpc('search_audit_logs', {
      ...rpcFilters,
      p_cursor: null,
      p_limit: null, // no limit → all matching rows
    })
    if (err) throw err
    return (data ?? []) as unknown as AuditLogType[]
  }

  const exportColumns = useMemo(
    () => [
      { key: 'created_at', header: t('auditLog.ui.date'), format: (v: unknown) => formatDateTime(v as string) },
      { key: 'user_email', header: t('auditLog.ui.user') },
      {
        key: 'action',
        header: t('settings.auditLog.action'),
        format: (v: unknown) => t(`auditLog.actions.${v}`),
      },
      {
        key: 'entity_type',
        header: t('auditLog.ui.entityType'),
        format: (v: unknown) => entityLabel(t, v as string),
      },
      {
        key: 'id',
        header: t('settings.auditLog.details'),
        format: (_v: unknown, row?: AuditLogType) => (row ? summarizeChange(row, t, { isOwner }) : ''),
      },
    ],
    [t, isOwner],
  )

  const actorOptions = actors

  const auditFilterDefs = useMemo<FilterDef[]>(() => [
    {
      id: 'user',
      kind: 'select',
      label: t('auditLog.filters.allUsers'),
      icon: Filter,
      value: userFilter ?? '',
      // Searchable: the actor list grows with staff and was the one control here
      // already using a picker.
      searchable: true,
      searchPlaceholder: t('auditLog.filters.searchUsers'),
      options: actorOptions.map(o => ({ value: o.value, label: o.label, sublabel: o.sublabel })),
      onChange: v => setUserFilter(v || null),
      allLabel: t('auditLog.filters.allUsers'),
    },
    {
      id: 'entity',
      kind: 'select',
      label: t('auditLog.ui.entityType'),
      value: entityFilter,
      options: AUDIT_ENTITY_TYPES.map(e => ({ value: e, label: entityLabel(t, e) })),
      onChange: setEntityFilter,
      allLabel: t('auditLog.filters.allEntities'),
    },
    {
      id: 'action',
      kind: 'select',
      label: t('settings.auditLog.action'),
      value: actionFilter,
      options: (['create', 'update', 'delete'] as AuditAction[]).map(a => ({ value: a, label: t(`auditLog.actions.${a}`) })),
      onChange: setActionFilter,
      allLabel: t('auditLog.filters.allActions'),
    },
    {
      id: 'datePreset',
      kind: 'segmented',
      label: t('auditLog.filters.all'),
      value: !dateFrom && !dateTo ? datePreset : 'all',
      onChange: v => setPreset(v as DatePreset),
      options: [
        { value: 'today', label: t('auditLog.filters.today') },
        { value: '7', label: t('auditLog.filters.last7') },
        { value: '30', label: t('auditLog.filters.last30') },
        { value: 'all', label: t('auditLog.filters.all') },
      ],
    },
    {
      id: 'grouped',
      kind: 'toggle',
      label: grouped ? t('auditLog.ui.groupedView') : t('auditLog.ui.flatView'),
      icon: Layers,
      value: grouped,
      onChange: setGrouped,
    },
  ], [t, userFilter, actorOptions, entityFilter, actionFilter, datePreset, dateFrom, dateTo, grouped])

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => {
            setLoading(true)
            fetchPage(null)
              .then(({ rows, more }) => {
                setLogs(rows)
                setHasMore(more)
                setError(false)
              })
              .catch(() => setError(true))
              .finally(() => setLoading(false))
          }}
          disabled={loading}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title={t('auditLog.ui.refresh')}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <ExportMenu
          getAllData={fetchAllForExport}
          columns={exportColumns as never}
          filename={`audit-log-${ymdInAms()}`}
          pdfTitle={t('auditLog.ui.title')}
          storageKey="audit"
          disabled={logs.length === 0}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t('auditLog.stats.total')} value={stats.total} />
        <StatCard label={t('auditLog.stats.created')} value={stats.create} tone="green" />
        <StatCard label={t('auditLog.stats.updated')} value={stats.update} tone="blue" />
        <StatCard label={t('auditLog.stats.activeUsers')} value={stats.users.size} />
      </div>

      {/* Filters. The card wrapper is dropped — ListToolbar is not card-wrapped
          anywhere else. On mobile these four stacked full-width selects become
          the filter sheet. */}
      <ListToolbar
        search={{ value: searchQuery, onChange: setSearchQuery, placeholder: t('auditLog.filters.searchPlaceholder') }}
        filters={auditFilterDefs}
      />

      {/* Custom range stays out of the sheet: two date inputs read better under
          the bar than inside it, and they clear the preset when used. */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setDatePreset('all') }}
          aria-label={t('auditLog.filters.dateFrom')}
          className="px-3 h-11 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-base md:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 dark:[color-scheme:dark]"
        />
        <span className="text-slate-400 text-sm">{t('common.to')}</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setDatePreset('all') }}
          aria-label={t('auditLog.filters.dateTo')}
          className="px-3 h-11 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-base md:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 dark:[color-scheme:dark]"
        />
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 h-11 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            {t('auditLog.filters.clear')}
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <SkeletonRows />
        ) : error ? (
          <div className="p-6">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="w-5 h-5" />
                <span>{t('auditLog.states.error')}</span>
              </div>
              <button
                onClick={() => {
                  setLoading(true)
                  fetchPage(null)
                    .then(({ rows, more }) => {
                      setLogs(rows)
                      setHasMore(more)
                      setError(false)
                    })
                    .catch(() => setError(true))
                    .finally(() => setLoading(false))
                }}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('auditLog.states.retry')}
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              {hasActiveFilters ? t('auditLog.states.noResults') : t('auditLog.states.noLogs')}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-sm text-green-600 hover:text-green-700">
                {t('auditLog.filters.clear')}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {items.map((item) =>
              item.kind === 'single' ? (
                <LogRow
                  key={item.log.id}
                  log={item.log}
                  t={t}
                  locale={locale}
                  isOwner={isOwner}
                  resolver={resolver}
                  expanded={expanded.has(item.log.id)}
                  onToggle={() => toggle(item.log.id)}
                />
              ) : (
                <GroupRow
                  key={item.key}
                  group={item}
                  t={t}
                  locale={locale}
                  isOwner={isOwner}
                  resolver={resolver}
                  expanded={expanded.has(item.key)}
                  onToggle={() => toggle(item.key)}
                />
              ),
            )}
          </div>
        )}

        {!loading && !error && hasMore && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-2"
            >
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('common.loadMore')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'green' | 'blue' }) {
  const toneClass =
    tone === 'green'
      ? 'text-green-600 dark:text-green-400'
      : tone === 'blue'
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-slate-900 dark:text-white'
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

function ActorAvatar({ email }: { email: string }) {
  if (isSystemActor(email)) {
    return (
      <div
        className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0"
        title={email}
      >
        <Cog className="w-4 h-4" />
      </div>
    )
  }
  return (
    <div
      className="w-7 h-7 rounded-full bg-green-600 text-white text-xs font-medium flex items-center justify-center shrink-0"
      title={email}
    >
      {actorInitials(email)}
    </div>
  )
}

function EntityBadge({ entity, t }: { entity: string; t: TFn }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-lg shrink-0 ${entityBadgeClass(entity)}`}>
      {entityLabel(t, entity)}
    </span>
  )
}

function ActorLine({ email, t }: { email: string; t: TFn }) {
  return isSystemActor(email) ? (
    <span title={t('auditLog.actor.systemTooltip')}>{t('auditLog.actor.system')}</span>
  ) : (
    <span>{email}</span>
  )
}

function LogRow({
  log,
  t,
  locale,
  isOwner,
  resolver,
  expanded,
  onToggle,
}: {
  log: AuditLogType
  t: TFn
  locale: string
  isOwner: boolean
  resolver: NameResolver
  expanded: boolean
  onToggle: () => void
}) {
  const ActionIcon = ACTION_ICONS[log.action]
  const title = deriveEntityTitle(log, t, resolver)
  const summary = summarizeChange(log, t, { isOwner })
  const panelId = `audit-panel-${log.id}`

  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="w-full px-4 py-3 grid grid-cols-[auto_auto_auto_1fr_auto] items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-inset"
      >
        <span className="text-slate-400" aria-hidden>
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </span>
        <span className={`p-2 rounded-lg ${ACTION_COLORS[log.action]}`} aria-hidden>
          <ActionIcon className="w-4 h-4" />
        </span>
        <ActorAvatar email={log.user_email} />
        <span className="min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-600 dark:text-slate-400 text-sm">{t(`auditLog.actions.${log.action}`)}</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate">{title}</span>
            <EntityBadge entity={log.entity_type} t={t} />
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            <ActorLine email={log.user_email} t={t} />
            {summary ? <span> · {summary}</span> : null}
          </span>
        </span>
        <span
          className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap"
          title={formatDateTime(log.created_at)}
        >
          <Clock className="w-3.5 h-3.5" />
          {formatRelativeTime(log.created_at, locale)}
        </span>
      </button>

      {expanded && (
        <div id={panelId} role="region" className="px-4 pb-4 pl-4 md:pl-16 bg-slate-50 dark:bg-slate-800/50">
          <LogDetail log={log} t={t} isOwner={isOwner} />
        </div>
      )}
    </div>
  )
}

function GroupRow({
  group,
  t,
  locale,
  isOwner,
  resolver,
  expanded,
  onToggle,
}: {
  group: Extract<AuditItem, { kind: 'group' }>
  t: TFn
  locale: string
  isOwner: boolean
  resolver: NameResolver
  expanded: boolean
  onToggle: () => void
}) {
  const { title, detail } = groupSummary(group, t)
  const panelId = `audit-group-${group.key}`

  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="w-full px-4 py-3 grid grid-cols-[auto_auto_auto_1fr_auto] items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-inset"
      >
        <span className="text-slate-400" aria-hidden>
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </span>
        <span className="p-2 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" aria-hidden>
          <Layers className="w-4 h-4" />
        </span>
        <ActorAvatar email={group.user_email} />
        <span className="min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-600 dark:text-slate-400 text-sm">{t('auditLog.actions.update')}</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate">{title}</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {group.logs.length}
            </span>
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            <ActorLine email={group.user_email} t={t} />
            {detail ? <span> · {detail}</span> : null}
          </span>
        </span>
        <span
          className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap"
          title={formatDateTime(group.created_at)}
        >
          <Clock className="w-3.5 h-3.5" />
          {formatRelativeTime(group.created_at, locale)}
        </span>
      </button>

      {expanded && (
        <div id={panelId} role="region" className="px-4 pb-4 pl-4 md:pl-16 bg-slate-50 dark:bg-slate-800/50 space-y-2">
          {group.logs.map((child) => (
            <div key={child.id} className="bg-white dark:bg-slate-700/40 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-slate-600 dark:text-slate-400 text-xs">{t(`auditLog.actions.${child.action}`)}</span>
                <span className="font-medium text-slate-900 dark:text-white text-sm truncate">
                  {deriveEntityTitle(child, t, resolver)}
                </span>
                <EntityBadge entity={child.entity_type} t={t} />
              </div>
              {child.action === 'update' ? (
                <DiffTable log={child} t={t} isOwner={isOwner} />
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">{summarizeChange(child, t, { isOwner })}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LogDetail({ log, t, isOwner }: { log: AuditLogType; t: TFn; isOwner: boolean }) {
  const [copied, setCopied] = useState(false)
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(log.entity_id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const isDoc = log.entity_type === 'documents'
  const docSummary = isDoc ? documentSnapshotSummary(log, t) : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
      {/* Details */}
      <div className="p-4 bg-white dark:bg-slate-700 rounded-xl">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('auditLog.ui.details')}</h4>
        <dl className="space-y-1 text-sm">
          <Row label={t('auditLog.ui.user')}>
            <ActorLine email={log.user_email} t={t} />
          </Row>
          <Row label={t('auditLog.ui.date')}>{formatDateTime(log.created_at)}</Row>
          <Row label={t('auditLog.ui.entityType')}>{entityLabel(t, log.entity_type)}</Row>
          <Row label={t('auditLog.ui.entityId')}>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{log.entity_id.slice(0, 8)}…</span>
              <button
                onClick={copyId}
                aria-label={t('auditLog.diff.copyId')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {copied && (
                <span role="status" className="text-xs text-green-600">
                  {t('auditLog.diff.copied')}
                </span>
              )}
            </span>
          </Row>
        </dl>
      </div>

      {/* Changes */}
      <div className="p-4 bg-white dark:bg-slate-700 rounded-xl">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('auditLog.ui.changes')}</h4>
        {isDoc ? (
          <div className="space-y-2 text-sm">
            <p className="text-slate-700 dark:text-slate-200 font-medium">{summarizeChange(log, t, { isOwner })}</p>
            {docSummary?.total && (
              <p className="text-slate-500 dark:text-slate-400">
                {docSummary.type} {docSummary.number} · {docSummary.total}
              </p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                {t('auditLog.ui.rawSnapshot')}
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                {JSON.stringify(log.new_values ?? log.old_values, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <DiffTable log={log} t={t} isOwner={isOwner} />
        )}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500 dark:text-slate-400 shrink-0">{label}:</dt>
      <dd className="text-slate-900 dark:text-white text-right min-w-0 truncate">{children}</dd>
    </div>
  )
}

function DiffTable({ log, t, isOwner }: { log: AuditLogType; t: TFn; isOwner: boolean }) {
  const changes = useMemo(() => getChangedFields(log, { isOwner }), [log, isOwner])

  if (changes.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-sm">{t('auditLog.diff.noChanges')}</p>
  }

  const showOld = log.action !== 'create'
  const showNew = log.action !== 'delete'

  return (
    <div className="space-y-2">
      {changes.map((c) => (
        <div key={c.key} className="text-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{fieldLabel(t, c.key)}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {showOld && (
              <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 break-all line-through decoration-red-400/50">
                {formatAuditValue(c.key, c.old, t)}
              </span>
            )}
            {showOld && showNew && (
              <span className="text-slate-400" aria-hidden>
                →
              </span>
            )}
            {showNew && (
              <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 break-all">
                {formatAuditValue(c.key, c.new, t)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
          <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-2.5 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700 hidden md:block" />
        </div>
      ))}
    </div>
  )
}
