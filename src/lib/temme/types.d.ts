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

declare module '../lexbor/lexbor' {
  interface LexborNode {
    _handle: number
    _doc: number
    find(selector: string): LexborList
    is(selector: string): boolean
    attr(name: string): string | undefined
    text(): string
    html(): string
    nodeName: string | null
    type: string | null
    parent: LexborNode | null
    children: LexborNode[]
    length: number
    first(): LexborNode
    each(fn: (index: number, node: LexborNode) => void): LexborNode
    eq(): LexborNode
    data(): string
  }

  interface LexborList {
    _handles: number[]
    _doc: number
    length: number
    find(selector: string): LexborList
    is(selector: string): boolean
    attr(name: string): string | undefined
    text(): string
    html(): string
    nodeName: string | null
    type: string | null
    parent: LexborNode | null
    children: LexborNode[]
    first(): LexborNode
    last(): LexborNode
    eq(index: number): LexborNode | LexborList
    each(fn: (index: number, node: LexborNode) => void): LexborList
    map(fn: (index: number, node: LexborNode) => any): any[]
    toArray(): LexborNode[]
    data(): string
  }

  interface LexborStatic {
    (selector: string): LexborList
    (handle: number): LexborNode
    root(): LexborNode & {
      find(selector: string): LexborList
      is(): boolean
      text(): string
      html(): string
      attr(): undefined
      length: number
      first(): LexborNode
      each(fn: (index: number, node: any) => void): any
    }
    find(selector: string): LexborList
    node(handle: number): LexborNode | null
    destroy(): void
  }

  export function load(html: string): LexborStatic
  export function isLexborInstance(obj: any): boolean
}
