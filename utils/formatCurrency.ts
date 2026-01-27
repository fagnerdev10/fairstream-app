
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatCurrencyInput = (value: string): string => {
  // Remove tudo que não é dígito
  const onlyDigits = value.replace(/\D/g, "");
  
  // Converte para centavos (ex: 2000 -> 20.00)
  const numberValue = Number(onlyDigits) / 100;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
};
