+++
title = "On Flux"
date = "2024-02-24T12:50:28-05:00"

+++

Recently, I've been reading a lot about [GitOps].  It's another annoying buzzword coughed up by an extremely annoying role (yes, DevOps, that's you), but I admit I really like the idea of Git as the "source of truth".

This is a post that is mostly a tutorial on how to get started with one of the GitOps major players, [Flux].  It doesn't expect you to use any cloud platforms to follow along, because that would just be obnoxious.

If you want an in-depth technical article on Flux, then this is not the article for you.  RTFM instead.

---

- [Create the Clusters](#create-the-clusters)
- [The Git Repository](#the-git-repository)
- [Flux Installation](#flux-installation)
- [Installing Flux In A Cluster](#installing-flux-in-a-cluster)
- [Creating the Flux Objects](#creating-the-flux-objects)
- [The `config/` Directory](#the-config-directory)
- [Image Updating](#image-updating)
- [`sealed-secrets`](#sealed-secrets)
- [Cleanup](#cleanup)
- [References](#references)

## Create the Clusters

Of course, you can do this any way you see fit.  I use `minikube`, you can use `kind` or something else.

Anyway, I'm creating two clusters, `beta` and `production`:

```bash
$ for env in beta production
do
minikube start --profile $env
done
```

There they are, the little fellas.

```bash
$ minikube profile list
|------------|------------|---------|----------------|------|---------|---------|-------|--------|
|  Profile   | VM Driver  | Runtime |       IP       | Port | Version | Status  | Nodes | Active |
|------------|------------|---------|----------------|------|---------|---------|-------|--------|
| beta       | virtualbox | docker  | 192.168.59.202 | 8443 | v1.28.3 | Running |     1 |        |
| production | virtualbox | docker  | 192.168.59.203 | 8443 | v1.28.3 | Running |     1 |        |
|------------|------------|---------|----------------|------|---------|---------|-------|--------|
```

## The Git Repository

The directory structure is important.  Here is an example base structure.  It's showing the whole tree, but I wanted to be explicit because many sources you'll find online aren't (usually, for good reason, since Flux doesn't dictate a directory structure, leaving it up to people to design one that best resembles their organization and its needs):

```bash
./
├── applications/
│   ├── devops/
│   │   ├── debug/
│   │   │   ├── base/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── env
│   │   │   │   └── kustomization.yaml
│   │   │   └── overlays/
│   │   │       ├── beta/
│   │   │       │   ├── env
│   │   │       │   └── kustomization.yaml
│   │   │       ├── development/
│   │   │       │   ├── env
│   │   │       │   └── kustomization.yaml
│   │   │       └── production/
│   │   │           ├── env
│   │   │           └── kustomization.yaml
│   │   └── dnsutils/
│   │       ├── base/
│   │       │   ├── kustomization.yaml
│   │       │   └── pod.yaml
│   │       └── overlays/
│   │           ├── beta/
│   │           │   └── kustomization.yaml
│   │           ├── development/
│   │           │   └── kustomization.yaml
│   │           └── production/
│   │               └── kustomization.yaml
│   └── web/
│       └── benjamintoll/
│           ├── base/
│           │   ├── deployment.yaml
│           │   ├── kustomization.yaml
│           │   ├── patch.yaml
│           │   └── service.yaml
│           └── overlays/
│               ├── beta/
│               │   ├── env
│               │   ├── kustomization.yaml
│               │   └── patch.yaml
│               ├── development/
│               │   ├── env
│               │   ├── kustomization.yaml
│               │   └── patch.yaml
│               └── production/
│                   ├── env
│                   ├── kustomization.yaml
│                   └── patch.yaml
├── clusters/
│   ├── beta/
│   │   ├── applications.yaml
│   │   ├── infrastructure.yaml
│   │   └── source.yaml
│   ├── development/
│   │   ├── applications.yaml
│   │   ├── infrastructure.yaml
│   │   └── source.yaml
│   └── production/
│       ├── applications.yaml
│       ├── infrastructure.yaml
│       └── source.yaml
├── config/
│   ├── beta/
│   │   └── kustomization.yaml
│   ├── development/
│   │   └── kustomization.yaml
│   └── production/
│       └── kustomization.yaml
└── infrastructure/
    └── controllers/
        ├── capacitor/
        │   └── kustomization.yaml
        ├── cert-manager/
        │   └── README.md
        ├── cilium/
        │   └── README.md
        ├── kustomization.yaml
        ├── kyverno/
        │   ├── kustomization.yaml
        │   ├── kyverno.yaml
        │   └── policies/
        │       ├── add-ttl-jobs.yaml
        │       ├── kustomization.yaml
        │       ├── require-pod-requests-limits.yaml
        │       └── spread-pods-across-topology.yaml
        └── prometheus/
            └── README.md

38 directories, 48 files
```

Let's briefly touch upon the top-level directories and what each will contain:

- **`applications/`**

    This is where all of the application microservices will live, grouped by project name (`web`).  Each service will use [`kustomize`] to make promoting changes from one environment to another easy and also to reduce duplication.

    For example, all Kubernetes manifests and base values will be in `base`, while any values specific to a particular environment will be in `overlays`/ and will override same-named values in `base`.

- **`clusters/`**

    This can contain information specific to a particular cluster.  In the case of Flux, for example, it will contain the controllers (`yaml` files) needed to [bootstrap the cluster].

- **`config/`**

    This directory will contain information about which microservices are currently deployed into the cluster.  For example, the `config/beta/` directory would include a `kustomization.yaml` file that contains the name of every service that should be deployed for a particular environment.

    The advantage of this is that a microservice can be checked into version control but not be deployed if its name is not in this file in this directory.

	I wrote a tool called [`git-update-services`] that can be wrapped by a [Git extension] called [`git kustomize`] tool will assist in easily add one or more services to this file.

- **`infrastructure/`**

    This is the location for 3rd-party tools, the majority of which could be Helm Charts.  An advantage of this separation, among others, is that they can be marked as a dependency of the applications.  This is important, especially as regards security, as we would want a tool like [`kyverno`] to be deployed and healthy before any other microservices would be deployed.

    Currently, I'm only deploying `kyverno` and [`capacitor`] (a great lightweight UI for Flux, if you're not a CLI guy) into the cluster.

If you would like to clone a repository that has this directory structure, you can grab the most dangerous Git repository in the world, [`gitops`]:

```bash
$ git clone https://github.com/btoll/gitops.git
```

I also take another step of creating that repository in an organization that I own.  This enables me to do a quick cleanup of the repository by just removing it.  And there's a wonderful tool for that, [`github-client`], made by a swell guy.

To use it simply create a tiny `json` blob with the details, as you see here.  Importantly, the repository that you're copying **must** be a [template repository] or this won't work.

Here is my `demo.json` blob:

```json
$ cat demo.json
[
    {
        "organization": "owls-nest-farm",
        "repositories": [
            {
                "name": "gitops",
                "owner": "btoll",
                "private": false,
                "visibility": "public",
                "tpl_name": "gitops"
            }
        ]
    }
]
```

Then, I just point it at the `github-client` tool and voilà:

```bash
$ ./github-client -config demo.json
[SUCCESS] Created repository `gitops` from template repository `gitops` in organization `owls-nest-farm`.
```

> Of course, you must own the destination account that you're copying it to.  Create a [GitHub personal access token] to let the `github-client` tool know that, hey, it's ok.

Again, you don't have to do any of this.  It's a free country (unless the dumbass out on bail gets elected again).  What's important is having a Git repository on a platform that Flux supports (GitHub, GitLab, Bitbucket, maybe others) where you can practice and follow along with this demo.

## Flux Installation

This is basically taken from the [Flux] website.  If you don't like the commands, don't blame me.

```bash
$ curl -o /tmp/flux.tar.gz -sLO https://github.com/fluxcd/flux2/releases/download/v2.2.3/flux_2.2.3_linux_amd64.tar.gz
$ tar -C /tmp/ -zxvf /tmp/flux.tar.gz
$ sudo mv /tmp/flux /usr/local/bin
```

This is assuming you're using Linux, because the alternative is inconceivable.  If for some reason you're not, you're on your own.  Visit the [Flux installation page].

## Installing Flux In A Cluster

Let's start with the `beta` cluster:

```bash
$ kubectl config use-context beta
Switched to context "beta".
```

First, we'll run a pre-flight check to make sure that our version of `flux` is compatible with the version of Kubernetes in the cluster:

```bash
$ flux check --pre
► checking prerequisites
✔ Kubernetes 1.28.3 >=1.26.0-0
✔ prerequisites checks passed
```

Ok, that looks good.  The next step is to bootstrap the cluster.  At a high level, this will commit the Flux Kubernetes objects into the `gitops` repository and then sync the state of the Git repo (the source of truth) with the cluster.  In addition, it will create an `SSH` keypair and install the public key in the GitHub account (again, this is only possible because of the PAT (personal access token) that you've created and given `flux` permission to use).

```bash
$ flux bootstrap github \
    --context=beta \
    --owner=owls-nest-farm \
    --repository=gitops \
    --branch=master \
    --personal \
    --path=clusters/beta
► connecting to github.com
► cloning branch "master" from Git repository "https://github.com/owls-nest-farm/gitops.git"
✔ cloned repository
► generating component manifests
✔ generated component manifests
✔ committed component manifests to "master" ("215cc1b2582f05cf16b7a1375d26aaa5f59eab5b")
► pushing component manifests to "https://github.com/owls-nest-farm/gitops.git"
► installing components in "flux-system" namespace
✔ installed components
✔ reconciled components
► determining if source secret "flux-system/flux-system" exists
► generating source secret
✔ public key: ecdsa-sha2-nistp384 AAAAE2VjZHNhLXNoYTItbmlzdHAzODQAAAAIbmlzdHAzODQAAABhBG6h9il49tmMbYBzZhhUl4dx2n7dIVB1ocTooeJOinFDJIFTJTuc4W43PtQOVRKUX8Nlv7OIIvPPoqGkveZxUz6JUcsd0DBD1rUJ21X8XLAlpVhJqHTZoVydQIKO3MD5LA==
✔ configured deploy key "flux-system-master-flux-system-./clusters/beta" for "https://github.com/owls-nest-farm/gitops"
► applying source secret "flux-system/flux-system"
✔ reconciled source secret
► generating sync manifests
✔ generated sync manifests
✔ committed sync manifests to "master" ("b047465a5b61b4fa9409647ff86614fa13d342d8")
► pushing sync manifests to "https://github.com/owls-nest-farm/gitops.git"
► applying sync manifests
✔ reconciled sync configuration
◎ waiting for GitRepository "flux-system/flux-system" to be reconciled
✔ GitRepository reconciled successfully
◎ waiting for Kustomization "flux-system/flux-system" to be reconciled
✔ Kustomization reconciled successfully
► confirming components are healthy
✔ helm-controller: deployment ready
✔ kustomize-controller: deployment ready
✔ notification-controller: deployment ready
✔ source-controller: deployment ready
✔ all components are healthy
```

Let's go over the parameters to the `flux bootstrap` command we just initiated:

|**Parameter** |**Description**
|:---|:---|
|--context=beta | The name of cluster
|--owner=owls-nest-farm | This will be the GitHub user name
|--repository=gitops | The repository that Flux is cloning and uses to sync its state
|--branch=master | The Git branch
|--personal | If true, the owner is assumed to be a GitHub user; otherwise an org
|--path=clusters/beta | The location in the Git repository (`gitops` here) where Flux will commit its Kubernetes manifests
|--read-write-key | If true, the deploy key is configured with read/write permissions (needed for auto-image updating)

Importantly, we'll now do a post-flight check:

```bash
$ flux check
► checking prerequisites
✔ Kubernetes 1.28.3 >=1.26.0-0
► checking version in cluster
✔ distribution: flux-v2.2.3
✔ bootstrapped: true
► checking controllers
✔ helm-controller: deployment ready
► ghcr.io/fluxcd/helm-controller:v0.37.4
✔ kustomize-controller: deployment ready
► ghcr.io/fluxcd/kustomize-controller:v1.2.2
✔ notification-controller: deployment ready
► ghcr.io/fluxcd/notification-controller:v1.2.4
✔ source-controller: deployment ready
► ghcr.io/fluxcd/source-controller:v1.2.4
► checking crds
✔ alerts.notification.toolkit.fluxcd.io/v1beta3
✔ buckets.source.toolkit.fluxcd.io/v1beta2
✔ gitrepositories.source.toolkit.fluxcd.io/v1
✔ helmcharts.source.toolkit.fluxcd.io/v1beta2
✔ helmreleases.helm.toolkit.fluxcd.io/v2beta2
✔ helmrepositories.source.toolkit.fluxcd.io/v1beta2
✔ kustomizations.kustomize.toolkit.fluxcd.io/v1
✔ ocirepositories.source.toolkit.fluxcd.io/v1beta2
✔ providers.notification.toolkit.fluxcd.io/v1beta3
✔ receivers.notification.toolkit.fluxcd.io/v1
✔ all checks passed
```

Looks good!  Onward and upwards!

## Creating the Flux Objects

If your repository doesn't contain the `GitRepository` and `Kustomization` objects, you'll need to create them for each cluster entry.  Let's look at how to do that on the command line.

From the root of the local `gitops` repository, create the `source` object:

```bash
$ flux create source git applications \
    --url=https://github.com/owls-nest-farm/gitops \
    --branch=master \
    --interval=1m \
    --export > ./clusters/beta/source.yaml
```

This will create the following file in `./clusters/beta/source.yaml`:

```yaml
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 1m0s
  ref:
    branch: master
  url: https://github.com/owls-nest-farm/gitops
```

From the root of the local `gitops` repository, create the `kustomization` object that will deploy the `source` object we just created:

```bash
$ flux create kustomization applications \
    --target-namespace=default \
    --source=applications \
    --depends-on=infrastructure-controllers \
    --path=./config/beta \
    --prune=true \
    --wait=true \
    --interval=1m \
    --retry-interval=1m \
    --health-check-timeout=1m \
    --export > ./clusters/beta/source.yaml
```

Which regurgitates the following:

```yaml
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: applications
  namespace: flux-system
spec:
  dependsOn:
  - name: infrastructure-controllers
  interval: 1m0s
  path: ./config/beta
  prune: true
  retryInterval: 1m0s
  sourceRef:
    kind: GitRepository
    name: applications
  targetNamespace: default
  timeout: 1m0s
  wait: true
```

Lastly, we'll create the other `source` object for the `infrastructure-controllers`, which the previous `kustomization` resource specified as a dependency.  This is important, as it will ensure that the `kyverno` policy engine (and anything else listed in `./infrastructure/controllers/kustomization.yaml`) is deployed into the cluster and healthy before any applications.  This is a good security posture.

```bash
$ flux create kustomization infrastructure-controllers \
    --source=applications \
    --depends-on=infrastructure-controllers \
    --path=./infrastructure/controllers \
    --prune=true \
    --wait=true \
    --interval=1m \
    --retry-interval=1m \
    --health-check-timeout=1m \
    --export > ./clusters/beta/infrastructure.yaml
```

Which barfs up the following:

```yaml
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure-controllers
  namespace: flux-system
spec:
  interval: 1m0s
  path: ./infrastructure/controllers
  prune: true
  retryInterval: 1m0s
  sourceRef:
    kind: GitRepository
    name: applications
  timeout: 2m0s
  wait: true
```

You'll do this for every cluster.  Remember, we're creating a multi-cluster [monorepo] that supports multiple environment stages.

> It doesn't matter what you name the newly-created `yaml` files.

A couple things to note.  First, if these files were present (that is, versioned in the Git repository) when you bootstrapped, then the cluster will automatically by synced to the state of the Git repository and you'll immediately by able to view the workloads using `kubectl`.

Else, you can send them to the Kubernetes API server like you've been doing for thousands of years:

```bash
$ kubectl apply -k clusters/beta
```

> Note the `-k`, which means to use `kustomize` to first generate the manifests before applying them into the cluster.

List the Pods:

```bash
$ kubectl get po
NAME                            READY   STATUS    RESTARTS   AGE
benjamintoll-5c64b6756b-c2zxt   1/1     Running   0          10m
benjamintoll-5c64b6756b-cp4q5   1/1     Running   0          10m
benjamintoll-5c64b6756b-ghhq6   1/1     Running   0          10m
benjamintoll-5c64b6756b-gw2df   1/1     Running   0          10m
benjamintoll-5c64b6756b-kxtwx   1/1     Running   0          10m
benjamintoll-5c64b6756b-s486d   1/1     Running   0          10m
debug-67f5f8449d-mx82g          1/1     Running   0          10m
dnsutils                        1/1     Running   0          12m
```

The infrastructure Pods (that is `kyverno` and `capacitor`) are running in different namespaces:

```bash
$ k -n kyverno get po
NAME                                                       READY   STATUS      RESTARTS   AGE
kyverno-admission-controller-849cb8f4d5-gkxwj              1/1     Running     0          13m
kyverno-background-controller-9597c9fc7-cq6r7              1/1     Running     0          13m
kyverno-cleanup-admission-reports-28496040-jz8v8           0/1     Completed   0          60s
kyverno-cleanup-cluster-admission-reports-28496040-kjd52   0/1     Completed   0          60s
kyverno-cleanup-controller-5ddb696f78-zbf2s                1/1     Running     0          13m
kyverno-reports-controller-664cf79767-9sb5s                1/1     Running     0          13m
$
$ k -n flux-system get po
NAME                                       READY   STATUS    RESTARTS   AGE
capacitor-59b8cbb697-gcjv6                 1/1     Running   0          15m
helm-controller-5d8d5fc6fd-dc9qh           1/1     Running   0          15m
kustomize-controller-7b7b47f459-ldf2x      1/1     Running   0          15m
notification-controller-5bb6647999-xjh2c   1/1     Running   0          15m
source-controller-7667765cd7-7g77l         1/1     Running   0          15m
```

Now, do the same for the `production` and `dev` clusters.  But, don't forget to first switch contexts (i.e., `kubeconfig`)!

```bash
$ kubectl config use-context production
Switched to context "production".
```

## The `config/` Directory

The `config` directory allows us to control what is deployed into the cluster.  The directory will have a subdirectory named after an environment (`production`, `beta`, `dev`, etc.), and with that subdirectory will be a `kustomization.yaml` file that controls the deployment for the particular environment.

For example, let's take a look in `./config/beta/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../applications/devops/debug/overlays/beta
  - ../../applications/devops/dnsutils/overlays/beta
  - ../../applications/web/benjamintoll/overlays/beta
```

So, we have to list an entry for every service in the `applications` directory?  Yep.  Wouldn't it be better to have a glob that referenced everything so that wasn't necessary, something like `../../applications/devops/*/overlays/beta` for all the microservices in the `devops` project for the `beta` environment.  Maybe.

> Or `../../applications/**/overlays/beta`, but the double wildcard `**` is a special feature particular to a shell and should not be relied upon.

Some, including me, would consider that the use of globs to allow for automatic deployment for any microservie to be a security risk.  For instance, globbing would enable any microservice to be immediately deployed into the cluster on the next reconciliation loop because the name of the service would match the `*` wildcard (of course, everything does, that's the point of it).  This might not be a good thing.  It may be better to version a microservice into the Git repository, but only deploy it at a later time, maybe after others have reviewed it further.

So, `kustomize` does not currently support [globs], although [all the `kustomize` maintainers support its addition].  Until then, we can simply write a small tool to add it (or remove it) when a service is added to the repository.  As I mentioned previously, I quickly wrote a tool called [`git-update-services`] that does just this.  Easy peasy.

I think being explicit is always a good thing, and although technically there's some duplication here (adding the microservice to both the `applications` directory hierarchy and its entry to the correct `kustomization.yaml` file in the `configs` directory, it's not too terrible.  Readability is a good thing and should matter, after all, and one glance at the `kustomization.yaml` file is enough to know what is currently deployed, even though there could be more services in `applications` than what is listed.

## Image Updating

To enable the functionality to automatically scan a container repository for updating image tags, it's necessary to add two controllers to the cluster:

- `image-reflector-controller`
- `image-automation-controller`

In addition, we need to give Flux both read and write permissions to the Git repository it is syncing:

- `--read-write-key`

We can (re-)run the bootstrap command again with these added parameters:

```bash
$ flux bootstrap github \
    --context=beta \
    --owner=owls-nest-farm \
    --repository=gitops \
    --branch=master \
    --personal \
    --path=clusters/beta \
    --read-write-key \
    --components-extra=image-reflector-controller,image-automation-controller
```

Now that the image objects are installed in the cluster which enable Flux to perform the auto-update, we now need to tell it how to do it.

First, we'll create an `ImageRepository` object which tells Flux the container registry to scan for tags:

```bash
$ flux create image repository debug \
    --image=hub.docker.com/btoll/debug \
    --interval=5m \
    --export > ./clusters/beta/debug-registry.yaml
```

This generates the following:

```yaml
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: debug
  namespace: flux-system
spec:
  image: btoll/debug
  interval: 5m0s
```

Second, we'll create an `ImagePolicy` which tells Flux which [semver] range to use when filtering tags:

```bash
$ flux create image policy debug \
    --image-ref=debug \
    --select-semver=1.0.x \
    --export > ./clusters/beta/debug-policy.yaml
```

This will generate the following:

```yaml
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: debug
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: debug
  policy:
    semver:
      range: 1.0.x
```

> Note that this semver range is looking for patch versions only.

Let's commit this and push to the remote repository that is synced with the cluster:

```bash
$ git add clusters/beta
$ git commit -m 'Added image registry and policy manifests'
$ git push origin master
```

Now, we have the ability to scan the configured image registry for image tags that match the defined image policy.

weeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee

Note, if you don't want to wait for the reconciliation interval, you can force it:

```bash
$ flux reconcile kustomization flux-system --with-source
► annotating GitRepository flux-system in flux-system namespace
✔ GitRepository annotated
◎ waiting for GitRepository reconciliation
✔ fetched revision master@sha1:5160364b5275dead061e7ad5528f2615938aa2e3
► annotating Kustomization flux-system in flux-system namespace
✔ Kustomization annotated
◎ waiting for Kustomization reconciliation
✔ applied revision master@sha1:5160364b5275dead061e7ad5528f2615938aa2e3
```

Let's see what the scan found:

```bash
$ flux get image repository debug
NAME    LAST SCAN                       SUSPENDED       READY   MESSAGE
debug   2024-02-13T12:02:04-05:00       False           True    successful scan: found 2 tags
```

You can see the tag names like this:

```bash
$ kubectl -n flux-system get imagerepositories.image.toolkit.fluxcd.io debug -ojsonpath="{.status.lastScanResult.latestTags}"
["latest","1.0.0"]
```

And, here's the policy:

```bash
$ flux get image policy debug
NAME    LATEST IMAGE            READY   MESSAGE
debug   btoll/debug:1.0.0       True    Latest image tag for 'btoll/debug' resolved to 1.0.0
```

Let's add another image with an incremented patch number to see the controllers at work:

```bash
$ docker push btoll/debug:1.0.1
```

The reconciliation happened quickly enough that I didn't need to do a manual sync like above.  Let's see what Flux lists now:

```bash
$ flux get image repository debug
NAME    LAST SCAN                       SUSPENDED       READY   MESSAGE
debug   2024-02-13T12:52:10-05:00       False           True    successful scan: found 3 tags
$ flux get image policy debug
NAME    LATEST IMAGE            READY   MESSAGE
debug   btoll/debug:1.0.1       True    Latest image tag for 'btoll/debug' updated from 1.0.0 to 1.0.1
$ kubectl -n flux-system get imagerepositories debug -o=jsonpath="{.status.lastScanResult.latestTags}"
["latest","1.0.1","1.0.0"]
```

[Kool Moe Dee]

Now, the main event: automatically updating the image tag.

The first thing we'll do is add what Flux is calling a marker.  This is text inside of a workload manifest that instructs Flux what needs changed.

For example, in my `deployment`, I'll change this line:

```yaml
image: btoll/debug:1.0.0
```

To:

```yaml
image: btoll/debug:1.0.0 # {"$imagepolicy": "flux-system:debug"}
```

That's kind of gross (I think that this may have been an `annotation` in Flux v1).

Next:

```bash
flux create image update flux-system \
    --interval=30m \
    --git-repo-ref=flux-system \
    --git-repo-path="./applications/devops/debug/base" \
    --checkout-branch=master \
    --push-branch=master \
    --author-name=fluxcdbot \
    --author-email=fluxcdbot@users.noreply.github.com \
    --commit-template="{{range .Updated.Images}}{{println .}}{{end}}" \
    --export > ./clusters/beta/flux-system-automation.yaml
```

> Note that the value for the `--git-repo-path` parameter should point to the location where the workload lives that should have its image updated.

This creates the following manifest:

```yaml
---
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  git:
    checkout:
      ref:
        branch: master
    commit:
      author:
        email: fluxcdbot@users.noreply.github.com
        name: fluxcdbot
      messageTemplate: '{{range .Updated.Images}}{{println .}}{{end}}'
    push:
      branch: master
  interval: 30m0s
  sourceRef:
    kind: GitRepository
    name: flux-system
  update:
    path: ./applications/devops/debug/base
    strategy: Setters
```

Like before, we'll now commit and push to the remote Git repository:

```bash
$ git add applications/devops/debug/ clusters/beta/
$ git commit -m weeeeeeeeeeeeeeeeeee
$ git push origin master
```

You'll soon see a new commit in your commit log from Flux and that your deployment has been updated with the new image.

```bash
$ flux get image update flux-system
NAME            LAST RUN                        SUSPENDED       READY   MESSAGE
flux-system     2024-02-13T14:00:18-05:00       False           True    no updates made; last commit 746fc11 at 2024-02-13T18:59:54Z

---

If your image tag doesn't automatically update, check that `flux` isn't throwing an error:

```bash
$ flux get image update flux-system
NAME            LAST RUN                        SUSPENDED       READY   MESSAGE
flux-system     2024-02-13T13:27:27-05:00       False           False   failed to push to remote: unknown error: ERROR: The key you are authenticating with has been marked as read only.
```

Note, that for my GitHub Personal Access Token, I gave it the following permissions:

- `repo`
- `delete_repo`

Make sure that you've given the PAT all the things it needs.

## `sealed-secrets`

TODO

## Cleanup

Make sure to tear down the clusters.  It's not necessary to first remove the `flux` objects from the clusters (that would be a simple `flux uninstall`, if you're curious):

```bash
$ for env in beta production
do
minikube delete --profile $env
done
```

## References

- [Flux Documentation](https://fluxcd.io/flux/)
- [flux2-kustomize-helm-example](https://github.com/fluxcd/flux2-kustomize-helm-example)
- [How to Model Your GitOps Environments and Promote Releases between Them](https://codefresh.io/blog/how-to-model-your-gitops-environments-and-promote-releases-between-them/)
- [Stop Using Branches for Deploying to Different GitOps Environments](https://codefresh.io/blog/stop-using-branches-deploying-different-gitops-environments/)
- [Automate image updates to Git](https://fluxcd.io/flux/guides/image-update/)
- [Image Repositories](https://fluxcd.io/flux/components/image/imagerepositories/)
- [Sealing Secrets with Kustomize](https://faun.pub/sealing-secrets-with-kustomize-51d1b79105d8)
- [`sealed-secrets` Open Issue Comment](https://github.com/bitnami-labs/sealed-secrets/issues/167#issuecomment-1805190708)

[Flux]: https://fluxcd.io/
[GitOps]: https://en.wikipedia.org/wiki/DevOps#GitOps
[`gitops`]: https://github.com/btoll/gitops
[`github-client`]: https://github.com/btoll/github-client/
[template repository]: https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository
[GitHub personal access token]: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
[Flux installation page]: https://fluxcd.io/flux/installation/
[monorepo]: https://fluxcd.io/flux/guides/repository-structure/#monorepo
[an extension to `kubectl`]: https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/
[`kustomize`]: https://github.com/kubernetes-sigs/kustomize
[`kyverno`]: https://kyverno.io/
[`capacitor`]: https://github.com/gimlet-io/capacitor
[`git-update-services`]: https://github.com/btoll/git-update-services
[Git extension]: /2019/07/05/on-extending-git/
[`git kustomize`]: https://github.com/btoll/git-update-services/blob/master/git-kustomize
[globs]: https://en.wikipedia.org/wiki/Glob_(programming)
[all the `kustomize` maintainers support its addition]: https://github.com/kubernetes-sigs/kustomize/issues/3205
[semver]: https://en.wikipedia.org/wiki/Software_versioning#Semantic_versioning
[Kool Moe Dee]: https://en.wikipedia.org/wiki/Kool_Moe_Dee

