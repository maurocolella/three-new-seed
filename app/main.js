'use strict';

(function(){
  let renderer,
    composer,
    renderPass,
    shaderPass,
    scene,
    camera,
    controls,
    mesh,
    light,
    mouse,
    raycaster,
    key;

  let bloomPass, chromaticAberration, chromaticAberrationPass;

  function init() {
    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x18191d );

    // camera
    camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    camera.position.set(30, 30, 30);

    // controls
    controls = new THREE.OrbitControls(camera);
    /* controls.enablePan = false;
    controls.enableZoom = false; */
    controls.enabled = false;

    // picking
    mouse = new THREE.Vector2();
    raycaster = new THREE.Raycaster();

    // ambient light
    scene.add(new THREE.AmbientLight(0x222226));

    // directional light
    light = new THREE.DirectionalLight(0x9090a2, 0.5);
    light.position.set(2, 40, 4);
    scene.add(light);

    const geometry = new THREE.BoxGeometry(10, 10, 10);
    const material = new THREE.MeshStandardMaterial({
      color: 0x99999d,
      metalness: 0.2
    });
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0,0,0);
    scene.add(mesh);

    document.body.appendChild(renderer.domElement);
    addComposer();
  }


  function animate() {
    const time = performance.now() * 0.0001;

    switch(key) {
      case 'toPrism':
        TweenLite.to(
          mesh.rotation,
          2,
          {
            x: Math.PI * 3,
            y: -Math.PI * 0.25,
            z: Math.PI * 2
          }
        );
        TweenLite.to(
          mesh.scale,
          1,
          {
            x: 0.4,
            y: 0.4,
            z: 0.4,
          }
        );
        setTimeout(() => { mesh.visible = false; }, 1000);
        break;
      default:
        break;
    }

    chromaticAberrationPass.uniforms["time"].value = Math.cos(time*10);
    requestAnimationFrame(animate);
    composer.render(time);
  }

  function addComposer() {
    //composer
    composer = new THREE.EffectComposer(renderer);

    //passes
    renderPass = new THREE.RenderPass(scene, camera);

    chromaticAberration = {
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

      vertexShader: `

          varying vec2 vUv;

          void main() {

            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

          }
          `,

      fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      uniform float time;

      float rand(vec2 co)
      {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
      // distance from center of image, used to adjust blur
        vec2 uv=(gl_FragCoord.xy/resolution.xy);
        float d = length(uv - vec2(0.5,0.5));

        float seed = 0.4;
        float noiseIntensity = 0.07;
        float randomValue = rand(gl_FragCoord.xy * seed * time);
        float noise = (randomValue - 0.5) * noiseIntensity;

        // blur amount
        float blur = 0.0;
        blur = (1.0 + sin(time * 6.0)) * 0.4;
        blur *= 1.0 + sin(time * 16.0) * 0.4;
        blur = pow(blur, 3.0);
        blur *= 0.05;
        // reduce blur towards center
        blur *= d;

        // final color
        vec3 col;
        col.r = texture2D( tDiffuse, vec2(uv.x+blur,uv.y) ).r;
        col.g = texture2D( tDiffuse, uv ).g;
        col.b = texture2D( tDiffuse, vec2(uv.x,uv.y-blur) ).b;

        // noise
        col.r += noise;
        col.g += noise;
        col.b += noise;

        gl_FragColor = vec4(col,1.0);
      }
        `
    };
    chromaticAberrationPass = new THREE.ShaderPass(chromaticAberration);

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

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    chromaticAberrationPass.uniforms["resolution"].value = new THREE.Vector2(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    );

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onMouseMove(event) {
    event.preventDefault();
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  }

  function onMouseDown(even) {
    event.preventDefault();

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, false);

    if (intersects.length > 0) {
        console.log('object clicked');
        key = 'toPrism';
    }
  }

  window.addEventListener('resize', onResize, false);
  document.addEventListener('mousemove', onMouseMove, false);
  document.addEventListener('mousedown', onMouseDown, false);

  init();
  animate();
})();
