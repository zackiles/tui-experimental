/**
 * Notcurses Vendored Library Setup
 * 
 * This script sets up the library search paths for using vendored notcurses libraries.
 * It modifies the library loading configuration to use the local vendored copies
 * instead of system-installed versions.
 */

import { join, dirname, fromFileUrl } from '@std/path'

// Get the vendor directory path
const vendorDir = dirname(fromFileUrl(import.meta.url))
const libDir = join(vendorDir, 'lib')

/**
 * Configure library search paths for notcurses
 */
export function setupNotcursesLibraryPaths(): string {
  // For macOS, we need to set multiple environment variables to ensure
  // our vendored libraries are found first
  const currentDyldPath = Deno.env.get('DYLD_LIBRARY_PATH') || ''
  const currentDyldFallback = Deno.env.get('DYLD_FALLBACK_LIBRARY_PATH') || ''
  
  // Set primary library path
  const newDyldPath = currentDyldPath ? `${libDir}:${currentDyldPath}` : libDir
  Deno.env.set('DYLD_LIBRARY_PATH', newDyldPath)
  
  // Set fallback path to include standard locations
  const standardPaths = '/usr/local/lib:/usr/lib'
  const newFallbackPath = currentDyldFallback 
    ? `${libDir}:${currentDyldFallback}:${standardPaths}`
    : `${libDir}:${standardPaths}`
  Deno.env.set('DYLD_FALLBACK_LIBRARY_PATH', newFallbackPath)
  
  return libDir
}

/**
 * Get the absolute path to a vendored library
 */
export function getVendoredLibraryPath(libraryName: string): string {
  return join(libDir, libraryName)
}

/**
 * List all vendored libraries
 */
export function listVendoredLibraries(): string[] {
  const libraries: string[] = []
  
  try {
    for (const entry of Deno.readDirSync(libDir)) {
      if (entry.isFile && entry.name.endsWith('.dylib')) {
        libraries.push(entry.name)
      }
    }
  } catch (error) {
    console.warn('Failed to list vendored libraries:', error)
  }
  
  return libraries.sort()
}

/**
 * Verify that all required libraries are present
 */
export function verifyVendoredLibraries(): boolean {
  const requiredLibraries = [
    'libnotcurses-core.dylib',
    'libnotcurses-ffi.dylib', 
    'libncursesw.6.dylib',
    'libunistring.5.dylib',
    'libdeflate.0.dylib'
  ]
  
  const available = listVendoredLibraries()
  const missing = requiredLibraries.filter(lib => !available.includes(lib))
  
  if (missing.length > 0) {
    console.error('Missing required vendored libraries:', missing)
    return false
  }
  
  console.log('✅ All required vendored libraries are present')
  return true
}

// Auto-setup when this module is imported
if (import.meta.main) {
  console.log('🔧 Setting up vendored notcurses library paths...')
  const libPath = setupNotcursesLibraryPaths()
  console.log(`📁 Library path: ${libPath}`)
  
  console.log('📚 Available libraries:')
  listVendoredLibraries().forEach(lib => console.log(`  - ${lib}`))
  
  const isValid = verifyVendoredLibraries()
  if (isValid) {
    console.log('🎉 Vendored notcurses setup complete!')
  } else {
    console.error('❌ Vendored notcurses setup failed!')
    Deno.exit(1)
  }
} else {
  // Auto-setup when imported as module
  setupNotcursesLibraryPaths()
}

export { vendorDir, libDir } 
