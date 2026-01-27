
import React, { useState } from 'react';
import { ManualCost } from '../types';
import { PlusCircle } from 'lucide-react';
import { formatCurrencyInput } from '../utils/formatCurrency';

interface CostEntryFormProps {
  onAdd: (cost: ManualCost) => void;
}

const CostEntryForm: React.FC<CostEntryFormProps> = ({ onAdd }) => {
  const [desc, setDesc] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Formata automaticamente enquanto o usuário digita
    setAmountStr(formatCurrencyInput(val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amountStr) return;

    // Converte a string formatada "R$ 1.234,56" de volta para número 1234.56
    // 1. Remove tudo que não é dígito
    const onlyDigits = amountStr.replace(/\D/g, "");
    
    // 2. Converte para float (dividindo por 100 pois são centavos)
    const value = Number(onlyDigits) / 100;

    if (isNaN(value) || value <= 0) {
        alert("Valor inválido.");
        return;
    }

    onAdd({
      id: '',
      description: desc,
      amount: value,
      date: date
    });

    setDesc('');
    setAmountStr('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-4">
      <h3 className="text-white font-bold text-sm">Registrar Nova Despesa</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Descrição</label>
          <input 
            type="text" 
            value={desc} 
            onChange={e => setDesc(e.target.value)} 
            placeholder="Ex: Servidor AWS" 
            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Valor</label>
          <input 
            type="text" 
            value={amountStr} 
            onChange={handleAmountChange} 
            placeholder="R$ 0,00" 
            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm outline-none focus:border-red-500 font-medium"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Data</label>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-sm outline-none focus:border-red-500"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 transition-colors">
          <PlusCircle size={14} /> Adicionar Despesa
        </button>
      </div>
    </form>
  );
};

export default CostEntryForm;
