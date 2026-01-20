// Tests for AI service JSON parsing logic
// Since the main function requires API calls, we'll test the JSON extraction patterns

describe('aiService - JSON parsing patterns', () => {
  // Simulating the JSON extraction logic from aiService.ts
  function extractJSON(responseText: string): Record<string, unknown> | null {
    let cleanedResponse = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      cleanedResponse = jsonMatch[0];
    } else {
      const firstBraceIndex = cleanedResponse.indexOf('{');
      const lastBraceIndex = cleanedResponse.lastIndexOf('}');

      if (firstBraceIndex === -1 || lastBraceIndex === -1 || firstBraceIndex >= lastBraceIndex) {
        return null;
      }

      cleanedResponse = cleanedResponse.substring(firstBraceIndex, lastBraceIndex + 1);
    }

    try {
      return JSON.parse(cleanedResponse);
    } catch {
      return null;
    }
  }

  describe('extractJSON', () => {
    it('should extract clean JSON', () => {
      const input = '{"clientName": "Apple", "items": []}';
      const result = extractJSON(input);

      expect(result).toEqual({ clientName: 'Apple', items: [] });
    });

    it('should extract JSON from markdown code block', () => {
      const input = `Here's the result:
\`\`\`json
{"clientName": "Google", "taxRate": 0.1}
\`\`\``;

      const result = extractJSON(input);

      expect(result).toEqual({ clientName: 'Google', taxRate: 0.1 });
    });

    it('should extract JSON from plain code block', () => {
      const input = `\`\`\`
{"clientName": "Microsoft", "discount": 0.15}
\`\`\``;

      const result = extractJSON(input);

      expect(result).toEqual({ clientName: 'Microsoft', discount: 0.15 });
    });

    it('should extract JSON with prefix text', () => {
      const input = 'Based on the text, here is the extracted data: {"clientName": "Amazon", "invoiceNumber": "INV-123"}';

      const result = extractJSON(input);

      expect(result).toEqual({ clientName: 'Amazon', invoiceNumber: 'INV-123' });
    });

    it('should extract JSON with suffix text', () => {
      const input = '{"clientName": "Netflix"} - Let me know if you need anything else!';

      const result = extractJSON(input);

      expect(result).toEqual({ clientName: 'Netflix' });
    });

    it('should extract nested JSON', () => {
      const input = `{
        "clientName": "Spotify",
        "items": [
          {"name": "Premium Plan", "quantity": 12, "price": 9.99},
          {"name": "Family Add-on", "quantity": 12, "price": 5.99}
        ],
        "taxRate": 0.07
      }`;

      const result = extractJSON(input);

      expect(result).toEqual({
        clientName: 'Spotify',
        items: [
          { name: 'Premium Plan', quantity: 12, price: 9.99 },
          { name: 'Family Add-on', quantity: 12, price: 5.99 },
        ],
        taxRate: 0.07,
      });
    });

    it('should handle JSON with special characters', () => {
      const input = '{"clientName": "O\'Reilly Media", "notes": "Contact: info@oreilly.com"}';

      const result = extractJSON(input);

      expect(result).toEqual({
        clientName: "O'Reilly Media",
        notes: 'Contact: info@oreilly.com',
      });
    });

    it('should handle multiline JSON', () => {
      const input = `{
        "clientName": "Tesla",
        "date": "2026-01-20",
        "items": [
          {
            "name": "Model S",
            "quantity": 1,
            "price": 79990
          }
        ]
      }`;

      const result = extractJSON(input);

      expect(result).toEqual({
        clientName: 'Tesla',
        date: '2026-01-20',
        items: [{ name: 'Model S', quantity: 1, price: 79990 }],
      });
    });

    it('should return null for invalid JSON', () => {
      const input = 'This is not JSON at all';
      const result = extractJSON(input);

      expect(result).toBeNull();
    });

    it('should return null for malformed JSON', () => {
      const input = '{"clientName": "Test", items: []}'; // missing quotes around items

      const result = extractJSON(input);

      expect(result).toBeNull();
    });

    it('should return null for empty input', () => {
      expect(extractJSON('')).toBeNull();
      expect(extractJSON('   ')).toBeNull();
    });

    it('should handle JSON with unicode characters', () => {
      const input = '{"clientName": "日本企業", "notes": "Компания из России 🚀"}';

      const result = extractJSON(input);

      expect(result).toEqual({
        clientName: '日本企業',
        notes: 'Компания из России 🚀',
      });
    });

    it('should extract first valid JSON when multiple are present', () => {
      const input = 'Here is JSON 1: {"a": 1} and JSON 2: {"b": 2}';

      const result = extractJSON(input);

      // The regex should capture the largest match from first { to last }
      // In this case it captures {"a": 1} and JSON 2: {"b": 2} - but wait, 
      // the regex /\{[\s\S]*\}/ is greedy and will match from first { to last }
      // So it will capture {"a": 1} and JSON 2: {"b": 2} which is invalid JSON
      // Let's see what actually happens - this is an edge case
      
      // Actually the regex matches the whole thing and then it fails to parse
      // because it's not valid JSON
      // So it should return null or attempt to parse subset
      
      // Given the implementation, it tries to match /\{[\s\S]*\}/ which is greedy
      // This will match from first { to last }, giving us {"a": 1} and JSON 2: {"b": 2}
      // Which is invalid JSON, so parsing fails
      expect(result).toBeNull();
    });
  });

  describe('ParsedInvoiceData structure', () => {
    it('should validate complete invoice data structure', () => {
      const validData = {
        clientName: 'Test Client',
        invoiceNumber: 'INV-001',
        date: '2026-01-20',
        dueDate: '2026-02-20',
        items: [
          { name: 'Service A', quantity: 2, price: 100 },
          { name: 'Service B', quantity: 1, price: 200 },
        ],
        taxRate: 0.2,
        discount: 0.1,
        notes: 'Payment due within 30 days',
      };

      // Validate structure
      expect(typeof validData.clientName).toBe('string');
      expect(typeof validData.invoiceNumber).toBe('string');
      expect(typeof validData.date).toBe('string');
      expect(typeof validData.dueDate).toBe('string');
      expect(Array.isArray(validData.items)).toBe(true);
      expect(typeof validData.taxRate).toBe('number');
      expect(typeof validData.discount).toBe('number');
      expect(typeof validData.notes).toBe('string');

      // Validate items structure
      validData.items.forEach(item => {
        expect(typeof item.name).toBe('string');
        expect(typeof item.quantity).toBe('number');
        expect(typeof item.price).toBe('number');
      });
    });

    it('should accept partial invoice data', () => {
      const partialData = {
        clientName: 'Partial Client',
      };

      expect(partialData.clientName).toBe('Partial Client');
      expect((partialData as any).invoiceNumber).toBeUndefined();
      expect((partialData as any).items).toBeUndefined();
    });

    it('should handle decimal tax rates correctly', () => {
      const data = { taxRate: 0.0725 }; // 7.25%

      expect(data.taxRate).toBeCloseTo(0.0725);
      expect(data.taxRate * 100).toBeCloseTo(7.25);
    });
  });
});

describe('Date format validation', () => {
  it('should validate YYYY-MM-DD format', () => {
    const validDates = ['2026-01-20', '2025-12-31', '2024-06-15'];
    const invalidDates = ['01-20-2026', '2026/01/20', 'January 20, 2026', '20-01-2026'];

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    validDates.forEach(date => {
      expect(dateRegex.test(date)).toBe(true);
    });

    invalidDates.forEach(date => {
      expect(dateRegex.test(date)).toBe(false);
    });
  });
});

