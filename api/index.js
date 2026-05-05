// api/index.js - ✅ Lynote Proxy + User Proxy Headers
async function getLynoteDownloadUrl(videoUrl, userIp, userAgent) {
  try {
    const response = await fetch(
      `https://lynote.ai/api/youtube-service/youtube/getYoutubeDownloadUrlData?videoUrl=${encodeURIComponent(videoUrl)}`,
      {
        headers: {
          // ✅ PROXY DEL USUARIO (IP/Geo del cliente)
          'X-Forwarded-For': userIp,
          'X-Real-IP': userIp,
          'X-Client-IP': userIp,
          'CF-Connecting-IP': userIp,  // Cloudflare
          'True-Client-IP': userIp,    // Akamai
          
          // ✅ USER-AGENT del cliente
          'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          
          // ✅ Headers originales + user info
          'Accept': 'application/json',
          'X-Client-Timezone': 'America/Lima',
          'X-User-Id': `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          'X-Roles': 'role_' + Math.random().toString(36).substr(2, 9),
          'Accept-Language': 'en-US',
          'App-Project-Id': 'lynote-web-v1.0',
          'App-Os-Platform': 'web',
          'version': 'V-1.0',
          'Referer': 'https://lynote.ai/es/youtube-downloader'
        }
      }
    );
    
    const data = await response.json();
    return data.data?.formats || [];
    
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: 'Requiere ?url=VIDEO_URL'
      });
    }

    // ✅ INFO DEL USUARIO que hace la solicitud
    const userIp = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.socket.remoteAddress || 
                   req.connection.remoteAddress;
    
    const userAgent = req.headers['user-agent'];

    console.log(`🌐 User IP: ${userIp} | UA: ${userAgent?.substring(0, 50)}`);

    // ✅ Usa IP/UA del usuario real
    const formats = await getLynoteDownloadUrl(url, userIp, userAgent);
    
    if (!formats.length) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron formatos'
      });
    }

    const response = {
      success: true,
      userIp: userIp,  // ✅ IP del usuario
      formats: formats.map(f => ({
        quality: f.resolution || 'unknown',
        format_id: f.format_id,
        container: f.ext,
        url: f.url
      })),
      best: formats[0].url,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ ${formats.length} formatos para IP: ${userIp}`);
    res.status(200).json(response);

  } catch (error) {
    console.error('❌', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
