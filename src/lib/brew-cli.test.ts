import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';

// We mock child_process.spawn and feed the consumer with stdout/stderr/close
// events synchronously, so the async generator and the timeout logic can be
// exercised without launching a real `brew` binary.

interface FakeProc extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: ReturnType<typeof vi.fn>;
}

function makeProc(): FakeProc {
  const proc = new EventEmitter() as FakeProc;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn();
  return proc;
}

const mockSpawn = vi.fn();

vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

beforeEach(() => mockSpawn.mockReset());
afterEach(() => vi.resetModules());

describe('brew-cli: execBrew', () => {
  it('resolves with stdout on exit code 0', async () => {
    const proc = makeProc();
    mockSpawn.mockReturnValue(proc);

    const { execBrew } = await import('./brew-cli.js');
    const promise = execBrew(['--version']);

    proc.stdout.emit('data', Buffer.from('Homebrew 5.0\n'));
    proc.emit('close', 0);

    await expect(promise).resolves.toBe('Homebrew 5.0\n');
  });

  it('rejects with stderr message on non-zero exit', async () => {
    const proc = makeProc();
    mockSpawn.mockReturnValue(proc);

    const { execBrew } = await import('./brew-cli.js');
    const promise = execBrew(['outdated']);

    proc.stderr.emit('data', Buffer.from('something exploded'));
    proc.emit('close', 1);

    await expect(promise).rejects.toThrow(/something exploded/);
  });

  it('rejects when spawn emits an error event', async () => {
    const proc = makeProc();
    mockSpawn.mockReturnValue(proc);

    const { execBrew } = await import('./brew-cli.js');
    const promise = execBrew(['outdated']);

    proc.emit('error', new Error('ENOENT'));

    await expect(promise).rejects.toThrow(/Failed to run brew.*ENOENT/);
  });

  it('passes HOMEBREW_NO_AUTO_UPDATE=1 in the env', async () => {
    const proc = makeProc();
    mockSpawn.mockReturnValue(proc);
    const { execBrew } = await import('./brew-cli.js');
    const promise = execBrew(['--version']);

    const opts = mockSpawn.mock.calls[0]![2] as { env: Record<string, string> };
    expect(opts.env.HOMEBREW_NO_AUTO_UPDATE).toBe('1');
    proc.emit('close', 0); // cleanup the open promise
    await promise;
  });

  it('kills the process and rejects on timeout', async () => {
    vi.useFakeTimers();
    try {
      const proc = makeProc();
      mockSpawn.mockReturnValue(proc);

      const { execBrew } = await import('./brew-cli.js');
      const promise = execBrew(['outdated'], 5_000);
      // Attach a no-op handler immediately so the rejection is never observed
      // as unhandled if test machinery flushes the queue out-of-order.
      promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(5_000);
      expect(proc.kill).toHaveBeenCalled();

      await expect(promise).rejects.toThrow(/timed out after 5000ms/);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('brew-cli: streamBrew', () => {
  // streamBrew is an async generator: its body (and the spawn() call) runs on
  // the first .next(). We must therefore arrange for stdout/close events to
  // fire AFTER iteration has started attaching listeners. setImmediate gives
  // the generator a turn to register its handlers before we emit.
  function emitAfterStart(proc: FakeProc, fn: () => void) {
    setImmediate(fn);
    void proc; // keep the proc reference alive across the macro task
  }

  it('yields each non-empty line in order then completes on exit 0', async () => {
    const proc = makeProc();
    mockSpawn.mockReturnValue(proc);

    const { streamBrew } = await import('./brew-cli.js');
    const gen = streamBrew(['install', 'wget']);
    emitAfterStart(proc, () => {
      proc.stdout.emit('data', Buffer.from('==> Downloading\n==> Pouring\n'));
      proc.emit('close', 0);
    });

    const collected: string[] = [];
    for await (const line of gen) collected.push(line);
    expect(collected).toEqual(['==> Downloading', '==> Pouring']);
  });

  it('yields a trailing partial line that has no newline before exit', async () => {
    const proc = makeProc();
    mockSpawn.mockReturnValue(proc);

    const { streamBrew } = await import('./brew-cli.js');
    const gen = streamBrew(['list']);
    emitAfterStart(proc, () => {
      proc.stdout.emit('data', Buffer.from('wget\nfinal-line-no-newline'));
      proc.emit('close', 0);
    });

    const collected: string[] = [];
    for await (const line of gen) collected.push(line);
    expect(collected).toEqual(['wget', 'final-line-no-newline']);
  });

  it('throws after yielding all output on non-zero exit', async () => {
    const proc = makeProc();
    mockSpawn.mockReturnValue(proc);

    const { streamBrew } = await import('./brew-cli.js');
    const gen = streamBrew(['install', 'bad']);
    emitAfterStart(proc, () => {
      proc.stderr.emit('data', Buffer.from('Error: bad\n'));
      proc.emit('close', 1);
    });

    const collected: string[] = [];
    let errMsg = '';
    try {
      for await (const line of gen) collected.push(line);
    } catch (err) {
      errMsg = err instanceof Error ? err.message : String(err);
    }
    expect(collected).toEqual(['Error: bad']);
    expect(errMsg).toMatch(/exited with code 1/);
  });
});
