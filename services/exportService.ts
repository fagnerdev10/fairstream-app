
import { ManualCost } from '../types';
import { formatCurrency } from '../utils/formatCurrency';

export const exportService = {
  // --- EXPORTAÇÃO EXCEL (CSV) ---
  exportToCSV: (reportData: any[], manualCosts: ManualCost[], period: string) => {
    // 1. Definir Cabeçalho (usando ; como separador para Excel em PT-BR)
    const header = ["Período/Data", "Tipo", "Descrição", "Receita (R$)", "Despesa (R$)"];
    
    const rows: string[][] = [];
    
    // 2. Processar Dados Automáticos (Gráficos/Receita)
    reportData.forEach(item => {
      rows.push([
        item.name,
        "Plataforma (Auto)",
        "Receita/Repasses Automáticos",
        item.revenue.toFixed(2).replace('.', ','),
        item.expenses.toFixed(2).replace('.', ',')
      ]);
    });

    // 3. Processar Despesas Manuais
    manualCosts.forEach(cost => {
      // Ajuste de data para evitar problemas de timezone
      const dateParts = cost.date.split('-');
      const dateStr = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // DD/MM/YYYY

      rows.push([
        dateStr,
        "Despesa Manual",
        cost.description,
        "0,00",
        cost.amount.toFixed(2).replace('.', ',')
      ]);
    });

    // 4. Calcular Totais
    const totalRev = reportData.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalAutoExp = reportData.reduce((acc, curr) => acc + curr.expenses, 0);
    const totalManualExp = manualCosts.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExp = totalAutoExp + totalManualExp;
    const netProfit = totalRev - totalExp;
    
    rows.push(["", "", "", "", ""]); // Linha vazia
    rows.push(["TOTAIS", "", "", totalRev.toFixed(2).replace('.', ','), totalExp.toFixed(2).replace('.', ',')]);
    rows.push(["LUCRO LÍQUIDO", "", "", netProfit.toFixed(2).replace('.', ','), ""]);

    // 5. Converter para String CSV
    const csvContent = [
      header.join(";"),
      ...rows.map(r => r.join(";"))
    ].join("\n");

    // 6. Criar Blob com BOM (\uFEFF) para forçar UTF-8 no Excel
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 7. Criar URL Temporária e Baixar
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relatorio_financeiro_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // --- EXPORTAÇÃO PDF (Visual Print) ---
  exportToPDF: (reportData: any[], manualCosts: ManualCost[], period: string) => {
    const totalRevenue = reportData.reduce((acc, curr) => acc + curr.revenue, 0);
    const autoExpenses = reportData.reduce((acc, curr) => acc + curr.expenses, 0);
    const totalManualCosts = manualCosts.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpenses = autoExpenses + totalManualCosts;
    const netProfit = totalRevenue - totalExpenses;
    const now = new Date().toLocaleString('pt-BR');

    // Mapeia labels do período
    const periodLabel: Record<string, string> = {
        daily: 'Diário',
        weekly: 'Semanal',
        monthly: 'Mensal',
        annual: 'Anual'
    };

    // Constrói HTML do Relatório
    const htmlContent = `
      <html>
        <head>
          <title>Relatório Financeiro - FairStream</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1f2937; background: #fff; -webkit-print-color-adjust: exact; }
            
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
            .brand { color: #dc2626; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
            .title { font-size: 18px; font-weight: 600; margin-top: 5px; color: #374151; }
            .meta { font-size: 12px; color: #6b7280; margin-top: 5px; }

            .summary-cards { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 40px; }
            .card { flex: 1; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; text-align: center; }
            .card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 600; margin-bottom: 8px; }
            .card-value { font-size: 20px; font-weight: 700; }
            
            .text-green { color: #059669; }
            .text-red { color: #dc2626; }
            .text-orange { color: #d97706; }
            .text-blue { color: #2563eb; }

            h2 { font-size: 14px; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 30px; margin-bottom: 15px; color: #111827; text-transform: uppercase; }

            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
            th { text-align: left; background-color: #f3f4f6; color: #4b5563; padding: 10px; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
            td { padding: 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
            tr:last-child td { border-bottom: none; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">FairStream AI</div>
            <div class="title">Relatório Financeiro Consolidado</div>
            <div class="meta">Período: ${periodLabel[period] || period} • Gerado em: ${now}</div>
          </div>

          <!-- RESUMO -->
          <div class="summary-cards">
            <div class="card">
              <div class="card-label">Receita Bruta</div>
              <div class="card-value text-green">${formatCurrency(totalRevenue)}</div>
            </div>
            <div class="card">
              <div class="card-label">Repasses (Auto)</div>
              <div class="card-value text-red">${formatCurrency(autoExpenses)}</div>
            </div>
            <div class="card">
              <div class="card-label">Despesas Manuais</div>
              <div class="card-value text-orange">${formatCurrency(totalManualCosts)}</div>
            </div>
            <div class="card" style="border-color: #bfdbfe; background: #eff6ff;">
              <div class="card-label text-blue">Lucro Líquido</div>
              <div class="card-value text-blue">${formatCurrency(netProfit)}</div>
            </div>
          </div>

          <!-- TABELA DE FLUXO AUTOMÁTICO -->
          <h2>Fluxo de Caixa (Automático)</h2>
          <table>
            <thead>
              <tr>
                <th>Período</th>
                <th class="text-right">Receita</th>
                <th class="text-right">Repasses</th>
                <th class="text-right">Margem</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="text-right font-mono text-green">${formatCurrency(item.revenue)}</td>
                  <td class="text-right font-mono text-red">-${formatCurrency(item.expenses)}</td>
                  <td class="text-right font-mono font-bold">${formatCurrency(item.revenue - item.expenses)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- TABELA DE DESPESAS MANUAIS -->
          <h2>Detalhamento de Despesas Manuais</h2>
          ${manualCosts.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th class="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${manualCosts.map(cost => {
                  const dateParts = cost.date.split('-');
                  const dateStr = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                  return `
                    <tr>
                      <td>${dateStr}</td>
                      <td>${cost.description}</td>
                      <td class="text-right font-mono text-orange">-${formatCurrency(cost.amount)}</td>
                    </tr>
                  `;
                }).join('')}
                <tr>
                  <td colspan="2" style="text-align:right; font-weight:bold; padding-top:15px;">Total Despesas Manuais:</td>
                  <td class="text-right font-mono font-bold text-orange" style="padding-top:15px;">-${formatCurrency(totalManualCosts)}</td>
                </tr>
              </tbody>
            </table>
          ` : '<p style="font-size:12px; color:#6b7280; font-style:italic;">Nenhuma despesa manual registrada neste período.</p>'}

          <div class="footer">
            Este documento foi gerado automaticamente pelo sistema de gestão FairStream AI.<br/>
            Valores expressos em Reais (BRL). Confidencial.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    // Abrir popup e imprimir
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      alert("Por favor, permita popups para gerar o PDF.");
    }
  }
};
