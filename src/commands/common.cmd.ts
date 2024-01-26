import fs from 'fs'
import path from 'path'
import vscode from 'vscode'
import os from 'os'
import { config, localize, WORKSPACE_PATH, log } from '../tools'

import { ListItem, ViewList } from '../views/list.view'
import { LocalItem, ViewLocal } from '../views/local.view'

export function registerCommonCommands(viewList: ViewList, viewLocal: ViewLocal) {
  const commands = {
    // 设置
    setting() {
      if (WORKSPACE_PATH) {
        const { swaggerJsonUrl, savePath } = config.extConfig
        if (!swaggerJsonUrl || !swaggerJsonUrl.length) {
          config.setCodeConfig({ swaggerJsonUrl: [] })
        }

        if (!savePath) {
          config.setCodeConfig({ savePath: '' })
        }

        log.info('open-workspace-settings')

        vscode.workspace.openTextDocument(path.join(WORKSPACE_PATH, '.vscode/settings.json')).then((doc) => {
          vscode.window.showTextDocument(doc)
        })
      } else {
        vscode.window.showWarningMessage(localize.getLocalize('text.noWorkspace'))
      }
    },

    /** 打开外部链接 */
    openLink(item: ListItem) {
      const { configItem } = item.options
      const link = configItem.link || configItem.url

      vscode.env.openExternal(vscode.Uri.parse(link))
    },

    /** 打开本地文件 */
    openFile(path?: string) {
      if (!path) return log.error(localize.getLocalize('error.path'), true)

      vscode.workspace.openTextDocument(path).then((doc) => {
        vscode.window.showTextDocument(doc)
      })
    },

    /** 删除本地文件 */
    deleteFile(path: string | LocalItem) {
      const pathH = typeof path === 'string' ? path : path.options.filePath
      if (!pathH) return log.error(localize.getLocalize('error.path'), true)
      const isRequest = typeof path === 'string' ? false : !!path.options.isRequest

      const confirmText = localize.getLocalize('text.confirm')
      const cancelText = localize.getLocalize('text.cancel')

      vscode.window
        .showWarningMessage(localize.getLocalize('text.confirmDeleteFile'), confirmText, cancelText)
        .then((res) => {
          if (res === confirmText) {
            try {
              if (isRequest) {
                /** 如果是请求，删除请求，刷新列表 */
                viewLocal.deleteRequest(path as LocalItem)
              } else {
                /** 如果是请求+类型，删除请求与类型文件*/
                // viewLocal.deleteRequest(path as LocalItem)
                fs.unlinkSync(pathH)
              }
              
              log.info(`Remove file: ${pathH}`)
              viewLocal.refresh()
            } catch (error) {
              log.error(error, true)
            }
          }
        })
    },

    /** 自动填充请求参数*/
    autofill() {
      /** 获取当前文档编辑器*/
      const editor = vscode.window.activeTextEditor
      /** 获取当前光标所在位置*/
      const position = editor?.selection.active
      /** 获取当前行文本内容，并通过正则匹配到方法名*/
      const lineText = position ? editor?.document.lineAt(position)?.text : ''
      const reqName = lineText.match(/await\s+([^\(\)]+)\(/)?.[1] || ''

      /** 查找ViewLocal中namespace与docStr相匹配的方法*/
      const reuqest = viewLocal.findLocalFileByNamespace(reqName)
      if(reuqest) {
        const params = reuqest.params?.replace(/\{/g, '{\n').replace(/\}/g, '\n}').replace(/,/g, ',\n')
        console.log('autofill params===>', params);

        /** 在光标位置插入代码片段*/
        if(position && params) {
          editor?.edit((editBuilder) => {
            editBuilder.insert(position, params)
          })
        }
      } else {
        log.warn(localize.getLocalize('text.noRequestAutofill'), true)
      }
      
      
    }
  }

  for (const command in commands) {
    vscode.commands.registerCommand(`cmd.common.${command}`, commands[command])
  }
}
