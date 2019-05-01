import * as Collisions from '../src/Collisions.js';
import Player from '../src/Player.js';
import * as assert from './assert.js';

// This tests an edge case of slideMove where the collision is so close to not being
// a collision that things have a chance of failing, i.e. clipVelocity will not alter velocity
// and slideMove will set velocity to zero even though it shouldn't
//
// It was fixed by adding COLLIDE_EPSILON in Collisions.js
var scene = {
  meshes: [
    [
      {
        dist: -118.28204018567811,
        normal: new BABYLON.Vector3(0, 0.9510565161477913, -0.3090169948284817)
      }
    ]
  ]
};
var pos = new BABYLON.Vector3(229.83204725586555, 62.68445117563382, 559.5904979793653);
var vel = new BABYLON.Vector3(-138.86182667422605, 275.297184958244, 847.277612601874);
var player = new Player(scene, pos);
player.velocity = vel;
player.onGround = false;

player.slideMove(0.033);

if (player.velocity.equals(BABYLON.Vector3.Zero())) {
  throw new Error("player velocity set to zero when it shouldn't be");
}
