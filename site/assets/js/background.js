/*
 * D6 Studios background: three coordinated layers.
 *   1. Damascus contour lines: dense displaced iso-lines that bunch, fold and drift. Drawn per pixel by a
 *      small WebGL shader; falls back to a lighter Canvas 2D version when WebGL is unavailable.
 *   2. Grid: a stable orthogonal lattice; short segment groups fade in, hold and dissolve.
 *      Sections marked [data-grid-reveal] briefly reveal the lattice as they enter view.
 *   3. Quadtree: sparse recursive squares that occasionally split or merge, very quietly.
 * Animates continuously and smoothly (owner decision, also under prefers-reduced-motion, where it
 * only drops pointer response). A user pause control is provided; rendering stops while the tab is hidden.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('bg');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var waves = document.createElement('canvas');
  var wctx = waves.getContext('2d');
  if (!wctx) return;

  /* ---------- WebGL Damascus layer ---------- */
  var glCanvas = document.createElement('canvas');
  glCanvas.className = 'bg-canvas';
  glCanvas.setAttribute('aria-hidden', 'true');
  var gl = null, glProg = null, glU = {};
  var FIELD_GLSL = [
    'float field(float u, float v, float t, float p) {',
    '  float a = sin(u * 0.0021 + v * 0.0094 + t * 0.05 + p) * 44.0;',
    '  float c = sin(v * 0.0112 + 1.7 * sin(u * 0.0013 + t * 0.027) + t * 0.018) * 24.0;',
    '  float d = sin(u * 0.0009 + v * 0.0021 - t * 0.012) * 36.0;',
    '  float m = 0.5 + 0.5 * sin(u * 0.0016 + v * 0.003 - t * 0.03);',
    '  float e = sin(v * 0.029 + 2.4 * sin(u * 0.0026 + v * 0.004 + t * 0.022)) * 19.0 * m;',
    '  float env = 0.5 + 0.5 * sin(v * 0.0078 - t * 0.015 + 1.2 * sin(u * 0.0011));',
    '  float g = sin(u * 0.0052 + v * 0.006 + t * 0.03 + 0.8 * sin(v * 0.02)) * 40.0 * env * env * env;',
    '  return a + c + d + e + g;',
    '}'
  ].join('\n');
  var FRAG = [
    '#extension GL_OES_standard_derivatives : enable',
    'precision highp float;',
    'uniform vec2 uRes; uniform float uDpr, uT, uI, uP, uSp;',
    'float hash(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }',
    FIELD_GLSL,
    // piecewise-linear masks matching the design: strong at edges, quiet under the text column
    'float maskH(float x) {',
    '  if (x < 0.18) return mix(1.0, 0.62, x / 0.18);',
    '  if (x < 0.38) return mix(0.62, 0.2, (x - 0.18) / 0.2);',
    '  if (x < 0.55) return mix(0.2, 0.24, (x - 0.38) / 0.17);',
    '  if (x < 0.75) return mix(0.24, 0.75, (x - 0.55) / 0.2);',
    '  return mix(0.75, 1.0, (x - 0.75) / 0.25);',
    '}',
    'float maskV(float y) { return y < 0.55 ? mix(0.95, 0.7, y / 0.55) : mix(0.7, 0.9, (y - 0.55) / 0.45); }',
    'void main() {',
    '  vec2 px = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;',
    '  vec2 c = px - uRes * 0.5;',
    '  float ca = cos(-0.17), sa = sin(-0.17);',
    '  float u = c.x * ca + c.y * sa;',
    '  float v = -c.x * sa + c.y * ca;',
    // contour lines of s = v + field(u, v): bands compress and fold where the field bends
    '  float q = (v + field(u, v, uT, uP)) / uSp;',
    '  float fw = max(fwidth(q), 1e-4);',
    '  float dl = abs(fract(q + 0.5) - 0.5);',
    '  float line = 1.0 - smoothstep(0.0, 1.15, dl / fw);',
    '  line = mix(line, 0.55, smoothstep(0.35, 1.1, fw));',
    '  float Lk = floor(q + 0.5) * uSp;',
    '  float h = hash(floor(q + 0.5) * 1.37 + 0.5);',
    '  float base = h > 0.94 ? 0.95 : (h > 0.6 ? 0.6 : 0.36);',
    '  float sheen = 0.5 + 0.5 * sin(Lk * 0.0052 - uT * 0.085 + 1.3 * sin(Lk * 0.0017 + uT * 0.02));',
    '  float band = 0.5 + 0.5 * sin(Lk * 0.031 + 2.0 * sin(Lk * 0.006));',
    '  float a = base * (0.35 + 0.65 * sheen * sheen) * (0.6 + 0.4 * band);',
    '  float alpha = line * (0.09 + a * 0.42) * maskH(px.x / uRes.x) * maskV(px.y / uRes.y) * uI;',
    '  vec3 col = (vec3(118.0, 122.0, 128.0) + a * 120.0) / 255.0;',
    '  gl_FragColor = vec4(col * alpha, alpha);',
    '}'
  ].join('\n');
  function initGL() {
    try {
      gl = glCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
      if (!gl || !gl.getExtension('OES_standard_derivatives')) { gl = null; return false; }
      var vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }');
      gl.compileShader(vs);
      var fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, FRAG);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(fs));
      glProg = gl.createProgram();
      gl.attachShader(glProg, vs); gl.attachShader(glProg, fs); gl.linkProgram(glProg);
      if (!gl.getProgramParameter(glProg, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(glProg));
      gl.useProgram(glProg);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(glProg, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['uRes', 'uDpr', 'uT', 'uI', 'uP', 'uSp'].forEach(function (n) { glU[n] = gl.getUniformLocation(glProg, n); });
      canvas.parentNode.insertBefore(glCanvas, canvas);
      return true;
    } catch (err) {
      gl = null;
      return false;
    }
  }
  glCanvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); gl = null; if (glCanvas.parentNode) glCanvas.parentNode.removeChild(glCanvas); });
  function drawGL(t, intensity) {
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.uniform2f(glU.uRes, W, H);
    gl.uniform1f(glU.uDpr, glCanvas.width / W);
    gl.uniform1f(glU.uT, t);
    gl.uniform1f(glU.uI, intensity);
    gl.uniform1f(glU.uP, (pointerEase - 0.5) * 0.35);
    gl.uniform1f(glU.uSp, small ? 10 : 8.5);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var finePointer = window.matchMedia ? window.matchMedia('(pointer: fine)').matches : false;
  var STORE_KEY = 'd6-background-paused';
  var paused = false;
  try { paused = window.localStorage.getItem(STORE_KEY) === '1'; } catch (e) { /* storage unavailable */ }

  var W = 0, H = 0, dpr = 1, small = false, cell = 72, gx0 = 0, gy0 = 0;
  var simT = 0, lastFrame = 0, rafId = 0, looping = false;
  var pointerX = 0.5, pointerEase = 0.5;
  var groups = [], nextSpawn = 0, groupsStatic = false;
  var reveals = [];
  var roots = [], nextTreeEvent = 0;
  var rand = mulberry(0xd6d6);
  var SPEED = 2.2; // simulation seconds per real second: slow, but always visibly flowing

  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  /* ---------- sizing ---------- */
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    // Ignore small height-only changes from mobile URL bars; the canvas is CSS-stretched.
    if (W && w === W && Math.abs(h - H) < 120) return false;
    W = w; H = h;
    small = W < 720;
    dpr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    waves.width = canvas.width; waves.height = canvas.height;
    var gdpr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.35);
    glCanvas.width = Math.round(W * gdpr); glCanvas.height = Math.round(H * gdpr);
    cell = small ? 56 : 72;
    gx0 = Math.round((W % cell) / 2); gy0 = Math.round((H % cell) / 2);
    buildTree();
    groups = [];
    return true;
  }

  /* ---------- layer 1: Damascus contour lines ---------- */
  // Same field as the shader; the 2D fallback approximates its contours as v = L - field(u, L).
  function field(u, v, t, p) {
    var a = Math.sin(u * 0.0021 + v * 0.0094 + t * 0.05 + p) * 44;
    var c = Math.sin(v * 0.0112 + 1.7 * Math.sin(u * 0.0013 + t * 0.027) + t * 0.018) * 24;
    var d = Math.sin(u * 0.0009 + v * 0.0021 - t * 0.012) * 36;
    var m = 0.5 + 0.5 * Math.sin(u * 0.0016 + v * 0.003 - t * 0.03);
    var e = Math.sin(v * 0.029 + 2.4 * Math.sin(u * 0.0026 + v * 0.004 + t * 0.022)) * 19 * m;
    var env = 0.5 + 0.5 * Math.sin(v * 0.0078 - t * 0.015 + 1.2 * Math.sin(u * 0.0011));
    var g = Math.sin(u * 0.0052 + v * 0.006 + t * 0.03 + 0.8 * Math.sin(v * 0.02)) * 40 * env * env * env;
    return a + c + d + e + g;
  }

  var BUCKETS = 6;
  function drawWaves(t, intensity) {
    var spacing = small ? 12 : 10;
    var step = small ? 18 : 15;
    var angle = -0.17;
    var D = Math.sqrt(W * W + H * H) / 2 + 40;
    var p = (pointerEase - 0.5) * 0.35;
    var paths = [];
    for (var k = 0; k < BUCKETS; k++) paths.push(new Path2D());

    var cosA = Math.cos(angle), sinA = Math.sin(angle), cx = W / 2, cy = H / 2;
    var nLines = Math.ceil((2 * D + 240) / spacing);
    for (var i = 0; i < nLines; i++) {
      var L = -D - 120 + i * spacing;
      var h = hash(i * 1.37 + 0.5);
      var base = h > 0.94 ? 0.95 : h > 0.6 ? 0.6 : 0.36;
      var sheen = 0.5 + 0.5 * Math.sin(L * 0.0052 - t * 0.085 + 1.3 * Math.sin(L * 0.0017 + t * 0.02));
      var band = 0.5 + 0.5 * Math.sin(L * 0.031 + 2 * Math.sin(L * 0.006));
      var a = base * (0.35 + 0.65 * sheen * sheen) * (0.6 + 0.4 * band);
      var bucket = Math.min(BUCKETS - 1, Math.floor(a * BUCKETS));
      var path = paths[bucket];
      for (var u = -D; u <= D + step; u += step) {
        var v = L - field(u, L, t, p);
        var x = cx + u * cosA - v * sinA;
        var y = cy + u * sinA + v * cosA;
        if (u === -D) path.moveTo(x, y); else path.lineTo(x, y);
      }
    }

    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.globalCompositeOperation = 'source-over';
    wctx.clearRect(0, 0, waves.width, waves.height);
    wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    wctx.lineWidth = small ? 0.8 : 0.75;
    for (var b = 0; b < BUCKETS; b++) {
      var al = (b + 0.5) / BUCKETS;
      // graphite to silver, brighter buckets slightly warmer white
      var c = Math.round(118 + al * 120);
      wctx.strokeStyle = 'rgba(' + c + ',' + (c + 4) + ',' + (c + 10) + ',' + (0.09 + al * 0.42).toFixed(3) + ')';
      wctx.stroke(paths[b]);
    }

    // Soft masks: strongest at the edges and the upper right (hero art), quiet under the text column.
    wctx.globalCompositeOperation = 'destination-in';
    var gh = wctx.createLinearGradient(0, 0, W, 0);
    gh.addColorStop(0, 'rgba(0,0,0,1)');
    gh.addColorStop(0.18, 'rgba(0,0,0,0.62)');
    gh.addColorStop(0.38, 'rgba(0,0,0,0.2)');
    gh.addColorStop(0.55, 'rgba(0,0,0,0.24)');
    gh.addColorStop(0.75, 'rgba(0,0,0,0.75)');
    gh.addColorStop(1, 'rgba(0,0,0,1)');
    wctx.fillStyle = gh;
    wctx.fillRect(0, 0, W, H);
    var gv = wctx.createLinearGradient(0, 0, 0, H);
    gv.addColorStop(0, 'rgba(0,0,0,0.95)');
    gv.addColorStop(0.55, 'rgba(0,0,0,0.7)');
    gv.addColorStop(1, 'rgba(0,0,0,0.9)');
    wctx.fillStyle = gv;
    wctx.fillRect(0, 0, W, H);
    wctx.globalCompositeOperation = 'source-over';

    ctx.globalAlpha = intensity;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(waves, 0, 0);
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- layer 2: grid ---------- */
  function gridPath(x0, y0, x1, y1) {
    var path = new Path2D();
    var startX = gx0 + Math.ceil((x0 - gx0) / cell) * cell;
    var startY = gy0 + Math.ceil((y0 - gy0) / cell) * cell;
    for (var x = startX; x <= x1; x += cell) { path.moveTo(Math.round(x) + 0.5, y0); path.lineTo(Math.round(x) + 0.5, y1); }
    for (var y = startY; y <= y1; y += cell) { path.moveTo(x0, Math.round(y) + 0.5); path.lineTo(x1, Math.round(y) + 0.5); }
    return path;
  }

  function drawBaseGrid(heroFactor) {
    // Lattice visible mainly in the upper right, fading out radially.
    var g = ctx.createRadialGradient(W * 0.86, H * 0.12, 0, W * 0.86, H * 0.12, Math.max(W, H) * 0.72);
    var a = 0.075 * (0.45 + 0.55 * heroFactor);
    g.addColorStop(0, 'rgba(220,226,232,' + a.toFixed(3) + ')');
    g.addColorStop(0.5, 'rgba(220,226,232,' + (a * 0.35).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(220,226,232,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.stroke(gridPath(0, 0, W, H));
  }

  function drawReveals(now) {
    for (var i = reveals.length - 1; i >= 0; i--) {
      var r = reveals[i];
      var age = (now - r.start) / 1000;
      var env = age < 0.8 ? smooth(age / 0.8) : age < 2 ? 1 : 1 - smooth((age - 2) / 2.4);
      if (age > 4.4) { reveals.splice(i, 1); continue; }
      var rect = r.el.getBoundingClientRect();
      var top = Math.max(0, rect.top), bottom = Math.min(H, rect.bottom);
      if (bottom <= top) continue;
      var g = ctx.createLinearGradient(0, rect.top, 0, rect.top + Math.min(rect.height, H * 1.2));
      var a = (0.11 * env).toFixed(3);
      g.addColorStop(0, 'rgba(220,226,232,0)');
      g.addColorStop(0.15, 'rgba(220,226,232,' + a + ')');
      g.addColorStop(0.6, 'rgba(220,226,232,' + (a * 0.4).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(220,226,232,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1;
      ctx.stroke(gridPath(0, top, W, bottom));
    }
  }

  function edgeBiasedColumn(cols) {
    for (var tries = 0; tries < 4; tries++) {
      var c = Math.floor(rand() * cols);
      var rel = c / cols;
      if (rel < 0.28 || rel > 0.66 || rand() < 0.25) return c;
    }
    return Math.floor(rand() * cols);
  }

  function spawnGroup(now) {
    var cols = Math.floor((W - gx0) / cell), rows = Math.floor((H - gy0) / cell);
    if (cols < 2 || rows < 2) return;
    var horiz = rand() < 0.55;
    var len = 1 + Math.floor(rand() * (small ? 2 : 4));
    var c = edgeBiasedColumn(cols), r = Math.floor(rand() * rows);
    var segs = [];
    var parallel = rand() < 0.35 ? 2 : 1;
    for (var k = 0; k < parallel; k++) {
      if (horiz) segs.push([c, r + k, c + len, r + k]);
      else segs.push([c + k, r, c + k, r + len]);
    }
    var hold = 2.2 + rand() * 2.6;
    groups.push({
      segs: segs,
      mark: rand() < 0.55 ? (rand() < 0.5 ? [segs[0][0], segs[0][1]] : [segs[0][2], segs[0][3]]) : null,
      start: now, fadeIn: 1.4, hold: hold, fadeOut: 2.2,
      peak: 0.16 + rand() * 0.16,
      sweep: rand() < 0.5
    });
  }

  function drawGroups(now, heroFactor, staticMode) {
    if (!staticMode) {
      var target = small ? 6 : 13;
      if (groups.length < target && now > nextSpawn) {
        spawnGroup(now);
        nextSpawn = now + 380 + rand() * 520;
      }
    }
    ctx.lineWidth = 1;
    for (var i = groups.length - 1; i >= 0; i--) {
      var g = groups[i];
      var age = staticMode ? g.fadeIn + 0.5 : (now - g.start) / 1000;
      var total = g.fadeIn + g.hold + g.fadeOut;
      if (age > total) { groups.splice(i, 1); continue; }
      var env = age < g.fadeIn ? smooth(age / g.fadeIn) : age < g.fadeIn + g.hold ? 1 : 1 - smooth((age - g.fadeIn - g.hold) / g.fadeOut);
      var grow = g.sweep ? smooth(age / g.fadeIn) : 1;
      var a = g.peak * env * (0.55 + 0.45 * heroFactor);
      ctx.strokeStyle = 'rgba(232,236,241,' + a.toFixed(3) + ')';
      ctx.beginPath();
      for (var s = 0; s < g.segs.length; s++) {
        var sg = g.segs[s];
        var x0 = gx0 + sg[0] * cell, y0 = gy0 + sg[1] * cell;
        var x1 = gx0 + sg[2] * cell, y1 = gy0 + sg[3] * cell;
        x1 = x0 + (x1 - x0) * grow; y1 = y0 + (y1 - y0) * grow;
        ctx.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5);
        ctx.lineTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
      }
      ctx.stroke();
      if (g.mark) {
        var mx = Math.round(gx0 + g.mark[0] * cell) + 0.5, my = Math.round(gy0 + g.mark[1] * cell) + 0.5;
        ctx.strokeStyle = 'rgba(240,243,246,' + Math.min(0.5, a * 1.8).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(mx - 5, my); ctx.lineTo(mx + 5, my);
        ctx.moveTo(mx, my - 5); ctx.lineTo(mx, my + 5);
        ctx.stroke();
      }
    }
  }

  /* ---------- layer 3: quadtree ---------- */
  // Cells keep subdividing and merging. Each change glows briefly, and a small target marker glides to it.
  var MIN_CELL = 14;
  var marker = { x: 0, y: 0, s: 0, tx: 0, ty: 0, ts: 0, a: 0 };
  function node(x, y, s, d) { return { x: x, y: y, s: s, d: d, kids: null, p: 0, target: 0, glow: 0 }; }
  function split(n) {
    var h = n.s / 2;
    n.kids = [node(n.x, n.y, h, n.d + 1), node(n.x + h, n.y, h, n.d + 1), node(n.x, n.y + h, h, n.d + 1), node(n.x + h, n.y + h, h, n.d + 1)];
  }
  function grow(n, r, maxD) {
    if (n.d < maxD && n.s / 2 >= MIN_CELL && r() < 0.66 - n.d * 0.13) {
      split(n); n.p = 1; n.target = 1;
      for (var i = 0; i < 4; i++) grow(n.kids[i], r, maxD);
    }
  }
  function buildTree() {
    var r = mulberry(0x51d6);
    roots = [];
    var big = cell * 4, mid = cell * 2;
    var cols = Math.floor((W - gx0) / cell), rows = Math.floor((H - gy0) / cell);
    var spots = small
      ? [[cols - 3, 1, mid], [0, rows - 3, mid], [cols - 2, rows - 5, cell]]
      : [[cols - 5, 1, big], [0, rows - 5, big], [cols - 3, rows - 3, mid], [Math.floor(cols * 0.42), rows - 2, cell],
         [cols - 2, Math.floor(rows * 0.45), cell], [cols - 8, rows - 2, cell]];
    for (var i = 0; i < spots.length; i++) {
      var sx = gx0 + Math.max(0, spots[i][0]) * cell, sy = gy0 + Math.max(0, spots[i][1]) * cell;
      var n = node(sx, sy, spots[i][2], 0);
      grow(n, r, spots[i][2] >= big ? 5 : 4);
      roots.push(n);
    }
    if (roots.length) { var f = roots[0]; marker.x = marker.tx = f.x; marker.y = marker.ty = f.y; marker.s = marker.ts = f.s; }
  }
  function collect(n, out) { out.push(n); if (n.kids) for (var i = 0; i < 4; i++) collect(n.kids[i], out); return out; }
  function aim(n) { marker.tx = n.x; marker.ty = n.y; marker.ts = n.s; marker.a = 1; }
  function treeEvent() {
    var all = [];
    for (var i = 0; i < roots.length; i++) collect(roots[i], all);
    var splitCount = 0;
    for (var j = 0; j < all.length; j++) if (all[j].kids && all[j].target === 1) splitCount++;
    var preferMerge = splitCount > all.length * 0.3; // keep a balance between busy and open areas
    for (var tries = 0; tries < 12; tries++) {
      var n = all[Math.floor(rand() * all.length)];
      var canSplit = !n.kids && n.d < 5 && n.s / 2 >= MIN_CELL;
      var canMerge = n.kids && n.target === 1 && n.d > 0 && !n.kids.some(function (k) { return k.kids; });
      if (canSplit && (!preferMerge || tries > 8)) { split(n); n.p = 0; n.target = 1; n.glow = 1; aim(n); return; }
      if (canMerge && (preferMerge || tries > 8)) { n.target = 0; n.glow = 1; aim(n); return; }
    }
  }
  function stepTree(n, dt) {
    n.glow = Math.max(0, n.glow - dt / 1.4);
    if (n.kids) {
      var rate = dt / 1.1;
      n.p = n.target > n.p ? Math.min(1, n.p + rate) : Math.max(0, n.p - rate);
      if (n.target === 0 && n.p === 0) n.kids = null;
      else for (var i = 0; i < 4; i++) stepTree(n.kids[i], dt);
    }
  }
  function drawNode(n, path, glowing) {
    if (n.glow > 0) glowing.push(n);
    if (!n.kids || n.p <= 0) return;
    var e = smooth(n.p), h = n.s / 2, cx = n.x + h, cy = n.y + h, r = h * e;
    path.moveTo(Math.round(cx - r) + 0.5, Math.round(cy) + 0.5); path.lineTo(Math.round(cx + r) + 0.5, Math.round(cy) + 0.5);
    path.moveTo(Math.round(cx) + 0.5, Math.round(cy - r) + 0.5); path.lineTo(Math.round(cx) + 0.5, Math.round(cy + r) + 0.5);
    for (var i = 0; i < 4; i++) drawNode(n.kids[i], path, glowing);
  }
  function drawTree(now, dt, staticMode) {
    if (!staticMode) {
      if (now > nextTreeEvent) {
        if (nextTreeEvent) treeEvent();
        nextTreeEvent = now + (small ? 900 : 520) + rand() * (small ? 900 : 700);
      }
      for (var i = 0; i < roots.length; i++) stepTree(roots[i], dt);
      var k = Math.min(1, dt * 5);
      marker.x += (marker.tx - marker.x) * k; marker.y += (marker.ty - marker.y) * k; marker.s += (marker.ts - marker.s) * k;
      marker.a = Math.max(0.35, marker.a - dt * 0.5);
    }
    var inner = new Path2D(), outer = new Path2D(), ticks = new Path2D(), glowing = [];
    for (var j = 0; j < roots.length; j++) {
      var n = roots[j], x = Math.round(n.x) + 0.5, y = Math.round(n.y) + 0.5, s = n.s, t = 7;
      outer.rect(x, y, s, s);
      ticks.moveTo(x, y + t); ticks.lineTo(x, y); ticks.lineTo(x + t, y);
      ticks.moveTo(x + s - t, y + s); ticks.lineTo(x + s, y + s); ticks.lineTo(x + s, y + s - t);
      drawNode(n, inner, glowing);
    }
    ctx.lineWidth = 1;
    // Cells that just changed: a soft fill and a brighter outline that fade out.
    for (var g = 0; g < glowing.length; g++) {
      var c = glowing[g], a = c.glow * c.glow;
      ctx.fillStyle = 'rgba(220,226,232,' + (0.05 * a).toFixed(3) + ')';
      ctx.fillRect(c.x, c.y, c.s, c.s);
      ctx.strokeStyle = 'rgba(232,236,241,' + (0.22 * a).toFixed(3) + ')';
      ctx.strokeRect(Math.round(c.x) + 0.5, Math.round(c.y) + 0.5, c.s, c.s);
    }
    ctx.strokeStyle = 'rgba(214,220,228,0.06)';
    ctx.stroke(outer);
    ctx.strokeStyle = 'rgba(214,220,228,0.085)';
    ctx.stroke(inner);
    ctx.strokeStyle = 'rgba(232,236,241,0.18)';
    ctx.stroke(ticks);
    // Target marker: four corner brackets that glide to the most recent change.
    if (roots.length) {
      var mx = Math.round(marker.x) + 0.5, my = Math.round(marker.y) + 0.5, ms = marker.s, pad = 4, l = Math.max(5, Math.min(10, ms * 0.25));
      var x0 = mx - pad, y0 = my - pad, x1 = mx + ms + pad, y1 = my + ms + pad;
      var m = new Path2D();
      m.moveTo(x0, y0 + l); m.lineTo(x0, y0); m.lineTo(x0 + l, y0);
      m.moveTo(x1 - l, y0); m.lineTo(x1, y0); m.lineTo(x1, y0 + l);
      m.moveTo(x1, y1 - l); m.lineTo(x1, y1); m.lineTo(x1 - l, y1);
      m.moveTo(x0 + l, y1); m.lineTo(x0, y1); m.lineTo(x0, y1 - l);
      ctx.strokeStyle = 'rgba(240,243,246,' + (0.42 * marker.a).toFixed(3) + ')';
      ctx.stroke(m);
    }
  }

  /* ---------- frame ---------- */
  function render(now, dt, staticMode) {
    var heroFactor = 1 - smooth((window.scrollY || 0) / (H * 0.9));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawTree(now, dt, staticMode);
    if (gl) drawGL(simT, 0.62 + 0.38 * heroFactor);
    else drawWaves(simT, 0.62 + 0.38 * heroFactor);
    drawBaseGrid(heroFactor);
    if (!staticMode) drawReveals(now);
    drawGroups(now, heroFactor, staticMode);
  }

  function frame(now) {
    rafId = 0;
    if (!looping) return;
    rafId = requestAnimationFrame(frame);
    if (!gl && lastFrame && now - lastFrame < 32) return; // Canvas 2D fallback runs at ~30fps
    var dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
    lastFrame = now;
    simT += dt * SPEED;
    pointerEase += (pointerX - pointerEase) * Math.min(1, dt * 0.8);
    render(now, dt, false);
  }

  function renderStatic() {
    var now = performance.now();
    if (!groups.length) {
      // A calm fixed composition: a few held segment groups.
      var saved = rand; rand = mulberry(0x6a6a);
      for (var i = 0; i < (small ? 4 : 9); i++) spawnGroup(now);
      rand = saved;
      groupsStatic = true;
    }
    if (!simT) simT = 38;
    render(now, 0, true);
  }

  function shouldAnimate() { return !paused && !document.hidden; }
  function update() {
    if (shouldAnimate()) {
      if (!looping) {
        if (groupsStatic) { groups = []; groupsStatic = false; }
        looping = true; lastFrame = 0;
        if (!rafId) rafId = requestAnimationFrame(frame);
      }
    } else {
      looping = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      lastFrame = 0;
      if (!simT) renderStatic();
    }
    syncToggle();
  }

  /* ---------- controls ---------- */
  var toggle = document.getElementById('motion-toggle');
  function syncToggle() {
    if (!toggle) return;
    toggle.hidden = false;
    toggle.setAttribute('data-paused', paused ? 'true' : 'false');
    var label = toggle.querySelector('.label');
    if (label) label.textContent = paused ? 'Play background' : 'Pause background';
    toggle.setAttribute('aria-label', paused ? 'Play background animation' : 'Pause background animation');
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      paused = !paused;
      try { window.localStorage.setItem(STORE_KEY, paused ? '1' : '0'); } catch (e) { /* ignore */ }
      update();
    });
  }

  if ('IntersectionObserver' in window) {
    var seen = new WeakMap();
    var io = new IntersectionObserver(function (entries) {
      if (!looping) return;
      var now = performance.now();
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var last = seen.get(en.target) || 0;
        if (now - last < 9000) return;
        seen.set(en.target, now);
        reveals.push({ el: en.target, start: now });
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('[data-grid-reveal]').forEach(function (el) { io.observe(el); });
    // Called by site.js after it swaps in a new page, so the new sections reveal the grid too.
    window.D6Background = {
      observe: function (root) {
        reveals = [];
        root.querySelectorAll('[data-grid-reveal]').forEach(function (el) { io.observe(el); });
      }
    };
  }

  if (finePointer && !reduceMQ.matches) {
    window.addEventListener('pointermove', function (e) { pointerX = e.clientX / (W || 1); }, { passive: true });
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (resize() && !looping) renderStatic();
    }, 120);
  });
  document.addEventListener('visibilitychange', update);
  if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', function () { groups = []; update(); });
  else if (reduceMQ.addListener) reduceMQ.addListener(function () { groups = []; update(); });

  initGL();
  resize();
  update();
})();
