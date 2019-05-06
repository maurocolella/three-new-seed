'use strict';

(function(){
  // Script globals
  let renderer,
    composer,
    renderPass,
    shaderPass,
    scene,
    camera,
    controls,
    cubeMesh,
    pyramidMesh,
    light,
    mouse,
    raycaster,
    key;

  // Shaders
  let bloomPass,
    chromaticAberrationProgram,
    chromaticAberrationPass;

  // Extension
  THREE.FancyTetrahedronGeometry = function ( radius, detail ) {
      var vertices = [ 0,  0,  0,   - 1, - 1,  1,   - 2,  1, - 1,    3, - 2, - 1];
      var indices = [ 2,  1,  0,    0,  3,  2,  1,  3,  0,    2,  3,  1];
      THREE.PolyhedronGeometry.call( this, vertices, indices, radius, detail );
  };
  THREE.FancyTetrahedronGeometry.prototype = Object.create( THREE.Geometry.prototype );

  function getShader(shaderId) {
    return document.getElementById(shaderId).textContent;
  }

  // Initialize pipeline
  function init() {
    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x1b1c1f /*0x18191d */ );

    // camera
    camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    camera.position.set(20, 20, 20);

    // controls
    controls = new THREE.OrbitControls(camera);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enabled = false;

    // picking
    mouse = new THREE.Vector2();
    raycaster = new THREE.Raycaster();

    // ambient light
    scene.add(new THREE.AmbientLight(0x333336));

    // directional light
    light = new THREE.DirectionalLight(0x9090a2);
    light.position.set(20, 20, 30);
    scene.add(light);

    initGeometry();

    document.body.appendChild(renderer.domElement);
    addComposer();
  }

  // Initialize geometry
  function initGeometry() {
    const cubeGeometry = new THREE.BoxGeometry(10, 10, 10);
    const pyramidGeometry = new THREE.FancyTetrahedronGeometry(4, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x222225, // 0x555558,
      metalness: 0.05
    });
    cubeMesh = new THREE.Mesh(cubeGeometry, material);
    pyramidMesh = new THREE.Mesh(pyramidGeometry, material);
    cubeMesh.position.set(0,0,0);
    pyramidMesh.position.set(0,0,0);
    pyramidMesh.visible = false;
    scene.add(cubeMesh);
    scene.add(pyramidMesh);
  }

  function animate() {
    const time = performance.now() * 0.0001;

    switch(key) {
      case 'toPrism':
        TweenLite.to(
          cubeMesh.rotation,
          2,
          {
            x: Math.PI * 3,
            y: -Math.PI * 0.25,
            z: Math.PI * 2 /* ,
            ease: Power4.easeIn */
          }
        );
        TweenLite.to(
          pyramidMesh.rotation,
          1.2,
          {
            x: Math.PI * 6,
            y: -Math.PI * 6,
            z: Math.PI * 6
          }
        );
        TweenLite.to(
          pyramidMesh.scale,
          1.5,
          {
            x: 3.5,
            y: 3.5,
            z: 3.5 /* ,
            ease: Power4.easeIn */
          },
        );
        TweenLite.to(
          cubeMesh.scale,
          1,
          {
            x: 0.4,
            y: 0.4,
            z: 0.4,
          }
        );
        setTimeout(() => {
          pyramidMesh.visible = true;
          cubeMesh.visible = false;
          controls.enabled = true;
        }, 500);
        break;
      default:
        break;
    }

    chromaticAberrationPass.uniforms["time"].value = Math.cos(time*10);
    requestAnimationFrame(animate);
    composer.render(time);
  }

  // Add postprocessing composer
  function addComposer() {
    //composer
    composer = new THREE.EffectComposer(renderer);

    //passes
    renderPass = new THREE.RenderPass(scene, camera);

    chromaticAberrationProgram = {
      uniforms: {
        tDiffuse: { type: "t", value: null },
        resolution: {
          value: new THREE.Vector2(
            window.innerWidth * window.devicePixelRatio,
            window.innerHeight * window.devicePixelRatio
          )
        },
        time: { value: 0.005 },
        power: { value: 0.5 }
      },

      vertexShader: getShader('vertexPlain'),
      fragmentShader: getShader('postFilter')
    };
    chromaticAberrationPass = new THREE.ShaderPass(chromaticAberrationProgram);

    bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.85
    );
    bloomPass.threshold = 0;
    bloomPass.strength = 0.6;
    bloomPass.radius = 0;

    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(chromaticAberrationPass);
    chromaticAberrationPass.renderToScreen = true;
  }

  // Handle resize
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    chromaticAberrationPass.uniforms["resolution"].value = new THREE.Vector2(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    );

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function mouseIntersects() {
    const intersects = raycaster.intersectObjects(scene.children, false);
    raycaster.setFromCamera(mouse, camera);

    return intersects;
  }

  // Handle mouse movement/picking
  function onMouseMove(event) {
    event.preventDefault();
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    const objectsHovered = mouseIntersects();

    // Indicate an object is picked
    if (objectsHovered.length > 0) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'auto';
    }
  }

  function onMouseDown(even) {
    event.preventDefault();
    const objectsPicked = mouseIntersects();

    if (objectsPicked.length > 0) {
      key = 'toPrism';
    }
  }

  // Register listeners
  window.addEventListener('resize', onResize, false);
  document.addEventListener('mousemove', onMouseMove, false);
  document.addEventListener('mousedown', onMouseDown, false);

  init();
  animate();
})();
