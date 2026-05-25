# Typelang Design

Typelang is a small programming language implemented in TypeScript 6. The target is a working tree-walking interpreter with clear syntax, predictable runtime behavior, and a codebase that can grow into a compiler later.

## Goals

- Use TypeScript discriminated unions for AST nodes.
- Keep syntax close to Scala-style declarations while requiring braces for blocks.
- Avoid indentation-sensitive parsing.
- Support variables, functions, closures, control flow, and basic values.
- Keep the implementation small and easy to inspect.

## Non Goals

- Static type checking.
- Bytecode generation.
- Native code generation.
- Module loading.
- Package management.

## Syntax

Programs are statement lists. Newlines and semicolons separate statements. Blocks always use braces.

```scala
val base = 10
var total = 0

def add(x, y) {
  return x + y
}

while (total < 3) {
  total = total + 1
}

if (add(base, total) > 12) {
  print("large")
} else {
  print("small")
}
```

## Values

- Number
- String
- Boolean
- Nil
- Function

## Statements

- `val name = expression`
- `var name = expression`
- `def name(parameters) { body }`
- `if (condition) { body } else { body }`
- `while (condition) { body }`
- `return expression`
- expression statement

`val` bindings cannot be reassigned. `var` bindings can be reassigned.

## Expressions

Expressions use conventional precedence.

1. Calls
2. Unary `!` and `-`
3. `*`, `/`, `%`
4. `+`, `-`
5. `<`, `<=`, `>`, `>=`
6. `==`, `!=`
7. `&&`
8. `||`
9. Assignment

## Runtime

The runtime has lexical environments. A function captures the environment where it is declared, so closures work naturally.

Built-ins live in the root environment. The first built-in is `print(value)`.

## Errors

The parser reports line and column information. Runtime errors report the failing operation or missing binding.

## Project Shape

- `src/main.ts` has the lexer, parser, AST types, interpreter, CLI, and REPL.
- `programs/main.tl` is the default runnable program.
- `tests/run-tests.js` checks core behavior through the compiled CLI.
- `run.sh` builds and runs a program.
- `repl.sh` builds and starts the REPL.
- `release.sh` builds, tests, and creates an npm package archive.
