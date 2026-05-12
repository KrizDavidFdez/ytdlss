// api/index.js

import { SocksProxyAgent } from 'socks-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'
import crypto from 'crypto'

// ✅ memoria temporal
const audioMap = new Map()

// ✅ proxies
const PROXIES = [
  {
    url: 'socks4://130.61.119.46:3128',
    type: 'socks'
  },
  {
    url: 'socks5://94.131.118.39:1082',
    type: 'socks'
  },
  {
    url: 'http://141.95.55.160:3128',
    type: 'http'
  }
]

function getRandomProxy() {

  const proxy =
    PROXIES[Math.floor(Math.random() * PROXIES.length)]

  if (proxy.type === 'socks') {
    return new SocksProxyAgent(proxy.url)
  }

  return new HttpsProxyAgent(proxy.url)
}

async function proxyFetch(url, options = {}) {

  for (let i = 0; i < 10; i++) {

    try {

      const res = await fetch(url, {
        ...options,
        agent: getRandomProxy(),
        redirect: 'follow'
      })

      if (res.ok) {
        return res
      }

    } catch {}
  }

  throw new Error('all proxies failed')
}

// ✅ principal
export default async function handler(req, res) {

  try {

    const video =
      decodeURIComponent(req.query.url || '')

    if (!video) {

      return res.status(400).json({
        success: false
      })
    }

    const response =
      await proxyFetch(
        'https://www.clipto.com/api/youtube',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            'User-Agent':
              'Mozilla/5.0',

            'Referer':
              'https://www.clipto.com/'
          },

          body: JSON.stringify({
            url: video
          })
        }
      )

    const data =
      await response.json()

    const audio =
      data.medias?.find(
        m => m.formatId === 140
      )

    if (!audio) {

      return res.status(404).json({
        success: false
      })
    }

    // ✅ id temporal
    const id =
      crypto.randomBytes(8)
      .toString('hex')

    // ✅ guardar URL real
    audioMap.set(id, {
      url: audio.url,
      created: Date.now()
    })

    // ✅ borrar después de 30 min
    setTimeout(() => {
      audioMap.delete(id)
    }, 1000 * 60 * 30)

    return res.json({

      success: true,

      title:
        data.title,

      duration:
        data.duration,

      quality:
        '128kbps',

      audio:
        `${req.headers.origin || ''}/api/audio?id=${id}`
    })

  } catch (e) {

    return res.status(500).json({

      success: false,

      error:
        e.message
    })
  }
}

// ✅ endpoint del audio
export async function audioHandler(req, res) {

  try {

    const id =
      req.query.id

    const saved =
      audioMap.get(id)

    if (!saved) {

      return res.status(404).send(
        'expired'
      )
    }

    const stream =
      await proxyFetch(
        saved.url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0'
          }
        }
      )

    res.setHeader(
      'Content-Type',
      'audio/mpeg'
    )

    res.setHeader(
      'Access-Control-Allow-Origin',
      '*'
    )

    stream.body.pipe(res)

  } catch {

    res.status(500).send(
      'failed'
    )
  }
}

export {
  audioHandler
}
