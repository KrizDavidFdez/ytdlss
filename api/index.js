// api/index.js - ✅ Clipto Proxy + User Proxy Headers
class CliptoScraper {
  constructor(userIp, userAgent) {
    this.baseUrl = 'https://www.clipto.com';
    this.headers = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      
      // ✅ PROXY DEL USUARIO (IP/Geo del cliente)
      'X-Forwarded-For': userIp,
      'X-Real-IP': userIp,
      'X-Client-IP': userIp,
      'CF-Connecting-IP': userIp,
      'True-Client-IP': userIp
    };
  }

  async Mp4(videoUrl) {
    try {
      const response = await fetch(`${this.baseUrl}/api/youtube`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ url: videoUrl })
      });

      const data = await response.json();
      
      // Busca formatId 18 (360p mp4)
      const mp4Format = data.medias?.find(m => m.formatId === 18);
      
      if (!mp4Format) return null;

      return {
        quality: '360p',
        format_id: mp4Format.formatId,
        container: mp4Format.ext,
        url: mp4Format.url,
        title: data.title,
        thumbnail: data.thumbnail,
        duration: data.duration
      };

    } catch {
      return null;
    }
  }

  async _128kbps(videoUrl) {
    try {
      const response = await fetch(`${this.baseUrl}/api/youtube`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ url: videoUrl })
      });

      const data = await response.json();
      
      // Busca formatId 140 (m4a 131kbps)
      const audioFormat = data.medias?.find(m => m.formatId === 140);
      
      if (!audioFormat) return null;

      return {
        quality: '128kbps',
        format_id: audioFormat.formatId,
        container: audioFormat.ext,
        url: audioFormat.url,
        title: data.title,
        thumbnail: data.thumbnail,
        duration: data.duration
      };

    } catch {
      return null;
    }
  }
}

async function getCliptoDownloadUrl(videoUrl, userIp, userAgent) {
  const scraper = new CliptoScraper(userIp, userAgent);
  
  // Obtiene ambos formatos
  const [mp4, audio] = await Promise.all([
    scraper.Mp4(videoUrl),
    scraper._128kbps(videoUrl)
  ]);

  return [mp4, audio].filter(Boolean);
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

    // ✅ INFO DEL USUARIO
    const userIp = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.socket.remoteAddress || 
                   req.connection.remoteAddress;
    
    const userAgent = req.headers['user-agent'];

    console.log(`🌐 User IP: ${userIp} | UA: ${userAgent?.substring(0, 50)}`);

    // ✅ Usa Clipto con IP/UA del usuario
    const formats = await getCliptoDownloadUrl(url, userIp, userAgent);
    
    if (!formats.length) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron formatos'
      });
    }

    const response = {
      success: true,
      userIp: userIp,
      formats: formats.map(f => ({
        quality: f.quality,
        format_id: f.format_id,
        container: f.container,
        url: f.url,
        title: f.title
      })),
      best: formats[0].url, // MP4 360p como mejor
      timestamp: new Date().toISOString()
    };

    console.log(`✅ ${formats.length} formatos (Clipto) para IP: ${userIp}`);
    res.status(200).json(response);

  } catch (error) {
    console.error('❌', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
