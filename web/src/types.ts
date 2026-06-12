// Mirrors the Pydantic models in backend/main.py.

export interface InvoiceItem {
  description: string
  cost: number
}

export interface Invoice {
  parts_used: InvoiceItem[]
  labor_hours: number
  total_parts_cost: number
  total_labor_cost: number
  grand_total: number
}

export type Role = 'user' | 'assistant'

export interface ChatMessage {
  role: Role
  content: string
}

export interface ChatResponse {
  reply: string
  invoice: Invoice | null
}
