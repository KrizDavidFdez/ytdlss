// api/index.js
// ✅ RESPUESTA ULTRA RÁPIDA
// ✅ DEVUELVE BUFFER BASE64
// ✅ SIN ARCHIVOS
// ✅ SIN STREAM
// ✅ JSON COMPLETO
// ✅ PROXIES ROTATIVAS

import { SocksProxyAgent } from 'socks-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'

// ✅ proxies rápidas
const PROXIES = [

  {
    url: 'http://141.95.55.160:3128',
    type: 'http'
  },

  {
    url: 'http://209.250.253.81:443',
    type: 'http'
  },

  {
    url: 'socks5://94.131.118.39:1082',
    type: 'socks'
  },

  {
    url: 'socks4://164.132.168.87:50161',
    type: 'socks'
  },

  {
    url: 'socks4://130.61.119.46:3128',
    type: 'socks'
  }
]

// ✅ proxy random
function getRandomProxy() {

  const proxy =
    PROXIES[
      Math.floor(
        Math.random() *
        PROXIES.length
      )
    ]

  console.log(
    '⚡',
    proxy.url
  )

  if (proxy.type === 'socks') {
    return new SocksProxyAgent(
      proxy.url
    )
  }

  return new HttpsProxyAgent(
    proxy.url
  )
}

class CliptoProxy {

  constructor(
    userIp,
    userAgent
  ) {

    this.userIp =
      userIp

    this.userAgent =
      userAgent
  }

  // ✅ fetch con retries
  async proxyFetch(
    url,
    options = {},
    retries = 10
  ) {

    for (
      let i = 0;
      i < retries;
      i++
    ) {

      const agent =
        getRandomProxy()

      try {

        const response =
          await fetch(url, {

            ...options,

            agent,

            redirect:
              'follow'
          })

        if (response.ok) {
          return response
        }

      } catch (e) {

        console.log(
          '❌',
          e.message
        )
      }
    }

    throw new Error(
      'All proxies failed'
    )
  }

  // ✅ metadata
  async getMetadata(
    videoUrl
  ) {

    const headers = {

      'Content-Type':
        'application/json',

      'User-Agent':
        this.userAgent
        || 'Mozilla/5.0',

      'X-Forwarded-For':
        this.userIp,

      'Referer':
        'https://www.clipto.com/'
    }

    const res =
      await this.proxyFetch(
        'https://www.clipto.com/api/youtube',
        {
          method:
            'POST',

          headers,

          body:
            JSON.stringify({
              url:
                videoUrl
            })
        }
      )

    const data =
      await res.json()

    const audio =
      data.medias?.find(
        m =>
          m.formatId === 140
      )

    if (!audio) {

      throw new Error(
        'No audio'
      )
    }

    return {

      title:
        data.title,

      duration:
        data.duration,

      size:
        audio.size,

      audioUrl:
        audio.url
    }
  }

  // ✅ descargar buffer
  async getBuffer(
    audioUrl
  ) {

    const response =
      await this.proxyFetch(
        audioUrl,
        {
          headers: {

            'User-Agent':
              'Mozilla/5.0',

            'Accept':
              '*/*',

            'Referer':
              'https://www.clipto.com/'
          }
        }
      )

    // ✅ buffer rápido
    const arrayBuffer =
      await response.arrayBuffer()

    return Buffer.from(
      arrayBuffer
    )
  }
}

// ✅ endpoint
export default async function handler(
  req,
  res
) {

  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  )

  try {

    const {
      url
    } = req.query

    if (!url) {

      return res.status(400).json({

        success:
          false,

        error:
          'usa ?url=YOUTUBE_URL'
      })
    }

    const userIp =
      req.headers[
        'x-forwarded-for'
      ]?.split(',')[0]
      || '127.0.0.1'

    const userAgent =
      req.headers[
        'user-agent'
      ]

    const proxy =
      new CliptoProxy(
        userIp,
        userAgent
      )

    // ✅ metadata
    const info =
      await proxy.getMetadata(
        decodeURIComponent(
          url
        )
      )

    // ✅ descargar buffer
    const buffer =
      await proxy.getBuffer(
        info.audioUrl
      )

    // ✅ base64
    const base64 =
      buffer.toString(
        'base64'
      )

    // ✅ respuesta JSON
    return res.status(200).json({

      success:
        true,

      title:
        info.title,

      duration:
        info.duration,

      size:
        info.size
          ? `${(
              info.size /
              1024 /
              1024
            ).toFixed(1)}MB`
          : 'N/A',

      mime:
        'audio/mp4',

      filename:
        `${info.title}.mp3`,

      // ✅ BUFFER
      buffer:
        base64
    })

  } catch (e) {

    console.log(e)

    return res.status(500).json({

      success:
        false,

      error:
        'No disponible'
    })
  }
}
