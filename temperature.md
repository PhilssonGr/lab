# Temperature

> Temperature is a sampling control that shifts how often less likely next tokens are picked.

A sampling control that shifts how often less likely next tokens are picked.

Track: Foundations
Access: free
Card: https://bf-lab.netlify.app/temperature
Plain text: https://bf-lab.netlify.app/temperature.md
Last checked: 2026-10-17

## What it is

Temperature is a number a request can send with the prompt. It changes how the next token is picked. Lower makes the leading candidate more dominant. Higher gives less likely candidates more of a chance. The allowed range is not the same on every model, and some current models ignore a custom value or reject it.

## Why it matters

**Cost.** Temperature is not its own charge. The bill is still the tokens the request reads and writes. You pay more only if the setting makes the reply longer or makes you send the request again.

**Quality.** Lower keeps the reply closer to the leading candidate, which often fits a fixed shape. Higher lets less likely tokens through, which varies the wording. Gemini's prompting guide says earlier Gemini 3 models should keep the default, and that Gemini 4 and Gemini 3.6+ ignore a custom temperature.

**Risk.** A low temperature can still produce a confident wrong sentence. Anthropic's Messages API says that even 0.0 is not fully deterministic on models that accept it. OpenAI says to change temperature or top_p, not both.

## Try today

Take a prompt you already send. If the model accepts temperature, run it once at the default and once lower, and change nothing else. See whether the reply stays in the shape you asked for.

## Common mistake

Using a low temperature as a fact check, or expecting one number to mean the same thing on every model.

## Self-check

Which of these is temperature?

A sampling control

## Practice and deep

Coming soon. Run one prompt at two temperatures and keep the reply that still matches the shape.

Coming soon. How a provider rescales token scores before a token is picked, and why a model can ignore the setting.

## Sources

- [OpenAI, Chat API: temperature](https://developers.openai.com/api/reference/resources/chat)
- [Anthropic, Messages API: temperature](https://platform.claude.com/docs/en/api/messages)
- [Gemini, prompting strategies: temperature](https://ai.google.dev/gemini-api/docs/prompting-strategies)

Opened 2026-10-17. Each page is a provider doc. The card does not add a rate or a usage count.
