# Vendored Notcurses Libraries

This directory contains vendored copies of the notcurses library and its dependencies, making the TUI framework self-contained and portable.

## Contents

### Core Libraries
- `libnotcurses-core.dylib` - Main notcurses functionality
- `libnotcurses-ffi.dylib` - FFI-optimized functions
- `libnotcurses.dylib` - Basic initialization functions
- `libnotcurses++.dylib` - C++ bindings (included for completeness)

### Dependencies
- `libncursesw.6.dylib` - Wide-character ncurses library
- `libunistring.5.dylib` - Unicode string processing
- `libdeflate.0.dylib` - Compression library

### Header Files
- `include/notcurses/` - Complete notcurses header files for reference

## Library Modifications

All vendored libraries have been modified using `install_name_tool` to use relative paths (`@rpath`) instead of absolute Homebrew paths. This makes them portable and self-contained.

### Original Dependencies → Fixed Dependencies
```
/opt/homebrew/opt/ncurses/lib/libncursesw.6.dylib → @rpath/libncursesw.6.dylib
/opt/homebrew/opt/libunistring/lib/libunistring.5.dylib → @rpath/libunistring.5.dylib  
/opt/homebrew/opt/libdeflate/lib/libdeflate.0.dylib → @rpath/libdeflate.0.dylib
```

## Usage

### Automatic Setup
The FFI bindings automatically configure library paths when imported:

```typescript
import { notcurses } from '../../src/graphics/notcurses-ffi.ts'
// Library paths are automatically configured
```

### Manual Setup
You can manually configure library paths:

```typescript
import { setupNotcursesLibraryPaths, verifyVendoredLibraries } from './setup.ts'

// Set up library search paths
setupNotcursesLibraryPaths()

// Verify all required libraries are present
const isValid = verifyVendoredLibraries()
```

### Running the Setup Script
```bash
# Verify vendored libraries and setup
deno run --allow-env --allow-read vendor/notcurses/setup.ts
```

## Platform Support

Currently optimized for macOS with `.dylib` files. The setup script includes placeholders for Linux (`.so`) and Windows (`.dll`) but requires platform-specific library files.

### Adding Platform Support
1. Install notcurses on target platform
2. Copy libraries to `vendor/notcurses/lib/`
3. Fix library paths using platform-specific tools:
   - **Linux**: `patchelf --set-rpath '$ORIGIN' library.so`
   - **Windows**: Modify DLL search paths as needed

## Library Information

### Version
- **Notcurses**: 3.0.16
- **Source**: Homebrew installation on macOS 15.3.1

### Size
Total size: ~5.5MB
- Core libraries: ~1.5MB
- Dependencies: ~4MB

### Verification

To verify library integrity and dependencies:
```bash
# Check library dependencies
otool -L vendor/notcurses/lib/libnotcurses-core.dylib

# List all vendored files
find vendor/notcurses -name "*.dylib" -exec basename {} \;
```

## Integration

The vendored libraries are automatically used by:
- `src/graphics/notcurses-ffi.ts` - Main FFI bindings
- `examples/advanced-graphics-demo.tsx` - Graphics demonstration
- All graphics-related components in the framework

## Benefits

1. **Portability**: No system dependencies required
2. **Version Control**: Exact library versions under source control  
3. **Consistency**: Same libraries across all development environments
4. **Offline Development**: No internet required for library dependencies
5. **Security**: Known, vetted library versions

## Maintenance

### Updating Libraries
To update to a newer notcurses version:

1. Install new version via Homebrew
2. Copy new libraries: `cp /opt/homebrew/lib/libnotcurses*.dylib vendor/notcurses/lib/`
3. Copy dependencies and fix paths (see main documentation)
4. Update version information in this README
5. Test compatibility with existing FFI bindings

### Cleaning Up
To remove vendored libraries:
```bash
rm -rf vendor/notcurses/lib/*
```

## Troubleshooting

### Common Issues

**Library Not Found**
- Ensure `DYLD_LIBRARY_PATH` includes vendored lib directory
- Run setup script to configure paths

**Symbol Not Found**  
- Verify library versions match expected FFI signatures
- Check that library modifications are correct

**Code Signature Warnings**
- Expected when using `install_name_tool` - libraries still work
- Can be ignored for development purposes

### Debug Commands
```bash
# Check library paths
echo $DYLD_LIBRARY_PATH

# Verify library symbols  
nm vendor/notcurses/lib/libnotcurses-core.dylib | grep "T _"

# Test library loading
deno run --allow-ffi --allow-env --allow-read examples/advanced-graphics-demo.tsx
``` 
