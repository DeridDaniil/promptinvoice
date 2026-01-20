import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Invoice, CreateInvoiceInput, InvoiceItem } from '../types/invoice';
import { ParsedInvoiceData } from '../services/aiService';

interface InvoiceStore {
  invoices: Invoice[];
  isLoading: boolean;
  
  loadInvoices: () => Promise<void>;
  saveInvoices: () => Promise<void>;
  addInvoice: (input: CreateInvoiceInput) => Invoice;
  updateInvoice: (id: string, input: Partial<CreateInvoiceInput>) => void;
  deleteInvoice: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;
  
  setFullInvoice: (data: ParsedInvoiceData) => {
    clientName: string;
    invoiceNumber?: string;
    date?: string;
    dueDate?: string;
    items: Array<Omit<InvoiceItem, 'id' | 'subtotal'>>;
    taxRate?: number;
    discount?: number;
    notes?: string;
  };
  
  calculateItemSubtotal: (quantity: number, price: number) => number;
  calculateInvoiceTotals: (items: InvoiceItem[], taxRate: number, discount: number) => {
    subtotal: number;
    taxAmount: number;
    total: number;
  };
  
  generateNextInvoiceNumber: () => string;
  isInvoiceNumberUnique: (invoiceNumber: string, excludeId?: string) => boolean;
}

const STORAGE_KEY = '@promptinvoice_invoices';

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  invoices: [],
  isLoading: false,

  loadInvoices: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const invoices = JSON.parse(stored) as Invoice[];
        set({ invoices, isLoading: false });
      } else {
        set({ invoices: [], isLoading: false });
      }
    } catch (error) {
      console.error('Ошибка загрузки инвойсов:', error);
      set({ invoices: [], isLoading: false });
    }
  },

  saveInvoices: async () => {
    try {
      const { invoices } = get();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
    } catch (error) {
      console.error('Ошибка сохранения инвойсов:', error);
    }
  },

  calculateItemSubtotal: (quantity: number, price: number) => {
    return quantity * price;
  },

  calculateInvoiceTotals: (items: InvoiceItem[], taxRate: number, discount: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = subtotal * taxRate;
    const discountAmount = subtotal * discount;
    const total = subtotal + taxAmount - discountAmount;
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  },

  addInvoice: (input: CreateInvoiceInput) => {
    const { calculateItemSubtotal, calculateInvoiceTotals } = get();
    
    const items: InvoiceItem[] = input.items.map((item) => ({
      id: generateId(),
      description: item.description,
      quantity: item.quantity,
      price: item.price,
      subtotal: calculateItemSubtotal(item.quantity, item.price),
    }));

    const totals = calculateInvoiceTotals(items, input.taxRate, input.discount);

    const now = new Date().toISOString();
    const newInvoice: Invoice = {
      id: generateId(),
      clientName: input.clientName,
      invoiceNumber: input.invoiceNumber,
      date: input.date,
      dueDate: input.dueDate,
      items,
      subtotal: totals.subtotal,
      taxRate: input.taxRate,
      taxAmount: totals.taxAmount,
      discount: input.discount,
      total: totals.total,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      invoices: [...state.invoices, newInvoice],
    }));

    get().saveInvoices();

    return newInvoice;
  },

  updateInvoice: (id: string, input: Partial<CreateInvoiceInput>) => {
    const { invoices, calculateItemSubtotal, calculateInvoiceTotals } = get();
    const invoiceIndex = invoices.findIndex((inv) => inv.id === id);

    if (invoiceIndex === -1) {
      console.warn(`Инвойс с id ${id} не найден`);
      return;
    }

    const existingInvoice = invoices[invoiceIndex];

    let items = existingInvoice.items;
    if (input.items) {
      items = input.items.map((item) => {
        const existingItem = existingInvoice.items.find((i) => 
          i.description === item.description && 
          i.price === item.price
        );
        
        return {
          id: existingItem?.id || generateId(),
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          subtotal: calculateItemSubtotal(item.quantity, item.price),
        };
      });
    }

    const taxRate = input.taxRate !== undefined ? input.taxRate : existingInvoice.taxRate;
    const discount = input.discount !== undefined ? input.discount : existingInvoice.discount;
    const totals = calculateInvoiceTotals(items, taxRate, discount);

    const updatedInvoice: Invoice = {
      ...existingInvoice,
      clientName: input.clientName ?? existingInvoice.clientName,
      invoiceNumber: input.invoiceNumber ?? existingInvoice.invoiceNumber,
      date: input.date ?? existingInvoice.date,
      dueDate: input.dueDate ?? existingInvoice.dueDate,
      items,
      subtotal: totals.subtotal,
      taxRate,
      taxAmount: totals.taxAmount,
      discount,
      total: totals.total,
      notes: input.notes ?? existingInvoice.notes,
      updatedAt: new Date().toISOString(),
    };

    const newInvoices = [...invoices];
    newInvoices[invoiceIndex] = updatedInvoice;

    set({ invoices: newInvoices });
    get().saveInvoices();
  },

  deleteInvoice: (id: string) => {
    set((state) => ({
      invoices: state.invoices.filter((inv) => inv.id !== id),
    }));
    get().saveInvoices();
  },

  getInvoice: (id: string) => {
    return get().invoices.find((inv) => inv.id === id);
  },

  setFullInvoice: (data: ParsedInvoiceData) => {
    const items = (data.items || []).map((item) => ({
      description: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    return {
      clientName: data.clientName || '',
      invoiceNumber: data.invoiceNumber,
      date: data.date,
      dueDate: data.dueDate,
      items,
      taxRate: data.taxRate,
      discount: data.discount,
      notes: data.notes,
    };
  },

  generateNextInvoiceNumber: () => {
    const { invoices } = get();
    
    const invoiceNumbers = invoices
      .map((inv) => inv.invoiceNumber)
      .filter((num) => /^INV-\d+$/i.test(num))
      .map((num) => {
        const match = num.match(/^INV-(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      });
    
    const maxNumber = invoiceNumbers.length > 0 ? Math.max(...invoiceNumbers) : 0;
    
    const nextNumber = maxNumber + 1;
    return `INV-${nextNumber.toString().padStart(3, '0')}`;
  },

  isInvoiceNumberUnique: (invoiceNumber: string, excludeId?: string) => {
    const { invoices } = get();
    return !invoices.some(
      (inv) => inv.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase() && inv.id !== excludeId
    );
  },
}));

