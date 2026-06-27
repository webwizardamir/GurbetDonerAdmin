import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit2, UserX, UserCheck, X, Users as UsersIcon, Shield, ShieldCheck, Plus, Eye, EyeOff } from 'lucide-react'
import { UserProfile } from '../types'
import { fetchStaffProfiles, updateUserProfile, inviteUser } from '../services/users'
import { useAuth } from '../context/AuthContext'

type UserRole = 'owner' | 'shop_manager'

export default function Users() {
  const { t } = useTranslation()
  const { profile: currentUser } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [editFormData, setEditFormData] = useState<{ fullName: string; role: UserRole }>({ fullName: '', role: 'shop_manager' })
  const [createFormData, setCreateFormData] = useState({ email: '', password: '', fullName: '', role: 'shop_manager' as UserRole })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  // Escape key handler for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEditModal) { setShowEditModal(false); setSelectedUser(null); setFormError(null) }
        if (showCreateModal) { setShowCreateModal(false); setFormError(null) }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showEditModal, showCreateModal])

  // Lock body scroll when modal is open
  useEffect(() => {
    const modalOpen = showEditModal || showCreateModal
    if (!modalOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [showEditModal, showCreateModal])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchStaffProfiles()
      setUsers(data)
    } catch (err) {
      console.error('Failed to load users:', err)
      setError(t('settings.users.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setFormError(null)
    setSubmitting(true)
    try {
      await updateUserProfile(selectedUser.id, { fullName: editFormData.fullName, role: editFormData.role })
      setShowEditModal(false)
      setSelectedUser(null)
      loadUsers()
    } catch (err) {
      console.error('Failed to update user:', err)
      setFormError(t('settings.users.updateError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (user: UserProfile) => {
    try {
      await updateUserProfile(user.id, { isActive: !user.is_active })
      loadUsers()
    } catch (err) {
      console.error('Failed to toggle user status:', err)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const result = await inviteUser({
        email: createFormData.email,
        password: createFormData.password,
        fullName: createFormData.fullName,
        role: createFormData.role,
      })
      if (!result.success) {
        setFormError(result.error || t('settings.users.createError'))
        return
      }
      setShowCreateModal(false)
      setCreateFormData({ email: '', password: '', fullName: '', role: 'shop_manager' })
      loadUsers()
    } catch (err) {
      console.error('Failed to create user:', err)
      setFormError(t('settings.users.createError'))
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user)
    setEditFormData({ fullName: user.full_name, role: user.role as UserRole })
    setFormError(null)
    setShowEditModal(true)
  }

  const closeEditModal = useCallback(() => {
    setShowEditModal(false)
    setSelectedUser(null)
    setFormError(null)
  }, [])

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false)
    setFormError(null)
  }, [])

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return t('settings.users.never')
    return new Date(dateStr).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded-lg">
            <ShieldCheck className="w-3 h-3" />
            {t('settings.users.roles.owner')}
          </span>
        )
      case 'shop_manager':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-lg">
            <Shield className="w-3 h-3" />
            {t('settings.users.roles.shop_manager')}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300 rounded-lg">
            {role}
          </span>
        )
    }
  }

  const getStatusBadge = (isActive: boolean) => isActive ? (
    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-lg">
      {t('settings.users.active')}
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-lg">
      {t('settings.users.inactive')}
    </span>
  )

  const getUserInitial = (user: UserProfile) =>
    user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
  const selectClass = "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
  const disabledInputClass = "w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400"

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => { setCreateFormData({ email: '', password: '', fullName: '', role: 'shop_manager' }); setFormError(null); setShowCreateModal(true) }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('settings.users.addUser')}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
          <button onClick={loadUsers} className="ml-2 underline">{t('common.tryAgain')}</button>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('settings.users.name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('settings.users.role')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('settings.users.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('settings.users.lastLogin')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <UsersIcon className="w-12 h-12 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
                    <p>{t('settings.users.noUsers')}</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className={!user.is_active ? 'bg-slate-50 dark:bg-slate-900/50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <span className="text-green-700 dark:text-green-400 font-medium">{getUserInitial(user)}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{user.full_name}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(user.is_active)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{formatDate(user.last_login_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(user)} className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors" title={t('settings.users.editTooltip')}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`p-2 rounded-xl transition-colors ${user.is_active
                              ? 'text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                              : 'text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                            }`}
                            title={user.is_active ? t('settings.users.deactivateTooltip') : t('settings.users.reactivateTooltip')}
                          >
                            {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {users.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center">
            <UsersIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{t('settings.users.noUsers')}</p>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 ${!user.is_active ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <span className="text-green-700 dark:text-green-400 font-medium">{getUserInitial(user)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(user)} className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {user.id !== currentUser?.id && (
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`p-2 rounded-xl transition-colors ${user.is_active
                        ? 'text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400'
                        : 'text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400'
                      }`}
                    >
                      {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {getRoleBadge(user.role)}
                {getStatusBadge(user.is_active)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t('settings.users.lastLogin')}: {formatDate(user.last_login_at)}</p>
            </div>
          ))
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeEditModal} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settings.users.editUser')}</h2>
              <button onClick={closeEditModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('settings.users.email')}</label>
                <input type="email" value={selectedUser.email} disabled className={disabledInputClass} />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('settings.users.emailCannotChange')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('settings.users.name')}</label>
                <input type="text" value={editFormData.fullName} onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('settings.users.role')}</label>
                <select value={editFormData.role} onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })} className={selectClass} disabled={selectedUser.id === currentUser?.id}>
                  <option value="shop_manager">{t('settings.users.roles.shop_manager')}</option>
                  <option value="owner">{t('settings.users.roles.owner')}</option>
                </select>
                {selectedUser.id === currentUser?.id && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('settings.users.cannotChangeOwnRole')}</p>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeEditModal} className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50">
                  {submitting ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeCreateModal} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('settings.users.addUser')}</h2>
              <button onClick={closeCreateModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('settings.users.email')} *</label>
                <input type="email" value={createFormData.email} onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })} required placeholder="user@example.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('settings.users.name')} *</label>
                <input type="text" value={createFormData.fullName} onChange={(e) => setCreateFormData({ ...createFormData, fullName: e.target.value })} required placeholder="John Doe" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('settings.users.password')} *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={createFormData.password} onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })} required minLength={6} placeholder={t('settings.users.minChars')} className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('settings.users.role')} *</label>
                <select value={createFormData.role} onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value as UserRole })} className={selectClass}>
                  <option value="shop_manager">{t('settings.users.roles.shop_manager')}</option>
                  <option value="owner">{t('settings.users.roles.owner')}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeCreateModal} className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50">
                  {submitting ? t('common.saving') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
