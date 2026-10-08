import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: {
    fontFamily:      "Helvetica",
    fontSize:        11,
    paddingTop:      48,
    paddingBottom:   60,
    paddingHorizontal: 52,
    color:           "#1e293b",
    backgroundColor: "#fff",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#1a6fbf",
    marginBottom:      24,
    paddingBottom:     12,
    flexDirection:     "row",
    justifyContent:    "space-between",
    alignItems:        "flex-end",
  },
  agencyName: {
    fontSize:   18,
    fontFamily: "Helvetica-Bold",
    color:      "#1a6fbf",
  },
  docLabel: {
    fontSize: 9,
    color:    "#64748b",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize:      10,
    fontFamily:    "Helvetica-Bold",
    color:         "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom:  6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom:  4,
  },
  row: {
    flexDirection: "row",
    marginBottom:  5,
  },
  label: {
    width:      120,
    color:      "#64748b",
    fontSize:   10,
  },
  value: {
    flex:     1,
    fontSize: 10,
  },
  serviceBox: {
    backgroundColor: "#f8fafc",
    borderRadius:    6,
    padding:         14,
    marginBottom:    20,
    borderWidth:     1,
    borderColor:     "#e2e8f0",
  },
  serviceTitle: {
    fontSize:   13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  serviceDesc: {
    fontSize:   10,
    color:      "#475569",
    lineHeight: 1.6,
  },
  priceRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    marginTop:      12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop:     10,
  },
  priceLabel: {
    fontSize:   11,
    color:      "#64748b",
  },
  price: {
    fontSize:   18,
    fontFamily: "Helvetica-Bold",
    color:      "#1a6fbf",
  },
  terms: {
    fontSize:   9,
    color:      "#94a3b8",
    lineHeight: 1.6,
    marginTop:  6,
  },
  footer: {
    position:  "absolute",
    bottom:    30,
    left:      52,
    right:     52,
    textAlign: "center",
    fontSize:  8,
    color:     "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  validity: {
    backgroundColor: "#eff6ff",
    borderRadius:    4,
    padding:         "6 10",
    marginTop:       8,
  },
  validityText: {
    fontSize: 9,
    color:    "#1a6fbf",
  },
});

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface ProposalData {
  proposalNumber: string;
  date:           string;
  validUntil:     string;
  agencyName:     string;
  clientName:     string;
  clientPhone:    string;
  clientEmail?:   string;
  serviceTitle:   string;
  serviceDesc:    string;
  amount:         number;
  paymentTerms?:  string;
}

export async function generateProposalPdf(data: ProposalData): Promise<Buffer> {
  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },

      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.agencyName }, data.agencyName),
        React.createElement(
          View,
          { style: { alignItems: "flex-end" } },
          React.createElement(Text, { style: { fontSize: 13, fontFamily: "Helvetica-Bold" } }, "PROPOSTA COMERCIAL"),
          React.createElement(Text, { style: styles.docLabel }, `Nº ${data.proposalNumber}  •  ${data.date}`),
        ),
      ),

      // Client info
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Para"),
        React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "Cliente"), React.createElement(Text, { style: styles.value }, data.clientName)),
        React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "WhatsApp"), React.createElement(Text, { style: styles.value }, data.clientPhone)),
        data.clientEmail
          ? React.createElement(View, { style: styles.row }, React.createElement(Text, { style: styles.label }, "E-mail"), React.createElement(Text, { style: styles.value }, data.clientEmail))
          : null,
      ),

      // Service
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Serviço / Solução"),
        React.createElement(
          View,
          { style: styles.serviceBox },
          React.createElement(Text, { style: styles.serviceTitle }, data.serviceTitle),
          React.createElement(Text, { style: styles.serviceDesc }, data.serviceDesc),
          React.createElement(
            View,
            { style: styles.priceRow },
            React.createElement(Text, { style: styles.priceLabel }, "Investimento total"),
            React.createElement(Text, { style: styles.price }, fmt(data.amount)),
          ),
          data.paymentTerms
            ? React.createElement(Text, { style: styles.terms }, `Condições: ${data.paymentTerms}`)
            : null,
        ),
      ),

      // Validity
      React.createElement(
        View,
        { style: styles.validity },
        React.createElement(Text, { style: styles.validityText }, `⏰  Esta proposta é válida até ${data.validUntil}.`),
      ),

      // Footer
      React.createElement(
        Text,
        { style: styles.footer },
        `${data.agencyName}  •  Proposta gerada em ${data.date}  •  Documento sujeito a assinatura digital`,
      ),
    ),
  );

  return renderToBuffer(doc) as unknown as Promise<Buffer>;
}
