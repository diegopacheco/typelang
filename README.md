# typelang

typelang is a small programming language implemented with TypeScript 6. It has Scala-like declarations, brace-based blocks, a lexer, parser, AST, and a tree-walking interpreter.

The current target is a compact working language, not a full static type checker or native compiler.

## Requirements

- Node.js
- npm

The project installs TypeScript 6 locally through npm.

## Run

```bash
./run.sh
```

That builds the interpreter and runs:

```bash
programs/main.tl
```

Run a custom file:

```bash
./run.sh path/to/file.tl
```

## REPL

```bash
./repl.sh
```

Exit with:

```text
:quit
```

or:

```text
:exit
```

## Release

```bash
./release.sh
```

This installs dependencies, builds the project, runs tests, and creates an npm package archive.

## Language

typelang uses newlines or semicolons to separate statements. Blocks always use braces.

```scala
val base = 10
var total = 0

def add(x, y) {
  return x + y
}

def makeCounter(start) {
  var current = start
  def next() {
    current = current + 1
    return current
  }
  return next
}

val counter = makeCounter(base)
total = add(counter(), counter())

if (total > 20) {
  print("large", total)
} else {
  print("small", total)
}
```

## Features

- `val` immutable bindings
- `var` mutable bindings
- `def` functions
- lexical closures
- `if` and `else`
- `while`
- `return`
- function calls
- `print`
- strings
- numbers
- booleans
- `nil`
- arithmetic operators
- comparison operators
- equality operators
- `&&`, `||`, and `!`

## Syntax

Bindings:

```scala
val name = "typelang"
var count = 0
count = count + 1
```

Functions:

```scala
def add(x, y) {
  return x + y
}
```

Closures:

```scala
def makeAdder(x) {
  def add(y) {
    return x + y
  }
  return add
}

val addTen = makeAdder(10)
print(addTen(7))
```

Control flow:

```scala
if (true) {
  print("yes")
} else {
  print("no")
}

var i = 0
while (i < 3) {
  print(i)
  i = i + 1
}
```

## Project Layout

- `src/main.ts` contains the lexer, parser, AST types, interpreter, CLI, and REPL.
- `docs/design.md` contains the design notes.
- `programs/main.tl` is the default program used by `run.sh`.
- `tests/run-tests.js` runs behavior checks through the compiled CLI.
- `run.sh` builds and runs a source file.
- `repl.sh` builds and starts the REPL.
- `release.sh` builds, tests, and packages the project.

## Development

Build:

```bash
npm run build
```

Test:

```bash
npm test
```

Run the compiled CLI:

```bash
node dist/main.js programs/main.tl
```

