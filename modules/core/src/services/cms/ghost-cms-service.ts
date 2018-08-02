import { inject, injectable, tagged } from 'inversify'
import path from 'path'

import { ExtendedKnex } from '../../database/interfaces'
import { Logger } from '../../misc/interfaces'
import { TYPES } from '../../misc/types'
import { GhostContentService } from '../ghost-content'

import { CMSService, ContentElement, ContentType } from '.'
import { CodeFile, SafeCodeSandbox } from './util'

const LOCATION = 'content-types'

@injectable()
export class GhostCMSService implements CMSService {
  loadedContentTypes: ContentType[]

  constructor(
    @inject(TYPES.Logger)
    @tagged('name', 'CMS')
    private logger: Logger,
    @inject(TYPES.GhostService) private ghost: GhostContentService,
    @inject(TYPES.InMemoryDatabase) private memDb: ExtendedKnex
  ) {}

  async initialize() {
    await this.ghost.addRootFolder(true, LOCATION, { filesGlob: '**.js', isBinary: false })
    await this.prepareDb()
    await this.loadContentTypesFromFiles()
    await this.listContentElements('bot123', 'buitin_text')
  }

  private async prepareDb() {
    await this.memDb.createTableIfNotExists('content_elements', table => {
      table.string('id')
      table.string('botId')
      table.primary(['id', 'botId'])
      table.string('contentType')
      table.text('rawData')
      table.text('computedData')
      table.text('previewText')
      table.string('createdBy')
      table.timestamp('created_on')
    })
  }

  private async loadContentTypesFromFiles(): Promise<void> {
    const fileNames = await this.ghost.directoryListing('global', LOCATION, '*.js')

    const codeFiles = await Promise.map(fileNames, async filename => {
      const content = <string>await this.ghost.readFile('global', LOCATION, filename)
      return <CodeFile>{ code: content, relativePath: filename }
    })

    const sandbox = new SafeCodeSandbox(codeFiles)
    let filesLoaded = 0

    try {
      for (const file of sandbox.ls()) {
        try {
          const filename = path.basename(file)
          if (filename.startsWith('_')) {
            // File to exclude
            continue
          }
          await this.loadContentTypeFromFile(sandbox, file)
          filesLoaded++
        } catch (e) {
          this.logger.error(e, `Could not load Content Type "${file}"`)
        }
      }
    } finally {
      sandbox && sandbox.dispose()
      this.logger.debug(`Loaded ${filesLoaded} content types`)
    }
  }

  private async loadContentTypeFromFile(sandbox: SafeCodeSandbox, fileName: string): Promise<void> {
    const type = <ContentType>await sandbox.run(fileName)

    if (!type || !type.id) {
      throw new Error('Invalid type ' + fileName)
    }
  }

  async listContentElements(botId: string, contentType: string): Promise<ContentElement[]> {
    const fileNames = await this.ghost.directoryListing(botId, '/content-elements', '.json')
    const elements: ContentElement[] = []

    // fileNames.map(fileName => {
    //   this.ghost.readFile(botId, '/content-elements', fileName)
    // })

    for (const fileName of fileNames) {
      const file = <string>await this.ghost.readFile(botId, '/content-elements', fileName)
      // const element = safeEvalToObject<ContentElement>(file) // Do we need safe??
      // console.log(element)
      // elements.push(element)
    }

    return elements
  }
  getContentElement(botId: string, id: string): Promise<ContentElement> {
    throw new Error('Method not implemented.')
  }
  getContentElements(botId: string, ids: string): Promise<ContentElement[]> {
    throw new Error('Method not implemented.')
  }
  getAllContentTypes(): Promise<ContentType[]>
  getAllContentTypes(botId: string): Promise<ContentType[]>
  async getAllContentTypes(botId?: any) {
    return []
  }
  getContentType(contentType: string): Promise<ContentType> {
    throw new Error('Method not implemented.')
  }
  countContentElements(botId: string, contentType: string): Promise<number> {
    throw new Error('Method not implemented.')
  }
  deleteContentElements(botId: string, ids: string[]): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
