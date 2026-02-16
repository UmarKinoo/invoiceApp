import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  billTo: {},
  label: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  clientCompany: {
    color: '#6b7280',
    fontSize: 10,
  },
  status: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    fontSize: 9,
    fontWeight: 'bold',
  },
  table: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderItem: {
    flex: 1,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
  },
  tableHeaderAmount: {
    width: 80,
    textAlign: 'right',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableCell: {
    flex: 1,
  },
  tableCellDesc: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableCellMeta: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  tableCellAmount: {
    width: 80,
    textAlign: 'right',
    fontSize: 10,
    fontWeight: 'bold',
  },
  totals: {
    marginTop: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    fontSize: 10,
    color: '#6b7280',
  },
  totalRowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notes: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  notesLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 10,
    color: '#4b5563',
    lineHeight: 1.4,
  },
})

type InvoicePdfDocumentProps = {
  invoice: {
    invoiceNumber: string | null
    date: string | null
    dueDate?: string | null
    status: string | null
    total: number
    subtotal?: number
    tax?: number
    notes?: string | null
    items: { description?: string; quantity?: number; rate?: number }[]
  }
  client: {
    name?: string | null
    company?: string | null
    email?: string | null
  } | null
}

export function InvoicePdfDocument({ invoice, client }: InvoicePdfDocumentProps) {
  const items = invoice.items ?? []
  const subtotal =
    invoice.subtotal ??
    items.reduce((acc, i) => acc + (i.quantity ?? 0) * (i.rate ?? 0), 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.billTo}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.clientName}>{client?.name ?? '—'}</Text>
            <Text style={styles.clientCompany}>{client?.company ?? '—'}</Text>
          </View>
          <View>
            <Text style={styles.status}>Status</Text>
            <Text style={styles.statusBadge}>{invoice.status ?? 'draft'}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderItem}>Item</Text>
            <Text style={styles.tableHeaderAmount}>Amount</Text>
          </View>
          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellDesc}>{item.description ?? '—'}</Text>
                <Text style={styles.tableCellMeta}>
                  {item.quantity} × ${Number(item.rate ?? 0).toFixed(2)}
                </Text>
              </View>
              <Text style={styles.tableCellAmount}>
                ${((item.quantity ?? 0) * (item.rate ?? 0)).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRowMain}>
            <Text>TOTAL</Text>
            <Text>${Number(invoice.total).toFixed(2)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
