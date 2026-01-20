export interface Client {
  id: string;
  name: string;
  email?: string;
  address?: string;
  phone?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Invoice {
  id: string;
  clientId?: string;
  clientName: string;
  
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  
  items: InvoiceItem[];
  
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceInput {
  clientName: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  items: Omit<InvoiceItem, 'id' | 'subtotal'>[];
  taxRate: number;
  discount: number;
  notes?: string;
}

