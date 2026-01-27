# Sistema de Pagamentos FairStream

## 📊 Visão Geral dos Fluxos de Pagamento

### 1. ✅ Membros (Assinaturas de Canal) - Split 70/30

**Fluxo:** Asaas Split Automático

- **Criador recebe:** 70% na hora
- **Plataforma recebe:** 30% na hora
- **Processamento:** Imediato via Split do Asaas
- **Status:** "Liquidado via Split"

**Como funciona:**

1. Usuário clica em "Seja Membro" no canal
2. Escolhe o plano (R$ 9,90/mês por padrão)
3. Gera QR Code Pix via Asaas
4. Ao pagar, o Asaas divide automaticamente:
   - 70% vai direto para a carteira do criador
   - 30% fica na carteira da plataforma
5. Ambos recebem na hora

---

### 2. ✅ Apoios (Doações) - 100% Direto

**Fluxo:** Pix Direto (SEM passar pelo Asaas)

- **Criador recebe:** 100% direto na chave Pix pessoal
- **Plataforma recebe:** 0% (sem taxas)
- **Processamento:** Pix P2P (pessoa para pessoa)
- **Status:** Não aparece no dashboard financeiro (é direto)

**Como funciona:**

1. Usuário clica em "Apoiar" no vídeo ou canal
2. Escolhe o valor (R$ 5, 10, 20, 50, 100 ou personalizado)
3. Sistema gera QR Code Pix usando a **chave Pix pessoal do criador**
4. Pagamento vai direto da conta do apoiador para a conta do criador
5. **NÃO passa pela plataforma nem pelo Asaas**
6. Criador vê o apoio na seção "Apoiadores (Pix)" do painel

---

### 3. 🕒 Monetização (Views) - Split 50/50 + Pagamento Mensal

**Fluxo:** Acumulação + Pagamento Automático Mensal

- **Criador recebe:** 50% acumulado
- **Plataforma recebe:** 50% acumulado
- **Processamento:** Pago automaticamente todo dia **05 de cada mês**
- **Status:** "Pendente" → "Liquidado" (após pagamento)

**Como funciona:**

1. Vídeos do criador geram views
2. Sistema calcula receita de anúncios (R$ 0,10 por view, exemplo)
3. Valor acumula durante o mês inteiro
4. **No dia 05 de cada mês:**
   - Sistema processa todos os pagamentos pendentes
   - Divide 50/50 entre criador e plataforma
   - Transfere automaticamente via Asaas
5. Criador vê no extrato: "Monetização - [Mês/Ano]"

---

## 🔧 Configuração Técnica

### Asaas (Produção)

- **API Key:** Configurada no painel admin
- **Wallet ID da Plataforma:** `3eb2914f-0766-43e5-ae25-bba3b90199f3`
- **Ambiente:** PRODUÇÃO ✅

### Chaves Pix dos Criadores

- Configuradas no perfil de cada criador
- Usadas APENAS para apoios diretos
- Não passam pelo Asaas

---

## 📅 Calendário de Pagamentos

| Tipo | Quando Recebe | Onde Aparece |
|------|---------------|--------------|
| **Membros** | Imediato (ao pagar) | Dashboard → Receita Bruta |
| **Apoios** | Imediato (direto no Pix) | Painel → Apoiadores (Pix) |
| **Monetização** | Dia 05 de cada mês | Dashboard → Receita Bruta |

---

## 🎯 Exemplo Prático

**Criador "João" em Janeiro/2026:**

1. **Membros:**
   - 10 membros pagam R$ 9,90 = R$ 99,00
   - João recebe: R$ 69,30 (70%) ✅ Imediato
   - Plataforma: R$ 29,70 (30%)

2. **Apoios:**
   - 5 apoios de R$ 20 = R$ 100,00
   - João recebe: R$ 100,00 (100%) ✅ Imediato no Pix
   - Plataforma: R$ 0,00

3. **Monetização:**
   - 10.000 views × R$ 0,10 = R$ 1.000,00
   - João recebe: R$ 500,00 (50%) 🕒 Dia 05/Fev
   - Plataforma: R$ 500,00 (50%)

**Total João em Janeiro:**

- Recebido imediato: R$ 169,30 (membros + apoios)
- A receber dia 05/Fev: R$ 500,00 (monetização)
- **Total do mês: R$ 669,30**

---

## 🔐 Segurança

- ✅ Apoios diretos: Sem intermediários, sem risco de retenção
- ✅ Splits automáticos: Asaas garante a divisão correta
- ✅ Pagamentos mensais: Processados automaticamente via cron job
- ✅ Transparência: Criador vê tudo no dashboard em tempo real

---

## 📝 Notas Importantes

1. **Apoios NÃO aparecem no "Receita Bruta"** porque não passam pela plataforma
2. **Membros e Monetização SIM aparecem** porque usam o Asaas
3. **Pagamento mensal é automático** - criador não precisa solicitar
4. **Sem taxa nos apoios** - 100% vai para o criador
5. **Taxas do Asaas** são pagas pela plataforma (já incluídas nos 30% e 50%)
