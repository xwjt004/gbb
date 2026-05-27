import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { DashboardStats, TrendData, RefundAnalysis, SuspiciousPayment } from '../../../pages/Dashboard/dashboardTypes';

export async function exportExcel(trendData: TrendData[], refundAnalysis: RefundAnalysis | null) {
  const wb = XLSX.utils.book_new();
  const exportedTrendData = trendData.map(item => ({
    日期: item.date,
    订单数量: item.orderCount,
    收入: item.revenue,
    退款金额: item.refundAmount,
    实收金额: item.paidAmount,
  }));
  const ws1 = XLSX.utils.json_to_sheet(exportedTrendData);
  XLSX.utils.book_append_sheet(wb, ws1, '趋势数据');

  if (refundAnalysis) {
    const refundData = refundAnalysis.byReason.map(item => ({
      退款原因: item.reason,
      数量: item.count,
      占比: `${item.percentage}%`,
    }));
    const ws2 = XLSX.utils.json_to_sheet(refundData);
    XLSX.utils.book_append_sheet(wb, ws2, '退款分析');
  }

  XLSX.writeFile(wb, `统计分析报告_${dayjs().format('YYYY-MM-DD')}.xlsx`);
}

export async function exportPDF(dashboardStats: DashboardStats | null, refundAnalysis: RefundAnalysis | null) {
  const doc = new jsPDF();
  doc.setFont('helvetica');
  doc.setFontSize(16);
  doc.text('统计分析报告', 14, 15);
  doc.setFontSize(10);
  doc.text(`生成日期：${dayjs().format('YYYY-MM-DD')}`, 14, 22);

  let currentY = 30;
  if (dashboardStats) {
    doc.setFontSize(12);
    doc.text('统计概览', 14, currentY);
    currentY += 10;
    const statsData = [
      ['指标', '今日', '本月', '上月'],
      ['订单数',
        dashboardStats.today.orders.toString(),
        dashboardStats.thisMonth.orders.toString(),
        dashboardStats.lastMonth.orders.toString()
      ],
      ['收入',
        `¥${dashboardStats.today.revenue}`,
        `¥${dashboardStats.thisMonth.revenue}`,
        `¥${dashboardStats.lastMonth.revenue}`
      ],
      ['退款数',
        dashboardStats.today.refunds.toString(),
        dashboardStats.thisMonth.refunds.toString(),
        dashboardStats.lastMonth.refunds.toString()
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [statsData[0]],
      body: statsData.slice(1),
      theme: 'grid',
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  if (refundAnalysis) {
    doc.setFontSize(12);
    doc.text('退款分析', 14, currentY);
    currentY += 10;
    const refundData = refundAnalysis.byReason.map(item => [
      item.reason,
      item.count.toString(),
      `${item.percentage}%`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['退款原因', '数量', '占比']],
      body: refundData,
      theme: 'striped',
    });
  }

  const fileName = `统计分析报告_${dayjs().format('YYYY-MM-DD')}.pdf`;
  doc.save(fileName);
}

export function backupData(payload: { dashboardStats: DashboardStats | null; trendData: TrendData[]; refundAnalysis: RefundAnalysis | null; suspiciousPayments: SuspiciousPayment[] }) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `数据备份_${dayjs().format('YYYY-MM-DD')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
