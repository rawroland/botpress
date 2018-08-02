import fs from 'fs'
import _ from 'lodash'
import path from 'path'
import tmp from 'tmp'

import { VError } from 'verror'
import { NodeVM } from 'vm2'

export type CodeFile = {
  relativePath: string
  code: string
}

export class SafeCodeSandbox {
  private tmpDir: tmp.SynchrounousResult
  private vm: NodeVM
  private tmpPath: string
  private filesMap: { [name: string]: string } = {}

  constructor(files: CodeFile[]) {
    this.tmpDir = tmp.dirSync({ prefix: 'sandbox-', keep: false, unsafeCleanup: true })
    this.tmpPath = this.tmpDir.name

    for (const file of files) {
      const filePath = path.resolve(path.join(this.tmpDir.name, file.relativePath))
      this.filesMap[file.relativePath] = filePath
      fs.writeFileSync(filePath, file.code, 'utf8')
    }

    this.vm = new NodeVM({
      compiler: 'javascript',
      sandbox: {},
      timeout: 1000,
      console: 'redirect',
      sourceExtensions: ['js'],
      nesting: false,
      require: {
        builtin: [],
        external: true,
        context: 'sandbox',
        import: [],
        root: this.tmpPath
      }
    })
  }

  ls(): string[] {
    return Object.keys(this.filesMap)
  }

  async run(fileName: string): Promise<any> {
    const code = fs.readFileSync(this.filesMap[fileName], 'utf8')
    try {
      return await this.vm.run(
        code,
        path.join(
          this.tmpPath,
          `${Math.random()
            .toString()
            .substr(2, 6)}.js`
        )
      ) // Await cause if it returns a promise we await it
    } catch (e) {
      throw new VError(e, `Error executing file "${fileName}" in SafeSandbox`)
    }
  }

  dispose(): void {
    this.tmpDir.removeCallback()
  }
}
