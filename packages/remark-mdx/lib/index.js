/**
 * @import {ToMarkdownOptions} from 'mdast-util-mdx'
 * @import {Options as MicromarkOptions} from 'micromark-extension-mdxjs'
 * @import {CompileContext, Extension as FromMarkdownExtension, Handle} from 'mdast-util-from-markdown'
 * @import {Parent} from 'mdast'
 * @import {Processor} from 'unified'
 */

/**
 * @typedef {MicromarkOptions & ToMarkdownOptions} Options
 *   Configuration.
 */

import {mdxFromMarkdown, mdxToMarkdown} from 'mdast-util-mdx'
import {mdxjs} from 'micromark-extension-mdxjs'

/** @type {Readonly<Options>} */
const emptyOptions = {}

/**
 * Extension for `mdast-util-from-markdown` that keeps the curly braces of MDX
 * expressions in the alt text of images.
 *
 * The default `label` exit handler in `mdast-util-from-markdown` flattens the
 * label fragment with `mdast-util-to-string`, which for MDX expressions
 * (`{a}`) yields just the expression (`a`), dropping the braces.
 * For links that’s fine: there the children of the fragment become the
 * children of the link, so expression nodes are kept.
 * But for images the flattened value becomes `alt`, a plain string, so the
 * braces get lost.
 * CommonMark keeps the braces (`![{a}](b)` has an alt of `{a}`), and the
 * braces are also what makes an expression different from plain text, so
 * they are added back here.
 *
 * This hooks into `labelMarker`, which is exited before `label` is, and has
 * no default handler, so the default `label` handler can run unchanged
 * afterwards.
 *
 * @type {FromMarkdownExtension}
 */
const fromMarkdownExtension = {
  exit: {
    labelMarker: exitLabelMarker
  }
}

/**
 * Replace MDX expressions in the label of an image with text nodes wrapping
 * the expression in curly braces.
 *
 * Only runs for images: for links the fragment is kept as children, so
 * expressions keep working there.
 *
 * @this {CompileContext}
 *   Context.
 * @type {Handle}
 * @returns {undefined}
 *   Nothing.
 */
function exitLabelMarker() {
  const fragment = this.stack[this.stack.length - 1]
  const node = this.stack[this.stack.length - 2]

  // Nothing to do for links: the fragment is kept as children, so
  // expressions keep working there.
  if (!node || node.type !== 'image' || !('children' in fragment)) {
    return
  }

  visitExpressions(fragment)
}

/**
 * Replace MDX expressions with text nodes wrapping their values in curly
 * braces.
 *
 * @param {Parent} node
 *   Node.
 * @returns {undefined}
 *   Nothing.
 */
function visitExpressions(node) {
  const children = node.children
  let index = -1

  while (++index < children.length) {
    const child = children[index]
    if (child.type === 'mdxTextExpression') {
      children[index] = {type: 'text', value: '{' + child.value + '}'}
    } else if ('children' in child) {
      visitExpressions(child)
    }
  }
}

/**
 * Add support for MDX (JSX: `<Video id={123} />`, export/imports: `export {x}
 * from 'y'`; and expressions: `{1 + 1}`).
 *
 * @this {Processor}
 *   Processor.
 * @param {Readonly<Options> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {undefined}
 *   Nothing.
 */
export default function remarkMdx(options) {
  const self = this
  const settings = options || emptyOptions
  const data = self.data()

  const micromarkExtensions =
    data.micromarkExtensions || (data.micromarkExtensions = [])
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions || (data.fromMarkdownExtensions = [])
  const toMarkdownExtensions =
    data.toMarkdownExtensions || (data.toMarkdownExtensions = [])

  micromarkExtensions.push(mdxjs(settings))
  fromMarkdownExtensions.push(mdxFromMarkdown(), fromMarkdownExtension)
  toMarkdownExtensions.push(mdxToMarkdown(settings))
}
