import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

console.log("🚀 Servidor FairStream Iniciado na porta", PORT);

// Endpoints básicos e de diagnóstico (Sem Mercado Pago)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor FairStream está rodando' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor FairStream rodando em http://localhost:${PORT}`);
});
