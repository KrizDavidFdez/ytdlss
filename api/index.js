// api/index.js
// ✅ AUDIO + VIDEO
// ✅ ULTRA FAST
// ✅ DEVUELVE LINKS TEMPORALES
// ✅ 360P VIDEO
// ✅ 128KBPS AUDIO
// ✅ USA PROXIES
// ✅ SIN DESCARGAR
// ✅ SIN STREAM

import { SocksProxyAgent } from 'socks-proxy-agent'
import { HttpsProxyAgent } from 'https-proxy-agent'

// ⚡ proxies rápidas
const PROXIES = [

  'http://141.95.55.160:3128',

  'socks5://94.131.118.39:1082',

  'socks4://164.132.168.87:50161',

  'socks4://130.61.119.46:3128'
]

// ✅ proxy random
function getAgent() {

  const proxy =
    PROXIES[
      Math.floor(
        Math.random() *
        PROXIES.length
      )
    ]

  if (
    proxy.startsWith(
      'socks'
    )
  ) {

    return new SocksProxyAgent(
      proxy
    )
  }

  return new HttpsProxyAgent(
    proxy
  )
}

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

        success: false,

        error:
          'usa ?url=YOUTUBE_URL'
      })
    }

    // ✅ request rápida
    const response =
      await fetch(
        'https://www.clipto.com/api/youtube',
        {

          method: 'POST',

          agent:
            getAgent(),

          headers: {

            'Content-Type':
              'application/json',

            'User-Agent':
              'Mozilla/5.0',

            'Referer':
              'https://www.clipto.com/'
          },

          body:
            JSON.stringify({
              url:
                decodeURIComponent(
                  url
                )
            })
        }
      )

    const data =
      await response.json()

    // ✅ audio 128kbps
    const audio =
      data.medias?.find(
        v =>
          v.formatId === 140
      )

    // ✅ video 360p
    let video =
      data.medias?.find(
        v =>
          v.quality === '360p'
      )

    // ✅ fallback mp4
    if (!video) {

      video =
        data.medias?.find(
          v =>
            v.extension === 'mp4'
        )
    }

    return res.status(200).json({

      success: true,

      title:
        data.title,

      duration:
        data.duration,

      thumbnail:
        data.thumbnail,

      audio: audio
        ? {

            quality:
              '128kbps',

            size:
              audio.size
                ? `${(
                    audio.size /
                    1024 /
                    1024
                  ).toFixed(1)}MB`
                : 'N/A',

            mime:
              'audio/mp4',

            filename:
              `${data.title}.mp3`,

            url:
              audio.url
          }
        : null,

      video: video
        ? {

            quality:
              video.quality || '360p',

            size:
              video.size
                ? `${(
                    video.size /
                    1024 /
                    1024
                  ).toFixed(1)}MB`
                : 'N/A',

            mime:
              'video/mp4',

            filename:
              `${data.title}.mp4`,

            url:
              video.url
          }
        : null
    })

  } catch (e) {

    console.log(e)

    return res.status(500).json({

      success: false,

      error:
        'Failed'
    })
  }
}
