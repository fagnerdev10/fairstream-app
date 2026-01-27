# 🔍 GUIA DE TESTE - BOTÕES DE COMENTÁRIOS

## ⚠️ IMPORTANTE: Recarregue a página!

Se os botões não estão aparecendo, você precisa **recarregar a página** no navegador para pegar as mudanças.

## 📋 Passo a Passo para Testar:

### 1️⃣ Abra o navegador
- URL: **http://localhost:3000**

### 2️⃣ Faça login (se não estiver logado)
- Clique em "Entrar" no canto superior direito
- Use qualquer email/senha (ex: `test@test.com` / `123456`)

### 3️⃣ Abra um vídeo
- Clique em qualquer vídeo da página inicial
- Ou acesse diretamente: **http://localhost:3000/watch/1**

### 4️⃣ **RECARREGUE A PÁGINA** (Ctrl + F5 ou Cmd + Shift + R)
- Isso é ESSENCIAL para pegar as mudanças!

### 5️⃣ Role até os comentários
- Eles estão logo abaixo do vídeo
- Ou na sidebar direita (se não estiver em modo foco)

### 6️⃣ Passe o mouse sobre um comentário
- **IMPORTANTE**: Os botões só aparecem ao passar o mouse!
- Você deve ver 3 pequenos ícones aparecerem no canto direito:
  - 🚩 (Bandeira) = Denunciar
  - 🚫 (Proibido) = Bloquear (só se você for o dono do vídeo)
  - 🗑️ (Lixeira) = Excluir (só se você for o dono do vídeo)

### 7️⃣ Teste cada botão:

#### Testar Denunciar (🚩):
1. Clique no ícone de bandeira
2. Deve aparecer um popup: "Deseja denunciar este comentário por abuso?"
3. Clique em "OK"
4. Deve aparecer: "Comentário denunciado! Nossa equipe irá revisar."
5. O comentário deve ganhar um badge vermelho "Denunciado"

#### Testar Excluir (🗑️):
1. Clique no ícone de lixeira
2. Deve aparecer: "Tem certeza que deseja excluir este comentário?"
3. Clique em "OK"
4. O comentário deve desaparecer

#### Testar Bloquear (🚫):
1. Clique no ícone de proibido
2. Deve aparecer: "Deseja bloquear este usuário? Seus comentários serão removidos."
3. Clique em "OK"
4. Deve aparecer: "Usuário bloqueado! Seus comentários foram removidos."
5. Todos os comentários daquele usuário devem desaparecer

## 🐛 Se ainda não funcionar:

### Verifique no Console do Navegador:
1. Pressione **F12** para abrir o DevTools
2. Vá na aba **Console**
3. Procure por erros em vermelho
4. **Me mande uma captura de tela** dos erros

### Verifique se está logado:
- Os botões de **Bloquear** e **Excluir** só aparecem se:
  - Você está logado
  - Você é o dono do vídeo
- O botão de **Denunciar** aparece para todos (mas precisa estar logado para funcionar)

### Verifique se o servidor está rodando:
- No terminal, deve aparecer: `VITE v6.4.1 ready in...`
- Se não estiver, rode: `npm run dev`

## 📸 Me envie:

Se ainda não funcionar, me envie:
1. **Captura de tela** da página de vídeo com os comentários
2. **Captura de tela** do Console do navegador (F12)
3. Diga se você está **logado** ou não
4. Diga se você é o **dono do vídeo** ou não

Assim posso te ajudar melhor! 🚀
