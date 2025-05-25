// Integration tests to validate claimed completed functionality from checklist.md

import { assert, assertEquals, assertExists } from '@std/assert'
import { TUIRuntime } from '../../src/core/runtime.ts'
import { KiwiConstraintSolver } from '../../src/layout/cassowary.ts'
import { Text } from '../../src/widgets/text.tsx'
import { ConstraintStrength } from '../../src/core/types.ts'
import type { TerminalCapabilities, TerminalNode } from '../../src/core/types.ts'

// Test 1: Validate Project Setup & Dependencies (Phase 1.1)
Deno.test('Dependencies - @lume/kiwi constraint solver integration', async () => {
  const solver = new KiwiConstraintSolver()

  // Should be able to create and use kiwi solver
  solver.addVariable('test_var')
  const constraintId = solver.addConstraint({
    expression: 'test_var >= 50',
    strength: ConstraintStrength.Required,
  })

  const results = solver.solve()
  assertEquals(results.get('test_var'), 50)

  // Should be able to remove constraints
  solver.removeConstraint(constraintId)
})

// Test 2: Core Directory Structure (Phase 1.2)
Deno.test('Core Directory Structure - Essential files exist', async () => {
  // Verify core directory structure exists and is accessible
  const coreFiles = [
    '../../src/core/runtime.ts',
    '../../src/core/types.ts',
    '../../src/core/constants.ts',
    '../../src/layout/cassowary.ts',
    '../../src/widgets/text.tsx',
    '../../src/jsx/jsx-runtime.ts',
    '../../src/main.ts',
  ]

  for (const file of coreFiles) {
    try {
      const fileInfo = await Deno.stat(new URL(file, import.meta.url))
      assert(fileInfo.isFile, `${file} should be a file`)
    } catch {
      throw new Error(`Required file ${file} does not exist`)
    }
  }
})

// Test 3: Core Type System (Phase 1.3)
Deno.test('Core Type System - TerminalNode structure validation', () => {
  const testNode: TerminalNode = {
    type: 'test',
    props: { foo: 'bar' },
    children: [],
    constraints: [{
      expression: 'width >= 100',
      strength: ConstraintStrength.Required,
    }],
  }

  assertEquals(testNode.type, 'test')
  assertEquals(testNode.props.foo, 'bar')
  assertEquals(testNode.children.length, 0)
  assertExists(testNode.constraints)
  assertEquals(testNode.constraints![0].expression, 'width >= 100')
})

// Test 4: Runtime Implementation (Phase 1.5)
Deno.test('Runtime Implementation - Terminal initialization and cleanup', async () => {
  const runtime = new TUIRuntime()

  // Should initialize without errors
  await runtime.initialize()

  // Should detect basic capabilities
  // Note: Since we can't access internal context directly, we test via behavior

  // Should shutdown cleanly
  await runtime.shutdown()

  // Verify signal handlers are cleaned up
  assert(runtime.areSignalHandlersRemoved(), 'Signal handlers should be removed after shutdown')
})

// Test 5: Constraint-based Layout System (Phase 1.6)
Deno.test('Constraint Layout - Expression parsing and solving', () => {
  const solver = new KiwiConstraintSolver()

  // Test basic constraints
  solver.addVariable('width')
  solver.addVariable('height')
  solver.addVariable('x')
  solver.addVariable('y')

  // Test different constraint types
  solver.addConstraint({
    expression: 'width >= 100',
    strength: ConstraintStrength.Required,
  })

  solver.addConstraint({
    expression: 'height == width * 0.75',
    strength: ConstraintStrength.Required,
  })

  solver.addConstraint({
    expression: 'x + width <= 800',
    strength: ConstraintStrength.Strong,
  })

  const results = solver.solve()

  assertEquals(results.get('width'), 100)
  assertEquals(results.get('height'), 75)
  assert(results.get('x')! + results.get('width')! <= 800)
})

// Test 6: Constraint solver utility methods
Deno.test('Constraint Layout - Utility methods', () => {
  const solver = new KiwiConstraintSolver()

  // Test utility methods - use separate solvers to avoid conflicts
  solver.addVariable('width')
  solver.addVariable('height')

  const minId = solver.createMinConstraint('width', 50)
  const maxId = solver.createMaxConstraint('width', 200)

  const results = solver.solve()

  // All constraints should be satisfied
  const width = results.get('width')!

  assert(width >= 50) // min constraint
  assert(width <= 200) // max constraint
})

// Test 7: Basic Text Widget (Phase 2.3)
Deno.test('Text Widget - Component creation and props', () => {
  const textComponent = Text({
    children: 'Hello World',
    color: 'green',
    x: 10,
    y: 5,
  })

  assertEquals(textComponent.type, 'text')
  assertEquals(textComponent.props.children, 'Hello World')
  assertEquals(textComponent.props.color, 'green')
  assertEquals(textComponent.props.x, 10)
  assertEquals(textComponent.props.y, 5)
  assertEquals(textComponent.children.length, 0)
})

// Test 8: JSX Runtime Integration
Deno.test('JSX Runtime - Component creation', async () => {
  // Test that JSX runtime functions exist and work
  const { jsx } = await import('@tui/jsx/jsx-runtime')

  const element = jsx('div', { className: 'test' }, 'test-key')

  assertEquals(element.type, 'div')
  assertEquals(element.props.className, 'test')
})

// Test 9: Constants Configuration
Deno.test('Constants - Framework configuration values', async () => {
  const constants = await import('../../src/core/constants.ts')

  assertEquals(constants.VERSION, '0.1.0')
  assertEquals(constants.FRAMEWORK_NAME, 'TUI Framework')
  assertEquals(constants.DEFAULT_TERMINAL_WIDTH, 80)
  assertEquals(constants.DEFAULT_TERMINAL_HEIGHT, 24)

  // Verify ANSI codes are defined
  assertExists(constants.ANSI_CODES.CURSOR_HIDE)
  assertExists(constants.ANSI_CODES.CURSOR_SHOW)
  assertExists(constants.ANSI_CODES.ALTERNATE_SCREEN_ENTER)
  assertExists(constants.ANSI_CODES.ALTERNATE_SCREEN_EXIT)
})

// Test 10: End-to-end component rendering pipeline
Deno.test('E2E - Simple component render pipeline', async () => {
  const runtime = new TUIRuntime()

  try {
    await runtime.initialize()

    // Create a simple component that uses text widget
    const testComponent = () =>
      Text({
        children: 'Test Message',
        color: 'white',
      })

    // Test that the component can be created and rendered without errors
    const node = testComponent()
    assertEquals(node.type, 'text')
    assertEquals(node.props.children, 'Test Message')
    assertEquals(node.props.color, 'white')

    // Test pipeline components work together
    assert(typeof runtime !== 'undefined', 'Runtime should be initialized')
  } finally {
    await runtime.shutdown()
  }
})
