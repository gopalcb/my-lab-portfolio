import { readFile } from "node:fs/promises";
import { strict as assert } from "node:assert";

const html = await readFile(new URL("../public/contact/index.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

assert.ok(script, "contact inline script is present");
assert.match(html, /<input[\s\S]*name="email"[\s\S]*required/);
assert.match(html, /<textarea[\s\S]*name="message"[\s\S]*required/);
assert.match(html, /JSON\.stringify\(\{ email: emailValue, message: messageValue \}\)/);
assert.match(html, /Thank you for contacting me\. Your message has been sent\./);
assert.doesNotMatch(html, /jsonplaceholder|Demo delivery only|MOCK_ENDPOINT/);
new Function(script);

console.log("Contact form verification passed.");
