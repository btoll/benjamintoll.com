+++
title = "On Remote Debugging A Pod With Delve"
date = "2026-06-20T15:31:03-04:00"

+++

- [Introduction](#introduction)
- [Local Debugging](#local-debugging)
    + [`dlv exec`](#dlv-debug)
    + [`dlv attach`](#dlv-debug)
- [Remote Debugging](#remote-debugging)
    + [Assembling The Parts](#assembling-the-parts)
- [Summary](#summary)
- [References](#references)

## Introduction

Hello, friends.  Also, salute, bitter enemies.

Today, we're talk about using the Delve debugger to debug a remote pod.  Are you using Kubernetes?  Open Shift?  Something else?  It doesn't matter, homeslice, because what I'm describing today should be applicable to any container orchestration tool.

I'm going to simulate a real situation I was faced with at a past job, and I felt it would be helpful and illuminative to describe the issue and how it was debugged.  This kind of remote debugging is something that I'm sure is quite common, and what I will outline is just one way to do it, but that is beside the point.  The importance of this is describing why this is important, because it gives visibility and exposure into how to gain access and debug something that is not local on your workstation.  Without these kinds of processes, fixing a bug is just guesswork.  And we want to remove the guesswork and ambiguity and focus on core issues that are well understood.

The victim will be my [`go-simple-chat`] program, which is a multi-threaded chat messaging program that allow any number of clients connect to a central server that manages all of the connections.  This means that there needs to be two open ports that will be port forwarded, but for your own example, it could be just one.

Let's get started.  We'll begin with local debugging and ramp up to remote debugging.

## Local Debugging

Now, let's say that we need to debug this program.  I know, since I programmed it, it's hard to imagine that there would be anything wrong with it, but let's pretend like we did when we were children.

There are two ways to debug a multi-threaded client/server paradigm program.

### `dlv-exec`

Have Delve start the program as a child process:

```bash
$ dlv exec ./go-simple-chat
Type 'help' for list of commands.
(dlv) funcs main
main.(*Client).Broadcast
main.(*Client).Listen
main.(*Client).Start
main.(*Client).Start.gowrap1
main.(*Client).Start.gowrap2
main.(*Client).closeChannel
main.(*Client).closeChannel.func1
main.NewChat
main.NewClient
main.deregister
main.handleNewConnection
main.init
main.main
main.main.func1
main.main.func2
main.main.func2.gowrap1
main.register
main.shutdown
net.absDomainName
net.isDomainName
runtime.main
runtime.main.func1
runtime.main.func2
type:.eq.main.ChatMessage
type:.eq.main.Client
(dlv) b main.handleNewConnection
Breakpoint 1 set at 0x4f68b3 for main.handleNewConnection() ./main.go:43
(dlv) c
Simple chat server started and listening on :9999
> [Breakpoint 1] main.handleNewConnection() ./main.go:43 (hits goroutine(12):1 total:1) (PC: 0x4f68b3)
Warning: debugging optimized function
Warning: listing may not match stale executable
    38:         return &Chat{
    39:                 c:         make(ChatRoom),
    40:                 broadcast: make(chan ChatMessage, broadcastBuffer),
    41:                 mu:        &sync.Mutex{},
    42:         }
=>  43: }
    44:
    45: func handleNewConnection(ctx context.Context, conn net.Conn) {
    46:         _, err := conn.Write([]byte("What's your name?: "))
    47:         if err != nil {
    48:                 fmt.Printf("err=%+v\n", err)
(dlv)
```

The key here is to get past the part of the program that binds to the port so that clients can connect to it.  That is why I listed all of the functions in the `main` package and selected one (`main.handleNewConnection`) that was past the point of binding and into the infinite loop where client connections are handled.

Then, open one or more terminals and start connecting clients.  In the output above, you can see that the breakpoint was hit when I did just that.

### `dlv-attach`

Attach Delve to an already-running program.

```bash
$ ps aux | ag [s]imple-chat
btoll     701153  0.0  0.0 1746624 11760 pts/4   Sl+  14:11   0:00 ./go-simple-chat
```

```bash
$ dlv attach 701153
Type 'help' for list of commands.
(dlv) b main.NewClient
Breakpoint 1 set at 0x4f6d37 for main.handleNewConnection() ./client.go:23
(dlv)
```

When running without debugging (i.e., not having Delve run the program), we can see that the state is `Sl+`, which means that the program:

- `S` - interruptible sleep (waiting for an event to complete)
- `l` - is multi-threaded (using CLONE_THREAD, like NPTL pthreads do)
- `+` - is in the foreground process group

As opposed to using Delve to launch the program:

```bash
$ ps aux | ag [s]imple-chat
btoll     724644  4.0  0.2 6497756 35852 pts/4   Sl+  14:47   0:00 dlv exec ./go-simple-chat
btoll     724652  0.0  0.0   2932   200 pts/4    t    14:47   0:00 /home/btoll/projects/go-simple-chat/go-simple-chat
```

Here, we can see that `dlv` has the same process state codes as when the program is run directly.  The difference is the process state of the `go-simple-chat` program itself, which was spawned as a child process of `dlv`:

- `t` - stopped by debugger during the tracing

You can see that `go-simple-chat` is a child of `dlv` by using [`pstree`] with the PID of `dlv` (taken from the previous command output):

```bash
$ pstree -p 724644
dlv(724644)─┬─dlv(724651)─┬─{dlv}(724654)
            │             ├─{dlv}(724655)
            │             ├─{dlv}(724656)
            │             ├─{dlv}(724657)
            │             └─{dlv}(724658)
            ├─go-simple-chat(724652)
            ├─{dlv}(724645)
            ├─{dlv}(724646)
            ├─{dlv}(724647)
            ├─{dlv}(724648)
            ├─{dlv}(724649)
            ├─{dlv}(724653)
            ├─{dlv}(724659)
            ├─{dlv}(724660)
            ├─{dlv}(724661)
            ├─{dlv}(724662)
            ├─{dlv}(724663)
            ├─{dlv}(724664)
            └─{dlv}(724665)
```

> All process state code definitions are taken directly from the [`ps` man page](https://www.man7.org/linux/man-pages/man1/ps.1.html#PROCESS_STATE_CODES).

Let's run it in a container:

```bash
$ podman run --rm -p 9999:9999 btoll/go-simple-chat:latest
```

That's really nifty.  But, how do we debug when the programs that we're interested in are running in a completely different network?  How do we gain the visibility we need so we're not guessing as to the root cause of the issue?

In my experience, this has occurred when I've been working with a container orchestration tool like [Kubernetes] or [OpenShift].

To have full control and to avoid any potential side effects (and to avoid giving any money to grotesque humans like Jeff Bezos), it's optimal to spin up a cluster locally.  However, frequently there are impenetrable layers of infrastructure and code to comb through before the call can even be made that it's feasible.

The next best thing is to create a cluster in a testing environment, usually in the cloud.  I've debugged pods remotely that have been in OpenShift, EKS and on-premise clusters.

## Remote Debugging

For doing this on-prem, as the cool kids say, or just locally, as normal people do, we'll use a lightweight container orchestrator and a simple [deployment].

### Assembling The Parts

Or, as the say in Boston, assembling the pahts.

What do we need to assemble to have passable replicated system on our local system?  Here they are:

1. Container orchestration.
    - [minikube]

1. Deployment

    `deployment.yaml`

    ```yaml
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: go-simple-chat
      namespace: default
    spec:
      replicas: 3
      selector:
        matchLabels:
          app: go-simple-chat
      template:
        metadata:
          labels:
            app: go-simple-chat
        spec:
          containers:
          - name: go-simple-chat
            image: btoll/go-simple-chat-debug:latest
            imagePullPolicy: Always
            ports:
            - containerPort: 9999
              name: chat
            - containerPort: 2345
              name: debug
            resources:
              requests:
                memory: 64Mi
                cpu: 250m
              limits:
                memory: 128Mi
                cpu: 500m
    ---
    apiVersion: v1
    kind: Service
    metadata:
      name: go-simple-chat
      namespace: default
    spec:
      type: ClusterIP
      selector:
        app: go-simple-chat
      ports:
      - port: 9999
        targetPort: 9999
        protocol: TCP
        name: chat
      - port: 2345
        targetPort: 2345
        protocol: TCP
        name: debug
    ```

    The most important bits about this deployment are the defined ports.  Port 9999 is for the chat program, and port 2345 is for Delve.  They will both be [port forwarded] to the local network.

1. The debug container image.

    The original `Dockerfile` for the chat program needs to have debug information added to it.  I'm showing it here to compare it with what needs to be done to prepare it for our debugging session.

    `Dockerfile`

    ```dockerfile
    FROM golang:1.25.11-trixie AS builder

    WORKDIR /app
    COPY go.mod main.go client.go ./
    RUN CGO_ENABLED=0 GOOS=linux go build -o go-simple-chat

    FROM scratch
    COPY --from=builder /app/go-simple-chat /
    EXPOSE 9999

    ENTRYPOINT ["/go-simple-chat"]

    ```

    The debug Dockerfile installs the Delve debugger as well as compiles `go-simple-chat` with inlining disabled and the symbol table intact.

    `Dockerfile.debug`

    ```dockerfile
    FROM golang:1.25.11-trixie AS builder

    WORKDIR /app
    COPY go.mod main.go client.go ./
    RUN go install github.com/go-delve/delve/cmd/dlv@latest && \
        CGO_ENABLED=0 GOOS=linux go build -gcflags="all=-N -l" -o go-simple-chat

    FROM golang:1.25.11-trixie
    WORKDIR /app
    COPY --from=builder /go/bin/dlv /dlv
    COPY --from=builder /app/main.go /app/client.go ./
    COPY --from=builder /app/go-simple-chat /
    EXPOSE 9999 2345

    ENTRYPOINT ["/dlv", "exec", "/go-simple-chat", "--headless", "--listen=0.0.0.0:2345", "--api-version=2"]

    ```

    In addition, it will start Delve (rather than the `go-simple-chat` program), listening on port 2345 on all interfaces.  Also, not that the source files (`main.go`, `client.go`) are copied to the final stage so that the Delve debugger can source them.

1. [Delve] debugger.

---

Let's download and start [minikube]:

```bash
$ curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube_latest_amd64.deb
$ sudo dpkg -i minikube_latest_amd64.deb
$ MINIKUBE_ROOTLESS=false minikube start --driver=docker
```

Apply the deployment:

```bash
$ kubectl apply -f deployment.yaml
deployment.apps/go-simple-chat created
service/go-simple-chat created
$ kubectl get all
NAME                                  READY   STATUS    RESTARTS   AGE
pod/go-simple-chat-76f8dc7585-9p4zl   1/1     Running   0          2m38s
pod/go-simple-chat-76f8dc7585-fw9ps   1/1     Running   0          2m38s
pod/go-simple-chat-76f8dc7585-hjwf5   1/1     Running   0          2m38s

NAME                     TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)             AGE
service/go-simple-chat   ClusterIP   10.97.190.61   <none>        9999/TCP,2345/TCP   2m38s
service/kubernetes       ClusterIP   10.96.0.1      <none>        443/TCP             43h

NAME                             READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/go-simple-chat   3/3     3            3           2m38s

NAME                                        DESIRED   CURRENT   READY   AGE
replicaset.apps/go-simple-chat-76f8dc7585   3         3         3       2m38s
```

And, here are the open ports that the service is listening on:

```bash
$ kubectl get svc go-simple-chat -ojsonpath="{.spec.ports[*].port}"
9999 2345
```

To debug, first enable port forwarding and bind the remote port 2345 to the local network:
```bash
$ kubectl port-forward svc/go-simple-chat 2345:2345
Forwarding from 127.0.0.1:2345 -> 2345
Forwarding from [::1]:2345 -> 2345
```

Then, in another terminal, connect to `localhost` on that port.  You should be dropped into a `dlv` console, at which point you should map the location of the source files `main.go` and `client.go` in the remote container to their location on your local machine so Delve has access to them (unless they're in the same absolute path in both locations).  Then, set your breakpoint.  Here, it's in the `main.handleNewConnection` function, but do what you want, I'm not the boss of you:

```bash
$ dlv connect 127.0.0.1:2345
Type 'help' for list of commands.
(dlv) config substitute-path /app /home/btoll/projects/go-simple-chat
(dlv) b main.handleNewConnection
Breakpoint 1 set at 0x7aa516 for main.handleNewConnection() ./main.go:45
```

Delve has as created the `go-simple-chat` as a child process, and the stage has been set for any number of clients to be connected to the program and then controlled by Delve.  Here we are port forwarding 9999 to `localhost` and then connecting a client.  This can be done in two different terminals, or just one by sending the port forwarding command to the background:

```bash
$ kubectl port-forward svc/go-simple-chat 9999:9999
Forwarding from 127.0.0.1:9999 -> 9999
Forwarding from [::1]:9999 -> 9999
Handling connection for 9999
```


```bash
$ nc localhost 9999
```

> Here, we're opening another terminal and connect using [`netcat`], but you can just as easily use another client liks [`telnet`].  The program doesn't have its own programmed client.

Depending where you set your breakpoint, the program may block until you advance it, as it did just above when using `netcat` to connect to the server.  In the other terminal pane (if you're using a terminal multiplexer like [`screen`] or [`tmux`], which, of course you are), you'll see that the breakpoint has been hit and is waiting for your engagement:

```bash
$ dlv connect 127.0.0.1:2345
Type 'help' for list of commands.
(dlv) config substitute-path /app /home/btoll/projects/go-simple-chat
(dlv) b main.handleNewConnection
Breakpoint 1 set at 0x7aa516 for main.handleNewConnection() ./main.go:45
(dlv) c
> [Breakpoint 1] main.handleNewConnection() ./main.go:45 (hits goroutine(4):1 total:1) (PC: 0x7aa516)
    40:                 broadcast: make(chan ChatMessage, broadcastBuffer),
    41:                 mu:        &sync.Mutex{},
    42:         }
    43: }
    44:
=>  45: func handleNewConnection(ctx context.Context, conn net.Conn) {
    46:         _, err := conn.Write([]byte("What's your name?: "))
    47:         if err != nil {
    48:                 fmt.Printf("err=%+v\n", err)
    49:                 conn.Close()
    50:                 return
(dlv)
```

To advance, just enter `c` (or `continue`) and you'll be prompted for your name:

```bash
What's your name?: Ben
Welcome to the the simple chat server, Ben!
```

Now, go play and have fun.

## Summary

This article was inspired by my time at Red Hat when I was remote debugging an operator in an OpenShift cluster.  It allowed us visibility into a bug that we were fixing that was caused when a library dependency was upgraded and broke one of the APIs.

There was another API in the library that seemed to fix the issue, but the library maintainers had added a comment that it had been deprecated.  Also, the word "seemed" was doing a lot of heavy lifting there, since at the time we didn't have the access needed to the operator in the cluster and the fix was untested (but appeared to work).  The position of a senior member of the team was to check the fix into version control anyway so we could move on.

I was adamant that we needed to properly test and debug the issue and **not** use the deprecated API but another one that the maintainers recommended.  However, the recommended fix used two new structs that the deprecated API did not use, and this was further reason to dig in and do the hard work that was finding out how to properly test the running code in a running cluster.

I patiently explained to the team why it was not a good idea to proceed without first gaining visibility and access to the operator on the cluster and then thoroughly testing it with unit tests and why it was a very bad idea to ever check in untested code.  You'd think this conversation wouldn't need to happen, but I assure you it did.  More than once.

At the end of the day, it took an afternoon to get access to the pod and test the new API, including walking through the code and understanding why it was needed.  It eliminated all the guess work and anxiety that naturally comes from doing something half-assed when the root cause hasn't been properly diagnosed and understood, and it made us all feel warm and safe.  Yay.

Lastly, and without doing into detail, I would be remiss if I didn't add that any tension that arose from this incident was between those of us that find Agile horrid and repugnant and those of us that think that Agile is the bee's knees.

The end.

## References

- [`go-simple-chat`]
- [Delve]
- [minikube]

[`go-simple-chat`]: https://github.com/btoll/go-simple-chat
[minikube]: https://minikube.sigs.k8s.io/docs/
[Delve]: https://github.com/go-delve/delve
[`pstree`]: https://www.man7.org/linux/man-pages/man1/pstree.1.html
[`netcat`]: https://linux.die.net/man/1/nc
[`telnet`]: https://linux.die.net/man/1/telnet
[`ss`]: https://www.man7.org/linux/man-pages/man8/ss.8.html
[Kubernetes]: https://kubernetes.io/
[OpenShift]: https://www.redhat.com/en/technologies/cloud-computing/openshift
[deployment]: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
[port forwarded]: /2018/08/24/on-ssh-port-forwarding/
[`screen`]: https://www.gnu.org/software/screen/
[`tmux`]: https://github.com/tmux/tmux/wiki
