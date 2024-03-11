+++
title = "On the Kyverno Policy Engine"
date = "2024-03-06T18:47:30-05:00"
draft = true

+++

- [Demo](#demo)
- [Conclusion](#conclusion)
- [References](#references)

---

Pod security controls ([Pod Security Standards]) for pod configurations are organized into three levels:

- privileged (unsecure)
- baseline (secure)
- restricted (highly secure)

[Pod Security Admission] has three modes of operation:

- enforce
    + policy violations will cause the pod to be rejected
- audit
    + policy violations trigger the addition of an audit annotation to the event recorded in the audit log, but are otherwise allowed
- warn
    + policy violations will trigger a user-facing warning, but are otherwise allowed

The Kubernetes API server static configuration provides the ability to define additional PSA/PSS settings.  This cannot be customized when setting up an EKS cluster.

Kubernetes namespaces can then opt in to more restrictive pod security standards.

```yaml
# The per-mode level label indicates which policy level to apply for the mode.
#
# MODE must be one of `enforce`, `audit`, or `warn`.
# LEVEL must be one of `privileged`, `baseline`, or `restricted`.
pod-security.kubernetes.io/<MODE>: <LEVEL>

# Optional: per-mode version label that can be used to pin the policy to the
# version that shipped with a given Kubernetes minor version (for example v1.24).
#
# MODE must be one of `enforce`, `audit`, or `warn`.
# VERSION must be a valid Kubernetes minor version, or `latest`.
pod-security.kubernetes.io/<MODE>-version: <VERSION>
```

`eks` uses the privileged PSS level by default, so there is no security enforced by default, unless namespace labels are used to opt in to more secure settings.

---

Hack a Node:

--override-type=json|merge|strategic
--overrides=""

`overrides.json`

```json
{
    "spec": {
        "nodeName": "worker-node01",
        "hostPID": true,
        "hostNetwork": true,
        "containers": [
            {
                "securityContext": {
                    "privileged": true
                },
                "image": "docker.io/library/alpine",
                "name": "nsenter",
                "stdin": true,
                "stdinOnce": true,
                "tty": true,
                "command": [
                    "nsenter",
                    "--target",
                    "1",
                    "--mount",
                    "--uts",
                    "--ipc",
                    "--net",
                    "--pid",
                    "bash",
                    "-l"
                ],
                "resources": {},
                "volumeMounts": []
            }
        ]
    }
}

```

```bash
$ kubectl run --image alpine --overrides="$(< overrides.json)" --rm -it my-pod
```

---

Install the [Kyverno] policy engine.  It's used to complement and enhance the Kubernetes PSA feature:

```bash
$ kubectl create -f https://github.com/kyverno/kyverno/releases/download/v1.11.0/install.yaml
```

> Note, if you use `apply` rather than `create` as suggested by the official documentation when you install `kyverno`, you will most likely get an error that will prevent its installation.

Kyverno policies can run in audit mode instead of enforce, this allows testing policies while not breaking existing workloads. In audit mode Kyverno will generate Warning events but won’t deny requests.

Tell the PSA (Pod Security Admission) controller to enforce the baseline PSS (Pod Security Standard):

Target all namespaces:

```bash
$ kubectl label --overwrite ns --all pod-security.kubernetes.io/enforce=baseline
```

Target just the `default` namespace:

```bash
$ kubectl label --overwrite ns default pod-security.kubernetes.io/enforce=privileged
namespace/default labeled
$ kubectl get ns default -oyaml
apiVersion: v1
kind: Namespace
metadata:
  creationTimestamp: "2024-01-30T03:31:43Z"
  labels:
    kubernetes.io/metadata.name: default
    pod-security.kubernetes.io/enforce: privileged
  name: default
  resourceVersion: "891"
  uid: 01b8fce3-cacc-4e7d-abab-0404a09075f5
spec:
  finalizers:
  - kubernetes
status:
  phase: Active
```

Remove the label:

```bash
$ kubectl label --overwrite ns default pod-security.kubernetes.io/enforce-
```

Add a policy that mutates inbound request for new namespaces.  This will add the pod security enforce label, if not defined:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: mutate-pss-labels
spec:
  rules:
  - name: add-restricted
    match:
      resources:
        kinds:
        - Namespace
    mutate:
      patchStrategicMerge:
        metadata:
          labels:
            +(pod-security.kubernetes.io/enforce): restricted

```

Restrict the PSA enforce mode to either the `baseline` or `restricted` PSS levels (to prevent a security downgrade):

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: validate-pss-labels
spec:
  validationFailureAction: enforce
  background: true
  rules:
  - name: check-restricted
    match:
      resources:
        kinds:
        - Namespace
    validate:
      message: "the privileged pod security level is not allowed"
      pattern:
        metadata:
          labels:
            pod-security.kubernetes.io/enforce: "baseline | restricted"
```

> Try downgrading the security posture of a namespace to `privileged` after applying this policy.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: policy-test
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: privileged
    pod-security.kubernetes.io/warn: privileged
```

```bash
$ kubectl -n kyverno get policyreports.wgpolicyk8s.io
```

Get the kyverno `kubectl` plugin:

```bash
$ kubectl krew install kyverno
```

## Demo

> This demo is only to show how easy it is to establish some baseline policies that would give the cluster a significant boost of security and stability.  It is not intended to go into depth about Kyverno, why policy engines are a good idea or how they work technically.
>
> Lastly, the policies themselves are very simple.  There is much more that can be done with them, and I have only scratched the surface.

Before getting in the demo, you must meet the prerequisites:

- a write access token to your Git platform

We're going to use `kind` to create a local cluster quickly and easily.  I've defined the configuration in a file, which the command will use below:

```yaml
apiVersion: kind.x-k8s.io/v1alpha4
kind: Cluster
name: beta
nodes:
- role: control-plane
- role: worker
  labels:
    zone: 1
- role: worker
  labels:
    zone: 2
- role: worker
  labels:
    zone: 3
- role: worker
  labels:
    zone: 4
```

We want to add labels to the worker nodes, because one of the policy rules will leverage them to deploy an equitable distribution of Pods across the cluster nodes.

```bash
$ kind create cluster --config /vagrant/cluster_config.yaml
Creating cluster "beta" ...
 ✓ Ensuring node image (kindest/node:v1.29.2) 🖼
 ✓ Preparing nodes 📦 📦 📦 📦 📦
 ✓ Writing configuration 📜
 ✓ Starting control-plane 🕹️
 ✓ Installing CNI 🔌
 ✓ Installing StorageClass 💾
 ✓ Joining worker nodes 🚜
Set kubectl context to "kind-beta"
You can now use your cluster with:

kubectl cluster-info --context kind-beta

Have a nice day! 👋
```

The next step is kludgy, but I haven't seen a way around it.  Even though we've specified the name of `beta` for our cluster, `kind` will prepend its name with `kind-`, so the full name will be `kind-beta`.  This is a problem, because the name of the cluster needs to match that of the cluster environment in the Git monorepo that Flux will be using, and this environment is simply named `beta`.

We'll just use a stream editor to change all references of `kind-beta` in the newly-generated `kubeconfig` file:

```bash
$ sed -i 's/kind-beta/beta/' ~/.kube/config
```

Let's check our nodes:

```bash
$ kubectl get no
NAME                 STATUS   ROLES           AGE   VERSION
beta-control-plane   Ready    control-plane   63m   v1.29.2
beta-worker          Ready    <none>          62m   v1.29.2
beta-worker2         Ready    <none>          62m   v1.29.2
beta-worker3         Ready    <none>          62m   v1.29.2
beta-worker4         Ready    <none>          62m   v1.29.2
```

The next step is to install Flux.  This is easy to do:

```bash
$ curl -o /tmp/flux.tar.gz -sLO https://github.com/fluxcd/flux2/releases/download/v2.2.3/flux_2.2.3_linux_amd64.tar.gz
$ tar -C /tmp/ -zxvf /tmp/flux.tar.gz
$ sudo mv /tmp/flux /usr/local/bin
```

And do a Flux pre-check.  This will ensure compatibility with the version of Kubernetes that the cluster is using:

```bash
$ flux check --pre
► checking prerequisites
✔ Kubernetes 1.29.2 >=1.26.0-0
✔ prerequisites checks passed
```

At this point, we need to have access to a Git repository that is composed of a directory structure that we've pre-decided is effective for our deployment strategy.  In this repository will reside all of the Kuberenetes resources, whether in `yaml` format or as Helm charts.  Further, the applications will have been structured for different deployment environments using the `kustomize` tool.

This demo will not be going into detail on any of these subjects, but you can find much more information about them in other areas where I've written about them:

- [On Flux](/2024/02/24/on-flux/)
- foobar

I have a repository called [`gitops`] that can be used for the Git monorepo (i.e., the repository that we just described above as containing all of the Kuberenetes resources), and it can be cloned or [used as a template].

> I've created mine in the `owls-nest-farm` organization, and I'll be referring to that in the examples that follow.

Now, we get to the meat and potatoes.  We'll use Flux [to bootstrap the cluster], and in so doing [Flux will automatically deploy](https://github.com/btoll/gitops/tree/master/clusters/beta) the following services in the `beta` environment:

- [Infrastructure](https://github.com/btoll/gitops/blob/master/infrastructure/controllers/kustomization.yaml)
    + [Kyverno](https://github.com/btoll/gitops/tree/master/infrastructure/controllers/kyverno) policy engine
    + [Capacitor](https://github.com/btoll/gitops/tree/master/infrastructure/controllers/capacitor) UI
- [Applications](https://github.com/btoll/gitops/blob/master/config/beta/kustomization.yaml)
    + [`dnsutils`](https://github.com/btoll/gitops/tree/master/applications/devops/dnsutils/overlays/beta) Pod
    + [`devops`](https://github.com/btoll/gitops/tree/master/applications/devops/debug/overlays/beta) deployment
    + [`benjamintoll.com`](https://github.com/btoll/gitops/tree/master/applications/web/benjamintoll/overlays/beta) deployment

```bash
$ flux bootstrap github --context=beta --owner=owls-nest-farm --repository=gitops --branch=master --personal --path=clusters/beta
► connecting to github.com
► cloning branch "master" from Git repository "https://github.com/owls-nest-farm/gitops.git"
✔ cloned repository
► generating component manifests
✔ generated component manifests
✔ committed component manifests to "master" ("c64b5de4f7d1402cffe0aba98c5d19a4f061c872")
► pushing component manifests to "https://github.com/owls-nest-farm/gitops.git"
► installing components in "flux-system" namespace
✔ installed components
✔ reconciled components
► determining if source secret "flux-system/flux-system" exists
► generating source secret
✔ public key: ecdsa-sha2-nistp384 AAAAE2VjZHNhLXNoYTItbmlzdHAzODQAAAAIbmlzdHAzODQAAABhBP9lPYC84zgcuxOI8zF/SMNFWGJz5mJik+Dlp/9AAalN+/9JBtfsK0bYu0ToG1kf59gHKoHwPiTvrQ8WgujPLn2T6GeNpTdJaYTMFTLIq0UInTlZwU/qTlCvAE48Jo5wdA==
✔ configured deploy key "flux-system-master-flux-system-./clusters/beta" for "https://github.com/owls-nest-farm/gitops"
► applying source secret "flux-system/flux-system"
✔ reconciled source secret
► generating sync manifests
✔ generated sync manifests
✔ committed sync manifests to "master" ("5ed7d0463bfb27967858e0ef73e31c6d85f93b55")
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

After a little bit of time while the reconciliation loops and syncs the state of the cluster with that of the Git repository, you should see the following Pods running in the `default` namespace:

```bash
$ kuectl get po
NAME                            READY   STATUS    RESTARTS   AGE
benjamintoll-5c64b6756b-98hfm   1/1     Running   0          4m31s
benjamintoll-5c64b6756b-g6dv9   1/1     Running   0          4m31s
benjamintoll-5c64b6756b-h5gr5   1/1     Running   0          4m31s
benjamintoll-5c64b6756b-jq42l   1/1     Running   0          4m31s
benjamintoll-5c64b6756b-nv8sj   1/1     Running   0          4m32s
benjamintoll-5c64b6756b-wzxxq   1/1     Running   0          4m31s
debug-67f5f8449d-rc42k          1/1     Running   0          4m31s
dnsutils                        1/1     Running   0          4m31s
```

The Kyverno and Capacitor infrastructure resources have been deployed into other namespaces.  I'll leave it as an exercise to the reader to further exploration.

This demo is about Kyverno, so let's start looking at what it did.

First, we can see the policies that policy engine is managing:

```bash
$ kubectl get clusterpolicy
NAME                      ADMISSION   BACKGROUND   VALIDATE ACTION   READY   AGE   MESSAGE
add-ttl-jobs              true        true         Audit             True    21m   Ready
require-requests-limits   true        true         audit             True    21m   Ready
spread-pods               true        true         Audit             True    21m   Ready
```

Let's first look at the events from the `require-requests-limit` policy to get information as to what happened for each `apiserver` request:

```bash
Events:
  Type     Reason           Age                   From               Message
  ----     ------           ----                  ----               -------
  Warning  PolicyViolation  3m22s (x30 over 32m)  kyverno-admission  Pod default/dnsutils: [validate-resources] fail; validation error: CPU and memory resource requests and limits are required. rule validate-resources failed at path /spec/containers/0/resources/limits/
  Normal   PolicyApplied    3m22s (x30 over 32m)  kyverno-admission  Deployment default/benjamintoll: pass
  Normal   PolicyApplied    3m22s (x30 over 32m)  kyverno-admission  Deployment default/debug: pass
  Normal   PolicyApplied    32m                   kyverno-admission  Pod default/benjamintoll-5c64b6756b-nv8sj: pass
  Normal   PolicyApplied    32m                   kyverno-admission  Pod default/benjamintoll-5c64b6756b-wzxxq: pass
  Normal   PolicyApplied    32m                   kyverno-admission  Pod default/debug-67f5f8449d-rc42k: pass
  Normal   PolicyApplied    32m                   kyverno-admission  Pod default/benjamintoll-5c64b6756b-jq42l: pass
  Normal   PolicyApplied    32m                   kyverno-admission  Pod default/benjamintoll-5c64b6756b-g6dv9: pass
  Normal   PolicyApplied    32m                   kyverno-admission  Pod default/benjamintoll-5c64b6756b-98hfm: pass
  Normal   PolicyApplied    32m                   kyverno-admission  Pod default/benjamintoll-5c64b6756b-h5gr5: pass
  Warning  PolicyViolation  32m                   kyverno-scan       Pod default/dnsutils: [validate-resources] fail; validation error: CPU and memory resource requests and limits are required. rule validate-resources failed at path /spec/containers/0/resources/limits/
```

The important thing to note here is that the policy engine flagged the `dnsutils` Pod as failing its CPU and memory requirement rules.  Because the enforcement was set to `Audit`, it's only logging the event and not actively blocking that Pod from entering the cluster.

You can view the enforcement action of each policy simply by listing them:

```bash
$ kubectl get clusterpolicy
NAME                      ADMISSION   BACKGROUND   VALIDATE ACTION   READY   AGE   MESSAGE
add-ttl-jobs              true        true         Audit             True    69m   Ready
require-requests-limits   true        true         Audit             True    69m   Ready
spread-pods               true        true         Audit             True    69m   Ready
```

Next up, here is the `spread-pods` policy:

```bash
Events:
  Type    Reason         Age                From               Message
  ----    ------         ----               ----               -------
  Normal  PolicyApplied  52m (x2 over 52m)  kyverno-admission  Deployment default/benjamintoll is successfully mutated
  Normal  PolicyApplied  52m (x2 over 52m)  kyverno-admission  Deployment default/debug is successfully mutated
```

This policy is ensuring that there is an even distribution of Pods among the worker nodes, with a skew of only 1 (the default can be either 3 or 5).  The important thing to note about this policy is that it is expecting every node that can receive a Pod to have a label of `distributed`.

Lastly, let's take a look at deploying a [job](https://raw.githubusercontent.com/kubernetes/website/main/content/en/examples/controllers/job.yaml) (taken directly from the Kubernetes docs):

```bash
$ kubectl apply -f - << EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: pi
spec:
  template:
    spec:
      containers:
      - name: pi
        image: perl:5.34.0
        command: ["perl",  "-Mbignum=bpi", "-wle", "print bpi(2000)"]
      restartPolicy: Never
  backoffLimit: 4
EOF
job.batch/pi created
```

There important thing to realize here is that without the `ttlSecondsAfterFinished` config, the job and the Pod will never be removed from the cluster.  We can implement a process where that configuration is required for any deployed job, but we can do better than by only having to target the admission controller.


Let's take a look at the job and the Pod's logs after a successful deployment:

```bash
$ kubectl get job
NAME   COMPLETIONS   DURATION   AGE
pi     1/1           10s        10s
```

And, check its logs:

```bash
$ kubectl logs pi-ddzqd
3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632788659361533818279682303019520353018529689957736225994138912497217752834791315155748572424541506959508295331168617278558890750983817546374649393192550604009277016711390098488240128583616035637076601047101819429555961989467678374494482553797747268471040475346462080466842590694912933136770289891521047521620569660240580381501935112533824300355876402474964732639141992726042699227967823547816360093417216412199245863150302861829745557067498385054945885869269956909272107975093029553211653449872027559602364806654991198818347977535663698074265425278625518184175746728909777727938000816470600161452491921732172147723501414419735685481613611573525521334757418494684385233239073941433345477624168625189835694855620992192221842725502542568876717904946016534668049886272327917860857843838279679766814541009538837863609506800642251252051173929848960841284886269456042419652850222106611863067442786220391949450471237137869609563643719172874677646575739624138908658326459958133904780275901
```

If we check it again after a short period of time, we'll see that it's no longer in the cluster:

```bash
$ kubectl get job
No resources found in default namespace.
```

Wait, what happened to it?  Well, if we look at the policy rule, we'll get our answer:

```bash
$ kubectl get clusterpolicy add-ttl-jobs -ojsonpath='{.spec.rules[0].mutate}' | jq
{
  "patchStrategicMerge": {
    "spec": {
      "+(ttlSecondsAfterFinished)": 90
    }
  }
}
```

There you go.  It's added a config stating that it should be removed (and have its Pod delete, as well) after 90 seconds.  This is handy as a safeguard for when that particular config hasn't been added to a job resource, as the rule will catch anything at the point-of-entry to the cluster.

> If the job already has a `ttlSecondsAfterFinished` config, then that will be honored.  This will only add it if it doesn't exist.

## Conclusion

My conclusion is that [benjamintoll.com] is the most dangerous website in the world.

## References

- [Pod Security Standards]
- [Pod Security Admission]
- [Kubernetes Security — Pod Security Standards using Kyverno](https://medium.com/@charled.breteche/kubernetes-security-pod-security-standards-using-kyverno-cc5d9042b79a)
- [Managing Pod Security on Amazon EKS with Kyverno](https://aws.amazon.com/blogs/containers/managing-pod-security-on-amazon-eks-with-kyverno/)
- [AWS Docs GPT](https://docsgpt.antimetal.com/)
- [Kyverno]
- [Capacitor]

[Pod Security Standards]: https://kubernetes.io/docs/concepts/security/pod-security-standards/
[Pod Security Admission]: https://kubernetes.io/docs/concepts/security/pod-security-admission/
[benjamintoll.com]: https://benjamintoll.com
[`gitops`]: https://github.com/btoll/gitops
[used as a template]: https://gitprotect.io/blog/how-to-use-github-repository-templates/
[Kyverno]: https://kyverno.io/
[Capacitor]: https://gimlet.io/blog/flux2
[to bootstrap the cluster]: /2024/02/24/on-flux/#installing-flux-in-a-cluster

