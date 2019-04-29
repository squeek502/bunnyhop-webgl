import * as Collisions from '../src/Collisions.js';

var assert = {
  equal: function(firstValue, secondValue) {
    if (firstValue != secondValue)
      throw new Error('Assert failed, ' + firstValue + ' is not equal to ' + secondValue + '.');
  },
  closeTo: function(firstValue, secondValue) {
    let delta = Math.abs(firstValue - secondValue);
    if (delta > 0.01)
      throw new Error('Assert failed, ' + firstValue + ' is not close to ' + secondValue + '.');
  },
  vecsEqual: function(firstValue, secondValue) {
    if (!firstValue.equalsWithEpsilon(secondValue, 0.01))
      throw new Error('Assert failed, ' + firstValue + ' is not equal to ' + secondValue + '.');
  }
};

var runTest = function(input, expected) {
  var trace = Collisions.ClipBoxToPlanes(input.mins, input.maxs, input.start, input.end, [input.plane]);

  assert.equal(trace.startsolid, expected.startsolid);
  assert.equal(trace.allsolid, expected.allsolid);
  assert.closeTo(trace.fraction, expected.fraction);
  if (expected.normal !== undefined)
    assert.vecsEqual(trace.plane.normal, expected.normal);
  else
    assert.equal(trace.plane, undefined);
};

// start out -> collide
runTest({
  mins: new BABYLON.Vector3(-16,-16,-32),
  maxs: new BABYLON.Vector3(16,16,32),
  start: new BABYLON.Vector3(0,0,128),
  end: new BABYLON.Vector3(0,0,0),
  plane:{
    dist: 0,
    normal: new BABYLON.Vector3(0,0,1)
  },
},{
  startsolid: 0,
  allsolid: 0,
  fraction: 0.75,
  normal: new BABYLON.Vector3(0,0,1)
});

// start out -> stay out
runTest({
  mins: new BABYLON.Vector3(-16,-16,-32),
  maxs: new BABYLON.Vector3(16,16,32),
  start: new BABYLON.Vector3(0,0,128),
  end: new BABYLON.Vector3(0,0,128),
  plane:{
    dist: 0,
    normal: new BABYLON.Vector3(0,0,1)
  },
},{
  startsolid: 0,
  allsolid: 0,
  fraction: 1,
  normal: undefined
});

// start in -> stay in
runTest({
  mins: new BABYLON.Vector3(-16,-16,-32),
  maxs: new BABYLON.Vector3(16,16,32),
  start: new BABYLON.Vector3(0,0,0),
  end: new BABYLON.Vector3(0,0,0),
  plane:{
    dist: 0,
    normal: new BABYLON.Vector3(0,0,1)
  },
},{
  startsolid: 1,
  allsolid: 1,
  fraction: 1,
  normal: undefined
});

// start in -> leave
runTest({
  mins: new BABYLON.Vector3(-16,-16,-32),
  maxs: new BABYLON.Vector3(16,16,32),
  start: new BABYLON.Vector3(0,0,0),
  end: new BABYLON.Vector3(0,0,128),
  plane:{
    dist: 0,
    normal: new BABYLON.Vector3(0,0,1)
  },
},{
  startsolid: 1,
  allsolid: 0,
  fraction: 1,
  normal: undefined
});

// start in -> collide with angled vector
runTest({
  mins: new BABYLON.Vector3(-16,-16,-32),
  maxs: new BABYLON.Vector3(16,16,32),
  start: new BABYLON.Vector3(0,0,128),
  end: new BABYLON.Vector3(0,0,0),
  plane:{
    dist: 0,
    normal: new BABYLON.Vector3(0.57735,0.57735,0.57735)
  },
},{
  startsolid: 0,
  allsolid: 0,
  fraction: 0.5,
  normal: new BABYLON.Vector3(0.57735,0.57735,0.57735)
});

// start exactly ovelapping -> don't move
runTest({
  mins: new BABYLON.Vector3(-16,-16,-32),
  maxs: new BABYLON.Vector3(16,16,32),
  start: new BABYLON.Vector3(0,0,32),
  end: new BABYLON.Vector3(0,0,32),
  plane:{
    dist: 0,
    normal: new BABYLON.Vector3(0,0,1)
  },
},{
  startsolid: 1,
  allsolid: 1,
  fraction: 1,
  normal: undefined
});
