// Generic Cloudflare Proxy Function
// Usage: /proxy?url=<encoded_target_url>

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response('Missing url parameter', { status: 400 });
    }

    // Configure headers for CORS
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS request for CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: corsHeaders
        });
    }

    try {
        // Prepare fetch options
        const headers = new Headers(request.headers);
        // Remove headers that might cause issues
        headers.delete('Host');
        headers.delete('Referer');
        headers.delete('Origin');

        // Add fake User-Agent to avoid blocking
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const response = await fetch(targetUrl, {
            method: request.method,
            headers: headers,
            redirect: 'follow'
        });

        // Recreate response to modify headers
        const newResponse = new Response(response.body, response);

        // Add CORS headers to response
        Object.keys(corsHeaders).forEach(key => {
            newResponse.headers.set(key, corsHeaders[key]);
        });

        return newResponse;

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}
