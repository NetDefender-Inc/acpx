import assert from "node:assert/strict";
import readline from "node:readline/promises";
import test from "node:test";
import { promptForPermission } from "../src/permission-prompt.js";

test("promptForPermission returns false when stdin or stderr is not a TTY", async () => {
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
  const stderrDescriptor = Object.getOwnPropertyDescriptor(process.stderr, "isTTY");

  Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true });
  Object.defineProperty(process.stderr, "isTTY", { value: true, configurable: true });

  try {
    const allowed = await promptForPermission({ prompt: "Allow? " });
    assert.equal(allowed, false);
  } finally {
    if (stdinDescriptor) {
      Object.defineProperty(process.stdin, "isTTY", stdinDescriptor);
    } else {
      delete (process.stdin as { isTTY?: boolean }).isTTY;
    }

    if (stderrDescriptor) {
      Object.defineProperty(process.stderr, "isTTY", stderrDescriptor);
    } else {
      delete (process.stderr as { isTTY?: boolean }).isTTY;
    }
  }
});

test("promptForPermission writes header/details and accepts yes answers", async () => {
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
  const stderrDescriptor = Object.getOwnPropertyDescriptor(process.stderr, "isTTY");
  const originalCreateInterface = readline.createInterface;
  const originalWrite = process.stderr.write.bind(process.stderr);
  const writes: string[] = [];

  Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
  Object.defineProperty(process.stderr, "isTTY", { value: true, configurable: true });

  let closeCalls = 0;
  (
    readline as unknown as {
      createInterface: typeof readline.createInterface;
    }
  ).createInterface = (() => ({
    question: async (prompt: string) => {
      writes.push(prompt);
      return "  YES ";
    },
    close: () => {
      closeCalls += 1;
    },
  })) as unknown as typeof readline.createInterface;
  (process.stderr as unknown as { write: typeof process.stderr.write }).write = ((
    chunk: string,
  ) => {
    writes.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  try {
    const allowed = await promptForPermission({
      prompt: "Allow? ",
      header: "Permission Request",
      details: "Tool wants to edit a file.",
    });

    assert.equal(allowed, true);
    assert.equal(closeCalls, 1);
    assert.deepEqual(writes, ["\nPermission Request\n", "Tool wants to edit a file.\n", "Allow? "]);
  } finally {
    (
      readline as unknown as {
        createInterface: typeof readline.createInterface;
      }
    ).createInterface = originalCreateInterface;
    (process.stderr as unknown as { write: typeof process.stderr.write }).write = originalWrite;

    if (stdinDescriptor) {
      Object.defineProperty(process.stdin, "isTTY", stdinDescriptor);
    } else {
      delete (process.stdin as { isTTY?: boolean }).isTTY;
    }

    if (stderrDescriptor) {
      Object.defineProperty(process.stderr, "isTTY", stderrDescriptor);
    } else {
      delete (process.stderr as { isTTY?: boolean }).isTTY;
    }
  }
});

test("promptForPermission rejects non-yes answers and skips blank details", async () => {
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
  const stderrDescriptor = Object.getOwnPropertyDescriptor(process.stderr, "isTTY");
  const originalCreateInterface = readline.createInterface;
  const originalWrite = process.stderr.write.bind(process.stderr);
  const writes: string[] = [];

  Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
  Object.defineProperty(process.stderr, "isTTY", { value: true, configurable: true });

  (
    readline as unknown as {
      createInterface: typeof readline.createInterface;
    }
  ).createInterface = (() => ({
    question: async () => "no",
    close: () => {},
  })) as unknown as typeof readline.createInterface;
  (process.stderr as unknown as { write: typeof process.stderr.write }).write = ((
    chunk: string,
  ) => {
    writes.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  try {
    const allowed = await promptForPermission({
      prompt: "Allow? ",
      header: "Header",
      details: "   ",
    });

    assert.equal(allowed, false);
    assert.deepEqual(writes, ["\nHeader\n"]);
  } finally {
    (
      readline as unknown as {
        createInterface: typeof readline.createInterface;
      }
    ).createInterface = originalCreateInterface;
    (process.stderr as unknown as { write: typeof process.stderr.write }).write = originalWrite;

    if (stdinDescriptor) {
      Object.defineProperty(process.stdin, "isTTY", stdinDescriptor);
    } else {
      delete (process.stdin as { isTTY?: boolean }).isTTY;
    }

    if (stderrDescriptor) {
      Object.defineProperty(process.stderr, "isTTY", stderrDescriptor);
    } else {
      delete (process.stderr as { isTTY?: boolean }).isTTY;
    }
  }
});
