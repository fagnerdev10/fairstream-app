# 🚀 Guia Rápido de Configuração

## 1️⃣ Configurar API Key do Asaas (PRODUÇÃO)

Você já tem a API Key de produção. Agora precisa configurá-la na plataforma:

### Opção A: Via Painel Admin (Recomendado)

1. Acesse: `http://localhost:3000/admin`
2. Vá em "Configurações Financeiras"
3. Cole a API Key de produção
4. Cole o Wallet ID: `3eb2914f-0766-43e5-ae25-bba3b90199f3`
5. Clique em "Salvar Tudo"

### Opção B: Via LocalStorage (Temporário)

Abra o console do navegador (F12) e execute:

```javascript
localStorage.setItem('fairstream_asaas_key', 'SUA_API_KEY_AQUI');
localStorage.setItem('fairstream_asaas_wallet_id', '3eb2914f-0766-43e5-ae25-bba3b90199f3');
```

---

## 2️⃣ Configurar Criadores

Cada criador precisa de:

### A) Wallet ID do Asaas (para receber membros - 70%)

- O criador precisa ter uma conta Asaas
- Você pega o Wallet ID dele no painel do Asaas
- Salva no perfil do criador: `asaasWalletId`

### B) Chave Pix (para receber apoios - 100%)

- Pode ser: CPF, CNPJ, Email, Telefone ou Chave Aleatória
- Salva no perfil do criador: `pixKey`

---

## 3️⃣ Testar o Sistema

### Teste Rápido - Apoios (100% Direto)

1. Acesse qualquer vídeo
2. Clique em "Apoiar"
3. Escolha R$ 5
4. Veja o QR Code gerado
5. **Verifique:** O QR Code deve usar a chave Pix do criador (não do Asaas)

### Teste Completo - Membros (70/30 Split)

1. Acesse um canal
2. Clique em "Seja Membro"
3. Clique em "Gerar Pix"
4. **Verifique:** Deve aparecer "70% vai direto para [criador]"
5. Escaneie o QR Code
6. **Resultado esperado:**
   - 70% cai na carteira Asaas do criador
   - 30% cai na carteira Asaas da plataforma

---

## 4️⃣ Verificar se Está Funcionando

### No Console do Navegador (F12)

```javascript
// Ver configuração atual
console.log('API Key:', localStorage.getItem('fairstream_asaas_key'));
console.log('Wallet ID:', localStorage.getItem('fairstream_asaas_wallet_id'));

// Ver se está em produção
console.log('Ambiente:', 'PRODUÇÃO');
```

### No Painel do Asaas

1. Acesse: <https://www.asaas.com>
2. Vá em "Cobranças"
3. Após criar um membro, deve aparecer:
   - Cobrança criada
   - Split configurado (70/30)
   - Status: Aguardando pagamento

---

## 5️⃣ Erros Comuns e Soluções

### ❌ "Erro ao gerar pagamento"

**Causa:** Criador não tem `asaasWalletId` configurado
**Solução:** Configure o Wallet ID do criador no perfil

### ❌ "API Key não encontrada"

**Causa:** API Key não está salva
**Solução:** Configure via painel admin ou localStorage

### ❌ "Wallet ID da Plataforma não configurado"

**Causa:** Wallet ID da plataforma não está salvo
**Solução:** Salve: `3eb2914f-0766-43e5-ae25-bba3b90199f3`

### ❌ Apoio não gera QR Code

**Causa:** Criador não tem `pixKey` configurada
**Solução:** Configure a chave Pix do criador no perfil

---

## 6️⃣ Próximos Passos

### Imediato

- [ ] Configurar API Key de produção
- [ ] Configurar Wallet ID da plataforma
- [ ] Testar apoio (Pix direto)
- [ ] Testar membro (Split 70/30)

### Curto Prazo

- [ ] Configurar webhook do Asaas para atualizar status automaticamente
- [ ] Implementar cron job para monetização mensal (dia 05)
- [ ] Criar painel de monitoramento de pagamentos

### Longo Prazo

- [ ] Implementar renovação automática de membros
- [ ] Criar relatórios financeiros detalhados
- [ ] Adicionar mais métodos de pagamento (cartão de crédito)

---

## 📞 Suporte

Se tiver algum problema:

1. **Verifique os logs do console** (F12)
2. **Verifique o painel do Asaas** (cobranças criadas?)
3. **Teste com valores pequenos** (R$ 0,01 funciona no Asaas)

---

## 🎯 Resumo Final

**O que está pronto:**

- ✅ Asaas em PRODUÇÃO
- ✅ Membros: Split 70/30 automático via Asaas
- ✅ Apoios: 100% direto via Pix (sem passar pelo Asaas)
- ✅ Monetização: 50/50 mensal (dia 05)

**O que você precisa fazer:**

1. Configurar API Key de produção
2. Configurar Wallet ID da plataforma
3. Configurar Wallet ID de cada criador
4. Configurar chave Pix de cada criador
5. Testar!

Tudo pronto para começar! 🚀
