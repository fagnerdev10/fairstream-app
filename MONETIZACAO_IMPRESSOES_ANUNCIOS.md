# ✅ CORREÇÃO: MONETIZAÇÃO BASEADA EM IMPRESSÕES DE ANÚNCIOS

## 🎯 O QUE VOCÊ EXPLICOU (E ESTÁ CERTO!)

**Monetização é baseada em IMPRESSÕES DE ANÚNCIOS, não em views de vídeo!**

Exemplo:

```
Criador tem vídeos com 10.000 views (visualizações normais)
MAS teve 5.000 impressões de anúncios exibidas nesses vídeos
    ↓
5.000 impressões × R$ 0,20 = R$ 1.000 (total)
    ├─ R$ 500 (50%) → Criador
    └─ R$ 500 (50%) → Plataforma
```

---

## ✅ O QUE FOI IMPLEMENTADO AGORA

### 1. **Novos Campos no Tipo `Video`**

**Arquivo:** `types.ts`

```typescript
export interface Video {
  // ... outros campos ...
  
  views: number; // Views normais do vídeo
  
  // ✅ NOVOS CAMPOS PARA MONETIZAÇÃO
  adImpressions?: number; // Total de impressões de anúncios
  paidAdImpressions?: number; // Impressões já pagas
  paidViews?: number; // DEPRECATED
}
```

### 2. **Sistema de Tracking de Impressões**

**Arquivo:** `services/smartAdService.ts`

```typescript
trackSmartImpression: (campaignId: string, videoId?: string) => {
  // 1. Decrementa saldo do anunciante 
  // 2. ✅ Incrementa adImpressions no vídeo
  videos[videoIndex].adImpressions = (videos[videoIndex].adImpressions || 0) + 1;
}
```

**Quando usar:**

```typescript
// No componente VideoPlayer ou Watch:
smartAdService.trackSmartImpression(campaign.id, videoId);
//                                                  ^^^^^^^^ Passa o ID do vídeo
```

---

## 🔧 O QUE PRECISA SER ATUALIZADO

### 1. **Passar `videoId` ao chamar `trackSmartImpression`**

**Procure por:**

```typescript
smartAdService.trackSmartImpression(campaign.id)
```

**Substitua por:**

```typescript
smartAdService.trackSmartImpression(campaign.id, video.id)
```

**Arquivos que provavelmente precisam:**

- `pages/Watch.tsx`
- `components/VideoPlayer.tsx`
- `components/AdBanner.tsx` ou similar

### 2. **Atualizar Cálculos em `payoutService.ts`**

**Linha 229 - Substituir:**

```typescript
// ERRADO (usa views de vídeo):
const unpaidViews = Number(v.views || 0) - Number(v.paidViews || 0);

// CERTO (usa impressões de anúncios):
const totalAdImpressions = Number(v.adImpressions || 0);
const paidAdImpressions = Number(v.paidAdImpressions || 0);
const unpaidAdImpressions = totalAdImpressions - paidAdImpressions;
```

**Linha 246 - Atualizar cálculo:**

```typescript
// ERRADO:
const totalGenerated = unpaidViews * currentCPV;

// CERTO:
const totalGenerated = unpaidAdImpressions * currentCPV;
```

**Linha 260 - Atualizar summary:**

```typescript
// ADICIONAR campo:
{
    // ... outros campos ...
    adImpressionsCount: 0  // NOVO
}

// ATUALIZAR:
summary[creatorId].adImpressionsCount += unpaidAdImpressions;
```

### 3. **Atualizar `monthlyPayoutService.ts`**

**Função `getPendingMonetizationPayouts`:**

```typescript
// Substituir:
const unpaidViews = (video.views || 0) - (video.paidViews || 0);

// Por:
const unpaidAdImpressions = (video.adImpressions || 0) - (video.paidAdImpressions || 0);
```

**Função `markViewsAsPaid` → Renomear para `markAdImpressionsAsPaid`:**

```typescript
markAdImpressionsAsPaid: (creatorId: string) => {
    // ... código ...
    return {
        ...video,
        paidAdImpressions: video.adImpressions || 0
    };
}
```

---

## 📊 FLUXO CORRETO COMPLETO

```
1. ANUNCIANTE DEPOSITA
   R$ 5,00 → Plataforma Asaas
   
2. ANUNCIANTE COMPRA VIEWS
   R$ 5,00 ÷ R$ 0,20 = 25 impressões
   
3. ANÚNCIOS RODAM NOS VÍDEOS
   Vídeo A: 10 impressões
   Vídeo B: 8 impressões
   Vídeo C: 7 impressões
   Total: 25 impressões
   
4. SISTEMA REGISTRA (smartAdService.trackSmartImpression):
   - Decrementa saldo do anunciante (-25)
   - Incrementa adImpressions em cada vídeo
     * video.A.ad Impressions = 10
     * videoB.adImpressions = 8
     * videoC.adImpressions = 7
   
5. CÁLCULO DE MONETIZAÇÃO (payoutService):
   Para cada criador:
     - Soma: unpaidAdImpressions de todos os vídeos
     - Calcula: total × R$ 0,20 × 50%
   
6. PAGAMENTO DIA 05 (monthlyPayoutService):
   - Transfere 50% via Asaas
   - Marca: paidAdImpressions = adImpressions
   - Plataforma fica com 50%
```

---

## ✅ RESUMO DO QUE ESTÁ PRONTO

1. ✅ Tipo `Video` tem `adImpressions` e `paidAdImpressions`
2. ✅ `smartAdService.trackSmartImpression` incrementa `adImpressions`
3. ✅ Sistema de transferência via Asaas funcionando

## ⚠️ O QUE FALTA FAZER

1. ⚠️ Passar `videoId` ao chamar `trackSmartImpression`
2. ⚠️ Atualizar `payoutService.ts` para usar `adImpressions`
3. ⚠️ Atualizar `monthlyPayoutService.ts` para usar `adImpressions`

---

**Quer que eu faça essas 3 correções restantes agora?**

Ou você quer testar primeiro se o tracking de `adImpressions` está funcionando?

---

**Data:** 14/01/2026  
**Status:** 🟡 70% IMPLEMENTADO  
**Próximos passos:** Atualizar cálculos de monetização
