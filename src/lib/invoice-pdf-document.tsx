import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { formatCurrency, formatDisplayDate } from '@/lib/utils'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#ffffff',
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  logoWrap: {
    width: 120,
  },
  logo: {
    width: 120,
    height: 56,
    objectFit: 'contain',
  },
  taxInvoiceBlock: {
    alignItems: 'flex-end',
  },
  taxInvoiceLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#6b7280',
    marginBottom: 2,
  },
  taxInvoiceNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  metaLine: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#111',
  },
  fromBillToRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginBottom: 16,
  },
  fromBlock: {
    flex: 1,
  },
  billToBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#111',
  },
  clientCompany: {
    color: '#6b7280',
    fontSize: 9,
    marginBottom: 2,
  },
  contentArea: {
    flexGrow: 1,
    minHeight: 80,
  },
  table: {
    marginBottom: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableHeaderItem: {
    flex: 1,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
  },
  tableHeaderQty: { width: 40, textAlign: 'right', fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280' },
  tableHeaderPrice: { width: 70, textAlign: 'right', fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280' },
  tableHeaderAmount: { width: 70, textAlign: 'right', fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableCell: {
    flex: 1,
  },
  tableCellDesc: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111',
  },
  tableCellQty: { width: 40, textAlign: 'right', fontSize: 9, color: '#6b7280' },
  tableCellPrice: { width: 70, textAlign: 'right', fontSize: 9, color: '#6b7280' },
  tableCellAmount: { width: 70, textAlign: 'right', fontSize: 10, fontWeight: 'bold', color: '#111' },
  totals: {
    marginTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
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
    color: '#111',
  },
  notes: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  notesLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.4,
  },
  footerStick: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  paymentDetails: {
    fontSize: 9,
    color: '#6b7280',
  },
  paymentLine: { marginBottom: 2 },
  deliveredBySignatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerDeliveredBy: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
  },
  footerDeliveredByValue: {
    fontSize: 10,
    color: '#111',
    marginTop: 2,
  },
  signatureBlock: {
    alignItems: 'flex-end',
  },
  signatureLine: {
    width: 180,
    height: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
  },
  poweredBy: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  poweredByBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  poweredByIcon: {
    width: 12,
    height: 12,
    objectFit: 'contain',
  },
  poweredByLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#9ca3af',
  },
  poweredByText: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: -0.2,
    color: '#9ca3af',
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
    discount?: number
    shipping?: number
    carNumber?: string | null
    notes?: string | null
    items: { description?: string; quantity?: number; rate?: number }[]
  }
  client: {
    name?: string | null
    company?: string | null
    email?: string | null
  } | null
  business: {
    businessName: string
    businessAddress: string
    businessEmail: string
    businessPhone: string
    businessBrn: string
    vatRegistrationNumber: string
  } | null
  logoUrl?: string | null
  deliveredBy?: string | null
  appBaseUrl?: string
  currency?: string
}

export function InvoicePdfDocument({
  invoice,
  client,
  business,
  logoUrl,
  deliveredBy,
  appBaseUrl,
  currency = 'MUR',
}: InvoicePdfDocumentProps) {
  const swiftbookIconUrl = appBaseUrl
    ? `${appBaseUrl}/swiftbook-icon-black.png`
    : '/swiftbook-icon-black.png'

  const items = invoice.items ?? []
  const subtotal =
    invoice.subtotal ??
    items.reduce((acc, i) => acc + (i.quantity ?? 0) * (i.rate ?? 0), 0)
  const tax = invoice.tax ?? 0
  const discount = invoice.discount ?? 0
  const shipping = invoice.shipping ?? 0

  const carDisplay = invoice.carNumber?.trim() || '—'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Row 1: Logo (left) | Tax invoice + number + Date/Due/Car + status (right) */}
        <View style={styles.headerRow}>
          <View style={styles.logoWrap}>
            {logoUrl ? (
              <Image src={logoUrl} style={styles.logo} />
            ) : null}
          </View>
          <View style={styles.taxInvoiceBlock}>
            <Text style={styles.taxInvoiceLabel}>Tax invoice</Text>
            <Text style={styles.taxInvoiceNumber}>#{invoice.invoiceNumber ?? '—'}</Text>
            <Text style={styles.metaLine}>Date {formatDisplayDate(invoice.date) || '—'}</Text>
            <Text style={styles.metaLine}>Due {formatDisplayDate(invoice.dueDate) || '—'}</Text>
            <Text style={styles.metaLine}>Car {carDisplay}</Text>
            <Text style={styles.statusBadge}>{invoice.status ?? 'draft'}</Text>
          </View>
        </View>

        {/* Row 2: From | Bill to */}
        <View style={styles.fromBillToRow}>
          <View style={styles.fromBlock}>
            <Text style={styles.label}>From</Text>
            {business ? (
              <>
                <Text style={styles.clientName}>{business.businessName}</Text>
                {business.businessAddress ? (
                  <Text style={styles.clientCompany}>{business.businessAddress}</Text>
                ) : null}
                {business.businessEmail ? (
                  <Text style={styles.clientCompany}>{business.businessEmail}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.clientCompany}>—</Text>
            )}
          </View>
          <View style={styles.billToBlock}>
            <Text style={styles.label}>Bill to</Text>
            <Text style={styles.clientName}>{client?.name ?? '—'}</Text>
            <Text style={styles.clientCompany}>{client?.company ?? '—'}</Text>
            {client?.email ? <Text style={styles.clientCompany}>{client.email}</Text> : null}
          </View>
        </View>

        {/* Content: table only — grows so totals + footer sit at bottom */}
        <View style={styles.contentArea}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderItem}>Description</Text>
              <Text style={styles.tableHeaderQty}>Qty</Text>
              <Text style={styles.tableHeaderPrice}>Price</Text>
              <Text style={styles.tableHeaderAmount}>Amount</Text>
            </View>
            {items.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <View style={styles.tableCell}>
                  <Text style={styles.tableCellDesc}>{item.description ?? '—'}</Text>
                </View>
                <Text style={styles.tableCellQty}>{item.quantity ?? 0}</Text>
                <Text style={styles.tableCellPrice}>
                  {formatCurrency(Number(item.rate ?? 0), currency)}
                </Text>
                <Text style={styles.tableCellAmount}>
                  {formatCurrency((item.quantity ?? 0) * (item.rate ?? 0), currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals + footer: stick to bottom of A4 */}
        <View style={styles.footerStick}>
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text>SUBTOTAL</Text>
              <Text>{formatCurrency(subtotal, currency)}</Text>
            </View>
            {tax > 0 && (
              <View style={styles.totalRow}>
                <Text>VAT</Text>
                <Text>{formatCurrency(tax, currency)}</Text>
              </View>
            )}
            {discount > 0 && (
              <View style={styles.totalRow}>
                <Text>Discount</Text>
                <Text>-{formatCurrency(discount, currency)}</Text>
              </View>
            )}
            {shipping > 0 && (
              <View style={styles.totalRow}>
                <Text>Shipping</Text>
                <Text>{formatCurrency(shipping, currency)}</Text>
              </View>
            )}
            <View style={styles.totalRowMain}>
              <Text>Total</Text>
              <Text>{formatCurrency(Number(invoice.total), currency)}</Text>
            </View>
          </View>
          {(business || deliveredBy) ? (
            <View style={[styles.paymentDetails, { marginTop: 14 }]}>
              {business && (business.businessBrn || business.vatRegistrationNumber || business.businessAddress || business.businessPhone) ? (
                <>
                  <Text style={styles.paymentLine}>Payment details: Cheque to {business.businessName}</Text>
                  {business.businessAddress ? <Text style={styles.paymentLine}>{business.businessAddress}</Text> : null}
                  {business.businessPhone ? <Text style={styles.paymentLine}>T: {business.businessPhone}</Text> : null}
                  {business.businessBrn ? <Text style={styles.paymentLine}>BRN: {business.businessBrn}</Text> : null}
                  {business.vatRegistrationNumber ? (
                    <Text style={styles.paymentLine}>VAT Registration: {business.vatRegistrationNumber}</Text>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}
          <View style={styles.deliveredBySignatureRow}>
            {deliveredBy ? (
              <View style={styles.signatureBlock}>
                <Text style={styles.footerDeliveredBy}>Delivered by</Text>
                <Text style={styles.footerDeliveredByValue}>{deliveredBy}</Text>
              </View>
            ) : null}
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Client&apos;s signature</Text>
            </View>
          </View>
          <View style={styles.poweredBy}>
            <Text style={styles.poweredByLabel}>Powered by </Text>
            <View style={styles.poweredByBrand}>
              <Image src={swiftbookIconUrl} style={styles.poweredByIcon} />
              <Text style={styles.poweredByText}>Swiftbook</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
