import React, { useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InvoiceItemForm {
  description: string;
  quantity: number;
  price: number;
}

interface ItemRowProps {
  item?: InvoiceItemForm;
  index: number;
  onUpdate: (index: number, field: string, value: string | number) => void;
  onDelete: (index: number) => void;
  errors?: {
    description?: string;
    quantity?: string;
    price?: string;
  };
}

export const ItemRow: React.FC<ItemRowProps> = React.memo(({ item, index, onUpdate, onDelete, errors }) => {
  const hasErrors = errors?.description || errors?.quantity || errors?.price;
  const subtotal = (item?.quantity || 0) * (item?.price || 0);

  const handleDescriptionChange = useCallback((text: string) => {
    onUpdate(index, 'description', text);
  }, [index, onUpdate]);

  const handleQuantityChange = useCallback((text: string) => {
    const num = parseFloat(text) || 0;
    onUpdate(index, 'quantity', num);
  }, [index, onUpdate]);

  const handlePriceChange = useCallback((text: string) => {
    const num = parseFloat(text) || 0;
    onUpdate(index, 'price', num);
  }, [index, onUpdate]);

  const handleDelete = useCallback(() => {
    onDelete(index);
  }, [index, onDelete]);

  return (
    <View style={styles.container}>
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>#{index + 1}</Text>
      </View>
      
      <View style={styles.mainContent}>
        <View style={styles.descriptionRow}>
          <TextInput
            key={`item-${index}-description`}
            style={[styles.input, styles.descriptionInput, errors?.description && styles.inputError]}
            placeholder="Item or service description"
            placeholderTextColor="#6B6B7B"
            value={item?.description || ''}
            onChangeText={handleDescriptionChange}
            multiline
            autoCapitalize="sentences"
            autoCorrect={false}
            spellCheck={false}
            textContentType="none"
          />
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.numbersRow}>
          <View style={styles.numberField}>
            <Text style={styles.fieldLabel}>Qty</Text>
            <TextInput
              style={[styles.input, styles.numberInput, errors?.quantity && styles.inputError]}
              placeholder="0"
              placeholderTextColor="#6B6B7B"
              value={item?.quantity?.toString() || ''}
              onChangeText={handleQuantityChange}
              keyboardType="decimal-pad"
              autoCorrect={false}
              spellCheck={false}
            />
          </View>
          
          <View style={styles.numberField}>
            <Text style={styles.fieldLabel}>Price</Text>
            <TextInput
              style={[styles.input, styles.numberInput, errors?.price && styles.inputError]}
              placeholder="0.00"
              placeholderTextColor="#6B6B7B"
              value={item?.price?.toString() || ''}
              onChangeText={handlePriceChange}
              keyboardType="decimal-pad"
              autoCorrect={false}
              spellCheck={false}
            />
          </View>
          
          <View style={styles.subtotalField}>
            <Text style={styles.fieldLabel}>Subtotal</Text>
            <View style={styles.subtotalContainer}>
              <Text style={[styles.subtotalText, subtotal > 0 && styles.subtotalActive]}>
                ${subtotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      {hasErrors && (
        <View style={styles.errorsContainer}>
          {errors?.description && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={12} color="#EF4444" />
              <Text style={styles.errorText}>{errors.description}</Text>
            </View>
          )}
          {errors?.quantity && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={12} color="#EF4444" />
              <Text style={styles.errorText}>{errors.quantity}</Text>
            </View>
          )}
          {errors?.price && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={12} color="#EF4444" />
              <Text style={styles.errorText}>{errors.price}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  indexBadge: {
    position: 'absolute',
    top: -8,
    left: 12,
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 1,
  },
  indexText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mainContent: {
    marginTop: 8,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  descriptionInput: {
    flex: 1,
    minHeight: 44,
  },
  deleteButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  numbersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  numberField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B8B9E',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  numberInput: {
    textAlign: 'center',
  },
  subtotalField: {
    flex: 1,
  },
  subtotalContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  subtotalText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B6B7B',
  },
  subtotalActive: {
    color: '#10B981',
  },
  errorsContainer: {
    marginTop: 8,
    gap: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
  },
});
