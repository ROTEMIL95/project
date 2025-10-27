import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    direction: 'rtl',
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  section: {
    margin: 10,
    padding: 10
  },
  table: {
    display: 'table',
    width: '100%',
    marginBottom: 10
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#EEE',
    minHeight: 30,
    alignItems: 'center'
  },
  tableHeader: {
    backgroundColor: '#F3F4F6'
  },
  tableCell: {
    flex: 1,
    padding: 5,
    textAlign: 'right'
  },
  tableCellTotal: {
    flex: 1,
    padding: 5,
    textAlign: 'right',
    fontWeight: 'bold'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#666',
    borderTop: 1,
    paddingTop: 10
  }
});

const QuotePDF = ({ quoteData, items, categories }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>הצעת מחיר - {quoteData.projectName}</Text>
        <Text style={styles.subtitle}>תאריך: {format(new Date(), 'dd/MM/yyyy', { locale: he })}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={{ fontSize: 16, marginBottom: 10 }}>פרטי לקוח</Text>
        <View style={{ marginBottom: 20 }}>
          <Text>שם: {quoteData.clientName}</Text>
          <Text>אימייל: {quoteData.clientEmail}</Text>
          <Text>טלפון: {quoteData.clientPhone}</Text>
          <Text>כתובת: {quoteData.projectAddress}</Text>
          <Text>סוג פרויקט: {quoteData.projectType}</Text>
        </View>
      </View>

      {categories.map(category => {
        const categoryItems = items.filter(item => item.categoryId === category.id);
        if (categoryItems.length === 0) return null;

        return (
          <View key={category.id} style={styles.section}>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>{category.name}</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.tableCell}>פריט</Text>
                <Text style={styles.tableCell}>כמות</Text>
                <Text style={styles.tableCell}>מחיר ליחידה</Text>
                <Text style={styles.tableCell}>סה"כ</Text>
              </View>
              {categoryItems.map(item => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{item.description}</Text>
                  <Text style={styles.tableCell}>{item.quantity} {item.unit}</Text>
                  <Text style={styles.tableCell}>{item.pricePerUnit?.toLocaleString()} ₪</Text>
                  <Text style={styles.tableCell}>{item.totalPrice?.toLocaleString()} ₪</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}

      <View style={styles.section}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.tableCellTotal}>סיכום</Text>
          <Text style={styles.tableCellTotal}></Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>סה"כ לפני הנחה:</Text>
          <Text style={styles.tableCell}>{quoteData.totalAmount?.toLocaleString()} ₪</Text>
        </View>
        {quoteData.discount > 0 && (
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>הנחה ({quoteData.discount}%):</Text>
            <Text style={styles.tableCell}>
              {((quoteData.totalAmount * quoteData.discount) / 100).toLocaleString()} ₪
            </Text>
          </View>
        )}
        <View style={styles.tableRow}>
          <Text style={styles.tableCellTotal}>סה"כ סופי:</Text>
          <Text style={styles.tableCellTotal}>{quoteData.finalAmount?.toLocaleString()} ₪</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>תוקף ההצעה: 30 ימים</Text>
      </View>
    </Page>
  </Document>
);

export default QuotePDF;