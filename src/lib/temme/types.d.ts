interface CheerioStatic {
  (selector: string): Cheerio
  (element: CheerioElement | CheerioElement[]): Cheerio
  root(): Cheerio
  load(html: string | CheerioElement, options?: any): CheerioStatic
  html(): string
  text(): string
}

interface Cheerio {
  [index: number]: CheerioElement
  length: number
  find(selector: string): Cheerio
  first(): Cheerio
  last(): Cheerio
  eq(index: number): Cheerio
  parent(selector?: string): Cheerio
  parents(selector?: string): Cheerio
  children(selector?: string): Cheerio
  each(func: (index: number, element: CheerioElement) => void): Cheerio
  map(func: (index: number, element: CheerioElement) => any): Cheerio
  toArray(): CheerioElement[]
  text(): string
  html(): string
  attr(name: string): string | undefined
  attr(name: string, value: string): Cheerio
  removeAttr(name: string): Cheerio
  hasClass(className: string): boolean
  addClass(className: string): Cheerio
  removeClass(className: string): Cheerio
  is(selector: string): boolean
  val(): string
  css(name: string): string
  data(name: string): any
  prepend(content: string): Cheerio
  append(content: string): Cheerio
  remove(): Cheerio
  clone(): Cheerio
  replaceWith(content: string): Cheerio
  empty(): Cheerio
  wrap(content: string): Cheerio
}

interface CheerioElement {
  type: string
  name: string
  attribs: { [attr: string]: string }
  children: CheerioElement[]
  next: CheerioElement | null
  prev: CheerioElement | null
  parent: CheerioElement | null
  data?: string
}

interface CheerioOptions {
  withDomLvl1?: boolean
  normalizeWhitespace?: boolean
  xmlMode?: boolean
  decodeEntities?: boolean
  _useHtmlParser2?: boolean
}

declare module 'react-native-cheerio' {
  const cheerio: CheerioStatic & {
    load(html: string | CheerioElement, options?: CheerioOptions): CheerioStatic
  }

  export default cheerio
}

declare module '../lexbor/lexbor-android' {
  interface LexborNode {
    _handle: string
    _doc: string
    find(selector: string): LexborList
    is(selector: string): boolean
    attr(name: string): string | undefined
    text(): string
    html(): string
    // Getter properties (shared by both platforms)
    type: string | null
    name: string | null
    // Method aliases (shared by both platforms)
    getNodeName(): string | null
    getType(): string | null
    getParent(): LexborNode | null
    getChildren(): LexborNode[]
    // Other
    length: number
    first(): LexborNode
    each(fn: (index: number, node: LexborNode) => void): LexborNode
    eq(): LexborNode
    data(): string
    cheerio: string
  }

  interface LexborList {
    _handles: string[]
    _doc: string
    length: number
    find(selector: string): LexborList
    is(selector: string): boolean
    attr(name: string): string | undefined
    text(): string
    html(): string
    // Getter properties
    type: string | null
    name: string | null
    // Method aliases
    getNodeName(): string | null
    getType(): string | null
    getParent(): LexborNode | null
    getChildren(): LexborNode[]
    // List operations
    first(): LexborNode
    last(): LexborNode
    eq(index: number): LexborNode | LexborList
    each(fn: (index: number, node: LexborNode) => void): LexborList
    map(fn: (index: number, node: LexborNode) => any): any[]
    toArray(): LexborNode[]
    data(): string
    cheerio: string
  }

  interface LexborStatic {
    (selector: string): LexborList
    (handle: string): LexborNode
    root(): LexborNode & {
      find(selector: string): LexborList
      is(): boolean
      text(): string
      html(): string
      attr(): undefined
      length: number
      first(): LexborNode
      each(fn: (index: number, node: any) => void): any
      eq(): LexborNode
      data(): string
    }
    find(selector: string): LexborList
    node(handle: string): LexborNode | null
    destroy(): void
    cheerio: string
  }

  export function load(html: string): LexborStatic
  export function isLexborInstance(obj: any): boolean
  export default { load, isLexborInstance }
}
