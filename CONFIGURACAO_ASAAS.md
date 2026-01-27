# ⚠️ IMPORTANTE: Configuração do Asaas em Produção

## ✅ Credenciais Configuradas

**API Key (Produção):**

```
$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjhlZDIzZTNlLTVhNzMtNGNhYy1hZTQ4LTRlNjNkZjkwMjE2ZDo6JGFhY2hfYWE1NzUxNGEtNTY0ZC00NGU1LWIyM2ItNjFlNjEyNmY5YjA4
```

**Wallet ID (Plataforma):**

```
3eb2914f-0766-43e5-ae25-bba3b90199f3
```

---

## 🚨 PROBLEMA ATUAL

O erro "A chave de API informada não pertence a este ambiente" acontece porque:

1. Você está tentando **criar uma nova conta** no Asaas através do sistema
2. Mas em **produção**, você não pode criar contas automaticamente
3. Você precisa usar contas que **já existem** no seu painel do Asaas

---

## 🔧 SOLUÇÃO

### Opção 1: Usar Pix Direto (Recomendado para agora)

O sistema já está configurado para usar **Pix direto** para membros e apoios.

**Como funciona:**

- Usuário clica em "Seja Membro" ou "Apoiar"
- Sistema gera QR Code Pix usando a chave Pix do criador
- Pagamento vai direto para o criador
- **NÃO usa o Asaas**

**Vantagens:**

- ✅ Funciona imediatamente
- ✅ Sem complicações
- ✅ 100% para o criador (apoios)
- ✅ Você controla o split manualmente

**Para ativar:**

- Já está ativo! Só precisa configurar a chave Pix de cada criador no perfil

---

### Opção 2: Usar Asaas com Split (Mais complexo)

Para usar o Asaas com split automático 70/30, você precisa:

#### Passo 1: Criar Subcontas no Asaas

1. Acesse: <https://www.asaas.com>
2. Vá em "Contas" > "Subcontas"
3. Crie uma subconta para cada criador
4. Anote o **Wallet ID** de cada subconta

#### Passo 2: Configurar no Sistema

1. Para cada criador, adicione o `asaasWalletId` no perfil
2. Exemplo:

```javascript
creator.asaasWalletId = "abc123-def456-ghi789"
```

#### Passo 3: Reativar o membershipPaymentService

1. Descomentar o import no `Watch.tsx` e `ChannelPage.tsx`
2. Usar as funções do `membershipPaymentService`

---

## 📊 Comparação

| Recurso | Pix Direto | Asaas Split |
|---------|------------|-------------|
| **Configuração** | Simples | Complexa |
| **Apoios** | ✅ 100% criador | ✅ 100% criador |
| **Membros** | ✅ Funciona | ✅ Split 70/30 automático |
| **Monetização** | ❌ Manual | ✅ Automático |
| **Precisa Asaas?** | ❌ Não | ✅ Sim |

---

## 🎯 Recomendação

**Para começar agora:**

1. Use **Pix Direto** (já está funcionando)
2. Configure a chave Pix de cada criador
3. Teste apoios e membros

**Para o futuro:**

1. Crie subcontas no Asaas para cada criador
2. Configure os Wallet IDs
3. Ative o split automático

---

## 🔍 Como Testar Agora

1. **Acesse:** <http://localhost:3002>
2. **Vá em qualquer vídeo**
3. **Clique em "Apoiar"**
4. **Escolha R$ 5**
5. **Veja o QR Code gerado**

Se aparecer o QR Code, está funcionando! 🎉

---

## 📝 Notas

- ✅ API Key de produção está configurada
- ✅ Wallet ID da plataforma está configurado
- ✅ Sistema está em modo PRODUÇÃO
- ⚠️ Pix Direto está ativo (não usa Asaas para pagamentos)
- 🔜 Para usar Asaas Split, precisa criar subcontas primeiro

---

## 🆘 Se Precisar de Ajuda

1. **Erro ao criar conta:** Normal em produção, use Pix Direto
2. **QR Code não aparece:** Verifique se o criador tem chave Pix configurada
3. **Split não funciona:** Precisa criar subcontas no Asaas primeiro
