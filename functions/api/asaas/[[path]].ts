export async function onRequest(context) {
    const { request, params } = context;
    const url = new URL(request.url);

    // O path é um array de segmentos (ex: ['customers'])
    const path = params.path;
    const pathStr = Array.isArray(path) ? path.join('/') : path;

    // Monta a URL real do Asaas
    const targetUrl = `https://www.asaas.com/api/v3/${pathStr}${url.search}`;

    console.log(`[Proxy] Forwarding to: ${targetUrl}`);

    // Trata OPTIONS (CORS Preflight)
    if (request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, access_token",
            },
        });
    }

    // Prepara a requisição para o Asaas
    const newRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
    });

    // Remove cabeçalhos que podem causar problemas no proxy
    // newRequest.headers.delete("Host"); 
    // Nota: Cloudflare Workers gerencia Host automaticamente

    try {
        const response = await fetch(newRequest);

        // Cria resposta para devolver ao front
        const newResponse = new Response(response.body, response);

        // Adiciona CORS na volta
        newResponse.headers.set("Access-Control-Allow-Origin", "*");
        newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, access_token");

        return newResponse;

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    }
}
