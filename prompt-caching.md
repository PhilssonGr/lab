# Prompt Caching

> Prompt caching reuses an unchanged prefix of a prompt so a later request can skip processing that part again.

Reusing an unchanged prefix so a repeated prompt can cost less than sending it from scratch.

Track: Foundations
Access: free
Card: https://bf-lab.netlify.app/prompt-caching
Plain text: https://bf-lab.netlify.app/prompt-caching.md
Last checked: 2026-10-17

## What it is

A prompt often starts with the same instructions or the same document, then ends with a new question. Prompt caching keeps that shared beginning, the prefix, so a later request can reuse it instead of processing those tokens from scratch.

## Why it matters

**Cost.** A reused prefix can be billed at a lower input rate than processing that text again. A cache hit is not guaranteed, and each provider sets its own size rule and time limit.

**Quality.** The new question is still processed. Caching does not answer it for you.

**Risk.** The prefix is still sent to the provider. A change to the prefix, the model, or the tool list can mean the earlier prefix is not reused.

## Try today

Take one prompt you send often. Put the stable instructions and the stable document first, and the part that changes last. Send it twice and look for a cached-input count in the usage report.

## Common mistake

Editing the start of the prompt, or switching the model or the tools, and expecting the previous prefix to be reused.

## Self-check

The instructions and the document stay the same. Only the question changes. What can be reused?

The unchanged prefix

## Practice and deep

Coming soon. One prompt you already send, with the stable part moved to the front.

Coming soon. How OpenAI, Anthropic, and Gemini each decide that a prefix matches.

## Sources

- [OpenAI, Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- [Anthropic, Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Gemini API, Context caching](https://ai.google.dev/gemini-api/docs/caching)

Vendor API documentation.
