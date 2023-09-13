import * as THREE from 'three';
import {initRenderer, 
        createGroundPlaneXZ,
        initDefaultBasicLight,
        setDefaultMaterial,
        onWindowResize} from "../libs/util/util.js";
import KeyboardState from '../libs/util/KeyboardState.js';

let scene, renderer, camera, material, keyboard;
scene = new THREE.Scene();
renderer = initRenderer();
material = setDefaultMaterial();
initDefaultBasicLight(scene);
keyboard = new KeyboardState();

window.addEventListener('resize', function(){
  console.log("Called");
  camera.aspect = window.innerWidth / (2*window.innerHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

window.addEventListener('click', newGame)

let camPos  = new THREE.Vector3(0, 10, 0);
let camLook = new THREE.Vector3(0.0, 0.0, 0.0);

// Create an orthogonal camera
let width = window.innerWidth;
let height = window.innerHeight;
let aspectRatio = width / (2*height);
let viewSize = 110;

camera = new THREE.OrthographicCamera(
  -aspectRatio*viewSize / 2,  // Left
  aspectRatio*viewSize / 2,   // Right
  viewSize / 2,               // Top
  -viewSize / 2,              // Bottom
  -1000,                      // Near
  1000                        // Far
);

camera.position.copy(camPos);
camera.lookAt(camLook);
scene.add(camera);

const extrudeSettings = {
  steps: 1,
  depth: 0.1,
  bevelEnabled: true,
  bevelThickness: 0.05,
  bevelSize: 0.05,
  bevelSegments: 4,
};

const planeHeight = 100;
const planeWidth = planeHeight / 2;
var groundPlane = createGroundPlaneXZ(planeWidth, planeHeight);
scene.add(groundPlane);

function newGame(){
  if(!isPlaying){
    startGame();
    throwGameBall();
  }
}

// Implementing rebatedor
let lastCursorPos = undefined;

function cursorMove(){
  let move = "undef";
  let cursorPos = new THREE.Vector2();
  cursorPos.x = (event.clientX / window.innerWidth) * 2 - 1;

  if(lastCursorPos){
    if(cursorPos.x < lastCursorPos.x)
      move = "left"
    if(cursorPos.x > lastCursorPos.x)
      move = "right"
  }

  lastCursorPos = cursorPos;
  return move;
}

function updateRebatedorCoordinates(point){
  let moveSide = cursorMove();
  let firstSegment = rebatedor[0];


  // Dealing with game screen limits
  if(moveSide == "undef")
    return;

  // (right limit)
  if(firstSegment.position.x >= 13.67){
    if(moveSide == "right")
      return;
    if(moveSide == "left"){
      if(point.x >= 12.5)
        return;
    }
  }

  // (left limit)
  if(firstSegment.position.x <= -23.68){
    if(moveSide == "left")
      return;
    if(moveSide == "right")
      console.log(point);
      if(point.x <= -23.73)
        return;
  }


  firstSegment.position.x = point.x
  firstSegment.line.position.x = point.x;

  for(let i=1; i<5; i++){
    rebatedor[i].position.x = rebatedor[i-1].position.x + 2.5;
    rebatedor[i].line.position.x = rebatedor[i-1].line.position.x + 2.5;
  }

  // Also update boxes
  for(let i=0; i<rebatedor.length; i++)
    rebatedor[i].bb.setFromObject(rebatedor[i]);
}

let raycaster = new THREE.Raycaster();

function checkMouseIntersection(){
  if(!isPaused){
    // Getting mouse
    let pointer = new THREE.Vector2();
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientX / window.innerWidth) * 2 + 1;

    // Checking for intersections
    raycaster.setFromCamera(pointer, camera);
    let intersects = raycaster.intersectObject(groundPlane);

    if(intersects.length > 0){
      let point = intersects[0].point;
      updateRebatedorCoordinates(point);
    }
  }
}

let rebatedor = [];
let rebatedorSegmentX = -2.5;
let rebatedorZPosition = 40;

function setupRebatedor(){
  let geometry, edges, line;

  for(let i=0; i<5; i++){
    geometry = new THREE.BoxGeometry(2.5, 4, 2);
    edges = new THREE.EdgesGeometry(geometry);
    rebatedor[i] = new THREE.Mesh(geometry, material);
    rebatedor[i].line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0xffffff}));
    rebatedor[i].bb = new THREE.Box3();
    
    // Positioning
    rebatedor[i].position.x = rebatedorSegmentX;
    rebatedor[i].line.position.x = rebatedorSegmentX;
    rebatedor[i].position.z = rebatedorZPosition;
    rebatedor[i].line.position.z = rebatedorZPosition;
    rebatedor[i].bb.setFromObject(rebatedor[i]);

    scene.add(rebatedor[i]);
    scene.add(rebatedor[i].line);

    rebatedorSegmentX = rebatedorSegmentX + 2.5;
  }
}

setupRebatedor();

window.addEventListener('mousemove', checkMouseIntersection);

// Implementing ball
let gameBall = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 16), material);
gameBall.bb = new THREE.Box3();
gameBall.visible = true;

scene.add(gameBall);

gameBall.helper = new THREE.Box3Helper(gameBall.bb, 'white');
// scene.add(gameBall.helper);

// Implementing edges
let edges = [];
const edgeSegmentSize = 5;
const edgeVertical = planeHeight / edgeSegmentSize;
const edgeHorizontal = planeWidth / edgeSegmentSize;

function setupEdges(){
  let geometry, obj, edgeMaterial;
  let edgeStartX = -planeWidth / 2 + 2.5;
  let edgeStartZ = -planeHeight / 2;

  edgeMaterial = setDefaultMaterial('grey');

  for(let s=0; s<1; s++){
    for(let i=0; i<edgeHorizontal; i++){
      geometry = new THREE.BoxGeometry(edgeSegmentSize, edgeSegmentSize, edgeSegmentSize);
      obj = new THREE.Mesh(geometry, edgeMaterial);

      obj.position.x = edgeStartX;
      obj.position.z = edgeStartZ;

      obj.bb = new THREE.Box3();
      obj.helper = new THREE.Box3Helper(obj.bb, 'white');
      obj.bb.setFromObject(obj);

      scene.add(obj);
      scene.add(obj.helper);

      edges.push(obj);

      edgeStartX += edgeSegmentSize;
    }

    edgeStartX = -planeWidth / 2 + 2.5;
    edgeStartZ = -planeHeight / 2 * -1;
  }

  edgeStartZ = -planeHeight / 2;
  edgeStartX = -planeWidth / 2 - 2.5;

  for(let s=0; s<2; s++){
    for(let i=0; i<edgeVertical+1; i++){
      geometry = new THREE.BoxGeometry(edgeSegmentSize, edgeSegmentSize, edgeSegmentSize);
      obj = new THREE.Mesh(geometry, edgeMaterial);

      obj.position.x = edgeStartX;
      obj.position.z = edgeStartZ;

      obj.bb = new THREE.Box3();
      obj.helper = new THREE.Box3Helper(obj.bb, 'white');
      obj.bb.setFromObject(obj);

      scene.add(obj);
      scene.add(obj.helper);

      edges.push(obj);

      edgeStartZ += edgeSegmentSize;
    }

    edgeStartZ = -planeHeight / 2;
    edgeStartX = -planeWidth / 2 * -1 + 2.5;
  }
}

setupEdges();

// Implementing wall
function createRoundedRectShape(materialRectShape){
  const roundedRectShape = new THREE.Shape();

  const widthRect = 4.8;
  const heightRect = 4.7;
  const radius = 1;

  roundedRectShape.moveTo(-widthRect / 2, -heightRect / 2 + radius);
  roundedRectShape.lineTo(-widthRect / 2, heightRect / 2 - radius);
  roundedRectShape.quadraticCurveTo(-widthRect / 2, heightRect / 2, -widthRect / 2 + radius, heightRect / 2);
  roundedRectShape.lineTo(widthRect / 2 - radius, heightRect / 2);
  roundedRectShape.quadraticCurveTo(widthRect / 2, heightRect / 2, widthRect / 2, heightRect / 2 - radius);
  roundedRectShape.lineTo(widthRect / 2, -heightRect / 2 + radius);
  roundedRectShape.quadraticCurveTo(widthRect / 2, -heightRect / 2, widthRect / 2 - radius, -heightRect / 2);
  roundedRectShape.lineTo(-widthRect / 2 + radius, -heightRect / 2);

  const geometry = new THREE.ExtrudeGeometry(roundedRectShape, extrudeSettings);
  const roundedRectangle = new THREE.Mesh(geometry, materialRectShape);

  roundedRectangle.translateY(1);
  roundedRectangle.rotateX(80);

  return roundedRectangle;
}

let wall = [];
const wallSegmentSize = 5;
const wallColumns = planeWidth / wallSegmentSize;
const wallLines = wallColumns / 2;

let wallColors = ['yellow', 'blue', 'pink', 'green', 'brown']

function setupWall(){
  let geometry, edges, wallMaterial;
  let wallStartZ = -planeHeight/2 + 10;

  for(let i=0; i<wallLines; i++){
    wall.push([]);
    for(let j=0; j<wallColumns; j++)
      wall[i].push(null);
  }

  for(let i=0; i<wallLines; i++){
    let wallStartX = -planeWidth/2 + 2.5;
    wallMaterial = setDefaultMaterial(wallColors[i]);

    for(let j=0; j<wallColumns; j++){
      wall[i][j] = createRoundedRectShape(wallMaterial);

      // Positioning
      wall[i][j].position.x = wallStartX;
      wall[i][j].position.z = wallStartZ;
      
      wall[i][j].bb = new THREE.Box3();
      wall[i][j].helper = new THREE.Box3Helper(wall[i][j].bb, 'white');
      wall[i][j].bb.setFromObject(wall[i][j]);

      scene.add(wall[i][j]);
      // scene.add(wall[i][j].helper);

      wallStartX = wallStartX + wallSegmentSize;
    }

    wallStartZ = wallStartZ + wallSegmentSize;
  }
}

setupWall();

// Implementing keyboard
function keyboardUpdate(){
  keyboard.update();

  if(keyboard.down("space")){
    if(isPlaying && !isPaused)
      isPaused = true;
    else if(isPlaying && isPaused)
      isPaused = false;
  }

  if(keyboard.down("enter"))
    toggleFullScreen();

  if(keyboard.down("R")){
    isPlaying = false;
    gameBall.position.copy(rebatedor[3].position.clone());
    gameBall.position.z -= 2;
    startGame();
  }
}

// Implementing collisions
function checkCollision(){
  // Checking collisions against wall
  for(let i=0; i<wallLines; i++){
    for(let j=0; j<wallColumns; j++){
      if(gameBall.bb.intersectsBox(wall[i][j].bb) && wall[i][j].live){
        wall[i][j].live = false;
        wall[i][j].visible = false;
        return wall[i][j];
      }
    }
  }

  // Checking collision against edges
  for(let i=0; i<edges.length; i++){
    if(gameBall.bb.intersectsBox(edges[i].bb)){
      return edges[i];
    }
  }

  return undefined;
}

function updateBallMovement(target){
  let dirVector, reflectVector, normal;

  dirVector = gameBall.getWorldDirection(new THREE.Vector3());
  normal = findCollisionNormal(gameBall, target);
  reflectVector = dirVector.clone().reflect(normal);

  const crossProduct = new THREE.Vector3();
  crossProduct.crossVectors(dirVector, reflectVector);

  const angle = dirVector.angleTo(reflectVector);

  console.log("Normal:", normal)
  console.log("Direção: ", dirVector);
  console.log("Reflexão: ", reflectVector);
  console.log("Angulo: ", angle);

  if(crossProduct.y > 0){
    // Left
    gameBall.rotateY(angle);
  }
  else if(crossProduct.y < 0){
    // Right
    gameBall.rotateY(-angle);
  }
}

function checkCollisionRebatedor(){
  for(let i=0; i<rebatedor.length; i++){
    if(gameBall.bb.intersectsBox(rebatedor[i].bb)){
      console.log("Colidiu com segmento: ", i);
      return i;
    }
  }

  return undefined;
}
function findCollisionNormal(cube1, cube2){
  const aabb1 = cube1.bb;
  const aabb2 = cube2.bb;

  const center1 = new THREE.Vector3();
  center1.copy(aabb1.min).add(aabb1.max).multiplyScalar(0.5);

  const center2 = new THREE.Vector3();
  center2.copy(aabb2.min).add(aabb2.max).multiplyScalar(0.5);

  const vectorBetweenCenters = new THREE.Vector3();
  vectorBetweenCenters.subVectors(center2, center1).normalize();

  const halfExtent1 = new THREE.Vector3();
  const halfExtent2 = new THREE.Vector3();
  halfExtent1.copy(aabb1.max).sub(aabb1.min).multiplyScalar(0.5);
  halfExtent2.copy(aabb2.max).sub(aabb2.min).multiplyScalar(0.5);

  const overlapX = halfExtent1.x + halfExtent2.x - Math.abs(vectorBetweenCenters.x);
  const overlapZ = halfExtent1.z + halfExtent2.z - Math.abs(vectorBetweenCenters.z);

  let collisionNormal;

  if (overlapX < overlapZ) {
      // Collision in the X-axis (horizontal)
      collisionNormal = new THREE.Vector3(1, 0, 0);
  } else {
      // Collision in the Z-axis (horizontal)
      collisionNormal = new THREE.Vector3(0, 0, 1);
  }

  return collisionNormal;
}

let isColliding = false;

function updateGameBall(){
  if(isPaused)
    return;

  if(isPlaying){
    gameBall.translateZ(0.5);
  }
  else if(!isPaused){
    gameBall.position.copy(rebatedor[3].position.clone());
    gameBall.position.z -= 2;
  }

  gameBall.bb.setFromObject(gameBall);

  if(isColliding){
    // Waiting for collision to end,
    // since it is detected after, it has already
    // been threated and the sphere is moving to another direction.
    if(checkCollision() == undefined && checkCollisionRebatedor() == undefined)
      isColliding = false;
  }
  else{
    let collision = checkCollision();
    let collisionRebatedor = checkCollisionRebatedor();

    if(collision != undefined){
      isColliding = true;
      updateBallMovement(collision);
    }

    if(collisionRebatedor != undefined){
      isColliding = true;
      kickBall(collisionRebatedor)
    }
  }
}

// Implementing rebatedor behavior
function resetGameBall(){
  let dir = gameBall.getWorldDirection(new THREE.Vector3(0, 0, 0));
  let zDirection = new THREE.Vector3(0, 0, 1);

  const crossProduct = new THREE.Vector3();
  crossProduct.crossVectors(dir, zDirection);

  const angle = dir.angleTo(zDirection);

  if(crossProduct.y > 0){
    // Left
    gameBall.rotateY(angle);
  }
  else if(crossProduct.y < 0){
    // Right
    gameBall.rotateY(-angle);
  }
}

function kickBall(segment){
  resetGameBall();

  switch(segment){
    case 0:
      gameBall.rotateY(THREE.MathUtils.degToRad(220));
      break;
    case 1:
      gameBall.rotateY(THREE.MathUtils.degToRad(200));
      break;
    case 2:
      gameBall.rotateY(THREE.MathUtils.degToRad(180));
      break;
    case 3:
      gameBall.rotateY(THREE.MathUtils.degToRad(160));
      break;
    case 4:
      gameBall.rotateY(THREE.MathUtils.degToRad(140));
      break;
  }
}

function endGame(){
  for(let i=0; i<wallLines; i++)
    for(let j=0; j<wallColumns; j++)
      if(wall[i][j].live)
        return false;

  isPlaying = false;
  return true;
}

let isPlaying = false;
let isPaused = false;

function throwGameBall(){
  let rebatedorStart = rebatedor[3];

  gameBall.position.copy(rebatedorStart.position);
  isPlaying = true;
  gameBall.visible = true;
}

function startGame(){
  for(let i=0; i<wallLines; i++){
    for(let j=0; j<wallColumns; j++){
      wall[i][j].live = true;
      wall[i][j].visible = true;
    }
  }
}

function toggleFullScreen(){
  if(!document.fullscreenElement)
    document.documentElement.requestFullscreen();
  else if(document.exitFullscreen)
    document.exitFullscreen();
}

startGame();
render();

function render()
{
  if(endGame())
    return;

  if(isPlaying || !isPaused)
    updateGameBall();

  keyboardUpdate();

  requestAnimationFrame(render);
  renderer.render(scene, camera);
}
