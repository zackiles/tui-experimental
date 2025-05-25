# Root Decisions

The following are the main decisions that need to be made about this project
according to the current-state of our research, and grouped by the respective
category that decision is concerned with.

- **NOTE**: More decisions may be discovered later as new research emerges.

## Category: State

<!-- No research done yet. -->

## Category: Tools

<!-- No research done yet. -->

## Category: Prompts

<!-- No research done yet. -->

## Category: Configuration

<!-- No research done yet. -->

## Category: Conversations

<!-- No research done yet. -->

## Category: Presentation (AKA Terminal UI)

### Root Decisions

1. **API Paradigm & State Management Model (Tightly Coupled)**
   - **Decision Points Involved**:
     - `1. Core Architecture - API Paradigm` (Options: Declarative, Immediate
       Mode, Hybrid)
     - `1. Core Architecture - State Management Model` (Options: TEA, Reactive
       Signals, ECS)
   - **Impact**: These are the most fundamental choices.
     - Choosing a **Declarative API** (like JSX/DSL) strongly aligns with **TEA
       (Elm Architecture)** or **Reactive Signals**. This path favors diffing
       optimizations, event-driven/state-driven animations, automatic focus
       management (DOM-like), and debugging tools like UI tree inspectors and
       time-travel debuggers. It's generally less compatible with pure immediate
       mode approaches or ECS.
     - Choosing an **Immediate Mode API** (ImGui-style) typically pairs well
       with an **ECS (Entity-Component-System)**. This path is more suited to
       manual focus control and frame-based animations. It's often less
       compatible with declarative paradigms, diffing, or TEA.
     - A **Hybrid API** aims for flexibility and can work with any state
       management model, but the specific leanings (more declarative or more
       imperative) will still guide other choices.
   - **Why it's a root decision**: This choice dictates how developers will
     interact with the framework, structure their UI components, and manage
     application state. It has cascading effects on layout systems, input
     handling, animation systems, optimization strategies, and developer
     experience tools, as seen by frequent mentions in their compatibility notes
     (e.g., `Layout Engine`, `Focus Management`, `Optimization (Diffing)`,
     `Animation Primitives`, `Extensibility Mechanism`, `Debugging Tools`).

2. **Core Technology for Advanced Features & Performance (FFI vs. WASM vs. Pure
   TS)**
   - **Decision Points Involved**:
     - `10. Cross-Platform & Performance - Heavy Compute` (Options: WASM, Native
       FFI, Pure TS)
     - Implicitly influences choices in `Graphics Backend`,
       `Keyboard/Mouse Parser`, `Text Handling (Unicode-aware)`,
       `Terminal Abstraction (Terminfo/FFI)`.
   - **Impact**: This decision concerns how the framework will implement
     performance-critical sections or access system-level features.
     - **Native FFI (Foreign Function Interface)**: Enables use of powerful
       C/C++/Rust libraries (e.g., for graphics like Notcurses, advanced input
       handling like libtermkey, or Terminfo for terminal capabilities). This
       often provides maximum performance and feature access but can add
       complexity, impact portability (especially to browsers/WASI), and make a
       "Pure WASM approach" less compatible.
     - **WASM (WebAssembly)**: Offers a balance of performance and portability
       (including potential browser use). It works well with other WASM
       components (e.g., Taffy for layout) but might be less compatible with
       FFI-heavy approaches for certain deep system integrations.
     - **Pure TS**: Prioritizes simplicity, portability, and ease of integration
       within the Deno/Node ecosystem. However, it may be "less compatible with
       performance-critical code" or advanced, low-level terminal features that
       FFI could provide.
   - **Why it's a root decision**: This choice sets fundamental capabilities and
     constraints regarding performance, access to specialized libraries, and
     cross-platform strategy. It directly gates what's feasible for the
     `Graphics Backend`, how `Terminal Abstraction` beyond basic ANSI is
     achieved, and how sophisticated `Input Handling` can be.

3. **Graphics Backend & Terminal Abstraction**
   - **Decision Points Involved**:
     - `4. Rendering & Output - Graphics Backend` (Options: ANSI, FFI, WASM)
     - `10. Cross-Platform & Performance - Terminal Abstraction` (Options:
       ANSI-only, Terminfo/FFI, WASI)
     - Related to `2. Layout System - Text Handling` (especially GPU-accelerated
       or Unicode-aware options).
   - **Impact**: These decisions define how the UI is rendered and how the
     framework adapts to different terminal capabilities.
     - **ANSI-based**: The simplest and most portable, working well with
       text-focused UIs and modern terminals. However, it's "less compatible
       with advanced graphics" or nuanced legacy terminal support.
     - **FFI-based (e.g., Notcurses, FTXUI, Terminfo)**: Allows for advanced
       graphics, wider terminal compatibility through Terminfo, and potentially
       GPU acceleration. This is synergistic with choosing FFI for
       `Heavy Compute` but less compatible with a pure WASM strategy or simple
       ANSI-only goals.
     - **WASM-based rendering/layout**: Leverages WASM for parts of the
       rendering pipeline (e.g., Taffy for layout), aligning with a WASM-centric
       `Heavy Compute` choice.
     - The level of `Terminal Abstraction` (ANSI-only, Terminfo, or WASI for
       headless) determines the breadth of support and the types of features
       that can be reliably exposed (e.g., advanced input sequences,
       terminal-specific graphics).
   - **Why it's a root decision**: This determines the visual capabilities and
     limitations of the framework. It's heavily influenced by the
     `Core Technology` choice (FFI/WASM/TS) and directly impacts features like
     advanced text handling, animation possibilities (protocol-specific), and
     the range of supported terminals.

**Summary of the "Decision Tree" Flow:**

The true "tree" is more of an interconnected graph, but a common decision flow
would be:

1. **Define the core developer experience**: Choose the `API Paradigm` and
   `State Management Model` first. This establishes the foundational programming
   model.
2. **Determine the technical underpinnings for power and portability**: Decide
   on the primary approach for `Heavy Compute` and system interaction (FFI,
   WASM, or Pure TS). This sets the stage for what's possible in terms of
   features and performance.
3. **Specify visual capabilities and terminal interaction**: Based on the above,
   select the `Graphics Backend` and the desired level of
   `Terminal Abstraction`.

Once these three major areas are decided, the options for other decision points
(like specific layout engines, input parsing details, animation primitives,
extensibility mechanisms, and developer tooling) become significantly more
constrained and guided by the initial foundational choices. For example, a
declarative API naturally leads to considering layout systems like CSS-like DSLs
and optimization techniques like diffing. An FFI-heavy approach for core
technology opens the door to using advanced FFI-based graphics backends.
