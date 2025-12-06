// User roles
export type UserRole = 'admin' | 'customer'

// User type
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  createdAt: string
}

// Order status
export type OrderStatus = 'pending' | 'processing' | 'delivered' | 'cancelled'

// Order type
export interface Order {
  id: string
  customerId: string
  customerName: string
  status: OrderStatus
  total: number
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

// Order item
export interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  price: number
  total: number
}

// Product type
export interface Product {
  id: string
  name: string
  description?: string
  price: number
  stock: number
  category?: string
  imageUrl?: string
  createdAt: string
}

// Stock status
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

// Payment status
export type PaymentStatus = 'paid' | 'unpaid' | 'partial'

// Payment type
export interface Payment {
  id: string
  orderId: string
  customerId: string
  amount: number
  status: PaymentStatus
  method: string
  createdAt: string
}

// Invoice type
export interface Invoice {
  id: string
  orderId: string
  customerId: string
  customerName: string
  total: number
  status: PaymentStatus
  createdAt: string
  dueDate: string
}

// Dashboard stats
export interface DashboardStats {
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
  pendingOrders: number
  ordersGrowth: number
  revenueGrowth: number
  customersGrowth: number
  pendingGrowth: number
}
