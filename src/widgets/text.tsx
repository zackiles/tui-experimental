// Text rendering component for the TUI framework

import type { TerminalNode } from '../core/types.ts'

export interface TextProps {
  children: string
  color?: string
  backgroundColor?: string
  style?: 'normal' | 'bold' | 'italic' | 'underline'
  wrap?: boolean
  align?: 'left' | 'center' | 'right'
  x?: number
  y?: number
}

export function Text(props: TextProps): TerminalNode {
  const {
    children,
    color = 'white',
    backgroundColor,
    style = 'normal',
    wrap = false,
    align = 'left',
    x = 0,
    y = 0,
  } = props

  return {
    type: 'text',
    props: {
      children,
      color,
      backgroundColor,
      style,
      wrap,
      align,
      x,
      y,
    },
    children: [],
  }
} 