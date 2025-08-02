const PASSES = 20;
const ITERATIONS = 1000000;
const STRINGS = 100000;
const STRLENS = [3, 500];
const NUMBERS = 100000;
const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-=_+,/.<>?;\':"[]{}\\|';

type StringAlias = string;
type NumAlias = number;

class StringWrapper {
  private readonly data: string;
  constructor(s: string) {
    this.data = s;
  }

  static concat(s1: StringWrapper, s2: StringWrapper): StringWrapper {
    return new StringWrapper(s1.data + s2.data);
  }
}

class StringFakeWrapper {
  constructor() {throw new Error(`Do not use this class at runtime. See static from(), and use static helpers.`)}

  static from(value: string): StringFakeWrapper {
    return value as unknown as StringFakeWrapper;  // Typecheck occurrences as this class, but dont really use it
  }

  static concat(sw1: StringFakeWrapper, sw2: StringFakeWrapper): StringFakeWrapper {
    const s1 = sw1 as unknown as string;
    const s2 = sw2 as unknown as string;
    return (s1 + s2) as unknown as StringFakeWrapper;
  }
}

class NumberWrapper {
  private readonly data: number;
  constructor(n: number) {
    this.data = n;
  }

  static plustimes(n1: NumberWrapper, n2: NumberWrapper): NumberWrapper {
    const s1 = n1.data;
    const s2 = n2.data;
    return new NumberWrapper(s1 + s2 + s1 * s2);
  }
}

class NumberFakeWrapper {
  constructor() {throw new Error(`Do not use this class at runtime. See static from(), and use static helpers.`)}

  static from(value: number): NumberFakeWrapper {
    return value as unknown as NumberFakeWrapper;  // Typecheck occurrences as this class, but dont really use it
  }

  static plustimes(n1: NumberFakeWrapper, n2: NumberFakeWrapper): NumberFakeWrapper {
    const s1 = n1 as unknown as number;
    const s2 = n2 as unknown as number;
    return (s1 + s2 + s1 * s2) as unknown as NumberFakeWrapper;
  }
}

class Main {
  someStrings = makeStrings();
  someNumbers = makeNumbers();

  constructor() {
    setTimeout(async () => await this.runBenchmarks(), 2000);
  }

  async runBenchmarks() {
    const fns: [string, (n: number) => Promise<void>][] = [
      ['runStringAlias',       async (n: number) => await this.runStringAlias(n)],
      ['runNumAlias',          async (n: number) => await this.runNumAlias(n)],
      ['runStringWrapper',     async (n: number) => await this.runStringWrapper(n)],
      ['runNumWrapper',        async (n: number) => await this.runNumWrapper(n)],
      ['runStringFakeWrapper', async (n: number) => await this.runStringFakeWrapper(n)],
      ['runNumFakeWrapper',    async (n: number) => await this.runNumFakeWrapper(n)],
    ];

    console.log(`pass,testName,iterations,durationMs`);
    for (let i = 0; i < PASSES; i++) {
      for (const [name, fn] of shuffle(fns)) {
        const start = Date.now();
        //tlog(`Starting: ${name} (${ITERATIONS})`);
        await fn(ITERATIONS);
        console.log(`${i},"${name}",${ITERATIONS},${Date.now() - start}`);
        //tlog(`Done    : ${name}`);
        await sleep(500);
      }
    }
  }

  async runStringAlias(n: number): Promise<void> {
    const strs = this.someStrings;
    const strns = this.someStrings.length;
    const results: StringAlias[] = [];

    for (let i = 0; i < n; i++) {
      const s1 = strs[Math.floor(Math.random() * strns)];
      const s2 = strs[Math.floor(Math.random() * strns)];
      results.push(s1 + s2);
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < n; i++) {
      const s1 = results[Math.floor(Math.random() * rlens)];
      const s2 = results[Math.floor(Math.random() * rlens)];
      results.push(s1 + s2);
    }
  }

  async runNumAlias(n: number): Promise<void> {
    const nums = this.someNumbers;
    const numns = this.someNumbers.length;
    const results: NumAlias[] = [];

    for (let i = 0; i < n; i++) {
      const s1 = nums[Math.floor(Math.random() * numns)];
      const s2 = nums[Math.floor(Math.random() * numns)];
      results.push(s1 + s2 + s1 * s2);
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < n; i++) {
      const s1 = results[Math.floor(Math.random() * rlens)];
      const s2 = results[Math.floor(Math.random() * rlens)];
      results.push(s1 + s2 + s1 * s2);
    }
  }

  async runStringWrapper(n: number): Promise<void> {
    const strs = this.someStrings;
    const strns = this.someStrings.length;
    const results: StringWrapper[] = [];

    for (let i = 0; i < n; i++) {
      const s1 = new StringWrapper(strs[Math.floor(Math.random() * strns)]);
      const s2 = new StringWrapper(strs[Math.floor(Math.random() * strns)]);
      results.push(StringWrapper.concat(s1, s2));
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < n; i++) {
      const s1 = results[Math.floor(Math.random() * rlens)];
      const s2 = results[Math.floor(Math.random() * rlens)];
      results.push(StringWrapper.concat(s1, s2));
    }
  }

  async runNumWrapper(n: number): Promise<void> {
    const nums = this.someNumbers;
    const numns = this.someNumbers.length;
    const results: NumberWrapper[] = [];

    for (let i = 0; i < n; i++) {
      const s1 = new NumberWrapper(nums[Math.floor(Math.random() * numns)]);
      const s2 = new NumberWrapper(nums[Math.floor(Math.random() * numns)]);
      results.push(NumberWrapper.plustimes(s1, s2));
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < n; i++) {
      const s1 = results[Math.floor(Math.random() * rlens)];
      const s2 = results[Math.floor(Math.random() * rlens)];
      results.push(NumberWrapper.plustimes(s1, s2));
    }
  }

  async runStringFakeWrapper(n: number): Promise<void> {
    const strs = this.someStrings;
    const strns = this.someStrings.length;
    const results: StringFakeWrapper[] = [];

    for (let i = 0; i < n; i++) {
      const s1 = StringFakeWrapper.from(strs[Math.floor(Math.random() * strns)]);
      const s2 = StringFakeWrapper.from(strs[Math.floor(Math.random() * strns)]);
      results.push(StringFakeWrapper.concat(s1, s2));
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < n; i++) {
      const s1 = results[Math.floor(Math.random() * rlens)];
      const s2 = results[Math.floor(Math.random() * rlens)];
      results.push(StringFakeWrapper.concat(s1, s2));
    }
  }

  async runNumFakeWrapper(n: number): Promise<void> {
    const nums = this.someNumbers;
    const numns = this.someNumbers.length;
    const results: NumberFakeWrapper[] = [];

    for (let i = 0; i < n; i++) {
      const s1 = NumberFakeWrapper.from(nums[Math.floor(Math.random() * numns)]);
      const s2 = NumberFakeWrapper.from(nums[Math.floor(Math.random() * numns)]);
      results.push(NumberFakeWrapper.plustimes(s1, s2));
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < n; i++) {
      const s1 = results[Math.floor(Math.random() * rlens)];
      const s2 = results[Math.floor(Math.random() * rlens)];
      results.push(NumberFakeWrapper.plustimes(s1, s2));
    }
  }
}

let lastTime = Date.now();
const startTime = lastTime;

function tlog(msg: string): void {
  const now = Date.now();
  const ds = `0000000000${now - startTime}`;
  const ls = `0000000000${now - lastTime}`;
  console.log(`[${ds.substring(Math.max(0, ds.length - 8))}]:[${ls.substring(Math.max(0, ls.length - 6))}]: ${msg}`);
  lastTime = now;
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function makeStrings(): string[] {
  const result = [];
  for (let i = 0; i < STRINGS; i++) {
    const len = STRLENS[0] + Math.max(0, (Math.floor(Math.random() * STRLENS[1]) - STRLENS[0]));
    let str = '';
    for (let j = 0; j < len; j++) {
      str += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    }
    result.push(str);
  }
  return result;
}

function makeNumbers(): number[] {
  const result = [];
  for (let i = 0; i < NUMBERS; i++) {
    result.push(Math.random() / Math.random());
  }
  return result;
}

function shuffle<X>(list: X[]): X[] {
  const result = [...list];
  for (let i = 0; i < result.length; i++) {
    const j = i + Math.floor(Math.random() * (result.length - i - 1));
    const t = result[i];
    result[i] = result[j];
    result[j] = t;
  }
  return result;
}

const main = new Main();
