# Finalized Architectural Decisions
## Next-Generation Terminal UI Framework

### Core Architecture

**API Paradigm**: **Hybrid API** (leaning declarative)
- Custom JSX-like DSL for declarative components where possible
- Imperative escape hatches for advanced use cases
- TSX support with custom transformations (not React)

**State Management Model**: **Hybrid TEA + Hook System**
- Elm Architecture (TEA) pattern for predictable state flow
- Hook-based lifecycle system for component composition
- Message-passing interface for extensibility

### Technology Stack

**Core Technology**: **FFI-First with Native Integration**
- Leverage Notcurses via FFI for advanced graphics and rendering
- Potential GPU acceleration for complex layouts and animations
- Heavy compute operations via native libraries (Rust/C++)
- TypeScript orchestration layer with native backends

**Layout System**: **Constraint-Based with Cassowary**
- Cassowary constraint solver for flexible layouts
- Support for complex responsive terminal designs
- Fallback to simpler flex-like layouts for basic cases

### Input & Output

**Input Handling**: **Native FFI (libtermkey/Notcurses)**
- Full keyboard and mouse support via libtermkey
- Advanced terminal input parsing through Notcurses
- Touch-friendly input patterns for modern terminals

**Graphics Backend**: **Advanced FFI (Notcurses)**
- True color (24-bit RGB) support
- Inline images via Sixel, iTerm2, and Kitty protocols
- GPU-accelerated rendering where possible
- Unicode-aware text handling and layout

**Terminal Abstraction**: **Modern ANSI + Advanced Features**
- Baseline ANSI support for compatibility
- Advanced features via terminal capability detection
- Graceful degradation for older terminals

### Text and Internationalization

**Text Handling**: **Unicode-Aware**
- Full Unicode support with proper text measurement
- Text wrapping, alignment, and complex layouts
- Monospace optimization with fallback for variable-width

**Text Direction**: **LTR Only (Phase 1)**
- Basic left-to-right text flow
- International support deferred to future phases

**Internationalization**: **Not in Phase 1**
- Focus on core framework first
- Extensible architecture for future i18n integration

### Extensibility & Interactivity

**Extensibility Mechanism**: **Hook-Based System**
- Lifecycle hooks for components and application stages
- Plugin architecture via component registry
- Message-passing interface for decoupled extensions

**Remote UI Protocol**: **Optional JSON-RPC**
- Network-based UI control for advanced use cases
- Collaborative editing and remote terminal scenarios
- RESTful API for external tool integration

**Embedded Subprocesses**: **Deno.Pty Integration**
- PTY support for embedding external CLI tools
- Composable terminal multiplexer functionality
- Sandboxed subprocess execution

### Animation & Performance

**Animation System**: **Hybrid Frame + Event-Driven**
- Frame-based animations for smooth transitions
- Event-driven state transitions for reactive updates
- Protocol-specific optimizations (Kitty animation)

**Optimization Strategy**: **Double-Buffering + Diffing**
- Terminal screen double-buffering for flicker-free updates
- Smart diffing for minimal redraws
- Constraint solver caching for layout performance

### Developer Experience

**Configuration**: **Flat JSON/Text Files**
- Simple configuration management
- Human-readable config files
- Version-controlled settings

**Debugging Tools**: **Custom Time Travel**
- Snapshot-based state history (not React DevTools)
- State rewind and replay functionality
- UI tree inspection for declarative components

**CLI Tooling**: **Comprehensive Developer Platform**
- Project scaffolding and generation
- Hot reload for development
- Build and deployment automation

**Editor Support**: **VS Code Extension + Language Server**
- Custom TSX syntax highlighting and completion
- Component preview and debugging integration
- Framework-specific linting and validation

### Security Model

**Subprocess Sandboxing**: **Deno Permission-Based**
- Leverage Deno's built-in permission system
- Framework-level resource access control
- Automatic input sanitization for security

**Resource Access**: **Static Configuration**
- Manifest-based permission declarations
- Controlled file and network access
- Output encoding for terminal security

### Testing & Quality

**Testing Framework**: **Custom TSX Testing**
- Framework-specific testing utilities
- Component snapshot testing
- Integration testing with virtual terminals

**Cross-Platform**: **Modern Terminal Focus**
- Primary support for modern terminal emulators
- macOS, Linux, Windows Terminal compatibility
- WASI support for headless testing

### Non-Goals (Phase 1)

- Legacy terminal support (pre-VT100)
- Full GUI emulation
- Web browser integration
- Complex internationalization
- Right-to-left text support

### Implementation Philosophy

**"Think Big, Think Scrappy"**
- Leverage existing battle-tested libraries via FFI
- Custom solutions only where needed for innovation
- Rapid prototyping and iteration
- Developer experience as a first-class concern

---

*This document serves as the architectural foundation for the next-generation terminal UI framework, prioritizing modern terminal capabilities while maintaining developer productivity and framework extensibility.* 