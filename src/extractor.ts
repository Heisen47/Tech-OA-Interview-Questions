export interface TestCase {
  id: number;
  inputRaw: string;
  expectedRaw: string;
  explanation?: string;
}

export interface ProblemDetail {
  id: string;
  title: string;
  company?: string;
  format?: string;
  statementHtml: string;
  statementText: string;
  functionName: string;
  signature: string;
  parameters: Array<{ name: string; type: string }>;
  returnType: string;
  examples: TestCase[];
  testCases: TestCase[];
  constraints: string[];
  starterCodes: {
    python: string;
    javascript: string;
    java: string;
    cpp: string;
  };
}

function decodeEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&le;/g, '<=')
    .replace(/&ge;/g, '>=')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export function parseProblemHtml(id: string, html: string): ProblemDetail {
  // Title
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = titleMatch ? decodeEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim()) : id;

  // Statement
  const statementMatch = html.match(/<section class="fp-statement-section"[^>]*>([\s\S]*?)<\/section>/);
  const statementHtml = statementMatch ? decodeEntities(statementMatch[1].trim()) : '<p>Problem statement not available.</p>';
  const statementText = decodeEntities(statementHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

  // Function signature
  const funcMatch = html.match(/<code class="fp-function-signature">([\s\S]*?)<\/code>/);
  let signatureRaw = '';
  let functionName = 'solve';
  const parameters: Array<{ name: string; type: string }> = [];
  let returnType = 'any';

  if (funcMatch) {
    signatureRaw = decodeEntities(funcMatch[1].replace(/<[^>]+>/g, '').trim());
    const sigParse = signatureRaw.match(/([a-zA-Z0-9_]+)\s*\((.*?)\)\s*(?:→|->)\s*([a-zA-Z0-9_\[\]]+)/);
    if (sigParse) {
      functionName = sigParse[1].trim();
      const paramsStr = sigParse[2].trim();
      returnType = sigParse[3].trim();

      if (paramsStr) {
        const paramParts = paramsStr.split(',');
        for (const part of paramParts) {
          const colonIdx = part.indexOf(':');
          if (colonIdx !== -1) {
            parameters.push({
              name: part.slice(0, colonIdx).trim(),
              type: part.slice(colonIdx + 1).trim()
            });
          } else {
            parameters.push({ name: part.trim(), type: 'any' });
          }
        }
      }
    }
  }

  // Starter code from editor
  const starterMatch = html.match(/<pre class="[^"]*font-mono[^"]*">([\s\S]*?)<\/pre>/);
  const rawStarter = starterMatch ? decodeEntities(starterMatch[1].replace(/^\d+:\s*/gm, '').trim()) : '';

  // If functionName is still solve, check rawStarter
  if (functionName === 'solve' && rawStarter) {
    const fnMatch = rawStarter.match(/([a-zA-Z0-9_]+)\s*\(/);
    if (fnMatch) {
      functionName = fnMatch[1];
    }
  }

  // Examples
  const examples: TestCase[] = [];
  const codeRegex = /<pre class="fp-example-code"><code>([\s\S]*?)<\/code><\/pre>/g;
  let codeMatch;
  let testId = 1;

  while ((codeMatch = codeRegex.exec(html)) !== null) {
    const withNewlines = codeMatch[1]
      .replace(/<span class="fp-code-line">/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n');
    const cleanCode = decodeEntities(withNewlines.replace(/<[^>]+>/g, '').trim());
    const lines = cleanCode.split('\n').map(l => l.trim()).filter(Boolean);
    let returnVal = '';
    const inputLines: string[] = [];

    for (const line of lines) {
      if (/^(return|output)\s*=/i.test(line)) {
        returnVal = line.replace(/^(return|output)\s*=\s*/i, '').trim();
      } else {
        inputLines.push(line);
      }
    }

    const inputRaw = inputLines.join('\n');
    examples.push({
      id: testId++,
      inputRaw,
      expectedRaw: returnVal,
      explanation: ''
    });
  }

  // Constraints
  const constraints: string[] = [];
  const constrMatch = html.match(/<section id="problem-constraints"[^>]*>([\s\S]*?)<\/section>/);
  if (constrMatch) {
    const liMatches = [...constrMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)];
    for (const li of liMatches) {
      constraints.push(decodeEntities(li[1].replace(/<[^>]+>/g, '').trim()));
    }
  }

  // Fallback test cases if none parsed
  const testCases = examples.length > 0 ? examples : [
    {
      id: 1,
      inputRaw: parameters.map(p => `${p.name} = ...`).join('\n') || 'input = []',
      expectedRaw: '0',
      explanation: 'Sample test case'
    }
  ];

  // Generate starter code for Python, JavaScript, Java, C++
  const pyParams = parameters.map(p => p.name).join(', ');
  const jsParams = pyParams;

  const pythonStarter = `def ${functionName}(${pyParams}):\n    # Write your solution here\n    pass\n`;
  const jsStarter = `function ${functionName}(${jsParams}) {\n    // Write your solution here\n    return null;\n}\n`;
  const javaStarter = rawStarter.includes('class') ? rawStarter : `class Solution {\n    ${rawStarter || `public int ${functionName}() {\n        return 0;\n    }`}\n}`;
  const cppStarter = `#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    // Implement ${functionName}\n};\n`;

  return {
    id,
    title,
    statementHtml,
    statementText,
    functionName,
    signature: signatureRaw || `${functionName}(${parameters.map(p => `${p.name}: ${p.type}`).join(', ')}) -> ${returnType}`,
    parameters,
    returnType,
    examples,
    testCases,
    constraints,
    starterCodes: {
      python: pythonStarter,
      javascript: jsStarter,
      java: javaStarter,
      cpp: cppStarter
    }
  };
}
