// api/index.js - ✅ YTDL SIN FS + SIN COOKIES + SIN EROFS
import ytdl from 'ytdl-core-enhanced';

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
        error: 'Requiere ?url=VIDEO_URL',
        example: '?url=https://youtu.be/sOnqjkJTMaA'
      });
    }

    console.log(`📥 ${url}`);

    // ✅ SOLO getInfo() - NADA de pipe/fs/escritura
    const info = await ytdl.getInfo(url, {
      // 🔒 MÍNIMO: Sin cache/disco
      requestOptions: {
        cache: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      },
      // 🔒 Sin debug
      verbose: false
    });

    // ✅ Formatos con URL válida
    const formats = info.formats
      .filter(f => f.url && f.url.length > 20)
      .map(f => ({
        itag: f.itag,
        quality: f.qualityLabel || f.quality,
        hasVideo: !!f.hasVideo,
        hasAudio: !!f.hasAudio,
        container: f.container,
        bitrate: f.bitrate,
        url: f.url
      }));

    const response = {
      success: true,
      videoDetails: {
        title: info.videoDetails.title,
        author: info.videoDetails.author?.name || 'Desconocido',
        duration: parseInt(info.videoDetails.lengthSeconds),
        viewCount: parseInt(info.videoDetails.viewCount),
        thumbnail: info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url,
        videoId: info.videoDetails.videoId
      },
      formats,
      // 🎯 MEJORES OPCIONES
      bestVideoAudio: formats
        .filter(f => f.hasVideo && f.hasAudio)
        .sort((a, b) => {
          const qa = parseInt(a.quality?.match(/\d+/)?.[0] || 0);
          const qb = parseInt(b.quality?.match(/\d+/)?.[0] || 0);
          return qb - qa;
        })[0],
      bestAudio: formats
        .filter(f => f.hasAudio && !f.hasVideo)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0],
      timestamp: new Date().toISOString()
    };

    console.log(`✅ ${info.videoDetails.title}`);
    res.status(200).json(response);

  } catch (error) {
    console.error('❌', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      url: req.query.url || 'sin url'
    });
  }
}
