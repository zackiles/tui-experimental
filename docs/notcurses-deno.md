# Notcurses Deno FFI Technical Reference Specification

## Overview

This document provides a comprehensive technical reference for accessing the notcurses library from Deno using Foreign Function Interface (FFI). Notcurses is a modern C library for building terminal user interfaces with advanced graphics capabilities.

## Library Architecture

Notcurses is distributed as multiple shared libraries, each serving different purposes:

### Core Libraries

| Library | Purpose | Primary Functions |
|---------|---------|------------------|
| `libnotcurses.dylib` | Basic initialization | `notcurses_init`, `ncdirect_init` |
| `libnotcurses-core.dylib` | Core functionality | `notcurses_core_init`, `notcurses_stop`, `ncplane_*`, `ncpile_render` |
| `libnotcurses-ffi.dylib` | FFI-optimized functions | `notcurses_render`, cell manipulation |

### Platform-Specific Paths

```typescript
// macOS (Homebrew)
/opt/homebrew/lib/libnotcurses-core.dylib
/opt/homebrew/lib/libnotcurses-ffi.dylib
/opt/homebrew/lib/libnotcurses.dylib

// Linux
libnotcurses-core.so
libnotcurses-ffi.so
libnotcurses.so

// Windows
notcurses-core.dll
notcurses-ffi.dll
notcurses.dll
```

## Header Files

Primary header file: `/opt/homebrew/Cellar/notcurses/3.0.16/include/notcurses/notcurses.h`

## Core Function Reference

### Initialization and Cleanup

#### `notcurses_core_init`
**Library:** `libnotcurses-core.dylib`  
**Symbol:** `_notcurses_core_init`  
**Signature:**
```c
struct notcurses* notcurses_core_init(const notcurses_options* opts, FILE* fp);
```
**FFI Binding:**
```typescript
notcurses_core_init: {
  parameters: ['pointer', 'pointer'],
  result: 'pointer'
}
```

#### `notcurses_stop`
**Library:** `libnotcurses-core.dylib`  
**Symbol:** `_notcurses_stop`  
**Signature:**
```c
int notcurses_stop(struct notcurses* nc);
```
**FFI Binding:**
```typescript
notcurses_stop: {
  parameters: ['pointer'],
  result: 'i32'
}
```

### Standard Plane Access

#### `notcurses_stdplane`
**Library:** `libnotcurses-core.dylib`  
**Symbol:** `_notcurses_stdplane`  
**Signature:**
```c
struct ncplane* notcurses_stdplane(struct notcurses* nc);
```
**FFI Binding:**
```typescript
notcurses_stdplane: {
  parameters: ['pointer'],
  result: 'pointer'
}
```

### Rendering Functions

#### `ncpile_render`
**Library:** `libnotcurses-core.dylib`  
**Symbol:** `_ncpile_render`  
**Signature:**
```c
int ncpile_render(struct ncplane* n);
```
**FFI Binding:**
```typescript
ncpile_render: {
  parameters: ['pointer'],
  result: 'i32'
}
```

#### `notcurses_render` (FFI-specific)
**Library:** `libnotcurses-ffi.dylib`  
**Symbol:** `_notcurses_render`  
**Signature:**
```c
int notcurses_render(struct notcurses* nc);
```
**FFI Binding:**
```typescript
notcurses_render: {
  parameters: ['pointer'],
  result: 'i32'
}
```

### Plane Management

#### `ncplane_create`
**Library:** `libnotcurses-core.dylib`  
**Symbol:** `_ncplane_create`  
**Signature:**
```c
struct ncplane* ncplane_create(struct ncplane* n, const ncplane_options* nopts);
```
**FFI Binding:**
```typescript
ncplane_create: {
  parameters: ['pointer', 'pointer'],
  result: 'pointer'
}
```

#### `ncplane_destroy`
**Library:** `libnotcurses-core.dylib`  
**Symbol:** `_ncplane_destroy`  
**Signature:**
```c
void ncplane_destroy(struct ncplane* n);
```
**FFI Binding:**
```typescript
ncplane_destroy: {
  parameters: ['pointer'],
  result: 'void'
}
```

#### `ncplane_erase`
**Library:** `libnotcurses-core.dylib`  
**Symbol:** `_ncplane_erase`  
**Signature:**
```c
void ncplane_erase(struct ncplane* n);
```
**FFI Binding:**
```typescript
ncplane_erase: {
  parameters: ['pointer'],
  result: 'void'
}
```

### Text Output

#### `ncplane_putstr_yx`
**Library:** `libnotcurses-core.dylib`  
**Symbol:** `_ncplane_putstr_yx`  
**Signature:**
```c
int ncplane_putstr_yx(struct ncplane* n, int y, int x, const char* gclusters);
```
**FFI Binding:**
```typescript
ncplane_putstr_yx: {
  parameters: ['pointer', 'i32', 'i32', 'buffer'],
  result: 'i32'
}
```

### Color Management

#### `ncplane_set_fg_rgb8`
**Library:** `libnotcurses-core.dylib`  
**Symbol:** `_ncplane_set_fg_rgb8`  
**Signature:**
```c
int ncplane_set_fg_rgb8(struct ncplane* n, unsigned r, unsigned g, unsigned b);
```
**FFI Binding:**
```typescript
ncplane_set_fg_rgb8: {
  parameters: ['pointer', 'u32'],
  result: 'i32'
}
```

#### `ncplane_set_bg_rgb8`
**Library:** `libnotcurses-core.dylib`  
**Symbol:** `_ncplane_set_bg_rgb8`  
**Signature:**
```c
int ncplane_set_bg_rgb8(struct ncplane* n, unsigned r, unsigned g, unsigned b);
```
**FFI Binding:**
```typescript
ncplane_set_bg_rgb8: {
  parameters: ['pointer', 'u32'],
  result: 'i32'
}
```

### Visual/Image Functions

#### `ncvisual_from_file`
**Library:** `libnotcurses-core.dylib`  
**Symbol:** `_ncvisual_from_file`  
**Signature:**
```c
struct ncvisual* ncvisual_from_file(const char* file);
```
**FFI Binding:**
```typescript
ncvisual_from_file: {
  parameters: ['buffer'],
  result: 'pointer'
}
```

#### `ncvisual_blit`
**Library:** `libnotcurses-core.dylib`  
**Symbol:** `_ncvisual_blit`  
**Signature:**
```c
struct ncplane* ncvisual_blit(struct notcurses* nc, struct ncvisual* ncv, const struct ncvisual_options* vopts);
```
**FFI Binding:**
```typescript
ncvisual_blit: {
  parameters: ['pointer', 'pointer', 'pointer'],
  result: 'i32'
}
```

#### `ncvisual_destroy`
**Library:** `libnotcurses-core.dylib`  
**Symbol:** `_ncvisual_destroy`  
**Signature:**
```c
void ncvisual_destroy(struct ncvisual* ncv);
```
**FFI Binding:**
```typescript
ncvisual_destroy: {
  parameters: ['pointer'],
  result: 'void'
}
```

## Data Structures

### `notcurses_options`
```c
typedef struct notcurses_options {
  const char* termtype;
  ncloglevel_e loglevel;
  unsigned margin_t, margin_r, margin_b, margin_l;
  uint64_t flags;
} notcurses_options;
```

### `ncplane_options`
```c
typedef struct ncplane_options {
  int y;            // vertical placement relative to parent plane
  int x;            // horizontal placement relative to parent plane
  unsigned rows;    // rows, must be >0 unless NCPLANE_OPTION_MARGINALIZED
  unsigned cols;    // columns, must be >0 unless NCPLANE_OPTION_MARGINALIZED
  void* userptr;    // user curry, may be NULL
  const char* name; // name (used only for debugging), may be NULL
  int (*resizecb)(struct ncplane*); // callback when parent is resized
  uint64_t flags;   // closure over NCPLANE_OPTION_*
  unsigned margin_b, margin_r; // margins (require NCPLANE_OPTION_MARGINALIZED)
} ncplane_options;
```

## FFI Implementation Considerations

### Symbol Resolution
- All C functions are prefixed with `_` in the symbol table
- Example: `notcurses_core_init` → `_notcurses_core_init`

### Library Selection Strategy
1. **Core functionality**: Use `libnotcurses-core.dylib`
2. **FFI-optimized operations**: Use `libnotcurses-ffi.dylib` 
3. **Basic initialization**: Use `libnotcurses.dylib`

### Memory Management
- All pointer values must be managed carefully
- Use `Deno.UnsafePointer.of()` for buffer conversion
- Ensure proper cleanup with destroy functions

### Error Handling
- Most functions return integer status codes
- Negative values typically indicate errors
- NULL pointer returns indicate failure for pointer-returning functions

## Complete FFI Library Definition

```typescript
const notcursesCore = Deno.dlopen('/opt/homebrew/lib/libnotcurses-core.dylib', {
  // Initialization
  notcurses_core_init: {
    parameters: ['pointer', 'pointer'],
    result: 'pointer'
  },
  notcurses_stop: {
    parameters: ['pointer'],
    result: 'i32'
  },
  
  // Standard plane
  notcurses_stdplane: {
    parameters: ['pointer'],
    result: 'pointer'
  },
  
  // Rendering
  ncpile_render: {
    parameters: ['pointer'],
    result: 'i32'
  },
  
  // Plane management
  ncplane_create: {
    parameters: ['pointer', 'pointer'],
    result: 'pointer'
  },
  ncplane_destroy: {
    parameters: ['pointer'],
    result: 'void'
  },
  ncplane_erase: {
    parameters: ['pointer'],
    result: 'void'
  },
  
  // Text output
  ncplane_putstr_yx: {
    parameters: ['pointer', 'i32', 'i32', 'buffer'],
    result: 'i32'
  },
  
  // Color
  ncplane_set_fg_rgb8: {
    parameters: ['pointer', 'u32'],
    result: 'i32'
  },
  ncplane_set_bg_rgb8: {
    parameters: ['pointer', 'u32'],
    result: 'i32'
  },
  
  // Visuals
  ncvisual_from_file: {
    parameters: ['buffer'],
    result: 'pointer'
  },
  ncvisual_blit: {
    parameters: ['pointer', 'pointer', 'pointer'],
    result: 'i32'
  },
  ncvisual_destroy: {
    parameters: ['pointer'],
    result: 'void'
  }
})
```

## Installation and Setup

### macOS (Homebrew)
```bash
brew install notcurses
```

### Verification
```bash
# Check installation
notcurses-info

# List available symbols
nm /opt/homebrew/lib/libnotcurses-core.dylib | grep "T _"
```

## Common Issues and Solutions

### Symbol Not Found Errors
- **Cause**: Incorrect library selection or function name
- **Solution**: Verify symbol exists using `nm` command and use correct library

### Initialization Failures
- **Cause**: Incorrect parameter order or structure packing
- **Solution**: Use `notcurses_core_init` with proper option structure

### Render Function Mismatch
- **Cause**: Using `notcurses_render` from wrong library
- **Solution**: Use `ncpile_render` from core library with standard plane

## Version Information

- **Notcurses Version**: 3.0.16
- **Deno FFI**: Requires `--allow-ffi` permission
- **Platform**: Tested on macOS 15.3.1 with Homebrew installation

## Related Files

- **Implementation**: `src/graphics/notcurses-ffi.ts`
- **Demo**: `examples/advanced-graphics-demo.tsx`
- **Header**: `/opt/homebrew/Cellar/notcurses/3.0.16/include/notcurses/notcurses.h`
