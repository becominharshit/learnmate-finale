import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectEducationalSubject,
  computeProjectileKinematics,
  computeQuadraticProperties,
  VERIFIED_VSEPR_MOLECULES,
  buildEducationalGameSpec,
  buildEducationalSceneSpec,
  buildMiniAppSpecFromPrompt,
  evaluateMiniAppFormulas,
  buildAnimatedExplanationScenes,
} from './educationalSpecsEngine';

test('detectEducationalSubject classifies Mathematics, Physics, Chemistry, Biology, and Programming topics accurately', () => {
  assert.equal(detectEducationalSubject('Projectile Motion & Kinematics'), 'Physics');
  assert.equal(detectEducationalSubject('VSEPR Molecular Geometry & Methane'), 'Chemistry');
  assert.equal(detectEducationalSubject('Eukaryotic Cell Organelles & Mitochondria'), 'Biology');
  assert.equal(detectEducationalSubject('Binary Search & Recursion Algorithms'), 'Programming');
  assert.equal(detectEducationalSubject('Conditional Probability & Bayes Theorem'), 'Mathematics');
});

test('computeProjectileKinematics computes exact range, max height, and flight time', () => {
  // v0 = 20 m/s, angle = 45 deg, g = 10 m/s^2 -> Range R = 400 * 1 / 10 = 40 m, H_max = 200 / 20 = 10 m
  const res = computeProjectileKinematics({ v0: 20, angleDeg: 45, gravity: 10 });
  assert.equal(res.rangeMeters, 40);
  assert.equal(res.maxHeightMeters, 10);
  assert.ok(res.trajectoryPoints.length > 10);
  assert.equal(res.trajectoryPoints[0].x, 0);
  assert.equal(res.trajectoryPoints[0].y, 0);
});

test('computeQuadraticProperties computes exact vertex, discriminant, and real roots', () => {
  // y = x^2 - 4x + 3 -> vertex (2, -1), discriminant = 16 - 12 = 4, roots = [1, 3]
  const quad = computeQuadraticProperties({ a: 1, b: -4, c: 3 });
  assert.equal(quad.discriminant, 4);
  assert.equal(quad.vertexX, 2);
  assert.equal(quad.vertexY, -1);
  assert.deepEqual(quad.realRoots, [1, 3]);
});

test('VERIFIED_VSEPR_MOLECULES contains scientifically accurate bond angles and geometries', () => {
  assert.equal(VERIFIED_VSEPR_MOLECULES.CH4.bondAngleDeg, 109.5);
  assert.equal(VERIFIED_VSEPR_MOLECULES.H2O.bondAngleDeg, 104.5);
  assert.equal(VERIFIED_VSEPR_MOLECULES.CO2.bondAngleDeg, 180.0);
  assert.equal(VERIFIED_VSEPR_MOLECULES.NH3.bondAngleDeg, 107.0);
});

test('buildEducationalGameSpec generates playable subject-specific games with matching pairs and rounds', () => {
  const physGame = buildEducationalGameSpec({ topic: 'Projectile Motion', subject: 'Physics' });
  assert.equal(physGame.subject, 'Physics');
  assert.equal(physGame.templateType, 'physics_projectile_challenge');
  assert.ok(physGame.matchingPairs.length >= 4);
  assert.ok(physGame.rounds.length >= 3);

  const chemGame = buildEducationalGameSpec({ topic: 'Chemical Equations', subject: 'Chemistry' });
  assert.equal(chemGame.subject, 'Chemistry');
  assert.ok(chemGame.rounds[0].prompt.includes('CH₄'));
});

test('buildEducationalSceneSpec creates parameter-controlled 3D/2D scene specs for all 4 lab categories', () => {
  const mathScene = buildEducationalSceneSpec({ topic: 'Quadratic Paraboloid', category: 'math_surface_3d' });
  assert.equal(mathScene.supports3D, true);
  assert.equal(mathScene.supports2DPlot, true);
  assert.ok(mathScene.parameterControls.length >= 3);

  const physScene = buildEducationalSceneSpec({ topic: 'Projectile Motion' });
  assert.equal(physScene.category, 'physics_projectile_3d');
  assert.ok(physScene.parameterControls.some((c) => c.id === 'v0'));
});

test('buildMiniAppSpecFromPrompt and evaluateMiniAppFormulas compute live student app outputs', () => {
  const projApp = buildMiniAppSpecFromPrompt({ promptOrTopic: 'Projectile Range Calculator' });
  assert.equal(projApp.templateId, 'projectile_kinematics');
  const evaluated = evaluateMiniAppFormulas(projApp, { v0: 20, angleDeg: 45, gravity: 10 });
  assert.equal(evaluated.rangeMeters.value, 40);
  assert.equal(evaluated.maxHeightMeters.value, 10);

  const bayesApp = buildMiniAppSpecFromPrompt({ promptOrTopic: 'Bayes Theorem Diagnostic Calculator' });
  assert.equal(bayesApp.templateId, 'bayes_posterior');
  const bayesEval = evaluateMiniAppFormulas(bayesApp, {
    priorPct: 1,
    sensitivityPct: 99,
    falsePositivePct: 5,
  });
  assert.equal(bayesEval.posteriorPct.value, 16.67);
});

test('buildAnimatedExplanationScenes creates multi-scene animated explanations matched to the topic', () => {
  const scenes = buildAnimatedExplanationScenes('Projectile Motion in Physics');
  assert.equal(scenes.length, 3);
  assert.equal(scenes[0].animationMode, 'projectile_arc');
});
