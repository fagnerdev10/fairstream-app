# 🚀 SISTEMA ASAAS - MODO PRODUÇÃO ATIVO

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Modo Produção Ativado**

- ✅ `asaasService.ts`: `IS_PRODUCTION = true`
- ✅ `vite.config.ts`: Proxy apontando para `https://www.asaas.com/api/v3`
- ✅ API Real do Asaas configurada

### 2. **Split Automático de Membros (70/30)**

- ✅ Funcionamento: Quando um usuário se torna membro
- ✅ Sistema cria cobrança PIX com split automático
- ✅ Ao pagar:
  - **70% (R$ 6,93)** → Carteira do Criador (IMEDIATO)
  - **30% (R$ 2,97)** → Carteira da Plataforma (IMEDIATO)
- ✅ Status: "Liquidado via Split"
- ✅ Implementado em: `services/subscriptionService.ts`

### 3. **Monetização Mensal (50/50) - NOVO! 🎉**

- ✅ Views acumulam durante o mês
- ✅ Sistema calcula: `views × CPV × 50%` (parte do criador)
- ✅ No dia **05 de cada mês**:
  - Transferência automática via Asaas
  - Views marcadas como pagas
  - Histórico atualizado
- ✅ Implementado em: `services/monthlyPayoutService.ts`

---

## 📋 CONFIGURAÇÃO NECESSÁRIA

### Passo 1: Configurar API Key e Wallet ID

No **Painel Admin da sua plataforma**, configure:

```javascript
// LocalStorage (configurado via painel admin)
localStorage.setItem('fairstream_asaas_key', 'SUA_API_KEY_DE_PRODUCAO');
localStorage.setItem('fairstream_asaas_wallet_id', 'SEU_WALLET_ID_DA_PLATAFORMA');
```

**Suas credenciais:**

- API Key: `$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY...`
- Wallet ID: `3eb2914f-0766-43e5-ae25-bba3b90199f3`

### Passo 2: Criar Subcontas para Criadores

**Opção A: Manual** (Recomendado para começar)

1. Acesse: <https://www.asaas.com>
2. Vá em: **Contas** → **Subcontas**
3. Crie uma subconta para cada criador
4. Anote o **Wallet ID** de cada um
5. Configure no perfil do criador: `creator.asaasWalletId = "WALLET_ID"`

**Opção B: Automática** (Experimental)

- O sistema já tenta criar subcontas automaticamente
- Mas em produção o Asaas é rigoroso com validações:
  - CPF tem que ser válido
  - Telefone tem que estar no formato correto
  - Email tem que ser único

### Passo 3: Validar Dados dos Criadores

Para que o sistema funcione, cada criador precisa ter:

- ✅ `asaasWalletId` (ID da subconta dele)
- ✅ CPF válido (obrigatório em produção)
- ✅ Telefone válido: formato `(DDD) 9XXXX-XXXX`
- ✅ Email único

---

## 🗓️ SISTEMA DE PAGAMENTO MENSAL AUTOMÁTICO

### Como funciona

#### Durante o mês

1. Vídeos geram views
2. Sistema calcula pendente: `unpaidViews × R$ 0,20 × 50%`
3. Aparece no dashboard: "Receita Pendente - Paga dia 05"

#### No dia 05 (às 00:00)

1. Sistema detecta que é dia 05
2. Coleta todos os criadores com saldo pendente
3. Para cada criador:
   - Cria transferência via `asaasService.createTransfer()`
   - Marca views como pagas (`paidViews = views`)
   - Registra no histórico
   - Atualiza dashboard

#### Ativação

**Modo Automático** (Produção):

```typescript
// No arquivo: services/monthlyPayoutService.ts
// Descomente a última linha:
monthlyPayoutService.scheduleAutomaticPayout();
```

**Modo Manual** (Para testes):

```javascript
// No console do navegador ou painel admin:
import { monthlyPayoutService } from './services/monthlyPayoutService';
const result = await monthlyPayoutService.processAllMonthlyPayouts();
console.log(result);
```

---

## 🧪 COMO TESTAR EM PRODUÇÃO

### ⚠️ IMPORTANTE: Comece com valores pequenos

### Teste 1: Split de Membros (70/30)

1. **Prepare um criador de teste:**
   - Crie uma subconta no Asaas
   - Configure o `asaasWalletId` no perfil
   - Verifique se tem CPF/telefone válidos

2. **Faça uma assinatura de teste:**
   - Vá no canal do criador
   - Clique em "Seja Membro"
   - Pague com PIX **R$ 1,00** (teste)

3. **Verifique no Asaas:**
   - Entre no painel: <https://www.asaas.com>
   - Vá em "Transações"
   - Confirme que o split foi feito:
     - R$ 0,70 → Criador
     - R$ 0,30 → Plataforma

4. **Verifique no dashboard do criador:**
   - Deve aparecer: "Receita Bruta: R$ 0,70"
   - Status: "Liquidado via Split"

### Teste 2: Monetização Mensal (50/50)

1. **Simule views:**
   - Crie um vídeo do criador
   - Gere 10 views (manual ou automático)
   - Sistema calcula: `10 × R$ 0,20 × 50% = R$ 1,00`

2. **Verifique dashboard:**
   - Deve aparecer: "Receita Pendente: R$ 1,00"
   - Data de pagamento: "05/[próximo mês]"

3. **Execute pagamento manualmente** (não espere dia 05):

   ```javascript
   // No console:
   await monthlyPayoutService.processAllMonthlyPayouts();
   ```

4. **Verifique no Asaas:**
   - Deve aparecer uma transferência de R$ 1,00
   - Destino: Wallet do criador
   - Descrição: "Monetização [mês]/[ano] - 10 views"

5. **Verifique dashboard:**
   - "Receita Pendente" deve zerar
   - "Total Já Pago" deve aumentar em R$ 1,00

---

## 📊 FLUXO COMPLETO DE DINHEIRO

### Membros (R$ 9,90/mês)

```
Usuário paga R$ 9,90 via PIX
    ↓
Asaas recebe e divide automaticamente
    ↓
R$ 6,93 → Criador (70%) ✅ IMEDIATO
R$ 2,97 → Plataforma (30%) ✅ IMEDIATO
    ↓
Dashboard atualiza: "Receita Bruta +R$ 6,93"
```

### Monetização (Views)

```
Vídeo gera 1000 views durante Janeiro
    ↓
Sistema calcula: 1000 × R$ 0,20 = R$ 200
    ↓
Split: R$ 100 criador + R$ 100 plataforma
    ↓
Dashboard mostra: "Receita Pendente: R$ 100"
    ↓
Dia 05/Fevereiro às 00:00:
    ↓
Sistema cria transferência via Asaas
    ↓
R$ 100 → Criador ✅ TRANSFERIDO
    ↓
Dashboard atualiza: "Total Já Pago +R$ 100"
```

---

## 🔐 SEGURANÇA E VALIDAÇÕES

### Antes de ir ao ar

- [ ] Testar com valores muito pequenos primeiro (R$ 1,00)
- [ ] Confirmar que splits estão corretos (70/30 e 50/50)
- [ ] Verificar webhooks do Asaas (se estiver usando)
- [ ] Ter plano de rollback pronto
- [ ] Documentar TODAS as transações

### Monitoramento

```javascript
// Verificar pagamentos pendentes:
monthlyPayoutService.getPendingMonetizationPayouts();

// Ver histórico de pagamentos:
monthlyPayoutService.getPayoutHistory('creator_id');

// Verificar se hoje é dia de pagamento:
monthlyPayoutService.isTodayPayoutDay(); // true se for dia 05
```

---

## ⚠️ TROUBLESHOOTING

### Erro: "A chave de API informada não pertence a este ambiente"

**Causa:** API Key é de sandbox, não de produção
**Solução:** Use a API Key que começa com `$aact_prod_...`

### Erro: "CPF inválido"

**Causa:** Em produção, Asaas valida CPF real
**Solução:** Use CPFs verdadeiros ou gere CPFs válidos

### Erro: "Wallet ID não encontrado"

**Causa:** Criador não tem `asaasWalletId` configurado
**Solução:** Crie subconta no Asaas e configure o Wallet ID

### Transferência não aparece no Asaas

**Causa:** Pode ter falhado silenciosamente
**Solução:** Verifique console do navegador para erros

### Pagamento mensal não executou no dia 05

**Causa:** Agendamento não está ativo
**Solução:** Descomente a linha final em `monthlyPayoutService.ts`

---

## 🆘 EM CASO DE EMERGÊNCIA

### Se algo der errado

1. **PAUSAR NOVOS PAGAMENTOS** imediatamente
2. **Reverter para Sandbox:**

   ```typescript
   // asaasService.ts
   const IS_PRODUCTION = false;
   
   // vite.config.ts
   target: 'https://sandbox.asaas.com/api/v3'
   ```

3. **Verificar transações no painel Asaas:**
   <https://www.asaas.com> → Transações
4. **Contatar suporte do Asaas:**
   <suporte@asaas.com>

---

## 📞 CONTATOS E RECURSOS

**Documentação Asaas:** <https://docs.asaas.com>  
**Painel Asaas:** <https://www.asaas.com>  
**Suporte Asaas:** <suporte@asaas.com>

**Arquivos modificados:**

- `services/asaasService.ts` (IS_PRODUCTION = true, createTransfer)
- `services/monthlyPayoutService.ts` (NOVO! Pagamentos automáticos)
- `vite.config.ts` (Proxy para produção)

---

## ✅ CHECKLIST FINAL

Antes de colocar no ar:

- [ ] API Key e Wallet ID configurados no localStorage
- [ ] Criadores têm subcontas criadas no Asaas
- [ ] Wallet IDs configurados nos perfis
- [ ] Teste com R$ 1,00 realizado e confirmado
- [ ] Split 70/30 funcionando corretamente
- [ ] Transferência mensal testada manualmente
- [ ] Agendamento automático ativado (se desejar)
- [ ] Logs habilitados para auditoria
- [ ] Plano de contingência pronto
- [ ] Time avisado e preparado

---

**Status:** 🟢 **PRONTO PARA PRODUÇÃO**

**Próximo passo:** Testar com pagamento real de R$ 1,00 →

Monitore atentamente os primeiros pagamentos! 🎯
