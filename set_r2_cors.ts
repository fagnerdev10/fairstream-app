import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = "f143a476c77f9ae5d723ca4c1414a2a9";
const R2_ACCESS_KEY_ID = "dcf939862a466ff15a8a1c49fef50689";
const R2_SECRET_ACCESS_KEY = "012e60b9cdba283488e0ce6d0cb9f570b7e6c015aa51f8d4238383815ba9e431b6";
const R2_BUCKET_NAME = "fairstream-media";

const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

async function setCors() {
    console.log("🚀 Iniciando configuração automática de CORS para R2...");

    const command = new PutBucketCorsCommand({
        Bucket: R2_BUCKET_NAME,
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedHeaders: ["*"],
                    AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
                    AllowedOrigins: ["*"],
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3600
                }
            ]
        }
    });

    try {
        await s3Client.send(command);
        console.log("✅ CORS configurado com sucesso via script!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Erro ao configurar CORS:", err);
        process.exit(1);
    }
}

setCors();
