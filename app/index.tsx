import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { InvoiceCard } from '../components/InvoiceCard';
import { generateAllInvoicesPDF } from '../services/pdfService';
import { useInvoiceStore } from '../store/useInvoiceStore';
import { Invoice } from '../types/invoice';

export default function Index() {
  const router = useRouter();
  const { invoices, isLoading, loadInvoices } = useInvoiceStore();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleCreateInvoice = () => {
    router.push('/create');
  };

  const handleInvoicePress = (invoice: Invoice) => {
    router.push({
      pathname: '/create',
      params: { id: invoice.id },
    });
  };

  const handleExportAllPDF = async () => {
    if (invoices.length === 0) {
      Alert.alert('Error', 'No invoices to export');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      await generateAllInvoicesPDF(invoices);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to generate PDF of all invoices'
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading invoices...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome</Text>
            <Text style={styles.title}>PromptInvoice</Text>
          </View>
          <View style={styles.headerButtons}>
            {invoices.length > 0 && (
              <TouchableOpacity
                style={[styles.exportButton, isGeneratingPDF && styles.buttonDisabled]}
                onPress={handleExportAllPDF}
                disabled={isGeneratingPDF}
                activeOpacity={0.8}
              >
                {isGeneratingPDF ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="download-outline" size={22} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.createButton} onPress={handleCreateInvoice} activeOpacity={0.8}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        {invoices.length > 0 && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name="document-text-outline" size={20} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.statValue}>{invoices.length}</Text>
                <Text style={styles.statLabel}>Invoices</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="wallet-outline" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: '#10B981' }]}>${totalRevenue.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {invoices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="document-text-outline" size={64} color="#4A4A5E" />
          </View>
          <Text style={styles.emptyText}>No Invoices</Text>
          <Text style={styles.emptySubtext}>
            Create your first invoice and start tracking payments
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleCreateInvoice} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Create Invoice</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <InvoiceCard invoice={item} onPress={() => handleInvoicePress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D1A',
  },
  loaderContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B8B9E',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#0D0D1A',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#8B8B9E',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  exportButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 13,
    color: '#8B8B9E',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8B8B9E',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
