import { describe, expect, test } from "bun:test";
import { executeCode } from "../src/runner";
import { parseProblemHtml } from "../src/extractor";

describe("Problem Extractor", () => {
  test("parses title and starter code", () => {
    const mockHtml = `
      <h1>Find Lowest Price</h1>
      <section class="fp-statement-section"><p>Test statement.</p></section>
      <code class="fp-function-signature">findLowestPrice(products: String[][], discounts: String[][]) -> int</code>
      <div class="fp-ex"><pre class="fp-example-code"><code>products = [["10"]]\nreturn = 10</code></pre></div>
      <section id="problem-constraints"><li>1 <= n <= 100</li></section>
      <pre class="font-mono">public int findLowestPrice() {}</pre>
    `;
    const parsed = parseProblemHtml("test-id", mockHtml);
    expect(parsed.title).toBe("Find Lowest Price");
    expect(parsed.functionName).toBe("findLowestPrice");
    expect(parsed.examples.length).toBe(1);
    expect(parsed.constraints.length).toBe(1);
  });
});

describe("Code Execution Engine", () => {
  test("runs JavaScript test cases correctly", async () => {
    const code = `
      function add(a, b) {
        return a + b;
      }
    `;
    const testCases = [
      { id: 1, inputRaw: "this.a = 2; this.b = 3;", expectedRaw: "5" },
      { id: 2, inputRaw: "this.a = 10; this.b = 20;", expectedRaw: "30" }
    ];

    const result = await executeCode({
      language: "javascript",
      code,
      functionName: "add",
      testCases
    });

    expect(result.allPassed).toBe(true);
    expect(result.totalPassed).toBe(2);
    expect(result.results[0].passed).toBe(true);
    expect(result.results[1].passed).toBe(true);
  });

  test("catches failing test cases in JavaScript", async () => {
    const code = `
      function multiply(a, b) {
        return a + b; // Intentional bug
      }
    `;
    const testCases = [
      { id: 1, inputRaw: "this.a = 2; this.b = 3;", expectedRaw: "6" }
    ];

    const result = await executeCode({
      language: "javascript",
      code,
      functionName: "multiply",
      testCases
    });

    expect(result.allPassed).toBe(false);
    expect(result.results[0].passed).toBe(false);
  });
});
