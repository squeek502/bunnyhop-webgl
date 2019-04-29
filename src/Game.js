import Player from './Player.js';

export default class Game {

  constructor(canvas, engine, fpsmeter) {
    this.canvas = canvas;
    this.engine = engine;
    this.scene = undefined;
    this.inputMap = {};
    this.player = undefined;
    this.nextHUDUpdate = 0;
    this.speedometerElement = document.getElementById("speedometer");
    this.debugElement = document.getElementById("debug");

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(function () {
      if (this.scene) {
        fpsmeter.tickStart();
        this.scene.render();
        fpsmeter.tick();
      }
    }.bind(this));

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
      this.engine.resize();
    }.bind(this));
  }

  setScene(scene) {
    this.scene = scene;
  }

  createScene() {
    // Setup the scene
    var scene = new BABYLON.Scene(this.engine);
    scene.gravity = 800;
    scene.accel = 10;
    scene.airAccel = 10;
    scene.friction = 4;
    scene.stopspeed = 100;
    scene.stepsize = 18;

    this.player = new Player(scene, BABYLON.Vector3.Zero());

    var camera = new BABYLON.UniversalCamera("camera1", new BABYLON.Vector3(0, this.player.eyeHeight, 0), scene);
    camera.inertia = 0;
    camera.angularSensibility = 1000;
    camera.setTarget(camera.position.add(new BABYLON.Vector3(1, 0, 0)));

    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

    var groundSize = 1024;

    // The ground
    var ground = BABYLON.Mesh.CreateGround("ground", groundSize, groundSize, 2, scene);
    if (!ground.material) {
      ground.material = new BABYLON.StandardMaterial(ground.name+"mat", scene);
    }
    ground.material.specularColor = BABYLON.Color3.Black();
    ground.material.diffuseTexture = new BABYLON.Texture("intentionally.missing", scene);

    // Keyboard events
    scene.actionManager = new BABYLON.ActionManager(scene);
    var keyHandler = function (evt) {
      var key = evt.sourceEvent.key;
      if (key.length == 1) {
        key = key.toLowerCase();
      }
      this.inputMap[key] = evt.sourceEvent.type == "keydown";
    }.bind(this);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, keyHandler));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, keyHandler));

    // Game/Render loop
    scene.onBeforeRenderObservable.add(()=>{
      let deltaTime = this.engine.getDeltaTime();
      let dt = deltaTime / 1000;
      this.update(dt);
    });

    scene.camera = camera;
    this._initPointerLock();

    return scene;
  }

  update(dt) {
    this.player.update(dt, this.inputMap);

    this.scene.camera.position = new BABYLON.Vector3(this.player.position.x, this.player.position.y + this.player.eyeHeight, this.player.position.z);

    if (performance.now() >= this.nextHUDUpdate) {
      this.updateHUD(dt);
      this.nextHUDUpdate = performance.now() + 100;
    }
  }

  updateHUD(dt) {
    this.speedometerElement.innerHTML = Math.round(this.player.getHorizSpeed());
    this.debugElement.innerHTML = `<div>pos: ${this.player.position.x},${this.player.position.y},${this.player.position.z}</div>`;
    this.debugElement.innerHTML += `<div>vel: ${this.player.velocity.x},${this.player.velocity.y},${this.player.velocity.z}</div>`;
    this.debugElement.innerHTML += `<div>onGround: ${this.player.onGround}</div>`;
    if (this.scene.debugTrace) {
      this.debugElement.innerHTML += `<div>trace: fraction: ${this.scene.debugTrace.fraction} startsolid: ${this.scene.debugTrace.startsolid} allsolid: ${this.scene.debugTrace.allsolid} plane: ${this.scene.debugTrace.plane}</div>`;
    }
  }

  _initPointerLock() {
    var _this = this;
    // Request pointer lock
    var canvas = this.canvas;
    canvas.addEventListener("click", function(evt) {
      canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
      if (canvas.requestPointerLock) {
        canvas.requestPointerLock();
      }
    }, false);

    // Event listener when the pointerlock is updated.
    var pointerlockchange = function (event) {
      _this.controlEnabled = (document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas || document.msPointerLockElement === canvas || document.pointerLockElement === canvas);
      if (!_this.controlEnabled) {
        _this.scene.camera.detachControl(canvas);
      } else {
        _this.scene.camera.attachControl(canvas);
      }
    };
    document.addEventListener("pointerlockchange", pointerlockchange, false);
    document.addEventListener("mspointerlockchange", pointerlockchange, false);
    document.addEventListener("mozpointerlockchange", pointerlockchange, false);
    document.addEventListener("webkitpointerlockchange", pointerlockchange, false);
  }

}
