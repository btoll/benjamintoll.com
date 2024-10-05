+++
title = "On Dynamically Creating EC2 Instances That Log To S3"
date = "2024-09-26T12:09:16-04:00"

+++

- [Introduction](#introduction)
- [Considerations](#considerations)
- [Workflow](#workflow)
- [Querying `meta-data` And `user-data`](#querying-meta-data-and-user-data)
- [How It Works](#how-it-works)
- [Usage](#usage)
- [Podman](#podman)
- [References](#references)

---

## Introduction

Today we'll be doing a fun exercise.  I wanted to run some benchmarks that would take anywhere from 30 minutes to over an hour, depending primarily upon the number of cores because it will be CPU bound.

This implicitly means that the instance type needs to be configurable.  Because of this requirement, this rules out several cloud services such as Lambda (also, this has a maximum execution time limit of 15 minutes) and ECS in both EC2 and Farget modes.

Not to worry, we can easily achieve the desired outcome by creating EC2 instances as needed that are pre-configured to run the tests and upload the results to S3.

Let's get started.

## Considerations

Here are some considerations that were important that were top of mind when designing this:

- Keep it simple.
- Use the least amount of tools as possible.
- Since presumably developers will be benchmarking as well as other technical groups, let's not use tools that the average developer isn't using on a day-to-day basis.
    + In other words, let's not use tools that require a learning curve themselves.
- Use AWS, but don't require devs to have an intimate knowledge of the cloud platform.
    + Expectations on requiring an IAM user and an (shared) access key are reasonable per user, but don't mandate anyone to log into the AWS Console.

## Workflow

The workflow is very simple:

1. Create an [EC2 launch template] that includes the following information:
    - AMI
    - IAM instance profile
    - SSH Access Key Name
    - Security Group
        + This allows SSH access to the instance.
    - Default Instance Type
        + Allows for `--instance-type` to be optional in the CLI tool (see below).
    - [`user-data`]
        + `http://169.254.169.254/latest/user-data`
    - Enables `metadata`

1. Create a simple shell script using the [`awscli`].  This shell script was create the EC2 instance, and the commands in the `user-data` section (defined in the launch template) will begin to execute.

1. Use the `tee` utility to enable both streaming logs to `stdout` and also saving the logs to a local file.

1. Upon completion, the log file will be uploaded to a bucket in S3.

## Querying `meta-data` And `user-data`

Importantly, version 2 now requires a token (this is a good thing).  So, first, get the token, passing in the number of seconds it should be valid:

```bash
$ TOKEN=$(curl -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" -X PUT http://169.254.169.254/latest/api/token 2> /dev/null)
```

At this point, both requests will be authorized for number of seconds given above:

```bash
$ curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data
$ curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/user-data
```

## How It Works

So, let's see how everything works together.  Because, of course, there are immediate questions about:

- How is the `user-data` script executed?
- How is the instance authorized if it doesn't have any credentials?
- How is the instance able to communicate with the S3 service (or any other service)?


We'll address these one at a time.

First, for those that are unfamiliar, the `user-data` is an option that can be given when creating EC2 instances that allow for code or shell commands to be executed after the instance boots.  It is very handy and gives the user (or "devops engineer") the ability to do any bootstrapping (i.e., provisioning) that may need to occur.

So, how is the `user-data` script executed?  Apparently, the functionality is included in the AMI, but it needs to be enabled.  This can be done when creating the instance, just like many other settings.

Next, how is the instance authorized?  Clearly, it's not desirable to hardcode any credentials into the instance itself if it can be avoided.  For one, this would mean pasting the credentials in plaintext (or base64, not great either) into the console or using the `awscli` which would result in the same.

In addition, it's not possible to inject the credentials into the instance after the instance had come online (which would be too late) or by using environment variables or a secrets manager.

Luckily, there is another mechanism with which to do this.  From the docs, re: [Use Amazon EC2 instance metadata for AWS CLI credentials]:

> When you run the AWS CLI from within an Amazon Elastic Compute Cloud (Amazon EC2) instance, you can simplify providing credentials to your commands. Each Amazon EC2 instance contains metadata that the AWS CLI can directly query for temporary credentials. When an IAM role is attached to the instance, the AWS CLI automatically and securely retrieves the credentials from the instance metadata.

From the `user-data` shell script:

```bash
$ cat <<EOF > /root/.aws/credentials
[profile benchmark]
role_arn = arn:aws:iam::296062564641:role/benchmark-s3
credential_source = Ec2InstanceMetadata
region = us-east-1
EOF
```

## Usage

```bash
$ ./benchmark.sh -h
Usage: ./benchmark.sh --instance-type "f1.2xlarge" [ --cpu 8 --memory 4096 ]

Args:
-c, --cpu            : The number of cores.
-i, --instance-type  : The name of the instance type. Defaults to `t2.micro`.
-m, --memory         : The amount of memory. This is determined by the chosen instance type.
-f, --tail           : Tail the logs on the instance.  Must have access to the private key.
-h, --help           : Show usage.
```

Here are some use cases:

- The instance type is known:

    ```bash
    ./benchmark.sh --instance-type t2.2xlarge
    ```

- The instance type is known and the number of cores are specified:

    ```bash
    ./benchmark.sh --instance-type t2.2xlarge --cpu 8
    ```

- The instance type is not known and the user wants to choose based on memory and CPU requirements:

    ```bash
    ./benchmark.sh --memory 61035 --cpu 8
    ```

    + This produces a paginated list (using `less`) of instance types to choose that fit the memory and CPU requirements.
    + Once an instance type is selected, the tool can be re-run with it as a parameter.

- Running the tool and tailing the logs:

    ```bash
    ./benchmark.sh --instance-type t2.2xlarge --tail
    ```


The tool can be run from a `bash` shell in a terminal or in a container using Podman or Docker.  If choosing the to run it as a container, I highly suggest using Podman.

Running the tool in a container has a number of appealing options:

- Easy.  No need to clone the project.  Also, it depends on the `bash` shell, which not everyone uses.  Installing a shell is easy, but so is running a container, as many devs will already have a container engine installed on their system.
- Refer to the first bullet point.

If running from a shell, the user's AWS credentials must be in `$HOME/.aws/credentials` or exported as environment variables.  In addition, if wanting to tail the logs, then the SSH access key is expected to be in the home directory with the name of `benchmark.pem` (`chmod 0400`).

Tailing the logs from the shell:

```bash
$ ./benchmark.sh --instance-type t2.large -f
```

Note that the logs will be everything that the `user-data` script (see below) is outputting.  This is a nice way to locally capture the output, in addition to it be uploading to S3.  The `tee` utility is especially useful here.

Once the file has been uploaded, it's easy to query it using `awscli`:

```bash
$ aws s3 ls s3://benchmarks1337
2024-09-25 16:37:57       2639 1727304504.foo.log
```

## Podman

Tailing the logs from in a container:

```bash
$ podman run \
    --rm \
    -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
    -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
    -e AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION \
    -v ~/benchmark.pem:/root/benchmark.pem \
    benchmark --instance-type t2.2xlarge -f
```

> When bind mounting the secret key, it must be bound to `/root` in the container.

## References

- [Access instance metadata for an EC2 instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html)
- [Use Amazon EC2 instance metadata for AWS CLI credentials]

[EC2 launch template]: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-launch-template.html
[`user-data`]: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
[`awscli`]: https://aws.amazon.com/cli/
[Use Amazon EC2 instance metadata for AWS CLI credentials]: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-metadata.html

