/**
 * DeliveryNotePDF - PDF Otpremnica za izlaz iz skladišta
 */
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts (optional - for Serbian characters)
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 'normal' },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
    ]
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Roboto',
        fontSize: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        paddingBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#10B981',
    },
    companyInfo: {
        flex: 1,
    },
    companyName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#10B981',
        marginBottom: 4,
    },
    companyDetails: {
        fontSize: 9,
        color: '#64748b',
        marginBottom: 2,
    },
    documentInfo: {
        alignItems: 'flex-end',
    },
    documentTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
    },
    documentNumber: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#10B981',
        marginBottom: 4,
    },
    documentDate: {
        fontSize: 10,
        color: '#64748b',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 10,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    infoLabel: {
        width: 120,
        fontSize: 9,
        color: '#64748b',
    },
    infoValue: {
        flex: 1,
        fontSize: 10,
        color: '#1e293b',
    },
    table: {
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    tableHeaderCell: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#475569',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tableCell: {
        fontSize: 9,
        color: '#1e293b',
    },
    colNo: { width: 30 },
    colItem: { flex: 1 },
    colQuantity: { width: 80, textAlign: 'right' },
    colUnit: { width: 50, textAlign: 'center' },
    totalsSection: {
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 2,
        borderTopColor: '#10B981',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 4,
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1e293b',
        marginRight: 20,
    },
    totalValue: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#10B981',
        width: 100,
        textAlign: 'right',
    },
    signatures: {
        marginTop: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    signatureBox: {
        width: '45%',
    },
    signatureLabel: {
        fontSize: 9,
        color: '#64748b',
        marginBottom: 40,
    },
    signatureLine: {
        borderTopWidth: 1,
        borderTopColor: '#94a3b8',
        paddingTop: 4,
    },
    signatureText: {
        fontSize: 9,
        color: '#64748b',
        textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 8,
        color: '#94a3b8',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 10,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 'bold',
    },
    statusSent: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
    },
    statusConfirmed: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
    },
    notesSection: {
        marginTop: 20,
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 4,
    },
    notesTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#475569',
        marginBottom: 6,
    },
    notesText: {
        fontSize: 9,
        color: '#64748b',
        lineHeight: 1.4,
    },
});

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('sr-RS', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatQuantity = (quantity, unit) => {
    if (!quantity) return '-';
    return `${parseFloat(quantity).toLocaleString('sr-RS')} ${unit || 'kg'}`;
};

export const DeliveryNotePDF = ({ outbound, companyName = 'EcoLogistics', wasteTypes = [] }) => {
    const items = outbound.items || [];
    const totalQuantity = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

    const getWasteLabel = (wasteTypeId) => {
        const wt = wasteTypes.find(w => w.id === wasteTypeId);
        return wt?.label || wasteTypeId || 'Nepoznato';
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.companyInfo}>
                        <Text style={styles.companyName}>{companyName}</Text>
                        <Text style={styles.companyDetails}>Sistem za upravljanje otpadom</Text>
                    </View>
                    <View style={styles.documentInfo}>
                        <Text style={styles.documentTitle}>OTPREMNICA</Text>
                        <Text style={styles.documentNumber}>#{outbound.id?.slice(0, 8).toUpperCase()}</Text>
                        <Text style={styles.documentDate}>{formatDate(outbound.created_at)}</Text>
                    </View>
                </View>

                {/* Source & Destination */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Podaci o transportu</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Izlazno skladište:</Text>
                        <Text style={styles.infoValue}>{outbound.source_inventory_name || '-'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Odredište:</Text>
                        <Text style={styles.infoValue}>{outbound.destination_name || '-'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Status:</Text>
                        <Text style={styles.infoValue}>
                            {outbound.status === 'confirmed' ? 'Potvrđeno' :
                             outbound.status === 'sent' ? 'Poslato' :
                             outbound.status === 'cancelled' ? 'Otkazano' : 'Na čekanju'}
                        </Text>
                    </View>
                    {outbound.sent_at && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Datum slanja:</Text>
                            <Text style={styles.infoValue}>{formatDate(outbound.sent_at)}</Text>
                        </View>
                    )}
                    {outbound.confirmed_at && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Datum potvrde:</Text>
                            <Text style={styles.infoValue}>{formatDate(outbound.confirmed_at)}</Text>
                        </View>
                    )}
                </View>

                {/* Items Table */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Stavke</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderCell, styles.colNo]}>#</Text>
                            <Text style={[styles.tableHeaderCell, styles.colItem]}>Vrsta robe</Text>
                            <Text style={[styles.tableHeaderCell, styles.colQuantity]}>Količina</Text>
                            <Text style={[styles.tableHeaderCell, styles.colUnit]}>Jed.</Text>
                        </View>
                        {items.map((item, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.tableCell, styles.colNo]}>{index + 1}</Text>
                                <Text style={[styles.tableCell, styles.colItem]}>{getWasteLabel(item.waste_type)}</Text>
                                <Text style={[styles.tableCell, styles.colQuantity]}>{parseFloat(item.quantity).toLocaleString('sr-RS')}</Text>
                                <Text style={[styles.tableCell, styles.colUnit]}>{item.unit || 'kg'}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Ukupno stavki:</Text>
                        <Text style={styles.totalValue}>{items.length}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Ukupna količina:</Text>
                        <Text style={styles.totalValue}>{formatQuantity(totalQuantity, 'kg')}</Text>
                    </View>
                </View>

                {/* Notes */}
                {outbound.notes && (
                    <View style={styles.notesSection}>
                        <Text style={styles.notesTitle}>Napomena:</Text>
                        <Text style={styles.notesText}>{outbound.notes}</Text>
                    </View>
                )}

                {/* Signatures */}
                <View style={styles.signatures}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Predao:</Text>
                        <View style={styles.signatureLine}>
                            <Text style={styles.signatureText}>{outbound.created_by_name || 'N/A'}</Text>
                        </View>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Primio:</Text>
                        <View style={styles.signatureLine}>
                            <Text style={styles.signatureText}>{outbound.confirmed_by_name || '_________________'}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    Dokument generisan: {formatDate(new Date().toISOString())} | {companyName} - EcoLogistics
                </Text>
            </Page>
        </Document>
    );
};

export default DeliveryNotePDF;
