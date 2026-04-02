const DEFAULT_PISTON_URL = 'http://localhost:2000';

/** Piston execute stage status — failure reasons (two-letter codes). */
const PISTON_STAGE_ERROR_STATUSES = new Set(['RE', 'SG', 'TO', 'OL', 'EL', 'XX']);

function pistonBaseUrl() {
  const raw = process.env.PISTON_URL || DEFAULT_PISTON_URL;
  return String(raw).replace(/\/$/, '');
}

/**
 * Whether a Piston compile/run stage failed (per Piston semantics, not problem grading).
 * @param {object | null | undefined} stage
 * @returns {{ failed: boolean, reason?: string }}
 */
function pistonStageFailed(stage) {
  if (stage == null || typeof stage !== 'object') {
    return { failed: true, reason: 'missing_stage' };
  }

  const statusRaw = stage.status;
  if (statusRaw != null && statusRaw !== '') {
    const st = String(statusRaw).toUpperCase();
    if (PISTON_STAGE_ERROR_STATUSES.has(st)) {
      return { failed: true, reason: st };
    }
  }

  if (stage.signal != null && stage.signal !== '') {
    return { failed: true, reason: 'SG' };
  }

  const code = stage.code;
  if (code != null && Number(code) !== 0) {
    return { failed: true, reason: `exit_${code}` };
  }

  return { failed: false };
}

function formatStageError(stage, stageName) {
  if (!stage || typeof stage !== 'object') return `Piston ${stageName}: (no stage data)`;
  const bits = [];
  bits.push(stageName);
  if (stage.status) bits.push(`status=${stage.status}`);
  if (stage.message) bits.push(String(stage.message).trim());
  const out = [stage.stderr, stage.stdout].filter((s) => s != null && String(s).trim() !== '');
  if (out.length) bits.push(out.join('\n').trim());
  if (stage.code != null && Number(stage.code) !== 0) bits.push(`code=${stage.code}`);
  if (stage.signal != null && stage.signal !== '') bits.push(`signal=${stage.signal}`);
  return bits.filter(Boolean).join(' — ') || `Piston ${stageName}: failed`;
}

/**
 * Read Piston /api/v2/execute JSON: optional `compile`, required successful path uses `run`.
 * @param {object | null} pistonJson
 * @returns {{
 *   pistonOk: boolean,
 *   failedPhase: 'compile' | 'run' | 'response' | null,
 *   compile: object | null,
 *   run: object | null,
 *   stdout: string,
 *   errorMessage: string | null,
 *   runTime: number | null,
 *   memoryUsed: number | null,
 * }}
 */
function parsePistonExecuteResponse(pistonJson) {
  const compile = pistonJson && typeof pistonJson.compile === 'object' ? pistonJson.compile : null;
  const run = pistonJson && typeof pistonJson.run === 'object' ? pistonJson.run : null;

  const runStdout = (s) => {
    if (s == null || typeof s !== 'object') return '';
    if (s.stdout != null) return String(s.stdout);
    if (s.output != null) return String(s.output);
    return '';
  };

  if (compile) {
    const cFail = pistonStageFailed(compile);
    if (cFail.failed) {
      return {
        pistonOk: false,
        failedPhase: 'compile',
        compile,
        run,
        stdout: run ? runStdout(run) : '',
        errorMessage: formatStageError(compile, 'compile'),
        runTime: typeof run?.cpu_time === 'number' ? run.cpu_time : null,
        memoryUsed: typeof run?.memory === 'number' ? run.memory : null,
      };
    }
  }

  if (!run) {
    return {
      pistonOk: false,
      failedPhase: 'response',
      compile,
      run: null,
      stdout: '',
      errorMessage: 'Piston response missing run stage',
      runTime: null,
      memoryUsed: null,
    };
  }

  const rFail = pistonStageFailed(run);
  if (rFail.failed) {
    return {
      pistonOk: false,
      failedPhase: 'run',
      compile,
      run,
      stdout: runStdout(run),
      errorMessage: formatStageError(run, 'run'),
      runTime: typeof run.cpu_time === 'number' ? run.cpu_time : null,
      memoryUsed: typeof run.memory === 'number' ? run.memory : null,
    };
  }

  return {
    pistonOk: true,
    failedPhase: null,
    compile,
    run,
    stdout: runStdout(run),
    errorMessage: null,
    runTime: typeof run.cpu_time === 'number' ? run.cpu_time : null,
    memoryUsed: typeof run.memory === 'number' ? run.memory : null,
  };
}

/**
 * @param {object} opts
 * @param {string} opts.language - Piston language id e.g. "python"
 * @param {string} [opts.version]
 * @param {string} opts.fileName
 * @param {string} opts.content
 * @param {string} [opts.stdin]
 */
async function execute({ language, version = '*', fileName, content, stdin = '' }) {
  const url = `${pistonBaseUrl()}/api/v2/execute`;
  const body = {
    language: String(language).trim(),
    version,
    files: [{ name: fileName, content }],
    stdin: stdin === undefined || stdin === null ? '' : String(stdin),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    json = null;
  }

  if (!res.ok) {
    const err = new Error(json?.message || text || `Piston HTTP ${res.status}`);
    err.code = 'PISTON_HTTP';
    err.status = res.status;
    err.body = text;
    throw err;
  }

  return json;
}

module.exports = {
  execute,
  pistonBaseUrl,
  PISTON_STAGE_ERROR_STATUSES,
  pistonStageFailed,
  parsePistonExecuteResponse,
};
