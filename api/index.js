// api/index.js - FIX DEFINITIVO para EROFS en Serverless
import ytdl from 'ytdl-core-enhanced';

const cookieData = {
  "cookies": [
    {"name": "GPS","value": "1","httpOnly": true,"secure": true,"sameSite": "unspecified","path": "/","domain": ".youtube.com","expirationDate": 1777655963.286222},
    {"name": "PREF","value": "f6=40000000&tz=America.Lima","httpOnly": false,"secure": true,"sameSite": "unspecified","path": "/","domain": ".youtube.com","expirationDate": 1812214305.034921},
    {"name": "__Secure-1PSIDTS","value": "sidts-CjQBhkeRd9-YB6mrf5lUU57yX4d16E7VDcgpkf3rE8taBEH265m2p3Rua3XYJuzENdai45xIEAA","httpOnly": true,"secure": true,"sameSite": "unspecified","path": "/","domain": ".youtube.com","expirationDate": 1809190303.409923},
    {"name": "__Secure-3PSIDTS","value": "sidts-CjQBhkeRd9-YB6mrf5lUU57yX4d16E7VDcgpkf3rE8taBEH265m2p3Rua3XYJuzENdai45xIEAA","httpOnly": true,"secure": true,"sameSite": "no_restriction","path": "/","domain": ".youtube.com","expirationDate": 1809190303.410096},
    {"name": "HSID","value": "AKwz0vPvFQaCwzg0E","httpOnly": true,"secure": false,"sameSite": "unspecified","path": "/","domain": ".youtube.com","expirationDate": 1812214303.410159},
    {"name": "SSID","value": "Ar3_kcHuGPKNEyriq","httpOnly": true,"secure": true,"sameSite": "unspecified","path": "/","domain": ".youtube.com","expirationDate": 1812214303.410207},
    {"name": "APISID","value": "ZAGLEtGBzoAgCmTR/AyhlaC8GSorxZUwxk","httpOnly": false,"secure": false,"sameSite": "unspecified","path": "/","domain": ".youtube.com","expirationDate": 1812214303.41025},
    {"name": "SAPISID","value": "77tRcDVTvgx7xsKG/AJwT9CoQ0c_A1pI_c","httpOnly": false,"secure": true,"sameSite": "unspecified","path": "/","domain": ".youtube.com","expirationDate": 1812214303.410296},
    {"name": "__Secure-1PAPISID","value": "77tRcDVTvgx7xsKG/AJwT9CoQ0c_A1pI_c","httpOnly": false,"secure": true,"sameSite": "unspecified","path": "/","domain": ".youtube.com","expirationDate": 1812214303.410339},
    {"name": "__Secure-3PAPISID","value": "77tRcDVTvgx7xsKG/AJwT9CoQ0c_A1pI_c","httpOnly": false,"secure": true,"sameSite": "no_restriction","path": "/","domain": ".youtube.com","expirationDate": 1812214303.410385},
    {"name": "SID","value": "g.a0009giXX1u71mvsmjyTUXUh0YA-IpvTD86pirimq9xJKhIot8CKWhV6Oof61dC0VSSpul8HiwACgYKASUSARISFQHGX2MibwBd-0kkBmaSSKYaoxu3DBoVAUF8yKonoGBaydSNPHsA8MaXXor90076","httpOnly": false,"secure": false,"sameSite": "unspecified","path": "/","domain": ".youtube.com","expirationDate": 1812214303.410431},
    {"name": "__Secure-1PSID","value": "g.a0009giXX1u71mvsmjyTUXUh0YA-IpvTD86pirimq9xJKhIot8CKp9l-nQ4uJ9-yPv-yaL2J5QACgYKAZkSARISFQHGX2MijOGA2z-JTX8wqrvgZM2uzhoVAUF8yKpcLQSEzg2WxnifoHc0jXE90076","httpOnly": true,"secure": true,"sameSite": "unspecified","path": "/","domain": ".youtube.com","expirationDate": 1812214303.410481},
    {"name": "__Secure-3PSID","value": "g.a0009giXX1u71mvsmjyTUXUh0YA-IpvTD86pirimq9xJKhIot8CKT0BA-HCFVWCQB-x85kuPzQACgYKAUYSARISFQHGX2Mib_92XWy1hAy4f836l2-HqBoVAUF8yKoAVmIHsxWe1vPlO20ccplB0076","httpOnly": true,"secure": true,"sameSite": "no_restriction","path": "/","domain": ".youtube.com","expirationDate": 1812214303.410532},
    {"name": "LOGIN_INFO","value": "AFmmF2swRQIhALovXSjtFs7lhFw1WRf-bI8kDnHYtTrbwJw9F15G1_HeAiAZGu7R2aSVfVvwhrLSgL4EhRTgNOtn4uEOGdG29OkFjQ:QUQ3MjNmeTlyZHhxVnM0aWZjei1TU3M3bTZGck4yVGtXaUxMX0hrbjREaUh5bXd4bEc2TW1pcTZ3ZDBYSjhRM1oyNnI0RU83RUp5NC1yLXdXc3p6SzhybWg2Y2RmN3M3ODBnd0JSQWJTSjc1eXlUdGYyaGNjMGNlSS1qSTlRTGhVUy1vWTQ1SzgtS1VDZW03TlYzQ0pwSnNaNTBlSnRJYUpn","httpOnly": true,"secure": true,"sameSite": "no_restriction","path": "/","domain": ".youtube.com","expirationDate": 1812214304.11114},
    {"name": "SIDCC","value": "AKEyXzUv8gPwSsVGw_Phb8Gy9fhDeVk4Wq4KejdnOQxuQKiKLoFYhZzSOEGC2kdQ6sTXLn86mQ","httpOnly": false,"secure": false,"sameSite": "unspecified","path": "/","domain": ".youtube.com","expirationDate": 1809190309.566506},
    {"name": "__Secure-1PSIDCC","value": "AKEyXzXaIRhYsnbasEwhKeSJJ-QMTka7pZxxA9rq58w2B0eqR0uKVjeIg1WYuyO1Lfwiv9pyBQ","httpOnly": true,"secure": true,"sameSite": "unspecified","path": "/","domain": ".youtube.com","expirationDate": 1809190309.566614},
    {"name": "__Secure-3PSIDCC","value": "AKEyXzV_AJIpqM23ogR5zYuiCKpfHKtwqiWAQScQm7QG7jOmPcs1j6DnYV0ZBtkW6IBGMqks","httpOnly": true,"secure": true,"sameSite": "no_restriction","path": "/","domain": ".youtube.com","expirationDate": 1809190309.56669}
  ]
};

function cookiesToNetscapeString(cookies) {
  return cookies.map(cookie => {
    const expires = cookie.expirationDate ? new Date(cookie.expirationDate * 1000).toUTCString() : '';
    const isSubdomain = cookie.domain.startsWith('.');
    return [isSubdomain ? cookie.domain.slice(1) : cookie.domain, isSubdomain ? 'TRUE' : 'FALSE', cookie.path, expires, cookie.secure ? 'TRUE' : 'FALSE', cookie.name, cookie.value].filter(Boolean).join('\t');
  }).filter(line => line).join('\n');
}

const cookieString = cookiesToNetscapeString(cookieData.cookies);

// 🚀 CONFIGURACIÓN CRÍTICA para Serverless (SIN EROFS)
const ytdlOptions = {
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cookie': cookieString,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache'
    },
    timeout: 15000, // 🔽 Reducido para serverless
    // 🚫 CRÍTICO: Deshabilitar TODA escritura de archivos
    cache: false,
    downloadToFile: false,
    // 🚫 Evitar cualquier operación de disco
    followRedirects: true,
    maxRedirects: 5
  },
  lang: 'en',
  verbose: false,
  // 🚀 MÁS FIXES para serverless
  extractAudio: false,
  quality: 'highest',
  filter: 'audioandvideo'
};

export default async function handler(req, res) {
  // CORS para serverless
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'Falta parámetro ?url=VIDEO_URL',
        example: '/api?url=https://youtu.be/sOnqjkJTMaA'
      });
    }

    console.log(`📥 Procesando: ${url}`);

    // 🚀 MÉTODO SEGURO: Solo getBasicInfo + getVideoInfo (SIN archivos)
    const [basicInfo, videoInfo] = await Promise.all([
      ytdl.getBasicInfo(url, ytdlOptions),
      ytdl.getVideoInfo(url, ytdlOptions)
    ]);

    const formats = videoInfo.formats;

    // 🎯 Filtrar formatos válidos con URL directa
    const validFormats = formats
      .filter(f => f.url && f.url.length > 20)
      .map(f => ({
        itag: f.itag,
        qualityLabel: f.qualityLabel || f.quality,
        quality: f.quality,
        fps: f.fps,
        container: f.container,
        hasVideo: !!f.hasVideo,
        hasAudio: !!f.hasAudio,
        audioCodec: f.audioCodec,
        videoCodec: f.videoCodec,
        bitrate: f.bitrate,
        url: f.url,
        contentLength: f.contentLength,
        duration: f.duration
      }));

    const response = {
      success: true,
      videoDetails: {
        title: basicInfo.videoDetails.title,
        author: basicInfo.videoDetails.author.name,
        thumbnail: basicInfo.videoDetails.thumbnails[0]?.url,
        duration: basicInfo.videoDetails.lengthSeconds,
        viewCount: basicInfo.videoDetails.viewCount,
        uploadDate: basicInfo.videoDetails.uploadDate
      },
      formats: validFormats,
      bestVideoAudio: validFormats
        .filter(f => f.hasVideo && f.hasAudio)
        .sort((a, b) => (parseInt(b.qualityLabel?.replace('p', '')) || 0) - (parseInt(a.qualityLabel?.replace('p', '')) || 0))[0],
      bestAudio: validFormats
        .filter(f => f.hasAudio && !f.hasVideo)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0],
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Éxito: ${basicInfo.videoDetails.title}`);
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message.includes('EROFS') 
        ? 'Error de sistema temporal. Intenta de nuevo.'
        : error.message,
      url: req.query?.url || 'No proporcionada',
      hint: 'Verifica que la URL sea válida de YouTube'
    });
  }
}
