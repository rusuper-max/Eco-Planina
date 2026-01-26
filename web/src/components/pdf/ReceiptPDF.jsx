/**
 * ReceiptPDF - PDF Prijemnica za obrađene zahteve (preuzimanje od klijenta)
 */
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register fonts
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
    requestCode: {
        fontSize: 14,
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
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    infoBox: {
        width: '50%',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 9,
        color: '#64748b',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 11,
        color: '#1e293b',
        fontWeight: 'bold',
    },
    wasteInfo: {
        backgroundColor: '#f0fdf4',
        padding: 15,
        borderRadius: 6,
        marginBottom: 20,
    },
    wasteType: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#065f46',
        marginBottom: 8,
    },
    wasteDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    wasteDetailItem: {
        alignItems: 'center',
    },
    wasteDetailLabel: {
        fontSize: 8,
        color: '#64748b',
        marginBottom: 2,
    },
    wasteDetailValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    weightHighlight: {
        backgroundColor: '#10B981',
        color: 'white',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    timelineSection: {
        marginTop: 20,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
        marginRight: 10,
        marginTop: 2,
    },
    timelineDotGray: {
        backgroundColor: '#cbd5e1',
    },
    timelineContent: {
        flex: 1,
    },
    timelineLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    timelineDate: {
        fontSize: 9,
        color: '#64748b',
    },
    notesSection: {
        marginTop: 15,
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
    proofSection: {
        marginTop: 20,
        alignItems: 'center',
    },
    proofImage: {
        width: 200,
        height: 150,
        objectFit: 'contain',
        borderRadius: 4,
        border: '1px solid #e2e8f0',
    },
    proofLabel: {
        fontSize: 8,
        color: '#64748b',
        marginTop: 4,
    },
    signatures: {
        marginTop: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    signatureBox: {
        width: '45%',
    },
    signatureLabel: {
        fontSize: 9,
        color: '#64748b',
        marginBottom: 30,
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
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        fontSize: 9,
        fontWeight: 'bold',
        backgroundColor: '#d1fae5',
        color: '#065f46',
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

const formatWeight = (weight, unit = 'kg') => {
    if (!weight) return '-';
    return `${parseFloat(weight).toLocaleString('sr-RS')} ${unit}`;
};

export const ReceiptPDF = ({ request, companyName = 'EcoLogistics', wasteTypes = [] }) => {
    const getWasteIcon = (wasteTypeId) => {
        const wt = wasteTypes.find(w => w.id === wasteTypeId);
        return wt?.icon || '📦';
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
                        <Text style={styles.documentTitle}>PRIJEMNICA</Text>
                        {request.request_code && (
                            <Text style={styles.requestCode}>#{request.request_code}</Text>
                        )}
                        <Text style={styles.documentDate}>{formatDate(request.processed_at)}</Text>
                    </View>
                </View>

                {/* Client Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Podaci o klijentu</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>Naziv klijenta:</Text>
                            <Text style={styles.infoValue}>{request.client_name || '-'}</Text>
                        </View>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>Datum kreiranja:</Text>
                            <Text style={styles.infoValue}>{formatDate(request.created_at)}</Text>
                        </View>
                        <View style={[styles.infoBox, { width: '100%' }]}>
                            <Text style={styles.infoLabel}>Adresa:</Text>
                            <Text style={styles.infoValue}>{request.client_address || '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* Waste Info */}
                <View style={styles.wasteInfo}>
                    <Text style={styles.wasteType}>
                        {getWasteIcon(request.waste_type)} {request.waste_label || 'Nepoznata vrsta'}
                    </Text>
                    <View style={styles.wasteDetails}>
                        <View style={styles.wasteDetailItem}>
                            <Text style={styles.wasteDetailLabel}>Popunjenost</Text>
                            <Text style={styles.wasteDetailValue}>{request.fill_level || '-'}%</Text>
                        </View>
                        <View style={styles.wasteDetailItem}>
                            <Text style={styles.wasteDetailLabel}>Težina</Text>
                            <View style={styles.weightHighlight}>
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
                                    {formatWeight(request.weight, request.weight_unit)}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.wasteDetailItem}>
                            <Text style={styles.wasteDetailLabel}>Status</Text>
                            <View style={styles.badge}>
                                <Text>OBRAĐENO</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Processing Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Podaci o obradi</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>Obradio:</Text>
                            <Text style={styles.infoValue}>{request.processor_name || '-'}</Text>
                        </View>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>Datum obrade:</Text>
                            <Text style={styles.infoValue}>{formatDate(request.processed_at)}</Text>
                        </View>
                        {request.driver_name && (
                            <View style={styles.infoBox}>
                                <Text style={styles.infoLabel}>Vozač:</Text>
                                <Text style={styles.infoValue}>{request.driver_name}</Text>
                            </View>
                        )}
                        {request.region_name && (
                            <View style={styles.infoBox}>
                                <Text style={styles.infoLabel}>Filijala:</Text>
                                <Text style={styles.infoValue}>{request.region_name}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Timeline */}
                <View style={styles.timelineSection}>
                    <Text style={styles.sectionTitle}>Tok obrade</Text>
                    <View style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineLabel}>Zahtev kreiran</Text>
                            <Text style={styles.timelineDate}>{formatDate(request.created_at)}</Text>
                        </View>
                    </View>
                    {request.assigned_at && (
                        <View style={styles.timelineItem}>
                            <View style={styles.timelineDot} />
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineLabel}>Dodeljen vozač</Text>
                                <Text style={styles.timelineDate}>{formatDate(request.assigned_at)}</Text>
                            </View>
                        </View>
                    )}
                    {request.picked_up_at && (
                        <View style={styles.timelineItem}>
                            <View style={styles.timelineDot} />
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineLabel}>Preuzeto od klijenta</Text>
                                <Text style={styles.timelineDate}>{formatDate(request.picked_up_at)}</Text>
                            </View>
                        </View>
                    )}
                    {request.delivered_at && (
                        <View style={styles.timelineItem}>
                            <View style={styles.timelineDot} />
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineLabel}>Dostavljeno u skladište</Text>
                                <Text style={styles.timelineDate}>{formatDate(request.delivered_at)}</Text>
                            </View>
                        </View>
                    )}
                    <View style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineLabel}>Obrađeno i zatvoreno</Text>
                            <Text style={styles.timelineDate}>{formatDate(request.processed_at)}</Text>
                        </View>
                    </View>
                </View>

                {/* Notes */}
                {request.processing_note && (
                    <View style={styles.notesSection}>
                        <Text style={styles.notesTitle}>Napomena:</Text>
                        <Text style={styles.notesText}>{request.processing_note}</Text>
                    </View>
                )}

                {/* Signatures */}
                <View style={styles.signatures}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Vozač/Preuzimač:</Text>
                        <View style={styles.signatureLine}>
                            <Text style={styles.signatureText}>{request.driver_name || '_________________'}</Text>
                        </View>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Klijent:</Text>
                        <View style={styles.signatureLine}>
                            <Text style={styles.signatureText}>{request.client_name || '_________________'}</Text>
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

export default ReceiptPDF;
