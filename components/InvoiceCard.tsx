import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Invoice } from '../types/invoice';

interface InvoiceCardProps {
  invoice: Invoice;
  onPress: () => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.accentLine} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={12} color="#8B8B9E" />
              <Text style={styles.date}>{formatDate(invoice.date)}</Text>
            </View>
          </View>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.total}>${invoice.total.toFixed(2)}</Text>
          </View>
        </View>
        
        <View style={styles.clientRow}>
          <View style={styles.clientIcon}>
            <Ionicons name="person-outline" size={16} color="#6366F1" />
          </View>
          <Text style={styles.clientName}>{invoice.clientName}</Text>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.itemsBadge}>
            <Ionicons name="layers-outline" size={14} color="#10B981" />
            <Text style={styles.itemCount}>{invoice.items.length} items</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#4A4A5E" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A2E',
    marginVertical: 6,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  accentLine: {
    height: 3,
    backgroundColor: '#6366F1',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 13,
    color: '#8B8B9E',
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    color: '#8B8B9E',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  total: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10B981',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  clientIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientName: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  itemCount: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
});
