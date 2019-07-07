'use strict';

(function () {
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
    pointCloud,
    particleGeometry,
    light,
    mouse,
    raycaster,
    key,
    shaderRefs,
    scramblerEnabled = 1,
    randomSeed = 0,
    particlesCount = 60,
    animController = {
      foldIntensity: 2
    },
    labelSprites = payload.map(function (entry) { return renderText(entry.title, entry.subtitle, fontStyle); });

  let tessellateModifier = new THREE.TessellateModifier(1);

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
    // renderer.setClearColor( 0x000000, 0 );

    const loader = new THREE.TextureLoader();
    const bgTexture = loader.load(backgroundImage);

    // scene
    scene = new THREE.Scene();
    scene.background = bgTexture;

    // scene.background = new THREE.Color(0x18191c /* 0x1b1c1f /*0x18191d */);

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
    const ambientLight = new THREE.AmbientLight(0x444446);
    scene.add(ambientLight);

    // extra light
    const topLight = new THREE.DirectionalLight(0x444446, 4.0);
    topLight.position.set(8,20,10);
    scene.add(topLight);

    // camera light
    light = new THREE.DirectionalLight(0x909099, 4.0);
    light.position.copy(camera.position);
    scene.add(light);

    shaderRefs = [];
    initGeometry();

    document.body.appendChild(renderer.domElement);
    addComposer();
  }

  function augmentShader(shader) {
    shader.uniforms.intensity = { value: animController.foldIntensity };
    shader.uniforms.factor = { value: 0 };
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

  function renderText(text, subtext, style, textureSize = 512) {
    let canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;

    let context = canvas.getContext('2d');
    context.font = '52px ' + style.font;
    context.textBaseline = 'bottom';
    context.textAlign = 'center';
    context.fillStyle = style.color;
    context.fillText(text.toUpperCase(), textureSize / 2, textureSize / 2);

    context.font = '36px ' + style.font;
    context.textBaseline = 'top';
    context.fillText(subtext.toUpperCase(), textureSize / 2, textureSize / 2 + 10);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      fog: true,
      transparent: true,
      opacity: 0
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    context = null;
    canvas = null;
    sprite.name = text.toLowerCase();
    return sprite;
  }

  // Initialize geometry
  function initGeometry() {
    const cubeGeometry = new THREE.BoxGeometry(10, 10, 10);

    const pyramidGeometry = new THREE.ConeGeometry(4, 2, payload.length); // new THREE.FancyTetrahedronGeometry(4, 0);
    const edges = new THREE.EdgesGeometry(pyramidGeometry);
    tessellateModifier.modify(pyramidGeometry);
    tessellateModifier.modify(pyramidGeometry);

    const pointGeometry = new THREE.ConeGeometry(4, 2, payload.length);

    // Solid material
    const material = new THREE.MeshLambertMaterial({
      color: 0x222225 // 0x555558,
    });
    material.onBeforeCompile = augmentShader;

    // Wire material
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: 0x272726,
      wireframeLinewidth: 1,
      wireframe: true,
    });
    lineMaterial.onBeforeCompile = augmentShader;

    // Material for points
    const pointMaterial = new THREE.PointsMaterial({
      color: 0x444446,
      size: 0.5
    });
    pointMaterial.onBeforeCompile = augmentShader;

    // Material for particles
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xff6677,
      size: 0.5,
    });

    // Particles
    particleGeometry = new THREE.Geometry();
    let x, y, z, i;
    for (i = 0; i < pointGeometry.vertices.length * particlesCount; i++) {
      x = (Math.random() * 800) - 400;
      y = (Math.random() * 800) - 400;
      z = (Math.random() * 800) - 400;

      particleGeometry.vertices.push(new THREE.Vector3(x, y, z));
    }

    // Create meshes and solids
    cubeMesh = new THREE.Mesh(cubeGeometry, material);
    pyramidMesh = new THREE.Mesh(pyramidGeometry, material);
    wirePyramidMesh = new THREE.Mesh(edges, lineMaterial);
    pointPyramidMesh = new THREE.Points(pointGeometry, pointMaterial);
    pointCloud = new THREE.Points(particleGeometry, particleMaterial);
    pointCloud.visible = false;

    cubeMesh.rotation.set(0.6, -0.3, 0);
    cubeMesh.name = 'cube';

    pyramidMesh.visible = false;

    wirePyramidMesh.scale.set(1.1, 1.1, 1.1);
    wirePyramidMesh.visible = false;

    pointPyramidMesh.scale.set(1.1, 1.1, 1.1);
    pointPyramidMesh.visible = false;

    // Append to scene
    scene.add(cubeMesh);
    scene.add(pyramidMesh);
    scene.add(wirePyramidMesh);
    scene.add(pointPyramidMesh);
    scene.add(pointCloud);

    // Text labels
    for (i = 0; i < labelSprites.length; i++) {
      labelSprites[i].scale.set(12, 12, 12);
      labelSprites[i].visible = false;
      labelSprites[i].onBeforeRender = function (renderer) { renderer.clearDepth(); };
      scene.add(labelSprites[i]);
    }
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

    let i = 0; // Iteration control
    const vertices = pointPyramidMesh.geometry.vertices;
    let vertex;


    switch (key) {
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
            x: 3.2,
            y: 3.2,
            z: 3.2 /* ,
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
            x: 3.55,
            y: 3.55,
            z: 3.55 /* ,
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
            x: 3.55,
            y: 3.55,
            z: 3.55 /* ,
            ease: Power4.easeIn */
          },
          0
        ).add(
          function () {
            pyramidMesh.visible = true;
            wirePyramidMesh.visible = true;
            pointPyramidMesh.visible = true;
            cubeMesh.visible = false;
            controls.enabled = true;

            let i = 0;
            for (; i < shaderRefs.length; i++) {
              shaderRefs[i].uniforms.scramblerActive.value = scramblerEnabled;
            }
          },
          0.7,
        );
        break;
      case 'unfold':
        (new TimelineLite()).to(
          animController,
          1,
          {
            ease: Back.easeOut,
            foldIntensity: 0
          }
        )
          .add(
            function () {
              key = 'labels';
              pointCloud.visible = true;
            },
          );
        for (; i < shaderRefs.length; i++) {
          shaderRefs[i].uniforms.intensity.value = animController.foldIntensity;
        }
        break;
      case 'labels':
        let scaledVertex;

        // First pass, position labels
        for (i = 0; i < labelSprites.length; i++) {
          vertex = vertices[i + 1].clone();
          scaledVertex = new THREE.Vector3(vertex.x * 1.2, vertex.y * 1.2, vertex.z * 1.2);

          scaledVertex.applyMatrix4(pointPyramidMesh.matrix);

          labelSprites[i].visible = true;
          labelSprites[i].position.set(scaledVertex.x, scaledVertex.y, scaledVertex.z);
          if (labelSprites[i].material.opacity < 1) labelSprites[i].material.opacity += 0.1;
        }

        const acc = [];

        // Second pass, position particles
        for (i = 0; i < vertices.length; i++) {
          vertex = vertices[i].clone();
          vertex.applyMatrix4(pointPyramidMesh.matrix);

          let j;
          for (j = 0; j < particlesCount; j++) {
            const k = i * particlesCount + j;
            acc.push(k);
            const particleVertex = particleGeometry.vertices[k].clone();

            if (particleVertex.distanceTo(vertex) < 0.2) key = 'particles';

            particleGeometry.vertices[k] = new THREE.Vector3(
              (particleVertex.x * 4 + vertex.x) * 0.2,
              (particleVertex.y * 4 + vertex.y) * 0.2,
              (particleVertex.z * 4 + vertex.z) * 0.2,
            );
          }
        }
        acc.sort();
        particleGeometry.verticesNeedUpdate = true;
        break;
      default:
        break;
    }

    console.log(key);

    if (scramblerEnabled) {
      let i = 0;
      for (; i < shaderRefs.length; i++) {
        shaderRefs[i].uniforms.factor.value = randomSeed;
        // 0.014, 0.015, 0.016, 0.017, 0.026, 0.027, 0.028, 0.029, 0.030, 0.031,
        // 0.032, 0.033, 0.035, 0.037, 0.038, 0.039, 0.040, 0.041, 0.043, 0.044
        // 0.046, 0.047, 0.050, 0.051, 0.053, 0.054, 0.055, 0.056, 0.058, 0.059
      }
    }
    chromaticAberrationPass.uniforms["time"].value = Math.cos(time * 10);
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
      1.2,
      0.4,
      0.85
    );
    bloomPass.threshold = 0;
    bloomPass.strength = 0.6;
    bloomPass.radius = 0;

    composer.addPass(renderPass);
    // composer.addPass(bloomPass);
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
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    const objectsHovered = mouseIntersects();

    // Indicate an object is picked
    if (objectsHovered.length > 0) {
      let i = 0;
      for (; i < objectsHovered.length; i++) {
        const object = objectsHovered[i].object;
        if (object.type === 'Sprite' || object.name === 'cube') {
          document.body.style.cursor = 'pointer';
        }
      }
    } else {
      if (key === 'toPrism') {
        document.body.style.cursor = 'pointer';
      } else {
        document.body.style.cursor = 'auto';
      }
    }
  }

  function onMouseDown(event) {
    event.preventDefault();
    const objectsPicked = mouseIntersects();

    if (objectsPicked.length > 0) {
      if (!key) {
        key = 'toPrism';
      } else {
        key = 'unfold';
      }

      let i = 0;
      for (; i < objectsPicked.length; i++) {
        if (objectsPicked[i].object.type === 'Sprite') {
          const linkName = objectsPicked[i].object.name;
          const result = payload.find(function(item) { return item.title.toLowerCase() === linkName });
          window.open(result.link);
        }
      }
    }
  }

  function onKeyUp(event) {
    if (event.keyCode == 32) {
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
