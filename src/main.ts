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
    const fns: [string, (iterations: number, rng: RNG) => Promise<void>][] = [
      ['runStringAlias',       async (iterations: number, rng: RNG) => await this.runStringAlias(iterations, rng)],
      ['runNumAlias',          async (iterations: number, rng: RNG) => await this.runNumAlias(iterations, rng)],
      ['runStringWrapper',     async (iterations: number, rng: RNG) => await this.runStringWrapper(iterations, rng)],
      ['runNumWrapper',        async (iterations: number, rng: RNG) => await this.runNumWrapper(iterations, rng)],
      ['runStringFakeWrapper', async (iterations: number, rng: RNG) => await this.runStringFakeWrapper(iterations, rng)],
      ['runNumFakeWrapper',    async (iterations: number, rng: RNG) => await this.runNumFakeWrapper(iterations, rng)],
    ];

    const env = getEnvironment();
    csvlog(`environment`,`testName`,`iterations`,`pass`,`durationMs`);
    for (let i = 0; i < PASSES; i++) {
      const rng = new RNG();  // untouched seed, so that each pass is apples-to-apples amongst the algos
      for (const [name, fn] of shuffle(fns)) {
        const start = Date.now();
        await fn(ITERATIONS, rng.clone());
        const end = Date.now();
        csvlog(`"${env}"`,`"${name}"`,`${ITERATIONS}`,`${i}`,`${end - start}`);
        await sleep(500);
      }
    }
  }

  async runStringAlias(iterations: number, rng: RNG): Promise<void> {
    const strs = this.someStrings;
    const strns = this.someStrings.length;
    const results: StringAlias[] = [];

    for (let i = 0; i < iterations; i++) {
      const s1 = strs[rng.nextUnder(strns)];
      const s2 = strs[rng.nextUnder(strns)];
      results.push(s1 + s2);
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < iterations; i++) {
      const s1 = results[rng.nextUnder(rlens)];
      const s2 = results[rng.nextUnder(rlens)];
      results.push(s1 + s2);
    }
  }

  async runNumAlias(iterations: number, rng: RNG): Promise<void> {
    const nums = this.someNumbers;
    const numns = this.someNumbers.length;
    const results: NumAlias[] = [];

    for (let i = 0; i < iterations; i++) {
      const s1 = nums[rng.nextUnder(numns)];
      const s2 = nums[rng.nextUnder(numns)];
      results.push(s1 + s2 + s1 * s2);
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < iterations; i++) {
      const s1 = results[rng.nextUnder(rlens)];
      const s2 = results[rng.nextUnder(rlens)];
      results.push(s1 + s2 + s1 * s2);
    }
  }

  async runStringWrapper(iterations: number, rng: RNG): Promise<void> {
    const strs = this.someStrings;
    const strns = this.someStrings.length;
    const results: StringWrapper[] = [];

    for (let i = 0; i < iterations; i++) {
      const s1 = new StringWrapper(strs[rng.nextUnder(strns)]);
      const s2 = new StringWrapper(strs[rng.nextUnder(strns)]);
      results.push(StringWrapper.concat(s1, s2));
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < iterations; i++) {
      const s1 = results[rng.nextUnder(rlens)];
      const s2 = results[rng.nextUnder(rlens)];
      results.push(StringWrapper.concat(s1, s2));
    }
  }

  async runNumWrapper(iterations: number, rng: RNG): Promise<void> {
    const nums = this.someNumbers;
    const numns = this.someNumbers.length;
    const results: NumberWrapper[] = [];

    for (let i = 0; i < iterations; i++) {
      const s1 = new NumberWrapper(nums[rng.nextUnder(numns)]);
      const s2 = new NumberWrapper(nums[rng.nextUnder(numns)]);
      results.push(NumberWrapper.plustimes(s1, s2));
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < iterations; i++) {
      const s1 = results[rng.nextUnder(rlens)];
      const s2 = results[rng.nextUnder(rlens)];
      results.push(NumberWrapper.plustimes(s1, s2));
    }
  }

  async runStringFakeWrapper(iterations: number, rng: RNG): Promise<void> {
    const strs = this.someStrings;
    const strns = this.someStrings.length;
    const results: StringFakeWrapper[] = [];

    for (let i = 0; i < iterations; i++) {
      const s1 = StringFakeWrapper.from(strs[rng.nextUnder(strns)]);
      const s2 = StringFakeWrapper.from(strs[rng.nextUnder(strns)]);
      results.push(StringFakeWrapper.concat(s1, s2));
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < iterations; i++) {
      const s1 = results[rng.nextUnder(rlens)];
      const s2 = results[rng.nextUnder(rlens)];
      results.push(StringFakeWrapper.concat(s1, s2));
    }
  }

  async runNumFakeWrapper(iterations: number, rng: RNG): Promise<void> {
    const nums = this.someNumbers;
    const numns = this.someNumbers.length;
    const results: NumberFakeWrapper[] = [];

    for (let i = 0; i < iterations; i++) {
      const s1 = NumberFakeWrapper.from(nums[rng.nextUnder(numns)]);
      const s2 = NumberFakeWrapper.from(nums[rng.nextUnder(numns)]);
      results.push(NumberFakeWrapper.plustimes(s1, s2));
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < iterations; i++) {
      const s1 = results[rng.nextUnder(rlens)];
      const s2 = results[rng.nextUnder(rlens)];
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

function csvlog(...items: string[]): void {
  if (typeof(window) != 'undefined') {
    const m = document.getElementById('main') as HTMLTextAreaElement;
    m.value += items.join(',') + '\n';
  } else {
    console.log(items.join(','));
  }
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

function getEnvironment() {
  if (typeof(process) != "undefined") {
    const version = process?.version ?? '???';
    const arch = process?.arch ?? '???';
    const platform = process?.platform ?? '???';
    return `${platform}-${arch}-node-${version}`;

  } else if (typeof(window) != "undefined") {
    const t = window.location.hash;
    const s = 'environment=';
    if (t.includes(s)) {
      return `${t.substring(t.indexOf(s) + s.length)}`;
    } else {
      return 'browser';
    }
  }

  return '???';
}

class RNG {
  m: number;
  a: number;
  c: number;
  state: number;

  constructor(seed?: number) {
    // LCG using GCC's constants
    this.m = 0x80000000; // 2**31;
    this.a = 1103515245;
    this.c = 12345;

    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
  }

  clone(): RNG {
    const result = new RNG(this.state);
    result.m = this.m;
    result.a = this.a;
    result.c = this.c;
    result.state = this.state;
    return result;
  }

  nextInt(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state;
  }
  nextUnder(max: number): number {
    // returns in range [0, end): including start, excluding end
    // can't modulu nextInt because of weak randomness in lower bits
    const randomUnder1 = this.nextInt() / this.m;
    return Math.floor(randomUnder1 * max);
  }
}

const main = new Main();
