// api/index.js - ✅ YT-DLP: Serverless perfecto
import YTDlpWrap from 'yt-dlp-wrap';

const ytDlpWrap = new YTDlpWrap();

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

    console.log(`📥 ${url}`);

    // ✅ YT-DLP: Info SIN descargar
    const info = await ytDlpWrap.execPromise([
      url,
      '--dump-json',           // Solo JSON info
      '--no-download',         // NO descargar
      '--no-cache-dir',        // Sin cache/disco
      '--no-playlist',         // Solo video
      '--flat-playlist'        // Sin listas
    ]);

    const data = JSON.parse(info);

    // ✅ Formatos válidos
    const formats = data.formats
      .filter(f => f.url && f.vcodec !== 'none' || f.acodec !== 'none')
      .map(f => ({
        itag: f.format_id,
        quality: f.quality || f.height ? `${f.height}p` : 'audio',
        fps: f.fps,
        hasVideo: f.vcodec !== 'none',
        hasAudio: f.acodec !== 'none',
        container: f.ext,
        bitrate: f.tbr || f.abr,
        url: f.url
      }));

    const response = {
      success: true,
      videoDetails: {
        title: data.title,
        author: data.uploader,
        duration: data.duration,
        viewCount: data.view_count,
        thumbnail: data.thumbnail,
        uploadDate: data.upload_date
      },
      formats,
      bestVideoAudio: formats
        .filter(f => f.hasVideo && f.hasAudio)
        .sort((a, b) => {
          const qa = parseInt(a.quality) || 0;
          const qb = parseInt(b.quality) || 0;
          return qb - qa;
        })[0],
      bestAudio: formats
        .filter(f => f.hasAudio && !f.hasVideo)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0],
      timestamp: new Date().toISOString()
    };

    console.log(`✅ ${data.title}`);
    res.status(200).json(response);

  } catch (error) {
    console.error('❌', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      url: req.query.url
    });
  }
}
