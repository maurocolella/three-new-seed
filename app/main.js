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
    wirePyramidMesh,
    pointPyramidMesh,
    light,
    mouse,
    raycaster,
    key,
	shaderRefs,
    scramblerEnabled = 1,
	randomSeed = 0;
    
  let tessellateModifier = new THREE.TessellateModifier( 1 );

  // Shaders
  let bloomPass,
    chromaticAberrationProgram,
    chromaticAberrationPass;

  function getShader(shaderId) {
    return document.getElementById(shaderId).textContent;
  }

  // ********************** Initialization ****************

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
    camera.position.set(0, 0, 40);

    // controls
    controls = new THREE.OrbitControls(camera);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enabled = false;
    controls.rotateSpeed = 0.18;
	// controls.target = new THREE.Vector3(0, 0, 8);
	
	controls.minAzimuthAngle = -Math.PI / 2; // radians
	controls.maxAzimuthAngle = Math.PI / 2; // radians

    // Remove default OrbitControls event listeners
    controls.dispose();
    controls.update();

    // picking
    mouse = new THREE.Vector2();
    raycaster = new THREE.Raycaster();

    // ambient light
    scene.add(new THREE.AmbientLight(0x444446));

    // directional light
    light = new THREE.DirectionalLight(0x9090a2);
    light.position.copy(camera.position);
    scene.add(light);
	
	shaderRefs = [];

    initGeometry();

    document.body.appendChild(renderer.domElement);
    addComposer();
  }

  function augmentShader( shader ) {
	shader.uniforms.time = { value: 0 };
	shader.uniforms.scramblerActive = { value: 0 };
	shader.vertexShader = shader.vertexShader.replace(
	  '#include <common>',
	  '#include <common>' + getShader('seededNoise')
	)
	shader.vertexShader = shader.vertexShader.replace(
	  '#include <begin_vertex>',
	  getShader('vertexScrambler')
	);
	
	shaderRefs.push(shader);
  };

  // Initialize geometry
  function initGeometry() {
    const cubeGeometry = new THREE.BoxGeometry(10, 10, 10);
    
	const pyramidGeometry = new THREE.ConeGeometry(4, 2, 3); // new THREE.FancyTetrahedronGeometry(4, 0);
    const edges = new THREE.EdgesGeometry( pyramidGeometry );
	tessellateModifier.modify(pyramidGeometry);
    
	const pointGeometry = new THREE.ConeGeometry(4, 2, 3);
	
    const material = new THREE.MeshLambertMaterial({
      color: 0x222225, // 0x555558,
    });
    material.onBeforeCompile = augmentShader;

    const lineMaterial = new THREE.MeshBasicMaterial({
      color: 0x272726,
      wireframeLinewidth: 20,
      wireframe: true,
    });
    lineMaterial.onBeforeCompile = augmentShader;

    const pointMaterial = new THREE.PointsMaterial({
      color: 0x444446,
      size: 0.5
    });
    pointMaterial.onBeforeCompile = augmentShader;

    cubeMesh = new THREE.Mesh(cubeGeometry, material);
    pyramidMesh = new THREE.Mesh(pyramidGeometry, material);
    wirePyramidMesh = new THREE.Mesh(edges, lineMaterial);
    pointPyramidMesh = new THREE.Points(pointGeometry, pointMaterial);

    cubeMesh.position.set(0,0,0);
    cubeMesh.rotation.set(0.6,-0.3,0);

    pyramidMesh.position.set(0,-2,0);
    pyramidMesh.visible = false;

    wirePyramidMesh.position.set(0,-2,0);
    wirePyramidMesh.scale.set(1.1, 1.1, 1.1);
    wirePyramidMesh.visible = false;

    pointPyramidMesh.position.set(0,-2,0);
    pointPyramidMesh.scale.set(1.1, 1.1, 1.1);
    pointPyramidMesh.visible = false;

    scene.add(cubeMesh);
    scene.add(pyramidMesh);
    scene.add(wirePyramidMesh);
    scene.add(pointPyramidMesh);
  }

  // ********************** Animation *********************

  function animate() {
    const time = performance.now() * 0.0001;
	const span = time * 1000 % 300;
	if (span < 70 && span % 10 < 1) {
		randomSeed = Math.random();
	}
	
	const prismRotation = 
          {
            x: Math.PI * 6.4,
            y: -Math.PI * 8.1,
            z: Math.PI * 4
          };

    switch(key) {
      case 'toPrism':
        // Animate cube
        (new TimelineLite())
        .to(
          cubeMesh.rotation,
          2,
          {
            x: Math.PI * 5,
            y: -Math.PI * 0.25,
            z: Math.PI * 2 /* ,
            ease: Power4.easeIn */
          }
        ).to(
          cubeMesh.scale,
          1,
          {
            x: 0.4,
            y: 0.4,
            z: 0.4,
          },
          0
        );

        // Animate prism
        (new TimelineLite()).to(
          pyramidMesh.rotation,
          1.2,
          prismRotation
        ).to(
          pyramidMesh.scale,
          1.5,
          {
            x: 3.5,
            y: 3.5,
            z: 3.5 /* ,
            ease: Power4.easeIn */
          },
          0
        );

        // Animate wire prism
        (new TimelineLite()).to(
          wirePyramidMesh.rotation,
          1.2,
          prismRotation
        ).to(
          wirePyramidMesh.scale,
          1.5,
          {
            x: 3.85,
            y: 3.85,
            z: 3.85 /* ,
            ease: Power4.easeIn */
          },
          0
        );

        // Animate point prism
        (new TimelineLite()).to(
          pointPyramidMesh.rotation,
          1.2,
		  prismRotation
        ).to(
          pointPyramidMesh.scale,
          1.5,
          {
            x: 3.85,
            y: 3.85,
            z: 3.85 /* ,
            ease: Power4.easeIn */
          },
          0
        ).add(
          () => {
            pyramidMesh.visible = true;
            wirePyramidMesh.visible = true;
            pointPyramidMesh.visible = true;
            cubeMesh.visible = false;
            controls.enabled = true;
			// controls.autoRotate = true;

			let i = 0;
			for(;i<shaderRefs.length;i++){
				shaderRefs[i].uniforms.scramblerActive.value = scramblerEnabled;
			}
          },
        0.7);


        break;
      default:
        break;
    }

	if (scramblerEnabled) {
		let i = 0;
		for(;i<shaderRefs.length;i++){
			shaderRefs[i].uniforms.time.value = randomSeed;
		}
	}
    chromaticAberrationPass.uniforms["time"].value = Math.cos(time*10);
    light.position.copy(camera.position);
	controls.update();
    requestAnimationFrame(animate);
    composer.render(time);
  }

  // ********************** Postprocessing ****************

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

  // ********************** Events / Picking **************

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
    if (controls.enabled) {
      controls.handleMouseMoveRotate(event);
    }

    // Object picking
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

  function onMouseDown(event) {
    event.preventDefault();
    const objectsPicked = mouseIntersects();

    if (objectsPicked.length > 0) {
      key = 'toPrism';
    }
  }
  
  function onKeyUp(event) {
	if(event.keyCode == 32){
        //your code
        scramblerEnabled = scramblerEnabled === 0 ? 1 : 0;
    }
  }

  // Register listeners
  window.addEventListener('resize', onResize, false);
  document.addEventListener('mousemove', onMouseMove, false);
  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('keyup', onKeyUp, false);

  init();
  animate();
})();
