// Simple test for TUI framework rendering
/// <reference path="../src/jsx/jsx-runtime.ts" />

import { runApp, Text } from '../src/main.ts'

function App() {
  return (
    <div>
      <Text color="green">HELLO!</Text>
    </div>
  )
}

if (import.meta.main) {
  await runApp(App, {})
} 
