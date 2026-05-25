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
