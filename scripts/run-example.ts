#!/usr/bin/env -S deno run -A

import { parseArgs } from '@std/cli/parse-args'
import { join } from '@std/path'
import { exists } from '@std/fs'

interface ExampleFile {
  name: string
  path: string
  description?: string
}

async function getExamples(): Promise<ExampleFile[]> {
  const examplesDir = 'examples'
  const examples: ExampleFile[] = []
  
  try {
    for await (const entry of Deno.readDir(examplesDir)) {
      if (entry.isFile && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        examples.push({
          name: entry.name,
          path: join(examplesDir, entry.name)
        })
      }
    }
  } catch (error) {
    console.error('❌ Failed to read examples directory:', String(error))
    Deno.exit(1)
  }
  
  return examples.sort((a, b) => a.name.localeCompare(b.name))
}

function listExamples(examples: ExampleFile[]) {
  console.log('📋 Available examples:\n')
  
  examples.forEach((example, index) => {
    console.log(`  ${index + 1}. ${example.name}`)
  })
  
  console.log('\n💡 Usage:')
  console.log('  deno task example <name>           # Run specific example')
  console.log('  deno task example list             # Show this list')
  console.log('  deno task example                  # Interactive mode')
  console.log('\n📝 Examples:')
  console.log('  deno task example hello-world')
  console.log('  deno task example hello-world.tsx')
  console.log('  deno task example 1                # Run first example')
  console.log('\n🖥️  TUI Examples:')
  console.log('  • .tsx files are TUI applications requiring a real terminal')
  console.log('  • If they fail, run directly: deno run -A examples/[file]')
  console.log('  • Cannot run with pipes, redirects, or in CI environments')
}

async function runExample(examples: ExampleFile[], nameOrIndex: string, timeoutSecs = 10) {
  let targetExample: ExampleFile | undefined
  
  // Try to find by exact name match first
  targetExample = examples.find(ex => ex.name === nameOrIndex)
  
  // Try to find by name without extension
  if (!targetExample) {
    targetExample = examples.find(ex => 
      ex.name === `${nameOrIndex}.ts` || ex.name === `${nameOrIndex}.tsx`
    )
  }
  
  // Try to find by index
  if (!targetExample && /^\d+$/.test(nameOrIndex)) {
    const index = parseInt(nameOrIndex) - 1
    if (index >= 0 && index < examples.length) {
      targetExample = examples[index]
    }
  }
  
  if (!targetExample) {
    console.error(`❌ Example '${nameOrIndex}' not found.`)
    console.log('\n📋 Available examples:')
    examples.forEach((ex, i) => console.log(`  ${i + 1}. ${ex.name}`))
    Deno.exit(1)
  }
  
  // Verify file exists
  if (!await exists(targetExample.path)) {
    console.error(`❌ Example file not found: ${targetExample.path}`)
    Deno.exit(1)
  }
  
  console.log(`🚀 Running example: ${targetExample.name}`)
  console.log(`📂 Path: ${targetExample.path}`)
  console.log(`🔧 Command: deno run -A ${targetExample.path}`)
  
  // Check if this is a TUI example
  const isTUIExample = targetExample.path.endsWith('.tsx') || 
                       targetExample.name.includes('hello-world') ||
                       targetExample.name.includes('phase2')
  
  if (isTUIExample) {
    console.log(`🖥️  TUI Example Detected`)
    console.log(`⚠️  Note: TUI examples may not work properly through the runner`)
    console.log(`💡 Recommended: run directly with: deno run -A ${targetExample.path}`)
    
    // Ask user if they want to run directly
    const runDirect = prompt('🤔 Run directly instead? (y/n): ')
    if (runDirect?.toLowerCase() === 'y' || runDirect?.toLowerCase() === 'yes') {
      console.log('\n📋 Copy and run this command in your terminal:')
      console.log(`\x1b[1;36mdeno run -A ${targetExample.path}\x1b[0m`)
      console.log('\n👋 Exiting example runner...')
      return
    }
    console.log('⚠️  Proceeding with runner (may fail)...')
  }
  
  console.log(`⏱️  Timeout: ${timeoutSecs} seconds\n`)
  
  // Run the example with timeout
  const command = new Deno.Command('deno', {
    args: ['run', '-A', targetExample.path],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit'
  })
  
  const timeoutMs = timeoutSecs * 1000
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Example timed out after ${timeoutSecs} seconds`)), timeoutMs)
  })
  
  try {
    const { code } = await Promise.race([
      command.output(),
      timeoutPromise
    ])
    
    if (code !== 0) {
      console.error(`❌ Example failed with exit code: ${code}`)
      
      // Check if this might be a TUI-specific issue
      if (targetExample.path.includes('.tsx') || targetExample.name.includes('hello-world')) {
        console.error('💡 TUI examples need to run in a real terminal:')
        console.error('   • Open a terminal window and run the command directly')
        console.error('   • Ensure you\'re not using pipes, redirects, or CI environments')
        console.error('   • Try: deno run -A ' + targetExample.path)
      }
      
      Deno.exit(code)
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      // Try to kill the process first
      try {
        // Note: Deno.Command doesn't have kill method, process should timeout naturally
        // command.kill() // Not available in Deno.Command API
      } catch {
        // Ignore kill errors
      }
      
      // Wait a moment for terminal to settle
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Restore terminal state manually in case it's stuck in alternate screen
      const encoder = new TextEncoder()
      await Deno.stdout.write(encoder.encode('\x1b[?1049l')) // Exit alternate screen
      await Deno.stdout.write(encoder.encode('\x1b[?25h'))   // Show cursor
      await Deno.stdout.write(encoder.encode('\x1b[c'))      // Reset terminal
      
      // Now display the timeout messages
      console.error(`\n⏰ Example timed out after ${timeoutSecs} seconds`)
      console.error('💡 Tip: The example might be waiting for input or stuck in a loop')
      console.error('🔧 Try running it directly: deno run -A ' + targetExample.path)
      console.error('🖥️  Note: TUI examples need a real terminal (not through pipes/redirects)')
      console.error(`⚙️  Use --timeout <seconds> to adjust timeout (current: ${timeoutSecs}s)`)
      
      Deno.exit(1)
    } else {
      throw error
    }
  }
}

async function interactiveMode(examples: ExampleFile[], timeoutSecs = 10) {
  listExamples(examples)
  
  console.log('\n🔢 Enter example number or name:')
  const input = prompt('> ')
  
  if (!input || input.trim() === '') {
    console.log('👋 Cancelled.')
    return
  }
  
  await runExample(examples, input.trim(), timeoutSecs)
}

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ['help'],
    string: ['timeout'],
    alias: { h: 'help', t: 'timeout' },
    default: { timeout: '10' }
  })
  
  if (args.help) {
    console.log('🎯 TUI Example Runner\n')
    console.log('Usage: deno task example [command|name] [options]\n')
    console.log('Commands:')
    console.log('  list                Show all available examples')
    console.log('  <name>              Run specific example by name')
    console.log('  <number>            Run example by number\n')
    console.log('Options:')
    console.log('  -h, --help          Show this help message')
    console.log('  -t, --timeout <sec> Set timeout in seconds (default: 10)')
    return
  }
  
  const examples = await getExamples()
  
  if (examples.length === 0) {
    console.log('❌ No examples found in the examples directory.')
    return
  }
  
  const command = args._[0]?.toString()
  const timeoutSecs = parseInt(args.timeout) || 10
  
  if (!command) {
    // Interactive mode
    await interactiveMode(examples, timeoutSecs)
  } else if (command === 'list') {
    listExamples(examples)
  } else {
    await runExample(examples, command, timeoutSecs)
  }
}

if (import.meta.main) {
  await main()
} 
