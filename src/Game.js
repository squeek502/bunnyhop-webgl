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

    this.player = new Player(scene, new BABYLON.Vector3(0,128,0));

    var camera = new BABYLON.UniversalCamera("camera1", new BABYLON.Vector3(0, this.player.eyeHeight, 0), scene);
    camera.inertia = 0;
    camera.angularSensibility = 1000;
    camera.fov = 1.0;
    camera.setTarget(camera.position.add(new BABYLON.Vector3(1, 0, 0)));

    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

    var box = BABYLON.Mesh.CreateBox("box1", 64, scene);
    box.position.y = 32;

    var box2 = BABYLON.Mesh.CreateBox("box2", 64, scene);
    box2.position.y = 24;
    box2.position.x = 48;
    box2.scaling = new BABYLON.Vector3(0.5, 0.75, 1);

    var box3 = BABYLON.Mesh.CreateBox("box3", 64, scene);
    box3.position.y = 16;
    box3.position.x = 80;
    box3.scaling = new BABYLON.Vector3(0.5, 0.5, 1);

    var box4 = BABYLON.Mesh.CreateBox("box4", 64, scene);
    box4.position.y = 8;
    box4.position.x = 112;
    box4.scaling = new BABYLON.Vector3(0.5, 0.25, 1);

    var plane1 = BABYLON.Mesh.CreateBox("plane1", 1024, scene);
    plane1.rotation = new BABYLON.Vector3(Math.PI/2.5, 0, 0);
    plane1.position.z = 1024;
    plane1.position.y = -330;
    plane1.bakeCurrentTransformIntoVertices();

    var groundSize = 8192;

    // The ground
    var ground = BABYLON.Mesh.CreateGround("ground", groundSize, groundSize, 1, scene);
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
      if (key == "q" && evt.sourceEvent.type == "keydown") {
        this.player.conc();
      }
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
    // HACK: this update can be called before the scene is fully ready,
    // so just check for dt == 0 and return early in that case
    // TODO: onBeforeRenderObservable is probably not the best way
    // of implementing the game loop?
    if (dt == 0) return;

    this.player.update(dt, this.inputMap);

    this.scene.camera.position = new BABYLON.Vector3(this.player.position.x, this.player.position.y + this.player.eyeHeight, this.player.position.z);

    if (performance.now() >= this.nextHUDUpdate) {
      this.updateHUD(dt);
      this.nextHUDUpdate = performance.now() + 100;
    }
  }

  updateHUD(dt) {
    this.speedometerElement.innerHTML = Math.round(this.player.getHorizSpeed());
    this.debugElement.innerHTML = `<div>pos: ${this.player.position.x.toFixed(2)},${this.player.position.y.toFixed(2)},${this.player.position.z.toFixed(2)}</div>`;
    this.debugElement.innerHTML += `<div>vel: ${this.player.velocity.x.toFixed(2)},${this.player.velocity.y.toFixed(2)},${this.player.velocity.z.toFixed(2)}</div>`;
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
