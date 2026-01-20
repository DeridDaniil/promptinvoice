import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInvoiceStore } from '../../store/useInvoiceStore';
import { CreateInvoiceInput, InvoiceItem } from '../../types/invoice';

// Reset store before each test
beforeEach(() => {
  useInvoiceStore.setState({ invoices: [], isLoading: false });
  jest.clearAllMocks();
});

describe('useInvoiceStore', () => {
  describe('calculateItemSubtotal', () => {
    it('should calculate item subtotal correctly', () => {
      const { calculateItemSubtotal } = useInvoiceStore.getState();
      
      expect(calculateItemSubtotal(2, 100)).toBe(200);
      expect(calculateItemSubtotal(1, 50)).toBe(50);
      expect(calculateItemSubtotal(3, 33.33)).toBeCloseTo(99.99);
      expect(calculateItemSubtotal(0, 100)).toBe(0);
    });

    it('should handle decimal quantities', () => {
      const { calculateItemSubtotal } = useInvoiceStore.getState();
      
      expect(calculateItemSubtotal(1.5, 100)).toBe(150);
      expect(calculateItemSubtotal(2.5, 40)).toBe(100);
    });
  });

  describe('calculateInvoiceTotals', () => {
    it('should calculate totals without tax and discount', () => {
      const { calculateInvoiceTotals } = useInvoiceStore.getState();
      const items: InvoiceItem[] = [
        { id: '1', description: 'Item 1', quantity: 2, price: 100, subtotal: 200 },
        { id: '2', description: 'Item 2', quantity: 1, price: 50, subtotal: 50 },
      ];

      const totals = calculateInvoiceTotals(items, 0, 0);

      expect(totals.subtotal).toBe(250);
      expect(totals.taxAmount).toBe(0);
      expect(totals.total).toBe(250);
    });

    it('should calculate totals with tax', () => {
      const { calculateInvoiceTotals } = useInvoiceStore.getState();
      const items: InvoiceItem[] = [
        { id: '1', description: 'Item 1', quantity: 1, price: 100, subtotal: 100 },
      ];

      const totals = calculateInvoiceTotals(items, 0.2, 0); // 20% tax

      expect(totals.subtotal).toBe(100);
      expect(totals.taxAmount).toBe(20);
      expect(totals.total).toBe(120);
    });

    it('should calculate totals with discount', () => {
      const { calculateInvoiceTotals } = useInvoiceStore.getState();
      const items: InvoiceItem[] = [
        { id: '1', description: 'Item 1', quantity: 1, price: 100, subtotal: 100 },
      ];

      const totals = calculateInvoiceTotals(items, 0, 0.1); // 10% discount

      expect(totals.subtotal).toBe(100);
      expect(totals.taxAmount).toBe(0);
      expect(totals.total).toBe(90);
    });

    it('should calculate totals with both tax and discount', () => {
      const { calculateInvoiceTotals } = useInvoiceStore.getState();
      const items: InvoiceItem[] = [
        { id: '1', description: 'Item 1', quantity: 1, price: 100, subtotal: 100 },
      ];

      // 20% tax, 10% discount
      // subtotal: 100, tax: 20, discount: 10, total: 100 + 20 - 10 = 110
      const totals = calculateInvoiceTotals(items, 0.2, 0.1);

      expect(totals.subtotal).toBe(100);
      expect(totals.taxAmount).toBe(20);
      expect(totals.total).toBe(110);
    });

    it('should round totals to 2 decimal places', () => {
      const { calculateInvoiceTotals } = useInvoiceStore.getState();
      const items: InvoiceItem[] = [
        { id: '1', description: 'Item 1', quantity: 3, price: 33.33, subtotal: 99.99 },
      ];

      const totals = calculateInvoiceTotals(items, 0.15, 0);

      expect(totals.subtotal).toBe(99.99);
      expect(totals.taxAmount).toBe(15); // 99.99 * 0.15 = 14.9985 ≈ 15
      expect(totals.total).toBe(114.99);
    });
  });

  describe('generateNextInvoiceNumber', () => {
    it('should generate INV-001 for empty store', () => {
      const { generateNextInvoiceNumber } = useInvoiceStore.getState();
      
      expect(generateNextInvoiceNumber()).toBe('INV-001');
    });

    it('should generate next sequential number', () => {
      useInvoiceStore.setState({
        invoices: [
          createMockInvoice({ invoiceNumber: 'INV-001' }),
          createMockInvoice({ invoiceNumber: 'INV-002' }),
        ],
      });

      const { generateNextInvoiceNumber } = useInvoiceStore.getState();
      
      expect(generateNextInvoiceNumber()).toBe('INV-003');
    });

    it('should handle gaps in invoice numbers', () => {
      useInvoiceStore.setState({
        invoices: [
          createMockInvoice({ invoiceNumber: 'INV-001' }),
          createMockInvoice({ invoiceNumber: 'INV-005' }),
        ],
      });

      const { generateNextInvoiceNumber } = useInvoiceStore.getState();
      
      expect(generateNextInvoiceNumber()).toBe('INV-006');
    });

    it('should ignore non-standard invoice numbers', () => {
      useInvoiceStore.setState({
        invoices: [
          createMockInvoice({ invoiceNumber: 'INV-003' }),
          createMockInvoice({ invoiceNumber: 'CUSTOM-001' }),
          createMockInvoice({ invoiceNumber: 'ABC123' }),
        ],
      });

      const { generateNextInvoiceNumber } = useInvoiceStore.getState();
      
      expect(generateNextInvoiceNumber()).toBe('INV-004');
    });

    it('should be case insensitive', () => {
      useInvoiceStore.setState({
        invoices: [
          createMockInvoice({ invoiceNumber: 'inv-005' }),
        ],
      });

      const { generateNextInvoiceNumber } = useInvoiceStore.getState();
      
      expect(generateNextInvoiceNumber()).toBe('INV-006');
    });
  });

  describe('isInvoiceNumberUnique', () => {
    beforeEach(() => {
      useInvoiceStore.setState({
        invoices: [
          createMockInvoice({ id: '1', invoiceNumber: 'INV-001' }),
          createMockInvoice({ id: '2', invoiceNumber: 'INV-002' }),
        ],
      });
    });

    it('should return true for unique invoice number', () => {
      const { isInvoiceNumberUnique } = useInvoiceStore.getState();
      
      expect(isInvoiceNumberUnique('INV-003')).toBe(true);
    });

    it('should return false for existing invoice number', () => {
      const { isInvoiceNumberUnique } = useInvoiceStore.getState();
      
      expect(isInvoiceNumberUnique('INV-001')).toBe(false);
    });

    it('should be case insensitive', () => {
      const { isInvoiceNumberUnique } = useInvoiceStore.getState();
      
      expect(isInvoiceNumberUnique('inv-001')).toBe(false);
      expect(isInvoiceNumberUnique('INV-001')).toBe(false);
    });

    it('should exclude specific invoice by id', () => {
      const { isInvoiceNumberUnique } = useInvoiceStore.getState();
      
      // INV-001 exists but we exclude it by id
      expect(isInvoiceNumberUnique('INV-001', '1')).toBe(true);
      
      // INV-001 exists and we don't exclude it
      expect(isInvoiceNumberUnique('INV-001', '2')).toBe(false);
    });
  });

  describe('addInvoice', () => {
    it('should add invoice with calculated totals', () => {
      const { addInvoice } = useInvoiceStore.getState();

      const input: CreateInvoiceInput = {
        clientName: 'Test Client',
        invoiceNumber: 'INV-001',
        date: '2026-01-20',
        items: [
          { description: 'Service 1', quantity: 2, price: 100 },
          { description: 'Service 2', quantity: 1, price: 50 },
        ],
        taxRate: 0.1,
        discount: 0,
      };

      const invoice = addInvoice(input);

      expect(invoice.clientName).toBe('Test Client');
      expect(invoice.invoiceNumber).toBe('INV-001');
      expect(invoice.items).toHaveLength(2);
      expect(invoice.items[0].subtotal).toBe(200);
      expect(invoice.items[1].subtotal).toBe(50);
      expect(invoice.subtotal).toBe(250);
      expect(invoice.taxAmount).toBe(25);
      expect(invoice.total).toBe(275);
      expect(invoice.id).toBeDefined();
      expect(invoice.createdAt).toBeDefined();
      expect(invoice.updatedAt).toBeDefined();
    });

    it('should save invoices to AsyncStorage', async () => {
      const { addInvoice } = useInvoiceStore.getState();

      const input: CreateInvoiceInput = {
        clientName: 'Test',
        invoiceNumber: 'INV-001',
        date: '2026-01-20',
        items: [{ description: 'Item', quantity: 1, price: 100 }],
        taxRate: 0,
        discount: 0,
      };

      addInvoice(input);

      // Wait for async save
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('updateInvoice', () => {
    it('should update existing invoice', () => {
      const { addInvoice, updateInvoice, getInvoice } = useInvoiceStore.getState();

      const invoice = addInvoice({
        clientName: 'Original Client',
        invoiceNumber: 'INV-001',
        date: '2026-01-20',
        items: [{ description: 'Item', quantity: 1, price: 100 }],
        taxRate: 0,
        discount: 0,
      });

      updateInvoice(invoice.id, { clientName: 'Updated Client' });

      const updated = getInvoice(invoice.id);
      expect(updated?.clientName).toBe('Updated Client');
    });

    it('should recalculate totals when items change', () => {
      const { addInvoice, updateInvoice, getInvoice } = useInvoiceStore.getState();

      const invoice = addInvoice({
        clientName: 'Client',
        invoiceNumber: 'INV-001',
        date: '2026-01-20',
        items: [{ description: 'Item', quantity: 1, price: 100 }],
        taxRate: 0.1,
        discount: 0,
      });

      expect(invoice.total).toBe(110);

      updateInvoice(invoice.id, {
        items: [{ description: 'Item', quantity: 2, price: 100 }],
      });

      const updated = getInvoice(invoice.id);
      expect(updated?.subtotal).toBe(200);
      expect(updated?.taxAmount).toBe(20);
      expect(updated?.total).toBe(220);
    });

    it('should not update non-existent invoice', () => {
      const { updateInvoice } = useInvoiceStore.getState();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      updateInvoice('non-existent-id', { clientName: 'Test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('не найден')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('deleteInvoice', () => {
    it('should delete existing invoice', () => {
      const { addInvoice, deleteInvoice, getInvoice, invoices } = useInvoiceStore.getState();

      const invoice = addInvoice({
        clientName: 'Client',
        invoiceNumber: 'INV-001',
        date: '2026-01-20',
        items: [{ description: 'Item', quantity: 1, price: 100 }],
        taxRate: 0,
        discount: 0,
      });

      expect(useInvoiceStore.getState().invoices).toHaveLength(1);

      deleteInvoice(invoice.id);

      expect(useInvoiceStore.getState().invoices).toHaveLength(0);
      expect(getInvoice(invoice.id)).toBeUndefined();
    });
  });

  describe('getInvoice', () => {
    it('should return invoice by id', () => {
      const { addInvoice, getInvoice } = useInvoiceStore.getState();

      const invoice = addInvoice({
        clientName: 'Test Client',
        invoiceNumber: 'INV-001',
        date: '2026-01-20',
        items: [{ description: 'Item', quantity: 1, price: 100 }],
        taxRate: 0,
        discount: 0,
      });

      const found = getInvoice(invoice.id);
      expect(found).toBeDefined();
      expect(found?.clientName).toBe('Test Client');
    });

    it('should return undefined for non-existent id', () => {
      const { getInvoice } = useInvoiceStore.getState();

      expect(getInvoice('non-existent')).toBeUndefined();
    });
  });

  describe('loadInvoices', () => {
    it('should load invoices from AsyncStorage', async () => {
      const mockInvoices = [
        createMockInvoice({ id: '1', clientName: 'Client 1' }),
        createMockInvoice({ id: '2', clientName: 'Client 2' }),
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockInvoices)
      );

      const { loadInvoices } = useInvoiceStore.getState();
      await loadInvoices();

      const state = useInvoiceStore.getState();
      expect(state.invoices).toHaveLength(2);
      expect(state.invoices[0].clientName).toBe('Client 1');
      expect(state.isLoading).toBe(false);
    });

    it('should handle empty storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const { loadInvoices } = useInvoiceStore.getState();
      await loadInvoices();

      const state = useInvoiceStore.getState();
      expect(state.invoices).toHaveLength(0);
      expect(state.isLoading).toBe(false);
    });

    it('should handle storage errors', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { loadInvoices } = useInvoiceStore.getState();
      await loadInvoices();

      const state = useInvoiceStore.getState();
      expect(state.invoices).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('setFullInvoice', () => {
    it('should transform AI parsed data to invoice format', () => {
      const { setFullInvoice } = useInvoiceStore.getState();

      const parsedData = {
        clientName: 'AI Client',
        invoiceNumber: 'AI-001',
        date: '2026-01-20',
        dueDate: '2026-02-20',
        items: [
          { name: 'Design', quantity: 2, price: 500 },
          { name: 'Development', quantity: 10, price: 100 },
        ],
        taxRate: 0.2,
        discount: 0.1,
        notes: 'Test notes',
      };

      const result = setFullInvoice(parsedData);

      expect(result.clientName).toBe('AI Client');
      expect(result.invoiceNumber).toBe('AI-001');
      expect(result.date).toBe('2026-01-20');
      expect(result.dueDate).toBe('2026-02-20');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].description).toBe('Design');
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].price).toBe(500);
      expect(result.taxRate).toBe(0.2);
      expect(result.discount).toBe(0.1);
      expect(result.notes).toBe('Test notes');
    });

    it('should handle empty/missing data', () => {
      const { setFullInvoice } = useInvoiceStore.getState();

      const result = setFullInvoice({});

      expect(result.clientName).toBe('');
      expect(result.items).toHaveLength(0);
      expect(result.invoiceNumber).toBeUndefined();
    });
  });
});

// Helper function to create mock invoices
function createMockInvoice(overrides: Partial<{
  id: string;
  clientName: string;
  invoiceNumber: string;
}>): any {
  const now = new Date().toISOString();
  return {
    id: overrides.id || `mock-${Date.now()}`,
    clientName: overrides.clientName || 'Mock Client',
    invoiceNumber: overrides.invoiceNumber || 'INV-001',
    date: '2026-01-20',
    items: [{ id: '1', description: 'Item', quantity: 1, price: 100, subtotal: 100 }],
    subtotal: 100,
    taxRate: 0,
    taxAmount: 0,
    discount: 0,
    total: 100,
    createdAt: now,
    updatedAt: now,
  };
}

