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
  }

  update(dt, inputMap) {
    this.playerMove(dt, inputMap);
  }

  playerMove(dt, inputMap) {
    if (this.checkStuck()) {
      return;
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

  checkStuck() {
    return false;
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
    //var trace = PlayerTrace(this.position, dest);
    //if (trace.fraction == 1) {
    if (true) {
      this.position = dest;
    } else {
      this.stairMove(dt);
    }
  }

  stairMove(dt) {
    var stepsize = this.scene.stepsize;
    var originalPosition = this.position;
    var originalVelocity = this.velocity;

    var clip = this.slideMove(dt);

    var downPosition = this.position;
    var downVelocity = this.velocity;

    this.position = originalPosition;
    this.velocity = originalVelocity;

    var dest = this.position;
    dest.y += stepsize;

    //var trace = PlayerTrace(this.position, dest);
    //if (!trace.startsolid && !trace.allsolid) {
    //  this.position = trace.endpos;
    //}

    clip = this.slideMove(dt);

    dest = this.position;
    dest.y -= stepsize;

    //trace = PlayerTrace(this.position, dest);
    //if (trace.plane.normal.y < 0.7) {
    //  this.position = downPosition;
    //  this.velocity = downVelocity;
    //}

    //if (!trace.startsolid && !trace.allsolid) {
    //  this.position = trace.endpos;
    //}

    var upPosition = this.position;

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

  // called PM_FlyMove in HL: applies velocity while sliding along touched planes
  slideMove(dt) {
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    if (this.onGround) {
      this.position.y = 0;
    } else {
      this.position.y += this.velocity.y * dt;
    }
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
    this.onGround = this.position.y <= 0;
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
}
