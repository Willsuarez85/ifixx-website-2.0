// Wraps every Markdown table in <div class="table-scroll"> so a wide table scrolls
// sideways on a phone. html and body carry overflow-x: hidden (global.css), so
// without the wrapper the right-hand columns are clipped and cannot be reached.
// No dependencies: walks the hast tree by hand.
export default function rehypeTableScroll() {
  return (tree) => wrap(tree);
}

function wrap(node) {
  if (!node.children) return;
  node.children = node.children.map((child) => {
    if (child.type === 'element' && child.tagName === 'table') {
      return {
        type: 'element',
        tagName: 'div',
        // Focusable region so the sideways scroll also works from the keyboard.
        properties: {
          className: ['table-scroll'],
          tabIndex: 0,
          role: 'region',
          ariaLabel: 'Table, scroll sideways to see all columns',
        },
        children: [child],
      };
    }
    wrap(child);
    return child;
  });
}
