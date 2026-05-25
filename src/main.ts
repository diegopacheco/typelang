#!/usr/bin/env node
declare const require: any;
declare const module: any;
declare const process: any;

const fs = require("node:fs");
const readline = require("node:readline/promises");

type TokenKind =
  | "number"
  | "string"
  | "identifier"
  | "newline"
  | "eof"
  | "val"
  | "var"
  | "def"
  | "if"
  | "else"
  | "while"
  | "return"
  | "true"
  | "false"
  | "nil"
  | "("
  | ")"
  | "{"
  | "}"
  | ","
  | ";"
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "!"
  | "="
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "&&"
  | "||";

type Token = {
  kind: TokenKind;
  text: string;
  line: number;
  column: number;
  value?: number | string;
};

type Program = {
  kind: "program";
  body: Stmt[];
};

type Stmt =
  | { kind: "let"; name: string; mutable: boolean; value: Expr }
  | { kind: "function"; name: string; params: string[]; body: Stmt[] }
  | { kind: "if"; condition: Expr; thenBranch: Stmt[]; elseBranch: Stmt[] | null }
  | { kind: "while"; condition: Expr; body: Stmt[] }
  | { kind: "return"; value: Expr | null }
  | { kind: "expression"; value: Expr };

type Expr =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "nil" }
  | { kind: "variable"; name: string }
  | { kind: "assign"; name: string; value: Expr }
  | { kind: "unary"; op: "!" | "-"; right: Expr }
  | { kind: "binary"; left: Expr; op: string; right: Expr }
  | { kind: "call"; callee: Expr; args: Expr[] };

type Value = number | string | boolean | null | FnValue | BuiltinValue;

type FnValue = {
  kind: "function";
  name: string;
  params: string[];
  body: Stmt[];
  closure: Env;
};

type BuiltinValue = {
  kind: "builtin";
  name: string;
  call: (args: Value[]) => Value;
};

class TypelangError extends Error {}

class Lexer {
  private index = 0;
  private line = 1;
  private column = 1;
  private readonly tokens: Token[] = [];
  private readonly keywords = new Map<string, TokenKind>([
    ["val", "val"],
    ["var", "var"],
    ["def", "def"],
    ["if", "if"],
    ["else", "else"],
    ["while", "while"],
    ["return", "return"],
    ["true", "true"],
    ["false", "false"],
    ["nil", "nil"]
  ]);

  constructor(private readonly source: string) {}

  scan(): Token[] {
    while (!this.done()) {
      const c = this.peek();
      if (c === " " || c === "\t" || c === "\r") {
        this.advance();
      } else if (c === "\n") {
        this.add("newline", "\n");
        this.advanceLine();
      } else if (this.isDigit(c)) {
        this.number();
      } else if (this.isAlpha(c)) {
        this.identifier();
      } else if (c === "\"") {
        this.string();
      } else {
        this.symbol();
      }
    }
    this.tokens.push({ kind: "eof", text: "", line: this.line, column: this.column });
    return this.tokens;
  }

  private symbol(): void {
    const line = this.line;
    const column = this.column;
    const c = this.advance();
    const next = this.peek();
    const two = c + next;
    if (two === "==" || two === "!=" || two === "<=" || two === ">=" || two === "&&" || two === "||") {
      this.advance();
      this.tokens.push({ kind: two as TokenKind, text: two, line, column });
      return;
    }
    if ("(){};,+-*/%!=<>".includes(c)) {
      this.tokens.push({ kind: c as TokenKind, text: c, line, column });
      return;
    }
    throw this.error(`Unexpected character ${c}`, line, column);
  }

  private number(): void {
    const line = this.line;
    const column = this.column;
    let text = "";
    while (this.isDigit(this.peek())) {
      text += this.advance();
    }
    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      text += this.advance();
      while (this.isDigit(this.peek())) {
        text += this.advance();
      }
    }
    this.tokens.push({ kind: "number", text, line, column, value: Number(text) });
  }

  private identifier(): void {
    const line = this.line;
    const column = this.column;
    let text = "";
    while (this.isAlphaNumeric(this.peek())) {
      text += this.advance();
    }
    this.tokens.push({ kind: this.keywords.get(text) ?? "identifier", text, line, column });
  }

  private string(): void {
    const line = this.line;
    const column = this.column;
    this.advance();
    let text = "";
    while (!this.done() && this.peek() !== "\"") {
      const c = this.advance();
      if (c === "\\") {
        const escaped = this.advance();
        if (escaped === "n") text += "\n";
        else if (escaped === "t") text += "\t";
        else if (escaped === "\"") text += "\"";
        else if (escaped === "\\") text += "\\";
        else text += escaped;
      } else {
        text += c;
      }
    }
    if (this.done()) {
      throw this.error("Unterminated string", line, column);
    }
    this.advance();
    this.tokens.push({ kind: "string", text, line, column, value: text });
  }

  private add(kind: TokenKind, text: string): void {
    this.tokens.push({ kind, text, line: this.line, column: this.column });
  }

  private done(): boolean {
    return this.index >= this.source.length;
  }

  private peek(): string {
    return this.source[this.index] ?? "\0";
  }

  private peekNext(): string {
    return this.source[this.index + 1] ?? "\0";
  }

  private advance(): string {
    const c = this.source[this.index] ?? "\0";
    this.index += 1;
    this.column += 1;
    return c;
  }

  private advanceLine(): void {
    this.index += 1;
    this.line += 1;
    this.column = 1;
  }

  private isDigit(c: string): boolean {
    return c >= "0" && c <= "9";
  }

  private isAlpha(c: string): boolean {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private error(message: string, line: number, column: number): TypelangError {
    return new TypelangError(`${message} at ${line}:${column}`);
  }
}

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): Program {
    const body: Stmt[] = [];
    this.separators();
    while (!this.match("eof")) {
      body.push(this.statement());
      this.separators();
    }
    return { kind: "program", body };
  }

  private statement(): Stmt {
    if (this.match("val")) return this.binding(false);
    if (this.match("var")) return this.binding(true);
    if (this.match("def")) return this.functionStmt();
    if (this.match("if")) return this.ifStmt();
    if (this.match("while")) return this.whileStmt();
    if (this.match("return")) return this.returnStmt();
    return { kind: "expression", value: this.expression() };
  }

  private binding(mutable: boolean): Stmt {
    const name = this.consume("identifier", "Expected binding name").text;
    this.consume("=", "Expected = after binding name");
    return { kind: "let", name, mutable, value: this.expression() };
  }

  private functionStmt(): Stmt {
    const name = this.consume("identifier", "Expected function name").text;
    this.consume("(", "Expected ( after function name");
    const params: string[] = [];
    if (!this.check(")")) {
      do {
        params.push(this.consume("identifier", "Expected parameter name").text);
      } while (this.match(","));
    }
    this.consume(")", "Expected ) after parameters");
    return { kind: "function", name, params, body: this.block() };
  }

  private ifStmt(): Stmt {
    this.consume("(", "Expected ( after if");
    const condition = this.expression();
    this.consume(")", "Expected ) after if condition");
    const thenBranch = this.block();
    this.separators();
    const elseBranch = this.match("else") ? this.block() : null;
    return { kind: "if", condition, thenBranch, elseBranch };
  }

  private whileStmt(): Stmt {
    this.consume("(", "Expected ( after while");
    const condition = this.expression();
    this.consume(")", "Expected ) after while condition");
    return { kind: "while", condition, body: this.block() };
  }

  private returnStmt(): Stmt {
    if (this.check("newline") || this.check(";") || this.check("}") || this.check("eof")) {
      return { kind: "return", value: null };
    }
    return { kind: "return", value: this.expression() };
  }

  private block(): Stmt[] {
    this.consume("{", "Expected { before block");
    const body: Stmt[] = [];
    this.separators();
    while (!this.check("}") && !this.check("eof")) {
      body.push(this.statement());
      this.separators();
    }
    this.consume("}", "Expected } after block");
    return body;
  }

  private expression(): Expr {
    return this.assignment();
  }

  private assignment(): Expr {
    const expr = this.or();
    if (this.match("=")) {
      const value = this.assignment();
      if (expr.kind === "variable") {
        return { kind: "assign", name: expr.name, value };
      }
      throw this.tokenError(this.previous(), "Invalid assignment target");
    }
    return expr;
  }

  private or(): Expr {
    let expr = this.and();
    while (this.match("||")) {
      expr = { kind: "binary", left: expr, op: this.previous().kind, right: this.and() };
    }
    return expr;
  }

  private and(): Expr {
    let expr = this.equality();
    while (this.match("&&")) {
      expr = { kind: "binary", left: expr, op: this.previous().kind, right: this.equality() };
    }
    return expr;
  }

  private equality(): Expr {
    let expr = this.comparison();
    while (this.match("==") || this.match("!=")) {
      expr = { kind: "binary", left: expr, op: this.previous().kind, right: this.comparison() };
    }
    return expr;
  }

  private comparison(): Expr {
    let expr = this.term();
    while (this.match("<") || this.match("<=") || this.match(">") || this.match(">=")) {
      expr = { kind: "binary", left: expr, op: this.previous().kind, right: this.term() };
    }
    return expr;
  }

  private term(): Expr {
    let expr = this.factor();
    while (this.match("+") || this.match("-")) {
      expr = { kind: "binary", left: expr, op: this.previous().kind, right: this.factor() };
    }
    return expr;
  }

  private factor(): Expr {
    let expr = this.unary();
    while (this.match("*") || this.match("/") || this.match("%")) {
      expr = { kind: "binary", left: expr, op: this.previous().kind, right: this.unary() };
    }
    return expr;
  }

  private unary(): Expr {
    if (this.match("!") || this.match("-")) {
      return { kind: "unary", op: this.previous().kind as "!" | "-", right: this.unary() };
    }
    return this.call();
  }

  private call(): Expr {
    let expr = this.primary();
    while (this.match("(")) {
      const args: Expr[] = [];
      if (!this.check(")")) {
        do {
          args.push(this.expression());
        } while (this.match(","));
      }
      this.consume(")", "Expected ) after arguments");
      expr = { kind: "call", callee: expr, args };
    }
    return expr;
  }

  private primary(): Expr {
    if (this.match("number")) return { kind: "number", value: this.previous().value as number };
    if (this.match("string")) return { kind: "string", value: this.previous().value as string };
    if (this.match("true")) return { kind: "boolean", value: true };
    if (this.match("false")) return { kind: "boolean", value: false };
    if (this.match("nil")) return { kind: "nil" };
    if (this.match("identifier")) return { kind: "variable", name: this.previous().text };
    if (this.match("(")) {
      const expr = this.expression();
      this.consume(")", "Expected ) after expression");
      return expr;
    }
    throw this.tokenError(this.peek(), "Expected expression");
  }

  private separators(): void {
    while (this.match("newline") || this.match(";")) {}
  }

  private match(kind: TokenKind): boolean {
    if (!this.check(kind)) return false;
    this.index += 1;
    return true;
  }

  private consume(kind: TokenKind, message: string): Token {
    if (this.check(kind)) {
      this.index += 1;
      return this.previous();
    }
    throw this.tokenError(this.peek(), message);
  }

  private check(kind: TokenKind): boolean {
    return this.peek().kind === kind;
  }

  private peek(): Token {
    return this.tokens[this.index];
  }

  private previous(): Token {
    return this.tokens[this.index - 1];
  }

  private tokenError(token: Token, message: string): TypelangError {
    return new TypelangError(`${message} at ${token.line}:${token.column}`);
  }
}

class Env {
  private readonly values = new Map<string, { value: Value; mutable: boolean }>();

  constructor(private readonly parent: Env | null = null) {}

  define(name: string, value: Value, mutable: boolean): void {
    if (this.values.has(name)) {
      throw new TypelangError(`Binding already exists: ${name}`);
    }
    this.values.set(name, { value, mutable });
  }

  get(name: string): Value {
    const local = this.values.get(name);
    if (local) return local.value;
    if (this.parent) return this.parent.get(name);
    throw new TypelangError(`Unknown binding: ${name}`);
  }

  assign(name: string, value: Value): Value {
    const local = this.values.get(name);
    if (local) {
      if (!local.mutable) {
        throw new TypelangError(`Cannot assign val: ${name}`);
      }
      local.value = value;
      return value;
    }
    if (this.parent) return this.parent.assign(name, value);
    throw new TypelangError(`Unknown binding: ${name}`);
  }
}

class ReturnSignal {
  constructor(readonly value: Value) {}
}

class Interpreter {
  readonly globals = new Env();

  constructor(private readonly write: (text: string) => void = console.log) {
    this.globals.define("print", {
      kind: "builtin",
      name: "print",
      call: args => {
        this.write(args.map(valueText).join(" "));
        return null;
      }
    }, false);
  }

  run(program: Program, env: Env = this.globals): Value {
    let last: Value = null;
    try {
      for (const stmt of program.body) {
        last = this.execute(stmt, env);
      }
      return last;
    } catch (signal) {
      if (signal instanceof ReturnSignal) {
        throw new TypelangError("Return outside function");
      }
      throw signal;
    }
  }

  private execute(stmt: Stmt, env: Env): Value {
    switch (stmt.kind) {
      case "let": {
        const value = this.evaluate(stmt.value, env);
        env.define(stmt.name, value, stmt.mutable);
        return value;
      }
      case "function": {
        const fn: FnValue = { kind: "function", name: stmt.name, params: stmt.params, body: stmt.body, closure: env };
        env.define(stmt.name, fn, false);
        return fn;
      }
      case "if": {
        if (truthy(this.evaluate(stmt.condition, env))) return this.executeBlock(stmt.thenBranch, new Env(env));
        if (stmt.elseBranch) return this.executeBlock(stmt.elseBranch, new Env(env));
        return null;
      }
      case "while": {
        let last: Value = null;
        while (truthy(this.evaluate(stmt.condition, env))) {
          last = this.executeBlock(stmt.body, new Env(env));
        }
        return last;
      }
      case "return": {
        throw new ReturnSignal(stmt.value ? this.evaluate(stmt.value, env) : null);
      }
      case "expression":
        return this.evaluate(stmt.value, env);
    }
  }

  private executeBlock(body: Stmt[], env: Env): Value {
    let last: Value = null;
    for (const stmt of body) {
      last = this.execute(stmt, env);
    }
    return last;
  }

  private evaluate(expr: Expr, env: Env): Value {
    switch (expr.kind) {
      case "number":
      case "string":
      case "boolean":
        return expr.value;
      case "nil":
        return null;
      case "variable":
        return env.get(expr.name);
      case "assign":
        return env.assign(expr.name, this.evaluate(expr.value, env));
      case "unary":
        return this.unary(expr.op, this.evaluate(expr.right, env));
      case "binary": {
        const left = this.evaluate(expr.left, env);
        if (expr.op === "&&") {
          if (!truthy(left)) return false;
          return truthy(this.evaluate(expr.right, env));
        }
        if (expr.op === "||") {
          if (truthy(left)) return true;
          return truthy(this.evaluate(expr.right, env));
        }
        return this.binary(left, expr.op, this.evaluate(expr.right, env));
      }
      case "call":
        return this.call(this.evaluate(expr.callee, env), expr.args.map(arg => this.evaluate(arg, env)));
    }
  }

  private unary(op: string, right: Value): Value {
    if (op === "!") return !truthy(right);
    if (op === "-") return -numberValue(right, op);
    throw new TypelangError(`Unknown unary operator: ${op}`);
  }

  private binary(left: Value, op: string, right: Value): Value {
    if (op === "&&") return truthy(left) && truthy(right);
    if (op === "||") return truthy(left) || truthy(right);
    if (op === "==") return equals(left, right);
    if (op === "!=") return !equals(left, right);
    if (op === "+" && (typeof left === "string" || typeof right === "string")) return valueText(left) + valueText(right);
    if (op === "+") return numberValue(left, op) + numberValue(right, op);
    if (op === "-") return numberValue(left, op) - numberValue(right, op);
    if (op === "*") return numberValue(left, op) * numberValue(right, op);
    if (op === "/") return numberValue(left, op) / numberValue(right, op);
    if (op === "%") return numberValue(left, op) % numberValue(right, op);
    if (op === "<") return numberValue(left, op) < numberValue(right, op);
    if (op === "<=") return numberValue(left, op) <= numberValue(right, op);
    if (op === ">") return numberValue(left, op) > numberValue(right, op);
    if (op === ">=") return numberValue(left, op) >= numberValue(right, op);
    throw new TypelangError(`Unknown binary operator: ${op}`);
  }

  private call(callee: Value, args: Value[]): Value {
    if (isBuiltin(callee)) return callee.call(args);
    if (!isFunction(callee)) {
      throw new TypelangError("Can only call functions");
    }
    if (args.length !== callee.params.length) {
      throw new TypelangError(`${callee.name} expects ${callee.params.length} arguments but got ${args.length}`);
    }
    const env = new Env(callee.closure);
    for (let i = 0; i < callee.params.length; i += 1) {
      env.define(callee.params[i], args[i], false);
    }
    try {
      return this.executeBlock(callee.body, env);
    } catch (signal) {
      if (signal instanceof ReturnSignal) return signal.value;
      throw signal;
    }
  }
}

function parse(source: string): Program {
  return new Parser(new Lexer(source).scan()).parse();
}

function runSource(source: string, write?: (text: string) => void): Value {
  return new Interpreter(write).run(parse(source));
}

function truthy(value: Value): boolean {
  return value !== false && value !== null;
}

function numberValue(value: Value, op: string): number {
  if (typeof value === "number") return value;
  throw new TypelangError(`Operator ${op} requires numbers`);
}

function valueText(value: Value): string {
  if (value === null) return "nil";
  if (isFunction(value)) return `<function ${value.name}>`;
  if (isBuiltin(value)) return `<builtin ${value.name}>`;
  return String(value);
}

function isFunction(value: Value): value is FnValue {
  return typeof value === "object" && value !== null && (value as FnValue).kind === "function";
}

function isBuiltin(value: Value): value is BuiltinValue {
  return typeof value === "object" && value !== null && (value as BuiltinValue).kind === "builtin";
}

function equals(left: Value, right: Value): boolean {
  return left === right;
}

async function startRepl(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const interpreter = new Interpreter();
  while (true) {
    const line = await rl.question("typelang> ");
    if (line.trim() === ":quit" || line.trim() === ":exit") {
      rl.close();
      return;
    }
    if (line.trim().length === 0) continue;
    try {
      const value = interpreter.run(parse(line));
      if (value !== null) console.log(valueText(value));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] === "--repl") {
    await startRepl();
    return;
  }
  const file = args[0];
  if (!file) {
    console.error("Usage: typelang <file> or typelang --repl");
    process.exitCode = 1;
    return;
  }
  try {
    runSource(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (typeof module !== "undefined" && require.main === module) {
  main();
}

export { Interpreter, Lexer, Parser, TypelangError, parse, runSource };
