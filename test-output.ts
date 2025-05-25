// Minimal test to debug terminal output issues

console.log('Testing basic console output...')

// Test synchronous stdout
const encoder = new TextEncoder()
Deno.stdout.writeSync(encoder.encode('Testing synchronous stdout write\n'))

// Test with ANSI codes
Deno.stdout.writeSync(encoder.encode('\x1b[32mGreen text\x1b[0m\n'))

// Test cursor positioning
Deno.stdout.writeSync(encoder.encode('\x1b[2;1HText at row 2, column 1\x1b[0m\n'))

// Test alternate screen buffer
Deno.stdout.writeSync(encoder.encode('\x1b[?1049h')) // Enter alternate screen
Deno.stdout.writeSync(encoder.encode('\x1b[H\x1b[2J')) // Clear and home
Deno.stdout.writeSync(encoder.encode('\x1b[1;1HAlternate Screen Test\x1b[0m'))
Deno.stdout.writeSync(encoder.encode('\x1b[2;1H\x1b[33mYellow text on line 2\x1b[0m'))

// Wait a bit, then exit
await new Promise(resolve => setTimeout(resolve, 3000))

Deno.stdout.writeSync(encoder.encode('\x1b[?1049l')) // Exit alternate screen
console.log('Test complete!') 
