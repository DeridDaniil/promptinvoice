import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { trackExportPdf, trackShareInvoice } from '../analytics/track';
import { Invoice } from '../types/invoice';

const generateInvoiceHTML = (invoice: Invoice): string => {
  const invoiceDate = new Date(invoice.date).toLocaleDateString('en-US');
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US') : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: #333;
      line-height: 1.6;
      padding: 40px;
      background: #fff;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #27AE60;
    }
    .company-info {
      flex: 1;
    }
    .company-info h1 {
      font-size: 28px;
      color: #000;
      margin-bottom: 10px;
      font-weight: 700;
    }
    .company-info p {
      color: #666;
      font-size: 14px;
      margin: 5px 0;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-info h2 {
      font-size: 24px;
      color: #000;
      margin-bottom: 15px;
      font-weight: 700;
    }
    .invoice-info p {
      color: #666;
      font-size: 14px;
      margin: 5px 0;
    }
    .invoice-info .invoice-number {
      font-size: 18px;
      color: #27AE60;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .client-section {
      margin-bottom: 30px;
    }
    .client-section h3 {
      font-size: 14px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .client-section p {
      color: #333;
      font-size: 16px;
      margin: 5px 0;
      font-weight: 500;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }
    .items-table thead {
      background: #F4F6F8;
      border-bottom: 2px solid #DDD;
    }
    .items-table th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #333;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table td {
      padding: 15px;
      border-bottom: 1px solid #EEE;
      color: #333;
      font-size: 14px;
    }
    .items-table tbody tr:hover {
      background: #FAFAFA;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .totals-section {
      margin-top: 30px;
      margin-left: auto;
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #EEE;
    }
    .totals-row .label {
      color: #666;
      font-size: 14px;
    }
    .totals-row .value {
      color: #333;
      font-size: 14px;
      font-weight: 600;
    }
    .totals-row.final {
      border-top: 3px solid #27AE60;
      border-bottom: none;
      margin-top: 10px;
      padding-top: 15px;
    }
    .totals-row.final .label {
      font-size: 18px;
      font-weight: 700;
      color: #000;
    }
    .totals-row.final .value {
      font-size: 20px;
      font-weight: 700;
      color: #27AE60;
    }
    .notes-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #EEE;
    }
    .notes-section h3 {
      font-size: 14px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .notes-section p {
      color: #666;
      font-size: 14px;
      line-height: 1.8;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #EEE;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-info">
        <h1>PromptInvoice</h1>
        <p>Invoice</p>
      </div>
      <div class="invoice-info">
        <div class="invoice-number">${invoice.invoiceNumber}</div>
        <p><strong>Date:</strong> ${invoiceDate}</p>
        ${dueDate ? `<p><strong>Due Date:</strong> ${dueDate}</p>` : ''}
      </div>
    </div>

    <div class="client-section">
      <h3>Client</h3>
      <p><strong>${invoice.clientName}</strong></p>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-center">Qty</th>
          <th class="text-right">Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items
          .map(
            (item) => `
          <tr>
            <td>${item.description}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-right">$${item.price.toFixed(2)}</td>
            <td class="text-right">$${item.subtotal.toFixed(2)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div class="totals-section">
      <div class="totals-row">
        <span class="label">Subtotal:</span>
        <span class="value">$${invoice.subtotal.toFixed(2)}</span>
      </div>
      ${invoice.taxRate > 0
        ? `
      <div class="totals-row">
        <span class="label">Tax (${(invoice.taxRate * 100).toFixed(0)}%):</span>
        <span class="value">$${invoice.taxAmount.toFixed(2)}</span>
      </div>
      `
        : ''}
      ${invoice.discount > 0
        ? `
      <div class="totals-row">
        <span class="label">Discount (${(invoice.discount * 100).toFixed(0)}%):</span>
        <span class="value">-$${(invoice.subtotal * invoice.discount).toFixed(2)}</span>
      </div>
      `
        : ''}
      <div class="totals-row final">
        <span class="label">TOTAL:</span>
        <span class="value">$${invoice.total.toFixed(2)}</span>
      </div>
    </div>

    ${invoice.notes
      ? `
    <div class="notes-section">
      <h3>Notes</h3>
      <p>${invoice.notes.replace(/\n/g, '<br>')}</p>
    </div>
    `
      : ''}

    <div class="footer">
      <p>Generated by PromptInvoice</p>
      <p>Created: ${new Date(invoice.createdAt).toLocaleDateString('en-US')}</p>
    </div>
  </div>
</body>
</html>
  `;
};

const generateAllInvoicesHTML = (invoices: Invoice[]): string => {
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const currentDate = new Date().toLocaleDateString('en-US');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: #333;
      line-height: 1.6;
      padding: 40px;
      background: #fff;
    }
    .report-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
    }
    .report-header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #27AE60;
    }
    .report-header h1 {
      font-size: 32px;
      color: #000;
      margin-bottom: 10px;
      font-weight: 700;
    }
    .report-header p {
      color: #666;
      font-size: 14px;
    }
    .summary-section {
      background: #F4F6F8;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 40px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .summary-label {
      font-weight: 600;
      color: #333;
    }
    .summary-value {
      font-weight: 700;
      color: #27AE60;
      font-size: 18px;
    }
    .invoice-separator {
      page-break-before: always;
      margin-top: 60px;
      margin-bottom: 40px;
      border-top: 2px dashed #DDD;
      padding-top: 40px;
    }
    .invoice-separator:first-of-type {
      page-break-before: auto;
      margin-top: 0;
      border-top: none;
      padding-top: 0;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #27AE60;
    }
    .company-info {
      flex: 1;
    }
    .company-info h1 {
      font-size: 28px;
      color: #000;
      margin-bottom: 10px;
      font-weight: 700;
    }
    .company-info p {
      color: #666;
      font-size: 14px;
      margin: 5px 0;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-info h2 {
      font-size: 24px;
      color: #000;
      margin-bottom: 15px;
      font-weight: 700;
    }
    .invoice-info p {
      color: #666;
      font-size: 14px;
      margin: 5px 0;
    }
    .invoice-info .invoice-number {
      font-size: 18px;
      color: #27AE60;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .client-section {
      margin-bottom: 30px;
    }
    .client-section h3 {
      font-size: 14px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .client-section p {
      color: #333;
      font-size: 16px;
      margin: 5px 0;
      font-weight: 500;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }
    .items-table thead {
      background: #F4F6F8;
      border-bottom: 2px solid #DDD;
    }
    .items-table th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #333;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table td {
      padding: 15px;
      border-bottom: 1px solid #EEE;
      color: #333;
      font-size: 14px;
    }
    .items-table tbody tr:hover {
      background: #FAFAFA;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .totals-section {
      margin-top: 30px;
      margin-left: auto;
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #EEE;
    }
    .totals-row .label {
      color: #666;
      font-size: 14px;
    }
    .totals-row .value {
      color: #333;
      font-size: 14px;
      font-weight: 600;
    }
    .totals-row.final {
      border-top: 3px solid #27AE60;
      border-bottom: none;
      margin-top: 10px;
      padding-top: 15px;
    }
    .totals-row.final .label {
      font-size: 18px;
      font-weight: 700;
      color: #000;
    }
    .totals-row.final .value {
      font-size: 20px;
      font-weight: 700;
      color: #27AE60;
    }
    .notes-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #EEE;
    }
    .notes-section h3 {
      font-size: 14px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .notes-section p {
      color: #666;
      font-size: 14px;
      line-height: 1.8;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #EEE;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1>All Invoices Report</h1>
      <p>Generated: ${currentDate}</p>
    </div>

    <div class="summary-section">
      <div class="summary-row">
        <span class="summary-label">Total Invoices:</span>
        <span class="summary-value">${invoices.length}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Total Amount:</span>
        <span class="summary-value">$${totalRevenue.toFixed(2)}</span>
      </div>
    </div>

    ${invoices.map((invoice, index) => {
      const invoiceDate = new Date(invoice.date).toLocaleDateString('ru-RU');
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('ru-RU') : null;
      
      return `
        <div class="invoice-separator">
          <div class="header">
            <div class="company-info">
              <h1>PromptInvoice</h1>
              <p>Invoice</p>
            </div>
            <div class="invoice-info">
              <div class="invoice-number">${invoice.invoiceNumber}</div>
              <p><strong>Date:</strong> ${invoiceDate}</p>
              ${dueDate ? `<p><strong>Due Date:</strong> ${dueDate}</p>` : ''}
            </div>
          </div>

          <div class="client-section">
            <h3>Client</h3>
            <p><strong>${invoice.clientName}</strong></p>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(
                (item) => `
                <tr>
                  <td>${item.description}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">$${item.price.toFixed(2)}</td>
                  <td class="text-right">$${item.subtotal.toFixed(2)}</td>
                </tr>
              `
              ).join('')}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="totals-row">
              <span class="label">Subtotal:</span>
              <span class="value">$${invoice.subtotal.toFixed(2)}</span>
            </div>
            ${invoice.taxRate > 0
              ? `
            <div class="totals-row">
              <span class="label">Tax (${(invoice.taxRate * 100).toFixed(0)}%):</span>
              <span class="value">$${invoice.taxAmount.toFixed(2)}</span>
            </div>
            `
              : ''}
            ${invoice.discount > 0
              ? `
            <div class="totals-row">
              <span class="label">Discount (${(invoice.discount * 100).toFixed(0)}%):</span>
              <span class="value">-$${(invoice.subtotal * invoice.discount).toFixed(2)}</span>
            </div>
            `
              : ''}
            <div class="totals-row final">
              <span class="label">TOTAL:</span>
              <span class="value">$${invoice.total.toFixed(2)}</span>
            </div>
          </div>

          ${invoice.notes
            ? `
          <div class="notes-section">
            <h3>Notes</h3>
            <p>${invoice.notes.replace(/\n/g, '<br>')}</p>
          </div>
          `
            : ''}
        </div>
      `;
    }).join('')}

    <div class="footer">
      <p>Generated by PromptInvoice</p>
      <p>Report created: ${currentDate}</p>
    </div>
  </div>
</body>
</html>
  `;
};

export const generateInvoicePDF = async (invoice: Invoice): Promise<void> => {
  try {
    if (!invoice) {
      throw new Error('Invoice data is missing');
    }

    const html = generateInvoiceHTML(invoice);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
      width: 595,
      height: 842,
    });

    trackExportPdf({ invoice_id: invoice.id });

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share invoice ${invoice.invoiceNumber}`,
    });

    trackShareInvoice({ invoice_id: invoice.id, invoice_number: invoice.invoiceNumber });
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(
      error instanceof Error
        ? `PDF generation error: ${error.message}`
        : 'Failed to generate PDF. Please try again.'
    );
  }
};

export const generateAllInvoicesPDF = async (invoices: Invoice[]): Promise<void> => {
  try {
    if (!invoices || invoices.length === 0) {
      throw new Error('No invoices to export');
    }

    const html = generateAllInvoicesHTML(invoices);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
      width: 595,
      height: 842,
    });

    trackExportPdf({ invoices_count: invoices.length });

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Export all invoices (${invoices.length})`,
    });

    trackShareInvoice({ invoice_id: 'all', invoice_number: `batch_${invoices.length}` });
  } catch (error) {
    console.error('All invoices PDF generation error:', error);
    throw new Error(
      error instanceof Error
        ? `PDF generation error: ${error.message}`
        : 'Failed to generate PDF. Please try again.'
    );
  }
};

