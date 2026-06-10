const BASE = 'https://api.invoiless.com/v1'

function headers() {
  return {
    'Authorization': `Bearer ${process.env.INVOILESS_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    let message = `Invoiless API error: ${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.message) message = `Invoiless API error: ${body.message}`
      else if (body?.error) message = `Invoiless API error: ${body.error}`
    } catch (_) {}
    throw new Error(message)
  }
  return res.json()
}

export interface CreateInvoiceInput {
  customer: string | {
    internalId: string
    billTo: {
      company?: string
      firstName?: string
      lastName?: string
      email?: string
    }
  }
  items: {
    name: string
    quantity: number
    price: number
    description?: string
  }[]
  status?: string
  currency?: string
  dueDate?: string
  date?: string
  number?: string
  notes?: string
  terms?: string
  taxes?: { name: string; value: number; type?: string }[]
  discount?: { type?: string; value: number }
}

export async function listInvoices(page = 1, limit = 50) {
  const res = await fetch(`${BASE}/invoices?page=${page}&limit=${limit}`, {
    headers: headers(),
  })
  return handleResponse(res)
}

export async function getInvoice(id: string) {
  const res = await fetch(`${BASE}/invoices/${id}`, {
    headers: headers(),
  })
  return handleResponse(res)
}

export async function createInvoice(data: CreateInvoiceInput) {
  const res = await fetch(`${BASE}/invoices`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function updateInvoice(id: string, data: Partial<CreateInvoiceInput>) {
  const res = await fetch(`${BASE}/invoices/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function sendInvoice(
  id: string,
  opts?: { email?: string; subject?: string; body?: string }
) {
  const res = await fetch(`${BASE}/invoices/${id}/send`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(opts ?? {}),
  })
  return handleResponse(res)
}

export async function deleteInvoice(id: string) {
  const res = await fetch(`${BASE}/invoices/${id}`, {
    method: 'DELETE',
    headers: headers(),
  })
  return handleResponse(res)
}
