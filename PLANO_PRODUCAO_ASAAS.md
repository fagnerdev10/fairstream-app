# 🚀 PLANO DE IMPLEMENTAÇÃO - ASAAS PRODUÇÃO

## 📋 Objetivo

Migrar do ambiente SANDBOX para PRODUÇÃO com dinheiro real, implementando:

1. **Split Automático de Assinaturas** (70% Criador / 30% Plataforma)
2. **Monetização Acumulada** (50% Criador / 50% Plataforma) com pagamento automático dia 05

---

## 🎯 Estrutura Atual (Sandbox)

### ✅ O que já funciona

- ✅ Criação de clientes no Asaas
- ✅ Geração de cobranças PIX
- ✅ Split automático configurado (70/30 membros, 50/50 monetização)
- ✅ Sistema de acumulação de monetização (views)
- ✅ Dashboard financeiro do criador
- ✅ Webhook handling básico

### ⚠️ O que precisa ser ajustado

- ⚠️ Mudança de ambiente: SANDBOX → PRODUÇÃO
- ⚠️ Validação de CPF/telefone real (Asaas produção é mais rigoroso)
- ⚠️ Sistema de pagamento automático mensal (dia 05)
- ⚠️ Webhooks de confirmação de pagamento
- ⚠️ Logs de transações para auditoria

---

## 🔧 Componentes a Implementar

### 1. Configuração de Produção

**Arquivo:** `services/asaasConfig.ts`

```typescript
export const ASAAS_CONFIG = {
    API_KEY: "", // Será lido do localStorage (painel admin)
    WALLET_ID: "", // ID da carteira da plataforma
    IS_PRODUCTION: true, // ATIVAR PRODUÇÃO
    PRODUCTION_API_URL: "https://www.asaas.com/api/v3",
    SANDBOX_API_URL: "https://sandbox.asaas.com/api/v3"
};
```

**Arquivo:** `vite.config.ts`

```typescript
'/api/asaas': {
    target: 'https://www.asaas.com/api/v3', // MUDAR PARA PRODUÇÃO
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/asaas/, ''),
    secure: true
}
```

---

### 2. Sistema de Split Automático (Membros 70/30)

**Como funciona:**

1. Usuário clica em "Seja Membro"
2. Sistema cria cobrança PIX no Asaas com split:
   - `walletId` do criador: 70%
   - `walletId` da plataforma: 30% (automático)
3. Ao pagar o PIX:
   - Asaas divide automaticamente
   - 70% cai na carteira do criador
   - 30% fica na carteira da plataforma
4. Status atualizado via webhook

**Validações importantes:**

- ✅ Criador precisa ter `asaasWalletId` configurado
- ✅ Cliente precisa ter CPF válido (produção valida)
- ✅ Telefone precisa estar no formato correto (DDD + 9 dígitos)

---

### 3. Sistema de Monetização (50/50 + Pagamento Mensal)

**Como funciona:**

#### Durante o mês

1. Vídeos geram views
2. Sistema calcula: `views × CPV × 50%` (parte do criador)
3. Valor acumula no campo `pending` do dashboard
4. Status: "Pendente - Aguardando dia 05"

#### No dia 05

1. Sistema executa cron job automático
2. Para cada criador com saldo pendente:
   - Cria transferência Asaas (50% do total de ads)
   - Marca views como pagas (`paidViews = views`)
   - Atualiza status para "Liquidado"
3. Criador recebe na carteira Asaas
4. Plataforma fica com os outros 50%

**Arquivo:** `services/monthlyPayoutService.ts` (NOVO)

---

### 4. Webhooks do Asaas

**Eventos importantes:**

- `PAYMENT_RECEIVED`: PIX foi pago
- `PAYMENT_CONFIRMED`: Pagamento confirmado
- `PAYMENT_OVERDUE`: Pagamento venceu
- `TRANSFER_COMPLETED`: Transferência concluída

**Endpoint:** `/api/webhooks/asaas` (backend)

---

### 5. Validação de Dados em Produção

**CPF:**

- Deve ser válido (dígitos verificadores corretos)
- Não pode ser CPF de teste (111.111.111-11, etc)

**Telefone:**

- Formato: (DDD) 9XXXX-XXXX
- Exemplo: (11) 98765-4321
- API espera: `11987654321`

**Email:**

- Domínio real (não `@sandbox.asaas.com`)
- Único por conta

---

## 🗓️ Sistema de Pagamento Automático (Dia 05)

### Opção 1: Cron Job (Node.js)

```javascript
// Executa todo dia às 00:00
cron.schedule('0 0 * * *', async () => {
    const today = new Date();
    if (today.getDate() === 5) {
        await processMonthlyPayouts();
    }
});
```

### Opção 2: Serverless Function (Vercel/Netlify)

- Agendar função para rodar dia 05 de cada mês
- Processar todos os pagamentos pendentes

### Opção 3: Manual (Temporário para testes)

- Botão no painel admin: "Processar Pagamentos Mensais"
- Admin clica dia 05 para liberar repasses

---

## 📊 Fluxo Completo de Pagamento

### Membros (70/30 - Imediato)

```
1. User paga R$ 9,90 via PIX
2. Asaas recebe e divide automaticamente:
   - R$ 6,93 → Carteira do Criador ✅
   - R$ 2,97 → Carteira da Plataforma ✅
3. Webhook atualiza status: "Liquidado via Split"
4. Aparece no dashboard do criador: "Receita Bruta"
```

### Monetização (50/50 - Mensal)

```
1. Vídeo gera 1000 views durante Janeiro
2. Sistema calcula: 1000 × R$ 0,20 = R$ 200 (total bruto)
3. Split: R$ 100 criador + R$ 100 plataforma
4. Status: "Pendente - Paga dia 05/Fev"
5. Dia 05/02:
   - Sistema transfere R$ 100 para o criador via Asaas
   - Marca views como pagas
   - Status: "Liquidado"
```

---

## 🔐 Segurança e Validações

### Antes de ativar PRODUÇÃO

- [ ] Testar TUDO em sandbox primeiro
- [ ] Validar splits estão corretos (70/30 e 50/50)
- [ ] Confirmar webhook está funcionando
- [ ] Verificar logs de erro
- [ ] Testar com valores pequenos primeiro (R$ 1,00)

### Em PRODUÇÃO

- [ ] Monitorar primeiro pagamento real
- [ ] Verificar se split foi aplicado corretamente
- [ ] Confirmar valores nas carteiras
- [ ] Teste com um criador confiável primeiro
- [ ] Documentar TODAS as transações

---

## 📝 Checklist de Implementação

### Fase 1: Configuração

- [ ] Atualizar `asaasService.ts` (IS_PRODUCTION = true)
- [ ] Atualizar `vite.config.ts` (proxy para produção)
- [ ] Configurar API Key de produção
- [ ] Configurar Wallet ID da plataforma
- [ ] Criar subcontas para criadores (manual ou automático)

### Fase 2: Membros (70/30)

- [ ] Validar criação de clientes em produção
- [ ] Testar geração de PIX com split
- [ ] Confirmar divisão automática funcionando
- [ ] Implementar webhook de confirmação
- [ ] Testar com pagamento real pequeno

### Fase 3: Monetização (50/50)

- [ ] Implementar serviço de pagamento mensal
- [ ] Criar cron job ou função agendada
- [ ] Testar acumulação de valores
- [ ] Testar transferência no dia 05
- [ ] Validar marcação de views como pagas

### Fase 4: Monitoramento

- [ ] Logs de todas as transações
- [ ] Dashboard de auditoria para admin
- [ ] Alertas de falha em pagamentos
- [ ] Relatório mensal de repasses

---

## ⚠️ IMPORTANTE - CHECKLIST FINAL

Antes de colocar no AR:

1. ✅ Ambiente sandbox funcionando 100%
2. ✅ Primeiro teste em produção com R$ 1,00
3. ✅ Confirmar split correto (70/30 e 50/50)
4. ✅ Webhook testado e funcionando
5. ✅ Logs habilitados para auditoria
6. ✅ Plano de rollback se algo der errado
7. ✅ Suporte do Asaas avisado (se necessário)

---

## 🆘 Plano de Contingência

Se algo der errado:

1. **Reverter para Sandbox** (IS_PRODUCTION = false)
2. **Pausar novos pagamentos**
3. **Verificar transações no painel Asaas**
4. **Contatar suporte do Asaas**
5. **Reembolsar manualmente se necessário**

---

## 📞 Contatos Importantes

**Suporte Asaas:** <suporte@asaas.com>
**Documentação:** <https://docs.asaas.com>
**Painel:** <https://www.asaas.com>

---

**Status Atual:** 🟡 Pronto para implementação
**Próximo Passo:** Implementar mudanças com cuidado e testar cada etapa
