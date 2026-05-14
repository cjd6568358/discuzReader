import { load as lexborLoad } from '../lexbor/lexbor'
import invariant from 'invariant'
import { defaultFilterDict, FilterFn } from './filters'
import { defaultProcedureDict, ProcedureFn } from './procedures'
import { defaultModifierDict, ModifierFn } from './modifiers'
import { checkRootSelector, msg } from './check'
import { CaptureResult } from './CaptureResult'
import {
  isAttributeQualifier,
  isCapture,
  isCheerioStatic,
  last,
  makeNormalCssSelector,
} from './utils'
import {
  Dict,
  ExpandedTemmeSelector,
  NormalSelector,
  ParentRefSelector,
  SnippetDefine,
  TemmeSelector,
} from './interfaces'

export interface TemmeParser {
  parse(temmeSelectorString: string): TemmeSelector[]
}

// Note that we are importing .pegjs file directly which requires using rollup as the bundler.
// @ts-ignore
import parser from './grammar.js'

const temmeParser: TemmeParser = parser as unknown as TemmeParser

export { lexborLoad as cheerio, temmeParser }

/** 预处理 HTML：移除 script/style/comment 块，减少 HtmlParser2 工作量。
 *  这些内容不影响 temme 选择器的匹配结果。 */
export function htmlShaking(html: string): string {
  return (
    html
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "")
      .replace(/<!DOCTYPE[^>]*>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/ (alt|checked|disabled|selected|readonly|multiple|nowrap|noshade|noresize|declare|defer|ismap)=""/g, ' $1')
  );
}

// 缓存已解析的选择器字符串，避免重复解析
const selectorCache = new Map<string, TemmeSelector[]>()
// 缓存展开的片段选择器，避免重复计算
const snippetExpandCache = new Map<string, ExpandedTemmeSelector[]>();

export default function temme(
  html: string | CheerioStatic | CheerioElement,
  selector: string | TemmeSelector[],
  extraFilters: Dict<FilterFn> = {},
  extraModifiers: Dict<ModifierFn> = {},
  extraProcedures: Dict<ProcedureFn> = {},
) {
  console.log('[temme] start, html length:', typeof html === 'string' ? html.length : 'N/A')

  let $: any
  if (typeof html === 'string') {
    const t0 = Date.now()
    const shaken = htmlShaking(html)
    console.log('[temme] htmlShaking done:', Date.now() - t0, 'ms, shaken length:', shaken.length)
    const t1 = Date.now()
    $ = lexborLoad(shaken)
    console.log('[temme] lexborLoad done:', Date.now() - t1, 'ms')
  } else if (isCheerioStatic(html)) {
    $ = html
  } else {
    $ = lexborLoad(String(html))
  }

  let rootSelectorArray: TemmeSelector[]
  if (typeof selector === 'string') {
    if (selectorCache.has(selector)) {
      rootSelectorArray = selectorCache.get(selector)!
      console.log('[temme] selector cache hit')
    } else {
      const t2 = Date.now()
      rootSelectorArray = temmeParser.parse(selector)
      console.log('[temme] temmeParser.parse done:', Date.now() - t2, 'ms')
      selectorCache.set(selector, rootSelectorArray)
    }
  } else {
    rootSelectorArray = selector
  }

  if (!rootSelectorArray || rootSelectorArray.length === 0) {
    console.log('[temme] empty selector, returning null')
    return null
  }

  /* istanbul ignore else */
  if (process.env.NODE_ENV !== 'production') {
    rootSelectorArray.forEach(checkRootSelector)
  }

  const filterDict: Dict<FilterFn> = Object.keys(extraFilters).length > 0 ? Object.assign({}, defaultFilterDict, extraFilters) : defaultFilterDict
  const modifierDict: Dict<ModifierFn> = Object.keys(extraModifiers).length > 0 ? Object.assign({}, defaultModifierDict, extraModifiers) : defaultModifierDict
  const procedureDict: Dict<ProcedureFn> = Object.keys(extraProcedures).length > 0 ? Object.assign({}, defaultProcedureDict, extraProcedures) : defaultProcedureDict
  const snippetsMap = new Map<string, SnippetDefine>()

  const expandedSelectorCache = new Map<TemmeSelector[], ExpandedTemmeSelector[]>()

  const t3 = Date.now()
  const result = helper($.root(), rootSelectorArray).getResult()
  console.log('[temme] helper done:', Date.now() - t3, 'ms')
  console.log('[temme] total done')
  return result
  
  function helper(cntCheerio: any, selectorArray: TemmeSelector[]): CaptureResult {
    const result = new CaptureResult(filterDict, modifierDict)

    // First pass: process SnippetDefine / FilterDefine / ModifierDefine / ProcedureDefine
    for (const selector of selectorArray) {
      if (selector.type === 'snippet-define') {
        invariant(!snippetsMap.has(selector.name), msg.snippetAlreadyDefined(selector.name))
        snippetsMap.set(selector.name, selector)
      } else if (selector.type === 'filter-define') {
        const { name, argsPart, code } = selector
        invariant(!(name in filterDict), msg.filterAlreadyDefined(name))
        filterDict[name] = new Function(argsPart, code) as FilterFn
      } else if (selector.type === 'modifier-define') {
        const { name, argsPart, code } = selector
        invariant(!(name in modifierDict), msg.modifierAlreadyDefined(name))
        modifierDict[name] = new Function(argsPart, code) as ModifierFn
      } else if (selector.type === 'procedure-define') {
        const { name, argsPart, code } = selector
        invariant(!(name in procedureDict), msg.procedureAlreadyDefined(name))
        procedureDict[name] = new Function(argsPart, code) as ProcedureFn
      }
    }

    // 使用缓存获取展开后的选择器
    let expandedSelectors: ExpandedTemmeSelector[];
    if (expandedSelectorCache.has(selectorArray)) {
      expandedSelectors = expandedSelectorCache.get(selectorArray)!;
    } else {
      expandedSelectors = expandSnippets(selectorArray);
      expandedSelectorCache.set(selectorArray, expandedSelectors);
    }

    for (const selector of expandedSelectors) {
      if (selector.type === 'normal-selector') {
        const cssSelector = makeNormalCssSelector(selector.sections)
        const t = Date.now()
        const subCheerio = cntCheerio.find(cssSelector)
        const elapsed = Date.now() - t
        if (elapsed > 100) {
          console.log(`[temme] SLOW find "${cssSelector}" took ${elapsed}ms, matched ${subCheerio.length}`)
        }
        if (subCheerio.length > 0) {
          capture(result, subCheerio.first(), selector)
        }
        if (selector.arrayCapture) {
          const capturedResults: any[] = []
          subCheerio.each((_, elem) => {
            capturedResults.push(helper(elem, selector.children).getResult())
          })
          result.add(selector.arrayCapture, capturedResults)
        }
      } else if (selector.type === 'parent-ref-selector') {
        const cssSelector = makeNormalCssSelector([selector.section])
        if (cntCheerio.is(cssSelector)) {
          capture(result, cntCheerio, selector)
        }
      } else if (selector.type === 'assignment') {
        result.forceAdd(selector.capture, selector.value)
      } // else selector.type is 'xxx-define'. Do nothing.
    }
    return result
  }
  
  /** Expand snippets recursively.
   * The returned selector array will not contain any `SnippetExpand`.
   * `expanded` is used to detect circular expansion. */
  function expandSnippets(
    selectorArray: TemmeSelector[],
    expanded: Set<string> = new Set(),
  ): ExpandedTemmeSelector[] {
    const result: ExpandedTemmeSelector[] = []
    for (const selector of selectorArray) {
      if (selector.type === 'snippet-expand') {
        invariant(snippetsMap.has(selector.name), msg.snippetNotDefined(selector.name))
        const snippet = snippetsMap.get(selector.name)!

        // 检查循环展开
        invariant(!expanded.has(snippet.name), msg.circularSnippetExpansion([...expanded, snippet.name]))

        // 使用缓存获取已展开的片段
        const cacheKey = snippet.name + ':' + [...expanded].join(',')
        if (snippetExpandCache.has(cacheKey)) {
          result.push(...snippetExpandCache.get(cacheKey)!)
        } else {
          const nextExpanded = new Set(expanded).add(snippet.name)
          const slice = expandSnippets(snippet.selectors, nextExpanded)
          snippetExpandCache.set(cacheKey, slice)
          result.push(...slice)
        }
      } else {
        result.push(selector)
      }
    }
    return result
  }
  
  /** Capture the node according to the selector. */
  function capture(
    result: CaptureResult,
    node: any,
    selector: NormalSelector | ParentRefSelector,
  ) {
    const section = selector.type === 'normal-selector' ? last(selector.sections) : selector.section
    const attributeQualifiers = section.qualifiers.filter(isAttributeQualifier)
    for (let i = 0; i < attributeQualifiers.length; i++) {
      const qualifier = attributeQualifiers[i];
      if (isCapture(qualifier.value)) {
        const { attribute, value: capture } = qualifier
        const attributeValue = node.attr(attribute)
        if (attributeValue !== undefined) {
          // capture only when attribute exists
          result.add(capture, attributeValue)
        }
      }
    }

    // 优化过程调用
    if (selector.procedure != null) {
      const { name, args } = selector.procedure
      const fn = procedureDict[name]
      invariant(typeof fn === 'function', msg.invalidProcedure(name))
      fn(result, node, ...args)
    }
  }
}
