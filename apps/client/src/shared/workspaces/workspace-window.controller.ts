export interface WorkspaceWindowOptions {
  workspaceId: string
  title: string
  width?: number
  height?: number
}

const copiedStyleSelector = 'link[rel="stylesheet"], style'

export class WorkspaceWindowController {
  private childWindow: Window | null = null
  private mountTarget: HTMLElement | null = null
  private documentObserver: MutationObserver | null = null
  private headObserver: MutationObserver | null = null

  constructor(private readonly options: WorkspaceWindowOptions) {}

  get target(): HTMLElement | null {
    return this.mountTarget
  }

  open(): HTMLElement | null {
    if (this.childWindow && !this.childWindow.closed && this.mountTarget) {
      this.childWindow.focus()
      return this.mountTarget
    }

    const width = this.options.width ?? 1180
    const height = this.options.height ?? 780
    const frameName = `fabric-workspace:${this.options.workspaceId}`
    const childWindow = window.open(
      'about:blank',
      frameName,
      `popup=yes,width=${width},height=${height}`,
    )
    if (!childWindow) return null

    this.childWindow = childWindow
    this.prepareDocument(childWindow.document)
    this.observeParentDocument(childWindow.document)
    void window.fabricDesktop?.workspaceReady(this.options.workspaceId)
    return this.mountTarget
  }

  focus(): void {
    this.childWindow?.focus()
  }

  close(): void {
    this.childWindow?.close()
  }

  dispose(options: { closeWindow?: boolean } = {}): void {
    this.documentObserver?.disconnect()
    this.headObserver?.disconnect()
    this.documentObserver = null
    this.headObserver = null
    if (options.closeWindow !== false && this.childWindow && !this.childWindow.closed) {
      this.childWindow.close()
    }
    this.mountTarget = null
    this.childWindow = null
  }

  private prepareDocument(document: Document): void {
    document.title = this.options.title
    document.documentElement.lang = window.document.documentElement.lang || 'en'
    document.body.replaceChildren()
    document.body.className = 'fabric-workspace-document'

    this.syncDocumentTheme(document)
    this.syncStyles(document)

    const target = document.createElement('div')
    target.id = `fabric-workspace-${this.options.workspaceId}`
    target.className = 'fabric-workspace-mount'
    document.body.append(target)
    this.mountTarget = target
  }

  private observeParentDocument(document: Document): void {
    this.documentObserver = new MutationObserver(() => this.syncDocumentTheme(document))
    this.documentObserver.observe(window.document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    })

    this.headObserver = new MutationObserver(() => this.syncStyles(document))
    this.headObserver.observe(window.document.head, { childList: true, subtree: true })
  }

  private syncDocumentTheme(document: Document): void {
    const source = window.document.documentElement
    document.documentElement.className = source.className
    const sourceStyle = source.getAttribute('style')
    if (sourceStyle) document.documentElement.setAttribute('style', sourceStyle)
    else document.documentElement.removeAttribute('style')

    const theme = source.getAttribute('data-theme')
    if (theme) document.documentElement.setAttribute('data-theme', theme)
    else document.documentElement.removeAttribute('data-theme')
  }

  private syncStyles(document: Document): void {
    document.head.querySelectorAll('[data-fabric-workspace-style]').forEach((node) => node.remove())
    window.document.head.querySelectorAll<HTMLLinkElement | HTMLStyleElement>(copiedStyleSelector)
      .forEach((source) => {
        const copy = source.cloneNode(true) as HTMLLinkElement | HTMLStyleElement
        copy.setAttribute('data-fabric-workspace-style', '')
        if (source instanceof HTMLLinkElement) (copy as HTMLLinkElement).href = source.href
        document.head.append(copy)
      })
  }
}
