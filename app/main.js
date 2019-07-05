'use strict';

(function () {
  // https://tc39.github.io/ecma262/#sec-array.prototype.find
  if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
      value: function (predicate) {
        // 1. Let O be ? ToObject(this value).
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }

        var o = Object(this);

        // 2. Let len be ? ToLength(? Get(O, "length")).
        var len = o.length >>> 0;

        // 3. If IsCallable(predicate) is false, throw a TypeError exception.
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }

        // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
        var thisArg = arguments[1];

        // 5. Let k be 0.
        var k = 0;

        // 6. Repeat, while k < len
        while (k < len) {
          // a. Let Pk be ! ToString(k).
          // b. Let kValue be ? Get(O, Pk).
          // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
          // d. If testResult is true, return kValue.
          var kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return kValue;
          }
          // e. Increase k by 1.
          k++;
        }

        // 7. Return undefined.
        return undefined;
      },
      configurable: true,
      writable: true
    });
  }

  // Configuration
  const payload = [
    {
      title: 'Google',
      subtitle: 'Search engine',
      link: 'https://www.google.com'
    },
    {
      title: 'Bing',
      subtitle: 'Search engine',
      link: 'https://www.bing.com'
    },
    {
      title: 'Amazon',
      subtitle: 'Electronic store',
      link: 'https://www.amazon.com'
    }
  ];

  const fontStyle = {
    font: 'Verdana, sans-serif',
    color: '#777777',
  };


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
    randomSeed = 0,
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

    // scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1b1c1f /*0x18191d */);

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

    const pointGeometry = new THREE.ConeGeometry(4, 2, payload.length);

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

    cubeMesh.position.set(0, 0, -4);
    cubeMesh.rotation.set(0.6, -0.3, 0);

    pyramidMesh.position.set(0, -2, -4);
    pyramidMesh.visible = false;

    wirePyramidMesh.position.set(0, -2, -4);
    wirePyramidMesh.scale.set(1.1, 1.1, 1.1);
    wirePyramidMesh.visible = false;

    pointPyramidMesh.position.set(0, -2, -4);
    pointPyramidMesh.scale.set(1.1, 1.1, 1.1);
    pointPyramidMesh.visible = false;

    scene.add(cubeMesh);
    scene.add(pyramidMesh);
    scene.add(wirePyramidMesh);
    scene.add(pointPyramidMesh);

    let i;
    for (i = 0; i < labelSprites.length; i++) {
      labelSprites[i].scale.set(12.0, 12.0, 12.0);
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

            let i = 0;
            for (; i < shaderRefs.length; i++) {
              shaderRefs[i].uniforms.scramblerActive.value = scramblerEnabled;
            }
          },
          0.7);
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
              controls.enabled = true;
              key = 'idle';

              let i;
              const vertices = pointPyramidMesh.geometry.vertices;
              let vertex;

              for (i = 0; i < labelSprites.length; i++) {
                vertex = vertices[i + 1].clone();
                vertex = new THREE.Vector3(vertex.x * 1.2, vertex.y * 1.2, vertex.z * 1.2);
                vertex.applyMatrix4(pointPyramidMesh.matrix);
                labelSprites[i].visible = true;
                labelSprites[i].position.set(vertex.x, vertex.y, vertex.z);
              }
            }
          );
        let i = 0;
        for (; i < shaderRefs.length; i++) {
          shaderRefs[i].uniforms.intensity.value = animController.foldIntensity;
        }
      default:
        break;
    }

    if (scramblerEnabled) {
      let i = 0;
      for (; i < shaderRefs.length; i++) {
        shaderRefs[i].uniforms.factor.value = randomSeed;
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
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    const objectsHovered = mouseIntersects();

    // Indicate an object is picked
    if (objectsHovered.length > 0) {
      let i = 0;
      for (; i < objectsHovered.length; i++) {
        if (objectsHovered[i].object.type === 'Sprite') {
          // console.log('sprite hovered');
          document.body.style.cursor = 'pointer';
        }
      }
      // document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'auto';
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
