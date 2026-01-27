# 📺 FAIRSTREAM AI - DOCUMENTAÇÃO COMPLETA DA PLATAFORMA

---

## 🎯 VISÃO GERAL

**FairStream AI** é uma plataforma de streaming de vídeos inspirada no YouTube, com foco em:

- **Monetização justa** para criadores de conteúdo
- **Sistema de anúncios** com campanhas de texto e imagem
- **Pagamentos integrados** via Pix e Asaas (Split)
- **IA integrada** para recomendações e geração de conteúdo
- **Sistema de membros/assinaturas** para canais

---

## 👥 TIPOS DE USUÁRIOS

### 1. **Espectador (Viewer)**

- Assiste vídeos
- Comenta e curte
- Se inscreve em canais
- Apoia criadores via Pix
- Pode virar membro de canais pagos

### 2. **Criador (Creator)**

- Faz upload de vídeos
- Gerencia seu canal
- Recebe monetização (50% dos anúncios)
- Oferece membros (recebe 70%)
- Recebe apoios/doações Pix (100%)

### 3. **Anunciante (Advertiser)**

- Cria campanhas de anúncios
- Compra impressões
- Acompanha métricas (cliques, visualizações)
- Pode criar anúncios de TEXTO ou IMAGEM

### 4. **Administrador (Owner/Admin)**

- Aprova/rejeita campanhas de anúncios
- Gerencia criadores (verificação, status)
- Visualiza relatórios financeiros globais
- Configura preços e regras da plataforma

---

## 🗂️ ESTRUTURA DE PÁGINAS

### 📍 PÁGINAS PÚBLICAS

#### 1. **Home (`/`)**

- Feed principal com vídeos
- Categorias: Tecnologia, Design, Música, Jogos, Notícias, etc.
- Anúncios intercalados entre vídeos
- Modo compacto/expandido
- Barra de pesquisa inteligente

#### 2. **Em Alta (`/trending`)**

- Vídeos mais populares
- Ordenados por visualizações

#### 3. **Histórico (`/history`)**

- Vídeos assistidos pelo usuário
- Requer login

#### 4. **Watch (`/watch/:id`)**

- Player de vídeo
- Comentários
- Botões: Curtir, Compartilhar, Apoiar, Denunciar
- Anúncios no player (banner overlay)
- Modal de Membro
- Modal de Apoio Pix

#### 5. **Canal (`/channel/:id`)**

- Perfil do criador
- Vídeos do canal
- Botão Inscrever/Membro
- Estatísticas públicas

#### 6. **Autenticação (`/auth`)**

- Login/Registro
- Escolha de tipo de conta

---

### 🎬 PÁGINAS DO CRIADOR

#### 7. **Dashboard do Criador (`/dashboard`)**

- Estatísticas do canal
- Receita pendente vs recebida
- Lista de vídeos
- Gráficos de performance
- Membros ativos
- Apoiadores recentes

#### 8. **Upload de Vídeo (`/upload`)**

- Upload de arquivo de vídeo
- Título, descrição, tags
- Seleção de thumbnail (upload ou IA)
- Geração automática de capítulos (IA)
- Configurações de monetização

#### 9. **Painel Financeiro do Criador (`/creator-financial`)**

- Receita detalhada por fonte:
  - Monetização (ads) - 50%
  - Membros - 70%
  - Apoios Pix - 100%
- Histórico de pagamentos
- Próximo repasse

#### 10. **Pagamentos do Criador (`/creator-payments`)**

- Histórico de saques
- Status de cada pagamento
- Filtros por período

#### 11. **Caixa de Entrada (`/creator-inbox`)**

- Mensagens de anunciantes
- Mensagens do admin
- Notificações

#### 12. **Comentários dos Vídeos (`/creator-comments`)**

- Todos os comentários
- Moderação (fixar, excluir, bloquear)
- Denúncias

#### 13. **Configurações Financeiras (`/finance-settings`)**

- Chave Pix
- Token Mercado Pago
- Asaas SubAccount

#### 14. **Transmissão ao Vivo (`/creator-live`)**

- Interface para lives
- Chave de stream

---

### 📢 PÁGINAS DO ANUNCIANTE

#### 15. **Dashboard do Anunciante (`/advertiser`)**

- Criar nova campanha
- Lista de campanhas ativas
- Métricas: impressões, cliques, CTR
- Compra de créditos
- Histórico de transações

---

### 🛡️ PÁGINAS DO ADMINISTRADOR

#### 16. **Painel do Dono (`/admin`)**

- Visão geral da plataforma
- Usuários, criadores, anunciantes
- Aprovação de anúncios
- Relatórios financeiros
- Denúncias
- Avisos globais
- Repasses (pagamentos para criadores)
- Configurações gerais

#### 17. **Status dos Criadores (`/admin/creator-status`)**

- Verificação de criadores
- Aprovação/rejeição
- Bloqueio de contas

#### 18. **Seed de Perfis (`/admin/seed-profiles`)**

- Criação de perfis de teste
- Popular banco de dados

#### 19. **Configuração de Preços (`/finance-prices`)**

- Preços por 100k, 500k, 1M impressões
- Preço de Home vs Vídeo

#### 20. **Anunciantes & Saldos (`/finance-advertisers`)**

- Lista de anunciantes
- Saldos de impressões

---

### ⚙️ OUTRAS PÁGINAS

#### 21. **Canais Bloqueados (`/blocked-channels`)**

- Gerenciar canais bloqueados

#### 22. **Canais Ignorados (`/ignored-channels`)**

- Canais removidos das recomendações

#### 23. **Regras da Comunidade (`/rules`)**

- Termos e políticas

#### 24. **Verificação (`/verification`)**

- Solicitar selo de verificação

#### 25. **Monetização (`/monetization`)**

- Explicação do programa de monetização

---

## 🔘 BOTÕES E FUNCIONALIDADES DETALHADAS

### 🏠 **HOME PAGE**

| Botão/Elemento | Localização | Função |
|----------------|-------------|--------|
| **Logo FairStream** | Header esquerdo | Voltar para Home |
| **Barra de Pesquisa** | Header centro | Buscar vídeos, canais, tags |
| **Microfone** | Header (pesquisa) | Pesquisa por voz (futuro) |
| **Idioma (PT/EN)** | Header direita | Trocar idioma |
| **Tema (Sol/Lua)** | Header direita | Modo claro/escuro |
| **Fazer Login** | Header direita | Abre página de autenticação |
| **Avatar (logado)** | Header direita | Menu do usuário |
| **Compactar** | Canto direito | Alterna modo grid compacto |
| **Categorias** | Abaixo header | Filtra vídeos por categoria |
| **Card de Vídeo** | Feed | Clica para assistir |
| **Avatar do Criador** | Card | Vai para canal |
| **Menu (3 pontos)** | Card (hover) | Bloquear/Ignorar canal |
| **Anúncio (PATROCINADO)** | Entre vídeos | Clica para ir ao site do anunciante |

---

### 📺 **WATCH PAGE (Assistir Vídeo)**

| Botão/Elemento | Localização | Função |
|----------------|-------------|--------|
| **Player de Vídeo** | Centro | Controles de reprodução |
| **Fullscreen** | Player | Tela cheia |
| **Capítulos** | Player | Pular para seção |
| **👍 Curtir** | Abaixo vídeo | Adiciona like |
| **📤 Compartilhar** | Abaixo vídeo | Abre modal com opções |
| **💰 Apoiar** | Abaixo vídeo | Abre modal Pix |
| **🚩 Denunciar** | Abaixo vídeo | Reportar vídeo |
| **🔔 Inscrever-se** | Lado direito | Inscreve no canal |
| **👑 Seja Membro** | Lado direito | Abre modal de assinatura |
| **Comentar** | Seção comentários | Envia comentário |
| **✈️ (Send)** | Campo comentário | Posta comentário |
| **Responder** | Comentário | Responde ao comentário |
| **Fixar** | Comentário (dono) | Fixa comentário no topo |
| **Excluir** | Comentário (dono) | Remove comentário |
| **Bloquear** | Comentário | Bloqueia usuário |
| **Vídeos Relacionados** | Lateral direita | Sugestões de vídeos |

---

### 💰 **MODAL APOIAR (PIX)**

| Botão/Elemento | Função |
|----------------|--------|
| **R$ 1,00 / R$ 5,00 / R$ 10,00 / R$ 20,00** | Seleciona valor da doação |
| **QR Code** | Escanear para pagar |
| **Chave Pix** | Texto copiável da chave |
| **📋 Copiar** | Copia chave Pix |
| **Já fiz o Pix** | Confirma pagamento |
| **Voltar** | Retorna à seleção de valor |
| **X (Fechar)** | Fecha modal |

---

### 👑 **MODAL MEMBRO (ASSINATURA)**

| Botão/Elemento | Função |
|----------------|--------|
| **Valor Mensal** | Exibe preço da assinatura |
| **Benefícios** | Lista vantagens de ser membro |
| **Confirmar Assinatura** | Processa pagamento via Asaas |
| **QR Code Pix** | Pagar assinatura |
| **Cancelar** | Fecha modal |

---

### 📤 **MODAL COMPARTILHAR**

| Botão/Elemento | Função |
|----------------|--------|
| **Facebook** | Compartilha no Facebook |
| **Twitter** | Compartilha no Twitter |
| **WhatsApp** | Compartilha no WhatsApp |
| **URL** | Link do vídeo |
| **Copiar** | Copia URL para área de transferência |
| **X (Fechar)** | Fecha modal |

---

### 🎬 **DASHBOARD DO CRIADOR**

| Botão/Elemento | Localização | Função |
|----------------|-------------|--------|
| **Receita Pendente** | Card superior | Total a receber |
| **Receita Recebida** | Card superior | Total já pago |
| **Total Visualizações** | Card superior | Views totais |
| **Total Inscritos** | Card superior | Assinantes |
| **Monetização (Mês)** | Card superior | Ganhos do mês |
| **Últimos Vídeos** | Lista | Seus vídeos recentes |
| **Editar Vídeo** | Cada vídeo | Abre edição |
| **Excluir Vídeo** | Cada vídeo | Remove vídeo |
| **Ver Estatísticas** | Cada vídeo | Analytics do vídeo |
| **Membros Ativos** | Seção | Lista de membros |
| **Apoiadores Pix** | Seção | Doações recebidas |

---

### 📢 **DASHBOARD DO ANUNCIANTE**

| Botão/Elemento | Função |
|----------------|--------|
| **➕ Nova Campanha** | Abre formulário de criação |
| **Tipo: Texto/Imagem** | Escolhe formato do anúncio |
| **Local: Home/Vídeo** | Define onde exibir |
| **Título** | Nome da campanha |
| **Descrição Desktop** | Texto para computadores |
| **Descrição Mobile** | Texto para celulares |
| **URL de Destino** | Link ao clicar no anúncio |
| **Banner (se imagem)** | Upload da imagem |
| **Categorias** | Tags de segmentação |
| **Criar Campanha** | Envia para aprovação |
| **Adicionar Créditos** | Compra impressões |
| **Ver Métricas** | Estatísticas da campanha |
| **Pausar/Ativar** | Controla campanha |
| **Excluir** | Remove campanha |

---

### 🛡️ **PAINEL DO DONO (ADMIN)**

#### Aba: Aprovação de Anúncios

| Botão | Função |
|-------|--------|
| **Visualizar** | Pré-visualiza anúncio |
| **Aprovar** | Ativa campanha |
| **Rejeitar** | Recusa campanha |
| **Enviar Mensagem** | Contata anunciante |

#### Aba: Relatórios Financeiros

| Elemento | Função |
|----------|--------|
| **Receita Bruta** | Total arrecadado |
| **Custos Operacionais** | Despesas da plataforma |
| **Lucro Líquido** | Receita - Custos |
| **Gráficos** | Visualização temporal |
| **Adicionar Custo** | Registra despesa |

#### Aba: Repasses

| Botão | Função |
|-------|--------|
| **Processar Repasses** | Paga criadores |
| **Histórico** | Lista de pagamentos |
| **Exportar** | Baixa relatório |

#### Aba: Denúncias

| Botão | Função |
|-------|--------|
| **Ver Denúncia** | Detalhes do report |
| **Remover Conteúdo** | Exclui vídeo/comentário |
| **Banir Usuário** | Bloqueia conta |
| **Ignorar** | Descarta denúncia |

#### Aba: Configurações

| Opção | Função |
|-------|--------|
| **Chave Asaas** | API de pagamentos |
| **Taxa da Plataforma** | Percentual de comissão |
| **Avisos Globais** | Mensagens para todos |

---

## 💰 SISTEMA DE MONETIZAÇÃO

### Fontes de Receita do Criador

| Fonte | Comissão Criador | Comissão Plataforma |
|-------|------------------|---------------------|
| **Monetização (Ads)** | 50% | 50% |
| **Membros/Assinaturas** | 70% | 30% |
| **Apoios Pix** | 100% | 0% |

### Fluxo de Pagamentos

1. **Anúncios**: Anunciante paga → Plataforma distribui 50% ao criador (mensal)
2. **Membros**: Espectador paga via Asaas → Split automático 70/30
3. **Apoio Pix**: Direto na chave do criador → 100% imediato

---

## 🛠️ SERVIÇOS TÉCNICOS

| Serviço | Função |
|---------|--------|
| `adService` | Gerencia campanhas e filas de anúncios |
| `asaasService` | Integração Asaas para pagamentos Split |
| `pixService` | Geração de QR Code Pix |
| `subscriptionService` | Gerencia membros/assinaturas |
| `videoService` | CRUD de vídeos |
| `authService` | Autenticação de usuários |
| `payoutService` | Repasses para criadores |
| `geminiService` | IA para geração de conteúdo |
| `searchEngine` | Busca inteligente |
| `messageService` | Sistema de mensagens |

---

## 🔐 INTEGRAÇÃO DE PAGAMENTOS

### **Asaas (Membros)**

- Split automático na cobrança
- 70% para criador, 30% plataforma
- QR Code Pix gerado automaticamente
- Webhook para confirmação

### **Pix Direto (Apoios)**

- Usa chave do criador
- QR Code gerado localmente
- Pagamento 100% direto
- Confirmação manual

---

## 📱 RESPONSIVIDADE

A plataforma é totalmente responsiva:

- **Desktop**: Layout completo com sidebar
- **Tablet**: Sidebar colapsável
- **Mobile**: Sidebar em menu hambúrguer

---

## 🎨 TEMAS

- **Dark Mode** (padrão): Fundo escuro, texto claro
- **Light Mode**: Fundo claro, texto escuro

---

## 🔔 NOTIFICAÇÕES

- Novos membros
- Doações recebidas
- Comentários
- Campanhas aprovadas/rejeitadas
- Mensagens do admin

---

## 📊 ANALYTICS

### Para Criadores

- Visualizações por vídeo
- Taxa de engajamento
- Receita por fonte
- Crescimento de inscritos

### Para Anunciantes

- Impressões
- Cliques
- CTR (Click-Through Rate)
- Custo por clique

### Para Admin

- Usuários ativos
- Receita total
- Custos operacionais
- Lucro líquido

---

**FairStream AI © 2025** - Plataforma de Streaming Justa e Transparente
