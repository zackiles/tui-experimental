### **RFC: Next-Generation Terminal UI Framework**

#### **1. Core Architecture**

- **Decision Points**:
  - **State Management Model**:
    1. Elm Architecture (TEA)
       - Works best with: Declarative API, diffing optimization
       - Less compatible with: Immediate Mode
    2. Reactive Signals (SolidJS)
       - Works best with: Fine-grained updates, hybrid API
       - Less compatible with: Full immediate mode
    3. Entity-Component-System (ECS)
       - Works best with: Immediate Mode or Hybrid API
       - Less compatible with: Pure declarative

  - **API Paradigm**:
    1. Declarative (JSX/DSL)
       - Works best with: TEA or Reactive Signals
       - Less compatible with: Pure ECS
    2. Immediate Mode (ImGui-style)
       - Works best with: ECS
       - Less compatible with: TEA
    3. Hybrid (Declarative + Imperative escape hatches)
       - Compatible with: Any state management approach

#### **2. Layout System**

- **Decision Points**:
  - **Layout Engine**:
    1. Constraint Solver (Cassowary)
       - Works best with: Complex layouts, declarative specification
       - Less compatible with: Pure immediate mode
    2. Custom DSL (CSS-like)
       - Works best with: Declarative API
       - Less compatible with: Pure immediate mode
    3. Hybrid (Flexbox + Grid via WASM)
       - Compatible with: Most API approaches

  - **Text Handling**:
    1. Monospace-only
       - Works best with: Simple ANSI rendering
       - Less compatible with: Advanced text styling
    2. Unicode-aware (wrapping/alignment)
       - Works best with: FFI or advanced rendering backend
       - Less compatible with: Simple ANSI-only
    3. GPU-accelerated (via Sixel/Kitty)
       - Works best with: Advanced rendering backend (Notcurses)
       - Less compatible with: Simple ANSI-only, headless mode

#### **3. Input Handling**

- **Decision Points**:
  - **Keyboard/Mouse Parser**:
    1. Pure TS (ANSI sequences)
       - Works best with: Cross-platform focus
       - Less compatible with: Advanced terminal features
    2. FFI (libtermkey/Notcurses)
       - Works best with: Other FFI components
       - Less compatible with: Pure WASM approach
    3. Hybrid (TS + FFI fallback)
       - Compatible with: Most architectural choices

  - **Focus Management**:
    1. Manual (developer-controlled)
       - Works best with: Immediate Mode or Hybrid API
       - Less compatible with: Automatic focus systems
    2. Automatic (DOM-like)
       - Works best with: Declarative API
       - Less compatible with: Pure immediate mode
    3. Hybrid (z-index + tab order)
       - Compatible with: Most API approaches

#### **4. Rendering & Output**

- **Decision Points**:
  - **Graphics Backend**:
    1. ANSI (Truecolor/256-color)
       - Works best with: Simple text-focused UI
       - Less compatible with: Advanced graphics
    2. FFI (Notcurses/FTXUI)
       - Works best with: Advanced graphics, other FFI components
       - Less compatible with: Pure WASM approach
    3. WASM (Taffy for layout + custom renderer)
       - Works best with: Other WASM components
       - Less compatible with: Heavy FFI usage

  - **Optimization**:
    1. Double-buffering
       - Works best with: Any rendering approach
       - Less compatible with: Minimal memory usage
    2. Diffing (React-style)
       - Works best with: Declarative API
       - Less compatible with: Pure immediate mode
    3. Terminal-specific (Kitty/Sixel)
       - Works best with: Advanced graphics backend
       - Less compatible with: Universal terminal support

#### **5. Animation System**

- **Decision Points**:
  - **Animation Primitives & Control**:
    1. Frame-based (Timer/requestAnimationFrame-like loop)
       - Works best with: Immediate mode or hybrid where imperative updates are
         easy.
       - Less compatible with: Purely declarative state-driven updates without
         side effects.
    2. Event-driven / State-driven Transitions
       - Works best with: Declarative APIs (TEA, Reactive Signals) where state
         changes trigger animations.
       - Less compatible with: Fine-grained imperative control needed for
         complex physics.
    3. Protocol-specific Commands (e.g., Kitty animation protocol)
       - Works best with: Terminals supporting advanced graphics protocols.
       - Less compatible with: Universal terminal support, simpler backends.
  - **Easing & Interpolation**:
    1. Built-in Easing Functions (linear, ease-in-out, etc.)
    2. Physics-based (springs, dampers)
    3. Custom Interpolators via API

#### **6. Interactivity & Extensibility**

- **Decision Points**:
  - **Embedded Subprocesses**:
    1. Deno.Pty
       - Works best with: Deno-specific features
       - Less compatible with: WASI
    2. Custom PTY layer
       - Works best with: Cross-platform needs
       - Less compatible with: Simplicity
    3. None (CLI-only)
       - Works best with: Simple commands
       - Less compatible with: Interactive applications

  - **Remote UI Protocol**:
    1. JSON-RPC
       - Works best with: Web interoperability
       - Less compatible with: Binary optimization
    2. CRDT (Yjs/Automerge)
       - Works best with: Collaborative features
       - Less compatible with: Simple unidirectional flow
    3. Custom binary (MessagePack)
       - Works best with: Performance requirements
       - Less compatible with: Web browser integration

#### **7. Middleware & Plugin Architecture**

- **Decision Points**:
  - **Extensibility Mechanism**:
    1. Hook-based System (Lifecycle hooks for components/app)
       - Works best with: Both declarative and imperative APIs, allows tapping
         into various stages.
    2. Pipeline/Stream Processing (for events, state updates)
       - Works best with: Event-driven architectures (TEA, Redux-like).
    3. Component Registry & Mixins
       - Works best with: Declarative, component-based APIs.
  - **Plugin API Surface**:
    1. Access to Core Internals (State, Renderer, Input)
       - More powerful, but harder to maintain API stability.
    2. Restricted API (Specific extension points)
       - Easier to maintain, less powerful.
    3. Message-Passing Interface
       - Decoupled, good for sandboxing.

#### **8. Internationalization & Localization (i18n & l10n)**

- **Decision Points**:
  - **Translation Management**:
    1. Built-in Key-Value System (e.g., JSON/YAML resource files)
       - Works best with: Most application types needing static string
         translation.
    2. Integration with Standard Libraries (e.g., Intl API via JS runtime)
       - Works best with: Complex formatting needs (dates, numbers, plurals).
    3. No Built-in Support (Developer brings their own solution)
       - Simpler framework core, more work for app developer.
  - **Text Direction & Layout**:
    1. Basic Left-to-Right (LTR) only
    2. Bidirectional Text Support (RTL, e.g., for Arabic, Hebrew)
       - Requires layout engine and text rendering to be BiDi-aware.
    3. Locale-aware Component Variants (e.g., different date pickers)

#### **9. Security Model**

- **Decision Points**:
  - **Subprocess Sandboxing**:
    1. OS-level Sandboxing (if available and controllable)
    2. Permission-based API Access for Subprocesses
       - Requires framework to mediate PTY I/O for filtering.
    3. No Explicit Sandboxing (Relies on OS permissions)
       - Simpler, but higher risk if running untrusted code.
  - **Resource Access Control (Files, Network)**:
    1. Framework-level Permission Prompts/API
       - Works best with: Interactive applications needing user consent.
    2. Static Configuration/Manifest
    3. Rely on Deno/Runtime Permissions
       - Puts onus on how the main app is run.
  - **Input Sanitization & Output Encoding**:
    1. Automatic Sanitization for Known Vulnerabilities (e.g., escape sequence
       injection)
    2. Developer-controlled Sanitization APIs
    3. None (Developer responsibility)

#### **10. Cross-Platform & Performance**

- **Decision Points**:
  - **Terminal Abstraction**:
    1. ANSI-only (Xterm baseline)
       - Works best with: Modern terminals
       - Less compatible with: Legacy support
    2. Terminfo/FFI (ncurses)
       - Works best with: Wide terminal compatibility
       - Less compatible with: WASI
    3. WASI (headless testing)
       - Works best with: Testing focus
       - Less compatible with: Terminal-specific features

  - **Heavy Compute**:
    1. WASM (Rust/C++)
       - Works best with: Browser compatibility
       - Less compatible with: FFI-heavy approach
    2. Native FFI
       - Works best with: Performance-critical code
       - Less compatible with: Browser/WASI
    3. Pure TS (fallback)
       - Works best with: Simplicity, portability
       - Less compatible with: Performance-critical code

#### **11. Developer Experience**

- **Decision Points**:
  - **Debugging Tools**:
    1. Time-travel (Redux DevTools)
       - Works best with: TEA or unidirectional flow
       - Less compatible with: ECS without middleware
    2. UI Tree Inspector
       - Works best with: Declarative or hybrid API
       - Less compatible with: Pure immediate mode
    3. Terminal Capability Sniffer
       - Works best with: Terminal abstraction layer
       - Less compatible with: ANSI-only approach

  - **Tooling**:
    1. CLI Scaffolding
       - Works best with: Any architecture
    2. Hot Reload
       - Works best with: Declarative or hybrid API
       - Less compatible with: Stateful immediate mode
    3. VS Code Extension
       - Works best with: Any architecture

#### **12. Non-Goals**

- Legacy terminal support (pre-VT100).
- Full GUI emulation (WebView/Electron).
