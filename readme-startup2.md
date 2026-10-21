# Startup 2: IssueReady — Validated GitHub issue triage

**Inspired by:** [OneCLI](https://www.ycombinator.com/companies/onecli). We're taking its approach to agents working across applications with controlled permissions and applying it to bug triage. IssueReady is our own project idea, separate from OneCLI.

**Our idea:** We want to turn incomplete GitHub bug reports into reproducible examples, with the commands and logs to back them up. When we can't reproduce a bug, we'll return specific questions about the missing information.

## 1. Solves one problem extremely well.

Maintainers spend too much time working out what a bug report actually means and whether they can reproduce it. We'll start with JavaScript/TypeScript repositories that already have a containerized test command. Each result will include the environment, reproduction steps, and captured output.

We're keeping fixes and production incident response outside the first version. We'll measure whether our tool reduces the time a maintainer spends getting to an accepted reproduction.

## 2. You know the target customers or have direct access to them.

Our first users would be maintainers of small open-source projects and software teams that handle GitHub issues. We plan to recruit through projects we contribute to and local developer groups. We still need to confirm those connections.

Before building the full workflow, we want three maintainers to give us repository access and ten historical issues each. We'll ask them to review our results and compare them with their normal triage process.

## 3. You are familiar with (or can quickly learn) most of the required infrastructure.

We'd use a GitHub App, web dashboard, Python worker, PostgreSQL, and a hosted coding model. The worker would process queued issues and run candidate reproductions in disposable, isolated environments.

The biggest technical challenge is running untrusted repository code safely. We'll use a managed sandbox service or dedicated disposable VMs, with no credentials or production access. We need to demonstrate isolation and cleanup before accepting outside repositories.

Our three developers can split the work across the GitHub/dashboard experience, backend and sandbox infrastructure, and model generation and validation. We'll integrate a complete test-repository workflow early.

## 4. Reimagines the problem space to make it significantly better.

We want maintainers to receive an experiment they can rerun. For a report like “export breaks,” we'd identify missing inputs, attempt a minimal reproduction, and return the command and observed output. If reproduction fails, the result will say so and include validated clarification questions.

We'll compare the number of follow-up messages and time spent with manual triage to see whether this approach helps.

## 5. An LLM/Generative model is core to the solution (no generic "chatbot in a sidebar").

The model connects an ambiguous report to likely code paths, writes candidate test harnesses, and revises them using execution errors. We need that flexibility because each report and repository is different. The model proposes the experiment; execution supplies the evidence.

## 6. Validation Guardrail: No LLM-generated artifact reaches the user without passing through a validator.

Scripts, findings, and clarification questions stay internal until validation passes. We'll check their structure, repository paths, source references, credential patterns, and permitted operations. Code must pass these checks before it runs in a sandbox with restricted networking and resource limits.

We'll rerun each reproduction from a clean snapshot and record the command, commit SHA, environment digest, exit code, and logs. We won't call something a reproduced failure unless it actually happens. To claim a test isolates a bug, we'll also require a passing control run; otherwise we'll label it an observed failure.

We'll render findings from verified data and fixed templates. Generated questions must be relevant and avoid unsupported assumptions; uncertain questions go to a designated maintainer reviewer before delivery. The dashboard, downloads, and any GitHub publishing will accept only approved artifact hashes.

## 7. Self-Correction Loop: Validation errors must automatically feed back into the LLM to retry/correct.

Validation errors such as `MISSING_PATH`, `NONREPRODUCIBLE_RESULT`, and `FORBIDDEN_NETWORK_CALL` will go back to the model with sanitized logs. We'll allow three total attempts within a fixed runtime budget, repeating policy checks and clean execution each time.

Reviewer rejections use the same loop. If all attempts fail, we'll return a fixed “reproduction not established” status and keep rejected code and text hidden.

## 8. Deployability: If built, you are able to fully deploy it.

We'll host the dashboard, API, database, queue, and worker on managed infrastructure, with repository execution in a separate sandbox account. GitHub credentials will stay in a server-side vault and out of prompts and execution environments.

We'll start by showing approved results in the dashboard. GitHub comments will require the repository owner's explicit enablement. We'll also add webhook verification, tenant isolation, audit logs, spending limits, backups, and job cancellation.

Before release, we'll process a test repository, block a prohibited script, reject a fabricated finding, and confirm cleanup after timeouts. Our team will own deployment; sandbox isolation and access to GitHub, model, and hosting accounts are still prerequisites.
