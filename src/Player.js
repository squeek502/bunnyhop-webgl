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
    this.addHalfGravity(dt);

    if(this.onGround && inputMap[" "]) {
      this.jump();
      // this is done in jump normally, extracted out to here instead
      this.addHalfGravity(dt);
    }

    if (this.onGround) {
      this.velocity.y = 0;
      this.applyFriction(dt, this.scene.friction);
    }

    var wishDir = this.getWishDirection(inputMap);
    if (this.onGround) {
      this.walkMove(dt, wishDir);
    } else {
      this.airMove(dt, wishDir);
    }
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    this.categorizePosition();

    this.addHalfGravity(dt);

    if (this.onGround) {
      this.velocity.y = 0;
      this.position.y = 0;
    }
  }

  walkMove(dt, wishDir) {
    this.accelerate(dt, wishDir, this.moveSpeed, this.scene.accel);
  }

  airMove(dt, wishDir) {
    this.airAccelerate(dt, wishDir, this.moveSpeed, this.scene.airAccel);
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
