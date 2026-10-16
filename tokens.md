# Tokens

> Tokens are the pieces of text a model reads, writes, and bills for.

The unit models read, write, and bill in.

Track: Foundations
Access: free
Card: https://bf-lab.netlify.app/tokens
Plain text: https://bf-lab.netlify.app/tokens.md
Last checked: 2026-10-16

## What it is

Models don't see words. They see tokens: chunks of text, often parts of words. Every prompt and every reply is counted in tokens.

## Why it matters

**Cost.** Hosted models bill by token, but not every token costs the same. Output usually costs more than input. Cached input can be much cheaper. Some models charge a higher rate once a prompt passes a size threshold.

**Quality.** Tokens spent on leftover instructions are tokens the reply cannot use.

**Risk.** Anything you paste is sent as tokens, including keys, customer text, and private notes.

## Try today

Paste one real prompt into your provider's token counter. Note the input and output tokens, then multiply by the current rates. That gives you the cost per run.

## Common mistake

Assuming the same text is the same number of tokens on every model. Tokenizers change between model versions.

## Self-check

A prompt is longer than a model's size threshold. What can happen to the input rate?

A higher tier can apply

## Practice and deep

Coming soon. One pass over a prompt you already send, cutting text that does not change the task.

Coming soon. How a real tokenizer differs from this slice illustration.

## Sources

Sources pending. No provider doc is cited on this card yet.
