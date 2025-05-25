// Unit tests for the core TUI framework

import { assertEquals, assertExists } from '@std/assert'
import { TUIRuntime } from '../../src/core/runtime.ts'
import { KiwiConstraintSolver } from '../../src/layout/cassowary.ts'
import { ConstraintStrength } from '../../src/core/types.ts'

Deno.test('TUIRuntime - initialization', async () => {
  const runtime = new TUIRuntime()
  
  try {
    // Should initialize without throwing
    await runtime.initialize()
    
    // Should shut down cleanly
    await runtime.shutdown()
  } catch (error) {
    console.error('Runtime initialization failed:', error)
    throw error
  } finally {
    // Verify signal listeners are removed
    if (!runtime.areSignalHandlersRemoved()) {
      throw new Error('Signal handlers were not removed properly');
    }
  }
  
  // Wait a bit for cleanup
  await new Promise(resolve => setTimeout(resolve, 10))
})

Deno.test('KiwiConstraintSolver - basic constraint solving', () => {
  const solver = new KiwiConstraintSolver()
  
  // Add variables
  solver.addVariable('width')
  solver.addVariable('height')
  
  // Add constraints
  solver.addConstraint({
    expression: 'width >= 100',
    strength: ConstraintStrength.Required,
  })
  
  solver.addConstraint({
    expression: 'height == width * 0.6',
    strength: ConstraintStrength.Required,
  })
  
  // Solve constraints
  const results = solver.solve()
  
  // Check results
  assertEquals(results.get('width'), 100)
  assertEquals(results.get('height'), 60)
})

Deno.test('TerminalNode structure', () => {
  const node = {
    type: 'text',
    props: {
      children: 'Hello World',
      color: 'green',
    },
    children: [],
  }
  
  assertEquals(node.type, 'text')
  assertEquals(node.props.children, 'Hello World')
  assertEquals(node.props.color, 'green')
  assertEquals(node.children.length, 0)
}) 
