import * as Collisions from './Collisions.js';

export default class Player {

  constructor(scene, position) {
    this.scene = scene;
    this.position = position;
    this.velocity = BABYLON.Vector3.Zero();
    this.onGround = true;
    this.moveSpeed = 400;
    this.height = 72;
    this.eyeHeight = this.height - 8;
    this.duckHeight = 36;
    this.duckEyeHeight = this.duckHeight - 6;
    this.jumpVelocity = 295;
    this.mins = new BABYLON.Vector3(-16, 0, -16);
    this.maxs = new BABYLON.Vector3(16, this.height, 16);
  }

  update(dt, inputMap) {
    this.playerMove(dt, inputMap);
  }

  playerMove(dt, inputMap) {
    if (this.checkStuck()) {
      // this is kind of an unrecoverable state as of now, so just throw
      throw new Error("stuck and unable to get unstuck");
    }
    this.categorizePosition();
    this.addHalfGravity(dt);

    if(this.onGround && inputMap[" "]) {
      this.jump();
      // this is done in jump normally, extracted out to here instead
      // from HL: "Decay it for simulation"
      this.addHalfGravity(dt);
    }

    if (this.onGround) {
      this.velocity.y = 0;
      this.applyFriction(dt, this.scene.friction);
    }

    var wishDir = this.getWishDirection(inputMap);
    if (this.onGround) {
      this.groundMove(dt, wishDir);
    } else {
      this.airMove(dt, wishDir);
    }

    this.categorizePosition();
    this.addHalfGravity(dt);

    if (this.onGround) {
      this.velocity.y = 0;
    }
  }

  // this is Quake 1's version of handling stuckness; it's very simple compared to HL1's
  // This function assumes that we are currently stuck,
  // Returns true if able to get unstuck, false otherwise.
  nudgePosition() {
    var testPosition = new BABYLON.Vector3();
    var nudge = [0, -1/8, 1/8];
    var x, y, z;
    // try nudging in every possible combination of directions
    for (z=0; z<3; z++) {
      for (x=0; x<3; x++) {
        for (y=0; y<3; y++) {
          testPosition.x = this.position.x + nudge[x];
          testPosition.y = this.position.y + nudge[y];
          testPosition.z = this.position.z + nudge[z];
          // if we are not stuck anymore, we're done
          if (Collisions.PlayerTestPosition(this.scene.meshes, testPosition, this.mins, this.maxs)) {
            this.position = testPosition;
            return true;
          }
        }
      }
    }
    return false;
  }

  // Returns true if we are stuck and we weren't able to get unstuck
  checkStuck() {
    var wasStuck = !Collisions.PlayerTestPosition(this.scene.meshes, this.position, this.mins, this.maxs);
    var didUnstuck = false;
    if (wasStuck) {
      // TODO: more robust stuckness handling if nudgePosition on its own isn't adequate
      didUnstuck = this.nudgePosition();
    }
    return wasStuck && !didUnstuck;
  }

  groundMove(dt, wishDir) {
    this.accelerate(dt, wishDir, this.moveSpeed, this.scene.accel);
    var wasOnGround = this.onGround;
    var dest = new BABYLON.Vector3(
      this.position.x + this.velocity.x * dt,
      this.position.y,
      this.position.z + this.velocity.z * dt
    );
    // TODO: Trace to see if it's possible to move there in one go
    var trace = Collisions.PlayerTrace(this.scene.meshes, this.position, dest, this.mins, this.maxs);
    if (trace.fraction == 1) {
      this.position = dest;
    } else {
      this.stairMove(dt);
    }
  }

  stairMove(dt) {
    var stepsize = this.scene.stepsize;
    var originalPosition = this.position.clone();
    var originalVelocity = this.velocity.clone();

    var clip = this.slideMove(dt);

    var downPosition = this.position.clone();
    var downVelocity = this.velocity.clone();

    this.position = originalPosition.clone();
    this.velocity = originalVelocity.clone();

    var dest = this.position.clone();
    dest.y += stepsize;

    var trace = Collisions.PlayerTrace(this.scene.meshes, this.position, dest, this.mins, this.maxs);
    if (!trace.startsolid && !trace.allsolid) {
      this.position = trace.endpos.clone();
    }

    clip = this.slideMove(dt);

    dest = this.position.clone();
    dest.y -= stepsize;

    trace = Collisions.PlayerTrace(this.scene.meshes, this.position, dest, this.mins, this.maxs);
    if (!trace.plane || trace.plane.normal.y < 0.7) {
      this.position = downPosition;
      this.velocity = downVelocity;
      return;
    }

    if (!trace.startsolid && !trace.allsolid) {
      this.position = trace.endpos;
    }

    var upPosition = this.position.clone();

    var downdist = (downPosition.x-originalPosition.x)*(downPosition.x-originalPosition.x) +
                   (downPosition.z-originalPosition.z)*(downPosition.z-originalPosition.z);
    var updist = (upPosition.x-originalPosition.x)*(upPosition.x-originalPosition.x) +
                 (upPosition.z-originalPosition.z)*(upPosition.z-originalPosition.z);

    if (downdist > updist) {
      this.position = downPosition;
      this.velocity = downVelocity;
    } else {
      this.velocity.y = downVelocity.y;
    }
  }

  airMove(dt, wishDir) {
    this.airAccelerate(dt, wishDir, this.moveSpeed, this.scene.airAccel);
    this.slideMove(dt);
  }

  clipVelocity(velocity, normal, overbounce) {
    if (!normal) { normal = BABYLON.Vector3.Zero(); }
    const STOP_EPSILON = 0.1;
    var angle = normal.y;
    var blocked = 0;
    if (angle > 0)
      blocked |= 1;
    if (angle === 0)
      blocked |= 2;

    var backoff = BABYLON.Vector3.Dot(velocity, normal) * overbounce;

    var apply = function(compVel, compNorm) {
      var change = compNorm*backoff;
      var compOut = compVel - change;
      if (compOut > -STOP_EPSILON && compOut < STOP_EPSILON)
        compOut = 0;
      return compOut;
    };
    var newVelocity = new BABYLON.Vector3(
      apply(velocity.x, normal.x),
      apply(velocity.y, normal.y),
      apply(velocity.z, normal.z)
    );

    // this was a new addition in the source engine
    var adjust = BABYLON.Vector3.Dot(newVelocity, normal);
    if( adjust < 0.0 ) {
      newVelocity.x -= normal.x * adjust;
      newVelocity.y -= normal.y * adjust;
      newVelocity.z -= normal.z * adjust;
    }

    return {
      blocked: blocked,
      velocity: newVelocity
    };
  }

  // called PM_FlyMove in HL: applies velocity while sliding along touched planes
  slideMove(dt) {
    const MAX_CLIP_PLANES = 5;
    var numbumps = 4;
    var blocked = 0;
    var numplanes = 0;
    var originalVelocity = this.velocity.clone();
    var primalVelocity = this.velocity.clone();
    var planes = [];

    var allFraction = 0;
    var timeLeft = dt;

    for (var bumpcount=0; bumpcount<numbumps; bumpcount++) {
      if (this.velocity.lengthSquared() === 0) {
        break;
      }

      var end = new BABYLON.Vector3(
        this.position.x + this.velocity.x * dt,
        this.position.y + this.velocity.y * dt,
        this.position.z + this.velocity.z * dt
      );

      var trace = Collisions.PlayerTrace(this.scene.meshes, this.position, end, this.mins, this.maxs);
      allFraction += trace.fraction;

      if (trace.allsolid) {
        this.velocity = BABYLON.Vector3.Zero();
        return 4;
      }

      if (trace.fraction > 0) {
        this.position = trace.endpos.clone();
        originalVelocity = this.velocity.clone();
        numplanes = 0;
      }

      if (trace.fraction == 1) {
        break;
      }

      //PM_AddToTouched(trace, pmove->velocity);

      if (trace.plane.normal.y > 0.7) {
        blocked |= 1;
      }

      if (trace.plane.normal.y === 0) {
        blocked |= 2;
      }

      timeLeft -= timeLeft * trace.fraction;

      if (numplanes >= MAX_CLIP_PLANES) {
        // this shouldn't happen
        this.velocity = BABYLON.Vector3.Zero();
        break;
      }

      planes[numplanes] = trace.plane.normal;
      numplanes++;

      if (!this.onGround) {
        var newVelocity;
        for (let i=0; i<numplanes; i++) {
          if (planes[i].y > 0.7) {
            let clipped = this.clipVelocity(originalVelocity, planes[i], 1);
            newVelocity = clipped.velocity;
          }
          else {
            let clipped = this.clipVelocity(originalVelocity, planes[i], 1.0 /*+ pmove->movevars->bounce * (1-pmove->friction)*/);
            newVelocity = clipped.velocity;
          }
        }
        this.velocity = newVelocity.clone();
        originalVelocity = newVelocity.clone();
      }
      else {
        var i;
        for (i=0; i<numplanes; i++) {
          let clipped = this.clipVelocity(originalVelocity, planes[i], 1);
          this.velocity = clipped.velocity;
          var j;
          for (j=0; j<numplanes; j++) {
            if (j != i) {
              if (BABYLON.Vector3.Dot(this.velocity, planes[j]) < 0)
                break;
            }
          }
          if (j == numplanes)
            break;
        }
        if (i == numplanes) {
          if (numplanes != 2) {
            this.velocity = BABYLON.Vector3.Zero();
            break;
          }
          var dir = BABYLON.Vector3.Cross(planes[0], planes[1]);
          var d = BABYLON.Vector3.Dot(dir, this.velocity);
          this.velocity = dir.scale(d);
        }

        if (BABYLON.Vector3.Dot(this.velocity, primalVelocity) <= 0) {
          this.velocity = BABYLON.Vector3.Zero();
          break;
        }
      }
    }

    if (allFraction === 0) {
      this.velocity = BABYLON.Vector3.Zero();
    }

    return blocked;
  }

  applyFriction(dt, friction) {
    var speed = this.velocity.length();
    if (speed < 0.1) {
      return;
    }

    var drop = 0;
    if (this.onGround) {
      var control = Math.max(speed, this.scene.stopspeed);
      drop += control * friction * dt;
    }

    var newspeed = Math.max(0, speed - drop);
    newspeed /= speed;

    this.velocity.x *= newspeed;
    this.velocity.y *= newspeed;
    this.velocity.z *= newspeed;
  }

  getWishDirection(inputMap) {
    var forwardmove = 0;
    var sidemove = 0;
    if(inputMap["w"] || inputMap["ArrowUp"]){
      forwardmove += 1;
    }
    if(inputMap["a"] || inputMap["ArrowLeft"]){
      sidemove -= 1;
    }
    if(inputMap["s"] || inputMap["ArrowDown"]){
      forwardmove -= 1;
    }
    if(inputMap["d"] || inputMap["ArrowRight"]){
      sidemove += 1;
    }

    var forwardRay = this.scene.camera.getForwardRay(1);
    var forward = forwardRay.direction;
    var right = BABYLON.Vector3.Cross(this.scene.camera.upVector, forward);

    forward.y = 0;
    right.y = 0;

    forward.normalize();
    right.normalize();

    var wishDir = BABYLON.Vector3.Zero();
    wishDir.x = forward.x*forwardmove + right.x*sidemove;
    wishDir.z = forward.z*forwardmove + right.z*sidemove;
    wishDir.normalize();
    return wishDir;
  }

  categorizePosition() {
    var point = new BABYLON.Vector3(
      this.position.x,
      this.position.y - 2,
      this.position.z
    );

    if (this.velocity.y > 180) {
      this.onGround = false;
    }
    else {
      var tr = Collisions.PlayerTrace(this.scene.meshes, this.position, point, this.mins, this.maxs);
      if (!tr.plane || tr.plane.normal.y < 0.7) {
        this.onGround = false;
      }
      else {
        this.onGround = true;
      }
    }
  }

  jump() {
    this.onGround = false;
    this.velocity.y += this.jumpVelocity;
  }

  accelerate(dt, wishDir, wishSpeed, accel) {
    var currentSpeed = BABYLON.Vector3.Dot(this.velocity, wishDir);
    var addSpeed = wishSpeed - currentSpeed;
    if (addSpeed <= 0)
      return;

    var accelSpeed = accel * wishSpeed * dt; // * friction (personal friction?)

    if (accelSpeed > addSpeed) {
      accelSpeed = addSpeed;
    }

    this.velocity.x += accelSpeed * wishDir.x;
    this.velocity.y += accelSpeed * wishDir.y;
    this.velocity.z += accelSpeed * wishDir.z;
  }

  airAccelerate(dt, wishDir, wishSpeed, accel) {
    var wishSpd = wishSpeed;
    if (wishSpd > 30) {
      wishSpd = 30;
    }
    var currentSpeed = BABYLON.Vector3.Dot(this.velocity, wishDir);
    var addSpeed = wishSpd - currentSpeed;
    if (addSpeed <= 0)
      return;

    var accelSpeed = accel * wishSpeed * dt;
    if (accelSpeed > addSpeed) {
      accelSpeed = addSpeed;
    }

    this.velocity.x += accelSpeed * wishDir.x;
    this.velocity.y += accelSpeed * wishDir.y;
    this.velocity.z += accelSpeed * wishDir.z;
  }

  addHalfGravity(dt) {
    var gravity = this.scene.gravity;
    this.velocity.y -= gravity * 0.5 * dt;
  }

  getHorizSpeed() {
    return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
  }

  conc() {
    const LATERAL_POWER = 2.74;
    const VERTICAL_POWER = 4.10;
    const GROUND_UP_PUSH = 90;

    if (this.onGround) {
      this.velocity = new BABYLON.Vector3(
        this.velocity.x * LATERAL_POWER * 0.95,
        (this.velocity.y + GROUND_UP_PUSH) * VERTICAL_POWER,
        this.velocity.z * LATERAL_POWER * 0.95
      );
    }
    else {
      this.velocity.multiplyInPlace(new BABYLON.Vector3(LATERAL_POWER, VERTICAL_POWER, LATERAL_POWER));
    }
  }
}
