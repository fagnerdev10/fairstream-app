# 💰 FLUXO COMPLETO DO DINHEIRO - MONETIZAÇÃO

## 🎯 COMO FUNCIONA A MONETIZAÇÃO (50/50)

### 📊 Origem do Dinheiro: ANUNCIANTES

```
1. ANUNCIANTE DEPOSITA DINHEIRO
   ↓
2. Acessa Painel do Anunciante
   ↓
3. Clica em "💸 Adicionar Saldo"
   ↓
4. Escolhe valor (R$ 50, 100, 500, etc)
   ↓
5. Gera QR Code PIX via ASAAS
   ↓
6. Paga o PIX
   ↓  
7. Dinheiro entra na CARTEIRA DA PLATAFORMA (Asaas)
   ↓
8. Saldo é creditado no perfil do anunciante
```

**Arquivo:** `pages/AdvertiserDashboard.tsx`

- ✅ Função: `handleGeneratePix` (linha 124)
- ✅ Integração: ASAAS em PRODUÇÃO
- ✅ Cria cobrança PIX real
- ✅ Dinheiro vai para a conta Asaas da plataforma

---

### 💸 Como o Anunciante Usa o Saldo

```
9. Anunciante com saldo compra "views"
   ↓
10. Escolhe: Padrão (R$ 0,20/view) ou Home (R$ 0,30/view)
   ↓
11. Exemplo: R$ 100 = 500 views
   ↓
12. Sistema deduz R$ 100 do saldo monetário
   ↓
13. Adiciona 500 views no saldo de impressões
```

**Arquivo:** `pages/AdvertiserDashboard.tsx`

- ✅ Função: `handleBuyViews` (linha 218)
- ✅ Converte saldo monetário em views
- ✅ Views ficam disponíveis para campanhas

---

### 📺 Views Geram Receita para Criadores

```
14. Anúncio aparece nos vídeos
   ↓
15. Cada view desempenha 1 impressão
   ↓
16. Sistema registra: 1 view = R$ 0,20 de receita
   ↓
17. Esse R$ 0,20 vem do SALDO DO ANUNCIANTE
   ↓
18. Divisão automática:
      - R$ 0,10 (50%) → CRIADOR (pendente até dia 05)
      - R$ 0,10 (50%) → PLATAFORMA
```

**Arquivo:** `services/smartAdService.ts`

- ✅ Função: `trackSmartImpression` (linha 136)
- ✅ Decrementa saldo de views do anunciante
- ✅ Registra monetização para o criador

---

### 🗓️ Pagamento Mensal (Dia 05)

```
19. Durante o mês: Views acumulam
   ↓
20. Sistema calcula pendente: views × R$ 0,20 × 50%
   ↓
21. Dia 05 às 00:00:
      - Sistema processa automaticamente
      - Transfere 50% para criador via Asaas
      - Marca views como pagas
   ↓
22. Criador recebe na carteira Asaas ✅
   ↓
23. Plataforma fica com os outros 50% ✅
```

**Arquivo:** `services/monthlyPayoutService.ts`

- ✅ Função: `processAllMonthlyPayouts` (linha 262)
- ✅ Transferência real via `asaasService.createTransfer`
- ✅ Automático no dia 05

---

## 💡 EXEMPLO PRÁTICO COMPLETO

### Cenário: Anunciante deposita R$ 1.000

```
PASSO 1: DEPÓSITO
├─ Anunciante: R$ 1.000 (PIX)
├─ Asaas: Recebe R$ 1.000
└─ Saldo Anunciante: +R$ 1.000

PASSO 2: COMPRA DE VIEWS
├─ Anunciante compra 5.000 views (R$ 1.000 ÷ R$ 0,20)
├─ Saldo monetário: R$ 1.000 → R$ 0
└─ Saldo de views: +5.000 views

PASSO 3: VIEWS SÃO EXIBIDAS (Durante o Mês)
├─ 5.000 views em vídeos de criadores
├─ Receita total gerada: 5.000 × R$ 0,20 = R$ 1.000
├─ Monetização criadores (50%): R$ 500 (PENDENTE)
└─ Receita plataforma (50%): R$ 500

PASSO 4: PAGAMENTO (Dia 05)
├─ Sistema transfere R$ 500 para criadores
├─ Plataforma fica com R$ 500
└─ Lucro líquido da plataforma: R$ 500
```

---

## 🔄 CICLO COMPLETO DO DINHEIRO

```
┌─────────────────────────────────────────────┐
│  ANUNCIANTE                                 │
│  Deposita R$ 1.000 via PIX Asaas            │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│  PLATAFORMA (Asaas)                         │
│  Recebe R$ 1.000 na carteira                │
│  Credita saldo no perfil do anunciante      │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│  ANUNCIANTE COMPRA VIEWS                    │
│  R$ 1.000 → 5.000 views                     │
│  Saldo monetário zerado                     │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│  ANÚNCIOS RODAM                             │
│  5.000 views × R$ 0,20 = R$ 1.000           │
│  │                                           │
│  ├─ R$ 500 (50%) → CRIADORES (pendente)     │
│  └─ R$ 500 (50%) → PLATAFORMA               │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│  DIA 05 - PAGAMENTO AUTOMÁTICO              │
│  Sistema transfere via Asaas:               │
│  R$ 500 → Criadores ✅                       │
│  R$ 500 → Plataforma fica ✅                 │
└─────────────────────────────────────────────┘
```

---

## ✅ O QUE FOI IMPLEMENTADO AGORA

### Integração do Painel do Anunciante com Asaas

**Antes:**

- ❌ Usava Mercado Pago (teste)
- ❌ Não tinha dinheiro real

**Agora:**

- ✅ Usa ASAAS em PRODUÇÃO
- ✅ Cria cobrança PIX REAL
- ✅ Dinheiro vai para carteira Asaas da plataforma
- ✅ Esse dinheiro financia a monetização dos criadores

**Arquivos Modificados:**

1. `pages/AdvertiserDashboard.tsx`
   - `handleGeneratePix` → Cria cobrança via Asaas
   - `handleCheckPayment` → Verifica status via Asaas
   - Linhas 124-207

---

## 🎯 FLUXO FINANCEIRO COMPLETO

### Entrada de Dinheiro

```
Anunciantes depositam via PIX
    ↓
Dinheiro entra na carteira Asaas da plataforma
    ↓
Saldo creditado no perfil do anunciante
```

### Uso do Dinheiro

```
Anunciante compra views
    ↓
Saldo monetário vira saldo de impressões
    ↓
Anúncios rodam e consomem impressões
    ↓
Cada view gera R$ 0,20 de receita
```

### Divisão da Receita

```
R$ 0,20 por view
    ├─ R$ 0,10 (50%) → Criador (acumula até dia 05)
    └─ R$ 0,10 (50%) → Plataforma (fica na carteira)
```

### Pagamento aos Criadores

```
Dia 05 de cada mês
    ↓
Sistema calcula total pendente
    ↓
Transfere 50% via Asaas para criadores
    ↓
Plataforma fica com os outros 50%
```

---

## 🔍 ONDE ESTÁ CADA PARTE

### 1. Depósito do Anunciante

- **Arquivo:** `pages/AdvertiserDashboard.tsx`
- **Função:** `handleGeneratePix` (linha 124)
- **O que faz:** Cria cobrança PIX via Asaas

### 2. Compra de Views

- **Arquivo:** `pages/AdvertiserDashboard.tsx`
- **Função:** `handleBuyViews` (linha 218)
- **O que faz:** Converte saldo em views

### 3. Registro de Impressões

- **Arquivo:** `services/smartAdService.ts`
- **Função:** `trackSmartImpression` (linha 136)
- **O que faz:** Decrementa views, registra receita

### 4. Cálculo de Monetização

- **Arquivo:** `services/payoutService.ts`
- **Função:** `getPendingMonthlyPayouts` (linha 163)
- **O que faz:** Calcula 50% para criadores

### 5. Pagamento Automático

- **Arquivo:** `services/monthlyPayoutService.ts`
- **Função:** `processAllMonthlyPayouts` (linha 262)
- **O que faz:** Transfere via Asaas no dia 05

---

## ✅ CHECKLIST FINAL

- [x] Anunciante pode depositar via PIX Asaas
- [x] Dinheiro vai para carteira da plataforma
- [x] Anunciante pode comprar views
- [x] Views geram receita para criadores
- [x] Sistema calcula 50/50
- [x] Pagamento automático dia 05
- [x] Transferência via Asaas

**TUDO FUNCIONA DE FORMA AUTOMÁTICA E INTEGRADA! 🚀**

---

**Data:** 14/01/2026  
**Status:** 🟢 100% IMPLEMENTADO  
**Modo:** PRODUÇÃO ATIVA
