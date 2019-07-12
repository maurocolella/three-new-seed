## Installation

This project is built using ES6/ES7. The source code is in `src/main.js`. Dependencies are included from the `libs` folder. Additional code (vertex and fragment shaders) is included in the `index.html` directly.

To build, make sure **nodejs** is installed in your environment, then from command line, run:
* `npm install`
* `npm run build`

Build files are published to the `dist` folder.

### Compatibility

Tested on *evergreen* browsers (Chrome, Firefox, Opera, Vivaldi, Edge latest) and Internet Explorer 11. The application requires an OpenGL-compatible environment.

### Configuration

The following options can be configured from a javascript object named **"threeSeedConfig"**:

* **payload** - this is the definition of points/link objects, with each a title, subtitle, link property. The script accepts any number of points.
* **fontStyle** - an object representing the font family and color for billboarded sprites. If using a Google font, the font must have been fully loaded before sprites are created.
* **backgroundImage** - URL of the background image.
* **color** - the object color. Accept any threejs supported notation, such as *#FF0000, 0xff0000, rgb(255,0,0)* or *red*.
* **bloomActive** - true or false (boolean). Enable or disable the bloom filter.
* **shape** - one of *cube, cone, cylinder, sphere, pyramid, torus, knot*. The shape of the initial primitive.
