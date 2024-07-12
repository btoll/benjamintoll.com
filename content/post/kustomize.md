+++
title = "On Kustomize"
date = "2024-04-20T11:02:04-04:00"

+++

- [Overview](#overview)
- [Generating Resources](#generating-resources)
- [Generator Options and Cross-cutting Fields](#generator-options-and-cross-cutting-fields)
- [Patching](#patching)
    + [`patchesStrategicMerge`](#patchesStrategicMerge)
    + [`patchesJson6902`](#patchesJson6902)
- [Mixins](#mixins)
- [Overlays](#overlays)
- [`Kustomize` Feature List](#kustomize-feature-list)
- [References](#references)

## Overview

`Kustomize` is a tool singularly-focused on manipulating Kubernetes `yaml` manifests.  Its intent is to do one thing and do it well, in the tradition of the [Unix philosophy].

It is not a competitor to Helm, as that is a tool that occupies a different domain than `Kustomize`.  Rather, it can be used together with Helm, for instance, piping the results of a Helm Chart to `Kustomize`.

After all, `Kustomize`, unlike Helm, is not a package manager, and so should not be seen as a replacement for Helm.

`Kustomize` is built-in to `kubectl`.  This is an attractive feature when thinking of adopting the tool, as a separate download is not necessary.

Now, let's take a look at some of its features.

## Generating Resources

There are two main ways to generate resources using `kustomize`.  First, you can use the `kustomize` binary.  Second, you can use `kubectl`.  We'll be using the latter, since we already have `kubectl` installed on the machine and don't need to download an additional binary.

Since `kustomize` is built into `kubectl`, it can be used in the following ways:

```bash
$ kubectl kustomize ./
$ kubectl apply -k ./
```

> Note that you can generate manifests directly from a remote git repository, such as doing:
>
> ```bash
> $ kubectl kustomize https://github.com/argoproj/argo-cd/manifests/cluster-install
> ```
>
> That's nice.

Generate a `ConfigMap` from a file:

`application.properties`

```yaml
FOO=bar
QUUX=derp
```

> The file can be named anything, as long as it's referenced properly in the `configMapGenerator`.

`kustomization.yaml`

```yaml
configMapGenerator:
- name: example-configmap-1
  files:
  - application.properties
```

Generate:

```bash
$ kubectl kustomize .
apiVersion: v1
data:
  application.properties: |
    FOO=Bar
    QUUX=derp
kind: ConfigMap
metadata:
  name: example-configmap-1-bdd29852d8
```

> Note that the `.`, which denotes the `cwd`, can be omitted.

---

Generate a `ConfigMap` from a `.env` file:

`.env`

```yaml
EDITOR=vim
GOPATH=/home/btoll/go
```

> Every environment variable entry becomes a separate key in the generated `ConfigMap`.

`kustomization.yaml`

```yaml
configMapGenerator:
- name: example-configmap-1
  envs:
  - .env
```

```bash
$ kubectl kustomize
apiVersion: v1
data:
  EDITOR: vim
  GOPATH: /home/btoll/go
kind: ConfigMap
metadata:
  name: example-configmap-1-bhc8mgfb95
```

> You can also use literals in the `ConfigMap` and `Secret` generators:
>
> ```yaml
> configMapGenerator:
> - name: example-configmap-1
>   literals:
>   - TWIG=berry

To use a `ConfigMap` or `Secret` in a deployment, simply reference it by the name of its `configMapGenerator` or `secretGenerator`, respectively:

```yaml
apiVersion: apps/v1
kind: Deployment
...
    volumes:
    - name: config
      configMap:
        name: example-configmap-1
...
```

or:

```yaml
  containers:
  - name: benjamintoll
    ...
    envFrom:
      - configMapRef:
          name: example-configmap-1
```

and:

```yaml
apiVersion: apps/v1
kind: Deployment
...
    volumes:
    - name: config
      secret:
        secretName: example-secret-1
...
```

TODO: check out `command` to run a shell command to decrypt secret gotten from elsewhere at runtime.

Note that the generated `ConfigMap` and `Secret` will have a hash appended to its name.  This is a hash of the contents of the file, and this will ensure that the new resource will be generated in the cluster when the contents have changed (i.e., the `GitOps` tool will have noticed a difference in state).

If this is undesirable, `generatorOptions` can be used to disable that feature, amongst others, such as generating labels and annotations.

## Generator Options and Cross-cutting Fields

Here's a little example that demonstrates the generation of annotations and labels for a `ConfigMap`.

`kustomization.yaml`

```yaml
configMapGenerator:
- name: example-configmap-3
  literals:
  - FOO=Bar
generatorOptions:
  disableNameSuffixHash: true
  labels:
    type: generated
  annotations:
    note: generated
```

Now, generate the `yaml`:

```bash
apiVersion: v1
data:
  FOO: Bar
kind: ConfigMap
metadata:
  annotations:
    note: generated
  labels:
    type: generated
  name: example-configmap-3
```

TODO: cross-cutting fields

## Patching

Much of the power of `Kustomize` comes from the use of overlays, which is how existing manifests can be patched.  Since `Kustomize` manipulates `yaml` and outputs it to `stdout`, original files are not overwritten or otherwise changed.  This is a pattern that has many uses in the deployment of microservices.

For the next for examples, we'll use a simple `Deployment` and `Service` manifests for the most dangerous website in the world.

`deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: benjamintoll
  labels:
    app: benjamintoll
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: benjamintoll
  template:
    metadata:
      labels:
        app: benjamintoll
    spec:
      containers:
      - name: benjamintoll
        image: btoll/benjamintoll.com:latest
        ports:
          - name: http
            containerPort: 80
```

`service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: benjamintoll
  labels:
    app: benjamintoll
  namespace: default
spec:
  selector:
    app: benjamintoll
  type: NodePort
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 80
```

Very commonly, it will have repetitive values for `namespace`, labels and even annotations.  `Kustomize` can help with that by defining the values in its config:

`kustomizationl.yaml`

```yaml
namePrefix: dev-
namespace: default
commonLabels:
  app: benjamintoll
resources:
  - deployment.yaml
  - service.yaml
```

Now, we can strip those bits out and have the tool add it for us.  In addition, we'll add the `dev-` prefix for all of the names:

`deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: benjamintoll
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: benjamintoll
        image: btoll/benjamintoll.com:latest
        ports:
          - name: http
            containerPort: 80
```

`service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: benjamintoll
spec:
  type: NodePort
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 80
```

Let's now generate the manifests:

```bash
apiVersion: v1
kind: Service
metadata:
  labels:
    app: benjamintoll
  name: dev-benjamintoll
  namespace: default
spec:
  ports:
  - name: http
    port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: benjamintoll
  type: NodePort
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: benjamintoll
  name: dev-benjamintoll
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: benjamintoll
  template:
    metadata:
      labels:
        app: benjamintoll
    spec:
      containers:
      - image: btoll/benjamintoll.com:latest
        name: benjamintoll
        ports:
        - containerPort: 80
          name: http
```

This should start to illustrate how `Kustomize` can help not only with common default values but also with applying different values depending upon the build environment (production, beta, staging, etc.).

### `patchesStrategicMerge`

This merge strategy is a customized version of `JSON` merge patch and is the same one used by `kubectl apply`, `kubectl edit` and `kubectl patch`.  It is used as an additive strategy.

There are multiple operations, or directives.  Here are some of the most common:

- replace
- merge
- delete
- delete from primitive list

The first three are mutually exclusive.

Let's first take a look at the patch:

`patch.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: benjamintoll
spec:
  template:
    spec:
      containers:
      - name: benjamintoll
        resources:
          requests:
            cpu: 20m # 20 milliCPU / 0.02 CPU
        livenessProbe:
          httpGet:
            path: /index.html
            port: http
          initialDelaySeconds: 5
```

This will be appended onto the output of the `Deployment` object in the output of the command:

```bash
$ kubectl kustomize
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: benjamintoll
  name: dev-benjamintoll
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: benjamintoll
  template:
    metadata:
      labels:
        app: benjamintoll
    spec:
      containers:
      - image: btoll/benjamintoll.com:latest
        livenessProbe:
          httpGet:
            path: /index.html
            port: http
          initialDelaySeconds: 5
        name: benjamintoll
        ports:
        - containerPort: 80
          name: http
        resources:
          requests:
            cpu: 20m

```

### `patchesJson6902`

This is named after the [JavaScript Object Notation (JSON) Patch RFC].  This is a handy merge strategy to use when a specific value should be targeted and updated, such as the number of replicas or the name of a container image.

Nodes in the tree can be strategically updated or chunks of the tree (i.e., patches) can be updated.  Those who remember [`xpath`] will find the former use case familiar.

There are six types of operations:

- add
- remove
- replace
- move
- copy
- test

Let's change both the number of replicas and the image name:

```yaml
- op: replace
  path: /spec/replicas
  value: 5
- op: replace
  path: /spec/template/spec/containers/0/image
  value: busybox
```

> Note that the above `path` contains a subscript.  This is used to target arrays, and like arrays, are zero-based.
>
> In this case, it's target the following value in the tree:
> ```yaml
> spec:
>   template:
>     spec:
>       containers:
>       - name: nginx
> ```

## Mixins

## Overlays

```bash
./
├── base/
│   ├── kustomization.yaml
│   └── pod.yaml
├── production/
│   └── kustomization.yaml
└── staging/
    └── kustomization.yaml
```

## `Kustomize` Feature List

> This is taken directly from the [Kustomize Feature List] section of the official Kubernetes documentation.

|**Field** |**Type** |**Explanation**
|:---|:---|:---
|namespace |string |add namespace to all resources
|namePrefix |string |value of this field is prepended to the names of all resources
|nameSuffix |string |value of this field is appended to the names of all resources
|commonLabels |map[string]string |labels to add to all resources and selectors
|commonAnnotations |map[string]string |annotations to add to all resources
|resources |[]string |each entry in this list must resolve to an existing resource configuration file
|configMapGenerator |[]ConfigMapArgs |Each entry in this list generates a ConfigMap
|secretGenerator |[]SecretArgs |Each entry in this list generates a Secret
|generatorOptions |GeneratorOptions |Modify behaviors of all ConfigMap and Secret generator
|bases |[]string |Each entry in this list should resolve to a directory containing a kustomization.yaml file
|patchesStrategicMerge |[]string |Each entry in this list should resolve a strategic merge patch of a Kubernetes object
|patchesJson6902 |[]Patch |Each entry in this list should resolve to a Kubernetes object and a Json Patch
|vars |[]Var |Each entry is to capture text from one resource's field
|images |[]Image |Each entry is to modify the name, tags and/or digest for one image without creating patches
|configurations |[]string |Each entry in this list should resolve to a file containing Kustomize transformer configurations
|crds |[]string |Each entry in this list should resolve to an OpenAPI definition file for Kubernetes types

## References

- [Extending Kustomize](https://kubectl.docs.kubernetes.io/guides/extending_kustomize/)
- [Declarative Management of Kubernetes Objects Using Kustomize](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/)
- [Declarative application management in Kubernetes](https://github.com/kubernetes/design-proposals-archive/blob/main/architecture/declarative-application-management.md)
- [Kustomize: Deploy Your App with Template Free YAML (video)](https://www.youtube.com/watch?v=ahMIBxufNR0)

[Unix philosophy]: https://en.wikipedia.org/wiki/Unix_philosophy
[JavaScript Object Notation (JSON) Patch RFC]: https://tools.ietf.org/html/rfc6902
[`xpath`]: https://en.wikipedia.org/wiki/XPath
[Kustomize Feature List]: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/#kustomize-feature-list

