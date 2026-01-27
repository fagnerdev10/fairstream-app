import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// CONFIGURAÇÃO OFICIAL FAIR STREAM
const MP_CONFIG = {
    clientId: "1816534017966802",
    clientSecret: "sPC2g3zjaz85OpRDMXg4Q9e1TTVxR18v",
    publicKey: "APP_USR-50a9006b-ab9d-4406-ba28-e5002e14bd14",
    platformAccessToken: "APP_USR-1816534017966802-123020-7ddfccc1944e45fef38bcb26647ae32f-3102834096"
};

console.log("🚀 Servidor FairStream REAL Iniciado na porta", PORT);

// Endpoints

// 1. Trocar código OAuth pelo Token REAL do Criador
app.post('/api/mp/exchange-token', async (req, res) => {
    const { code, redirect_uri } = req.body;
    try {
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: MP_CONFIG.clientId,
            client_secret: MP_CONFIG.clientSecret,
            code: String(code),
            redirect_uri: redirect_uri,
        });

        const resp = await fetch("https://api.mercadopago.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });

        const data = await resp.json();
        if (!data.access_token) {
            debugLog("❌ Erro OAuth:", data);
            return res.status(400).json(data);
        }

        debugLog(`✅ Criador conectado! UserID: ${data.user_id}`);
        res.json(data);
    } catch (error) {
        debugLog('Erro OAuth:', error);
        res.status(500).json({ error: 'Erro ao trocar token' });
    }
});

// 2. Criar Pagamento com Split REAL (Abaixa o valor e transfere 70%)
app.post('/api/mp/create-payment', async (req, res) => {
    const { amount, creatorId, description, creatorAccountId, type } = req.body;
    try {
        // Cálculo da Taxa da Plataforma (30% para membership, 0% para donation)
        const feePercentage = type === 'donation' ? 0 : 0.30;
        const fee = Number((amount * feePercentage).toFixed(2));
        const sellerAmount = Number((amount - fee).toFixed(2));

        console.log(`💰 Processando Pagamento com Split Atômico (${type}): Total R$ ${amount}`);
        console.log(`   - Seller: R$ ${sellerAmount} (ID: ${creatorAccountId})`);
        console.log(`   - Platform Fee: R$ ${fee}`);

        const payload = {
            transaction_amount: Number(amount),
            description: description || "Assinatura FairStream",
            payment_method_id: "pix",
            payer: { email: "usuario@fairstream.com" },
            external_reference: `CREATOR_${creatorId}`
        };

        // Só faz o split (repasse direto) se for DOAÇÃO (100% para o criador)
        // Membros e Monetização ficam na conta da plataforma para repasse mensal no dia 05.
        if (type === 'donation' && String(creatorAccountId) !== String(MP_CONFIG.clientId)) {
            payload.disbursements = [
                {
                    amount: Number(amount), // 100% para o criador
                    collector_id: Number(creatorAccountId)
                }
            ];
            console.log(`⚡ Repasse DIRETO Ativado para Doação: R$ ${amount} -> ID ${creatorAccountId}`);
        } else {
            console.log(`🏦 Pagamento centralizado na Plataforma para repasse posterior (Tipo: ${type})`);
        }

        console.log("📤 Enviando Payload para MP:", JSON.stringify(payload, null, 2));

        debugLog("📤 Enviando Payload para MP:", payload);

        const resp = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${MP_CONFIG.platformAccessToken.trim()}`,
                'X-Idempotency-Key': `pay-${Date.now()}`
            },
            body: JSON.stringify(payload),
        });

        const payment = await resp.json();
        debugLog("🔍 Resposta Completa MP:", payment);

        if (payment.id) {
            debugLog(`✅ Pagamento Criado com Sucesso! ID: ${payment.id}`);
            res.json({
                success: true,
                id: payment.id,
                qrCode: `data:image/png;base64,${payment.point_of_interaction?.transaction_data?.qr_code_base64}`,
                pixCopyPaste: payment.point_of_interaction?.transaction_data?.qr_code,
                split: { creator: sellerAmount, platform: fee }
            });
        } else {
            debugLog("❌ Erro ao criar pagamento no Mercado Pago:", payment);
            res.status(400).json(payment); // Envia o erro original do MP via JSON
        }
    } catch (error) {
        debugLog("Erro no processamento do pagamento/split:", error);
        res.status(500).json({ error: error.message || 'Erro interno no servidor' });
    }
});

// 3. Monitoramento de Webhook (Auditoria e Suporte)
app.post('/api/mp/webhook', async (req, res) => {
    const { action, type, data } = req.body;

    // Log para auditoria
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] Evento: ${action || type} | ID: ${data?.id || 'N/A'} | Payload: ${JSON.stringify(req.body)}\n`;

    fs.appendFileSync('mp-webhooks.log', logEntry);
    console.log(`📩 Webhook recebido: ${action || type} (ID: ${data?.id})`);

    // Aqui você processaria o status do pagamento no seu banco de dados real
    // Como usamos o sistema local, o log serve para conferência manual.

    res.status(200).send('OK');
});

// 4. Consulta Manual de Pagamento (Diagnóstico)
app.get('/api/mp/payment/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const resp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${MP_CONFIG.platformAccessToken.trim()}`
            }
        });
        const data = await resp.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao consultar pagamento' });
    }
});

app.get('/api/mp/debug-logs', (req, res) => {
    try {
        if (!fs.existsSync('mp-debug.log')) {
            return res.send('Nenhum log gerado ainda. Tente gerar um Pix primeiro.');
        }
        const logs = fs.readFileSync('mp-debug.log', 'utf8');
        res.send(`<html><body style="background:#000;color:#0f0;font-family:monospace;padding:20px;"><h1>LOGS DE PAGAMENTO</h1><pre>${logs}</pre></body></html>`);
    } catch (e) {
        res.status(500).send('Erro ao ler arquivo de logs.');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor FairStream REAL Iniciado na porta ${PORT}`);
    console.log(`📡 Diagnóstico disponível em: http://localhost:${PORT}/api/mp/debug-logs`);
});

// Helper para logar em arquivo e console
const debugLog = (msg, obj = null) => {
    const time = new Date().toISOString();
    const entry = `[${time}] ${msg} ${obj ? JSON.stringify(obj, null, 2) : ''}\n---\n`;
    try {
        fs.appendFileSync('mp-debug.log', entry);
    } catch (e) { }
    console.log(msg, obj || '');
};

