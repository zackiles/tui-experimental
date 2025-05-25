## Basic Usage

```ts
const dylib = Deno.dlopen("libexample.so", {
  add: { parameters: ["i32", "i32"], result: "i32" }
})

console.log(dylib.symbols.add(5, 3)) // 8

dylib.close()
```

---

## Unsafe Pointers

```ts
const buf = new Uint8Array([104, 101, 108, 108, 111])
const ptr = Deno.UnsafePointer.of(buf)
const view = new Deno.UnsafePointerView(ptr!)

console.log(view.getUint8Array(0, 5)) // Uint8Array [104, 101, 108, 108, 111]
console.log(view.getCString())        // "hello"
```

---

## Callbacks

```ts
const lib = Deno.dlopen("./callback.so", {
  set_status_callback: { parameters: ["function"], result: "void" },
  start_long_operation: { parameters: [], result: "void" }
} as const)

const callback = new Deno.UnsafeCallback({
  parameters: ["u8"],
  result: "void"
}, (status: number) => {
  console.log(`Status: ${status}`)
})

lib.symbols.set_status_callback(callback.pointer)
lib.symbols.start_long_operation()
```

---

## Non-blocking Functions

```ts
const lib = Deno.dlopen("./sleep.so", {
  sleep: {
    parameters: ["usize"],
    result: "void",
    nonblocking: true
  }
} as const)

lib.symbols.sleep(1000).then(() => console.log("After"))
console.log("Before")
```

---

## Supported Types

| FFI Type            | JS Type      | C Equivalent |          |
| ------------------- | ------------ | ------------ | -------- |
| `i8`                | `number`     | `int8_t`     |          |
| `u8`                | `number`     | `uint8_t`    |          |
| `i16`               | `number`     | `int16_t`    |          |
| `u16`               | `number`     | `uint16_t`   |          |
| `i32`               | `number`     | `int32_t`    |          |
| `u32`               | `number`     | `uint32_t`   |          |
| `i64`               | `bigint`     | `int64_t`    |          |
| `u64`               | `bigint`     | `uint64_t`   |          |
| `isize`             | `bigint`     | `intptr_t`   |          |
| `usize`             | `bigint`     | `uintptr_t`  |          |
| `f32`               | `number`     | `float`      |          |
| `f64`               | `number`     | `double`     |          |
| `void`              | `undefined`  | `void`       |          |
| `pointer`           | \`null       | {}\`         | `void *` |
| `buffer`            | `TypedArray` | `uint8_t *`  |          |
| `function`          | `Function`   | `void (*)()` |          |
| `{ struct: [...] }` | `TypedArray` | `struct`     |          |
