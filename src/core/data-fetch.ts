/*
 * @Author: luofangchao luofangchao@pcitech.com
 * @Date: 2024-06-25 14:40:19
 * @LastEditors: luofangchao luofangchao@pcitech.com
 * @LastEditTime: 2024-06-25 15:36:12
 * @FilePath: \vscode-swagger-generate-api\src\core\data-fetch.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import path from 'path'
import http from 'http'
import https from 'https'
import { OpenAPI } from 'openapi-types'
import axios from 'axios'
import { log, config, requireModule, WORKSPACE_PATH, type SwaggerJsonUrlItem } from '../tools'

interface DocumentCommom {
  swagger?: string
  openapi?: string
}

/** 获取 Swagger JSON 数据 */
export async function getSwaggerJson(item: SwaggerJsonUrlItem) {
  if (/^https?:\/\//.test(item.url)) {
    return requestJson(item)
  } else {
    try {
      const res = requireModule(path.join(WORKSPACE_PATH || '', item.url))
      return Promise.resolve(res)
    } catch (err) {
      log.error(err, true)
      return Promise.reject(err)
    }
  }
}

/** 发起请求 */
// export function requestJson({ url, headers = {} }: SwaggerJsonUrlItem): Promise<OpenAPI.Document & DocumentCommom> {
//   return new Promise((resolve, reject) => {
//     let TM: NodeJS.Timeout
//     const request = /^https/.test(url) ? https.request : http.request

//     log.info(`Request Start: ${url}`)

//     const req = request(
//       url,
//       {
//         method: 'GET',
//         rejectUnauthorized: false,
//         headers: {
//           Accept: 'application/json', // 确保服务器知道客户端期望接收JSON格式的数据
//           'Accept-Encoding': 'utf-8',
//           'Content-Type': 'application/x-www-form-urlencoded',
//           ...config.extConfig.swaggerJsonHeaders,
//           ...headers,
//         },
//       },
//       (res) => {
//         res.setEncoding('utf-8')

//         let dataStr = ''
//         res.on('data', (data: Buffer) => {
//           dataStr += data.toString()
//         })

//         res.on('end', () => {
//           clearTimeout(TM)
//           if (!dataStr) {
//             log.error(`No Data Received: ${url}`, true)
//             return reject(new Error(`No Data Received: ${url}`))
//           }
//           try {
//             const json = JSON.parse(dataStr)
//             log.info(`Request Successful: ${url}`)
//             resolve(json)
//           } catch (error) {
//             log.error(`JSON Parse Failed: ${url}`, true)
//             reject(error)
//           }
//         })

//         res.on('error', (err) => {
//           log.error(`Request Failed: ${url}`, true)
//           reject(err)
//         })
//       }
//     )

//     req.on('timeout', (err: Error) => {
//       log.error(err, true)
//       reject(err)
//     })

//     TM = setTimeout(() => {
//       const err = new Error('Request Timeout')
//       err.message = url
//       req.emit('timeout', err)
//     }, 15000) // 尝试增加超时时间

//     req.end()
//   })
// }

/** 发起请求 */
export function requestJson({ url, headers = {} }: SwaggerJsonUrlItem): Promise<OpenAPI.Document & DocumentCommom> {
  log.info(`Request Start: ${url}`)

  return axios
    .get(url, {
      headers: {
        Accept: 'application/json', // 确保服务器知道客户端期望接收JSON格式的数据
        'Accept-Encoding': 'utf-8',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...config.extConfig.swaggerJsonHeaders,
        ...headers,
      },
      // Axios库默认情况下会验证服务器SSL证书，rejectUnauthorized: false等效设置
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
      timeout: 10000, // 设置超时时间为10000毫秒（10秒）
    })
    .then((response: any) => response.data)
    .catch((err: any) => {
      console.log('err:', err)
      log.error(`Request Failed: ${url}`, true)
      return Promise.reject(err)
    })
}
