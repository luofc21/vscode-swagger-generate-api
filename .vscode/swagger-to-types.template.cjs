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
 const pathParams = treeInterface.path.match(/\{[\w | \-]*\}/g)
 const pathParamsArr = []
 if (pathParams) {
  pathParams.map(param => {
    const newParam = param.slice(1, -1)
    treeInterface.path = treeInterface.path.replace(param, `$\{params.${newParam}\}`)
    pathParamsArr.push(newParam)
  })
 }
 let bodyParams = ''
 let bodyParamsDesc = ''
 if (Array.isArray(treeInterface.params)){
  treeInterface.params.forEach(param => {
    if (!pathParamsArr.includes(param.name)) {
      bodyParams += `${param.name}: params.${param.name}, `
    }
    bodyParamsDesc += `${param.name}: ${param.type},`
  })
 } else {
  if (!pathParamsArr.includes(param.name)) {
    bodyParamsDesc = `${treeInterface.params.name}: ${treeInterface.params.type}`
  }
  bodyParams = `${treeInterface.params.name}: ${treeInterface.params.name}`
 }
 bodyParamsDesc = `{ ${bodyParamsDesc.slice(0, -1)} }`
 bodyParams = bodyParams || null
 return [
  `/**
  * ${treeInterface.title}
  * @params ${bodyParamsDesc} 
  */`,
  `export const ${treeInterface.pathName} = (params) => ${treeInterface.method}(\`${treeInterface.path}\`, ${JSON.stringify(bodyParams)}, { serverName })`,
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
    `export const ${treeInterface.pathName} = (params: ${treeInterface.pathName}.Params) => 
      ${treeInterface.method}<${treeInterface.pathName}.ResponseData>(\`${treeInterface.path}\`, params)`,
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

  module.exports = { paramsItem, copyRequest, copyRequestTS }