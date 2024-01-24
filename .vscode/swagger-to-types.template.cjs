/**
 * 请求函数模板
 *
 * @param {{
*  type: string
*  basePath: string
*  groupName: string
*  method: string
*  params: object
*  paramsDesc: string
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
    `/**
  * @name ${treeInterface.title}
  * @params ${treeInterface.paramsDesc} 
  */`,
    `export const ${treeInterface.pathName} = (params) => ${treeInterface.method}(\`${treeInterface.path}\`, ${treeInterface.params}, { serverName })`,
  ]
}

/**
 * 请求函数模板（TS）
*/
function copyRequestTS(treeInterface) {
  return [
    `/**
    * @name ${treeInterface.title}
    * @params ${treeInterface.paramsDesc} 
    */`,
    `export const ${treeInterface.pathName} = (params: ${treeInterface.pathName}.Params) => 
      ${treeInterface.method}<${treeInterface.pathName}.ResponseData>(\`${treeInterface.path}\`, ${treeInterface.params}, { serverName })`,
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