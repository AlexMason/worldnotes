// ─── Content text — the ONE raw-text model for the editor DOM ──────────────
// Caret math (caret-offset.ts) and input serialization (editor-lifecycle.ts)
// must agree, node-for-node, on how rendered DOM maps back to raw markdown
// source. Two independent implementations of that mapping drifting apart is a
// silent data-loss bug, so there is exactly one module for both directions.
//
// Rules:
// - Text nodes contribute their text verbatim (the `wn-punct` convention:
//   token renders keep source characters as real text nodes, e.g. `**`).
// - Elements with `data-raw` contribute the raw string INSTEAD of their
//   subtree (token-level glyph substitution: wiki links, list items).
// - Elements with `data-line` delimit source lines: exactly one newline
//   separates consecutive line containers — including lines nested inside
//   block wrappers (code fences, tables), which is why the walk tracks
//   `hadDataLine` across arbitrary depth.
//
// Invariants this module relies on (enforced by the renderers):
// 1. Block wrappers contain ONLY `[data-line]` element children — no stray
//    text nodes (whitespace between line divs would materialize as content
//    under `pre-wrap` and desync `rawNodeLength` from `extractContentText`).
// 2. `data-raw` never co-occurs with `data-line` on the same element: the
//    data-raw branch swallows the line separator, so line-level fidelity
//    must come from verbatim text nodes (block-region rendering) —
//    `data-raw` belongs to token spans INSIDE a line, never the line itself.

/**
 * Serialize the editor DOM back to raw markdown source text.
 *
 * @param el - Editor root element containing `[data-line]` containers
 */
export function extractContentText(el: HTMLElement): string {
  let text = ''
  let hadDataLine = false
  function walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      text += (node as Text).textContent ?? ''
    } else if (node instanceof HTMLElement) {
      if (node.dataset.raw !== undefined) {
        text += node.dataset.raw
      } else {
        if (node.dataset.line !== undefined) {
          if (hadDataLine) text += '\n'
          hadDataLine = true
        }
        node.childNodes.forEach(walk)
      }
    }
  }
  walk(el)
  return text
}

/**
 * Length of a DOM subtree in RAW-source space — the exact number of
 * characters `extractContentText` would produce for this subtree rendered
 * as its own document (leading line separator excluded, one `\n` counted
 * between each pair of nested `[data-line]` containers).
 *
 * For a plain line div this is its content length (data-raw respected);
 * for a block wrapper holding n line divs it is `Σ rawLineLength + (n − 1)`.
 *
 * @param node - Any DOM node (text, element)
 */
export function rawNodeLength(node: Node): number {
  let hadDataLine = false
  function len(n: Node): number {
    if (n.nodeType === Node.TEXT_NODE) {
      return (n as Text).length
    }
    if (n instanceof HTMLElement) {
      if (n.dataset.raw !== undefined) {
        return n.dataset.raw.length
      }
      let sep = 0
      if (n.dataset.line !== undefined) {
        if (hadDataLine) sep = 1
        hadDataLine = true
      }
      let sum = sep
      n.childNodes.forEach((child) => {
        sum += len(child)
      })
      return sum
    }
    return 0
  }
  return len(node)
}
