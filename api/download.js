import handler from './index'

export default async function(req, res) {
  return handler.downloadHandler(req, res)
}
