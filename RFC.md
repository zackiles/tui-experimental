# RFC: Inventing a Next-Generation Terminal UI Framework

## Introduction

Building a **bleeding-edge terminal interface framework** requires rethinking
many assumptions of existing tools like Ink (React-based CLI UI) and the Yoga
flexbox layout engine. Ink leverages Yoga to adapt web-style Flexbox layouts to
the terminal, which allows developers to use familiar CSS-like properties (e.g.
`flexDirection`, `justifyContent`) for CLI components. While this approach
brings web paradigms into the terminal, our new framework will diverge
fundamentally – exploring new **layout engines, rendering models, and I/O
abstractions** optimized for modern terminal capabilities. The goal is to help
an engineer design a framework (targeting TypeScript/JavaScript on Node, Deno,
or WASI) that surpasses the limitations of Ink/Yoga with fresh ideas and
integrations via Deno’s FFI.

Below we present a comprehensive research report on innovative approaches for
terminal UIs. We cover alternative layout algorithms (beyond Yoga’s Flexbox),
reactive and declarative UI paradigms, advanced terminal interactivity (mouse,
touch, graphics protocols), unique design patterns like ECS and CRDTs, low-level
terminal I/O layers, and a comparison of existing libraries that could inform
this new framework. The focus is on **cutting-edge techniques and standards** to
build a modern TUI from scratch.

## Alternative Layout Engines and Rendering Paradigms

**Limitations of Flexbox/Yoga in Terminal UIs:** Flexbox (as provided by Yoga)
is convenient, but it may not be ideal for all terminal layouts. Yoga expects a
tree of nodes with styles and computes sizes in a retained-mode fashion. In a
terminal (a grid of character cells), more specialized or dynamic layout logic
might yield better results. We consider two broad categories of alternative
layout systems: **constraint-based solvers** and **immediate or
scene-graph-based layouts**.

- **Constraint-Based Layout (Cassowary and Variants):** Instead of flex
  properties, a constraint solver can layout UI elements based on linear
  equations and inequalities (e.g. “widget A’s width = widget B’s width + 10”,
  or “panel must be at least 30% of screen”). The **Cassowary** algorithm
  (famous for powering Apple’s Auto Layout) is one option. Notably, the Rust TUI
  library uses a Cassowary solver (`cassowary-rs`) under the hood to compute
  terminal layouts. It represents layout constraints (min/max lengths,
  percentage ratios, etc.) and computes an optimal division of space for UI
  components. This approach could allow flexible declarations like “Column X
  takes remaining space” or “Row Y should stretch but not exceed 50 characters”.
  A solver yields an exact solution each frame, which is feasible given the
  relatively small number of UI elements in a TUI. By integrating a constraint
  solver (via WASM or native FFI), our framework can support **declarative
  layout constraints** beyond Yoga’s flex model – enabling grid layouts,
  alignment constraints, or even fluid terminal designs akin to GUI toolkits.

- **Scene Graphs and Hierarchical Layout:** Traditional GUIs often use a **scene
  graph** (hierarchy of UI nodes) where each node can have transforms, clipping,
  etc. A terminal UI can similarly use a retained **UI tree** structure. Instead
  of Flexbox, each container node could have custom layout logic (like a
  vertical stack, horizontal flow, grid table, etc.). For example, a “table
  layout” container might distribute column widths based on content or specified
  weights, a “grid” container could place widgets in a matrix by row/col
  coordinates, etc. This scene graph approach emphasizes a flexible tree of
  elements with possibly different layout algorithms per node. It’s somewhat
  analogous to web (DOM with CSS layouts) but can be tailored: e.g. a container
  that uses a **constraint solver** internally, or one that simply centers its
  child. Using a scene graph does not mandate how layout is done – it provides
  the structure to apply different strategies at different parts of the UI.

- **Immediate Mode UI vs. Retained Mode:** We should consider whether to adopt a
  **retained (declarative) UI** like React/Ink or an **immediate mode** approach
  as seen in game UIs. Ink is declarative/retained – you describe the final UI
  and a reconcilation diff updates the terminal. In contrast, **immediate mode
  UI** (à la Dear ImGui) computes the UI every frame in imperative code, without
  storing a long-lived widget hierarchy. Immediate mode has advantages: simpler
  state management (just draw based on current state each tick), and potentially
  easier integration with game-like systems or ECS. There are precedents for
  immediate mode in terminal: **ImTui** (Immediate Mode Text UI in C++) provides
  an ImGui-like API for text UIs. Immediate mode could simplify our framework’s
  core: each render cycle, user code draws the UI with function calls (like
  `ui.button(label)`), and the framework handles input and drawing behind the
  scenes. However, immediate mode in a terminal must address flicker and partial
  updates carefully (since re-drawing everything can be slow over a TTY). A
  hybrid approach is possible: use immediate mode rendering internally but diff
  the output to update only changed cells.

- **Declarative Reactive Rendering:** If we stick to a declarative model (which
  many developers find productive), we don’t have to use a VDOM diff like React.
  **Reactive programming models** offer an efficient alternative. Frameworks
  like **SolidJS** and **Svelte** demonstrate that UIs can be updated without a
  virtual DOM by using fine-grained reactivity and compile-time optimizations.
  SolidJS, for example, tracks dependencies at a granular level and updates only
  the affected DOM nodes directly – no full tree diff needed. _Applying this to
  a terminal_: we could have **reactive state signals** driving the UI. Each
  component or region subscribes to certain state, and when that state changes,
  only that component is re-rendered (and its terminal region updated). This
  could yield very efficient updates for CLIs, where much of the screen might
  remain static when some state changes. **Svelte’s approach** (compiling UI
  templates to direct imperative code) is also inspiring – the framework
  essentially disappears at runtime, meaning our terminal UI components could
  compile to optimized draw routines. While building a full compiler like Svelte
  is non-trivial, we can incorporate the philosophy: use build-time where
  possible (e.g. template DSL to layout mapping) and minimize runtime overhead.

- **Hybrid Layout Models:** We might combine methods: for example, use a
  constraint solver for high-level layout (dividing regions of the screen), and
  within each region use a simpler immediate layout for contents. This is
  similar to how the Rust `tui` crate splits areas by constraints, then each
  area is drawn by a widget. Another idea is using **CSS Grid**-like layouts for
  the terminal (which Yoga doesn’t support). There are layout engines like
  **Taffy** (Rust) that implement both Flexbox and CSS Grid in a
  high-performance way. In fact, the Bevy game engine’s ECS-based UI uses Taffy
  for layout, allowing flex or grid models for arranging UI nodes. Our new
  framework could leverage such an engine (via WASM FFI) to gain modern web-like
  layouts (grid templates, fractional units, etc.), thus moving beyond Yoga’s
  flex-only approach.

- **Text Flow and Styling Considerations:** Terminal UIs often mix content and
  layout (e.g. a text area that wraps text). We should consider text measurement
  (monospaced, so width = number of chars, but wide characters and combining
  marks complicate it). Libraries like **FTXUI** (C++) handle UTF-8 and
  fullwidth characters properly. FTXUI uses a retained mode DOM of elements and
  can compute how text wraps or truncates within a given width. We can take
  inspiration from FTXUI’s approach: treat the terminal screen as a **grid of
  cells (pixels)** and build our own rendering tree. FTXUI even supports **basic
  animations and mouse navigation** in its model. By studying such libraries, we
  can incorporate advanced text layout (like wrapping, alignment) and maybe
  markup (colored and styled text spans) as first-class features of our
  framework.

**Declarative vs Imperative API:** Regardless of the underlying engine, we must
decide how the user will declare UI. Ink uses a **JSX/React-like declarative
API**, whereas something like curses or ImTui is imperative drawing. A
declarative API can be built on top of any rendering method – indeed, **FTXUI
offers a functional, React-inspired syntax in C++** (building UI by composing
functions). We likely want to keep a declarative style for ease of use (perhaps
using JSX or tagged template literals in TS) but implement it without Yoga. The
rendering backend could then either diff a virtual terminal buffer or use
reactive signals to update the real screen minimally. On the other hand,
exposing an **immediate mode API** could be useful for certain use cases (like
quickly drawing charts or integrating with game logic). Perhaps the framework
can support both: a high-level declarative layer and a low-level immediate
drawing API for advanced users (similar to how GUI frameworks let you
custom-draw on a canvas if needed).

## Modern Terminal Interactivity and Graphics

Modern terminal emulators are far more capable than the VT100s of old. Our
framework should embrace the **latest standards for input and output** to
deliver rich, interactive experiences.

### Advanced Input Handling (Keyboard, Mouse, Touch)

**Keyboard:** At minimum, we’ll handle all key presses, including special keys
(arrows, function keys) and key combinations. Libraries like Ink’s `useInput`
hook make it easy to capture keys, but under the hood enabling raw mode and
parsing escape sequences is complex. We have the choice of using existing input
parsing libraries via FFI (e.g. C’s `libtermkey` or Rust’s `crossterm` input
parser) or implementing it in TS. Key considerations:

- **Key Encoding Standards:** Most terminals follow **ANSI/DEC escape
  sequences** for special keys. Additionally, **Xterm “modifyOtherKeys”** can
  allow detecting keys with Ctrl/Alt that normally get sent as control
  characters. Our framework should enable **bracketed paste mode** (to detect
  paste events distinctly) and possibly handle **focus in/out events**
  (terminals can send an escape when the window gains or loses focus).

- **Mouse:** Modern terminals support mouse interactions through various
  protocols. The oldest is X10 mouse reporting (only sends presses), but the
  **Xterm SGR mouse mode** (1006) is now common, providing mouse move, scroll,
  and drag events with pixel-level coordinates within the text grid. We can
  expect terminals like xterm, iTerm2, Kitty, Windows Terminal etc. to support
  it. Our framework should enable mouse tracking mode and decode events (e.g.
  convert them to high-level events like onClick, onHover for components). There
  are libraries that simplify this: for instance, FTXUI and **BubbleTea (Go)**
  both have built-in mouse support, meaning they handle toggling the terminal’s
  mouse reporting and translate to events. We can also support **scroll-wheel
  events** (interpreted as mouse buttons 4/5 in the protocol), which can be
  valuable for scrollable views in a TUI.

- **Touch Input:** While terminals are keyboard-centric, touchscreens are
  ubiquitous (think of SSH from a tablet, or a modern terminal emulator on a
  phone). Some terminal emulators (like **eDEX-UI, a sci-fi terminal emulator**)
  explicitly advertise _“full support for touch-enabled displays”_ – effectively
  treating touch events as mouse clicks at coordinates, and providing on-screen
  keyboard support. Our framework should be ready for such scenarios. If the
  terminal emits touch as mouse events, we’ll already handle it. For multi-touch
  gestures, there is no standard terminal protocol; however, an emulator could
  translate pinch or swipe into mouse drags or special key sequences. It’s an
  emerging area, but being aware of projects like eDEX-UI suggests designing
  flexible input handling that can adapt to new event types.

- **Input Editing & Shell Integration:** If our framework will include text
  input fields or command-line editing, we might leverage libraries made for
  interactive line editing. For instance, the **Python Prompt Toolkit** provides
  advanced line editing (with auto-completion, history, syntax highlight) for
  CLI apps. Similarly, there are C++ libraries (like _linenoise_ or _readline_)
  and Rust crates (_reedline_, etc.) that could be tapped via FFI for robust
  text editing components. This would allow our framework to have an “editor
  widget” or even embed a mini-shell. At the very least, raw input reading and
  an internal key handling for editable text fields (handling backspace, arrow
  navigation in text, etc.) will be needed – Ink, for example, had to implement
  a custom text input cursor management utility. We can stand on the shoulders
  of existing shell tools to implement this more quickly.

### Terminal Graphics and Rich Output

Classic terminal UIs rely on ASCII and Unicode characters for drawing UI (boxes,
lines, colors). The new framework can push this further by leveraging **true
color, images, and even GPU-accelerated graphics** in the terminal:

- **Colors and Styling:** Truecolor (24-bit RGB) is supported in most modern
  terminals (advertised via `$COLORTERM=truecolor`). We should design the
  framework to output 24-bit color ANSI codes for rich themes, while gracefully
  degrading to 256-color or 16-color if needed (perhaps via terminfo if on a
  lesser terminal). Also consider text styling (bold, italics, underline) and
  utilizing **Unicode characters** for UI elements (box-drawing characters,
  block elements, Braille patterns for plots, etc.). Many frameworks (e.g.
  Python’s **Rich** library) have demonstrated how attractive formatting can be
  in terminal apps. Our framework could incorporate a styling system or even
  CSS-like styling for text UI.

- **Inline Images (Sixel, iTerm2, Kitty):** We now have the ability to display
  pixel images in terminals. **Sixel** is a protocol from DEC terminals that
  encodes pixel data as a sequence of text. It’s seeing a renaissance: numerous
  emulators (XTerm, mlterm, yaft, Linux console via sixel graphics, and even
  Windows Terminal as of v1.22) support Sixel. iTerm2 (macOS) introduced its own
  image escape codes (popular in some CLI tools). The **Kitty terminal** offers
  a modern _Graphics Protocol_ that allows sending images with features like
  positioning, transparency, and even animation. Kitty’s protocol is more
  advanced than Sixel (e.g. allowing a program to draw OpenGL directly and
  transfer the result), and it's been adopted by some other terminals as well.
  For example, there are tools like `glkitty` (which renders OpenGL graphics to
  the terminal using Kitty’s protocol) and `term-image` (a Python TUI image
  viewer) leveraging these.

  Our new framework can integrate image support such that developers can, say,
  display an image or graphics in a terminal widget if the terminal supports it.
  We’d detect the capability (via querying terminal response or environment
  variables) – e.g. check for `KITTY_GRAPHICS` support or iTerm’s – and then
  allow an `<Image src="file.png">` component or a canvas drawing API. Over SSH,
  these image protocols still work (they’re just escape sequences), as noted by
  developers. This opens up possibilities like showing charts, icons, even
  playing videos in the terminal (which **Notcurses** actually demonstrates,
  with video streaming support on compatible terminals).

- **GPU Acceleration & WebGPU:** Some terminals utilize the GPU for rendering
  text (for performance), but exposing GPU rendering to applications is new. One
  idea is using something like **WebGPU/WGPU** to render off-screen graphics and
  then output them as images to the terminal. For instance, our framework could
  have an off-screen WebGPU context to draw shapes (lines, circles, etc.) and
  then convert that to a bitmap for display via sixel/kitty. While niche, this
  would enable high-quality graphs or even mini-games inside the terminal.
  Projects like **CursedGL** already do software rasterization to draw 3D
  graphics in the terminal (using Notcurses). We could take it further with
  actual GPU computing: e.g. use compute shaders to quickly compute complex
  layouts or animations if needed, though the overhead of transferring the
  result to the terminal might outweigh benefits. Another angle is using WebGPU
  not for drawing to terminal, but for accelerating computations (like layout
  solving or diffing) within our framework runtime since Deno can interface with
  WASM (which could call into a WebGPU API). This is speculative but illustrates
  the “bleeding-edge” thinking – leveraging modern hardware even in a text UI
  context.

- **Advanced Textual Effects:** Beyond static images, consider **interactive
  graphics**. The Kitty protocol can do some tricks like an application can send
  an image, then later send an update to move or delete it by ID, enabling
  lightweight animation or conditional display. Also, terminals like **Contour**
  and **WezTerm** are adding more graphic features. We should track emerging
  standards: for example, the **ReGIS** vector graphics commands (an older DEC
  tech) which some modern emulators (like Iterm2 and possibly others) partially
  support for drawing vector shapes. Although not widely used, it could allow
  drawing charts without pixelation.

- **Mixing Text and Graphics:** A challenge with adding images to terminal UIs
  is coordinating text flow around graphics. Some protocols (Kitty) let images
  be placed under text or block out certain cell regions. Our framework could
  introduce a concept of “layers” or z-index for terminal content – e.g. a
  background image layer and a foreground text layer. If properly supported by
  the emulator (Kitty does support compositing text over images), this means we
  could have backgrounds, sprites, etc., in a TUI – essentially merging GUI-like
  visuals with text. This is truly a novel capability that an Ink/Yoga approach
  doesn’t touch at all. It may be ambitious, but considering it now ensures our
  architecture (especially the rendering pipeline) can accommodate drawing
  operations that are not just writing characters (for instance, sending binary
  pixel data).

### Composable UI and Multi-Process Architectures

Beyond direct terminal capabilities, a modern framework might allow **composable
interfaces** and multi-process cooperation:

- **Embedding External Tools:** A common pattern in terminal workflows is using
  existing CLI programs and displaying their output. Our framework could allow
  embedding another program’s output in a sub-region. For example, one might
  want to run a command like `git log` or a text editor inside a panel of the
  UI. Achieving this means allocating a **pseudo-terminal (pty)** for the child
  process and capturing its output. Framework support for this could be
  game-changing: it means UI developers can integrate legacy CLI tools visually.
  We see early ideas of this in tools like _tmux_ (which splits terminals, each
  running a shell or program) and projects like **moulti** (which displays
  arbitrary command outputs in collapsible blocks). To support it, our framework
  would need a way to manage multiple processes and their I/O (likely spawning
  via Deno’s subprocess API, using a pty library to get their output with
  control codes). We’d then parse/translate that output into our own UI (or
  simply draw it raw in a contained region). This essentially implements a
  **terminal multiplexer** internally, but integrated with our UI components. It
  allows highly composable UIs – imagine composing a dashboard where one
  component is a running `htop` instance, another is a live tail of logs,
  alongside our own interactive components.

- **Client-Server UI Protocols:** Another approach to composability is
  separating the UI frontend from the app backend via a protocol. The **Neovim
  editor** is a great example: it runs headless and communicates with any UI
  (terminal or GUI) via a **RPC-based UI protocol**. Multiple UIs can even
  attach to the same Neovim instance. For our framework, we could design a
  **protocol for terminal UI** where the UI can be driven by an external program
  or even remotely. This could enable collaborative scenarios or running the UI
  in one process while the logic is in another (for language interoperability or
  sandboxing). A simple version might be a JSON or MessagePack-based protocol
  where the backend sends high-level UI update commands (create element, update
  text, etc.) and the frontend (which could be our library running in a thin
  client mode) applies it. This is somewhat analogous to how web UIs work (diff
  sent to browser). Considering **CRDTs (Conflict-free Replicated Data Types)**
  here: if multiple sources (or users) can issue UI updates, using a CRDT for
  the shared state can ensure consistency without central coordination. This is
  speculative, but one could envision a terminal UI that two people connected
  via network can both interact with in real-time (like collaborative text
  editors). CRDT-based state management would allow merging of events (e.g. two
  cursors in the same form) without conflicts. While there’s not an
  off-the-shelf “UI CRDT” library yet, frameworks for collaborative data (like
  **Yjs** or **Automerge**) could possibly be integrated to sync state among
  different instances of the app. This paradigm is quite advanced, but including
  it from the ground-up (even as an optional module) would set our framework
  apart as _real-time collaboration ready_.

- **Reusable Protocols and Standards:** If designing a UI protocol, we might not
  need to start from zero. There’s discussion in the community about
  standardized terminal GUI protocols. For instance, **Textual (Python)** is
  exploring running the same app either in a terminal or a browser by
  abstracting the drawing layer. Textual’s approach effectively serializes the
  UI over a websocket to a browser when in web mode. We could do something
  similar, and thus our framework’s UI could potentially be rendered on a local
  terminal or a web-based terminal emulator interchangeably. Standards like
  **Terminfo/Termcap** (for capabilities) can be seen as a form of protocol –
  blessed (Node) shows it’s feasible to handle terminfo purely in user-space. We
  might imagine a **“Terminal UI Markup”** or **domain-specific language** to
  describe UI, which our framework could interpret. This would allow non-JS
  programs to emit UI definitions that our runtime renders. Although not a
  standard yet, this idea of decoupling UI description from the app (similar to
  how HTML/CSS is separate from server code) could make terminal UIs more
  composable.

In summary, by adopting a multi-process or client-server mindset, we can design
our framework to be **extensible and network-capable**, enabling novel uses like
remote UIs, persistent TUI daemons, and composition of multiple programs into
one interface. These are concepts beyond Ink/Yoga’s single-process, single-UI
model.

## Unique Design Paradigms for Terminal UI

To truly innovate beyond existing solutions, we should incorporate **design
paradigms from other domains** (games, distributed systems, functional
programming):

- **Entity-Component-System (ECS) Architecture:** ECS is prevalent in game
  engines for its performance and modularity. Applying ECS to a UI means
  representing each UI element (and possibly each primitive like a text or
  border) as an **Entity** with various **Components** (position, size, style,
  content, etc.), and having **Systems** that process them (layout system
  positions them, render system draws them, input system routes events to
  focusable entities, etc.). This data-oriented approach can improve decoupling
  and testability. For example, **Bevy’s UI** is built in ECS: UI nodes are
  entities with a `Node` component for layout, and the layout system (using
  Taffy) computes their positions. The benefits include integrating UI with game
  world data easily and leveraging parallelism in processing UI updates. In our
  context, ECS might be overkill for small CLIs, but if we envision complex
  terminal apps (with many components updating), ECS could shine. We can borrow
  the pattern partially – e.g. maintain an entity-component data store
  internally for UI elements. This would make it easier to integrate with
  external ECS systems too (imagine a game server controlling a TUI overlay).
  ECS also aligns with immediate mode UI if the systems recompute the UI each
  frame.

- **The Elm Architecture (TEA) and Functional Update**: Another paradigm (almost
  opposite of ECS) is the **unidirectional data flow** of Elm/Redux. The Elm
  Architecture – model, view, update – has influenced many TUI frameworks.
  Notably, **BubbleTea (Go)** explicitly follows Elm’s pattern. In this model,
  the application state is a single model (or a hierarchy of nested models), and
  any interaction produces messages that go through an update function to
  produce a new state, which then re-renders the view. This approach makes state
  management very predictable and side-effect free (aside from an init and
  subscription mechanism for external events). Our framework could provide a
  built-in **message-passing loop** where developers define an
  `update(msg, state)` and a `view(state)` function. The framework handles
  wiring input events to messages and calling the update, similar to Elm. This
  is a **declarative yet imperative** approach – declarative in describing UI
  and state transitions, but the program explicitly defines how to handle each
  event. TEA is great for ensuring all state changes are tracked and for
  time-travel debugging, etc. We might allow this as one way to use the
  framework (perhaps as an alternative to a JSX component approach). The
  advantage in a terminal app is clarity: e.g., a “Quit” message leads to an
  updated state that signals the program to exit; a “ButtonPressed” message
  updates some field in the model, and the view reflects it. It’s possible to
  implement TEA on top of a reactive core or vice versa, so we could incorporate
  both ECS and Elm-like patterns in different layers (e.g., use ECS internally
  but present an Elm-like API to users – BubbleTea essentially does something
  like this under the hood).

- **CRDTs for Real-Time Collaboration:** As introduced earlier, CRDTs allow
  multiple peers to update state concurrently without conflicts, given eventual
  consistency. In a terminal UI context, one use-case might be multi-user
  terminals or collaborative CLI tools (imagine a pair programming session in a
  CLI UI, or a network troubleshooting tool multiple admins interact with
  simultaneously). By using a CRDT-based state store (like **Yjs** or
  **Automerge**), our framework could support merging changes from remote
  sources seamlessly. For example, if two instances of the UI both have a list
  component and both add an item, a list CRDT would merge them without
  duplication. This is advanced and might not be a core requirement for a V1
  framework, but laying groundwork (like designing the state handling to be
  pluggable or serializable) could allow adding this later. At minimum,
  supporting **multiple UI clients** (as Neovim does) is a related concept – one
  can connect via SSH to the same running app and get the UI (the app would need
  to handle multiple input streams). CRDTs could handle divergent edits from
  those clients. In sum, incorporating CRDT thinking leads to a framework that
  isn’t just single-user single-terminal, but open to collaborative and
  distributed usage, aligning with modern trends of remote collaboration.

- **Event-Driven and Async Architecture:** Terminal apps often need to react to
  asynchronous events (timers, network data, etc.). Our framework should
  facilitate this by integrating with async/await or event loops nicely. Deno is
  async by nature, and we can allow the UI to refresh on external events without
  busy looping. Patterns like **actor model** (each component as an actor
  receiving messages) could help here. There’s overlap with Elm’s message
  system. We might also consider **middleware pipelines** for events (like Redux
  middleware) for logging or modifying actions – useful in complex apps or when
  integrating automation. Additionally, think of scripting: a user might want to
  script the UI (e.g. drive it with a test script). If we design with clear
  message inputs and a virtualized event loop, it becomes easier to
  programmatically control the UI (for testing or automation, akin to how
  headless browsers are controlled). This ties into CLI automation ecosystems –
  e.g., tools like Expect could send keystrokes to our app, and if our state is
  exposed, one could verify outcomes. Making the framework **composable and
  scriptable** (perhaps via an API or a built-in console) would set it apart.

- **Declarative Layout DSLs:** In embedded/mobile UI, it’s common to have a UI
  described in a markup or DSL (XML for Android, SwiftUI’s declarative DSL). We
  see early signs in terminal UIs too: for instance, **EzTerm uses YAML** to
  describe the UI layout and widgets, which it then renders. Similarly, .NET’s
  **Terminal.Gui (gui.cs)** allows XAML definitions. Adopting a declarative DSL
  for layout and style could make the framework more approachable to non-JS
  users. We could define a JSON or YAML schema for the UI (including components,
  layout constraints, etc.) which our engine can ingest at runtime. This also
  aids tools that might auto-generate UI layouts (like a TUI builder). It’s
  worth exploring, although as a secondary interface (our primary is
  programmatic via TS/JS). Still, ensuring the core is data-driven (UI =
  function(state, props)) means such DSL integration is feasible.

## Input/Output Abstraction Layer Considerations

Under the hood, a terminal UI framework must communicate with the terminal (tty)
in a device-independent way. Historically, this is handled by
**terminfo/termcap** databases and libraries like **ncurses**. For a new
framework:

- **Terminfo vs Direct Emulation:** We have a choice: rely on terminfo to know
  the control sequences for various terminals, or assume a baseline (like
  xterm-256color) and use those sequences directly. Many modern libraries
  actually embed a minimal terminfo-like capability set. For example, **Blessed
  (Node.js)** includes logic to parse terminfo and produce the correct escape
  codes, essentially reimplementing ncurses in JS. Blessed’s approach proves
  it’s possible to do this in a high-level language: it compiles terminfo
  entries to JavaScript and exposes a `Program` abstraction that outputs
  compatible sequences for any terminal type. We could take a shortcut: since
  today `xterm-256color` or similar is ubiquitous on Linux/macOS and Windows
  Terminal aims for broad xterm compatibility, we might initially hard-code to
  ANSI X3.64 / ECMA-48 control codes (the standards behind xterm). For 95% of
  users, that will work. Deno’s FFI allows calling system curses or terminfo
  functions if needed for odd terminals.

- **Cross-Platform Issues:** If targeting Windows, note that Windows 10’s
  conhost now supports VT sequences when enabled. Deno/Node usually enable that
  automatically. Still, older Windows CMD without VT support would need a
  different backend (like the Win32 console API). We may decide that a
  “bleeding-edge” framework can drop support for legacy environments and require
  VT support (i.e. Windows 10+ or use Windows Terminal). For WASI, actual
  terminal I/O might be provided by the host environment, likely as a byte
  stream that accepts ANSI codes. We should design an **abstraction for the
  terminal output** – an interface that can either be an ANSI-emitting writer,
  or could be swapped with a “fake” terminal for testing (e.g. a structure that
  records the last known screen state, useful for unit tests or running UIs in
  headless mode). This abstraction also helps if we integrate a GUI frontend: we
  could implement the interface with something that draws on a GUI canvas for
  example.

- **Using Native Libraries via FFI:** Instead of writing all low-level code in
  TS, we can leverage robust native libs:

  - **Ncurses** or **PDCurses**: battle-tested, but very C style. They manage
    output and input but have their own state (windows, pad, etc.) which may not
    fit our design if we want custom layout. However, one could use ncurses
    purely for its terminfo/tty handling and still manage layout in JS. Given
    ncurses is ubiquitous, linking to it via FFI could save time (just call
    `addch` etc.), but it might constrain us (e.g. ncurses has its own idea of a
    main loop).
  - **Notcurses**: a modern alternative that provides many advanced features
    (RGBA colors, images, sprites). It explicitly brands itself as “definitely
    not curses” and can do things ncurses can’t. Notcurses could serve as a
    powerful backend. We could let Notcurses handle rendering (it has functions
    to draw images, render text with good performance) and we focus on
    higher-level UI structure. For instance, Notcurses has a concept of “planes”
    (layers) that can be manipulated independently, and support for multimedia.
    By wrapping Notcurses (it has C and Python APIs, so FFI to C is doable), our
    framework could immediately gain **multithreaded rendering and multimedia
    support**. The downside is the complexity and being tied to an external
    large library. But it’s a serious contender for powering the output layer:
    as one user noted, _“Notcurses… supports vivid colors, multimedia, threads,
    and Unicode to the maximum degree possible. Things can be done with
    Notcurses that simply can't be done with NCURSES”_. For an engineer building
    a cutting-edge framework, that’s attractive – you can focus on new layout
    paradigms while delegating the gritty terminal drawing to Notcurses.
  - **Termbox, Tcell, etc.:** Lighter libraries like Termbox (C) or Tcell (Go)
    provide simpler abstractions (draw cell at X,Y with color). These could be
    wrapped as well (Termbox has a straightforward C API). However, many of
    these don’t support images or advanced styling beyond 256 colors, so they
    might not meet our needs for “emerging standards”.
  - **Ftxui (C++)**: While FTXUI is more a full framework than just an I/O lib,
    we might borrow components. It has a **Pixel-based Screen buffer** and knows
    how to translate a buffer to terminal escapes, including handling wide
    characters. Potentially, we could call into an FTXUI component to do final
    rendering of our computed layout. But integrating C++ templates over FFI is
    non-trivial (perhaps compile a C wrapper around needed parts).

- **Terminfo Updates and Custom Capabilities:** If we do use terminfo, we should
  stay aware of new capabilities. For example, a terminfo extension might exist
  for Kitty’s images (though currently those are usually detected by querying
  environment or using **DEC Private Mode queries** to see if the terminal
  responds as Kitty). We might maintain our own capability map: e.g., a function
  to detect “does terminal support Sixel?” by sending a Device Attributes (DA)
  request and checking response (modern xterm responds with a flag for sixel
  support). This kind of logic can be hidden behind a Capability struct. We
  might also integrate with **Terminfo database** for basic things like the
  correct sequences for F1–F12 keys or keypad keys, which can vary. Since Deno
  can run on many OSes, using the system’s terminfo via FFI (ncurses’s
  `tigetstr` etc.) is a safe route to cover obscure terminals.

- **Output Optimization:** The framework should minimize flicker and unnecessary
  writes. Techniques like **double-buffering** the screen in memory and
  **diffing** before writing have been used since the days of curses (curses
  uses “virtual screen” vs “physical screen” concept). Our framework can
  maintain a 2D buffer of the last output and only apply diffs on update. This
  is similar to React’s diff but at the character cell level. Notcurses
  internally does this kind of optimization as well. Additionally, certain
  terminal features like **Change Scroll Region (CSR)** and **alternate screen**
  can help optimize redrawing. Many TUIs use the alternate screen buffer (so
  that the regular scrollback is preserved and the UI occupies a separate
  buffer). We should do the same by default. For scrolling content, using
  terminal’s scroll regions or inserting lines can be more efficient than
  repainting everything – curses and others handle that via optimization
  algorithms. We may not need to implement all that if we lean on an existing
  lib for low-level drawing.

- **I/O Multiplexing:** Since we might have multiple input sources (keyboard,
  mouse, possibly network messages), we should set up an event loop that reads
  from stdin (which carries keyboard/mouse as escape sequences) without blocking
  other tasks. Deno’s async APIs or a small poll-thread via FFI could be used.
  Ensuring our framework plays well with other asynchronous operations (e.g. a
  web request happening in the background of the CLI) will be important for
  real-world use.

In summary, the I/O abstraction layer will hide differences between terminals
and provide a reliable canvas for our layout engine to draw on. Whether we build
it from scratch using terminfo or wrap an advanced library like Notcurses, it’s
crucial for stability and portability. Many existing libraries (list below) can
inform this layer’s design or be directly utilized via FFI, saving time and
giving us access to decades of optimizations in terminal handling.

## Comparison of Open Source Tools and Libraries

To ground our design in reality, let’s survey relevant open-source TUI libraries
across languages. Each offers ideas (and sometimes code) we can reuse via Deno
FFI or WASI. **Table 1** compares some notable projects:

| **Library**               | **Language** | **Paradigm & Layout**                                            | **Notable Features**                                                                                                                                                                                                                                                            |
| ------------------------- | ------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ink**                   | JS/Node      | Declarative (React JSX), Flexbox (Yoga)                          | Yoga WebAssembly for layout; component-based; hooks for input; familiar React model.                                                                                                                                                                                            |
| **Blessed**               | JS/Node      | Imperative/Declarative hybrid, Curses-like                       | Reimplements ncurses in JS (terminfo parsing); widget system (boxes, lists, etc.); supports mouse, colors, CSR optimizations.                                                                                                                                                   |
| **TerminalKit**           | JS/Node      | Imperative (chainable API)                                       | High-level API for styling text, handling input, progress bars; supports mouse and 24-bit color; less structured than Blessed.                                                                                                                                                  |
| **BubbleTea**             | Go           | Elm Architecture (Functional Update loop)                        | Model-View-Update pattern; message-driven; built-in commands (timers, keyboard); supports mouse, viewport scrolling, animations (via framerate loop).                                                                                                                           |
| **Ratatui (tui-rs)**      | Rust         | Declarative (widgets), Constraint layout                         | Uses cassowary solver for layout; multiple built-in widgets (tables, charts); theming; double-buffered rendering for performance.                                                                                                                                               |
| **Cursive**               | Rust         | Declarative (layout tree), Curses backend                        | Offers views (buttons, text areas) composed in a tree; multiple backends (ncurses, pancurses, termion); focus management and dialogs.                                                                                                                                           |
| **Notcurses**             | C            | Imperative (stateful context, “planes”)                          | “Blingful” features: truecolor, images (Sixel, Kitty), video playback, Unicode art; multi-threaded rendering; high performance aiming to max out modern terminals.                                                                                                              |
| **FTXUI**                 | C++          | Declarative (functional composition), Flexbox                    | Inspired by React; creates a hierarchy of Elements with styles; supports mouse & keyboard; UTF-8 aware; can compile to WASM for web use.                                                                                                                                        |
| **NCurses**               | C            | Imperative (stateful windows, pads)                              | The standard: handles keyboard, colors, resizing; relies on terminfo; many language bindings; limited to text (no inline images).                                                                                                                                               |
| **ImTUI**                 | C++          | Immediate Mode (Dear ImGui style)                                | Emulates ImGui calls to draw ASCII UI in 256-color text mode; great for game-like UIs where UI is rebuilt each frame.                                                                                                                                                           |
| **Textual**               | Python       | Declarative (OOP widgets + CSS styling)                          | Rich styling with CSS-like syntax; layout via CSS Flexbox; supports async tasks; can run in terminal or as web (textual-web) by abstracting render.                                                                                                                             |
| **Rich**                  | Python       | Imperative (print utilities)                                     | Not a full UI toolkit, but provides gorgeous text output (markdown, tables, progress bars) and even integrates with iTerm2/Kitty to display images.                                                                                                                             |
| **urwid**                 | Python       | Declarative (widget tree)                                        | Older but solid; supports a variety of layouts (packing, flow); themes; custom rendering of widgets; used for text-based UIs like wicd-curses.                                                                                                                                  |
| **Lanterna**              | Java         | Declarative (widgets, panels), event-driven                      | Similar to Swing but in console; supports multiple backends (including Swing itself for GUI fallback); offers text GUI components, dialogs, etc.                                                                                                                                |
| **gui.cs (Terminal.Gui)** | .NET         | Declarative (View classes, layout options)                       | Inspired by Turbo Vision; supports mouse, UTF-8; has a designer and can load UI from UIs (like XAML); works on Windows, Linux, macOS terminals.                                                                                                                                 |
| **tview**                 | Go           | Declarative (table, list, grid layouts)                          | High-level widgets for forms, tables, trees; built on top of **tcell** (advanced terminfo-based output); used for several TUIs in Go.                                                                                                                                           |
| **Charm** ecosystem       | Go           | Declarative (BubbleTea + Lip Gloss styling + Bubbles components) | The “Charmbracelet” libraries (BubbleTea for logic, **Lip Gloss** for styling, **Bubbles** for common UI components) provide a suite for building TUI apps with pretty output and managed state. They focus on beautiful text UI with an opinionated but flexible architecture. |
| **Consolonia**            | C#/.NET      | Declarative (XAML UI in console)                                 | Attempts to bring XAML (WPF-like) layouts to the terminal; uses .NET Console for output; demonstrates a design where UI is defined in markup and rendered in text.                                                                                                              |
| **Ashen**                 | Swift        | Declarative (Elm-inspired)                                       | Elm architecture applied in Swift for terminal apps; not widely known, but shows the Elm/functional pattern is portable.                                                                                                                                                        |

**Table 1:** Comparison of various terminal UI libraries, illustrating the
diversity of approaches and features. (Sources: official docs and READMEs)

As we see, some frameworks focus on **architecture** (Elm-style in BubbleTea,
ECS in Bevy’s UI), others on **layout capabilities** (Yoga in Ink, Cassowary in
Ratatui), and others on **output richness** (Notcurses, Rich). Our framework
aims to combine the best of these:

- From **Ink/FTXUI/Textual**: the idea of a component-based, declarative UI that
  is easy for developers to pick up (especially those coming from web
  development). But we will replace the Yoga/Flexbox constraint with something
  new (constraint solver or custom layouts) to avoid the limitations noted
  earlier.
- From **BubbleTea/Elm**: a robust state management loop. Embracing Elm’s update
  pattern can simplify complex interactive apps. We likely want to offer this
  pattern as a built-in option, because managing state and events is just as
  important as drawing text.
- From **Notcurses/Rich**: the cutting-edge terminal features like multimedia
  and truecolor. By planning to interface with these, our framework can display
  things that Ink/Yoga could never (images, graphics, smooth animations).
  Notcurses in particular could be an “engine” under the hood to draw our UI
  (which would save us from reimplementing Sixel/Kitty protocols ourselves).
  Rich and others also highlight the importance of **aesthetic** in CLI – users
  now expect spinner animations, emoji, and nice color themes. So a theming
  system (perhaps CSS-like or with preset “skins”) would be wise to include.
- From **tui-rs/Ratatui**: performance techniques and the use of solver for
  layout. Ratatui proves that even in a low-level language like Rust, you can
  successfully use a constraint solver each frame without issue, and it gives
  more flexible layouts. We can bring that concept to TS (via wasm or native).
- From **Textual/Consolonia**: separation of concerns (defining UI in a markup +
  having a render engine). Textual’s plan to target both terminal and web with
  the same code is forward-thinking. We can architect our framework’s core
  rendering logic to be independent of the actual output device, which opens the
  door to alternate frontends (web, desktop GUI) for the same TUI code.
  Essentially, the framework could act as a _renderer for an abstract UI tree_,
  which could be fed to different backends (one backend is our advanced terminal
  renderer, another could be an HTML/SVG generator for web). This overlaps with
  the earlier discussion on UI protocols and would make our project not just a
  terminal framework, but possibly a cross-platform text UI framework.

Given this survey, an engineer can pick and choose pieces to integrate. For
example, one might use **Deno FFI to call Rust crates** like `cassowary-rs` (for
constraints) or even compile **Taffy** to WebAssembly for a self-contained
layout solver. For rendering, linking to **Notcurses (C)** or using a **C++ WASM
build of FTXUI’s screen** are viable. Input handling could leverage
**libtickit** or **termkey** (C libraries that normalize input sequences) if not
implemented in JS.

The key is that thanks to WASI and FFI, we are not limited to pure TypeScript
for heavy lifting – we can integrate the “best in class” components from any
language ecosystem into our framework’s runtime. This hybrid approach (TS for
high-level orchestration, native code for low-level efficiency) will allow rapid
development of a framework that is both **expressive and performant**.

## Conclusion and Recommendations

Designing a new terminal interface framework from scratch is an ambitious
endeavor, but also a timely one. Terminals in 2025 are essentially rich canvases
waiting for frameworks to fully exploit them. By diverging from Ink’s Yoga-based
model, we free ourselves to explore **constraint solving for layout**,
**fine-grained reactive updates**, and **novel rendering techniques** that treat
the terminal as a capable UI platform in its own right.

To summarize the recommendations for this hypothetical framework:

- **Adopt a Modern Layout Engine:** Integrate a constraint-based or hybrid
  layout system (e.g. Cassowary via WASM, or a Rust layout library) to allow
  expressive, dynamic layouts beyond static flexbox. This will support
  responsive designs in terminal (adjusting to different sizes) more flexibly
  than Yoga. It also enables features like aligning and distributing space in
  ways Flexbox can’t easily do in a TUI (for instance, “make these two columns
  equal width” or “stick this footer to bottom”).

- **Use Reactive Rendering:** Ditch the virtual DOM diff in favor of reactive
  state updates or an Elm-style redraw on state change. The terminal’s limited
  size means we can compute diffs at the character level or component level
  efficiently. Embrace libraries like SolidJS’s approach of updating only what’s
  necessary – this will minimize output and prevent flicker. Possibly provide a
  JSX-like syntax that under the hood wires signals to components, so that
  updating a state automatically triggers a re-render of only the affected
  region.

- **Embrace Advanced Terminal Capabilities:** Make images, graphics, and mouse
  interactions first-class citizens. For example, include an **`Image()`
  widget** that automatically chooses the best protocol (Kitty, Sixel, iTerm)
  supported by the terminal to draw the image. Provide canvas-like abstractions
  (maybe a `<Canvas>` component that gives a drawing API for line art or even
  pixel-level drawing which internally uses braille or block elements). Support
  mouse events in all interactive components and possibly define new gestures
  (double-click, drag selection) at the framework level, translating low-level
  events into high-level actions.

- **Incorporate Unique Paradigms:** Build the framework core to be
  **extensible**. Perhaps internally use an ECS to manage all UI elements and
  their states, which would make adding systems (e.g. a system for blink
  animations, a system for network sync) easier down the line. At the API level,
  strongly consider offering the Elm Architecture pattern as it leads to clear
  and maintainable code for app developers. Also lay groundwork for multi-user
  or remote UI by designing the state and update mechanism in a way that can be
  externalized (e.g. all messages and state changes go through a single point
  that could be networked).

- **Leverage Deno’s FFI/WASI**: Don’t reinvent wheels that we can import. For
  example, use **Notcurses via FFI for rendering** to instantly get features
  like multimedia and performance optimizations (perhaps wrapping it in a more
  JS-friendly API). Use a Rust crate for parsing input sequences instead of
  writing a full parser in JS. By doing this, we stand on the shoulders of
  C/C++/Rust libraries that have thousands of hours of work behind them – yet
  our TS framework can orchestrate them to create something new and greater than
  the sum of parts.

- **Provide Rich Documentation and Defaults:** One advantage Ink had was
  leveraging developers’ knowledge of web CSS. In our framework, we might not
  have that 1-to-1 familiarity (unless we incorporate CSS-like styling). We
  should ensure the API is ergonomic (maybe provide a flex-like API on top of
  the new layout for those who want it, even if internally it doesn’t use Yoga).
  Include sensible default behaviors (like dynamic layout that just works for
  common cases, focus management for input widgets, etc.) so that a simple
  “Hello World” UI is trivial to create. At the same time, document how to use
  the advanced features (like enabling image support or customizing the layout
  solver constraints) with examples.

By synthesizing the **tools (layout engines, protocols, libraries)** and **ideas
(ECS, Elm, CRDT, reactive signals)** surveyed above, an engineer can build a
framework that truly moves the needle for terminal user interfaces. This new
framework would allow developers to create terminal apps that are as dynamic and
user-friendly as web or mobile apps, while still working over SSH and in a
text-only environment. The terminal has been a “lowest common denominator” for
decades; with a fresh approach, we can turn it into a **playground for
innovation** – where UIs are not limited to monospaced characters but can
include graphics, where multiple users can collaborate in the same TUI, and
where the full power of modern computing (from GPUs to distributed systems) is
harnessed to deliver rich interactions on the command line.

Ultimately, the success of such a framework will come from marrying the
**practical knowledge** of existing systems (so we don’t repeat their mistakes)
with a **vision for what’s next** in terminal technology. The research and
comparisons given here aim to provide that blend of wisdom and foresight –
empowering the engineer to build a next-generation Ink alternative that is truly
“bleeding-edge.”

**Sources:** The information above draws on multiple sources: Ink and Yoga’s
documentation, discussions of constraint-based layouts in Rust’s tui library,
capabilities of modern terminal protocols like Kitty’s graphics specs and Sixel
adoption, insights from game engine UI (Bevy), and experiences of various
open-source TUI toolkits including Blessed, Notcurses, FTXUI, and others as
cited throughout. These illustrate the state-of-the-art that our new framework
will build upon.
