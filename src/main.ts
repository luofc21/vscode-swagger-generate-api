import vscode from 'vscode'
import { ViewList } from './views/list.view'
import { ViewLocal } from './views/local.view'

import { log, config, getWorkspaceTemplateConfig } from './tools'
import {
  registerCommonCommands,
  registerListCommands,
  registerLocalCommands,
  registerTemplateCommands,
} from './commands'

let viewList: ViewList
let viewLocal: ViewLocal

export function activate(ctx: vscode.ExtensionContext) {
  viewList = new ViewList()
  viewLocal = new ViewLocal(viewList)

  const { reloadWhenSettingsChanged } = config.extConfig
  console.log('config.extConfig===>', config.extConfig);
  // global.ctx = ctx

  const listTreeView = vscode.window.createTreeView('view.list', { treeDataProvider: viewList })
  const localTreeView = vscode.window.createTreeView('view.local', { treeDataProvider: viewLocal })

  registerCommonCommands(viewList, viewLocal)
  registerListCommands({ viewList, viewLocal, listTreeView, localTreeView })
  registerLocalCommands(viewList, viewLocal)
  registerTemplateCommands()

  // 监听 settings.json 文件变更
  if (reloadWhenSettingsChanged) {
    vscode.workspace.onDidChangeConfiguration(() => {
      viewList.onConfigurationRefresh()
      viewLocal.onConfigurationRefresh()
    })
    vscode.workspace.onDidSaveTextDocument(event => {
      console.log('onDidSaveTextDocument===>', event.fileName);
      if (event.fileName.includes('swagger-to-types.template')) {
        getWorkspaceTemplateConfig()
      }
    })
  }

  log.info('Extension activated.')
}

// this method is called when your extension is deactivated
export function deactivate() {
  viewLocal?.destroy()

  log.info('Extension deactivated.')
}
