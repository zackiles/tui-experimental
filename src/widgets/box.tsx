// Box container widget with borders, padding, margins, and layout support
import { type JSX } from '@tui/jsx/jsx-runtime'

interface BoxProps {
  children?: JSX.Element[]
  
  // Border options
  border?: 'none' | 'single' | 'double' | 'rounded' | 'thick' | 'dashed' | 'dotted'
  borderColor?: string
  borderStyle?: {
    top?: string
    right?: string  
    bottom?: string
    left?: string
  }
  
  // Spacing
  padding?: number | [number, number] | [number, number, number, number]
  margin?: number | [number, number] | [number, number, number, number]
  
  // Colors
  backgroundColor?: string
  color?: string
  
  // Layout
  width?: number | 'auto' | string
  height?: number | 'auto' | string
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  
  // Flexbox-like properties
  direction?: 'row' | 'column'
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around'
  align?: 'start' | 'center' | 'end' | 'stretch'
  wrap?: boolean
  gap?: number
  
  // Positioning
  position?: 'relative' | 'absolute'
  top?: number
  left?: number
  right?: number
  bottom?: number
  zIndex?: number
  
  // Overflow
  overflow?: 'visible' | 'hidden' | 'scroll'
  
  // Constraints for layout system
  constraints?: string[]
  
  // Event handlers
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  
  // Accessibility
  role?: string
  ariaLabel?: string
  tabIndex?: number
}

// Border character sets
const BORDER_CHARS = {
  none: {
    topLeft: '', topRight: '', bottomLeft: '', bottomRight: '',
    horizontal: '', vertical: '', topJoin: '', bottomJoin: '',
    leftJoin: '', rightJoin: '', cross: ''
  },
  single: {
    topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘',
    horizontal: '─', vertical: '│', topJoin: '┬', bottomJoin: '┴',
    leftJoin: '├', rightJoin: '┤', cross: '┼'
  },
  double: {
    topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝',
    horizontal: '═', vertical: '║', topJoin: '╦', bottomJoin: '╩',
    leftJoin: '╠', rightJoin: '╣', cross: '╬'
  },
  rounded: {
    topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯',
    horizontal: '─', vertical: '│', topJoin: '┬', bottomJoin: '┴',
    leftJoin: '├', rightJoin: '┤', cross: '┼'
  },
  thick: {
    topLeft: '┏', topRight: '┓', bottomLeft: '┗', bottomRight: '┛',
    horizontal: '━', vertical: '┃', topJoin: '┳', bottomJoin: '┻',
    leftJoin: '┣', rightJoin: '┫', cross: '╋'
  },
  dashed: {
    topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘',
    horizontal: '╌', vertical: '╎', topJoin: '┬', bottomJoin: '┴',
    leftJoin: '├', rightJoin: '┤', cross: '┼'
  },
  dotted: {
    topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘',
    horizontal: '┄', vertical: '┊', topJoin: '┬', bottomJoin: '┴',
    leftJoin: '├', rightJoin: '┤', cross: '┼'
  }
}

// Parse spacing values (CSS-like)
function parseSpacing(value: number | number[]): { top: number; right: number; bottom: number; left: number } {
  if (typeof value === 'number') {
    return { top: value, right: value, bottom: value, left: value }
  }
  
  if (value.length === 2) {
    return { top: value[0], right: value[1], bottom: value[0], left: value[1] }
  }
  
  if (value.length === 4) {
    return { top: value[0], right: value[1], bottom: value[2], left: value[3] }
  }
  
  return { top: 0, right: 0, bottom: 0, left: 0 }
}

// Calculate box dimensions including borders and padding
function calculateDimensions(props: BoxProps): {
  contentWidth: number
  contentHeight: number
  totalWidth: number
  totalHeight: number
  borderWidth: number
  borderHeight: number
} {
  const padding = parseSpacing(props.padding || 0)
  const margin = parseSpacing(props.margin || 0)
  const hasBorder = props.border && props.border !== 'none'
  const borderWidth = hasBorder ? 2 : 0
  const borderHeight = hasBorder ? 2 : 0
  
  // Base content dimensions (will be calculated by layout system)
  let contentWidth = typeof props.width === 'number' ? props.width : 20
  let contentHeight = typeof props.height === 'number' ? props.height : 10
  
  const totalWidth = contentWidth + padding.left + padding.right + borderWidth + margin.left + margin.right
  const totalHeight = contentHeight + padding.top + padding.bottom + borderHeight + margin.top + margin.bottom
  
  return {
    contentWidth,
    contentHeight,
    totalWidth,
    totalHeight,
    borderWidth,
    borderHeight
  }
}

// Render border around content
function renderBorder(
  borderType: BoxProps['border'],
  width: number,
  height: number,
  borderColor?: string
): string[] {
  if (!borderType || borderType === 'none') return []
  
  const chars = BORDER_CHARS[borderType]
  const lines: string[] = []
  const colorStart = borderColor ? `\x1b[38;5;${borderColor}m` : ''
  const colorEnd = borderColor ? '\x1b[0m' : ''
  
  // Top border
  lines.push(
    colorStart + 
    chars.topLeft + 
    chars.horizontal.repeat(width - 2) + 
    chars.topRight + 
    colorEnd
  )
  
  // Middle borders (empty content, will be filled by layout)
  for (let i = 0; i < height - 2; i++) {
    lines.push(
      colorStart + 
      chars.vertical + 
      ' '.repeat(width - 2) + 
      chars.vertical + 
      colorEnd
    )
  }
  
  // Bottom border
  lines.push(
    colorStart + 
    chars.bottomLeft + 
    chars.horizontal.repeat(width - 2) + 
    chars.bottomRight + 
    colorEnd
  )
  
  return lines
}

// Apply background color to content area
function applyBackground(content: string[], backgroundColor?: string): string[] {
  if (!backgroundColor) return content
  
  const bgStart = `\x1b[48;5;${backgroundColor}m`
  const bgEnd = '\x1b[0m'
  
  return content.map(line => bgStart + line + bgEnd)
}

// Layout children within the box
function layoutChildren(
  children: JSX.Element[] | undefined,
  contentWidth: number,
  contentHeight: number,
  direction: BoxProps['direction'] = 'column',
  justify: BoxProps['justify'] = 'start',
  align: BoxProps['align'] = 'start',
  gap: number = 0
): JSX.Element[] {
  if (!children || children.length === 0) return []
  
  // For now, just return children as-is
  // In a full implementation, this would apply flexbox-like layout
  return children
}

// Main Box component
export function Box(props: BoxProps): JSX.Element {
  const {
    children = [],
    border = 'none',
    borderColor,
    backgroundColor,
    color,
    padding = 0,
    margin = 0,
    direction = 'column',
    justify = 'start',
    align = 'start',
    gap = 0,
    constraints = [],
    onClick,
    onMouseEnter,
    onMouseLeave,
    role,
    ariaLabel,
    tabIndex,
    ...otherProps
  } = props
  
  const dimensions = calculateDimensions(props)
  const paddingValues = parseSpacing(padding)
  const marginValues = parseSpacing(margin)
  
  // Layout children
  const layoutedChildren = layoutChildren(
    children,
    dimensions.contentWidth,
    dimensions.contentHeight,
    direction,
    justify,
    align,
    gap
  )
  
  // Generate constraints for the layout system
  const boxConstraints = [
    ...constraints,
    // Minimum size constraints
    props.minWidth ? `width >= ${props.minWidth}` : '',
    props.minHeight ? `height >= ${props.minHeight}` : '',
    // Maximum size constraints
    props.maxWidth ? `width <= ${props.maxWidth}` : '',
    props.maxHeight ? `height <= ${props.maxHeight}` : '',
    // Positioning constraints
    props.position === 'absolute' && props.top !== undefined ? `top == ${props.top}` : '',
    props.position === 'absolute' && props.left !== undefined ? `left == ${props.left}` : '',
    props.position === 'absolute' && props.right !== undefined ? `right == ${props.right}` : '',
    props.position === 'absolute' && props.bottom !== undefined ? `bottom == ${props.bottom}` : '',
  ].filter(Boolean)
  
  // Create the terminal element
  return (
    <terminal-box
      border={border}
      borderColor={borderColor}
      backgroundColor={backgroundColor}
      color={color}
      padding={JSON.stringify(paddingValues)}
      margin={JSON.stringify(marginValues)}
      width={dimensions.totalWidth}
      height={dimensions.totalHeight}
      direction={direction}
      justify={justify}
      align={align}
      gap={gap}
      constraints={JSON.stringify(boxConstraints)}
      position={props.position}
      zIndex={props.zIndex}
      overflow={props.overflow}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role={role}
      ariaLabel={ariaLabel}
      tabIndex={tabIndex}
      {...otherProps}
    >
      {layoutedChildren}
    </terminal-box>
  )
}

// Utility components for common layouts
export function HBox(props: Omit<BoxProps, 'direction'>) {
  return <Box {...props} direction="row" />
}

export function VBox(props: Omit<BoxProps, 'direction'>) {
  return <Box {...props} direction="column" />
}

export function Spacer(props: { size?: number }) {
  return (
    <Box 
      width={props.size || 1} 
      height={props.size || 1}
      backgroundColor="transparent"
    />
  )
}

export function Divider(props: { 
  orientation?: 'horizontal' | 'vertical'
  color?: string
  style?: 'single' | 'double' | 'thick'
}) {
  const { orientation = 'horizontal', color, style = 'single' } = props
  
  if (orientation === 'horizontal') {
    return (
      <Box
        height={1}
        border="none"
        color={color}
      >
        {[<terminal-text>{BORDER_CHARS[style].horizontal}</terminal-text>]}
      </Box>
    )
  } else {
    return (
      <Box
        width={1}
        border="none"
        color={color}
      >
        {[<terminal-text>{BORDER_CHARS[style].vertical}</terminal-text>]}
      </Box>
    )
  }
}

export type { BoxProps }
export { BORDER_CHARS, parseSpacing, calculateDimensions } 
