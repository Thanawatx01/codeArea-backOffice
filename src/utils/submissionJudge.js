const { execute, parsePistonExecuteResponse } = require('./piston');

/** ชื่อภาษาต้องตรงกับ language id ที่ Piston รองรับ */
const LANGUAGE_MAIN_FILE = {
  python: 'main.py',
  c: 'main.c',
  cpp: 'main.cpp',
  csharp: 'Main.cs',
  java: 'Main.java',
  javascript: 'main.js',
  typescript: 'main.ts',
};

/** Our DB status for submission_test_cases (not Piston stage codes). */
const TEST_PASS = 1;
const TEST_WRONG = 2;
const TEST_ERROR = 3;

function normalizeOutput(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
}

function outputsMatch(expected, actual) {
  return normalizeOutput(expected) === normalizeOutput(actual);
}

/**
 * แมปชื่อ/alias จาก client ให้ตรงกับ key ใน LANGUAGE_MAIN_FILE (และส่งต่อเป็น language ของ Piston)
 * รองรับ: python, c, c++, c#, java, javascript, typescript
 */
const LANGUAGE_ALIASES = {
  py: 'python',
  python3: 'python',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cxx: 'cpp',
  csharp: 'csharp',
  'c#': 'csharp',
  cs: 'csharp',
  dotnet: 'csharp',
  java: 'java',
  javascript: 'javascript',
  js: 'javascript',
  node: 'javascript',
  nodejs: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
};

function normalizePistonLanguage(language) {
  const raw = String(language || '').trim().toLowerCase();
  return LANGUAGE_ALIASES[raw] || raw;
}

function resolveMainFile(language) {
  const key = normalizePistonLanguage(language);
  return LANGUAGE_MAIN_FILE[key] || 'main.txt';
}

/**
 * Map Piston execute JSON to per-test-case row fields using Piston stages (compile + run),
 * then compare stdout only when both stages succeeded per Piston.
 */
function mapPistonExecuteToTestCase(pistonJson, expectedOutput) {
  const parsed = parsePistonExecuteResponse(pistonJson);

  if (!parsed.pistonOk) {
    return {
      status: TEST_ERROR,
      output_data: parsed.stdout || null,
      error_message: parsed.errorMessage,
      run_time: parsed.runTime,
      memory_used: parsed.memoryUsed,
      piston_failed_phase: parsed.failedPhase,
    };
  }

  if (outputsMatch(expectedOutput, parsed.stdout)) {
    return {
      status: TEST_PASS,
      output_data: parsed.stdout,
      error_message: null,
      run_time: parsed.runTime,
      memory_used: parsed.memoryUsed,
      piston_failed_phase: null,
    };
  }

  return {
    status: TEST_WRONG,
    output_data: parsed.stdout,
    error_message: null,
    run_time: parsed.runTime,
    memory_used: parsed.memoryUsed,
    piston_failed_phase: null,
  };
}

/**
 * @param {object} params
 * @param {string} params.language
 * @param {string} params.code
 * @param {{ input_data: string, output_data: string, id?: bigint }} params.testCase
 */
async function runSingleTestCase({ language, code, testCase }) {
  const lang = normalizePistonLanguage(language);
  const fileName = resolveMainFile(lang);
  let pistonJson;
  try {
    pistonJson = await execute({
      language: lang,
      version: '*',
      fileName,
      content: code,
      stdin: testCase.input_data ?? '',
    });
  } catch (e) {
    return {
      status: TEST_ERROR,
      output_data: null,
      error_message: e.message || 'Piston request failed',
      run_time: null,
      memory_used: null,
      piston_failed_phase: 'http',
    };
  }

  return mapPistonExecuteToTestCase(pistonJson, testCase.output_data);
}

/**
 * @param {Array<{ input_data: string, output_data: string, id?: bigint }>} testCases
 * @param {(tc: object) => Promise<object>} runOne
 */
async function runTestCasesSequentialRecursive(testCases, runOne, index = 0, acc = []) {
  if (index >= testCases.length) return acc;
  const row = await runOne(testCases[index]);
  acc.push(row);
  return runTestCasesSequentialRecursive(testCases, runOne, index + 1, acc);
}

module.exports = {
  LANGUAGE_MAIN_FILE,
  TEST_PASS,
  TEST_WRONG,
  TEST_ERROR,
  normalizeOutput,
  outputsMatch,
  resolveMainFile,
  mapPistonExecuteToTestCase,
  runSingleTestCase,
  runTestCasesSequentialRecursive,
};
