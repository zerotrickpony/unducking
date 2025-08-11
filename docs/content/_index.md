+++
title = "Unducking Typescript primitive aliases"
weight = 1
+++

# Un-*ucking Typescript primitive type aliases
*2025 August 10 - [@zerotrickpony@messydesk.social](https://messydesk.social/@zerotrickpony)*

Typescript's duck-typing philosophy has many advantages, but sometimes it permits
coersions that I'd rather have prevented at compile time. This is especially true
of situations where a subtype of a primitive type (like string or number) has some semantic
constraint which shouldn't permit coercion, even though they are implemented
as primitives. **What techniques can we use to improve type safety of constrained primitive types?**

## A motivating example

Recently I wrote an application that works with a lot of absolute file path strings.
These paths strings are sprinkled all over the codebase, including in some inner
loops where re-checking well-formedness and existence had a significant impact on the
performance of an already-slow disk scanning tool. Something like:

```ts
function parseUserInput(): string {
  const str = getSomeInput();
  checkValidDir(str);
  return str;
}

function recursiveScan(path: string, stats?: Counters): Counters {
  checkValidDir(path);
  stats = stats ?? new Counters();
  for (const item of listdir(path)) {
    if (item.isDirectory()) {
      recursiveScan(join(path, item.name()), stats);
    } else {
      stats.countFile(item);
    }
  }
  return stats;
}

const dirpath = parseUserInput();
const stats = recursiveScan(dirpath);
```

Unfortunately `recursiveScan` is repeatedly validating that the path is well formed.
This is wasted effort because I know that the user input was already sanitized, and join()
on a known directory will always produce a valid directory path.

I want a Typescript type to encapsulate the idea of this validation being done already, so that
downstream code can be assured that the file paths are valid at compile time. Maybe something like:

<pre class="z-code">
<code><span class=codechange>type DirPath = </span><span class=z-comment>// ... ????</span>

function parseUserInput(): <span class=codechange>DirPath</span> {
  const str = getSomeInput();
  checkValidDir(str);
  return <span class=codechange>makeDirPathSomehow(str);</span>
}

function recursiveScan(path: <span class=codechange>DirPath</span>, stats?: Counters): Counters {
  <span class=codedeletion>// checkValidDir(path);</span>  <span class=z-comment>// don't need this anymore</span>
  stats = stats ?? new Counters();
  for (const item of listdir(path<span class=codechange>.toString()</span>)) {
    if (item.isDirectory()) {
      recursiveScan(join(path<span class=codechange>.toString()</span>, item.name()), stats);
    } else {
      stats.countFile(item);
    }
  }
  return stats;
}

const dirpath: <span class=codechange>DirPath</span> = parseUserInput();
const stats = recursiveScan(dirpath);
</code></pre>

When recursiveScan is passed a valid `DirPath`, it should now be safe to omit the bounds
checking on every recursion. **How should DirPath be defined?**

## First approach: Primitive type aliases

Naively, we could define `DirPath` simply as an alias to Typescript's primitive `string` type.
That's an obvious intended use of Typescript's alias feature, it avoids runtime performance
overhead, and DirPaths can interoperate nicely with various
file path operations like `join()`.

But there is a snag:

```ts
// if DirPath is just an alias for string...
type DirPath = string;

// ...then this is NOT a compile error
recursiveScan(`invalid nonsense`, stats);
```

With this approach, any string will coerce to a `DirPath`, and we will not get the bounds checking
assurance from the Typescript type checker. We could certainly assume
that the DirPath alias is a sufficient signal to future maintainers that a constrained
value is expected, but there is no enforcement. It is merely documentation, prone to
mistakes.

And as a secondary annoyance, type analysis tooling like VSCode will show any variables and
properties of alias DirPath as `"string"` in various hover cards and tooltips, instead of using
the more descriptive name:

<img src="vscode1.png" title="VSCode shows the type of DirPath variables as string" />

During a recent refactor of this code, this behavior of VSCode kept inducing me to re-check the
definitions of my interfaces and worry that I had forgotten to fix the types of the fields. A bit annoying.


## Improvement A: Wrapper objects

We could instead define `DirPath` as a full fledged class, wrapping the string path data
and perhaps also tracking some useful additional properties. This is a perfectly reasonable approach
and is used by patterns like [TypeID](https://github.com/jetify-com/typeid-js/tree/main).

Here's how that could look:

```ts
// A wrapper object which encapsulates validity checking
class DirPath {
  // Internal state
  constructor(private readonly path: string) {}

  // Use this factory method when parsing untrusted strings into paths
  static parse(s): DirPath {
    checkValidDir(s);
    return new DirPath(s);
  };

  // Wrapper methods which implement various path needs
  join(s): DirPath {
    return new DirPath(node_path.join(this.path, s));
  }

  // etc...
  exists(): boolean { ... }
  list() { ... }
}
```

And now we can write application code that trusts that DirPaths are well-formed and already
bounds checked by the Typescript type checker:

<pre class="z-code">
<code>function parseUserInput(): <span class=codechange>DirPath</span> {
  const str = getSomeInput();
  return <span class=codechange>DirPath.parse(str);</span>
}

function recursiveScan(path: <span class=codechange>DirPath</span>, stats?: Counters): Counters {
  stats = stats ?? new Counters();
  for (const item of path<span class=codechange>.list()</span>) {
    if (item.isDirectory()) {
      recursiveScan(path<span class=codechange>.join(item.name())</span>, stats);
    } else {
      stats.countFile(item);
    }
  }
  return stats;
}

<span class=z-comment>// Validity checking is now encapsulated by DirPath</span>
const dirpath: <span class=codechange>DirPath</span> = parseUserInput();
const stats = recursiveScan(dirpath);

<span class=z-comment>// and invalid strings give a nice typecheck error</span>
recursiveScan(<span class=codedeletion>`invalid nonsense`</span>, stats);
</code></pre>

In this approach, Typescript will enforce agreement with the `DirPath` class
throughout the code, and we can be assured that the bounds checking done at
construction time need not be repeated in subsequent usage sites.

Unfortunately we'll have to write some helper functions like `join` to adapt our
bespoke `DirPath` class to file path utilities that take strings. And we'll have
the runtime overhead (speed, memory allocation) of the wrapper objects being created and
referenced throughout the code.

### What about runtime performance cost of wrapper objects?

Don't worry about the runtime performance cost of wrapper objects.

Well... what if we **do** want to worry about performance? I have some benchmark results on this
below, but here is an idea:

## Improvement B: Static wrappers

Here's an approach that tsc will typecheck like a wrapper object, but has (almost) no runtime overhead:

```ts
// This type looks like a wrapper object during typechecking,
// but it's actually a primitive:
class DirPath {
  constructor(s) { throw new Error(`static wrapper is never instantiated`); }

  // A validity enforcing factory method...
  static parse(s): DirPath {
    checkValidDir(s);

    // This naughty bit of coersion will cause tsc to follow our path
    // strings through the codebase as a class, and will not permit
    // undesired accidental coercions to string.
    return s as unknown as DirPath;
  }

  // Helper methods are static, rather than members
  static join(p: DirPath, s: string): DirPath {
    // The implementation of this wrapper can simply treat these things
    // as strings. The returned type is checked as a DirPath but avoids
    // allocating a wrapper object. The wrapper implementations have
    // these gross coercions inside them, but the rest of the application's
    // code will be clean of coercion.
    return node_path.join(p as string, s) as unknown as DirPath;
  }

  // ...more helpers, etc...
  static exists(p: DirPath) { ... }
  static list(p: DirPath) { ... }
}
```

In this approach, we abuse Typescript's coercion overrides to ask certain strings to be
treated like DirPath classes during typechecking. Within the implementation of DirPath, we have
various naughty coercions through `as unknown` so that we can appease Typescript's type checker,
but no wrapper objects are ever actually allocated at runtime.

Application code looks nearly the same for a static wrapper as in the "wrapper objects"
approach above, except that the helpers are static methods rather than member
methods. Like:

<pre class="z-code">
<code>function parseUserInput(): <span class=codechange>DirPath</span> {
  const str = getSomeInput();
  return <span class=codechange>DirPath.parse(str);</span>
}

function recursiveScan(path: <span class=codechange>DirPath</span>, stats?: Counters): Counters {
  stats = stats ?? new Counters();
  for (const item of <span class=codechange>DirPath.list(path)</span>) {
    if (item.isDirectory()) {
      recursiveScan(<span class=codechange>DirPath.join(item.name())</span>, stats);
    } else {
      stats.countFile(item);
    }
  }
  return stats;
}

<span class=z-comment>// Validity enforcement works the same as wrapper objects</span>
const dirpath: <span class=codechange>DirPath</span> = parseUserInput();
const stats = recursiveScan(dirpath);

<span class=z-comment>// ...as do typecheck errors</span>
recursiveScan(<span class=codedeletion>`invalid nonsense`</span>, stats);
</code></pre>

We still need to have some degree of runtime overhead to call wrapper functions like
`DirPath.join()`, so this technique does not entirely avoid runtime overhead.
But runtime **allocation** overhead **is** entirely avoided.


## Runtime Performance

TLDR:
- Wrapper Objects (Option A) cause a **significiant slowdown at runtime** as
compared to using primitive types like `string` or `number`: 1.2X to 5X slowdown or more, depending on environment. See below.
- Static Wrappers (Option B) have **no statistically significant difference in performance** vs using primitive types.

More details:

I ran some [benchmarks](https://github.com/zerotrickpony/unducking/blob/main/src/main.ts) on four Javascript VM environments, comparing the wrapper objects (B)
approach to primitive types, and the static wrappers (C) approach to primitive types.
Each bar represents the measured slowdown of that approach as compared to using primitive types:

<img src="chart.png" title="Bar chart illustrating the performance impacts of the above approaches" />

<div class=footnote>* - No statistically significant difference from baseline</div>

Here a value of "1.0" indicates that the approach had no difference in its benchmark speed vs.
the same code run on a primitive type. Both `string` and `number`
primitives were compared to these two wrapper techniques. Wrapper objects imposed a performance
penalty of between 1.2x - 5.0x or more, depending on the environment and workload.

The right side of the chart shows the same benchmarks except where a very large amount of memory
was retained during the tests. This memory pressure caused garbage collection overhead to be larger,
and therefore demonstrate a larger difference in the approaches which allocate objects.

(Note that these bars state relative performance of the techniques within each environment. It wasn't my intention to compare the absolute
performance of the four environments. They did
*not* perform similarly; the x64 machine was four times faster at the benchmarks than the Apple Silicon, and both of
those environments were vastly faster than the rental cloud machine from Digital Ocean. For fun I also
tested Firefox to see if Spidermonkey would perform differently from V8 on the same ARM processor.)


## Future Work

This "static wrappers" pattern has good runtime performance, but is fairly clumsy. It has disadvantages like:
- **Dangerous internals:** Within the implementation of the wrapper and any needed helpers, the author must employ
  error-prone `as unknown` coercions which effectively turn off the type checker.
- **Awkward usage:** Throughout the application code, interactions with the "objects" are mitigated through
  unusual-looking static helper methods instead of more natural looking member methods.
- **Astonishment:** During debugging and refactoring, the readers of the involved application code must
  remember that the "objects" are actually primitives at runtime, with all implications thereof.

A future version of Typescript could offer more control over alias coercion behavior. As a strawman, imagine a new kind of
type expression somewhere between an alias and a class, which typechecks like a class but passes through
at runtime like a primitive. Something like:

```ts
// Magic class expression which makes a primitive at runtime,
// but prevents implicit widening
class DirPath = NarrowedPrimitive<string> {
  // No object members or constructor permitted

  // A factory method which encapsulates needed coercions
  static from(s): DirPath {
    checkValidDir(s);
    return s as DirPath;
  }

  // Member methods access the primitive via "this"
  join(s): DirPath {
    // widening to string is permitted
    return node_path.join(this, s) as DirPath;
  }
  exists(): boolean { ... }
  list() { ... }
}
```

If this approach were possible, it would permit application code to use helpers with a more natural
member method syntax, but still without incurring allocator costs:

<pre class="z-code">
<code>function recursiveScan(path: <span class=codechange>DirPath</span>, stats?: Counters): Counters {
  stats = stats ?? new Counters();
  for (const item of path<span class=codechange>.list()</span>) {
    if (item.isDirectory()) {
      recursiveScan(path<span class=codechange>.join(item.name())</span>, stats);
    } else {
      stats.countFile(item);
    }
  }
  return stats;
}
</code></pre>

Since Typescript seems to prefer to be in the business of typechecking rather than
compiling, this feature may never be offered in the core language. A
code generator or preprocessor could potentially serve this purpose, but if it's
not in the widely known language then it fails to avoid the "astonishment" problem.

It's also worth noting that other languages like Rust with more aggressive compilers may already have effective solutions to this problem, because encapsulated primitive types can often be flattened away during optimization.

Anyway, [let me know](https://messydesk.social/@zerotrickpony) if you had this need in your Typescript projects, and what you did about it! I'm always interested
in learning more.


## References

- **Techniques**
  - [Static wrapper example (source code)](https://github.com/zerotrickpony/unducking/blob/main/src/fspath.ts)
  - [Object wrapper example (TypeID project)](https://github.com/jetify-com/typeid-js/tree/main)

- **Performance experiments**
  - [Table of summary statistics](./results.html)
  - [All experimental data and statistics (JSON)](./results.json)
  - [Benchmarks (source code)](https://github.com/zerotrickpony/unducking/blob/main/src/main.ts)
  - [Summary statistics calculations (source code)](https://github.com/zerotrickpony/unducking/blob/main/tools/results.ts)
  - [How to compute P-value by simulation (YouTube)](https://www.youtube.com/watch?v=jLFeqQxGtOc) (credit: Khan Academy)
  - [How to compute T-test (YouTube)](https://www.youtube.com/watch?v=D2sMsmL0ScQ) (credit: Khan Academy)

