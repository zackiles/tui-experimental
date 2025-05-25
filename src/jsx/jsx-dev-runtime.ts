// Development JSX runtime - same as production but with dev tools

import { type JSX } from '@tui/jsx/jsx-runtime'
export { Fragment, jsx, jsxs, useConstraints, useEffect, useState } from '@tui/jsx/jsx-runtime'

// Development-specific JSX function
export function jsxDEV(
  type: string | Function,
  props: Record<string, unknown> | null,
  key?: string,
  isStaticChildren?: boolean,
  source?: object,
  self?: any,
): JSX.Element {
  // In development, we can add source mapping and debug info
  const normalizedProps = props || {}
  if (key !== undefined) {
    normalizedProps.key = key
  }

  // Add development metadata
  if (source) {
    normalizedProps.__source = source
  }
  if (self) {
    normalizedProps.__self = self
  }

  // Extract children from props
  const { children: rawChildren, ...otherProps } = normalizedProps
  const children = normalizeChildren(rawChildren)

  // Handle component functions
  if (typeof type === 'function') {
    return type({ ...otherProps, children })
  }

  // Create terminal node
  return {
    type,
    props: otherProps,
    children,
  }
}

// Helper function to normalize children (duplicate from jsx-runtime for dev mode)
function normalizeChildren(children: unknown): any[] {
  if (children === null || children === undefined) {
    return []
  }

  if (Array.isArray(children)) {
    return children.flatMap(normalizeChildren)
  }

  if (typeof children === 'string' || typeof children === 'number') {
    return [{
      type: 'text',
      props: { children: String(children) },
      children: [],
    }]
  }

  if (typeof children === 'object' && 'type' in children) {
    return [children as any]
  }

  return [{
    type: 'text',
    props: { children: String(children) },
    children: [],
  }]
}
