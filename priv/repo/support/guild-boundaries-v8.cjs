// Frozen v8 migration bundle; regenerate only before release with npm run bundle:migration:v8.
var It = Object.create;
var st = Object.defineProperty;
var Rt = Object.getOwnPropertyDescriptor;
var Pt = Object.getOwnPropertyNames;
var Mt = Object.getPrototypeOf,
  Lt = Object.prototype.hasOwnProperty;
var ot = (h, t) => () => (t || h((t = { exports: {} }).exports, t), t.exports);
var kt = (h, t, e, i) => {
  if ((t && typeof t == 'object') || typeof t == 'function')
    for (let o of Pt(t))
      !Lt.call(h, o) &&
        o !== e &&
        st(h, o, { get: () => t[o], enumerable: !(i = Rt(t, o)) || i.enumerable });
  return h;
};
var At = (h, t, e) => (
  (e = h != null ? It(Mt(h)) : {}),
  kt(t || !h || !h.__esModule ? st(e, 'default', { value: h, enumerable: !0 }) : e, h)
);
var lt = ot((V, J) => {
  (function (h, t) {
    typeof V == 'object' && typeof J < 'u'
      ? (J.exports = t())
      : typeof define == 'function' && define.amd
        ? define(t)
        : (h.SplayTree = t());
  })(V, function () {
    'use strict';
    function h(u, n) {
      var r = {
          label: 0,
          sent: function () {
            if (a[0] & 1) throw a[1];
            return a[1];
          },
          trys: [],
          ops: [],
        },
        f,
        c,
        a,
        E;
      return (
        (E = { next: w(0), throw: w(1), return: w(2) }),
        typeof Symbol == 'function' &&
          (E[Symbol.iterator] = function () {
            return this;
          }),
        E
      );
      function w(S) {
        return function (R) {
          return _([S, R]);
        };
      }
      function _(S) {
        if (f) throw new TypeError('Generator is already executing.');
        for (; r; )
          try {
            if (
              ((f = 1),
              c &&
                (a =
                  S[0] & 2
                    ? c.return
                    : S[0]
                      ? c.throw || ((a = c.return) && a.call(c), 0)
                      : c.next) &&
                !(a = a.call(c, S[1])).done)
            )
              return a;
            switch (((c = 0), a && (S = [S[0] & 2, a.value]), S[0])) {
              case 0:
              case 1:
                a = S;
                break;
              case 4:
                return r.label++, { value: S[1], done: !1 };
              case 5:
                r.label++, (c = S[1]), (S = [0]);
                continue;
              case 7:
                (S = r.ops.pop()), r.trys.pop();
                continue;
              default:
                if (
                  ((a = r.trys),
                  !(a = a.length > 0 && a[a.length - 1]) && (S[0] === 6 || S[0] === 2))
                ) {
                  r = 0;
                  continue;
                }
                if (S[0] === 3 && (!a || (S[1] > a[0] && S[1] < a[3]))) {
                  r.label = S[1];
                  break;
                }
                if (S[0] === 6 && r.label < a[1]) {
                  (r.label = a[1]), (a = S);
                  break;
                }
                if (a && r.label < a[2]) {
                  (r.label = a[2]), r.ops.push(S);
                  break;
                }
                a[2] && r.ops.pop(), r.trys.pop();
                continue;
            }
            S = n.call(u, r);
          } catch (R) {
            (S = [6, R]), (c = 0);
          } finally {
            f = a = 0;
          }
        if (S[0] & 5) throw S[1];
        return { value: S[0] ? S[1] : void 0, done: !0 };
      }
    }
    var t = (function () {
      function u(n, r) {
        (this.next = null),
          (this.key = n),
          (this.data = r),
          (this.left = null),
          (this.right = null);
      }
      return u;
    })();
    function e(u, n) {
      return u > n ? 1 : u < n ? -1 : 0;
    }
    function i(u, n, r) {
      for (var f = new t(null, null), c = f, a = f; ; ) {
        var E = r(u, n.key);
        if (E < 0) {
          if (n.left === null) break;
          if (r(u, n.left.key) < 0) {
            var w = n.left;
            if (((n.left = w.right), (w.right = n), (n = w), n.left === null)) break;
          }
          (a.left = n), (a = n), (n = n.left);
        } else if (E > 0) {
          if (n.right === null) break;
          if (r(u, n.right.key) > 0) {
            var w = n.right;
            if (((n.right = w.left), (w.left = n), (n = w), n.right === null)) break;
          }
          (c.right = n), (c = n), (n = n.right);
        } else break;
      }
      return (
        (c.right = n.left), (a.left = n.right), (n.left = f.right), (n.right = f.left), n
      );
    }
    function o(u, n, r, f) {
      var c = new t(u, n);
      if (r === null) return (c.left = c.right = null), c;
      r = i(u, r, f);
      var a = f(u, r.key);
      return (
        a < 0
          ? ((c.left = r.left), (c.right = r), (r.left = null))
          : a >= 0 && ((c.right = r.right), (c.left = r), (r.right = null)),
        c
      );
    }
    function s(u, n, r) {
      var f = null,
        c = null;
      if (n) {
        n = i(u, n, r);
        var a = r(n.key, u);
        a === 0
          ? ((f = n.left), (c = n.right))
          : a < 0
            ? ((c = n.right), (n.right = null), (f = n))
            : ((f = n.left), (n.left = null), (c = n));
      }
      return { left: f, right: c };
    }
    function d(u, n, r) {
      return n === null ? u : (u === null || ((n = i(u.key, n, r)), (n.left = u)), n);
    }
    function p(u, n, r, f, c) {
      if (u) {
        f(
          '' +
            n +
            (r ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ') +
            c(u) +
            `
`,
        );
        var a = n + (r ? '    ' : '\u2502   ');
        u.left && p(u.left, a, !1, f, c), u.right && p(u.right, a, !0, f, c);
      }
    }
    var y = (function () {
      function u(n) {
        n === void 0 && (n = e),
          (this._root = null),
          (this._size = 0),
          (this._comparator = n);
      }
      return (
        (u.prototype.insert = function (n, r) {
          return this._size++, (this._root = o(n, r, this._root, this._comparator));
        }),
        (u.prototype.add = function (n, r) {
          var f = new t(n, r);
          this._root === null &&
            ((f.left = f.right = null), this._size++, (this._root = f));
          var c = this._comparator,
            a = i(n, this._root, c),
            E = c(n, a.key);
          return (
            E === 0
              ? (this._root = a)
              : (E < 0
                  ? ((f.left = a.left), (f.right = a), (a.left = null))
                  : E > 0 && ((f.right = a.right), (f.left = a), (a.right = null)),
                this._size++,
                (this._root = f)),
            this._root
          );
        }),
        (u.prototype.remove = function (n) {
          this._root = this._remove(n, this._root, this._comparator);
        }),
        (u.prototype._remove = function (n, r, f) {
          var c;
          if (r === null) return null;
          r = i(n, r, f);
          var a = f(n, r.key);
          return a === 0
            ? (r.left === null
                ? (c = r.right)
                : ((c = i(n, r.left, f)), (c.right = r.right)),
              this._size--,
              c)
            : r;
        }),
        (u.prototype.pop = function () {
          var n = this._root;
          if (n) {
            for (; n.left; ) n = n.left;
            return (
              (this._root = i(n.key, this._root, this._comparator)),
              (this._root = this._remove(n.key, this._root, this._comparator)),
              { key: n.key, data: n.data }
            );
          }
          return null;
        }),
        (u.prototype.findStatic = function (n) {
          for (var r = this._root, f = this._comparator; r; ) {
            var c = f(n, r.key);
            if (c === 0) return r;
            c < 0 ? (r = r.left) : (r = r.right);
          }
          return null;
        }),
        (u.prototype.find = function (n) {
          return this._root &&
            ((this._root = i(n, this._root, this._comparator)),
            this._comparator(n, this._root.key) !== 0)
            ? null
            : this._root;
        }),
        (u.prototype.contains = function (n) {
          for (var r = this._root, f = this._comparator; r; ) {
            var c = f(n, r.key);
            if (c === 0) return !0;
            c < 0 ? (r = r.left) : (r = r.right);
          }
          return !1;
        }),
        (u.prototype.forEach = function (n, r) {
          for (var f = this._root, c = [], a = !1; !a; )
            f !== null
              ? (c.push(f), (f = f.left))
              : c.length !== 0
                ? ((f = c.pop()), n.call(r, f), (f = f.right))
                : (a = !0);
          return this;
        }),
        (u.prototype.range = function (n, r, f, c) {
          for (var a = [], E = this._comparator, w = this._root, _; a.length !== 0 || w; )
            if (w) a.push(w), (w = w.left);
            else {
              if (((w = a.pop()), (_ = E(w.key, r)), _ > 0)) break;
              if (E(w.key, n) >= 0 && f.call(c, w)) return this;
              w = w.right;
            }
          return this;
        }),
        (u.prototype.keys = function () {
          var n = [];
          return (
            this.forEach(function (r) {
              var f = r.key;
              return n.push(f);
            }),
            n
          );
        }),
        (u.prototype.values = function () {
          var n = [];
          return (
            this.forEach(function (r) {
              var f = r.data;
              return n.push(f);
            }),
            n
          );
        }),
        (u.prototype.min = function () {
          return this._root ? this.minNode(this._root).key : null;
        }),
        (u.prototype.max = function () {
          return this._root ? this.maxNode(this._root).key : null;
        }),
        (u.prototype.minNode = function (n) {
          if ((n === void 0 && (n = this._root), n)) for (; n.left; ) n = n.left;
          return n;
        }),
        (u.prototype.maxNode = function (n) {
          if ((n === void 0 && (n = this._root), n)) for (; n.right; ) n = n.right;
          return n;
        }),
        (u.prototype.at = function (n) {
          for (var r = this._root, f = !1, c = 0, a = []; !f; )
            if (r) a.push(r), (r = r.left);
            else if (a.length > 0) {
              if (((r = a.pop()), c === n)) return r;
              c++, (r = r.right);
            } else f = !0;
          return null;
        }),
        (u.prototype.next = function (n) {
          var r = this._root,
            f = null;
          if (n.right) {
            for (f = n.right; f.left; ) f = f.left;
            return f;
          }
          for (var c = this._comparator; r; ) {
            var a = c(n.key, r.key);
            if (a === 0) break;
            a < 0 ? ((f = r), (r = r.left)) : (r = r.right);
          }
          return f;
        }),
        (u.prototype.prev = function (n) {
          var r = this._root,
            f = null;
          if (n.left !== null) {
            for (f = n.left; f.right; ) f = f.right;
            return f;
          }
          for (var c = this._comparator; r; ) {
            var a = c(n.key, r.key);
            if (a === 0) break;
            a < 0 ? (r = r.left) : ((f = r), (r = r.right));
          }
          return f;
        }),
        (u.prototype.clear = function () {
          return (this._root = null), (this._size = 0), this;
        }),
        (u.prototype.toList = function () {
          return l(this._root);
        }),
        (u.prototype.load = function (n, r, f) {
          r === void 0 && (r = []), f === void 0 && (f = !1);
          var c = n.length,
            a = this._comparator;
          if ((f && b(n, r, 0, c - 1, a), this._root === null))
            (this._root = x(n, r, 0, c)), (this._size = c);
          else {
            var E = v(this.toList(), m(n, r), a);
            (c = this._size + c), (this._root = g({ head: E }, 0, c));
          }
          return this;
        }),
        (u.prototype.isEmpty = function () {
          return this._root === null;
        }),
        Object.defineProperty(u.prototype, 'size', {
          get: function () {
            return this._size;
          },
          enumerable: !0,
          configurable: !0,
        }),
        Object.defineProperty(u.prototype, 'root', {
          get: function () {
            return this._root;
          },
          enumerable: !0,
          configurable: !0,
        }),
        (u.prototype.toString = function (n) {
          n === void 0 &&
            (n = function (f) {
              return String(f.key);
            });
          var r = [];
          return (
            p(
              this._root,
              '',
              !0,
              function (f) {
                return r.push(f);
              },
              n,
            ),
            r.join('')
          );
        }),
        (u.prototype.update = function (n, r, f) {
          var c = this._comparator,
            a = s(n, this._root, c),
            E = a.left,
            w = a.right;
          c(n, r) < 0 ? (w = o(r, f, w, c)) : (E = o(r, f, E, c)),
            (this._root = d(E, w, c));
        }),
        (u.prototype.split = function (n) {
          return s(n, this._root, this._comparator);
        }),
        (u.prototype[Symbol.iterator] = function () {
          var n, r, f;
          return h(this, function (c) {
            switch (c.label) {
              case 0:
                (n = this._root), (r = []), (f = !1), (c.label = 1);
              case 1:
                return f
                  ? [3, 6]
                  : n === null
                    ? [3, 2]
                    : (r.push(n), (n = n.left), [3, 5]);
              case 2:
                return r.length === 0 ? [3, 4] : ((n = r.pop()), [4, n]);
              case 3:
                return c.sent(), (n = n.right), [3, 5];
              case 4:
                (f = !0), (c.label = 5);
              case 5:
                return [3, 1];
              case 6:
                return [2];
            }
          });
        }),
        u
      );
    })();
    function x(u, n, r, f) {
      var c = f - r;
      if (c > 0) {
        var a = r + Math.floor(c / 2),
          E = u[a],
          w = n[a],
          _ = new t(E, w);
        return (_.left = x(u, n, r, a)), (_.right = x(u, n, a + 1, f)), _;
      }
      return null;
    }
    function m(u, n) {
      for (var r = new t(null, null), f = r, c = 0; c < u.length; c++)
        f = f.next = new t(u[c], n[c]);
      return (f.next = null), r.next;
    }
    function l(u) {
      for (var n = u, r = [], f = !1, c = new t(null, null), a = c; !f; )
        n
          ? (r.push(n), (n = n.left))
          : r.length > 0
            ? ((n = a = a.next = r.pop()), (n = n.right))
            : (f = !0);
      return (a.next = null), c.next;
    }
    function g(u, n, r) {
      var f = r - n;
      if (f > 0) {
        var c = n + Math.floor(f / 2),
          a = g(u, n, c),
          E = u.head;
        return (E.left = a), (u.head = u.head.next), (E.right = g(u, c + 1, r)), E;
      }
      return null;
    }
    function v(u, n, r) {
      for (var f = new t(null, null), c = f, a = u, E = n; a !== null && E !== null; )
        r(a.key, E.key) < 0 ? ((c.next = a), (a = a.next)) : ((c.next = E), (E = E.next)),
          (c = c.next);
      return a !== null ? (c.next = a) : E !== null && (c.next = E), f.next;
    }
    function b(u, n, r, f, c) {
      if (!(r >= f)) {
        for (var a = u[(r + f) >> 1], E = r - 1, w = f + 1; ; ) {
          do E++;
          while (c(u[E], a) < 0);
          do w--;
          while (c(u[w], a) > 0);
          if (E >= w) break;
          var _ = u[E];
          (u[E] = u[w]), (u[w] = _), (_ = n[E]), (n[E] = n[w]), (n[w] = _);
        }
        b(u, n, r, w, c), b(u, n, w + 1, f, c);
      }
    }
    return y;
  });
});
var vt = ot((te, dt) => {
  'use strict';
  var Nt = lt();
  function Ot(h) {
    return h && typeof h == 'object' && 'default' in h ? h : { default: h };
  }
  var rt = Ot(Nt),
    $ = (h, t) => h.ll.x <= t.x && t.x <= h.ur.x && h.ll.y <= t.y && t.y <= h.ur.y,
    Z = (h, t) => {
      if (t.ur.x < h.ll.x || h.ur.x < t.ll.x || t.ur.y < h.ll.y || h.ur.y < t.ll.y)
        return null;
      let e = h.ll.x < t.ll.x ? t.ll.x : h.ll.x,
        i = h.ur.x < t.ur.x ? h.ur.x : t.ur.x,
        o = h.ll.y < t.ll.y ? t.ll.y : h.ll.y,
        s = h.ur.y < t.ur.y ? h.ur.y : t.ur.y;
      return { ll: { x: e, y: o }, ur: { x: i, y: s } };
    },
    C = Number.EPSILON;
  C === void 0 && (C = Math.pow(2, -52));
  var Bt = C * C,
    ut = (h, t) => {
      if (-C < h && h < C && -C < t && t < C) return 0;
      let e = h - t;
      return e * e < Bt * h * t ? 0 : h < t ? -1 : 1;
    },
    H = class {
      constructor() {
        this.reset();
      }
      reset() {
        (this.xRounder = new q()), (this.yRounder = new q());
      }
      round(t, e) {
        return { x: this.xRounder.round(t), y: this.yRounder.round(e) };
      }
    },
    q = class {
      constructor() {
        (this.tree = new rt.default()), this.round(0);
      }
      round(t) {
        let e = this.tree.add(t),
          i = this.tree.prev(e);
        if (i !== null && ut(e.key, i.key) === 0) return this.tree.remove(t), i.key;
        let o = this.tree.next(e);
        return o !== null && ut(e.key, o.key) === 0 ? (this.tree.remove(t), o.key) : t;
      }
    },
    G = new H(),
    B = 11102230246251565e-32,
    I = 134217729,
    Ct = (3 + 8 * B) * B;
  function W(h, t, e, i, o) {
    let s,
      d,
      p,
      y,
      x = t[0],
      m = i[0],
      l = 0,
      g = 0;
    m > x == m > -x ? ((s = x), (x = t[++l])) : ((s = m), (m = i[++g]));
    let v = 0;
    if (l < h && g < e)
      for (
        m > x == m > -x
          ? ((d = x + s), (p = s - (d - x)), (x = t[++l]))
          : ((d = m + s), (p = s - (d - m)), (m = i[++g])),
          s = d,
          p !== 0 && (o[v++] = p);
        l < h && g < e;

      )
        m > x == m > -x
          ? ((d = s + x), (y = d - s), (p = s - (d - y) + (x - y)), (x = t[++l]))
          : ((d = s + m), (y = d - s), (p = s - (d - y) + (m - y)), (m = i[++g])),
          (s = d),
          p !== 0 && (o[v++] = p);
    for (; l < h; )
      (d = s + x),
        (y = d - s),
        (p = s - (d - y) + (x - y)),
        (x = t[++l]),
        (s = d),
        p !== 0 && (o[v++] = p);
    for (; g < e; )
      (d = s + m),
        (y = d - s),
        (p = s - (d - y) + (m - y)),
        (m = i[++g]),
        (s = d),
        p !== 0 && (o[v++] = p);
    return (s !== 0 || v === 0) && (o[v++] = s), v;
  }
  function jt(h, t) {
    let e = t[0];
    for (let i = 1; i < h; i++) e += t[i];
    return e;
  }
  function F(h) {
    return new Float64Array(h);
  }
  var zt = (3 + 16 * B) * B,
    Tt = (2 + 12 * B) * B,
    $t = (9 + 64 * B) * B * B,
    j = F(4),
    ft = F(8),
    ht = F(12),
    ct = F(16),
    P = F(4);
  function Gt(h, t, e, i, o, s, d) {
    let p,
      y,
      x,
      m,
      l,
      g,
      v,
      b,
      u,
      n,
      r,
      f,
      c,
      a,
      E,
      w,
      _,
      S,
      R = h - o,
      L = e - o,
      k = t - s,
      A = i - s;
    (a = R * A),
      (g = I * R),
      (v = g - (g - R)),
      (b = R - v),
      (g = I * A),
      (u = g - (g - A)),
      (n = A - u),
      (E = b * n - (a - v * u - b * u - v * n)),
      (w = k * L),
      (g = I * k),
      (v = g - (g - k)),
      (b = k - v),
      (g = I * L),
      (u = g - (g - L)),
      (n = L - u),
      (_ = b * n - (w - v * u - b * u - v * n)),
      (r = E - _),
      (l = E - r),
      (j[0] = E - (r + l) + (l - _)),
      (f = a + r),
      (l = f - a),
      (c = a - (f - l) + (r - l)),
      (r = c - w),
      (l = c - r),
      (j[1] = c - (r + l) + (l - w)),
      (S = f + r),
      (l = S - f),
      (j[2] = f - (S - l) + (r - l)),
      (j[3] = S);
    let O = jt(4, j),
      T = Tt * d;
    if (
      O >= T ||
      -O >= T ||
      ((l = h - R),
      (p = h - (R + l) + (l - o)),
      (l = e - L),
      (x = e - (L + l) + (l - o)),
      (l = t - k),
      (y = t - (k + l) + (l - s)),
      (l = i - A),
      (m = i - (A + l) + (l - s)),
      p === 0 && y === 0 && x === 0 && m === 0) ||
      ((T = $t * d + Ct * Math.abs(O)),
      (O += R * m + A * p - (k * x + L * y)),
      O >= T || -O >= T)
    )
      return O;
    (a = p * A),
      (g = I * p),
      (v = g - (g - p)),
      (b = p - v),
      (g = I * A),
      (u = g - (g - A)),
      (n = A - u),
      (E = b * n - (a - v * u - b * u - v * n)),
      (w = y * L),
      (g = I * y),
      (v = g - (g - y)),
      (b = y - v),
      (g = I * L),
      (u = g - (g - L)),
      (n = L - u),
      (_ = b * n - (w - v * u - b * u - v * n)),
      (r = E - _),
      (l = E - r),
      (P[0] = E - (r + l) + (l - _)),
      (f = a + r),
      (l = f - a),
      (c = a - (f - l) + (r - l)),
      (r = c - w),
      (l = c - r),
      (P[1] = c - (r + l) + (l - w)),
      (S = f + r),
      (l = S - f),
      (P[2] = f - (S - l) + (r - l)),
      (P[3] = S);
    let bt = W(4, j, 4, P, ft);
    (a = R * m),
      (g = I * R),
      (v = g - (g - R)),
      (b = R - v),
      (g = I * m),
      (u = g - (g - m)),
      (n = m - u),
      (E = b * n - (a - v * u - b * u - v * n)),
      (w = k * x),
      (g = I * k),
      (v = g - (g - k)),
      (b = k - v),
      (g = I * x),
      (u = g - (g - x)),
      (n = x - u),
      (_ = b * n - (w - v * u - b * u - v * n)),
      (r = E - _),
      (l = E - r),
      (P[0] = E - (r + l) + (l - _)),
      (f = a + r),
      (l = f - a),
      (c = a - (f - l) + (r - l)),
      (r = c - w),
      (l = c - r),
      (P[1] = c - (r + l) + (l - w)),
      (S = f + r),
      (l = S - f),
      (P[2] = f - (S - l) + (r - l)),
      (P[3] = S);
    let St = W(bt, ft, 4, P, ht);
    (a = p * m),
      (g = I * p),
      (v = g - (g - p)),
      (b = p - v),
      (g = I * m),
      (u = g - (g - m)),
      (n = m - u),
      (E = b * n - (a - v * u - b * u - v * n)),
      (w = y * x),
      (g = I * y),
      (v = g - (g - y)),
      (b = y - v),
      (g = I * x),
      (u = g - (g - x)),
      (n = x - u),
      (_ = b * n - (w - v * u - b * u - v * n)),
      (r = E - _),
      (l = E - r),
      (P[0] = E - (r + l) + (l - _)),
      (f = a + r),
      (l = f - a),
      (c = a - (f - l) + (r - l)),
      (r = c - w),
      (l = c - r),
      (P[1] = c - (r + l) + (l - w)),
      (S = f + r),
      (l = S - f),
      (P[2] = f - (S - l) + (r - l)),
      (P[3] = S);
    let _t = W(St, ht, 4, P, ct);
    return ct[_t - 1];
  }
  function Ft(h, t, e, i, o, s) {
    let d = (t - s) * (e - o),
      p = (h - o) * (i - s),
      y = d - p,
      x = Math.abs(d + p);
    return Math.abs(y) >= zt * x ? y : -Gt(h, t, e, i, o, s, x);
  }
  var Q = (h, t) => h.x * t.y - h.y * t.x,
    xt = (h, t) => h.x * t.x + h.y * t.y,
    at = (h, t, e) => {
      let i = Ft(h.x, h.y, t.x, t.y, e.x, e.y);
      return i > 0 ? -1 : i < 0 ? 1 : 0;
    },
    Y = (h) => Math.sqrt(xt(h, h)),
    Qt = (h, t, e) => {
      let i = { x: t.x - h.x, y: t.y - h.y },
        o = { x: e.x - h.x, y: e.y - h.y };
      return Q(o, i) / Y(o) / Y(i);
    },
    qt = (h, t, e) => {
      let i = { x: t.x - h.x, y: t.y - h.y },
        o = { x: e.x - h.x, y: e.y - h.y };
      return xt(o, i) / Y(o) / Y(i);
    },
    pt = (h, t, e) => (t.y === 0 ? null : { x: h.x + (t.x / t.y) * (e - h.y), y: e }),
    gt = (h, t, e) => (t.x === 0 ? null : { x: e, y: h.y + (t.y / t.x) * (e - h.x) }),
    Yt = (h, t, e, i) => {
      if (t.x === 0) return gt(e, i, h.x);
      if (i.x === 0) return gt(h, t, e.x);
      if (t.y === 0) return pt(e, i, h.y);
      if (i.y === 0) return pt(h, t, e.y);
      let o = Q(t, i);
      if (o == 0) return null;
      let s = { x: e.x - h.x, y: e.y - h.y },
        d = Q(s, t) / o,
        p = Q(s, i) / o,
        y = h.x + p * t.x,
        x = e.x + d * i.x,
        m = h.y + p * t.y,
        l = e.y + d * i.y,
        g = (y + x) / 2,
        v = (m + l) / 2;
      return { x: g, y: v };
    },
    M = class h {
      static compare(t, e) {
        let i = h.comparePoints(t.point, e.point);
        return i !== 0
          ? i
          : (t.point !== e.point && t.link(e),
            t.isLeft !== e.isLeft
              ? t.isLeft
                ? 1
                : -1
              : z.compare(t.segment, e.segment));
      }
      static comparePoints(t, e) {
        return t.x < e.x ? -1 : t.x > e.x ? 1 : t.y < e.y ? -1 : t.y > e.y ? 1 : 0;
      }
      constructor(t, e) {
        t.events === void 0 ? (t.events = [this]) : t.events.push(this),
          (this.point = t),
          (this.isLeft = e);
      }
      link(t) {
        if (t.point === this.point)
          throw new Error('Tried to link already linked events');
        let e = t.point.events;
        for (let i = 0, o = e.length; i < o; i++) {
          let s = e[i];
          this.point.events.push(s), (s.point = this.point);
        }
        this.checkForConsuming();
      }
      checkForConsuming() {
        let t = this.point.events.length;
        for (let e = 0; e < t; e++) {
          let i = this.point.events[e];
          if (i.segment.consumedBy === void 0)
            for (let o = e + 1; o < t; o++) {
              let s = this.point.events[o];
              s.consumedBy === void 0 &&
                i.otherSE.point.events === s.otherSE.point.events &&
                i.segment.consume(s.segment);
            }
        }
      }
      getAvailableLinkedEvents() {
        let t = [];
        for (let e = 0, i = this.point.events.length; e < i; e++) {
          let o = this.point.events[e];
          o !== this && !o.segment.ringOut && o.segment.isInResult() && t.push(o);
        }
        return t;
      }
      getLeftmostComparator(t) {
        let e = new Map(),
          i = (o) => {
            let s = o.otherSE;
            e.set(o, {
              sine: Qt(this.point, t.point, s.point),
              cosine: qt(this.point, t.point, s.point),
            });
          };
        return (o, s) => {
          e.has(o) || i(o), e.has(s) || i(s);
          let { sine: d, cosine: p } = e.get(o),
            { sine: y, cosine: x } = e.get(s);
          return d >= 0 && y >= 0
            ? p < x
              ? 1
              : p > x
                ? -1
                : 0
            : d < 0 && y < 0
              ? p < x
                ? -1
                : p > x
                  ? 1
                  : 0
              : y < d
                ? -1
                : y > d
                  ? 1
                  : 0;
        };
      }
    },
    Ut = 0,
    z = class h {
      static compare(t, e) {
        let i = t.leftSE.point.x,
          o = e.leftSE.point.x,
          s = t.rightSE.point.x,
          d = e.rightSE.point.x;
        if (d < i) return 1;
        if (s < o) return -1;
        let p = t.leftSE.point.y,
          y = e.leftSE.point.y,
          x = t.rightSE.point.y,
          m = e.rightSE.point.y;
        if (i < o) {
          if (y < p && y < x) return 1;
          if (y > p && y > x) return -1;
          let l = t.comparePoint(e.leftSE.point);
          if (l < 0) return 1;
          if (l > 0) return -1;
          let g = e.comparePoint(t.rightSE.point);
          return g !== 0 ? g : -1;
        }
        if (i > o) {
          if (p < y && p < m) return -1;
          if (p > y && p > m) return 1;
          let l = e.comparePoint(t.leftSE.point);
          if (l !== 0) return l;
          let g = t.comparePoint(e.rightSE.point);
          return g < 0 ? 1 : g > 0 ? -1 : 1;
        }
        if (p < y) return -1;
        if (p > y) return 1;
        if (s < d) {
          let l = e.comparePoint(t.rightSE.point);
          if (l !== 0) return l;
        }
        if (s > d) {
          let l = t.comparePoint(e.rightSE.point);
          if (l < 0) return 1;
          if (l > 0) return -1;
        }
        if (s !== d) {
          let l = x - p,
            g = s - i,
            v = m - y,
            b = d - o;
          if (l > g && v < b) return 1;
          if (l < g && v > b) return -1;
        }
        return s > d
          ? 1
          : s < d || x < m
            ? -1
            : x > m
              ? 1
              : t.id < e.id
                ? -1
                : t.id > e.id
                  ? 1
                  : 0;
      }
      constructor(t, e, i, o) {
        (this.id = ++Ut),
          (this.leftSE = t),
          (t.segment = this),
          (t.otherSE = e),
          (this.rightSE = e),
          (e.segment = this),
          (e.otherSE = t),
          (this.rings = i),
          (this.windings = o);
      }
      static fromRing(t, e, i) {
        let o,
          s,
          d,
          p = M.comparePoints(t, e);
        if (p < 0) (o = t), (s = e), (d = 1);
        else if (p > 0) (o = e), (s = t), (d = -1);
        else throw new Error(`Tried to create degenerate segment at [${t.x}, ${t.y}]`);
        let y = new M(o, !0),
          x = new M(s, !1);
        return new h(y, x, [i], [d]);
      }
      replaceRightSE(t) {
        (this.rightSE = t),
          (this.rightSE.segment = this),
          (this.rightSE.otherSE = this.leftSE),
          (this.leftSE.otherSE = this.rightSE);
      }
      bbox() {
        let t = this.leftSE.point.y,
          e = this.rightSE.point.y;
        return {
          ll: { x: this.leftSE.point.x, y: t < e ? t : e },
          ur: { x: this.rightSE.point.x, y: t > e ? t : e },
        };
      }
      vector() {
        return {
          x: this.rightSE.point.x - this.leftSE.point.x,
          y: this.rightSE.point.y - this.leftSE.point.y,
        };
      }
      isAnEndpoint(t) {
        return (
          (t.x === this.leftSE.point.x && t.y === this.leftSE.point.y) ||
          (t.x === this.rightSE.point.x && t.y === this.rightSE.point.y)
        );
      }
      comparePoint(t) {
        if (this.isAnEndpoint(t)) return 0;
        let e = this.leftSE.point,
          i = this.rightSE.point,
          o = this.vector();
        if (e.x === i.x) return t.x === e.x ? 0 : t.x < e.x ? 1 : -1;
        let s = (t.y - e.y) / o.y,
          d = e.x + s * o.x;
        if (t.x === d) return 0;
        let p = (t.x - e.x) / o.x,
          y = e.y + p * o.y;
        return t.y === y ? 0 : t.y < y ? -1 : 1;
      }
      getIntersection(t) {
        let e = this.bbox(),
          i = t.bbox(),
          o = Z(e, i);
        if (o === null) return null;
        let s = this.leftSE.point,
          d = this.rightSE.point,
          p = t.leftSE.point,
          y = t.rightSE.point,
          x = $(e, p) && this.comparePoint(p) === 0,
          m = $(i, s) && t.comparePoint(s) === 0,
          l = $(e, y) && this.comparePoint(y) === 0,
          g = $(i, d) && t.comparePoint(d) === 0;
        if (m && x) return g && !l ? d : !g && l ? y : null;
        if (m) return l && s.x === y.x && s.y === y.y ? null : s;
        if (x) return g && d.x === p.x && d.y === p.y ? null : p;
        if (g && l) return null;
        if (g) return d;
        if (l) return y;
        let v = Yt(s, this.vector(), p, t.vector());
        return v === null || !$(o, v) ? null : G.round(v.x, v.y);
      }
      split(t) {
        let e = [],
          i = t.events !== void 0,
          o = new M(t, !0),
          s = new M(t, !1),
          d = this.rightSE;
        this.replaceRightSE(s), e.push(s), e.push(o);
        let p = new h(o, d, this.rings.slice(), this.windings.slice());
        return (
          M.comparePoints(p.leftSE.point, p.rightSE.point) > 0 && p.swapEvents(),
          M.comparePoints(this.leftSE.point, this.rightSE.point) > 0 && this.swapEvents(),
          i && (o.checkForConsuming(), s.checkForConsuming()),
          e
        );
      }
      swapEvents() {
        let t = this.rightSE;
        (this.rightSE = this.leftSE),
          (this.leftSE = t),
          (this.leftSE.isLeft = !0),
          (this.rightSE.isLeft = !1);
        for (let e = 0, i = this.windings.length; e < i; e++) this.windings[e] *= -1;
      }
      consume(t) {
        let e = this,
          i = t;
        for (; e.consumedBy; ) e = e.consumedBy;
        for (; i.consumedBy; ) i = i.consumedBy;
        let o = h.compare(e, i);
        if (o !== 0) {
          if (o > 0) {
            let s = e;
            (e = i), (i = s);
          }
          if (e.prev === i) {
            let s = e;
            (e = i), (i = s);
          }
          for (let s = 0, d = i.rings.length; s < d; s++) {
            let p = i.rings[s],
              y = i.windings[s],
              x = e.rings.indexOf(p);
            x === -1 ? (e.rings.push(p), e.windings.push(y)) : (e.windings[x] += y);
          }
          (i.rings = null),
            (i.windings = null),
            (i.consumedBy = e),
            (i.leftSE.consumedBy = e.leftSE),
            (i.rightSE.consumedBy = e.rightSE);
        }
      }
      prevInResult() {
        return this._prevInResult !== void 0
          ? this._prevInResult
          : (this.prev
              ? this.prev.isInResult()
                ? (this._prevInResult = this.prev)
                : (this._prevInResult = this.prev.prevInResult())
              : (this._prevInResult = null),
            this._prevInResult);
      }
      beforeState() {
        if (this._beforeState !== void 0) return this._beforeState;
        if (!this.prev) this._beforeState = { rings: [], windings: [], multiPolys: [] };
        else {
          let t = this.prev.consumedBy || this.prev;
          this._beforeState = t.afterState();
        }
        return this._beforeState;
      }
      afterState() {
        if (this._afterState !== void 0) return this._afterState;
        let t = this.beforeState();
        this._afterState = {
          rings: t.rings.slice(0),
          windings: t.windings.slice(0),
          multiPolys: [],
        };
        let e = this._afterState.rings,
          i = this._afterState.windings,
          o = this._afterState.multiPolys;
        for (let p = 0, y = this.rings.length; p < y; p++) {
          let x = this.rings[p],
            m = this.windings[p],
            l = e.indexOf(x);
          l === -1 ? (e.push(x), i.push(m)) : (i[l] += m);
        }
        let s = [],
          d = [];
        for (let p = 0, y = e.length; p < y; p++) {
          if (i[p] === 0) continue;
          let x = e[p],
            m = x.poly;
          if (d.indexOf(m) === -1)
            if (x.isExterior) s.push(m);
            else {
              d.indexOf(m) === -1 && d.push(m);
              let l = s.indexOf(x.poly);
              l !== -1 && s.splice(l, 1);
            }
        }
        for (let p = 0, y = s.length; p < y; p++) {
          let x = s[p].multiPoly;
          o.indexOf(x) === -1 && o.push(x);
        }
        return this._afterState;
      }
      isInResult() {
        if (this.consumedBy) return !1;
        if (this._isInResult !== void 0) return this._isInResult;
        let t = this.beforeState().multiPolys,
          e = this.afterState().multiPolys;
        switch (N.type) {
          case 'union': {
            let i = t.length === 0,
              o = e.length === 0;
            this._isInResult = i !== o;
            break;
          }
          case 'intersection': {
            let i, o;
            t.length < e.length
              ? ((i = t.length), (o = e.length))
              : ((i = e.length), (o = t.length)),
              (this._isInResult = o === N.numMultiPolys && i < o);
            break;
          }
          case 'xor': {
            let i = Math.abs(t.length - e.length);
            this._isInResult = i % 2 === 1;
            break;
          }
          case 'difference': {
            let i = (o) => o.length === 1 && o[0].isSubject;
            this._isInResult = i(t) !== i(e);
            break;
          }
          default:
            throw new Error(`Unrecognized operation type found ${N.type}`);
        }
        return this._isInResult;
      }
    },
    U = class {
      constructor(t, e, i) {
        if (!Array.isArray(t) || t.length === 0)
          throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
        if (
          ((this.poly = e),
          (this.isExterior = i),
          (this.segments = []),
          typeof t[0][0] != 'number' || typeof t[0][1] != 'number')
        )
          throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
        let o = G.round(t[0][0], t[0][1]);
        this.bbox = { ll: { x: o.x, y: o.y }, ur: { x: o.x, y: o.y } };
        let s = o;
        for (let d = 1, p = t.length; d < p; d++) {
          if (typeof t[d][0] != 'number' || typeof t[d][1] != 'number')
            throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
          let y = G.round(t[d][0], t[d][1]);
          (y.x === s.x && y.y === s.y) ||
            (this.segments.push(z.fromRing(s, y, this)),
            y.x < this.bbox.ll.x && (this.bbox.ll.x = y.x),
            y.y < this.bbox.ll.y && (this.bbox.ll.y = y.y),
            y.x > this.bbox.ur.x && (this.bbox.ur.x = y.x),
            y.y > this.bbox.ur.y && (this.bbox.ur.y = y.y),
            (s = y));
        }
        (o.x !== s.x || o.y !== s.y) && this.segments.push(z.fromRing(s, o, this));
      }
      getSweepEvents() {
        let t = [];
        for (let e = 0, i = this.segments.length; e < i; e++) {
          let o = this.segments[e];
          t.push(o.leftSE), t.push(o.rightSE);
        }
        return t;
      }
    },
    K = class {
      constructor(t, e) {
        if (!Array.isArray(t))
          throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
        (this.exteriorRing = new U(t[0], this, !0)),
          (this.bbox = {
            ll: { x: this.exteriorRing.bbox.ll.x, y: this.exteriorRing.bbox.ll.y },
            ur: { x: this.exteriorRing.bbox.ur.x, y: this.exteriorRing.bbox.ur.y },
          }),
          (this.interiorRings = []);
        for (let i = 1, o = t.length; i < o; i++) {
          let s = new U(t[i], this, !1);
          s.bbox.ll.x < this.bbox.ll.x && (this.bbox.ll.x = s.bbox.ll.x),
            s.bbox.ll.y < this.bbox.ll.y && (this.bbox.ll.y = s.bbox.ll.y),
            s.bbox.ur.x > this.bbox.ur.x && (this.bbox.ur.x = s.bbox.ur.x),
            s.bbox.ur.y > this.bbox.ur.y && (this.bbox.ur.y = s.bbox.ur.y),
            this.interiorRings.push(s);
        }
        this.multiPoly = e;
      }
      getSweepEvents() {
        let t = this.exteriorRing.getSweepEvents();
        for (let e = 0, i = this.interiorRings.length; e < i; e++) {
          let o = this.interiorRings[e].getSweepEvents();
          for (let s = 0, d = o.length; s < d; s++) t.push(o[s]);
        }
        return t;
      }
    },
    D = class {
      constructor(t, e) {
        if (!Array.isArray(t))
          throw new Error('Input geometry is not a valid Polygon or MultiPolygon');
        try {
          typeof t[0][0][0] == 'number' && (t = [t]);
        } catch {}
        (this.polys = []),
          (this.bbox = {
            ll: { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY },
            ur: { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY },
          });
        for (let i = 0, o = t.length; i < o; i++) {
          let s = new K(t[i], this);
          s.bbox.ll.x < this.bbox.ll.x && (this.bbox.ll.x = s.bbox.ll.x),
            s.bbox.ll.y < this.bbox.ll.y && (this.bbox.ll.y = s.bbox.ll.y),
            s.bbox.ur.x > this.bbox.ur.x && (this.bbox.ur.x = s.bbox.ur.x),
            s.bbox.ur.y > this.bbox.ur.y && (this.bbox.ur.y = s.bbox.ur.y),
            this.polys.push(s);
        }
        this.isSubject = e;
      }
      getSweepEvents() {
        let t = [];
        for (let e = 0, i = this.polys.length; e < i; e++) {
          let o = this.polys[e].getSweepEvents();
          for (let s = 0, d = o.length; s < d; s++) t.push(o[s]);
        }
        return t;
      }
    },
    tt = class h {
      static factory(t) {
        let e = [];
        for (let i = 0, o = t.length; i < o; i++) {
          let s = t[i];
          if (!s.isInResult() || s.ringOut) continue;
          let d = null,
            p = s.leftSE,
            y = s.rightSE,
            x = [p],
            m = p.point,
            l = [];
          for (; (d = p), (p = y), x.push(p), p.point !== m; )
            for (;;) {
              let g = p.getAvailableLinkedEvents();
              if (g.length === 0) {
                let u = x[0].point,
                  n = x[x.length - 1].point;
                throw new Error(
                  `Unable to complete output ring starting at [${u.x}, ${u.y}]. Last matching segment found ends at [${n.x}, ${n.y}].`,
                );
              }
              if (g.length === 1) {
                y = g[0].otherSE;
                break;
              }
              let v = null;
              for (let u = 0, n = l.length; u < n; u++)
                if (l[u].point === p.point) {
                  v = u;
                  break;
                }
              if (v !== null) {
                let u = l.splice(v)[0],
                  n = x.splice(u.index);
                n.unshift(n[0].otherSE), e.push(new h(n.reverse()));
                continue;
              }
              l.push({ index: x.length, point: p.point });
              let b = p.getLeftmostComparator(d);
              y = g.sort(b)[0].otherSE;
              break;
            }
          e.push(new h(x));
        }
        return e;
      }
      constructor(t) {
        this.events = t;
        for (let e = 0, i = t.length; e < i; e++) t[e].segment.ringOut = this;
        this.poly = null;
      }
      getGeom() {
        let t = this.events[0].point,
          e = [t];
        for (let x = 1, m = this.events.length - 1; x < m; x++) {
          let l = this.events[x].point,
            g = this.events[x + 1].point;
          at(l, t, g) !== 0 && (e.push(l), (t = l));
        }
        if (e.length === 1) return null;
        let i = e[0],
          o = e[1];
        at(i, t, o) === 0 && e.shift(), e.push(e[0]);
        let s = this.isExteriorRing() ? 1 : -1,
          d = this.isExteriorRing() ? 0 : e.length - 1,
          p = this.isExteriorRing() ? e.length : -1,
          y = [];
        for (let x = d; x != p; x += s) y.push([e[x].x, e[x].y]);
        return y;
      }
      isExteriorRing() {
        if (this._isExteriorRing === void 0) {
          let t = this.enclosingRing();
          this._isExteriorRing = t ? !t.isExteriorRing() : !0;
        }
        return this._isExteriorRing;
      }
      enclosingRing() {
        return (
          this._enclosingRing === void 0 &&
            (this._enclosingRing = this._calcEnclosingRing()),
          this._enclosingRing
        );
      }
      _calcEnclosingRing() {
        let t = this.events[0];
        for (let o = 1, s = this.events.length; o < s; o++) {
          let d = this.events[o];
          M.compare(t, d) > 0 && (t = d);
        }
        let e = t.segment.prevInResult(),
          i = e ? e.prevInResult() : null;
        for (;;) {
          if (!e) return null;
          if (!i) return e.ringOut;
          if (i.ringOut !== e.ringOut)
            return i.ringOut.enclosingRing() !== e.ringOut
              ? e.ringOut
              : e.ringOut.enclosingRing();
          (e = i.prevInResult()), (i = e ? e.prevInResult() : null);
        }
      }
    },
    X = class {
      constructor(t) {
        (this.exteriorRing = t), (t.poly = this), (this.interiorRings = []);
      }
      addInterior(t) {
        this.interiorRings.push(t), (t.poly = this);
      }
      getGeom() {
        let t = [this.exteriorRing.getGeom()];
        if (t[0] === null) return null;
        for (let e = 0, i = this.interiorRings.length; e < i; e++) {
          let o = this.interiorRings[e].getGeom();
          o !== null && t.push(o);
        }
        return t;
      }
    },
    et = class {
      constructor(t) {
        (this.rings = t), (this.polys = this._composePolys(t));
      }
      getGeom() {
        let t = [];
        for (let e = 0, i = this.polys.length; e < i; e++) {
          let o = this.polys[e].getGeom();
          o !== null && t.push(o);
        }
        return t;
      }
      _composePolys(t) {
        let e = [];
        for (let i = 0, o = t.length; i < o; i++) {
          let s = t[i];
          if (!s.poly)
            if (s.isExteriorRing()) e.push(new X(s));
            else {
              let d = s.enclosingRing();
              d.poly || e.push(new X(d)), d.poly.addInterior(s);
            }
        }
        return e;
      }
    },
    nt = class {
      constructor(t) {
        let e =
          arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : z.compare;
        (this.queue = t), (this.tree = new rt.default(e)), (this.segments = []);
      }
      process(t) {
        let e = t.segment,
          i = [];
        if (t.consumedBy)
          return t.isLeft ? this.queue.remove(t.otherSE) : this.tree.remove(e), i;
        let o = t.isLeft ? this.tree.add(e) : this.tree.find(e);
        if (!o)
          throw new Error(
            `Unable to find segment #${e.id} [${e.leftSE.point.x}, ${e.leftSE.point.y}] -> [${e.rightSE.point.x}, ${e.rightSE.point.y}] in SweepLine tree.`,
          );
        let s = o,
          d = o,
          p,
          y;
        for (; p === void 0; )
          (s = this.tree.prev(s)),
            s === null ? (p = null) : s.key.consumedBy === void 0 && (p = s.key);
        for (; y === void 0; )
          (d = this.tree.next(d)),
            d === null ? (y = null) : d.key.consumedBy === void 0 && (y = d.key);
        if (t.isLeft) {
          let x = null;
          if (p) {
            let l = p.getIntersection(e);
            if (l !== null && (e.isAnEndpoint(l) || (x = l), !p.isAnEndpoint(l))) {
              let g = this._splitSafely(p, l);
              for (let v = 0, b = g.length; v < b; v++) i.push(g[v]);
            }
          }
          let m = null;
          if (y) {
            let l = y.getIntersection(e);
            if (l !== null && (e.isAnEndpoint(l) || (m = l), !y.isAnEndpoint(l))) {
              let g = this._splitSafely(y, l);
              for (let v = 0, b = g.length; v < b; v++) i.push(g[v]);
            }
          }
          if (x !== null || m !== null) {
            let l = null;
            x === null
              ? (l = m)
              : m === null
                ? (l = x)
                : (l = M.comparePoints(x, m) <= 0 ? x : m),
              this.queue.remove(e.rightSE),
              i.push(e.rightSE);
            let g = e.split(l);
            for (let v = 0, b = g.length; v < b; v++) i.push(g[v]);
          }
          i.length > 0
            ? (this.tree.remove(e), i.push(t))
            : (this.segments.push(e), (e.prev = p));
        } else {
          if (p && y) {
            let x = p.getIntersection(y);
            if (x !== null) {
              if (!p.isAnEndpoint(x)) {
                let m = this._splitSafely(p, x);
                for (let l = 0, g = m.length; l < g; l++) i.push(m[l]);
              }
              if (!y.isAnEndpoint(x)) {
                let m = this._splitSafely(y, x);
                for (let l = 0, g = m.length; l < g; l++) i.push(m[l]);
              }
            }
          }
          this.tree.remove(e);
        }
        return i;
      }
      _splitSafely(t, e) {
        this.tree.remove(t);
        let i = t.rightSE;
        this.queue.remove(i);
        let o = t.split(e);
        return o.push(i), t.consumedBy === void 0 && this.tree.add(t), o;
      }
    },
    yt = (typeof process < 'u' && process.env.POLYGON_CLIPPING_MAX_QUEUE_SIZE) || 1e6,
    Dt =
      (typeof process < 'u' && process.env.POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS) ||
      1e6,
    it = class {
      run(t, e, i) {
        (N.type = t), G.reset();
        let o = [new D(e, !0)];
        for (let l = 0, g = i.length; l < g; l++) o.push(new D(i[l], !1));
        if (((N.numMultiPolys = o.length), N.type === 'difference')) {
          let l = o[0],
            g = 1;
          for (; g < o.length; ) Z(o[g].bbox, l.bbox) !== null ? g++ : o.splice(g, 1);
        }
        if (N.type === 'intersection')
          for (let l = 0, g = o.length; l < g; l++) {
            let v = o[l];
            for (let b = l + 1, u = o.length; b < u; b++)
              if (Z(v.bbox, o[b].bbox) === null) return [];
          }
        let s = new rt.default(M.compare);
        for (let l = 0, g = o.length; l < g; l++) {
          let v = o[l].getSweepEvents();
          for (let b = 0, u = v.length; b < u; b++)
            if ((s.insert(v[b]), s.size > yt))
              throw new Error(
                'Infinite loop when putting segment endpoints in a priority queue (queue size too big).',
              );
        }
        let d = new nt(s),
          p = s.size,
          y = s.pop();
        for (; y; ) {
          let l = y.key;
          if (s.size === p) {
            let v = l.segment;
            throw new Error(
              `Unable to pop() ${l.isLeft ? 'left' : 'right'} SweepEvent [${l.point.x}, ${l.point.y}] from segment #${v.id} [${v.leftSE.point.x}, ${v.leftSE.point.y}] -> [${v.rightSE.point.x}, ${v.rightSE.point.y}] from queue.`,
            );
          }
          if (s.size > yt)
            throw new Error(
              'Infinite loop when passing sweep line over endpoints (queue size too big).',
            );
          if (d.segments.length > Dt)
            throw new Error(
              'Infinite loop when passing sweep line over endpoints (too many sweep line segments).',
            );
          let g = d.process(l);
          for (let v = 0, b = g.length; v < b; v++) {
            let u = g[v];
            u.consumedBy === void 0 && s.insert(u);
          }
          (p = s.size), (y = s.pop());
        }
        G.reset();
        let x = tt.factory(d.segments);
        return new et(x).getGeom();
      }
    },
    N = new it(),
    Xt = function (h) {
      for (var t = arguments.length, e = new Array(t > 1 ? t - 1 : 0), i = 1; i < t; i++)
        e[i - 1] = arguments[i];
      return N.run('union', h, e);
    },
    Vt = function (h) {
      for (var t = arguments.length, e = new Array(t > 1 ? t - 1 : 0), i = 1; i < t; i++)
        e[i - 1] = arguments[i];
      return N.run('intersection', h, e);
    },
    Jt = function (h) {
      for (var t = arguments.length, e = new Array(t > 1 ? t - 1 : 0), i = 1; i < t; i++)
        e[i - 1] = arguments[i];
      return N.run('xor', h, e);
    },
    Wt = function (h) {
      for (var t = arguments.length, e = new Array(t > 1 ? t - 1 : 0), i = 1; i < t; i++)
        e[i - 1] = arguments[i];
      return N.run('difference', h, e);
    },
    Zt = { union: Xt, intersection: Vt, xor: Jt, difference: Wt };
  dt.exports = Zt;
});
var wt = require('node:fs');
var mt = At(vt(), 1),
  Et = (h) => {
    if (!Array.isArray(h)) throw new Error('Invalid legacy guild path');
    if (h.length === 0) return [];
    let t = h.map((e) => {
      if (
        !e ||
        typeof e != 'object' ||
        !('x' in e) ||
        !('y' in e) ||
        typeof e.x != 'number' ||
        typeof e.y != 'number' ||
        !Number.isFinite(e.x) ||
        !Number.isFinite(e.y)
      )
        throw new Error('Invalid legacy guild point');
      return [e.x, e.y];
    });
    return mt.default
      .union([t])
      .map((e) => e.map((i) => i.map(([o, s]) => ({ x: o, y: s }))));
  };
var Ht = JSON.parse((0, wt.readFileSync)(process.argv[2], 'utf8'));
process.stdout.write(JSON.stringify(Ht.map((h) => ({ ...h, path: Et(h.path) }))));
/*! Bundled license information:

splaytree/dist/splay.js:
  (**
   * splaytree v3.1.2
   * Fast Splay tree for Node and browser
   *
   * @author Alexander Milevski <info@w8r.name>
   * @license MIT
   * @preserve
   *)
  (*! *****************************************************************************
      Copyright (c) Microsoft Corporation. All rights reserved.
      Licensed under the Apache License, Version 2.0 (the "License"); you may not use
      this file except in compliance with the License. You may obtain a copy of the
      License at http://www.apache.org/licenses/LICENSE-2.0

      THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
      KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
      WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
      MERCHANTABLITY OR NON-INFRINGEMENT.

      See the Apache Version 2.0 License for specific language governing permissions
      and limitations under the License.
      ***************************************************************************** *)
*/
