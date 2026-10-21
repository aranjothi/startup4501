# Startup 2: IssueReady — Validated GitHub issue triage

**Inspired by:** [OneCLI](https://www.ycombinator.com/companies/onecli), which describes agents working across business applications with externally enforced permissions, protected credentials, and logged actions. IssueReady narrows that approach to preparing reproducible bug reports for small software teams. Source reviewed October 15, 2026.

**Proposed product:** Convert an incomplete GitHub bug report into an evidence-backed reproduction packet, or a precise request for missing information. This is an independent proposal, not an affiliation with OneCLI. Founder skill and customer-access assumptions require verification.

## 1. Solves one problem extremely well

Reduce the time maintainers spend figuring out whether a newly reported bug can be reproduced. The MVP supports JavaScript/TypeScript repositories with an existing containerized test command. It produces an environment description, reproduction steps, and captured results. It excludes autonomous fixes, production incident response, and general coding assistance. Measure maintainer minutes per accepted reproduction packet against manual triage.

## 2. You know the target customers or have direct access to them

Target maintainers of small open-source projects and student software teams who already handle GitHub issues. A credible access route is a project the founder contributes to or a local developer group; neither relationship is assumed to exist. Secure three consenting maintainers and ten historical issues per repository before product development. This criterion is met when those maintainers provide repository access and commit to reviewing pilot results, rather than merely being reachable online.

## 3. You are familiar with, or can quickly learn, most required infrastructure

Use a GitHub App, a web dashboard, a Python orchestration worker, PostgreSQL, a hosted coding model, and isolated ephemeral execution environments. GitHub webhooks, scoped installation tokens, queues, and test-runner integration are learnable extensions of ordinary web development. Sandboxing untrusted repository code is the largest infrastructure gap: use a managed isolated execution service or dedicated disposable VMs, not a shared application container. Demonstrate isolation and teardown before accepting external repositories.

## 4. Reimagines the problem space to make it significantly better

Move triage from reading an AI summary to inspecting a replayable experiment. For a report saying “export breaks,” the system identifies missing inputs, attempts a minimal reproduction, and supplies a concrete command and observed output. If it cannot reproduce the issue, it says so through a fixed status field and proposes validated clarification questions. The advantage to test is fewer maintainer back-and-forth messages, not more generated prose.

## 5. An LLM/Generative model is core to the solution

The LLM maps ambiguous issue language to likely code paths, constructs candidate test harnesses, and adapts reproduction attempts to runtime errors. Static templates cannot infer this bridge between an issue description and a particular repository. Generation is central to building the experiment; execution provides the evidence.

## 6. Validation Guardrail: No LLM-generated artifact reaches the user without passing through a validator

All candidate scripts, findings, and questions remain internal until approved. A validator checks schema, repository paths, source references, credential patterns, and permitted operations. Candidate code must pass policy checks before running in an isolated environment with no credentials, no production access, bounded resources, and restricted networking.

The worker reruns a reproduction from a clean snapshot and attaches its command, commit SHA, environment digest, exit code, and log references. A claimed failure must actually occur; a claim that a regression test isolates a bug requires a control run that passes. Otherwise label the result only as an observed failure. Render findings from verified structured evidence and fixed templates. Validate any generated clarification text for relevance and unsupported assumptions; uncertain questions require maintainer-side pilot reviewer validation before delivery. The dashboard and GitHub publisher accept only approved artifact hashes. This gate includes generated code offered for download.

## 7. Self-Correction Loop: Validation errors automatically feed back into the LLM

Feed errors such as `MISSING_PATH`, `NONREPRODUCIBLE_RESULT`, or `FORBIDDEN_NETWORK_CALL`, along with sanitized execution logs, back into the model. Automatically revise and revalidate for up to three total attempts under a fixed runtime budget. Every revision reruns policy checks and clean execution. Exhaustion returns a fixed “reproduction not established” status; rejected code and prose remain inaccessible. Human reviewer rejection also triggers this correction workflow rather than manual copy editing.

## 8. Deployability: If built, you are able to fully deploy it

Host the dashboard/API, database, queue, and worker on managed infrastructure; run repository workloads in a separate sandbox account. Store GitHub credentials in a server-side vault, grant repository-scoped permissions, and keep secrets out of model prompts and execution sandboxes. Initially publish approved packets only to the dashboard; optional GitHub comments require explicit repository-owner enablement. Add webhook verification, tenant isolation, audit logs, budget caps, backups, and a job cancellation switch.

Deployment acceptance requires processing an installed test repository, blocking a prohibited script, rejecting a fabricated finding, and cleaning up every sandbox after a timeout. A solo builder with web and container experience can deploy this bounded MVP, conditional on proving sandbox isolation and obtaining GitHub/model/hosting accounts.

## Smallest paid pilot

Replay 30 historical issues for three maintainers, then run on newly submitted issues with permission. Test a proposed $49 per repository per month. Continue if at least half of eligible reports yield accepted reproduction packets and median maintainer triage time falls by 30%. Treat these as experiment thresholds, not forecasted performance.
