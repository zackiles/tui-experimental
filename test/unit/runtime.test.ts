// Unit tests for TUI Runtime

import { assertEquals, assertExists } from '@std/assert'
import { TUIRuntime } from '../../src/core/runtime.ts'

Deno.test('TUIRuntime - creation and shutdown', async () => {
  const runtime = new TUIRuntime()

  // Runtime should be created successfully
  assertExists(runtime)

  // Should shutdown cleanly without initialization
  await runtime.shutdown()

  // Verify signal handlers are cleaned up
  assertEquals(runtime.areSignalHandlersRemoved(), true)
})

Deno.test('TUIRuntime - signal handlers setup and cleanup', async () => {
  const runtime = new TUIRuntime()

  // Initially signal handlers should be set up (constructor calls setupSignalHandlers)
  assertEquals(runtime.areSignalHandlersRemoved(), false)

  // After shutdown, signal handlers should be removed
  await runtime.shutdown()
  assertEquals(runtime.areSignalHandlersRemoved(), true)
})

Deno.test('TUIRuntime - multiple shutdown calls are safe', async () => {
  const runtime = new TUIRuntime()

  // Multiple shutdown calls should not throw
  await runtime.shutdown()
  await runtime.shutdown()
  await runtime.shutdown()

  assertEquals(runtime.areSignalHandlersRemoved(), true)
})

Deno.test('TUIRuntime - does not hang on creation', () => {
  // This test verifies the runtime constructor doesn't cause hanging
  const runtime = new TUIRuntime()
  assertExists(runtime)

  // Cleanup immediately
  runtime.shutdown()
})
