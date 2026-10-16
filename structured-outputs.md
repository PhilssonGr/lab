# Structured Outputs

> Structured outputs ask the model for a reply that follows a schema, such as named fields, so code can read it.

Asking for a reply that follows a shape, such as fields you name, so code can read it.

Track: Foundations
Access: free
Card: https://bf-lab.netlify.app/structured-outputs
Plain text: https://bf-lab.netlify.app/structured-outputs.md
Last checked: 2026-10-17

## What it is

A schema names the fields and the types you expect, for example a name and a status. Structured outputs tell the API to keep the reply inside that shape. A sentence can hold the same facts and still be hard for code to read.

## Why it matters

**Cost.** The schema does not remove the tokens in the prompt. It can save a later turn whose only job was to fix the shape.

**Quality.** Code can read a field by name. Prose has to be parsed, and a small wording change can break that parse.

**Risk.** A schema constrains the shape, not the truth of the values. A field can be present and still be unsupported by the source.

## Try today

Take one reply you parse by hand. Write down the fields you actually read, and request those fields with the provider's schema option.

## Common mistake

Treating the words "return JSON" in a prompt, or a mode that only checks that the text is JSON, as the same thing as a schema the API enforces.

## Self-check

Code needs a name and a status. What should you send?

A schema that names those fields, through the provider's structured output option

## Practice and deep

Coming soon. One reply you already parse, rewritten as a schema with the fields you read.

Coming soon. How OpenAI, Anthropic, and Gemini each attach a JSON schema to a request.

## Sources

- [OpenAI, Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Anthropic, Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Gemini API, Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)

Vendor API documentation.
