export interface TestRequest {
  language: 'python' | 'javascript' | 'java' | 'cpp';
  code: string;
  functionName: string;
  testCases: Array<{
    id: number;
    inputRaw: string;
    expectedRaw: string;
  }>;
}

export interface TestCaseResult {
  id: number;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  executionTimeMs: number;
  error?: string | null;
}

export interface ExecutionResponse {
  allPassed: boolean;
  totalPassed: number;
  totalTests: number;
  results: TestCaseResult[];
  stdout: string;
  compileError?: string | null;
}

export async function executeCode(req: TestRequest): Promise<ExecutionResponse> {
  const { language, code, functionName, testCases } = req;

  if (language === 'python') {
    return runPython(code, functionName, testCases);
  } else if (language === 'javascript') {
    return runJavaScript(code, functionName, testCases);
  } else if (language === 'cpp' || language === 'java') {
    return runViaWandbox(language, code, functionName, testCases);
  }

  return {
    allPassed: false,
    totalPassed: 0,
    totalTests: testCases.length,
    results: [],
    stdout: '',
    compileError: `Unsupported language: ${language}`
  };
}

async function runPython(code: string, functionName: string, testCases: Array<{ id: number; inputRaw: string; expectedRaw: string }>): Promise<ExecutionResponse> {
  const testDataJson = JSON.stringify(testCases);

  const harness = `
import sys, json, time

# User solution
${code}

raw_tests = ${testDataJson}
results = []
stdout_captured = []

target_fn = globals().get(${JSON.stringify(functionName)})

for tc in raw_tests:
    tc_id = tc["id"]
    inp = tc["inputRaw"]
    exp_str = tc["expectedRaw"]
    
    if not target_fn:
        results.append({
            "id": tc_id,
            "passed": False,
            "input": inp,
            "expected": exp_str,
            "actual": "",
            "executionTimeMs": 0,
            "error": f"Function '${functionName}' not found in code."
        })
        continue

    scope = {}
    try:
        # Prepare inputs
        exec(inp, globals(), scope)
        args = list(scope.values())
        
        # Parse expected
        expected = None
        try:
            expected = json.loads(exp_str)
        except Exception:
            try:
                expected = eval(exp_str)
            except Exception:
                expected = exp_str.strip()

        t0 = time.perf_counter()
        actual = target_fn(*args)
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

        def is_equal(a, b):
            if a == b: return True
            try:
                return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)
            except Exception:
                return str(a).strip() == str(b).strip()

        passed = is_equal(actual, expected)
        results.append({
            "id": tc_id,
            "passed": bool(passed),
            "input": inp,
            "expected": json.dumps(expected) if isinstance(expected, (dict, list)) else str(expected),
            "actual": json.dumps(actual) if isinstance(actual, (dict, list)) else str(actual),
            "executionTimeMs": elapsed_ms,
            "error": None
        })
    except Exception as e:
        results.append({
            "id": tc_id,
            "passed": False,
            "input": inp,
            "expected": exp_str,
            "actual": "",
            "executionTimeMs": 0,
            "error": str(e)
        })

print("__OUTPUT_START__" + json.dumps(results) + "__OUTPUT_END__")
`;

  try {
    const proc = Bun.spawn(['python', '-c', harness], {
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const stdoutText = await new Response(proc.stdout).text();
    const stderrText = await new Response(proc.stderr).text();
    await proc.exited;

    const match = stdoutText.match(/__OUTPUT_START__([\s\S]*?)__OUTPUT_END__/);
    if (!match) {
      return {
        allPassed: false,
        totalPassed: 0,
        totalTests: testCases.length,
        results: [],
        stdout: stdoutText,
        compileError: stderrText || 'Execution failed or timed out.'
      };
    }

    const results: TestCaseResult[] = JSON.parse(match[1]);
    const totalPassed = results.filter(r => r.passed).length;
    const cleanStdout = stdoutText.replace(/__OUTPUT_START__[\s\S]*?__OUTPUT_END__/, '').trim();

    return {
      allPassed: totalPassed === testCases.length && testCases.length > 0,
      totalPassed,
      totalTests: testCases.length,
      results,
      stdout: cleanStdout,
      compileError: null
    };
  } catch (err: any) {
    // Fallback to wandbox if local python is unavailable
    return runPythonWandbox(harness, testCases);
  }
}

async function runPythonWandbox(harness: string, testCases: any[]): Promise<ExecutionResponse> {
  const res = await fetch('https://wandbox.org/api/compile.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compiler: 'cpython-3.12.7',
      code: harness
    })
  });
  const data = await res.json() as any;
  const stdout = data.program_output || '';
  const match = stdout.match(/__OUTPUT_START__([\s\S]*?)__OUTPUT_END__/);

  if (!match) {
    return {
      allPassed: false,
      totalPassed: 0,
      totalTests: testCases.length,
      results: [],
      stdout,
      compileError: data.compiler_error || data.program_error || 'Execution failed.'
    };
  }

  const results: TestCaseResult[] = JSON.parse(match[1]);
  const totalPassed = results.filter(r => r.passed).length;
  return {
    allPassed: totalPassed === testCases.length,
    totalPassed,
    totalTests: testCases.length,
    results,
    stdout: stdout.replace(/__OUTPUT_START__[\s\S]*?__OUTPUT_END__/, '').trim(),
    compileError: null
  };
}

async function runJavaScript(code: string, functionName: string, testCases: Array<{ id: number; inputRaw: string; expectedRaw: string }>): Promise<ExecutionResponse> {
  const results: TestCaseResult[] = [];
  let userStdout = '';

  for (const tc of testCases) {
    const start = performance.now();
    try {
      const runnerCode = `
        ${code}
        const logs = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        
        // Execute input assignments
        ${tc.inputRaw}
        
        let targetFn = null;
        try { targetFn = ${functionName}; } catch (_) {}
        if (typeof targetFn !== 'function') {
          throw new Error("Function '${functionName}' is not defined");
        }

        // Collect variables declared in input
        const varNames = Object.keys(this).filter(k => k !== 'targetFn' && k !== 'logs' && k !== 'originalLog');
        const args = varNames.map(k => this[k]);
        
        const actual = targetFn(...args);
        console.log = originalLog;
        return { actual, logs: logs.join('\\n') };
      `;

      const fn = new Function(runnerCode);
      const output = fn.call({});
      const duration = Math.round((performance.now() - start) * 100) / 100;

      let expected: any;
      try {
        expected = JSON.parse(tc.expectedRaw);
      } catch (_) {
        expected = tc.expectedRaw.trim();
      }

      const passed = JSON.stringify(output.actual) === JSON.stringify(expected) || String(output.actual).trim() === String(expected).trim();

      if (output.logs) userStdout += (userStdout ? '\n' : '') + output.logs;

      results.push({
        id: tc.id,
        passed,
        input: tc.inputRaw,
        expected: JSON.stringify(expected),
        actual: JSON.stringify(output.actual),
        executionTimeMs: duration,
        error: null
      });
    } catch (err: any) {
      results.push({
        id: tc.id,
        passed: false,
        input: tc.inputRaw,
        expected: tc.expectedRaw,
        actual: '',
        executionTimeMs: 0,
        error: err.message || String(err)
      });
    }
  }

  const totalPassed = results.filter(r => r.passed).length;
  return {
    allPassed: totalPassed === testCases.length && testCases.length > 0,
    totalPassed,
    totalTests: testCases.length,
    results,
    stdout: userStdout,
    compileError: null
  };
}

async function runViaWandbox(language: 'cpp' | 'java', code: string, functionName: string, testCases: any[]): Promise<ExecutionResponse> {
  const compiler = language === 'cpp' ? 'gcc-head' : 'openjdk-jdk-21.0.3';
  
  const res = await fetch('https://wandbox.org/api/compile.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compiler,
      code
    })
  });

  const data = await res.json() as any;
  const stdout = data.program_output || '';
  const err = data.compiler_error || data.program_error || '';

  return {
    allPassed: false,
    totalPassed: 0,
    totalTests: testCases.length,
    results: testCases.map(tc => ({
      id: tc.id,
      passed: false,
      input: tc.inputRaw,
      expected: tc.expectedRaw,
      actual: stdout || 'Output in console',
      executionTimeMs: 0,
      error: err || null
    })),
    stdout,
    compileError: err || null
  };
}
