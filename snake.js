$(document).ready(function() {

  // Initialize Canvas
  var CANVAS = $("#canvas")[0];
  var CONTEXT = CANVAS.getContext("2d");
  var WIDTH = $("#canvas").width();
  var HEIGHT = $("#canvas").height();

  // Initialize Game Variables
  var SCORE;
  var BLOCK_SIZE = 20; // Size of the snake segments
  var TICK_RATE = 120; // How fast (in milliseconds) our game refreshes
  var TICK_RATE_MIN = 45; // The fastest speed we allow the game to run at
  var TICK_RATE_DECLINE = 3; // How much faster the game gets when we "eat"
  var TICK_LAST_TIMESTAMP;
  var DIRECTION = "right"; // Initial direction for the snake
  var DIRECTION_INTENT = "right";
  var GAME_STATE = "title";
  var NEW_HIGHSCORE = false; // Whether or not we've had a new highscore this play
  var GAMEOVER_MUSIC = false; // Whether or not we've played the gameover music this play

  // Initialize the high score in browser storage
  if (!localStorage.highScore) {
    localStorage.highScore = 0;
  }

  // Initialize Colors
  var color = {
    block: "#333333",
    bg: "#3C6C44",
    border: "#000000",
    score: "#FFFFFF",
    paused: "#FFFFFF",
    highScore: "#FFFFFF",
    newHighScore: "#CC0000",
    gameOver: "#000000",
    title: "#FFFFFF",
    subtitle: "#FFFFFF",
    loading: "#FFFFFF"
  }

  // Initialize Fonts
  var font = {
    score: "15px 'Press Start 2P'",
    paused: "40px 'Press Start 2P'",
    highScore: "15px 'Press Start 2P'",
    newHighScore: "15px 'Press Start 2P'",
    gameOver: "40px 'Press Start 2P'",
    title: "40px 'Press Start 2P'",
    subtitle: "15px 'Press Start 2P'",
    subsubtitle: "10px 'Press Start 2P'",
    loading: "25px"
  }
    // Initialize Sound Effects
    // // Made with http://www.bfxr.net/ unless specified
  var sfxFood = new Audio("res/food.wav");
  var sfxGameOver = new Audio("res/gameover.wav"); // CC0 from https://freesound.org/people/noirenex/sounds/159408/
  var sfxPause = new Audio("res/pause.wav");
  var sfxUnPause = new Audio("res/unpause.wav");

  // Initialize keyboard controls
  $(document).keydown(function(e) {

    // Start the game at the title screen if any key is pressed
    if (GAME_STATE == "title") {
      init();
      return true;
    }

    var key = e.which;

    if (key == "39") {
      directionSwitch('right');
    } else if (key == "37") {
      directionSwitch('left');
    } else if (key == "38") {
      directionSwitch('up')
    } else if (key == "40") {
      directionSwitch('down')
    } else if (key == "32" && (GAME_STATE == "play" || GAME_STATE == "pause")) {
      pause();
    } else if (key == "70") {
      toggleFullScreen();
    } else if (key == "82") {
      init();
    }

  });

  // Handle difficulty dropdown change
  $(".size").click(function() {
    setSize($(this).data('size'));
  })

  // Reset game on canvas click
  $("#canvas").click(function() {
    init();
  });

  var snakeFood = {
    // Spawn the food object for the first time or move it, effectively "spawning"
    // a new one
    spawn: function() {
      do {
        this.x = Math.round(Math.random() * (WIDTH - BLOCK_SIZE) / BLOCK_SIZE);
        this.y = Math.round(Math.random() * (HEIGHT - BLOCK_SIZE) / BLOCK_SIZE);
      } while (theSnake.in(this.x, this.y));
    },

    draw: function() {
      drawBlock(this.x, this.y);
    }
  }

  var theSnake = {
    // Initialize the snake for a new game
    spawn: function() {
      // Clear/Set Snake Data
      this.array = [];
      var LENGTH = 3;

      // Place the snake below the score readout and far enough out that it does
      // not trigger a wall detection and result in immediate game over
      for (var i = LENGTH - 1; i >= 0; i--) {
        this.array.push({
          x: i,
          y: 1
        });
      }
    },

    // Iterate the movement of the snake by one frame based on current direction
    move: function() {
      this.head = {};
      this.head.x = this.array[0].x;
      this.head.y = this.array[0].y;

      switch (DIRECTION_INTENT) {
        case "right":
          DIRECTION = "right";
          this.head.x++;
          break;
        case "left":
          DIRECTION = "left";
          this.head.x--;
          break;
        case "up":
          DIRECTION = "up";
          this.head.y--;
          break;
        case "down":
          DIRECTION = "down";
          this.head.y++;
          break;
      }
    },

    // Check if the snake head has hit a wall
    wallCheck: function() {
      if (this.head.x == -1 || this.head.y == -1 || this.head.x == WIDTH / BLOCK_SIZE || this.head.y == HEIGHT / BLOCK_SIZE) {
        return true;
      }

      return false;
    },

    // Check if the snake head has hit itself
    selfCheck: function() {
      return this.in(this.head.x, this.head.y);
    },

    // Check if the snake head has hit a food block
    foodCheck: function() {
      if (this.head.x == snakeFood.x && this.head.y == snakeFood.y) {
        // Increment Score
        SCORE++;

        // Play sfx
        sfxFood.play();

        // Increase game speed
        speedUp();

        // Create a new segment in front of the head rather than moving the head
        // to the new block
        var newBlock = {
          x: this.head.x,
          y: this.head.y
        };

        // Spawn a new food block
        snakeFood.spawn();

      } else {
        // I feel like maybe this section should be somewhere else? But that might
        // just be due to the name I gave the function.

        // Move the tail block to the head block
        var newBlock = this.array.pop();
        newBlock.x = this.head.x;
        newBlock.y = this.head.y;
      }

      // Execute the new block action we decided on above
      theSnake.array.unshift(newBlock);
    },

    // Draw the snake to the screen
    draw: function() {
      for (var i = 0; i < this.array.length; i++) {
        var coords = this.array[i];
        drawBlock(coords.x, coords.y);
      }
    },

    in: function(x, y) {
      for (var i = 0; i < theSnake.array.length; i++) {
        if (theSnake.array[i].x == x && theSnake.array[i].y == y) {
          return true;
        }
      }
      return false;
    }
  }

  // Draw a block (since everything but the score is made with blocks, we can
  // use this function for anything - snake segments, food, new things)
  function drawBlock(x, y) {
    CONTEXT.fillStyle = color.block;
    CONTEXT.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

    CONTEXT.strokeStyle = color.bg;
    CONTEXT.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  }

  function drawText(text, font, color, x, y, centered = false, stroke = false) {
    CONTEXT.font = font;
    CONTEXT.fillStyle = color;

    if (centered == true) {
      x = (CANVAS.width / 2) - (CONTEXT.measureText(text).width / 2) + x;
      y = (CANVAS.height / 2) - 50 + y;
    }

    if (stroke == true) {
      CONTEXT.strokeStyle = color;
      CONTEXT.strokeText(text, x, y);
    } else {
      CONTEXT.fillText(text, x, y);
    }
  }

  function setSize(mode) {
    switch (mode) {
      case "small":
        BLOCK_SIZE = 40;
        TICK_RATE = 180;
        TICK_RATE_MIN = 90;
        TICK_RATE_DECLINE = 1;
        break;
      case "large":
        BLOCK_SIZE = 10;
        TICK_RATE = 60;
        TICK_RATE_MIN = 30;
        TICK_RATE_DECLINE = 5;
        break;
      case "normal":
      default:
        BLOCK_SIZE = 20;
        TICK_RATE = 120;
        TICK_RATE_MIN = 45;
        TICK_RATE_DECLINE = 3;
        break;
    }
    init();
  }

  // Initialize the playable game loop
  function init() {
    GAME_STATE = "play";
    TICK_RATE = 120;
    TICK_LAST_TIMESTAMP = Date.now();
    DIRECTION = "right";
    DIRECTION_INTENT = "right";
    theSnake.spawn();
    snakeFood.spawn();
    SCORE = 0;
    NEW_HIGHSCORE = false;
    GAMEOVER_MUSIC = false;

    requestAnimationFrame(draw);
  }

  function mainLoop() {
    theSnake.move();

    // Check if the snake head has hit itself or a wall, issue game over if true
    if (theSnake.wallCheck() || theSnake.selfCheck()) {
      GAME_STATE = "gameover";
      return;
    }

    theSnake.foodCheck();

    TICK_LAST_TIMESTAMP = Date.now();
  }

  function directionSwitch(direction) {
    switch (direction) {
      case 'up':
        if (DIRECTION != 'down') {
          DIRECTION_INTENT = 'up';
        }
        break;
      case 'down':
        if (DIRECTION != 'up') {
          DIRECTION_INTENT = 'down';
        }
        break;
      case 'left':
        if (DIRECTION != 'right') {
          DIRECTION_INTENT = 'left';
        }
        break;
      case 'right':
        if (DIRECTION != 'left') {
          DIRECTION_INTENT = 'right';
        }
        break;
    }
  }

  // Switch game states between play and pause
  function pause() {
    switch (GAME_STATE) {
      case "play":
        GAME_STATE = "pause";
        sfxPause.play();
        break;
      case "pause":
        GAME_STATE = "play";
        sfxUnPause.play();
        break;
    }
  }

  // Display title
  function titleScreen() {
    CONTEXT.fillStyle = color.bg;
    CONTEXT.fillRect(0, 0, WIDTH, HEIGHT);
    CONTEXT.strokeStyle = color.border;
    CONTEXT.strokeRect(0, 0, WIDTH, HEIGHT);

    if(FONTS_LOADED == false) {
      drawText("Loading Resources...", font.loading, color.loading, 0, 0, true, true);
      requestAnimationFrame(titleScreen);
      return;
    }

    drawText("Snake!", font.title, color.title, 0, 0, true, true);
    drawText("It's not on a plane!", font.subtitle, color.subtitle, 0, 20, true);
    drawText("Press Any Key To Start", font.subsubtitle, color.subtitle, 0, 50, true);
  }

  // Display game over and handle highscore data
  function gameOver() {
    if (localStorage.highScore < SCORE) {
      localStorage.highScore = SCORE;
      NEW_HIGHSCORE = true;
    }

    if (GAMEOVER_MUSIC == false) {
      sfxGameOver.play();
      GAMEOVER_MUSIC = true;
    }

    drawText("Game Over", font.gameOver, color.gameOver, 0, 0, true);
    drawText("High Score: " + localStorage.highScore, font.highScore, color.highScore, 0, 20, true);
    if (NEW_HIGHSCORE == true) {
      drawText("New High Score!", font.newHighScore, color.newHighScore, 0, 40, true);
    }
  }

  // Increase the rate at which we draw frames until we hit the minimum speed
  function speedUp() {
    if (TICK_RATE > TICK_RATE_MIN) {
      TICK_RATE = TICK_RATE - TICK_RATE_DECLINE;
    } else {
      TICK_RATE = TICK_RATE_MIN;
    }
  }

  // Draw the frame
  function draw() {
    // Draw/Refresh the base canvas
    CONTEXT.fillStyle = color.bg;
    CONTEXT.fillRect(0, 0, WIDTH, HEIGHT);
    CONTEXT.strokeStyle = color.border;
    CONTEXT.strokeRect(0, 0, WIDTH, HEIGHT);

    theSnake.draw();
    snakeFood.draw();

    // If enough time has gone by to process another loop, do it.
    if (Date.now() - TICK_LAST_TIMESTAMP >= TICK_RATE) {
      switch (GAME_STATE) {
        case "play":
          mainLoop();
          break;
        case "pause":
          drawText("Paused", font.paused, color.paused, 0, 0, true);
          break;
        case "gameover":
          gameOver();
          break;
        case "title":
          titleScreen();
          break;
      }
    }

    var scoreText = "Score: " + SCORE;
    drawText(scoreText, font.score, color.score, 5, 20);

    requestAnimationFrame(draw);
  }

  // This API is SUPER underdeveloped, hence this massive compat function
  // From: https://www.thewebflash.com/toggling-fullscreen-mode-using-the-html5-fullscreen-api/
  function toggleFullScreen() {
    elem = document.getElementById("canvas");

    if (!document.fullscreenElement && !document.mozFullScreenElement &&
      !document.webkitFullscreenElement && !document.msFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  titleScreen();

})
