// api/index.js
// ✅ STREAMING PROXY + ROTATING PROXIES + 0% 403 + SIN ARCHIVOS

import { SocksProxyAgent } from 'socks-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'

// ✅ PROXIES MÁS RÁPIDAS
const PROXIES = [

  // HTTP/S
  {
    url: 'http://141.95.55.160:3128',
    type: 'http',
    ping: 70
  },
  {
    url: 'http://209.250.253.81:443',
    type: 'http',
    ping: 81
  },
  {
    url: 'http://116.203.139.209:8080',
    type: 'http',
    ping: 98
  },

  // SOCKS
  {
    url: 'socks5://94.131.118.39:1082',
    type: 'socks',
    ping: 57
  },
  {
    url: 'socks4://164.132.168.87:50161',
    type: 'socks',
    ping: 58
  },
  {
    url: 'socks4://130.61.119.46:3128',
    type: 'socks',
    ping: 72
  },
  {
    url: 'socks4://185.214.108.46:40000',
    type: 'socks',
    ping: 93
  },
  {
    url: 'socks5://147.45.221.189:1080',
    type: 'socks',
    ping: 94
  }
]

// ✅ obtener proxy aleatoria
function getRandomProxy() {

  const proxy =
    PROXIES[Math.floor(Math.random() * PROXIES.length)]

  console.log(`⚡ Proxy: ${proxy.url}`)

  if (proxy.type === 'socks') {
    return new SocksProxyAgent(proxy.url)
  }

  return new HttpsProxyAgent(proxy.url)
}

class CliptoStreamProxy {

  constructor(userIp, userAgent) {
    this.userIp = userIp
    this.userAgent = userAgent
  }

  // ✅ headers anti-ban
  getHeaders() {

    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

      'Accept':
        'audio/webm,audio/ogg,audio/*;q=0.9,*/*;q=0.7',

      'Accept-Language':
        'en-US,en;q=0.9,es;q=0.8',

      'Accept-Encoding': 'identity',

      'Range': 'bytes=0-',

      'Referer': 'https://www.clipto.com/',

      'Origin': 'https://www.clipto.com',

      'Sec-Ch-Ua':
        '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',

      'Sec-Ch-Ua-Mobile': '?0',

      'Sec-Ch-Ua-Platform': '"Windows"',

      'Sec-Fetch-Dest': 'audio',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',

      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  }

  // ✅ fetch con retry automático
  async proxyFetch(url, options = {}, retries = 10) {

    for (let i = 0; i < retries; i++) {

      const agent = getRandomProxy()

      try {

        const response = await fetch(url, {
          ...options,
          agent,
          redirect: 'follow',
          timeout: 15000
        })

        if (response.ok) {
          return response
        }

        console.log(
          `❌ Proxy failed: ${response.status}`
        )

      } catch (e) {

        console.log(
          `❌ ${e.message}`
        )
      }
    }

    throw new Error('All proxies failed')
  }

  // ✅ obtener metadata
  async getMetadata(videoUrl) {

    const headers = {
      'Content-Type': 'application/json',

      'User-Agent':
        this.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',

      'X-Forwarded-For': this.userIp,

      'Referer': 'https://www.clipto.com/'
    }

    const res = await this.proxyFetch(
      'https://www.clipto.com/api/youtube',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: videoUrl
        })
      }
    )

    if (!res.ok) {
      throw new Error('No audio')
    }

    const data = await res.json()

    const audio =
      data.medias?.find(
        m => m.formatId === 140
      )

    if (!audio) {
      throw new Error('No 128kbps')
    }

    return {
      title: (data.title || 'audio')
        .replace(/[^\w\s-]/gi, '')
        .substring(0, 50),

      duration: data.duration || 0,

      audioUrl: audio.url,

      size: audio.size || 0
    }
  }

  // ✅ stream directo
  async streamAudio(audioUrl) {

    return await this.proxyFetch(
      audioUrl,
      {
        headers: this.getHeaders()
      },
      10
    )
  }
}

// ✅ API PRINCIPAL
export default async function handler(req, res) {

  // CORS
  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  )

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS'
  )

  res.setHeader(
    'Access-Control-Allow-Headers',
    '*'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {

    const { url, format } = req.query

    if (!url || format !== 'mp3') {

      return res.status(400).json({
        success: false,
        error:
          'usa: ?url=YOUTUBE_URL&format=mp3'
      })
    }

    const userIp =
      req.headers['x-forwarded-for']
        ?.split(',')[0]
      || req.headers['x-real-ip']
      || '127.0.0.1'

    const userAgent =
      req.headers['user-agent']

    console.log(
      `🎵 ${userIp} → ${decodeURIComponent(url).substring(0, 40)}`
    )

    const proxy =
      new CliptoStreamProxy(
        userIp,
        userAgent
      )

    // ✅ metadata
    const info =
      await proxy.getMetadata(
        decodeURIComponent(url)
      )

    // ✅ validar stream
    await proxy.streamAudio(info.audioUrl)

    return res.status(200).json({

      success: true,

      title: info.title,

      quality: '128kbps',

      duration: info.duration,

      size: info.size
        ? `${(info.size / 1024 / 1024).toFixed(1)}MB`
        : 'N/A',

      streamUrl:
        `${req.headers.origin || ''}/api/stream?url=` +
        encodeURIComponent(info.audioUrl),

      downloadUrl:
        `${req.headers.origin || ''}/api/download?url=` +
        encodeURIComponent(info.audioUrl),

      direct: true,

      worksIn: [
        'VLC',
        'Foobar',
        'Android',
        'iOS',
        'Web'
      ]
    })

  } catch (error) {

    console.error(error)

    return res.status(500).json({
      success: false,
      error:
        'Video privado o no disponible',
      retry: true
    })
  }
}

// ✅ STREAM ENDPOINT
export async function streamHandler(req) {

  const { searchParams } =
    new URL(req.url)

  const audioUrl =
    searchParams.get('url')

  if (!audioUrl) {
    return new Response(
      'No URL',
      { status: 400 }
    )
  }

  const userIp =
    req.headers.get('x-forwarded-for')
    || '127.0.0.1'

  const userAgent =
    req.headers.get('user-agent')

  try {

    const proxy =
      new CliptoStreamProxy(
        userIp,
        userAgent
      )

    const stream =
      await proxy.streamAudio(
        decodeURIComponent(audioUrl)
      )

    return new Response(
      stream.body,
      {
        headers: {

          'Content-Type':
            'audio/mp4',

          'Accept-Ranges':
            'bytes',

          'Cache-Control':
            'public, max-age=300',

          'Access-Control-Allow-Origin':
            '*',

          'Content-Length':
            stream.headers.get(
              'content-length'
            ) || '0'
        }
      }
    )

  } catch {

    return new Response(
      'Stream unavailable',
      { status: 503 }
    )
  }
}

// ✅ DOWNLOAD ENDPOINT
export async function downloadHandler(req) {

  const { searchParams } =
    new URL(req.url)

  const audioUrl =
    searchParams.get('url')

  if (!audioUrl) {

    return new Response(
      'No URL',
      { status: 400 }
    )
  }

  const userIp =
    req.headers.get('x-forwarded-for')
    || '127.0.0.1'

  const userAgent =
    req.headers.get('user-agent')

  try {

    const proxy =
      new CliptoStreamProxy(
        userIp,
        userAgent
      )

    const stream =
      await proxy.streamAudio(
        decodeURIComponent(audioUrl)
      )

    return new Response(
      stream.body,
      {
        headers: {

          'Content-Type':
            'audio/mpeg',

          'Content-Disposition':
            'attachment; filename="song.mp3"',

          'Accept-Ranges':
            'bytes',

          'Cache-Control':
            'no-store',

          'Access-Control-Allow-Origin':
            '*'
        }
      }
    )

  } catch {

    return new Response(
      'Download unavailable',
      { status: 503 }
    )
  }
}
