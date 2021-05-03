+++
title = "On Enabling Bash Completion for Aliases"
date = "2021-05-01T12:14:17-04:00"

+++

[Bash completion] is pretty sweet.  Unfortunately, one can't get that same sweetness when creating an [alias].

Why, and what to do about it?

To demonstrate the problem, I added an alias for [`kubectl`] simply called [`k`]:

```
$ alias k
alias k='kubectl'
```

I then immediately tried to use it, convinced of my command-line efficiency and cleverness:

```
$ k [TAB] [TAB]
cm/         deployment/ po/         pv/         pvc/        rs/         svc/
```

Um, [say what]?  Why did it list the contents of the current working directory and not the `kubectl` subcommands (by the way, this is the default behavior)?

It's because the Bash [`complete`] builtin isn't aware of the alias!

So, why does the completion work for the `kubectl` command?  Because the `complete` program **is** aware of the `kubectl` command!

```
$ complete | ag kubectl
complete -o default -F __start_kubectl kubectl
```

Now that we know what needs to be done, let's register the `k` alias with `complete`, referencing the same Bash function as the `kubectl` function!

```
$ complete -F __start_kubectl k
$
$ complete | ag kubectl
complete -F __start_kubectl k
complete -o default -F __start_kubectl kubectl
```

As you can see above, `complete` is now aware of the `k` alias!

Let's see what happens now with tab completion:

```
$ k [TAB] [TAB]
annotate       attach         cluster-info   cp             describe       exec           help           options        proxy          scale          uncordon
api-resources  auth           completion     create         diff           explain        kustomize      patch          replace        set            version
api-versions   autoscale      config         debug          drain          expose         label          plugin         rollout        taint          wait
apply          certificate    cordon         delete         edit           get            logs           port-forward   run            top
```
And now it works!  Weeeeeeeeeeeeeeeeeeeeeeeeeeee!!!

---

So, this is great, but it was really bothering me that the provenance of the `__start_kubectl` function wasn't readily apparent.  Where did it come from?

This wasn't the easiest question to answer, because it turns out that this is an auto-generated function that isn't even from the `kubectl` project's source code.

You can see the `__start_kubectl` function when viewing the generated full completion file and grepping:

```
$ kubectl completion bash | ag "__start_kubectl"
__start_kubectl()
    complete -o default -F __start_kubectl kubectl
    complete -o default -o nospace -F __start_kubectl kubectl
```

And here is its function definition:

```
$ declare -f __start_kubectl
__start_kubectl ()
{
    local cur prev words cword;
    declare -A flaghash 2> /dev/null || :;
    declare -A aliashash 2> /dev/null || :;
    if declare -F _init_completion > /dev/null 2>&1; then
        _init_completion -s || return;
    else
        __kubectl_init_completion -n "=" || return;
    fi;
    local c=0;
    local flags=();
    local two_word_flags=();
    local local_nonpersistent_flags=();
    local flags_with_completion=();
    local flags_completion=();
    local commands=("kubectl");
    local must_have_one_flag=();
    local must_have_one_noun=();
    local has_completion_function;
    local last_command;
    local nouns=();
    __kubectl_handle_word
}
```


However, there's nothing in the `kubectl` project's source code that matches that text or [looks like] it [could have generated] it.

Yet still I pressed on, continuing the search like Sherlock fucking Holmes.

I next thought to check out the [`cobra`] Golang project, which tons of Golang projects use.  And...[that's a bingo]!

To understand the birthplace of the `__start_kubectl` function, check out the [`GenBashCompletion`] method in the `cobra` project's source code to see how the `__start_kubectl` Bash function is auto-generated and appended to the file that is sourced to enable Bash completion in `kubectl`.

Sometimes, as seen here, the project is nice and provides the hooks needed to install Bash completion of their assets.  Let's look give a big hurrah to all the kind contributors at [the `kubernetes` project] who have given us the tools to get all nice and setup in our own little dev environment.

# Conclusion

There is a lot more to the Bash builtins that assist with Bash completion than what I've presented here.  My goal was to do a quick post on a specific matter, and so it goes.

Also, what's up with all the exclamation points!

# References

- [The Silver Searcher](https://github.com/ggreer/the_silver_searcher)

[Bash completion]: https://www.gnu.org/software/bash/manual/html_node/Programmable-Completion.html
[alias]: https://www.gnu.org/software/bash/manual/html_node/Aliases.html
[`kubectl`]: https://kubernetes.io/docs/reference/kubectl/overview/
[`k`]: https://kubernetes.io/docs/reference/kubectl/cheatsheet/#bash
[say what]: https://www.youtube.com/watch?v=veCodY5YuYY
[`complete`]: https://www.gnu.org/software/bash/manual/html_node/Programmable-Completion-Builtins.html
[looks like]: https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/cmd.go
[could have generated]: https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/completion/completion.go
[`cobra`]: https://github.com/spf13/cobra
[that's a bingo]: https://www.youtube.com/watch?v=Ugpg8XruhVk
[`GenBashCompletion`]: https://github.com/spf13/cobra/blob/master/bash_completions.go
[the `kubernetes` project]: https://github.com/orgs/kubernetes/people

