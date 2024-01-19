/**
 * 请求函数模板
 *
 * @param {{
*  type: string
*  basePath: string
*  groupName: string
*  method: string
*  params: TreeInterfaceParamsItem[] | TreeInterfacePropertiesItem
*  response: TreeInterfacePropertiesItem | TreeInterfacePropertiesItem[] | string
*  title: string
*  path: string
*  subTitle: string
*  pathName: string
*  fileName: string
*  operationId: string
*  savePath: string
* }} treeInterface
* @returns
*/
function copyRequest(treeInterface) {
 return [
   `/** ${treeInterface.title} */`,
   `export async function ${treeInterface.pathName}(params, options) {`,
   `  return $api`,
   `    .request('${treeInterface.path}', params, {`,
   `      method: ${treeInterface.method},`,
   `      ...options,`,
   `    })`,
   `    .then((res) => res.content || {})`,
   `}`,
 ]
}

/**
 * 请求函数模板（TS）
*/
function copyRequestTS(treeInterface) {
  return [
    `/**
    * ${treeInterface.title}
    * @returns 
    */`,
    `export const ${treeInterface.pathName} = (params: ${treeInterface.pathName}.Params) => ${treeInterface.method}<${treeInterface.pathName}.ResponseData>(${treeInterface.path}, params, options?: ${treeInterface.pathName}.Options)`,
  ]
 }

/**
 * 首字母大写
 * @param {String} str
 */
function toUp(str) {
    if (typeof str !== 'string') return ''
    return str.slice(0, 1).toUpperCase() + str.slice(1)
  }
  
  function paramsItem(item, params) {
    // 项目标题(swaggerToTypes.swaggerJsonUrl[number].title) 为 demo-1 时忽略定制方案
    if (params.groupName === 'demo-1') return
  
    return `${toUp(item.name)}${item.required ? ':' : '?:'} ${item.type}`
  }

  module.exports = { paramsItem, copyRequest }