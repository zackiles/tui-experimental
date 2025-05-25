# Fixing Notcurses FFI Integration

## Current Issue
The notcurses FFI is failing because the symbol names don't match between the expected API and the actual library symbols.

## Symbol Mapping Found
```
Expected FFI:      Actual Library:
ncplane_putstr_yx  _ncplane_printf_yx (static symbol)
                   _ncplane_cursor_move_yx (global)
                   _ncplane_putstr (global)
```

## Solution Options

### Option 1: Use cursor movement + putstr
Replace `ncplane_putstr_yx` with:
1. `ncplane_cursor_move_yx(plane, y, x)`
2. `ncplane_putstr(plane, text)`

### Option 2: Update FFI symbols
In `src/graphics/notcurses-ffi.ts`, use the correct symbol names without underscores (Deno FFI handles the prefix automatically on macOS).

### Option 3: Alternative rendering
The ANSI fallback mode is working perfectly and may be sufficient for many use cases.

## Testing Results
- ✅ Framework core functionality: Working
- ✅ ANSI rendering mode: Working  
- ✅ Input handling: Working
- ✅ Diagnostic logging: Working
- ❌ Notcurses FFI: Symbol name mismatch
- ⚠️  Visual output: Limited by terminal size

## Recommendations
1. Increase terminal size to 80x24 minimum
2. Test in native terminal app (not VS Code integrated)
3. Set environment variable `TUI_DEBUG_CONSOLE=1` for verbose output
4. Check latest log file in `logs/` directory for detailed diagnostics

The framework is ready for development - the notcurses integration is optional for basic functionality. 
