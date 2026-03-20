import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DailyClosing, Movement, Product } from '../types';

export function generateClosingPdf(
  closing: DailyClosing,
  movements: Movement[],
  products: Product[]
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ── Cabeçalho ──────────────────────────────────────────────
  doc.setFillColor(37, 99, 235); // azul primário
  doc.rect(0, 0, pageWidth, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE FECHAMENTO DIÁRIO', pageWidth / 2, 16, { align: 'center' });

  const dateLabel = format(new Date(closing.date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(dateLabel, pageWidth / 2, 28, { align: 'center' });

  // ── Resumo ──────────────────────────────────────────────────
  let y = 50;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO FINANCEIRO', margin, y);

  y += 8;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const fmt = (v: number) =>
    v.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });

  const summaryItems = [
    { label: 'Receita Total', value: fmt(closing.totalRevenue), color: [22, 163, 74] as [number, number, number] },
    { label: 'Custo Total',   value: fmt(closing.totalCost),    color: [220, 38, 38] as [number, number, number] },
    { label: 'Lucro Total',   value: fmt(closing.totalProfit),  color: [37, 99, 235] as [number, number, number] },
    {
      label: 'Total de Produtos Vendidos',
      value: closing.totalProductsSold.toString() + ' un.',
      color: [100, 100, 100] as [number, number, number],
    },
  ];

  summaryItems.forEach((item) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(item.label + ':', margin, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...item.color);
    doc.text(item.value, pageWidth - margin, y, { align: 'right' });
    y += 9;
  });

  // ── Tabela de Produtos Vendidos ─────────────────────────────
  y += 6;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUTOS VENDIDOS', margin, y);
  y += 4;

  // Agregar por produto
  const productMap = new Map<string, {
    name: string;
    quantity: number;
    unitPrice: number;
    totalRevenue: number;
    profit: number;
  }>();

  movements.forEach((m) => {
    const product = products.find((p) => p.id === m.productId);
    const name = product?.name ?? 'Produto removido';
    const existing = productMap.get(m.productId);
    if (existing) {
      existing.quantity += m.quantity;
      existing.totalRevenue += m.totalRevenue ?? 0;
      existing.profit += m.profit ?? 0;
    } else {
      productMap.set(m.productId, {
        name,
        quantity: m.quantity,
        unitPrice: m.unitPrice ?? 0,
        totalRevenue: m.totalRevenue ?? 0,
        profit: m.profit ?? 0,
      });
    }
  });

  const tableRows = Array.from(productMap.values()).map((item) => [
    item.name,
    item.quantity.toString(),
    fmt(item.unitPrice),
    fmt(item.totalRevenue),
    fmt(item.profit),
  ]);

  autoTable(doc, {
    startY: y + 2,
    head: [['Produto', 'Qtd', 'Preço Unit.', 'Total Vendido', 'Lucro']],
    body: tableRows,
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  // ── Rodapé ──────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const margin_perc = closing.totalRevenue > 0
    ? ((closing.totalProfit / closing.totalRevenue) * 100).toFixed(2)
    : '0.00';

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, finalY, pageWidth - margin, finalY);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Margem de Lucro:', margin, finalY + 9);
  doc.setTextColor(37, 99, 235);
  doc.text(`${margin_perc}%`, pageWidth - margin, finalY + 9, { align: 'right' });

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — Gestor de Estoque`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 8,
    { align: 'center' }
  );

  // Baixar
  const fileName = `fechamento_${closing.date}.pdf`;
  doc.save(fileName);
}
