+++
title = "On the Kyverno Policy Engine"
date = "2024-03-06T18:47:30-05:00"
draft = true

+++

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

Install the kyverno policy engine.  It's used to complement and enhance the Kubernetes PSA feature:

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

## References

- [Pod Security Standards]
- [Pod Security Admission]
- [Kubernetes Security — Pod Security Standards using Kyverno](https://medium.com/@charled.breteche/kubernetes-security-pod-security-standards-using-kyverno-cc5d9042b79a)
- [Managing Pod Security on Amazon EKS with Kyverno](https://aws.amazon.com/blogs/containers/managing-pod-security-on-amazon-eks-with-kyverno/)
- [AWS Docs GPT](https://docsgpt.antimetal.com/)

[Pod Security Standards]: https://kubernetes.io/docs/concepts/security/pod-security-standards/
[Pod Security Admission]: https://kubernetes.io/docs/concepts/security/pod-security-admission/

