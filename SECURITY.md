# Security policy

## Supported versions

Security fixes are developed against the latest release. Before a first tagged release, use of this project is experimental and no release support window is promised.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. If private reporting is unavailable, contact the maintainer through the email address listed on the GitHub profile. Do not post exploit details in a public issue.

## Scope and threat model

This project configures Codex and supplies host-side file tools. It is intended to reduce accidental access by limiting the Codex app-server configuration to one workspace, disabling network access, and exposing only explicitly registered workspace tools.

It does not protect against a compromised host, a malicious process already running as the same user, an unsafe parent application that dispatches arbitrary tools, a vulnerable Codex build, or files intentionally placed inside the writable workspace. Hosts must authenticate their app-server transport, validate thread and turn ownership, and authorize every custom tool call.

The project is not an OpenAI product and is not affiliated with or endorsed by OpenAI.
