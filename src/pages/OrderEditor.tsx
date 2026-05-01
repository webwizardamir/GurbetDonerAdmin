import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import OrderForm from '../components/orders/OrderForm'
import { fetchOrderById, type OrderWithItems } from '../services/orders'

interface OrderEditorProps {
  mode: 'new' | 'edit'
}

export default function OrderEditor({ mode }: OrderEditorProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [loading, setLoading] = useState(mode === 'edit')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'edit' || !id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchOrderById(id)
      .then(data => {
        if (cancelled) return
        if (!data) {
          setError('Order not found')
          return
        }
        setOrder(data)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load order')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [mode, id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <OrderForm
      editOrder={mode === 'edit' ? order ?? undefined : undefined}
      onCancel={() => navigate('/orders')}
      onSuccess={() => navigate('/orders')}
    />
  )
}
