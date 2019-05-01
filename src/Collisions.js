export class Trace {
  constructor() {
    this.fraction = 1;
    this.allsolid = false;
    this.startsolid = false;
    this.plane = undefined;
  }
}

export function PlayerTrace(meshes, start, end, mins, maxs, predicate) {
  var trace = BoxTrace(meshes, start, end, mins, maxs, predicate);
  if (trace.allsolid) {
    trace.startsolid = true;
  }
  if (trace.startsolid) {
    trace.fraction = 0;
  }
  return trace;
}

var DIST_EPSILON = 0.03125;
// COLLIDE_EPSILON is necessary to avoid instances where ClipBoxToPlanes
// thinks a collision happened but its so close to not colliding that future
// movement will fail (i.e. clipVelocity will not alter velocity since
// Dot(velocity, normal) will return exactly 0)
var COLLIDE_EPSILON = DIST_EPSILON/1024;

export function ClipBoxToPlanes(mins, maxs, start, end, planes, lastTrace) {
  var trace = lastTrace ? lastTrace : new Trace();
  var enterfrac = -1;
  var leavefrac = 1;
  var clipplane;
  var getout = false;
  var startout = false;

  for (let i=0; i<planes.length; i++) {
    var plane = planes[i];
    var ofs = new BABYLON.Vector3();
    ofs.x = plane.normal.x < 0 ? maxs.x : mins.x;
    ofs.y = plane.normal.y < 0 ? maxs.y : mins.y;
    ofs.z = plane.normal.z < 0 ? maxs.z : mins.z;

    var dist = BABYLON.Vector3.Dot(ofs, plane.normal);
    dist = plane.dist - dist;

    var d1 = BABYLON.Vector3.Dot(start, plane.normal) - dist;
    var d2 = BABYLON.Vector3.Dot(end, plane.normal) - dist;

    if (d2 > 0)
      getout = true;
    if (d1 > 0)
      startout = true;

    if (d1 > 0 && d2 >= (d1-COLLIDE_EPSILON))
      return trace;

    if (d1 <= 0 && d2 <= 0)
      continue;

    // crosses face
    if (d1 > d2) {
      // entering plane
      let f = (d1 - DIST_EPSILON) / (d1 - d2);
      if (f > enterfrac) {
        enterfrac = f;
        clipplane = plane;
      }
    }
    else {
      // leaving plane
      let f = (d1 + DIST_EPSILON) / (d1 - d2);
      if (f < leavefrac) {
        leavefrac = f;
      }
    }
  }

  if (!startout) {
    trace.startsolid = true;
    if (!getout) {
      trace.allsolid = true;
    }
    return trace;
  }
  if (enterfrac < leavefrac) {
    if (enterfrac > -1 && enterfrac < trace.fraction) {
      if (enterfrac < 0) {
        enterfrac = 0;
      }
      trace.fraction = enterfrac;
      trace.plane = clipplane;
    }
  }

  return trace;
}

// sometimes verts/normals of meshes will have very slightly different values
// even though they are acfually on the same plane
const PLANE_EPSILON = Math.pow(10, -8);

// TODO: cache the plane representations
export function MeshToPlanes(object) {
  // if object is already an array of planes, then return it
  if (Array.isArray(object)) {
    return object;
  }
  var rawVerts = object.getVerticesData ? object.getVerticesData(BABYLON.VertexBuffer.PositionKind) : [];
  //var rawFaces = object.getIndices ? object.getIndices() : [];
  var rawNormals = object.getVerticesData ? object.getVerticesData(BABYLON.VertexBuffer.NormalKind) : [];

  var planes = [];
  var seenPlane = function(dist, normal) {
    for (let i=0; i<planes.length; i++) {
      let plane = planes[i];
      // not aware of a way to do this check more efficiently, because
      // we can't assume equality, so we need to do O(n) iteration while
      // testing for equality with an epsilon
      if (
        Math.abs(plane.dist - dist) < PLANE_EPSILON &&
        plane.normal.equalsWithEpsilon(normal, PLANE_EPSILON)
      ) {
        return true;
      }
    }
    return false;
  };
  var normals = [];
  for (let index = 0; index < rawNormals.length; index += 3) {
    var vec = BABYLON.Vector3.FromArray(rawNormals, index);
    normals.push(vec);
  }
  let transform = object.computeWorldMatrix(true);
  var verts = [];
  for (let index = 0; index < rawVerts.length; index += 3) {
    var worldVec = BABYLON.Vector3.TransformCoordinates(
      BABYLON.Vector3.FromArray(rawVerts, index), transform
    );
    var normal = normals[index/3];
    var dist = BABYLON.Vector3.Dot(worldVec, normal);
    if (!seenPlane(dist, normal)) {
      planes.push({
        dist: dist,
        normal: normal
      });
    }
  }
  return planes;
}

// TODO: actually use predicate
export function BoxTrace(meshes, start, end, mins, maxs, predicate) {
  var trace = new Trace();
  for (var i=0; i < meshes.length; i++) {
    var mesh = meshes[i];
    var planes = MeshToPlanes(mesh);
    trace = ClipBoxToPlanes(mins, maxs, start, end, planes, trace);
    if (trace.fraction === 0) {
      break;
    }
  }

  if (trace.fraction == 1) {
    trace.endpos = end.clone();
  }
  else {
    trace.endpos = new BABYLON.Vector3(
      start.x + trace.fraction * (end.x - start.x),
      start.y + trace.fraction * (end.y - start.y),
      start.z + trace.fraction * (end.z - start.z)
    );
  }
  return trace;
}
