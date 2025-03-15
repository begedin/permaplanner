export const useMersenneTwister = (seed: string) => {
  const N = 624;
  const M = 397;
  const MATRIX_A = 0x9908b0df; // constant vector a
  const UPPER_MASK = 0x80000000;
  const LOWER_MASK = 0x7fffffff;

  const mt = new Array(N); // the array for the state vector
  let mti = N + 1; // mit == N+1 means mt[N] is not initialized

  const sdbm = (str: string) => {
    const arr = str.split('');
    return arr.reduce(
      (hashCode, currentVal) =>
        (hashCode =
          currentVal.charCodeAt(0) + (hashCode << 6) + (hashCode << 16) - hashCode),
      0,
    );
  };

  /* (re)initialize the PRNG */
  const init = (seed: number) => {
    mt[0] = seed >>> 0;
    for (mti = 1; mti < N; mti++) {
      const s = mt[mti - 1] ^ (mt[mti - 1] >>> 30);
      // See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier.
      // In the previous versions, MSBs of the seed affect
      // only MSBs of the array mt[].
      // 2002/01/09 modified by Makoto Matsumoto
      mt[mti] =
        ((((s & 0xffff0000) >>> 16) * 1812433253) << 16) +
        (s & 0x0000ffff) * 1812433253 +
        mti;
      mt[mti] >>>= 0;
    }
  };

  /* generates a random number on [0,0xffffffff]-interval */
  const genRandInt32 = () => {
    let y;
    const mag01 = [0x0, MATRIX_A];

    /* mag01[x] = x * MATRIX_A  for x=0,1 */
    if (mti >= N) {
      /* generate N words at one time */
      let kk;

      if (mti == N + 1)
        /* if init_genrand() has not been called, */
        init(5489); /* a default initial seed is used */

      for (kk = 0; kk < N - M; kk++) {
        y = (mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK);
        mt[kk] = mt[kk + M] ^ (y >>> 1) ^ mag01[y & 0x1];
      }
      for (; kk < N - 1; kk++) {
        y = (mt[kk] & UPPER_MASK) | (mt[kk + 1] & LOWER_MASK);
        mt[kk] = mt[kk + (M - N)] ^ (y >>> 1) ^ mag01[y & 0x1];
      }
      y = (mt[N - 1] & UPPER_MASK) | (mt[0] & LOWER_MASK);
      mt[N - 1] = mt[M - 1] ^ (y >>> 1) ^ mag01[y & 0x1];

      mti = 0;
    }

    y = mt[mti++];

    /* Tempering */
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;

    return y >>> 0;
  };

  /* generates a random number on [0,0x7fffffff]-interval */
  const genRandInt31 = () => genRandInt32() >>> 1;

  /* generates a random number on [0,1]-real-interval */
  /* divided by 2^32-1 */
  const genRandReal1 = () => genRandInt32() * (1.0 / 4294967295.0);

  /* generates a random number on [0,1)-real-interval */
  /* divided by 2^32 */
  const random = () => genRandInt32() * (1.0 / 4294967296.0);

  /* generates a random number on (0,1)-real-interval */
  /* divided by 2^32 */
  const genRandReal3 = () => (genRandInt32() + 0.5) * (1.0 / 4294967296.0);

  /* generates a random number on [0,1) with 53-bit resolution*/
  const genRandRes53 = () => {
    const a = genRandInt32() >>> 5;
    const b = genRandInt32() >>> 6;
    return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
  };

  const genRandomIntInRange = (min: number, max: number) =>
    Math.floor(genRandReal1() * (max - min + 1)) + min;
  init(sdbm(seed));

  return {
    init,
    genRandInt32,
    genRandInt31,
    genRandReal1,
    random,
    genRandReal3,
    genRandRes53,
    genRandomIntInRange,
  };
};
