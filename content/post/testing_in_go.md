+++
title = "On Testing In Go"
date = "2024-11-07T20:28:47-05:00"
draft = true

+++

> Tests in Go are simply functions.

- Arrange
- Act
- Assert

## Different Kinds Of Tests

### Correctness

- unit tests
- component tests
- integration tests
- end-to-end tests

> There is no assertion API.

### Performance

- benchmarking tests

## Running Tests

Using the following structure:

```bash
$ tree
./
├── go.mod
├── main.go
├── README.md
└── user/
    ├── user.go
    └── user_test.go

2 directories, 5 files
```

The test(s) can be run with the following syntax:

```bash
$ go test ./user
$ go test example/user
$ go test ./...
$ go test ./... -v
?       example [no test files]
=== RUN   TestGet
--- PASS: TestGet (0.00s)
=== RUN   TestSlowOne
--- PASS: TestSlowOne (1.00s)
=== RUN   TestSlowTwo
--- PASS: TestSlowTwo (1.00s)
PASS
ok      example/user    2.003s
```

Or, in parallel:

```bash
go test ./... -v
?       example [no test files]
=== RUN   TestGet
--- PASS: TestGet (0.00s)
=== RUN   TestSlowOne
=== PAUSE TestSlowOne
=== RUN   TestSlowTwo
=== PAUSE TestSlowTwo
=== CONT  TestSlowOne
=== CONT  TestSlowTwo
--- PASS: TestSlowOne (1.00s)
--- PASS: TestSlowTwo (1.00s)
PASS
ok      example/user    1.002s
```

## Tests With Different Scopes

- white box tests
    + testing within the same package
    + can test public and private members
    + i.e., `package user`
- black box tests
    + testing outside the package
    + can only test public members
    + i.e., `package user_test`
    + this is the only exception to the rule that a directory can only have one `package` declaration
    + must import the package being tested

## Filtering Tests

- `t.Skip("skipped")`

Or:

- `go help testflag`
    + `go test ./... -v -run FUNCTION_NAME_OR_REGEXP

## Test Coverage

```
$ go test ./... -cover
        example         coverage: 0.0% of statements
ok      example/user    1.005s  coverage: 75.0% of statements
```

```bash
$ go test ./... -coverprofile cover.out && cat cover.out
        example         coverage: 0.0% of statements
ok      example/user    1.003s  coverage: 75.0% of statements
mode: set
example/main.go:5.13,7.2 1 0
example/user/user.go:12.48,13.29 1 1
example/user/user.go:13.29,14.20 1 1
example/user/user.go:14.20,16.4 1 1
example/user/user.go:18.2,18.73 1 0
```

## Generating Coverage Reports

```bash
$ go tool cover -func cover.out
example/main.go:5:              main            0.0%
example/user/user.go:12:        get             75.0%
total:                          (statements)    60.0%
```

```bash
$ go tool cover -html cover.out
```

This will open a tab in the default browser.

### Frequency Reports

```bash
$ go test ./... -coverprofile cover.out -covermode count
        example         coverage: 0.0% of statements
ok      example/user    1.004s  coverage: 75.0% of statements
```

Then run the `cover` tool again in `html` mode to generate another report in the default browser:

```bash
$ go tool cover -html cover.out
```

> Remember that profiling doesn't indicate the **quality** of the tests.

## Benchmark Tests

Benchmarking tests always run sequentially.

Benchmarking tests need to be opted-into because they are much slower than unit tests.

How many iterations to hit one second of execution time?

```
b.Log(b.N)
```

If you were to log value of `b.N`, you'll probably see that it's run several times.  This is the Go runtime trying to guess how many iterations are needed to hit one second of execution time.

```go
func BenchmarkFoo(b *testing.B) {
    // setup code
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        ...
    }
    b.StopTimer()
    // teardown code
}
```

Run all benchmark tests:

```bash
$ go run ./... -v -bench .
```

Run all benchmark tests with memory allocation information:

```bash
$ go run ./... -v -bench . -benchmem
```

This could indicate areas of code that may need to use caching.

Increase the runtime from the default one second:

```bash
$ go run ./... -v -bench . -benchmem -benchtime 1h30s
```

## Fuzz Tests

## References

- [Go testing package](https://pkg.go.dev/testing)

