// api/index.js - ✅ FIX ANTI-BOT + COOKIES REALES
import ytdl from 'ytdl-core-enhanced';
import fs from 'fs';
import path from 'path';

// 🔒 BLOQUEAR DISCO (mismo que antes)
fs.writeFile = async () => { throw new Error('Bloqueado'); };
fs.writeFileSync = () => { throw new Error('Bloqueado'); };
fs.mkdir = async () => { throw new Error('Bloqueado'); };
fs.mkdirSync = () => { throw new Error('Bloqueado'); };

global.tmpdir = undefined;

// ✅ HEADERS REALISTAS (como Chrome real)
const REAL_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0'
};

// ✅ TUS COOKIES + VISIT_ID (anti-bot)
const cookieData = {
  "cookies": [
    {"name": "VISITOR_INFO1_LIVE","value":"fPQ5mJ5Kk8s","httpOnly":false,"secure":true,"sameSite":"no_restriction","path":"/","domain":".youtube.com","expirationDate":1812214303},
    {"name": "YSC","value":"bXVfN2h1Z2s","httpOnly":true,"secure":true,"sameSite":"no_restriction","path":"/","domain":"youtube.com","expirationDate":1737657128},
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

const ytdlOptions = {
  requestOptions: {
    headers: {
      ...REAL_HEADERS,
      'Cookie': cookieString
    },
    timeout: 30000,
    cache: false,
    downloadToFile: false
  },
  verbose: false,
  debug: false
};

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
    
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ success: false, error: 'URL inválida' });
    }

    console.log(`📥 Anti-bot: ${url}`);

    const info = await ytdl.getInfo(url, ytdlOptions);

    const formats = info.formats
      .filter(f => f.url && f.url.length > 20)
      .map(f => ({
        itag: f.itag,
        quality: f.qualityLabel || f.quality,
        hasVideo: !!f.hasVideo,
        hasAudio: !!f.hasAudio,
        url: f.url
      }));

    res.json({
      success: true,
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      duration: info.videoDetails.lengthSeconds,
      formats,
      best: formats.find(f => f.hasVideo && f.hasAudio) || formats[0]
    });

  } catch (error) {
    console.error('❌', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      url: req.query.url,
      hint: error.message.includes('bot') ? 'Actualiza cookies' : 'OK'
    });
  }
}
