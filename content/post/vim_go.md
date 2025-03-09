+++
title = "On vim-go"
date = "2024-11-30T12:59:09-05:00"

+++

[`vim-go`] is a wonderful tool that makes working with Go tooling a breeze.  Though I've been a long time user, I only recently finished reading the entire [vim-go-tutorial], and I'd thought I'd capture some of the functionality that I have found either most useful or most used (well, both, actually).

---

- [`GoBuild`](#gobuild)
- [`GoBuildTags`](#gobuildtags)
- [`GoCoverage`](#gocoverage)
- [`GoDef`](#godef)
- [`GoDoc`](#godoc)
- [`GoFiles`](#gofiles)
- [`GoImpl`](#goimpl)
- [`GoImplements`](#goimplements)
- [`GoInfo`](#goinfo)
- [`GoMetaLinter`](#gometalinter)
- [`GoPlay`](#goplay)
- [`GoRename`](#gorename)
- [`GoRun`](#gorun)
- [`GoSameIds`](#gosameids)
- [`GoTest`](#gotest)
- [Snippets](#snippets)
- [Configs](#configs)
    + [`.vimrc`](#vimrc)
    + [`ftplugin/go.mod`](#ftplugingomod)
- [Summary](#summary)
- [References](#references)

---

## `GoBuild`

This does exactly what you think.  Simply call `:GoBuild`.  Under the covers, it does the following (from [the docs]):


- No binaries are created; you can call `:GoBuild` multiple times without polluting your workspace.
- It automatically cds into the source package's directory.
- It parses any errors and shows them inside a quickfix list.
- It automatically detects the GOPATH and modifies it if needed (detects projects such as `gb`, `Godeps`, etc..).
- Runs async if used within Vim 8.0.xxx or NeoVim.

The tutorial suggests to use a nice Vim function.  I've copied it to my [`vim.functions`](https://github.com/btoll/dotfiles/blob/master/vim/dot-vim.functions) file and have it mapped in my [`ftplugin/go.mod`](#ftplugingomod) file (see below):

```vim
function! Build_go_files()
    let l:file = expand('%')
    if l:file =~# '^\f\+_test\.go$'
        call go#test#Test(0, 1)
    elseif l:file =~# '^\f\+\.go$'
        call go#cmd#Build(0)
    endif
endfunction
```

Depending on the name of the file, this will either compile the test cases or build the program.

See [Build it](https://github.com/fatih/vim-go/wiki/Tutorial#build-it) in the [vim-go-tutorial].

## `GoBuildTags`

I've needed to use this when [`gopls`] has been unable to compile a Go file, usually a test suite, due to a build tag.

From [the docs]:

```vim
:GoBuildTags [tags]

    Changes the build tags for various commands. If you have any file that
    uses a custom build tag, such as `// +build integration`, this command
    can be used to pass it to all tools that accepts tags, such as gopls,
    go test, etc.

    The build tags is cleared (unset) if `""` is given. If no arguments are
    given it prints the current build tags.
```

To remedy this, here are several ways to pass the custom build tag through to the tools that accept tags:

```bash
$ vim -c ":GoBuildTags osde2e" managed_cluster_validating_webhooks_test.go
```

Or:

```bash
$ GOFLAGS=-tags=osde2e vim managed_cluster_validating_webhooks_test.go
```

Or, open the file as usual and enter a `vim-go` editor command:

```bash
$ vim managed_cluster_validating_webhooks_test.go
:GoBuildTags osde2e
```

Let's now take a look at using `gopls` directly and see how the presence of a build tag influences its behavior.

Suppose we wish to list all of the references for the symbol `newPrometheusRule` in the following file (note the line and column specifiers attached to the file name).  However, if you get the following error, it means that there could be a build tag/constraint that is preventing `gopls` from being able to compile the binary with the specified file included:

```bash
$ gopls references ./managed_cluster_validating_webhooks_test.go:653:21
gopls: no package metadata for file file:///home/btoll/projects/redhat/managed-cluster-validating-webhooks/test/e2e/managed_cluster_validating_webhooks_test.go
```

Let's take a peek at the file to confirm our suspicions:

```bash
$ head -5 managed_cluster_validating_webhooks_test.go
//go:build osde2e
// +build osde2e

package osde2etests

```

[Whoomp!  There it is.]

One way around this is to declare the build tag in the `GOFLAGS` environment variable:

```bash
$ GOFLAGS=-tags=osde2e gopls references --declaration ./managed_cluster_validating_webhooks_test.go:653:21
/home/btoll/projects/redhat/managed-cluster-validating-webhooks/test/e2e/managed_cluster_validating_webhooks_test.go:591:3-20
/home/btoll/projects/redhat/managed-cluster-validating-webhooks/test/e2e/managed_cluster_validating_webhooks_test.go:613:12-29
/home/btoll/projects/redhat/managed-cluster-validating-webhooks/test/e2e/managed_cluster_validating_webhooks_test.go:625:13-30
/home/btoll/projects/redhat/managed-cluster-validating-webhooks/test/e2e/managed_cluster_validating_webhooks_test.go:639:12-29
/home/btoll/projects/redhat/managed-cluster-validating-webhooks/test/e2e/managed_cluster_validating_webhooks_test.go:645:11-28
/home/btoll/projects/redhat/managed-cluster-validating-webhooks/test/e2e/managed_cluster_validating_webhooks_test.go:653:12-29
```

> The `--declaration` switch will include the declaration of the specified identifier in the results.

<!--
https://github.com/golang/tools/blob/master/gopls/doc/settings.md#buildflags-string
https://en.wikipedia.org/wiki/Language_Server_Protocol
https://stackoverflow.com/questions/78334335/gopls-stops-working-if-build-tags-are-added
-->

## `GoCoverage`

This calls `go test -coverprofile tempfile` under the hood.  It will visually change the syntax of the source code to reflect which code paths have coverage.  Very cool.

Call `:GoCoverageClear` to clear the syntax, or better yet, use `:GoCoverageToggle`.

Want to load the results in the browser?  Of course, you do.  Call `:GoCoverageBrowser` and `vim-go` will open a browser window the the results.

See [Cover it](https://github.com/fatih/vim-go/wiki/Tutorial#cover-it) in the [vim-go-tutorial].

## `GoDef`

Easily jump to declarations by putting the cursor over the symbol and calling `:GoDef` (and, use the shortcut `gd` or `Ctrl-]`).  This will create a stack that is unwound by the shortcut `Ctrl-t`.

Note that the stack consists only of the declarations that you've jumped to, **not** the other cursor positions that you've navigated to in the course of exploring the codebase.  So, when unwinding the stack with `Ctrl-t`, each item that's popped off the stack is a declaration that you've visited, with the interleaving cursor navigation positions ignored (unlike `Ctrl-o`, which will visit each cursor location - this is often not what you want).

Incidentally, call `:GoDefStack` to view the stack.

See [Go to definition](https://github.com/fatih/vim-go/wiki/Tutorial#go-to-definition) in the [vim-go-tutorial].

## `GoDoc`

Simply place the cursor over any identifier and call `:GoDoc`.  Any documentation for that particular symbol will open in a scratch window.

There's also a handy shortcut, the letter `K`.  This is overrides the normal shortcut which usually opens a `man` page (`C` programmers will be familiar with this).

See [Documentation lookup](https://github.com/fatih/vim-go/wiki/Tutorial#documentation-lookup) in the [vim-go-tutorial].

## `GoFiles`

To understand all of the files that make up a particular package, call `:GoFiles` in any file, and it will list all of the files that make up the package named in the `package` clause at the top.

Note that it does not include test files.

The result will look something like this:

```vim
['/home/btoll/projects/validator/validators/configmap.go', '/home/btoll/projects/validator/validators/deployment.go', '/home/btoll/projects/validator/validators/document.go', '/home/btoll/projects/validator/validators/ingress.go', '/home/btoll/projects/validator/validators/kubeclient.go', '/home/btoll/projects/validator/validators/service.go']
```

See [Dependencies and files](https://github.com/fatih/vim-go/wiki/Tutorial#dependencies-and-files) in the [vim-go-tutorial].

## `GoImpl`

`GoImpl` uses the tool [`impl`].

`:GoImpl` will dynamically add methods to a `struct` type that will satisfy a given `interface`.

For example:

```go
package main

type Animal interface {
	Talk(string)
	Walk() error
}

type A struct{}
```

Put the cursor on the `A` of the struct type and enter the following in `ed`:

```vim
:GoImpl Animal
```

This will create the following methods:

```go
func (a *A) Talk(_ string) {
	panic("not implemented") // TODO: Implement
}

func (a *A) Walk() error {
	panic("not implemented") // TODO: Implement
}
```

Or, put the cursor on the `A` and enter:

```vim
:GoImpl
```

Followed by:

```vim
vim-go: generating method stubs for interface: Animal
```

Lastly, you could put your cursor anywhere, it doesn't have to on top of the `A`:

```vim
:GoImpl a *A Animal
```

The results are all the same.

Note that it's possible to do this for any `interface` type, including ones from the standard library, third-party packages or your own code.

See [Method stubs implementing an interface](https://github.com/fatih/vim-go/wiki/Tutorial#method-stubs-implementing-an-interface) in the [vim-go-tutorial].

## `GoImplements`

This is one of my favorites, and I use it heavily.  Want to know which `interface`s type implements?  Wonder no more!

Using the example from [`GoImpl`](#goimpl), we can place the cursor over any `A` and type:

```vim
:GoImplements
```

The quickfix list will open with the following:

```vim
1   main.go|5 col 6| type Animal interface {
```

That was easy, and we already knew that.

Let's add the following methods:

```go
func (a *A) String() string {
	panic("string")
}

func (a *A) Write(b []byte) (int, error) {
	panic("write")
}
```

Now, if we place the cursor over any `A` and type `:GoImplements` we get:

```vim
1   /home/btoll/projects/go/interfaces/impl/main.go|5 col 6| type Animal interface {
  1 /usr/local/go/src/fmt/print.go|63 col 6| type Stringer interface {
  2 /usr/local/go/src/internal/bisect/bisect.go|473 col 6| type Writer interface {
  3 /usr/local/go/src/io/io.go|99 col 6| type Writer interface {
  4 /usr/local/go/src/runtime/error.go|210 col 6| type stringer interface {
```

That's pretty darn cool.

> Wondering about the odd numbering in my quickfix list?  That's the `relativenumber` setting (from `.vimrc`):
>
> ```vim
> " Set the number of lines to jump forwards or backwards relative to the current cursor position.
> set relativenumber
> ```

## `GoInfo`

This is great to quickly see the function signature (prototype).  Lots of times it is incredibly handy to get a quick snapshot of the inputs and outputs of a function or method.

For instance, if you're writing code that calls the `fmt.Fprintf` method, you can quickly see its signature by calling `:GoInfo` with the cursor over `Fprintf`:

```vim
vim-go: func Fprintf(w io.Writer, format string, a ...any) (n int, err error)
```

See [Identifier resolution](https://github.com/fatih/vim-go/wiki/Tutorial#identifier-resolution) in the [vim-go-tutorial].

## `GoMetaLinter`

The `GoMetaLinter` function calls the `gometalinter` program.  It is a tool that calls `go vet`, `golint` and `errcheck` by default.  In addition, it can be configured to run these checkers anytime a file is saved.

For example:

```vim
let g:go_metalinter_enabled = ['vet', 'golint', 'errcheck']
```

Moreover, the checkers that are automatically called when a file is saved can be different from those that are called when `:GoMetaLinter` is called explicitly.  This can be nice when a full run of the checkers isn't wanted anytime the file is saved.

Check this out:

```vim
let g:go_metalinter_autosave_enabled = ['vet', 'golint']
```

This says to call `vet` and `golint`, but not `errcheck`, when the file is saved (but run all three when it's called explicity, see the variable setting directly above).

See [Check it](https://github.com/fatih/vim-go/wiki/Tutorial#check-it) in the [vim-go-tutorial].

## `GoPlay`

The `GoPlay` command is great when you want to quickly share code on the Internet.  Open a file, and enter the following command anywhere in the file:

```vim
:GoPlay
```

This will open [the Go Playground] in a browser tab with your file as the contents.  It will also copy the URL to your clipboard.  This also works for ranges.

Weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

See [Share it](https://github.com/fatih/vim-go/wiki/Tutorial#share-it) in the [vim-go-tutorial].

## `GoRename`

Everyone knows that the compiler is your friend when refactoring.  `vim-go` also assists in this, and `GoRename` will rename all of the symbols in one fell swoop.

This is [AST]-aware.  That means that it will only rename symbols in the tree and not just same-named words.  Observe:

```go
package main

import "fmt"

type Server struct {
	name string
}

func main() {
	s := Server{name: "Alper"}
	fmt.Println(s.name) // print the server name
}

func name() string {
	return "Zeynep"
}
```

Now, change `name` to `bar` in the `Server` `struct`.  Put the cursor over either the `name` field in `Server` or over `name` in the line that defines the variable `s`:

```vim
:GoRename bar
```

```go
package main

import "fmt"

type Server struct {
	bar string
}

func main() {
	s := Server{bar: "Alper"}
	fmt.Println(s.bar) // print the server name
}

func name() string {
	return "Zeynep"
}
```

Note that it only changes the references for the `struct` and not the name of the `name` function nor the word `name` in the comment.

> This is taken directly from the [vim-go-tutorial] in the [Rename identifiers](https://github.com/fatih/vim-go/wiki/Tutorial#rename-identifiers) section.

## `GoRun`

To only run the current file, call `:GoRun %` (it calls `go run` under the hood).  To run the entire package, call `:GoRun`.

No more need to drop to the command line and call:

```bash
$ go run .
```

See [Run it](https://github.com/fatih/vim-go/wiki/Tutorial#run-it) in the [vim-go-tutorial].

## `GoSameIds`

Another handy tool is `GoSameIds` which allows you to quickly see all of the same-named identifiers.  I'll use it to see at a glance all of the `err` variables in a function, for example.  Just place the cursor over the identifier and call `:GoSameIds`.

Easy peasy.

See [Identifier highlighting](https://github.com/fatih/vim-go/wiki/Tutorial#identifier-highlighting) in the [vim-go-tutorial].

> Call `:GoSameIdsClear` or `:GoSameIdsToggle` to clear the highlighting.

## `GoTest`

This calls `go test` under the hood and can be called either from the test file itself or its brother (i.e., either from `main_test.go` or `main.go`).

Any errors will be listed in the quickfix list.

To only test a single function, place the cursor above the function in question and call `:GoTestFunc`.  This is useful for many different occasions, especially when running the entire test suite is time-consuming.

Finally, to make sure that the tests compile, simply call `:GoTestCompile`, and any errors will be in the quickfix list.  Importantly, it doesn't run the tests themselves.

See [Test it](https://github.com/fatih/vim-go/wiki/Tutorial#test-it) in the [vim-go-tutorial].

## Snippets

I'm not going to cover snippets here, other than to say that `vim-go` supports them.  I use [`Ultisnips`] (even though I tend not to use them), which is supported by `vim-go`, and it provides many [builtin examples] that are ready to use.

I have many [abbreviations] in my Vim config files that I use quite often, which are similar to snippets, so perhaps I'll become a huge fan of them and then subsequently expand this section.

See [Snippets](https://github.com/fatih/vim-go/wiki/Tutorial#snippets) in the [vim-go-tutorial].

## Configs

### `.vimrc`

This is a snippet of my [`.vim.plugins`](https://github.com/btoll/dotfiles/blob/master/vim/dot-vim.plugins) configuration, just one of the files that is sourced from my [`.vimrc`](https://github.com/btoll/dotfiles/blob/master/vim/dot-vimrc).

```vim
" vim: set ft=vim:

call plug#begin('~/.vim/plugged')

Plug 'fatih/vim-go', { 'do': ':GoInstallBinaries' }
"let g:go_auto_sameids = 1 " Highlight same identifiers in file.
let g:go_auto_type_info = 1 " Automatically show function signature of symbol under cursor.
"set updatetime=800 // Default time to show function signature in status line (800ms).
let g:go_decls_includes = 'func,type'
let g:go_def_mode = 'gopls'
let g:go_fmt_command = 'goimports'
let g:go_fmt_fail_silently = 1 " Don't show errors in quickfix window when file is saved (not working).
let g:go_highlight_types = 1
let g:go_highlight_fields = 1
let g:go_highlight_functions = 1
let g:go_highlight_methods = 1
let g:go_highlight_operators = 1
let g:go_highlight_extra_types = 1
let g:go_highlight_build_constraints = 1
let g:go_highlight_generate_tags = 1
let g:go_info_mode = 'gopls'
let g:go_list_type = 'quickfix' " ONLY have quickfix lists (no location lists).
let g:go_metalinter_autosave = 1 " Calls `GoMetaLinter` when the file is saved.
let g:go_metalinter_autosave_enabled = ['vet', 'golint'] " Don't call the whole list when saving to make it faster.
let g:go_metalinter_enabled = ['vet', 'golint', 'errcheck']
let g:go_metalinter_deadline = '5s'
"let g:go_play_browser_command = 'chrome' " When xdg-open misdetecting the browser.
let g:go_play_open_browser = 1
let g:go_test_timeout = '10s'
let g:go_textobj_include_function_doc = 1
let g:go_version_warning = 0

call plug#end()

```

If you are curious as to why some of my dotfiles are prefaced with `dot-`, see the [`stow`] package.  I use it to install all of my dotfiles.

### `ftplugin/go.mod`

Here is a snippet of my [`ftplugin/go.vim`](https://github.com/btoll/dotfiles/blob/master/vim/ftplugin/go.vim) configuration.  I've only included the bits relevant to `vim-go`:

```vim
nnoremap <leader>b :<C-u>call Build_go_files()<cr>
nnoremap <Leader>co <Plug>(go-coverage-toggle)
nnoremap <Leader>cob <Plug>(go-coverage-browser)
nnoremap <Leader>i <Plug>(go-info)
nnoremap <leader>r :!clear<cr><Plug>(go-run)
nnoremap <leader>t <Plug>(go-test)
nnoremap <leader>tc <Plug>(go-test-compile) " Compiles but does not test!
nnoremap <leader>tf <Plug>(go-test-func) " Only test the function under the cursor.
```

## Summary

There are some commands that I haven't covered, such as `GoImports`, `GoInstallBinaries`, `GoLint`, et al.  The reason for this is because they are called automatically by variable settings that are defined in my configuration (see the [`.vimrc`](#vimrc) snippet above).

Just set it and forget it, my child.

## References

- [`vim-go`]
- [vim-go-tutorial]
- [the Go Playground]
- [On Getting Started with Go](/2022/08/05/on-getting-started-with-go/)
- [`motion`](https://github.com/fatih/motion?ref=arslan.io)
- [vim-go: text function selection objects](https://www.youtube.com/watch?v=65bZDwyh2m0)

[`vim-go`]: https://github.com/fatih/vim-go
[`impl`]: https://github.com/josharian/impl
[the Go Playground]: https://go.dev/play/
[AST]: https://en.wikipedia.org/wiki/Abstract_syntax_tree
[vim-go-tutorial]: https://github.com/fatih/vim-go/wiki/Tutorial
[`stow`]: https://www.gnu.org/software/stow/
[`Ultisnips`]: https://github.com/SirVer/ultisnips
[builtin examples]: https://github.com/fatih/vim-go/blob/master/gosnippets/UltiSnips/go.snippets
[abbreviations]: https://vim.fandom.com/wiki/Using_abbreviations
[the docs]: https://github.com/fatih/vim-go/blob/master/doc/vim-go.txt
[`gopls`]: https://pkg.go.dev/golang.org/x/tools/gopls
[Whoomp!  There it is.]: https://www.youtube.com/watch?v=ffCEr327W44

