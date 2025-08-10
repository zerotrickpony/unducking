// A static wrapper class which represents a valid path on the local filesystem.
// Ensures usage of the local path separator (e.g. backslashes on Windows).
export class FSPath {
  // Use this value for unknown / unset paths
  static readonly EMPTY = FSPath.from('');

  constructor() {
    throw new Error(`Never construct this object. See static from(), and use static helpers.`);
  }

  // Parse unknown user input as a path. Gracefully convert forward slash paths on windows to backslashes.
  static parse(s: string): FSPath {
    if (!s) {
      return s;  // tolerate emptyness and undefineds
    }

    if (process.platform !== 'win32') {
      if (!s.startsWith('/')) {
        s = '/' + s;
      }
      return s as FSPath;
    }

    if (s.startsWith('//')) {
      // Interpret as a named volume like \\MYVOLUME\whatever
      return `\\\\${s.substring(2).replace(/\//g, '\\')}`;

    } else {
      return s.replace(/\//g, '\\');
    }
  }

  // Marks a string as an FSPath static wrapper.
  private static from(value: string): FSPath {
    // Typecheck the value as a class, but dont really use it
    return value as unknown as FSPath;
  }

  // Returns the user's home directory as an FSPath.
  static home(): FSPath {
    if (process.platform == 'win32') {
      return FSPath.from(`${process.env.HOMEDRIVE!.toUpperCase()}${process.env.HOMEPATH}`);
    } else {
      return FSPath.from(`${process.env.HOME}`);
    }
  }

  // Returns an array of the items in each part of the given pfpath, correctly handling platform prefix.
  static parts(fspath: FSPath): string[] {
    const s = fspath as unknown as string;  // naughty coercion gives us access to string's helper methods
    if (process.platform !== 'win32') {
      // On Linux and MacOS, forward slash is a reliable path separator
      return s.split('/');

    } else if (s.startsWith('\\\\')) {
      // Windows volume syntax starts with a double backslash
      return s.substring(2).split('\\');

    } else {
      // Otherwise the volume is just a drive letter
      return s.split('\\');
    }
  }
}
