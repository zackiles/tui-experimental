#!/usr/bin/env -S deno run -A

import { parseArgs } from '@std/cli/parse-args'
import { join } from '@std/path'
import { exists } from '@std/fs'
import { dedent } from '@qnighy/dedent'

type ExampleFile = {
  name: string
  path: string
}

const getExamples = async (): Promise<ExampleFile[]> => {
  try {
    const entries = []
    for await (const entry of Deno.readDir('examples')) {
      if (entry.isFile && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        entries.push({
          name: entry.name,
          path: join('examples', entry.name)
        })
      }
    }
    return entries.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('❌ Failed to read examples directory:', String(error))
    Deno.exit(1)
  }
}

const displayExamples = (examples: ExampleFile[], showUsage = true) => {
  console.log('📋 Available examples:\n')
  examples.forEach((ex, i) => console.log(`  ${i + 1}. ${ex.name}`))
  
  if (showUsage) {
    console.log(dedent`
      💡 Usage:
        deno task example <name>           # Run specific example
        deno task example list             # Show this list
        deno task example                  # Interactive mode
        deno task example --help           # Show help information

      📝 Examples:
        deno task example hello-world
        deno task example hello-world.tsx
        deno task example 1                # Run first example

      🖥️  TUI Examples:
        • .tsx files are TUI applications requiring a real terminal
        • If they fail, run directly: deno run -A examples/[file]
        • Cannot run with pipes, redirects, or CI environments
    `)
  }
}

const findExample = (examples: ExampleFile[], nameOrIndex: string): ExampleFile | undefined => {
  // Try exact name, name without extension, then index
  return examples.find(ex => ex.name === nameOrIndex) ||
         examples.find(ex => ex.name === `${nameOrIndex}.ts` || ex.name === `${nameOrIndex}.tsx`) ||
         (/^\d+$/.test(nameOrIndex) ? examples[parseInt(nameOrIndex) - 1] : undefined)
}

const isTUIExample = (path: string): boolean => 
  path.endsWith('.tsx') || path.includes('hello-world') || path.includes('phase2')

async function main() {
  const { help, timeout, _ } = parseArgs(Deno.args, {
    boolean: ['help'],
    string: ['timeout'],
    alias: { h: 'help', t: 'timeout' },
    default: { timeout: '10' }
  })
  
  const examples = await getExamples()
  if (examples.length === 0) {
    console.log('❌ No examples found in the examples directory.')
    return
  }

  if (help) {
    // Combined displayHelp into main since it was only called here
    console.log(dedent`
      🎯 TUI Example Runner

      Usage: deno task example [command|name] [options]

      Commands:
        list                Show all available examples
        <name>              Run specific example by name
        <number>            Run example by number

      Options:
        -h, --help          Show this help message
        -t, --timeout <sec> Set timeout in seconds (default: 10)
    `)
    displayExamples(examples, false)
    return
  }

  let exampleName = _[0]?.toString()
  const timeoutSecs = parseInt(timeout as string) || 15

  if (!exampleName) {
    // Combined interactiveMode into main since it was only called here
    displayExamples(examples)
    const input = prompt('\n🔢 Enter example number or name:\n> ')
    if (!input?.trim()) {
      console.log('👋 Cancelled.')
      return
    }
    exampleName = input.trim()
  } else if (exampleName === 'list') {
    displayExamples(examples)
    return
  }

  // Combined runExample into main since it was only called from here
  const example = findExample(examples, exampleName)
  
  if (!example) {
    console.error(`❌ Example '${exampleName}' not found.`)
    console.log('\n📋 Available examples:')
    examples.forEach((ex, i) => console.log(`  ${i + 1}. ${ex.name}`))
    Deno.exit(1)
  }
  
  if (!await exists(example.path)) {
    console.error(`❌ Example file not found: ${example.path}`)
    Deno.exit(1)
  }
  
  console.log(`🚀 Running example: ${example.name}`)
  console.log(`📂 Path: ${example.path}`)
  console.log(`🔧 Command: deno run -A ${example.path}`)
  
  if (isTUIExample(example.path)) {
    console.log(`🖥️  TUI Example Detected`)
    console.log(`⚠️  Note: TUI examples may not work properly through the runner`)
    console.log(`💡 Recommended: run directly with: deno run -A ${example.path}`)
    
    const runDirect = prompt('🤔 Run directly instead? (y/n): ')
    if (runDirect?.toLowerCase().startsWith('y')) {
      console.log(`\n📋 Copy and run this command in your terminal:`)
      console.log(`\x1b[1;36mdeno run -A ${example.path}\x1b[0m`)
      console.log('\n👋 Exiting example runner...')
      return
    }
    console.log('⚠️  Proceeding with runner (may fail)...')
  }
  
  console.clear()
  console.log(`⏱️  NOTE: example will automatically exit in: ${timeoutSecs} seconds...\n`)
  await new Promise(resolve => setTimeout(resolve, 3000))
  console.clear()
  
  const command = new Deno.Command('deno', {
    args: ['run', '-A', example.path],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit'
  })
  
  const child = command.spawn()
  const timeoutMs = timeoutSecs * 1000
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Example timed out after ${timeoutSecs} seconds`)), timeoutMs)
  })
  
  try {
    const { code } = await Promise.race([child.status, timeoutPromise])
    if (code !== 0) {
      console.error(`❌ Example failed with exit code: ${code}`)
      
      if (isTUIExample(example.path)) {
        console.error(dedent`
          💡 TUI examples need to run in a real terminal:
             • Open a terminal window and run the command directly
             • Ensure you're not using pipes, redirects, or CI environments
             • Try: deno run -A ${example.path}
        `)
      }
      
      Deno.exit(code)
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      try {
        child.kill('SIGTERM')
        await new Promise(resolve => setTimeout(resolve, 1000))
        try { child.kill('SIGKILL') } catch {}
      } catch {}
      
      // Comprehensive terminal restoration
      const encoder = new TextEncoder()
      // Complete terminal reset sequence
      const resetSequence = [
        '\x1b[!p',        // Soft terminal reset
        '\x1b[?25h',      // Show cursor
        '\x1b[?1000l',    // Disable mouse tracking
        '\x1b[?1006l',    // Disable SGR mouse mode
        '\x1b[?2004l',    // Disable bracketed paste
        '\x1b[?1004l',    // Disable focus tracking
        '\x1b[?1049l',    // Exit alternate screen
        '\x1b[0m',        // Reset all text attributes
        '\x1b[2J',        // Clear entire screen
        '\x1b[H',         // Move cursor to home position
      ].join('')
      
      // Write synchronously for immediate effect
      Deno.stdout.writeSync(encoder.encode(resetSequence))
      
      // Disable raw mode if it was enabled
      try {
        if (Deno.stdin.isTerminal()) {
          Deno.stdin.setRaw(false)
        }
      } catch {
        // Ignore errors
      }
      
      console.warn(dedent`
        ⏰ Example timed out after ${timeoutSecs} seconds
        💡 Tip: The example might be waiting for input or stuck in a loop
        🔧 Try running it directly: deno run -A ${example.path}
        🖥️  Note: TUI examples need a real terminal (not through pipes/redirects)
        ⚙️  Use --timeout <seconds> to adjust timeout (current: ${timeoutSecs}s)
      `)
    } else {
      throw error
    }
  }
}

if (import.meta.main) {
  await main().catch(console.error)
  
  // Final terminal cleanup
  const encoder = new TextEncoder()
  const finalReset = '\x1b[!p\x1b[?25h\x1b[?1049l\x1b[0m\x1b[2J\x1b[H'
  Deno.stdout.writeSync(encoder.encode(finalReset))
  
  // Ensure raw mode is disabled
  try {
    if (Deno.stdin.isTerminal()) {
      Deno.stdin.setRaw(false)
    }
  } catch {
    // Ignore errors
  }
  
  console.log('👋 Exiting example runner...')
} 
