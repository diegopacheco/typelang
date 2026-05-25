const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");

function runSource(source) {
  const file = path.join(os.tmpdir(), `typelang-${Date.now()}-${Math.random()}.tl`);
  fs.writeFileSync(file, source);
  try {
    return execFileSync("node", [path.join(root, "dist/main.js"), file], { encoding: "utf8" }).trim();
  } finally {
    fs.rmSync(file, { force: true });
  }
}

assert.strictEqual(runSource(`
val x = 2
val y = 3
print(x + y * 4)
`), "14");

assert.strictEqual(runSource(`
var x = 0
while (x < 3) {
  x = x + 1
}
print(x)
`), "3");

assert.strictEqual(runSource(`
def makeAdder(x) {
  def add(y) {
    return x + y
  }
  return add
}
val addTen = makeAdder(10)
print(addTen(7))
`), "17");

assert.strictEqual(runSource(`
if (true && !false) {
  print("ok")
} else {
  print("bad")
}
`), "ok");

assert.strictEqual(runSource(`
def fail() {
  print("bad")
  return true
}
if (false && fail()) {
  print("bad")
} else {
  print("ok")
}
`), "ok");

console.log("tests passed");
