// Test construction:
// - between each pass of each kind of test, we sleep for 500ms to attempt to quiet the VM a bit
// - each test starts with 20,000 strings of up to 500 chars in length (max < 20MB)
// - we create concatenations of pairs of the test data, and add them to an array
// - we create an array equal in size to half the source array, made of concatenations (max < 20MB)
// - we reprocess the same resulting items so that they are part of the working set, concatenating again (max < 40MB)
// - we discard that array and iterate
// - we measure the combined duration of performing the above test 1000 times, and consider that one trial
// - we do 30 passes each of these trials, randomizing the order in which the tests are done in case there is an order effect

const PASSES = 30;
const TEST_ITERATIONS = 1000;
const GROW_ITEMS = 20000;
const SRC_STRINGS = 20000;
const SRC_STRLENS = [3, 500];
const SRC_NUMBERS = 20000;
const SRC_LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-=_+,/.<>?;\':"[]{}\\|';

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
    const fns: [string, (rng: RNG) => void][] = [
      ['runStringAlias',       (rng: RNG) => this.runStringAlias(rng)],
      ['runNumAlias',          (rng: RNG) => this.runNumAlias(rng)],
      ['runStringWrapper',     (rng: RNG) => this.runStringWrapper(rng)],
      ['runNumWrapper',        (rng: RNG) => this.runNumWrapper(rng)],
      ['runStringFakeWrapper', (rng: RNG) => this.runStringFakeWrapper(rng)],
      ['runNumFakeWrapper',    (rng: RNG) => this.runNumFakeWrapper(rng)],
    ];

    const env = getEnvironment();
    csvlog(`environment`,`testName`,`iterations`,`pass`,`durationMs`);
    for (let i = 0; i < PASSES; i++) {
      const rng = new RNG();  // untouched seed, so that each pass is apples-to-apples amongst the algos
      for (const [name, fn] of shuffle(fns)) {
        const start = Date.now();
        const iterationRng = rng.clone();
        for (let j = 0; j < TEST_ITERATIONS; j++) {
          fn(iterationRng);
        }
        const end = Date.now();
        csvlog(`"${env}"`,`"${name}"`,`${GROW_ITEMS}`,`${i}`,`${end - start}`);
        await sleep(500);
      }
    }
  }

  async runStringAlias(rng: RNG): Promise<void> {
    const strs = this.someStrings;
    const strns = this.someStrings.length;
    const results: StringAlias[] = [];

    const items = Math.ceil(GROW_ITEMS / 2);
    for (let i = 0; i < items; i++) {
      const s1 = strs[rng.nextUnder(strns)];
      const s2 = strs[rng.nextUnder(strns)];
      results.push(s1 + s2);
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < items; i++) {
      const s1 = results[rng.nextUnder(rlens)];
      const s2 = results[rng.nextUnder(rlens)];
      results.push(s1 + s2);
    }
  }

  async runNumAlias(rng: RNG): Promise<void> {
    const nums = this.someNumbers;
    const numns = this.someNumbers.length;
    const results: NumAlias[] = [];

    const items = Math.ceil(GROW_ITEMS / 2);
    for (let i = 0; i < items; i++) {
      const s1 = nums[rng.nextUnder(numns)];
      const s2 = nums[rng.nextUnder(numns)];
      results.push(s1 + s2 + s1 * s2);
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < items; i++) {
      const s1 = results[rng.nextUnder(rlens)];
      const s2 = results[rng.nextUnder(rlens)];
      results.push(s1 + s2 + s1 * s2);
    }
  }

  async runStringWrapper(rng: RNG): Promise<void> {
    const strs = this.someStrings;
    const strns = this.someStrings.length;
    const results: StringWrapper[] = [];

    const items = Math.ceil(GROW_ITEMS / 2);
    for (let i = 0; i < items; i++) {
      const s1 = new StringWrapper(strs[rng.nextUnder(strns)]);
      const s2 = new StringWrapper(strs[rng.nextUnder(strns)]);
      results.push(StringWrapper.concat(s1, s2));
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < items; i++) {
      const s1 = results[rng.nextUnder(rlens)];
      const s2 = results[rng.nextUnder(rlens)];
      results.push(StringWrapper.concat(s1, s2));
    }
  }

  async runNumWrapper(rng: RNG): Promise<void> {
    const nums = this.someNumbers;
    const numns = this.someNumbers.length;
    const results: NumberWrapper[] = [];

    const items = Math.ceil(GROW_ITEMS / 2);
    for (let i = 0; i < items; i++) {
      const s1 = new NumberWrapper(nums[rng.nextUnder(numns)]);
      const s2 = new NumberWrapper(nums[rng.nextUnder(numns)]);
      results.push(NumberWrapper.plustimes(s1, s2));
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < items; i++) {
      const s1 = results[rng.nextUnder(rlens)];
      const s2 = results[rng.nextUnder(rlens)];
      results.push(NumberWrapper.plustimes(s1, s2));
    }
  }

  async runStringFakeWrapper(rng: RNG): Promise<void> {
    const strs = this.someStrings;
    const strns = this.someStrings.length;
    const results: StringFakeWrapper[] = [];

    const items = Math.ceil(GROW_ITEMS / 2);
    for (let i = 0; i < items; i++) {
      const s1 = StringFakeWrapper.from(strs[rng.nextUnder(strns)]);
      const s2 = StringFakeWrapper.from(strs[rng.nextUnder(strns)]);
      results.push(StringFakeWrapper.concat(s1, s2));
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < items; i++) {
      const s1 = results[rng.nextUnder(rlens)];
      const s2 = results[rng.nextUnder(rlens)];
      results.push(StringFakeWrapper.concat(s1, s2));
    }
  }

  async runNumFakeWrapper(rng: RNG): Promise<void> {
    const nums = this.someNumbers;
    const numns = this.someNumbers.length;
    const results: NumberFakeWrapper[] = [];

    const items = Math.ceil(GROW_ITEMS / 2);
    for (let i = 0; i < items; i++) {
      const s1 = NumberFakeWrapper.from(nums[rng.nextUnder(numns)]);
      const s2 = NumberFakeWrapper.from(nums[rng.nextUnder(numns)]);
      results.push(NumberFakeWrapper.plustimes(s1, s2));
    }

    // reprocess the results
    const rlens = results.length;
    for (let i = 0; i < items; i++) {
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
  for (let i = 0; i < SRC_STRINGS; i++) {
    const len = SRC_STRLENS[0] + Math.max(0, (Math.floor(Math.random() * SRC_STRLENS[1]) - SRC_STRLENS[0]));
    let str = '';
    for (let j = 0; j < len; j++) {
      str += SRC_LETTERS[Math.floor(Math.random() * SRC_LETTERS.length)];
    }
    result.push(str);
  }
  return result;
}

function makeNumbers(): number[] {
  const result = [];
  for (let i = 0; i < SRC_NUMBERS; i++) {
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
