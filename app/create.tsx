import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { trackAddItem, trackCreateInvoice, trackEditItem, trackRemoveItem } from '../analytics/track';
import { ConfirmModal } from '../components/ConfirmModal';
import { DatePicker } from '../components/DatePicker';
import { ItemRow } from '../components/ItemRow';
import { Modal } from '../components/Modal';
import { parseInvoiceWithAI } from '../services/aiService';
import { generateInvoicePDF } from '../services/pdfService';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { InvoiceItem } from '../types/invoice';

const validateDate = (date: string): boolean => {
  if (!date.trim()) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
};

const validateNumber = (value: number, min: number = 0, max?: number): boolean => {
  if (isNaN(value)) return false;
  if (value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
};

export default function CreateInvoice() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { 
    addInvoice, 
    updateInvoice, 
    deleteInvoice, 
    getInvoice, 
    calculateInvoiceTotals, 
    setFullInvoice,
    generateNextInvoiceNumber,
    isInvoiceNumberUnique,
    invoices,
  } = useInvoiceStore();

  const isEditing = !!params.id;
  const existingInvoice = params.id ? getInvoice(params.id) : null;

  const [clientName, setClientName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<Array<Omit<InvoiceItem, 'id' | 'subtotal'>>>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('info');
  const [isSuccessModal, setIsSuccessModal] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  
  const [isPDFGenerating, setIsPDFGenerating] = useState(false);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);

  useEffect(() => {
    if (!isEditing && !invoiceNumber) {
      const nextNumber = generateNextInvoiceNumber();
      setInvoiceNumber(nextNumber);
    }
  }, [isEditing, invoices.length]);

  useEffect(() => {
    if (existingInvoice) {
      setClientName(existingInvoice.clientName);
      setInvoiceNumber(existingInvoice.invoiceNumber);
      setDate(existingInvoice.date.split('T')[0]);
      setDueDate(existingInvoice.dueDate?.split('T')[0] || '');
      setItems(existingInvoice.items.map(({ id, subtotal, ...rest }) => rest));
      setTaxRate(existingInvoice.taxRate);
      
      let discountValue = existingInvoice.discount;
      if (discountValue > 1 && existingInvoice.subtotal > 0) {
        discountValue = discountValue / existingInvoice.subtotal;
        discountValue = Math.min(discountValue, 1);
      }
      setDiscount(discountValue);
      
      setNotes(existingInvoice.notes || '');
    }
  }, [existingInvoice]);

  const itemsWithSubtotals = items.map((item) => ({
    ...item,
    id: '',
    subtotal: item.quantity * item.price,
  }));

  const totals = calculateInvoiceTotals(
    itemsWithSubtotals,
    taxRate,
    discount
  );

  const clearError = useCallback((field: string) => {
    setTimeout(() => {
      setErrors((prevErrors) => {
        if (prevErrors[field]) {
          const newErrors = { ...prevErrors };
          delete newErrors[field];
          return newErrors;
        }
        return prevErrors;
      });
    }, 0);
  }, []);

  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'clientName':
        if (!value.trim()) return 'Client name is required';
        return null;
      case 'invoiceNumber':
        if (!value.trim()) return 'Invoice number is required';
        if (!isInvoiceNumberUnique(value.trim(), isEditing ? params.id : undefined)) {
          return 'Invoice number already in use';
        }
        return null;
      case 'date':
        if (!validateDate(value)) return 'Invalid date format (YYYY-MM-DD)';
        return null;
      case 'dueDate':
        if (value && !validateDate(value)) return 'Invalid date format (YYYY-MM-DD)';
        return null;
      case 'taxRate':
        if (!validateNumber(value, 0, 1)) return 'Tax rate must be between 0 and 1';
        return null;
      case 'discount':
        if (!validateNumber(value, 0, 1)) return 'Discount must be between 0 and 1 (0% to 100%)';
        return null;
      case 'itemQuantity':
        if (!validateNumber(value, 0.01)) return 'Quantity must be greater than 0';
        return null;
      case 'itemPrice':
        if (!validateNumber(value, 0)) return 'Price cannot be negative';
        return null;
      case 'itemDescription':
        if (!value.trim()) return 'Description is required';
        return null;
      default:
        return null;
    }
  };

  const handleItemUpdate = useCallback((index: number, field: string, value: string | number) => {
    setItems((prevItems) => {
      const newItems = [...prevItems];
      if (!newItems[index]) {
        newItems[index] = { description: '', quantity: 0, price: 0 };
      }
      (newItems[index] as any)[field] = value;
      return newItems;
    });

    trackEditItem({ item_index: index, field });

    setTimeout(() => {
      const errorKey = `item_${index}_${field}`;
      const error = validateField(`item${field.charAt(0).toUpperCase() + field.slice(1)}` as any, value);
      if (error) {
        setErrors((prevErrors) => ({ ...prevErrors, [errorKey]: error }));
      } else {
        setErrors((prevErrors) => {
          if (prevErrors[errorKey]) {
            const newErrors = { ...prevErrors };
            delete newErrors[errorKey];
            return newErrors;
          }
          return prevErrors;
        });
      }
    }, 300);
  }, []);

  const handleAddItem = () => {
    const newIndex = items.length;
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
    trackAddItem({ item_index: newIndex });
  };

  const handleDeleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    trackRemoveItem({ item_index: index });
  };

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info', isSuccess: boolean = false) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setIsSuccessModal(isSuccess);
    setModalVisible(true);
  };

  const handleSave = () => {
    const validationErrors: Record<string, string> = {};

    const nameError = validateField('clientName', clientName);
    if (nameError) validationErrors.clientName = nameError;

    const invoiceNumberError = validateField('invoiceNumber', invoiceNumber);
    if (invoiceNumberError) validationErrors.invoiceNumber = invoiceNumberError;

    const dateError = validateField('date', date);
    if (dateError) validationErrors.date = dateError;

    const dueDateError = validateField('dueDate', dueDate);
    if (dueDateError) validationErrors.dueDate = dueDateError;

    const taxRateError = validateField('taxRate', taxRate);
    if (taxRateError) validationErrors.taxRate = taxRateError;

    const discountError = validateField('discount', discount);
    if (discountError) validationErrors.discount = discountError;

    if (items.length === 0) {
      showModal('Error', 'Add at least one item', 'error');
      return;
    }

    items.forEach((item, index) => {
      const descError = validateField('itemDescription', item.description);
      if (descError) validationErrors[`item_${index}_description`] = descError;

      const qtyError = validateField('itemQuantity', item.quantity);
      if (qtyError) validationErrors[`item_${index}_quantity`] = qtyError;

      const priceError = validateField('itemPrice', item.price);
      if (priceError) validationErrors[`item_${index}_price`] = priceError;
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      showModal('Validation Error', firstError, 'error');
      return;
    }

    const input = {
      clientName: clientName.trim(),
      invoiceNumber: invoiceNumber.trim(),
      date,
      dueDate: dueDate || undefined,
      items,
      taxRate,
      discount,
      notes: (notes || '').trim() || undefined,
    };

    if (isEditing && params.id) {
      updateInvoice(params.id, input);
      showModal('Success', 'Invoice updated', 'success', true);
    } else {
      addInvoice(input);
      trackCreateInvoice({
        client_name: input.clientName,
        items_count: input.items.length,
        total: totals.total,
      });
      showModal('Success', 'Invoice created', 'success', true);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    if (isSuccessModal) {
      router.back();
    }
  };

  const handleDelete = () => {
    if (params.id) {
      deleteInvoice(params.id);
      showModal('Success', 'Invoice deleted', 'success', true);
      setDeleteConfirmVisible(false);
    }
  };

  const handleAIFill = async () => {
    if (!aiPrompt.trim()) {
      showModal('Error', 'Enter invoice description for AI fill', 'error');
      return;
    }

    setIsAILoading(true);
    try {
      const parsedData = await parseInvoiceWithAI(aiPrompt);
      
      if (!parsedData) {
        throw new Error('Failed to get data from AI');
      }

      const formData = setFullInvoice(parsedData);
      
      if (formData.clientName) setClientName(formData.clientName);
      if (formData.items && formData.items.length > 0) setItems(formData.items);
      if (formData.notes !== undefined) setNotes(formData.notes || '');
      
      setAiPrompt('');
      
      showModal('Success', 'Form filled with AI', 'success');
    } catch (error) {
      console.error('Ошибка AI заполнения:', error);
      showModal(
        'Error',
        error instanceof Error 
          ? error.message 
          : 'Failed to fill form with AI. Check your internet connection and try again.',
        'error'
      );
    } finally {
      setIsAILoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (isEditing && params.id) {
      const invoice = getInvoice(params.id);
      if (invoice) {
        setIsPDFGenerating(true);
        try {
          await generateInvoicePDF(invoice);
        } catch (error) {
          showModal(
            'Error',
            error instanceof Error ? error.message : 'Failed to generate PDF',
            'error'
          );
        } finally {
          setIsPDFGenerating(false);
        }
      } else {
        showModal('Error', 'Invoice not found', 'error');
      }
    } else {
      if (!clientName.trim() || items.length === 0) {
        showModal('Error', 'Fill required fields and add items before generating PDF', 'error');
        return;
      }

      const tempInvoice = {
        id: 'temp',
        clientName,
        invoiceNumber: invoiceNumber || 'TEMP-' + Date.now(),
        date,
        dueDate: dueDate || undefined,
        items: items.map((item) => ({
          id: 'temp-item',
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.quantity * item.price,
        })),
        subtotal: totals.subtotal,
        taxRate,
        taxAmount: totals.taxAmount,
        discount,
        total: totals.total,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setIsPDFGenerating(true);
      try {
        await generateInvoicePDF(tempInvoice as any);
      } catch (error) {
        showModal(
          'Error',
          error instanceof Error ? error.message : 'Failed to generate PDF',
          'error'
        );
      } finally {
        setIsPDFGenerating(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit' : 'New Invoice'}</Text>
        <View style={styles.headerRight}>
          {isEditing && (
            <TouchableOpacity
              onPress={() => setDeleteConfirmVisible(true)}
              style={styles.deleteHeaderButton}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSave} style={styles.saveButton} activeOpacity={0.7}>
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="sparkles" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.sectionTitle}>AI Fill</Text>
          </View>
          <TextInput
            key="aiPrompt"
            style={[styles.input, styles.textArea]}
            placeholder="Describe the invoice in words, e.g.: 'Invoice for Company Vector, 2 designs for $5000'"
            placeholderTextColor="#6B6B7B"
            value={aiPrompt}
            onChangeText={setAiPrompt}
            multiline
            numberOfLines={3}
            autoCapitalize="sentences"
            autoCorrect={false}
            spellCheck={false}
            textContentType="none"
            editable={!isAILoading}
          />
          <TouchableOpacity
            style={[styles.aiButton, isAILoading && styles.buttonDisabled]}
            onPress={handleAIFill}
            disabled={isAILoading}
            activeOpacity={0.8}
          >
            {isAILoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#FFF" />
                <Text style={styles.aiButtonText}>Fill with AI</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Ionicons name="person" size={18} color="#6366F1" />
            </View>
            <Text style={styles.sectionTitle}>Client</Text>
          </View>
          <TextInput
            key="clientName"
            style={[styles.input, errors.clientName && styles.inputError]}
            placeholder="Client name *"
            placeholderTextColor="#6B6B7B"
            value={clientName}
            onChangeText={setClientName}
            onFocus={() => clearError('clientName')}
            autoCapitalize="words"
            autoCorrect={false}
            spellCheck={false}
            textContentType="none"
            returnKeyType="next"
          />
          {errors.clientName && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{errors.clientName}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="document-text" size={18} color="#10B981" />
            </View>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
          </View>
          
          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Invoice Number *</Text>
              <TextInput
                style={[styles.input, errors.invoiceNumber && styles.inputError]}
                placeholder="INV-001"
                placeholderTextColor="#6B6B7B"
                value={invoiceNumber}
                onChangeText={(text) => {
                  setInvoiceNumber(text);
                  clearError('invoiceNumber');
                }}
                onBlur={() => {
                  if (invoiceNumber.trim() && !isInvoiceNumberUnique(invoiceNumber.trim(), isEditing ? params.id : undefined)) {
                    setErrors((prev) => ({ ...prev, invoiceNumber: 'Invoice number already in use' }));
                  }
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                textContentType="none"
              />
              {errors.invoiceNumber && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{errors.invoiceNumber}</Text>
                </View>
              )}
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Date *</Text>
              <TextInput
                style={[styles.input, errors.date && styles.inputError]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#6B6B7B"
                value={date}
                onChangeText={setDate}
                onFocus={() => clearError('date')}
                autoCorrect={false}
                spellCheck={false}
                textContentType="none"
              />
            </View>
          </View>
          
          <DatePicker
            label="Due Date"
            value={dueDate}
            onChange={(newDate) => {
              setDueDate(newDate);
              clearError('dueDate');
            }}
            placeholder="Select due date (optional)"
            error={errors.dueDate}
            minimumDate={date ? new Date(date) : new Date()}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <Ionicons name="layers" size={18} color="#EC4899" />
            </View>
            <Text style={styles.sectionTitle}>Items</Text>
            <TouchableOpacity onPress={handleAddItem} style={styles.addButton} activeOpacity={0.7}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <ItemRow
              key={index}
              item={item}
              index={index}
              onUpdate={handleItemUpdate}
              onDelete={handleDeleteItem}
              errors={{
                description: errors[`item_${index}_description`],
                quantity: errors[`item_${index}_quantity`],
                price: errors[`item_${index}_price`],
              }}
            />
          ))}

          {items.length === 0 && (
            <View style={styles.emptyItems}>
              <Ionicons name="cube-outline" size={40} color="#4A4A5E" />
              <Text style={styles.emptyItemsText}>No Items</Text>
              <Text style={styles.emptyItemsSubtext}>Add your first item</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Ionicons name="calculator" size={18} color="#8B5CF6" />
            </View>
            <Text style={styles.sectionTitle}>Finance</Text>
          </View>
          
          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabelContainer}>
              <Text style={styles.sliderLabel}>Tax</Text>
              <View style={styles.sliderValueBadge}>
                <Text style={styles.sliderValue}>{(taxRate * 100).toFixed(0)}%</Text>
              </View>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={taxRate}
              onValueChange={(value) => {
                setTaxRate(value);
                clearError('taxRate');
              }}
              minimumTrackTintColor="#6366F1"
              maximumTrackTintColor="rgba(255, 255, 255, 0.1)"
              thumbTintColor="#6366F1"
            />
          </View>

          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabelContainer}>
              <Text style={styles.sliderLabel}>Discount</Text>
              <View style={[styles.sliderValueBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Text style={[styles.sliderValue, { color: '#10B981' }]}>{(discount * 100).toFixed(0)}%</Text>
              </View>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={discount}
              onValueChange={(value) => {
                setDiscount(value);
                clearError('discount');
              }}
              minimumTrackTintColor="#10B981"
              maximumTrackTintColor="rgba(255, 255, 255, 0.1)"
              thumbTintColor="#10B981"
            />
          </View>
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>${totals.subtotal.toFixed(2)}</Text>
          </View>
          {taxRate > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({(taxRate * 100).toFixed(0)}%)</Text>
              <Text style={styles.totalValue}>+${totals.taxAmount.toFixed(2)}</Text>
            </View>
          )}
          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount ({(discount * 100).toFixed(0)}%)</Text>
              <Text style={[styles.totalValue, styles.discountValue]}>-${(totals.subtotal * discount).toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.finalTotalContainer}>
            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>TOTAL</Text>
              <Text style={styles.finalTotalValue}>${totals.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#FBBF24" />
            </View>
            <Text style={styles.sectionTitle}>Notes</Text>
          </View>
          <TextInput
            key="notes"
            style={[styles.input, styles.textArea]}
            placeholder="Additional information..."
            placeholderTextColor="#6B6B7B"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            autoCapitalize="sentences"
            autoCorrect={false}
            spellCheck={false}
            textContentType="none"
          />
        </View>

        {items.length > 0 && clientName.trim() && (
          <TouchableOpacity
            style={[styles.generatePDFButton, isPDFGenerating && styles.buttonDisabled]}
            onPress={handleGeneratePDF}
            disabled={isPDFGenerating}
            activeOpacity={0.8}
          >
            {isPDFGenerating ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="share-outline" size={22} color="#FFF" />
                <Text style={styles.generatePDFButtonText}>Share PDF</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={handleModalClose}
        type={modalType}
      />

      <ConfirmModal
        visible={deleteConfirmVisible}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="#EF4444"
        icon="trash"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#0D0D1A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#1A1A2E',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B8B9E',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyItems: {
    alignItems: 'center',
    padding: 32,
  },
  emptyItemsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptyItemsSubtext: {
    fontSize: 14,
    color: '#8B8B9E',
    marginTop: 4,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  sliderValueBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sliderValue: {
    fontSize: 15,
    color: '#6366F1',
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  totalsSection: {
    backgroundColor: '#1A1A2E',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 15,
    color: '#8B8B9E',
  },
  totalValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  discountValue: {
    color: '#10B981',
  },
  finalTotalContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  finalTotalValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#10B981',
  },
  generatePDFButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  generatePDFButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  aiButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});
