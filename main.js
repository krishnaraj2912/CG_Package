import { TweenLite } from "gsap";
import { Power1 } from "gsap";
import "./style.css";
import * as THREE from "three";

console.clear();

var Window = (function () {
  function Window() {
      
    // container
    var _this = this;
    this.render = function () {
      this.renderer.render(this.scene, this.camera);
    };
    this.add = function (elem) {
      this.scene.add(elem);
    };
    this.remove = function (elem) {
      this.scene.remove(elem);
    };
    this.container = document.getElementById("game");

    // renders the screen
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor("#D0CBC7", 1);
    this.container.appendChild(this.renderer.domElement);

    // scene
    this.scene = new THREE.Scene();

    // camera for the screen
    var aspect = window.innerWidth / window.innerHeight;
    var d = 20;
    this.camera = new THREE.OrthographicCamera(
      -d * aspect,
      d * aspect,
      d,
      -d,
      -100,
      1000
    );
    this.camera.position.x = 2;
    this.camera.position.y = 2;
    this.camera.position.z = 2;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    
    // light directions and intensity
    this.light = new THREE.DirectionalLight(0xffffff, 0.5);
    this.light.position.set(0, 499, 0);
    this.scene.add(this.light);
    this.softLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.softLight);
    window.addEventListener("resize", function () {
      return _this.onResize();
    });
    this.onResize();
  }
  Window.prototype.setCamera = function (y, speed) {
    if (speed === void 0) {
      speed = 0.3;
    }
    TweenLite.to(this.camera.position, speed, {
      y: y + 4,
      ease: Power1.easeInOut
    });
    TweenLite.to(this.camera.lookAt, speed, { y: y, ease: Power1.easeInOut });
  };
  Window.prototype.onResize = function () {
    var viewSize = 30;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.left = window.innerWidth / -viewSize;
    this.camera.right = window.innerWidth / viewSize;
    this.camera.top = window.innerHeight / viewSize;
    this.camera.bottom = window.innerHeight / -viewSize;
    this.camera.updateProjectionMatrix();
  };
  return Window;
})();

var Tile = (function () {
  function Tile(Tile) {

    // set size and position
    this.STATES = { ACTIVE: "active", STOPPED: "stopped", MISSED: "missed" };
    this.MOVE_AMOUNT = 12;
    this.dimension = { width: 0, height: 0, depth: 0 };
    this.position = { x: 0, y: 0, z: 0 };
    this.targetTile = Tile;
    this.index = (this.targetTile ? this.targetTile.index : 0) + 1;
    this.workingPlane = this.index % 2 ? "x" : "z";
    this.workingDimension = this.index % 2 ? "width" : "depth";

    // set the dimensions from the target Tile, or defaults.
    this.dimension.width = this.targetTile ? this.targetTile.dimension.width : 10;
    this.dimension.height = this.targetTile ? this.targetTile.dimension.height : 2;
    this.dimension.depth = this.targetTile ? this.targetTile.dimension.depth : 10;
    this.position.x = this.targetTile ? this.targetTile.position.x : 0;
    this.position.y = this.dimension.height * this.index;
    this.position.z = this.targetTile ? this.targetTile.position.z : 0;
    this.colorOffset = this.targetTile ? this.targetTile.colorOffset : Math.round(Math.random() * 100);

    // set color
    if (!this.targetTile) {
      this.color = 0x123456789;
    } 
    else {
      var offset = this.index + this.colorOffset;
      var r = Math.sin(0.3 * offset) * 55 + 200;
      var g = Math.sin(0.3 * offset + 2) * 55 + 200;
      var b = Math.sin(0.3 * offset + 4) * 55 + 200;
      this.color = new THREE.Color(r / 255, g / 255, b / 255);
    }

    // state of the tile
    this.state = this.index > 1 ? this.STATES.ACTIVE : this.STATES.STOPPED;

    // set direction
    this.speed = -0.1 - this.index * 0.005;
    if (this.speed < -4) this.speed = -4;
    this.direction = this.speed;

    // create Tile
    var geometry = new THREE.BoxGeometry(
      this.dimension.width,
      this.dimension.height,
      this.dimension.depth
    );
    geometry.applyMatrix4(
      new THREE.Matrix4().makeTranslation(
        this.dimension.width / 2,
        this.dimension.height / 2,
        this.dimension.depth / 2
      )
    );
    this.material = new THREE.MeshToonMaterial({
      color: this.color,
      shading: THREE.FlatShading
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.set(
      this.position.x,
      this.position.y + (this.state === this.STATES.ACTIVE ? 0 : 0),
      this.position.z
    );
    if (this.state === this.STATES.ACTIVE) {
      this.position[this.workingPlane] =
        Math.random() > 0.5 ? -this.MOVE_AMOUNT : this.MOVE_AMOUNT;
    }
  }
  
  Tile.prototype.reverseDirection = function () {
    this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
  };
  
  Tile.prototype.place = function () {
    this.state = this.STATES.STOPPED;
    var overlap =
      this.targetTile.dimension[this.workingDimension] -
      Math.abs(
        this.position[this.workingPlane] -
          this.targetTile.position[this.workingPlane]
      );
    var TilesToReturn = {
      plane: this.workingPlane,
      direction: this.direction
    };
    if (this.dimension[this.workingDimension] - overlap < 0.3) {
      overlap = this.dimension[this.workingDimension];
      TilesToReturn.bonus = true;
      this.position.x = this.targetTile.position.x;
      this.position.z = this.targetTile.position.z;
      this.dimension.width = this.targetTile.dimension.width;
      this.dimension.depth = this.targetTile.dimension.depth;
    }
    if (overlap > 0) {
      var choppedDimensions = {
        width: this.dimension.width,
        height: this.dimension.height,
        depth: this.dimension.depth
      };
      choppedDimensions[this.workingDimension] -= overlap;
      this.dimension[this.workingDimension] = overlap;
      var placedGeometry = new THREE.BoxGeometry(
        this.dimension.width,
        this.dimension.height,
        this.dimension.depth
      );
      placedGeometry.applyMatrix(
        new THREE.Matrix4().makeTranslation(
          this.dimension.width / 2,
          this.dimension.height / 2,
          this.dimension.depth / 2
        )
      );
      var placedMesh = new THREE.Mesh(placedGeometry, this.material);
      var choppedGeometry = new THREE.BoxGeometry(
        choppedDimensions.width,
        choppedDimensions.height,
        choppedDimensions.depth
      );
      choppedGeometry.applyMatrix4(
        new THREE.Matrix4().makeTranslation(
          choppedDimensions.width / 2,
          choppedDimensions.height / 2,
          choppedDimensions.depth / 2
        )
      );
      var choppedMesh = new THREE.Mesh(choppedGeometry, this.material);
      var choppedPosition = {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z
      };
      if (
        this.position[this.workingPlane] <
        this.targetTile.position[this.workingPlane]
      ) {
        this.position[this.workingPlane] = this.targetTile.position[
          this.workingPlane
        ];
      } else {
        choppedPosition[this.workingPlane] += overlap;
      }
      placedMesh.position.set(
        this.position.x,
        this.position.y,
        this.position.z
      );
      choppedMesh.position.set(
        choppedPosition.x,
        choppedPosition.y,
        choppedPosition.z
      );
      TilesToReturn.placed = placedMesh;
      if (!TilesToReturn.bonus) TilesToReturn.chopped = choppedMesh;
    } 
    else {
      this.state = this.STATES.MISSED;
    }
    this.dimension[this.workingDimension] = overlap;
    return TilesToReturn;
  };
  
  Tile.prototype.tick = function () {
    if (this.state === this.STATES.ACTIVE) {
      var value = this.position[this.workingPlane];
      if (value > this.MOVE_AMOUNT || value < -this.MOVE_AMOUNT)
        this.reverseDirection();
      this.position[this.workingPlane] += this.direction;
      this.mesh.position[this.workingPlane] = this.position[this.workingPlane];
    }
  };
  return Tile;
})();

var Game = (function () {
  function Game() {
    var _this = this;
    this.STATES = {
      LOADING: "loading",
      PLAYING: "playing",
      READY: "ready",
      ENDED: "ended",
      RESETTING: "resetting"
    };
    this.Tiles = [];
    this.state = this.STATES.LOADING;
    this.Window = new Window();

    // accessing the different objects in the browser
    this.mainContainer = document.getElementById("container");
    this.scoreContainer = document.getElementById("score");
    this.startButton = document.getElementById("start-button");
    this.instructions = document.getElementById("instructions");
    
    this.scoreContainer.innerHTML = "0";
    this.newTiles = new THREE.Group();
    this.placedTiles = new THREE.Group();
    this.choppedTiles = new THREE.Group();
    this.Window.add(this.newTiles);
    this.Window.add(this.placedTiles);
    this.Window.add(this.choppedTiles);
    this.addTile();
    this.tick();
    this.updateState(this.STATES.READY);

    // getting keyboard input
    document.addEventListener("keydown", function (e) {
      if (e.keyCode === 32) _this.onAction();
    });

    // getting mouse input
    document.addEventListener("click", function (e) {
      _this.onAction();
    });
  }
  Game.prototype.updateState = function (newState) {
    for (var key in this.STATES)
      this.mainContainer.classList.remove(this.STATES[key]);
    this.mainContainer.classList.add(newState);
    this.state = newState;
  };
  Game.prototype.onAction = function () {
    switch (this.state) {
      case this.STATES.READY:
        this.startGame();
        break;
      case this.STATES.PLAYING:
        this.placeTile();
        break;
      case this.STATES.ENDED:
        this.restartGame();
        break;
      default:
        break;
    }
  };
  Game.prototype.startGame = function () {
    if (this.state !== this.STATES.PLAYING) {
      this.scoreContainer.innerHTML = "0";
      this.updateState(this.STATES.PLAYING);
      this.addTile();
    }
  };
  Game.prototype.restartGame = function () {
    var _this = this;
    this.updateState(this.STATES.RESETTING);
    var oldTiles = this.placedTiles.children;
    var removeSpeed = 0.2;
    var delayAmount = 0.02;
    var _loop_1 = function (i) {
      TweenLite.to(oldTiles[i].scale, removeSpeed, {
        x: 0,
        y: 0,
        z: 0,
        delay: (oldTiles.length - i) * delayAmount,
        ease: Power1.easeIn,
        onComplete: function () {
          return _this.placedTiles.remove(oldTiles[i]);
        }
      });
      TweenLite.to(oldTiles[i].rotation, removeSpeed, {
        y: 0.5,
        delay: (oldTiles.length - i) * delayAmount,
        ease: Power1.easeIn
      });
    };
    for (var i = 0; i < oldTiles.length; i++) {
      _loop_1(i);
    }
    var cameraMoveSpeed = removeSpeed * 2 + oldTiles.length * delayAmount;
    this.Window.setCamera(2, cameraMoveSpeed);
    var countdown = { value: this.Tiles.length - 1 };
    TweenLite.to(countdown, cameraMoveSpeed, {
      value: 0,
      onUpdate: function () {
        _this.scoreContainer.innerHTML = String(Math.round(countdown.value));
      }
    });
    this.Tiles = this.Tiles.slice(0, 1);
    setTimeout(function () {
      _this.startGame();
    }, cameraMoveSpeed * 1000);
  };
  Game.prototype.placeTile = function () {
    var _this = this;
    var currentTile = this.Tiles[this.Tiles.length - 1];
    var newTiles = currentTile.place();
    this.newTiles.remove(currentTile.mesh);
    if (newTiles.placed) this.placedTiles.add(newTiles.placed);
    if (newTiles.chopped) {
      this.choppedTiles.add(newTiles.chopped);
      var positionParams = {
        y: "-=30",
        ease: Power1.easeIn,
        onComplete: function () {
          return _this.choppedTiles.remove(newTiles.chopped);
        }
      };
      if (newTiles.chopped.position[newTiles.plane] > newTiles.placed.position[newTiles.plane]) {
        positionParams[newTiles.plane] = "+=" + 40 * Math.abs(newTiles.direction);
      } 
      else {
        positionParams[newTiles.plane] = "-=" + 40 * Math.abs(newTiles.direction);
      }
      TweenLite.to(newTiles.chopped.position, 1, positionParams);
    }
    this.addTile();
  };
  Game.prototype.addTile = function () {
    var lastTile = this.Tiles[this.Tiles.length - 1];
    if (lastTile && lastTile.state === lastTile.STATES.MISSED) {
      return this.endGame();
    }
    this.scoreContainer.innerHTML = String(this.Tiles.length - 1);
    var newKidOnTheTile = new Tile(lastTile);
    this.newTiles.add(newKidOnTheTile.mesh);
    this.Tiles.push(newKidOnTheTile);
    this.Window.setCamera(this.Tiles.length * 2);
    if (this.Tiles.length >= 5) this.instructions.classList.add("hide");
  };
  Game.prototype.endGame = function () {
    this.updateState(this.STATES.ENDED);
  };
  Game.prototype.tick = function () {
    var _this = this;
    this.Tiles[this.Tiles.length - 1].tick();
    this.Window.render();
    requestAnimationFrame(function () {
      _this.tick();
    });
  };
  return Game;
})();

var game = new Game();
