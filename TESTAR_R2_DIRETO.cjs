
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

async function testR2() {
    const credentials = {
        accountId: "99a7a23d0c59423cb2935c60315cb443", // Hash da URL pública
        accessKeyId: "f44f6fcf825b7cecd591244031956559",
        secretAccessKey: "44439c36ecaf37e6f6a7d519a4f49be3e3dc05e04ae424f1146312cd029f6f69",
        bucketName: "fairstream-media"
    };

    console.log("🚀 Iniciando Teste R2 (Isolado com ID 99a7a23d)...");
    console.log("Account ID:", credentials.accountId);

    const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${credentials.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
        },
    });

    try {
        console.log("⏳ Enviando arquivo de teste...");
        const command = new PutObjectCommand({
            Bucket: credentials.bucketName,
            Key: "_diagnostico_terminal_hash.txt",
            Body: "Teste com ID 99a7a23d - Operação V67",
            ContentType: "text/plain"
        });

        await s3.send(command);
        console.log("✅ SUCESSO ABSOLUTO! O ID da URL pública era o correto.");
    } catch (error) {
        console.error("❌ FALHA GERAL!");
        console.error("Mensagem:", error.message);
        console.error("Código:", error.name);
    }
}

testR2();
