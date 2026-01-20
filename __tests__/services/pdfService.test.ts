import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateInvoicePDF, generateAllInvoicesPDF } from '../../services/pdfService';
import { Invoice } from '../../types/invoice';

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Setup default mock implementations
  (Print.printToFileAsync as jest.Mock).mockResolvedValue({ uri: 'mock-uri' });
  (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
  (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
});

describe('pdfService', () => {
  const mockInvoice: Invoice = {
    id: '1',
    clientName: 'Test Client',
    invoiceNumber: 'INV-001',
    date: '2026-01-20',
    dueDate: '2026-02-20',
    items: [
      { id: '1', description: 'Service A', quantity: 2, price: 100, subtotal: 200 },
      { id: '2', description: 'Service B', quantity: 1, price: 150, subtotal: 150 },
    ],
    subtotal: 350,
    taxRate: 0.1,
    taxAmount: 35,
    discount: 0,
    total: 385,
    notes: 'Thank you for your business!',
    createdAt: '2026-01-20T10:00:00.000Z',
    updatedAt: '2026-01-20T10:00:00.000Z',
  };

  describe('generateInvoicePDF', () => {
    it('should generate PDF and share it', async () => {
      await generateInvoicePDF(mockInvoice);

      expect(Print.printToFileAsync).toHaveBeenCalledWith({
        html: expect.stringContaining('Test Client'),
        base64: false,
        width: 595,
        height: 842,
      });

      expect(Sharing.isAvailableAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith('mock-uri', {
        mimeType: 'application/pdf',
        dialogTitle: 'Share invoice INV-001',
      });
    });

    it('should include invoice details in HTML', async () => {
      await generateInvoicePDF(mockInvoice);

      const htmlArg = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;

      expect(htmlArg).toContain('Test Client');
      expect(htmlArg).toContain('INV-001');
      expect(htmlArg).toContain('Service A');
      expect(htmlArg).toContain('Service B');
      expect(htmlArg).toContain('$350.00'); // subtotal
      expect(htmlArg).toContain('$385.00'); // total
      expect(htmlArg).toContain('Thank you for your business!');
    });

    it('should throw error when invoice is null', async () => {
      await expect(generateInvoicePDF(null as any)).rejects.toThrow('Invoice data is missing');
    });

    it('should throw error when sharing is not available', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

      await expect(generateInvoicePDF(mockInvoice)).rejects.toThrow(
        'Sharing is not available on this device'
      );
    });

    it('should handle Print errors gracefully', async () => {
      (Print.printToFileAsync as jest.Mock).mockRejectedValue(new Error('Print failed'));

      await expect(generateInvoicePDF(mockInvoice)).rejects.toThrow('PDF generation error: Print failed');
    });

    it('should handle invoice without optional fields', async () => {
      const minimalInvoice: Invoice = {
        ...mockInvoice,
        dueDate: undefined,
        notes: undefined,
        discount: 0,
      };

      await generateInvoicePDF(minimalInvoice);

      const htmlArg = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;

      expect(htmlArg).not.toContain('Due Date:');
    });

    it('should format tax correctly', async () => {
      await generateInvoicePDF(mockInvoice);

      const htmlArg = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;

      expect(htmlArg).toContain('Tax (10%)');
      expect(htmlArg).toContain('$35.00');
    });

    it('should show discount when present', async () => {
      const invoiceWithDiscount: Invoice = {
        ...mockInvoice,
        discount: 0.1, // 10%
      };

      await generateInvoicePDF(invoiceWithDiscount);

      const htmlArg = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;

      expect(htmlArg).toContain('Discount (10%)');
    });
  });

  describe('generateAllInvoicesPDF', () => {
    const mockInvoices: Invoice[] = [
      mockInvoice,
      {
        ...mockInvoice,
        id: '2',
        clientName: 'Second Client',
        invoiceNumber: 'INV-002',
        total: 500,
      },
    ];

    it('should generate PDF with all invoices', async () => {
      await generateAllInvoicesPDF(mockInvoices);

      expect(Print.printToFileAsync).toHaveBeenCalledWith({
        html: expect.stringContaining('All Invoices Report'),
        base64: false,
        width: 595,
        height: 842,
      });

      expect(Sharing.shareAsync).toHaveBeenCalledWith('mock-uri', {
        mimeType: 'application/pdf',
        dialogTitle: 'Export all invoices (2)',
      });
    });

    it('should include summary section', async () => {
      await generateAllInvoicesPDF(mockInvoices);

      const htmlArg = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;

      expect(htmlArg).toContain('Total Invoices:');
      expect(htmlArg).toContain('2'); // count
      expect(htmlArg).toContain('Total Amount:');
    });

    it('should include all invoice details', async () => {
      await generateAllInvoicesPDF(mockInvoices);

      const htmlArg = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;

      expect(htmlArg).toContain('Test Client');
      expect(htmlArg).toContain('Second Client');
      expect(htmlArg).toContain('INV-001');
      expect(htmlArg).toContain('INV-002');
    });

    it('should throw error for empty invoices array', async () => {
      await expect(generateAllInvoicesPDF([])).rejects.toThrow('No invoices to export');
    });

    it('should throw error for null invoices', async () => {
      await expect(generateAllInvoicesPDF(null as any)).rejects.toThrow('No invoices to export');
    });

    it('should calculate total revenue correctly', async () => {
      await generateAllInvoicesPDF(mockInvoices);

      const htmlArg = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;

      // Total should be 385 + 500 = 885
      expect(htmlArg).toContain('$885.00');
    });
  });
});
