
import React from 'react';
import { formatCurrency } from '../utils/formatCurrency';

interface CashFlowItem {
  name: string;
  revenue: number;
  expenses: number;
}

interface CashFlowTableProps {
  data: CashFlowItem[];
}

const CashFlowTable: React.FC<CashFlowTableProps> = ({ data }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mt-6">
      <div className="p-4 border-b border-zinc-800 font-bold text-white text-sm bg-zinc-950 flex justify-between items-center">
         <span>Fluxo de Caixa Detalhado (Automático)</span>
         <span className="text-xs text-zinc-500 font-normal">Baseado nas transações da plataforma</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="bg-zinc-950 text-zinc-500 uppercase text-xs">
            <tr>
              <th className="p-4 font-medium">Período</th>
              <th className="p-4 font-medium text-right">Receita</th>
              <th className="p-4 font-medium text-right">Repasses</th>
              <th className="p-4 font-medium text-right">Margem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data.map((item, index) => {
              const margin = item.revenue - item.expenses;
              return (
                <tr key={index} className="hover:bg-zinc-800/50">
                  <td className="p-4 font-medium text-white">{item.name}</td>
                  <td className="p-4 text-right text-green-400 font-mono">{formatCurrency(item.revenue)}</td>
                  <td className="p-4 text-right text-red-400 font-mono">- {formatCurrency(item.expenses)}</td>
                  <td className={`p-4 text-right font-bold font-mono ${margin >= 0 ? 'text-blue-400' : 'text-red-500'}`}>
                    {formatCurrency(margin)}
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
                <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-500">
                        Nenhum dado disponível para o período selecionado.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashFlowTable;
