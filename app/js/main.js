import map from 'promise.map'

"use strict";

var SVG_NS = "http://www.w3.org/2000/svg";
var MAX_FLOWER_AGE = 50;
var MAX_GROWTH_TICKS = 15;
var BRANCH_COLOR = "rgb(101, 67, 33)";

// from http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
function shadeRGBColor(color, percent) {
  var f = color.split(","),
      t = percent < 0 ? 0 : 255,
      p = percent < 0 ? percent * -1 : percent,
      R = parseInt(f[0].slice(4)),
      G = parseInt(f[1]),
      B = parseInt(f[2]);
  return "rgb(" + (Math.round((t - R) * p) + R) + "," + (Math.round((t - G) * p) + G) + "," + (Math.round((t - B) * p) + B) + ")";
}

(function () {
  var maxDepth = 11,
      trunkWidth = 12;
  var branchShrinkage = 0.8;
  var maxAngleDelta = Math.PI / 2;
  var delay = 100;
  var svg = document.getElementById("svg");

  var scaleIncrement = 0.1;
  var flowerSize = 10.0;
  var dropIncrement = 2.0;
  var rotateIncrement = Math.PI * 2;

  var wind = 0;
  var windIncrement = 1;
  var maxWind = 2.0;

  var createFlower = function createFlower(_ref) {
    var x = _ref.x;
    var y = _ref.y;
    var idx = _ref.idx;

    var telomeres = MAX_FLOWER_AGE;
    var growthPhase = 0;
    var attached = true;
    var hangPhase = 1;
    var scale = 0.5;
    var rotation = 0;
    var element = document.createElementNS(SVG_NS, "use");
    element.setAttribute("href", "#flower");
    element.setAttribute("style", "z-index: -1");

    var flower = {
      idx: idx,

      grow: function grow() {
        growthPhase += 1;
        scale += scaleIncrement * Math.random();
      },
      drop: function drop() {
        y += dropIncrement * Math.random();
        x += dropIncrement * (Math.random() - 0.5) + wind;
        rotation += rotateIncrement * (Math.random() - 0.5);
      },
      transform: function transform() {
        var radius = scale * flowerSize / 2;
        element.setAttribute("transform", "translate(" + (x - radius) + "," + (y - radius) + ") scale(" + scale + ") rotate(" + rotation + ")");
      },
      step: function step() {
        if (y >= window.innerHeight - 2 * flowerSize) {
          telomeres -= 1;
        } else if (growthPhase >= MAX_GROWTH_TICKS) {
          if (attached) {
            attached = Math.random() < Math.pow(0.9999, hangPhase);
            hangPhase += 0.00001;
          } else {
            this.drop();
          }
        } else {
          this.grow();
        }

        this.transform();

        return telomeres;
      },
      delete: function _delete() {
        svg.removeChild(element);
      }
    };

    flower.transform();

    // pick a random branch so it looks like the flowers are falling through them
    var childNodes = svg.childNodes;

    var randomBranch = childNodes[Math.floor(Math.random() * childNodes.length)];
    svg.insertBefore(element, randomBranch);

    return flower;
  };

  var animateFlowers = function animateFlowers(branchEndings) {
    var branchesInUse = {};
    var flowers = [];

    var findFreeBranchIdx = function findFreeBranchIdx() {
      for (var i = 0; i < branchEndings.length; i++) {
        var idx = Math.floor(Math.random() * branchEndings.length);
        if (!branchesInUse[idx]) {
          branchesInUse[idx] = true;
          return idx;
        }
      }

      return -1;
    };

    var attachFlower = function attachFlower() {
      var idx = findFreeBranchIdx();
      if (idx >= 0) {
        var branch = branchEndings[idx];
        flowers.push(createFlower(Object.assign({}, branch, { idx: idx })));
      }
    };

    var tick = function tick() {
      flowers = flowers.reduce(function (acc, flower) {
        if (flower.step() > 0) {
          return acc.concat([flower]);
        } else {
          console.log("deleting flower", flower.idx);
          flower.delete();
          delete branchesInUse[flower.idx];
          return acc;
        }
      }, []);

      Array(5).fill().forEach(function () {
        if (Math.random() < 0.02) {
          attachFlower();
        }
      });

      if (Math.random() < 0.02) {
        wind = Math.min(maxWind, wind + (Math.random() * 2 - 1) * windIncrement);
        wind = Math.max(-maxWind, wind);
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  var wrap = function wrap(a) {
    return Array.isArray(a) ? a : [a];
  };
  var flatten = function flatten(a) {
    if (!Array.isArray(a)) {
      return a;
    }

    var left = a[0];
    var right = a[1];

    return wrap(left).concat(wrap(right));
  };

  var drawBranch = function drawBranch(x1, y1, length, angle, depth, branchWidth, branchColor) {
    var x2 = x1 + length * Math.cos(angle);
    var y2 = y1 + length * Math.sin(angle);

    var line = document.createElementNS(SVG_NS, "line");
    var style = "stroke:" + branchColor + ";stroke-width:" + branchWidth + ";z-index:1;";

    line.setAttribute("x1", x1);
    line.setAttribute("x2", x2);
    line.setAttribute("y1", y1);
    line.setAttribute("y2", y2);
    line.setAttribute("style", style);

    svg.appendChild(line);

    var newDepth = depth - 1;
    if (newDepth <= 0) {
      return Promise.resolve({ x: x2, y: y2 });
    }

    var newBranchWidth = branchWidth * branchShrinkage;
    var newBranchColor = shadeRGBColor(branchColor, 0.1);

    return map([-1, 1], function (direction) {
      var newAngle = angle + maxAngleDelta * (Math.random() * 0.5 * direction);
      var newLength = length * (branchShrinkage + Math.random() * (1.0 - branchShrinkage));

      return new Promise(function (resolve) {
        setTimeout(function () {
          return resolve(drawBranch(x2, y2, newLength, newAngle, newDepth, newBranchWidth, newBranchColor));
        }, delay);
      });
    }).then(flatten);
  };

  // returns a promise that resolves to an array of the positions of the branches
  var drawTree = function drawTree(maxDepth, trunkWidth) {
    return drawBranch(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 1.02), 60, -Math.PI / 2, maxDepth, trunkWidth, BRANCH_COLOR);
  };

  var init = function init() {
    svg.setAttribute("width", window.innerWidth);
    svg.setAttribute("height", window.innerHeight);
    drawTree(maxDepth, trunkWidth).then(animateFlowers);
  };

  init();
})();