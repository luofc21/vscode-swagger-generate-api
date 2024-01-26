import fs from 'fs'
import path from 'path'
import vscode, { StatusBarItem } from 'vscode'

import { ViewList } from '../views/list.view'
import { BaseTreeProvider, BaseTreeItem, BaseTreeItemOptions } from '../core'
import { config, log, localize, WORKSPACE_PATH, CONFIG_GROUP } from '../tools'

export interface ExtLocalItemOptions {
  /** 文件路径 */
  filePath: string
  /** 接口主键 (对应 pathName) */
  namespace?: string
}

export class ViewLocal extends BaseTreeProvider<LocalItem> {
  public statusBarItem: StatusBarItem = vscode.window.createStatusBarItem()
  public localFilesList: FileHeaderInfo[] = []
  public localFilesMap = new Map<string, FileHeaderInfo | FileHeaderInfo[]>()

  // private localPath = path.resolve(WORKSPACE_PATH || '', config.extConfig.savePath)
  public allSavePath = this.getAllSavePath()
  public allRequestSavePath = this.getAllRequestSavePath()
  public viewList: ViewList

  constructor(viewList: ViewList) {
    super()
    this.viewList = viewList
    this.initLocalFiles()
    this.initStatusBarItem()

    /** 监听文件保存 */
    vscode.workspace.onDidSaveTextDocument(({ languageId, fileName }) => {
      // 过滤非 TS 语言文件
      if (languageId !== 'typescript') return

      let isSavePath = false
      for (let i = 0; i < this.allSavePath.length; i++) {
        const savePath = this.allSavePath[i]
        if (fileName.includes(savePath)) {
          isSavePath = true
          continue
        }
      }
      if (!isSavePath) return

      this.updateSingle(fileName)
    })
  }

  /** 获取所有本地文件保存路径 */
  getAllSavePath() {
    const { savePath, swaggerJsonUrl } = config.extConfig
    const allSavePath = [path.resolve(WORKSPACE_PATH || '', savePath)]

    swaggerJsonUrl.forEach((v) => {
      const absSavePath = path.resolve(WORKSPACE_PATH || '', v.savePath || '')
      if (v.savePath && !allSavePath.includes(absSavePath)) {
        allSavePath.push(absSavePath)
      }
    })

    return allSavePath
  }
  /** 获取所有本地请求文件保存路径 */
  getAllRequestSavePath() {
    const { swaggerJsonUrl, requestSavePath } = config.extConfig
    const allRequestSavePath = [path.resolve(WORKSPACE_PATH || '', requestSavePath)]

    swaggerJsonUrl.forEach((v) => {
      const absRequestSavePath = path.resolve(WORKSPACE_PATH || '', v.requestSavePath || '')
      if (v.requestSavePath && !allRequestSavePath.includes(absRequestSavePath)) {
        allRequestSavePath.push(absRequestSavePath)
      }
    })

    return allRequestSavePath
  }

  /** 初始化本地文件 */
  initLocalFiles() {
    this.localFilesMap.clear()

    const localFiles: string[] = []

    this.allSavePath.forEach((savePath) => {
      if (fs.existsSync(savePath)) {
        fs.readdirSync(savePath).forEach((file) => {
          const filePath = path.join(savePath, file)
          const fileInfo = this.readLocalFile(filePath)

          if (fileInfo && fileInfo.ext === 'ts') {
            localFiles.push(filePath)
            this.localFilesMap.set(filePath, fileInfo)
          }
        })
      } else {
        log.warn('<initLocalFiles> localPath does not exist')
      }
    })
    this.allRequestSavePath.forEach((savePath) => {
      if (fs.existsSync(savePath)) {
        fs.readdirSync(savePath).forEach((file) => {
          const filePath = path.join(savePath, file)
          const fileInfoList = this.readLocalRequestFile(filePath)
          // console.log('fileInfo===>', fileInfoList);
          if (fileInfoList) {
            localFiles.push(filePath)
            this.localFilesMap.set(filePath, fileInfoList)
          }
            
          
        })
      } else {
        log.warn('<initLocalFiles> localPath does not exist')
      }
    })

    // TAG setContext 写入本地文件目录
    vscode.commands.executeCommand('setContext', `${CONFIG_GROUP}.localFiles`, localFiles)
    this.refactorLocalFilesList()
  }

  /** 初始化状态栏按钮 */
  initStatusBarItem() {
    const { showStatusbarItem, swaggerJsonUrl } = config.extConfig
    this.statusBarItem.text = `$(cloud-download) ${localize.getLocalize('text.updateButton')}`
    this.statusBarItem.command = 'cmd.local.updateAll'
    if (showStatusbarItem && swaggerJsonUrl.length) {
      this.statusBarItem.show()
    } else {
      this.statusBarItem.hide()
    }
  }

  /** 读取本地文件 */
  readLocalFile(fileName: string, text?: string): FileHeaderInfo | undefined {
    try {
      const fileStr = text || fs.readFileSync(fileName, 'utf-8')
      const headerStr = fileStr.replace(
        /^[\s]*\/\*\*(.*?)\*\/.*declare\s+namespace\s+([^\s\n]+).+$/s,
        '$1* @namespace $2\n'
      )

      const headerInfo: FileHeaderInfo = {
        fileName: fileName.replace(/^.+\/(.+?)(\.d)?\.{.+}$/, '$1'),
        filePath: fileName,
        ext: fileName.replace(/^.+\.(.+)$/, '$1'),
      }

      headerStr.replace(/\*\s*@([^\s]+)[^\S\n]*([^\n]*?)\r?\n/g, (_, key, value) => {
        headerInfo[key] = value || true
        return ''
      })

      return headerInfo
    } catch (error) {
      log.error(`Read File Error - ${fileName}`)
    }
  }

  /** 读取本地请求文件 */
  readLocalRequestFile(fileName: string, text?: string): FileHeaderInfo[] | undefined {
    try {
      // 读取文件内容
      const fileStr = text || fs.readFileSync(fileName, 'utf-8') 
      const headerStrList = fileStr.match(
        /\/\*\*([\s\S]*?)\*\/\nexport\sconst\s[\S]*\s/gs
      )
      // const pathList = fileStr.match(/\`([\S]*?)\`\p{P}/gs)
      const headerInfoList: FileHeaderInfo[] = []
      headerStrList?.forEach((headerStr: string) => {
        const headerInfo: FileHeaderInfo = {
          fileName: fileName.replace(/^.+\/(.+?)(\.d)?\.{.+}$/, ''),
          filePath: fileName,
          ext: fileName.replace(/^.+\.(.+)$/, '$1'),
          isRequest: true
        }
        const infoList = headerStr.split('export const ')
        if (infoList.length > 1) {
          headerInfo['namespace'] = infoList[1].trim()
          headerInfo['update'] = new Date().toLocaleString()
          infoList[0].replace(/\*\s*@([^\s]+)[^\S\n]*([^\n]*?)\r?\n/g, (_, key, value) => {
            headerInfo[key] = value.trim() || true
            return ''
          })
        }
        headerInfoList.push(headerInfo)
      })
      return headerInfoList;
    } catch (error) {
      log.error(`Read File Error - ${fileName}`)
    }
  }

  /** 更新所有本地接口 */
  public updateAll() {
    const statusBarItemText = `$(cloud-download) ${localize.getLocalize('text.updateButton')}`
    this.statusBarItem.text = statusBarItemText + '...'
    this.statusBarItem.command = undefined
    const progressPanel = vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: localize.getLocalize('text.updateButton'),
        cancellable: false,
      },
      async (progress) => {
        return new Promise(async (resolve) => {
          progress.report({ increment: -1 })

          await this.viewList._refresh()

          const unit = 100 / this.localFilesMap.size
          let increment = 0
          progress.report({ increment })

          const updateFunc = async (key: any, item: any) => {
            if (item.ignore) {
              log.info(`<updateAll> ignored. (${item.filePath})`)
              // continue
              return false
            }
            if (!item.namespace) {
              log.error(`<updateAll> namespace is undefined. (${item.filePath})`, false)
              // continue
              return false
            }
            const swaggerItem = this.viewList.getInterFacePathNameMap(
              item.namespace,
              item.savePath
            ) as unknown as TreeInterface
            if (!swaggerItem) {
              log.error(`<updateAll> swaggerItem is undefined. (${item.filePath})`, false)
              // continue
              return false
            }

            await this.viewList
              .saveInterface(swaggerItem, item.filePath)
              .then((res) => {
                if (res === 'no-change') {
                  return log.info(`${localize.getLocalize('text.noChange')} <${item.name}> `)
                }
                log.info(
                  `${localize.getLocalize('command.local.updateInterface')} <${item.name}> ${
                    item.filePath
                  } ${localize.getLocalize('success')}`
                )
              })
              .catch((err) => {
                log.error(
                  `${localize.getLocalize('command.local.updateInterface')} <${item.name}> ${localize.getLocalize(
                    'failed'
                  )} ${err}`,
                  true
                )
              })

            progress.report({ increment, message: key })
            increment += unit
          }
          for (const [key, item] of this.localFilesMap) {
            if (Array.isArray(item)) {
              item.map((i) => updateFunc(key, i))
            } else {
              updateFunc(key, item)
            }
          }

          resolve(void 0)
        })
      }
    )

    progressPanel.then(() => {
      this.statusBarItem.text = statusBarItemText
      this.statusBarItem.command = 'cmd.local.updateAll'
      this.initLocalFiles()
      log.info(`${localize.getLocalize('text.updateButton')} ${localize.getLocalize('success')}`)
      log.outputChannel.show()
    })
  }

  /** 刷新单个本地接口 */
  public updateSingle(filePath: string) {
    const fileInfo = this.readLocalFile(filePath)

    if (fileInfo && fileInfo.ext === 'ts') {
      this.localFilesMap.set(filePath, fileInfo)
      this.refactorLocalFilesList()
    }
  }

  getChildren(): Thenable<LocalItem[]> {
    const treeItems = this.renderItems(this.localFilesList)

    return Promise.resolve(treeItems)
  }

  renderItems(itemList: FileHeaderInfo[]): LocalItem[] {
    return itemList.map(this.renderItem)
  }

  renderItem(item: FileHeaderInfo) {
    const title = item.name || item.namespace || item.fileName

    const options: BaseTreeItemOptions & ExtLocalItemOptions = {
      title,
      type: item.ignore ? 'file-ignore' : 'file-sync',
      subTitle: `[${item.update || 'No Update Date'}] <${item.namespace}> ${item.path}`,
      collapsible: 0,
      filePath: item.filePath,
      namespace: item.namespace,
      isRequest: item.isRequest,
      command: {
        title,
        command: 'cmd.common.openFile',
        arguments: [item.filePath],
      },
    }

    return new LocalItem(options)
  }

  getParent() {
    return void 0
  }

  /** 重新生成本地文件列表 */
  public refactorLocalFilesList() {
    this.localFilesList = []
    // this.localFilesMap.forEach((val) => {
    //   this.localFilesList.push(val)
    // })
    for (const [key, item] of this.localFilesMap) {
      if (Array.isArray(item)) {
        item.forEach((i) => {
          if (!this.localFilesList.some((file) =>file.namespace === i.namespace)) {
            this.localFilesList.push(i)
          }
        })
      } else {
        if (!this.localFilesList.some((file) =>file.namespace === item.namespace)) {
          this.localFilesList.push(item)
        }
      }
    }
    this._onDidChangeTreeData.fire(undefined)
  }

  /** 刷新 */
  public refresh(): void {
    // 0.5 秒防抖, 避免重复刷新产生大量算力开销
    this.debounce(() => this._refresh(), 500)
  }

  private _refresh() {
    this.initLocalFiles()
    log.info('refresh: view.local')
  }

  /** settings.json 文件变更时触发 */
  public onConfigurationRefresh() {
    this.allSavePath = this.getAllSavePath()
    this.initStatusBarItem()
    this.refresh()
  }

  /** 通过namespace在localFileList中查找某个文件*/
  public findLocalFileByNamespace(namespace: string): FileHeaderInfo | undefined {
    const item = this.localFilesList.find((item) => item.namespace === namespace)
    return item
  }

  /** 通过localItem的filePath在localFileList中查找某个请求，并删除本地文件中的该请求*/
  public deleteRequest(localItem: LocalItem): void {
    const fileStr = fs.readFileSync(localItem.options.filePath, 'utf-8')
    this.removeExportByNameRegex(fileStr, localItem.options.namespace || '', localItem.options.filePath)
  }

  /** 使用正则表达式解析代码，删除指定的export及其只注释*/
  async removeExportByNameRegex(code: string, methodNameToRemove: string, filePath: string) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        return reject()
      }
      try {
        const regexp = new RegExp(`\\/\\*[^\\/]*\\*\\/\\n?export\\sconst\\s${methodNameToRemove}\\s*=\\s*\\([^]*?\\)\\s*=>([\\s\\S]*?)\\)`,'gs')
        const updatedData = code.replace(regexp, '')
        fs.writeFileSync(filePath, updatedData, 'utf-8')
        resolve(void 0)
      } catch (error: any) {
        log.error(error, true)
        reject()
      }
    })
    
  }
  // /** 使用babel解析代码，删除指定的export*/
  // removeExportByName(code: string, methodNameToRemove: string) {
  //   // 解析为AST......
  // }

  /** 销毁时释放资源 */
  destroy(): void {}
}

export class LocalItem extends BaseTreeItem<ExtLocalItemOptions> {}
