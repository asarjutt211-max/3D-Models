/* ================================================================
   CONSTANTS
================================================================ */
const COL = {
  ink: 0x0E0E0C, bone: 0xF0EAD6, lime: 0xE8FF00,
  stone: 0x8C8A82, white: 0xFFFFFF, gold: 0xFFE066,
  teal: 0x5FFFC8, pink: 0xFF88CC, ice: 0x88CCFF
};
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const CARD_W = 480, CARD_H = 360;
const CARDS_PER_FRAME = 3;

/* ================================================================
   MODEL BASE
================================================================ */
function newModel() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, CARD_W / CARD_H, 0.1, 100);
  camera.position.set(0, 0, 4.2);
  const root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const key = new THREE.PointLight(COL.lime, 4.5, 50);
  key.position.set(4, 5, 6); scene.add(key);
  const fill = new THREE.PointLight(COL.teal, 2.6, 50);
  fill.position.set(-5, -2, 4); scene.add(fill);
  const rim = new THREE.PointLight(COL.bone, 2.0, 50);
  rim.position.set(0, 6, -6); scene.add(rim);
  const accent = new THREE.PointLight(COL.gold, 1.8, 40);
  accent.position.set(-4, 4, -3); scene.add(accent);
  const under = new THREE.PointLight(COL.lime, 1.2, 40);
  under.position.set(0, -5, 2); scene.add(under);
  return { scene, camera, root };
}

/* ================================================================
   GLOW TEXTURE
================================================================ */
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,240,0.85)');
  g.addColorStop(0.55, 'rgba(232,255,0,0.35)');
  g.addColorStop(1, 'rgba(232,255,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const GLOW_TEX = makeGlowTexture();

/* ================================================================
   01 · HYPERCUBE — tag: POLYTOPE
================================================================ */
function makeHypercube() {
  const { scene, camera, root } = newModel();
  const V4 = [];
  for (let i = 0; i < 16; i++) V4.push([(i&1)?1:-1, (i&2)?1:-1, (i&4)?1:-1, (i&8)?1:-1]);
  const edges = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      let diff = 0;
      for (let k = 0; k < 4; k++) if (V4[i][k] !== V4[j][k]) diff++;
      if (diff === 1) edges.push([i, j]);
    }
  }
  const nodeGeo = new THREE.SphereGeometry(0.1, 10, 10);
  const nodeMat = new THREE.MeshStandardMaterial({
    color: COL.lime, emissive: COL.lime, emissiveIntensity: 1.5,
    metalness: 0.4, roughness: 0.2
  });
  const nodeMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, 16);
  nodeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(nodeMesh);
  const pos = new Float32Array(edges.length * 6);
  const colArr = new Float32Array(edges.length * 6);
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  edgeGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  root.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.95
  })));
  const TRAIL_N = 120;
  const trailParts = [];
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 3), 3));
  root.add(new THREE.Points(trailGeo, new THREE.PointsMaterial({
    map: GLOW_TEX, color: COL.bone, size: 0.11,
    transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  })));
  for (let i = 0; i < TRAIL_N; i++) {
    trailParts.push({
      edge: Math.floor(Math.random() * edges.length),
      prog: Math.random(),
      speed: 0.3 + Math.random() * 0.9
    });
  }
  const dummy = new THREE.Object3D();
  let a1 = 0, a2 = 0, a3 = 0;
  const cA = new THREE.Color(COL.lime);
  const cB = new THREE.Color(COL.bone);
  return {
    title: 'Hypercube', tag: 'POLYTOPE', scene, camera, root,
    update(t, dt) {
      a1 += dt * 0.4; a2 += dt * 0.25; a3 += dt * 0.35;
      const rot = (v, i, j, a) => {
        const c = Math.cos(a), s = Math.sin(a);
        const vi = v[i], vj = v[j];
        v[i] = vi * c - vj * s;
        v[j] = vi * s + vj * c;
      };
      const proj = V4.map(v => {
        const q = [...v];
        rot(q, 0, 3, a1); rot(q, 1, 2, a2); rot(q, 2, 3, a3);
        const w = 3, k = w / (w + q[3]);
        return [q[0] * k * 1.4, q[1] * k * 1.4, q[2] * k * 1.4];
      });
      for (let i = 0; i < 16; i++) {
        const depth = (proj[i][2] + 1.4) / 2.8;
        dummy.position.set(proj[i][0], proj[i][1], proj[i][2]);
        dummy.scale.setScalar(0.6 + (1 - depth) * 1.2);
        dummy.updateMatrix();
        nodeMesh.setMatrixAt(i, dummy.matrix);
      }
      nodeMesh.instanceMatrix.needsUpdate = true;
      const arr = edgeGeo.attributes.position.array;
      const cArr = edgeGeo.attributes.color.array;
      for (let i = 0; i < edges.length; i++) {
        const [a, b] = edges[i];
        arr[i*6]   = proj[a][0]; arr[i*6+1] = proj[a][1]; arr[i*6+2] = proj[a][2];
        arr[i*6+3] = proj[b][0]; arr[i*6+4] = proj[b][1]; arr[i*6+5] = proj[b][2];
        const da = (proj[a][2] + 1.4) / 2.8;
        const db = (proj[b][2] + 1.4) / 2.8;
        const ca = cA.clone().lerp(cB, da);
        const cb = cA.clone().lerp(cB, db);
        cArr[i*6]   = ca.r; cArr[i*6+1] = ca.g; cArr[i*6+2] = ca.b;
        cArr[i*6+3] = cb.r; cArr[i*6+4] = cb.g; cArr[i*6+5] = cb.b;
      }
      edgeGeo.attributes.position.needsUpdate = true;
      edgeGeo.attributes.color.needsUpdate = true;
      const tArr = trailGeo.attributes.position.array;
      for (let i = 0; i < TRAIL_N; i++) {
        const tp = trailParts[i];
        tp.prog += tp.speed * dt * 0.7;
        if (tp.prog > 1) { tp.prog = 0; tp.edge = Math.floor(Math.random() * edges.length); }
        const [a, b] = edges[tp.edge];
        tArr[i*3] = proj[a][0] + (proj[b][0] - proj[a][0]) * tp.prog;
        tArr[i*3+1] = proj[a][1] + (proj[b][1] - proj[a][1]) * tp.prog;
        tArr[i*3+2] = proj[a][2] + (proj[b][2] - proj[a][2]) * tp.prog;
      }
      trailGeo.attributes.position.needsUpdate = true;
    }
  };
}

/* ================================================================
   02 · SINGULARITY
================================================================ */
function makeSingularity() {
  const { scene, camera, root } = newModel();
  root.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  ));
  const photonRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.018, 10, 64),
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.95 })
  );
  photonRing.rotation.x = Math.PI / 2;
  root.add(photonRing);
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.65 + i * 0.14, 0.005, 8, 64),
      new THREE.MeshBasicMaterial({
        color: i === 0 ? COL.gold : COL.lime,
        transparent: true, opacity: 0.45 - i * 0.09
      })
    );
    ring.rotation.x = Math.PI / 2;
    root.add(ring);
  }
  const N = 1400;
  const parts = [];
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const colArr = new Float32Array(N * 3);
  const cHot = new THREE.Color(0xFFFFFF);
  const cMid = new THREE.Color(COL.gold);
  const cCool = new THREE.Color(COL.lime);
  const cEdge = new THREE.Color(COL.teal);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * TAU;
    const r = 0.65 + Math.pow(Math.random(), 0.55) * 1.2;
    const speed = (1.6 + Math.random() * 1.0) / Math.pow(r, 1.3);
    parts.push({ a, r, speed, y: rand(-0.03, 0.03), yPhase: Math.random() * TAU });
    pos[i*3]   = Math.cos(a) * r;
    pos[i*3+1] = rand(-0.03, 0.03);
    pos[i*3+2] = Math.sin(a) * r;
    const heat = Math.max(0, Math.min(1, (1.35 - r) / 0.7));
    let c;
    if (heat > 0.75) c = cCool.clone().lerp(cMid, (heat - 0.75) / 0.25);
    else if (heat > 0.45) c = cMid.clone().lerp(cHot, (heat - 0.45) / 0.3);
    else if (heat > 0.2) c = cHot.clone();
    else c = cEdge.clone();
    colArr[i*3] = c.r; colArr[i*3+1] = c.g; colArr[i*3+2] = c.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  root.add(new THREE.Points(geo, new THREE.PointsMaterial({
    map: GLOW_TEX, size: 0.045, vertexColors: true, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  })));
  const jetMat = new THREE.MeshBasicMaterial({
    color: COL.teal, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending
  });
  const jetTop = new THREE.Mesh(new THREE.ConeGeometry(0.15, 2.0, 16, 1, true), jetMat);
  jetTop.position.y = 1.2; jetTop.rotation.x = Math.PI;
  root.add(jetTop);
  const jetBot = new THREE.Mesh(new THREE.ConeGeometry(0.15, 2.0, 16, 1, true), jetMat.clone());
  jetBot.position.y = -1.2;
  root.add(jetBot);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: COL.lime, transparent: true, opacity: 0.75,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  halo.scale.set(3.2, 3.2, 1);
  root.add(halo);
  return {
    title: 'Singularity', tag: 'COSMIC', scene, camera, root,
    update(t, dt) {
      photonRing.rotation.z += dt * 0.4;
      const arr = geo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const q = parts[i];
        q.a += q.speed * dt;
        arr[i*3]   = Math.cos(q.a) * q.r;
        arr[i*3+1] = q.y + Math.sin(t * 3 + q.yPhase) * 0.04 * (q.r - 0.5);
        arr[i*3+2] = Math.sin(q.a) * q.r;
      }
      geo.attributes.position.needsUpdate = true;
      halo.material.opacity = 0.55 + Math.sin(t * 1.5) * 0.15;
    }
  };
}

/* ================================================================
   03 · WOVEN TORUS
================================================================ */
function makeWovenTorus() {
  const { scene, camera, root } = newModel();
  const STRANDS = 4, SEGS = 220, tubeR = 0.14, mainR = 1.15;
  const braidAmp = 0.26, braidsPerRev = 7;
  const strands = [];
  const colors = [COL.lime, COL.teal, COL.bone, COL.gold];
  for (let s = 0; s < STRANDS; s++) {
    const pts = [];
    for (let i = 0; i <= SEGS; i++) {
      const u = (i / SEGS) * TAU;
      const phase = (s / STRANDS) * TAU;
      const bAngle = u * braidsPerRev + phase;
      const cx = Math.cos(u) * mainR, cz = Math.sin(u) * mainR;
      const bx = Math.cos(bAngle) * braidAmp, by = Math.sin(bAngle) * braidAmp;
      pts.push(new THREE.Vector3(cx + Math.cos(u) * bx, by, cz + Math.sin(u) * bx));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, SEGS, tubeR, 8, true);
    const mat = new THREE.MeshStandardMaterial({
      color: colors[s], emissive: colors[s], emissiveIntensity: 0.55,
      metalness: 0.9, roughness: 0.12
    });
    root.add(new THREE.Mesh(geo, mat));
    strands.push({ mat });
  }
  const ORB = 40;
  const orbs = [];
  const orbGeo = new THREE.BufferGeometry();
  orbGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ORB * 3), 3));
  root.add(new THREE.Points(orbGeo, new THREE.PointsMaterial({
    map: GLOW_TEX, color: COL.bone, size: 0.1,
    transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  })));
  for (let i = 0; i < ORB; i++) {
    orbs.push({
      u: Math.random() * TAU,
      speed: 0.4 + Math.random() * 1.0,
      off: rand(-0.45, 0.45),
      wob: Math.random() * TAU
    });
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: COL.lime, transparent: true, opacity: 0.28,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  halo.scale.set(4.5, 4.5, 1);
  root.add(halo);
  return {
    title: 'Woven Torus', tag: 'BRAID', scene, camera, root,
    update(t, dt) {
      const arr = orbGeo.attributes.position.array;
      for (let i = 0; i < ORB; i++) {
        const o = orbs[i];
        o.u += o.speed * dt * 0.6;
        const u = o.u, r = mainR + o.off;
        arr[i*3]   = Math.cos(u) * r;
        arr[i*3+1] = Math.sin(u * 4 + o.wob) * 0.25 + o.off * 0.35;
        arr[i*3+2] = Math.sin(u) * r;
      }
      orbGeo.attributes.position.needsUpdate = true;
      strands.forEach((s, i) => {
        s.mat.emissiveIntensity = 0.4 + Math.sin(t * 1.5 + i * 0.8) * 0.35;
      });
      halo.material.opacity = 0.22 + Math.sin(t * 1.2) * 0.08;
    }
  };
}

/* ================================================================
   04 · FIBONACCI BLOOM
================================================================ */
function makeFibonacci() {
  const { scene, camera, root } = newModel();
  const N = 500;
  const gold = Math.PI * (3 - Math.sqrt(5));
  const sphereGeo = new THREE.SphereGeometry(1, 12, 12);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, emissiveIntensity: 0.3,
    metalness: 0.75, roughness: 0.2
  });
  const mesh = new THREE.InstancedMesh(sphereGeo, mat, N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const colorArr = new Float32Array(N * 3);
  const cA = new THREE.Color(COL.lime);
  const cB = new THREE.Color(COL.teal);
  const cC = new THREE.Color(COL.bone);
  const cD = new THREE.Color(COL.gold);
  const dummy = new THREE.Object3D();
  const data = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = gold * i;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    const scale = 0.035 + (1 - Math.abs(y)) * 0.07;
    data.push({ x, y, z, scale, phase: i * 0.15 });
    const fy = (y + 1) / 2;
    let c;
    if (fy > 0.75) c = cA.clone().lerp(cD, (fy - 0.75) / 0.25);
    else if (fy > 0.4) c = cA.clone().lerp(cC, (fy - 0.4) / 0.35);
    else c = cA.clone().lerp(cB, 1 - fy / 0.4);
    colorArr[i*3] = c.r; colorArr[i*3+1] = c.g; colorArr[i*3+2] = c.b;
  }
  mesh.instanceColor = new THREE.InstancedBufferAttribute(colorArr, 3);
  root.add(mesh);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: COL.lime, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  halo.scale.set(4, 4, 1);
  root.add(halo);
  return {
    title: 'Fibonacci Bloom', tag: 'GOLDEN RATIO', scene, camera, root,
    update(t, dt) {
      for (let i = 0; i < N; i++) {
        const d = data[i];
        const pulse = 0.75 + Math.sin(t * 2 + d.phase) * 0.4;
        dummy.position.set(d.x, d.y, d.z);
        dummy.scale.setScalar(d.scale * pulse);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      root.rotation.y += dt * 0.2;
      halo.material.opacity = 0.3 + Math.sin(t * 1.5) * 0.1;
    }
  };
}

/* ================================================================
   05 · TORUS KNOT
================================================================ */
function makeTorusKnot() {
  const { scene, camera, root } = newModel();
  const geo = new THREE.TorusKnotGeometry(1.15, 0.36, 160, 24, 2, 3);
  const mat = new THREE.MeshStandardMaterial({
    color: COL.lime, emissive: COL.lime, emissiveIntensity: 0.55,
    metalness: 0.95, roughness: 0.08
  });
  const knot = new THREE.Mesh(geo, mat);
  root.add(knot);
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(geo),
    new THREE.LineBasicMaterial({ color: COL.bone, transparent: true, opacity: 0.08 })
  );
  wire.scale.setScalar(1.01);
  root.add(wire);
  const particles = [];
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? COL.bone : COL.teal,
        transparent: true, opacity: 0.95
      })
    );
    root.add(p);
    particles.push({ mesh: p, offset: i / 5 });
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: COL.lime, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  glow.scale.set(4, 4, 1);
  root.add(glow);
  return {
    title: 'Torus Knot', tag: 'PARAMETRIC', scene, camera, root,
    update(t, dt) {
      knot.rotation.x += dt * 0.22;
      knot.rotation.y += dt * 0.4;
      wire.rotation.copy(knot.rotation);
      mat.emissiveIntensity = 0.45 + Math.sin(t * 1.5) * 0.3;
      particles.forEach((p, i) => {
        const u = ((t * 0.6 + p.offset) % 1);
        const a = u * TAU;
        p.mesh.position.set(
          (2 + Math.cos(3 * a / 2)) * Math.cos(a) * 0.82,
          (2 + Math.cos(3 * a / 2)) * Math.sin(a) * 0.82,
          Math.sin(3 * a / 2) * 1.0
        );
        p.mesh.scale.setScalar(0.8 + Math.sin(t * 4 + i) * 0.3);
      });
      glow.material.opacity = 0.4 + Math.sin(t * 1.5) * 0.15;
    }
  };
}

/* ================================================================
   06 · KLEIN BOTTLE
================================================================ */
function makeKleinBottle() {
  const { scene, camera, root } = newModel();
  const uSegs = 120, vSegs = 40, a = 2.0;
  const verts = [];
  const indices = [];
  const colors = [];
  const cA = new THREE.Color(COL.lime);
  const cB = new THREE.Color(COL.teal);
  const cC = new THREE.Color(COL.gold);
  const cD = new THREE.Color(COL.bone);
  for (let i = 0; i <= uSegs; i++) {
    for (let j = 0; j <= vSegs; j++) {
      const u = (i / uSegs) * TAU;
      const v = (j / vSegs) * TAU;
      const r = a + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v);
      const x = r * Math.cos(u);
      const y = r * Math.sin(u);
      const z = Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v);
      verts.push(x * 0.32, z * 0.32, y * 0.32);
      const t1 = i / uSegs, t2 = j / vSegs;
      let c;
      if (t1 < 0.5) c = cA.clone().lerp(cB, t1 * 2);
      else c = cB.clone().lerp(cC, (t1 - 0.5) * 2);
      c = c.lerp(cD, t2 * 0.4);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < uSegs; i++) {
    for (let j = 0; j < vSegs; j++) {
      const a0 = i * (vSegs + 1) + j;
      const b0 = a0 + 1;
      const c0 = a0 + (vSegs + 1);
      const d0 = c0 + 1;
      indices.push(a0, c0, b0);
      indices.push(b0, c0, d0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.85, roughness: 0.15,
    side: THREE.DoubleSide,
    emissive: COL.lime, emissiveIntensity: 0.18
  });
  const mesh = new THREE.Mesh(geo, mat);
  root.add(mesh);
  const SPARK = 80;
  const sGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(SPARK * 3);
  for (let i = 0; i < SPARK; i++) {
    const th = Math.random() * TAU;
    const ph = Math.acos(1 - 2 * Math.random());
    const r = 1.6 + Math.random() * 0.5;
    sPos[i*3]   = r * Math.sin(ph) * Math.cos(th);
    sPos[i*3+1] = r * Math.cos(ph);
    sPos[i*3+2] = r * Math.sin(ph) * Math.sin(th);
  }
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  root.add(new THREE.Points(sGeo, new THREE.PointsMaterial({
    map: GLOW_TEX, color: COL.bone, size: 0.07,
    transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  })));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: COL.lime, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  halo.scale.set(4, 4, 1);
  root.add(halo);
  return {
    title: 'Klein Bottle', tag: 'TOPOLOGY', scene, camera, root,
    update(t, dt) {
      mesh.rotation.y += dt * 0.35;
      mesh.rotation.x = Math.sin(t * 0.4) * 0.18;
      halo.material.opacity = 0.3 + Math.sin(t * 1.5) * 0.1;
    }
  };
}

/* ================================================================
   07 · N-BODY CLUSTER
================================================================ */
function makeNBodyCluster() {
  const { scene, camera, root } = newModel();
  const N = 32;
  const G = 0.35;
  const sphereGeo = new THREE.SphereGeometry(1, 10, 10);
  const bodyData = [];
  for (let i = 0; i < N; i++) {
    const r = Math.pow(Math.random(), 0.5) * 1.2;
    const th = Math.random() * TAU;
    const ph = Math.acos(1 - 2 * Math.random());
    const x = r * Math.sin(ph) * Math.cos(th);
    const y = r * Math.cos(ph) * 0.65;
    const z = r * Math.sin(ph) * Math.sin(th);
    const mass = 0.4 + Math.random() * 1.5;
    const size = 0.045 + mass * 0.028;
    const vx = -z * 0.35 + rand(-0.05, 0.05);
    const vz = x * 0.35 + rand(-0.05, 0.05);
    const vy = rand(-0.05, 0.05);
    const col = new THREE.Color().setHSL(0.18 + Math.random() * 0.35, 1, 0.55);
    bodyData.push({ x, y, z, vx, vy, vz, mass, size, col });
  }
  const mesh = new THREE.InstancedMesh(sphereGeo, new THREE.MeshStandardMaterial({
    vertexColors: true, emissiveIntensity: 0.7, metalness: 0.7, roughness: 0.2
  }), N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const colArr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    colArr[i*3] = bodyData[i].col.r;
    colArr[i*3+1] = bodyData[i].col.g;
    colArr[i*3+2] = bodyData[i].col.b;
  }
  mesh.instanceColor = new THREE.InstancedBufferAttribute(colArr, 3);
  root.add(mesh);
  const dummy = new THREE.Object3D();
  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: COL.lime, transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  coreGlow.scale.set(3.5, 3.5, 1);
  root.add(coreGlow);
  return {
    title: 'N-Body Cluster', tag: 'GRAVITY', scene, camera, root,
    update(t, dt) {
      for (let i = 0; i < N; i++) {
        const a = bodyData[i];
        let ax = 0, ay = 0, az = 0;
        for (let j = 0; j < N; j++) {
          if (i === j) continue;
          const b = bodyData[j];
          const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
          const d2 = dx * dx + dy * dy + dz * dz + 0.05;
          const d = Math.sqrt(d2);
          const f = G * b.mass / d2;
          ax += (dx / d) * f;
          ay += (dy / d) * f;
          az += (dz / d) * f;
        }
        a.vx += ax * dt;
        a.vy += ay * dt;
        a.vz += az * dt;
      }
      for (let i = 0; i < N; i++) {
        const a = bodyData[i];
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.z += a.vz * dt;
        const d = Math.hypot(a.x, a.y, a.z);
        if (d > 1.8) {
          const k = 1.8 / d;
          a.x *= k; a.y *= k; a.z *= k;
          a.vx *= 0.4; a.vy *= 0.4; a.vz *= 0.4;
        }
      }
      for (let i = 0; i < N; i++) {
        const b = bodyData[i];
        dummy.position.set(b.x, b.y, b.z);
        dummy.scale.setScalar(b.size * 8);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      root.rotation.y += dt * 0.06;
      coreGlow.material.opacity = 0.25 + Math.sin(t * 1.5) * 0.08;
    }
  };
}

/* ================================================================
   08 · SPIRAL VORTEX
================================================================ */
function makeSpiralVortex() {
  const { scene, camera, root } = newModel();
  const N = 1800;
  const parts = [];
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const colArr = new Float32Array(N * 3);
  const cCore = new THREE.Color(0xFFFFFF);
  const cMid = new THREE.Color(COL.gold);
  const cOuter = new THREE.Color(COL.lime);
  const cEdge = new THREE.Color(COL.teal);
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const arm = i % 2;
    const a = t * 20 + arm * Math.PI;
    const r = 0.12 + t * 1.55;
    const y = (Math.random() - 0.5) * 0.35;
    parts.push({ a, r, y, speed: 0.6 + Math.random() * 1.2, phase: Math.random() * TAU });
    pos[i*3]   = Math.cos(a) * r;
    pos[i*3+1] = y;
    pos[i*3+2] = Math.sin(a) * r;
    let c;
    if (t < 0.2) c = cCore.clone().lerp(cMid, t / 0.2);
    else if (t < 0.55) c = cMid.clone().lerp(cOuter, (t - 0.2) / 0.35);
    else c = cOuter.clone().lerp(cEdge, (t - 0.55) / 0.45);
    colArr[i*3] = c.r; colArr[i*3+1] = c.g; colArr[i*3+2] = c.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  root.add(new THREE.Points(geo, new THREE.PointsMaterial({
    map: GLOW_TEX, size: 0.055, vertexColors: true, transparent: true, opacity: 0.98,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  })));
  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: COL.white, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  core.scale.set(2.2, 2.2, 1);
  root.add(core);
  return {
    title: 'Spiral Vortex', tag: 'COSMIC', scene, camera, root,
    update(t, dt) {
      const arr = geo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const q = parts[i];
        q.a += q.speed * dt;
        const r = q.r * (1 + Math.sin(t * 0.6 + q.phase) * 0.09);
        arr[i*3]   = Math.cos(q.a) * r;
        arr[i*3+1] = q.y + Math.sin(q.a * 2 + q.phase) * 0.04;
        arr[i*3+2] = Math.sin(q.a) * r;
      }
      geo.attributes.position.needsUpdate = true;
      core.material.opacity = 0.8 + Math.sin(t * 3) * 0.15;
    }
  };
}

/* ================================================================
   09 · PULSAR
================================================================ */
function makePulsar() {
  const { scene, camera, root } = newModel();
  const beamGroup = new THREE.Group();
  beamGroup.rotation.z = 0.5;
  root.add(beamGroup);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 3.5,
      metalness: 0.9, roughness: 0.05
    })
  );
  beamGroup.add(core);

  const beams = [];
  const beamColors = [COL.teal, COL.lime];
  for (let k = 0; k < 2; k++) {
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 3.2, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: beamColors[k],
        transparent: true, opacity: 0.4,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    if (k === 0) { beam.position.y = 1.7; }
    else { beam.position.y = -1.7; beam.rotation.x = Math.PI; }
    beamGroup.add(beam);
    beams.push(beam);
  }

  const fieldLines = [];
  for (let i = 0; i < 10; i++) {
    const th = (i / 10) * TAU;
    const pts = [];
    for (let j = 0; j <= 40; j++) {
      const a = (j / 40) * TAU;
      const r = Math.sin(a) * 1.0;
      const y = Math.cos(a) * 1.3;
      pts.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 40, 0.008, 6, false);
    const mat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? COL.lime : COL.teal,
      transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    const line = new THREE.Mesh(geo, mat);
    beamGroup.add(line);
    fieldLines.push(line);
  }

  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: 0xFFFFFF, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  coreGlow.scale.set(2.2, 2.2, 1);
  root.add(coreGlow);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: COL.teal, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  halo.scale.set(4, 4, 1);
  root.add(halo);

  const SPIN_N = 60;
  const spinParts = [];
  const spinGeo = new THREE.BufferGeometry();
  spinGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPIN_N * 3), 3));
  root.add(new THREE.Points(spinGeo, new THREE.PointsMaterial({
    map: GLOW_TEX, color: COL.bone, size: 0.08,
    transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  })));
  for (let i = 0; i < SPIN_N; i++) {
    spinParts.push({
      a: Math.random() * TAU,
      r: 0.9 + Math.random() * 0.5,
      tilt: rand(-0.4, 0.4),
      speed: 2 + Math.random() * 2
    });
  }

  return {
    title: 'Pulsar', tag: 'STELLAR', scene, camera, root,
    update(t, dt) {
      beamGroup.rotation.y += dt * 2.5;
      const arr = spinGeo.attributes.position.array;
      for (let i = 0; i < SPIN_N; i++) {
        const p = spinParts[i];
        p.a += p.speed * dt;
        arr[i*3]   = Math.cos(p.a) * p.r;
        arr[i*3+1] = Math.sin(p.a * 0.5 + p.tilt) * 0.5;
        arr[i*3+2] = Math.sin(p.a) * p.r;
      }
      spinGeo.attributes.position.needsUpdate = true;
      coreGlow.material.opacity = 0.8 + Math.sin(t * 12) * 0.15;
      coreGlow.scale.setScalar(2.2 + Math.sin(t * 12) * 0.25);
      halo.material.opacity = 0.35 + Math.sin(t * 3) * 0.1;
    }
  };
}

/* ================================================================
   10 · SUPERNOVA
================================================================ */
function makeSupernova() {
  const { scene, camera, root } = newModel();
  const N = 2400;
  const parts = [];
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const colArr = new Float32Array(N * 3);
  const cHot = new THREE.Color(0xFFFFFF);
  const cMid = new THREE.Color(COL.gold);
  const cCool = new THREE.Color(COL.lime);
  const cEdge = new THREE.Color(COL.teal);
  for (let i = 0; i < N; i++) {
    const th = Math.random() * TAU;
    const ph = Math.acos(1 - 2 * Math.random());
    const r = 0.4 + Math.pow(Math.random(), 0.35) * 1.15;
    const x = r * Math.sin(ph) * Math.cos(th);
    const y = r * Math.cos(ph);
    const z = r * Math.sin(ph) * Math.sin(th);
    parts.push({
      th, ph,
      baseR: r,
      swirl: (Math.random() - 0.5) * 0.25,
      phase: Math.random() * TAU
    });
    pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z;
    const t01 = (r - 0.4) / 1.15;
    let c;
    if (t01 < 0.28) c = cEdge.clone().lerp(cCool, t01 / 0.28);
    else if (t01 < 0.62) c = cCool.clone().lerp(cMid, (t01 - 0.28) / 0.34);
    else c = cMid.clone().lerp(cHot, (t01 - 0.62) / 0.38);
    colArr[i*3] = c.r; colArr[i*3+1] = c.g; colArr[i*3+2] = c.b;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  root.add(new THREE.Points(geo, new THREE.PointsMaterial({
    map: GLOW_TEX, size: 0.05, vertexColors: true, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  })));
  const FIL = 60;
  const filGeo = new THREE.BufferGeometry();
  const filPos = new Float32Array(FIL * 6);
  for (let i = 0; i < FIL; i++) {
    const th1 = Math.random() * TAU;
    const ph1 = Math.acos(1 - 2 * Math.random());
    const th2 = th1 + rand(-0.5, 0.5);
    const ph2 = ph1 + rand(-0.5, 0.5);
    const r1 = 0.6 + Math.random() * 0.6;
    const r2 = 0.6 + Math.random() * 0.6;
    filPos[i*6]   = r1 * Math.sin(ph1) * Math.cos(th1);
    filPos[i*6+1] = r1 * Math.cos(ph1);
    filPos[i*6+2] = r1 * Math.sin(ph1) * Math.sin(th1);
    filPos[i*6+3] = r2 * Math.sin(ph2) * Math.cos(th2);
    filPos[i*6+4] = r2 * Math.cos(ph2);
    filPos[i*6+5] = r2 * Math.sin(ph2) * Math.sin(th2);
  }
  filGeo.setAttribute('position', new THREE.BufferAttribute(filPos, 3));
  root.add(new THREE.LineSegments(filGeo, new THREE.LineBasicMaterial({
    color: COL.bone, transparent: true, opacity: 0.18
  })));
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
  );
  root.add(core);
  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color: 0xFFFFFF, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  coreGlow.scale.set(1.5, 1.5, 1);
  root.add(coreGlow);
  return {
    title: 'Supernova', tag: 'COSMIC', scene, camera, root,
    update(t, dt) {
      const arr = geo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const q = parts[i];
        const r = q.baseR + Math.sin(t * 0.7 + q.phase) * 0.08;
        const th = q.th + q.swirl * Math.sin(t * 0.5 + q.ph);
        arr[i*3]   = r * Math.sin(q.ph) * Math.cos(th);
        arr[i*3+1] = r * Math.cos(q.ph);
        arr[i*3+2] = r * Math.sin(q.ph) * Math.sin(th);
      }
      geo.attributes.position.needsUpdate = true;
      coreGlow.material.opacity = 0.7 + Math.sin(t * 4) * 0.25;
      root.rotation.y += dt * 0.1;
    }
  };
}

/* ================================================================
   FACTORIES
================================================================ */
const FACTORIES = [
  makeHypercube, makeSingularity, makeWovenTorus, makeFibonacci, makeTorusKnot,
  makeKleinBottle, makeNBodyCluster, makeSpiralVortex, makePulsar, makeSupernova
];

/* ================================================================
   SHARED WEBGL RENDERER — sirf EK context poore page pe
================================================================ */
const sharedCanvas = document.createElement('canvas');
sharedCanvas.width = CARD_W;
sharedCanvas.height = CARD_H;
const sharedRenderer = new THREE.WebGLRenderer({
  canvas: sharedCanvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance'
});
sharedRenderer.setPixelRatio(1);
sharedRenderer.setSize(CARD_W, CARD_H, false);
sharedRenderer.setClearColor(0x0a0a08, 1);

/* ================================================================
   GRID
================================================================ */
const grid = document.getElementById('grid');
const cards = [];

FACTORIES.forEach((factory, i) => {
  const card = document.createElement('div');
  card.className = 'card';

  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = CARD_W;
  displayCanvas.height = CARD_H;
  displayCanvas.style.width = '100%';
  displayCanvas.style.height = '100%';
  displayCanvas.style.display = 'block';
  displayCanvas.style.pointerEvents = 'none';

  const viewport = document.createElement('div');
  viewport.className = 'viewport';
  viewport.appendChild(displayCanvas);

  const probe = factory();

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.innerHTML = `<h3>${probe.title}</h3><span class="tag">${probe.tag}</span>`;

  card.appendChild(viewport);
  card.appendChild(meta);
  grid.appendChild(card);

  const ctx = displayCanvas.getContext('2d');

  const model = factory();
  model.camera.aspect = CARD_W / CARD_H;
  model.camera.updateProjectionMatrix();
  const baseY = i * 0.55;
  model.root.rotation.x = 0.2;
  model.root.rotation.y = baseY;

  const entry = {
    factory, card, displayCanvas, ctx, model, baseY,
    t: 0, lastRender: 0,
    visible: false
  };
  cards.push(entry);

  new IntersectionObserver(es => {
    es.forEach(e => { entry.visible = e.isIntersecting; });
  }, { threshold: 0.01 }).observe(card);

  card.addEventListener('click', () => openFull(i));
});

/* ================================================================
   MAIN LOOP
================================================================ */
let rrIndex = 0;
let lastT = performance.now() * 0.001;

function loop(now) {
  const t = now * 0.001;
  lastT = t;

  if (full.active && full.renderer && full.model) {
    const dt = Math.min(0.05, 0.016);
    if (!full.dragging) {
      if (!full.auto) {
        full.autoDelay -= dt;
        if (full.autoDelay <= 0) full.auto = true;
      }
      if (full.auto) full.rotY += dt * 0.5;
    }
    full.zoom += (full.targetZoom - full.zoom) * 0.12;
    full.model.root.rotation.y = full.rotY;
    full.model.root.rotation.x = full.rotX;
    full.model.camera.position.z = 4.2 / full.zoom;
    full.model.camera.lookAt(0, 0, 0);
    try { full.model.update(t, dt); } catch (e) {}
    full.renderer.render(full.model.scene, full.model.camera);
    requestAnimationFrame(loop);
    return;
  }

  const visible = cards.filter(c => c.visible);
  if (visible.length) {
    const n = Math.min(CARDS_PER_FRAME, visible.length);
    for (let k = 0; k < n; k++) {
      const c = visible[rrIndex % visible.length];
      rrIndex++;
      const now_s = t;
      if (!c.lastRender) c.lastRender = now_s;
      const dt = Math.min(0.15, now_s - c.lastRender);
      c.lastRender = now_s;
      try {
        c.model.update(now_s, dt);
        c.model.root.rotation.y = c.baseY + Math.sin(now_s * 0.4) * 0.15;
        sharedRenderer.render(c.model.scene, c.model.camera);
        c.ctx.drawImage(sharedCanvas, 0, 0);
      } catch (e) {}
    }
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ================================================================
   FULLSCREEN
================================================================ */
const fullEl = document.getElementById('full');
const fCanvas = document.getElementById('fCanvas');
const fNum = document.getElementById('fNum');
const fTitle = document.getElementById('fTitle');
const fBack = document.getElementById('fBack');
const fPrev = document.getElementById('fPrev');
const fNext = document.getElementById('fNext');

const full = {
  active: false, index: 0,
  model: null, renderer: null,
  rotX: 0.2, rotY: 0,
  zoom: 1, targetZoom: 1,
  auto: true, autoDelay: 0,
  dragging: false, lastX: 0, lastY: 0
};

function ensureRenderer() {
  if (full.renderer) return;
  const rect = fCanvas.parentElement.getBoundingClientRect();
  full.renderer = new THREE.WebGLRenderer({
    canvas: fCanvas, antialias: true, alpha: false,
    powerPreference: 'high-performance'
  });
  full.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  full.renderer.setSize(rect.width, rect.height, false);
  full.renderer.setClearColor(0x0a0a08, 1);
}

function resizeRenderer() {
  if (!full.renderer) return;
  const rect = fCanvas.parentElement.getBoundingClientRect();
  full.renderer.setSize(rect.width, rect.height, false);
  if (full.model) {
    full.model.camera.aspect = rect.width / rect.height;
    full.model.camera.updateProjectionMatrix();
  }
}

function swapToModel(i) {
  full.index = i;
  const old = full.model;
  full.model = FACTORIES[i]();
  if (old) {
    old.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose && obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
          for (const k in m) {
            if (m[k] && m[k].isTexture && m[k] !== GLOW_TEX) m[k].dispose();
          }
          m.dispose && m.dispose();
        });
      }
    });
  }
  const rect = fCanvas.parentElement.getBoundingClientRect();
  full.model.camera.aspect = rect.width / rect.height;
  full.model.camera.updateProjectionMatrix();
  fNum.textContent = String(i + 1).padStart(2, '0') + ' / ' + FACTORIES.length;
  fTitle.textContent = full.model.title;
  full.rotX = 0.2; full.rotY = 0;
  full.zoom = 1; full.targetZoom = 1;
  full.auto = true; full.autoDelay = 0;
  fPrev.classList.toggle('disabled', i === 0);
  fNext.classList.toggle('disabled', i === FACTORIES.length - 1);
}

function openFull(i) {
  fullEl.classList.add('open');
  full.active = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ensureRenderer();
      resizeRenderer();
      swapToModel(i);
    });
  });
}
function closeFull() {
  fullEl.classList.remove('open');
  full.active = false;
}
function goPrev() { if (full.active && full.index > 0) swapToModel(full.index - 1); }
function goNext() { if (full.active && full.index < FACTORIES.length - 1) swapToModel(full.index + 1); }

fBack.addEventListener('click', closeFull);
fPrev.addEventListener('click', e => { e.stopPropagation(); goPrev(); });
fNext.addEventListener('click', e => { e.stopPropagation(); goNext(); });

window.addEventListener('keydown', e => {
  if (!full.active) return;
  if (e.key === 'Escape') closeFull();
  if (e.key === 'ArrowLeft') goPrev();
  if (e.key === 'ArrowRight') goNext();
});
window.addEventListener('resize', () => { if (full.active) resizeRenderer(); });

fCanvas.addEventListener('mousedown', e => {
  if (!full.active) return;
  full.dragging = true;
  full.auto = false;
  full.lastX = e.clientX;
  full.lastY = e.clientY;
  e.preventDefault();
});
window.addEventListener('mouseup', () => {
  if (full.dragging) { full.dragging = false; full.autoDelay = 1.5; }
});
window.addEventListener('mousemove', e => {
  if (!full.dragging || !full.active) return;
  const dx = e.clientX - full.lastX;
  const dy = e.clientY - full.lastY;
  if (Math.abs(dx) < 100 && Math.abs(dy) < 100) {
    full.rotY += dx * 0.008;
    full.rotX += dy * 0.008;
    full.rotX = Math.max(-1.4, Math.min(1.4, full.rotX));
  }
  full.lastX = e.clientX;
  full.lastY = e.clientY;
});
fCanvas.addEventListener('wheel', e => {
  if (!full.active) return;
  e.preventDefault();
  full.targetZoom -= e.deltaY * 0.001;
  full.targetZoom = Math.max(0.5, Math.min(3, full.targetZoom));
}, { passive: false });

/* ================================================================
   CURSOR
================================================================ */
const curDot = document.querySelector('.cur-dot');
const curRing = document.querySelector('.cur-ring');

document.addEventListener('mousemove', e => {
  curDot.style.left = e.clientX + 'px';
  curDot.style.top = e.clientY + 'px';
  curRing.style.left = e.clientX + 'px';
  curRing.style.top = e.clientY + 'px';
}, { capture: true, passive: true });

document.addEventListener('mousedown', () => document.body.classList.add('dragging'));
document.addEventListener('mouseup',   () => document.body.classList.remove('dragging'));

let lastHov = false;
document.addEventListener('mousemove', e => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const isHov = !!(el && el.closest('a, button, .card, .back, .nav-arrow'));
  if (isHov !== lastHov) {
    lastHov = isHov;
    document.body.classList.toggle('hov', isHov);
  }
}, { capture: true, passive: true });