const bodyParser = require('body-parser')
const express = require('express')
const logger = require('morgan')
const app = express()
const {
  fallbackHandler,
  notFoundHandler,
  genericErrorHandler,
  poweredByHandler
} = require('./handlers.js')

// For deployment to Heroku, the port needs to be set using ENV, so
// we check for the port number in process.env
app.set('port', (process.env.PORT || 9001))

app.enable('verbose errors')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(poweredByHandler)

// --- SNAKE LOGIC GOES BELOW THIS LINE ---

// Handle POST request to '/start'
app.post('/start', (request, response) => {
  // NOTE: Do something here to start the game

  // Response data
  const data = {
    "color": '#0F52BA',
    "headType": "bwc-snowman",
    "tailType": "bwc-bonhomme"
  }

  return response.json(data)
})

var moves = ["up", "left", "down", "right"] // Code depends on the order of array

function get_random_new_move(old_move) {
  var new_move = ""
  do {
    new_move = moves[Math.floor(Math.random() * 4)]
  } while (new_move == old_move)
  return new_move
}

function get_snake_orientation(req) {  
  var x_head = req.body.you.body[0].x
  var y_head = req.body.you.body[0].y
  var x_neck = req.body.you.body[1].x
  var y_neck = req.body.you.body[1].y

  if (x_head - x_neck > 0) {
    return "right"
  } else if (x_head - x_neck < 0) {
    return "left"
  } else if (y_head - y_neck > 0) {
    return "down"
  } else {
    return "up"
  }
}

function get_snake_reverse_orientation(req) {
  return moves[(moves.indexOf(get_snake_orientation(req)) + 2) % 4]
}

function shuffle_array(arr) {
  var i, j, temp
  for (i = arr.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1))
      temp = arr[i]
      arr[i] = arr[j]
      arr[j] = temp
  }
  return arr
}

function get_obstacles_coord(req) {
  var coord = []
  var snakes = req.body.board.snakes
  for (let snake of snakes) {
    var snake_body = snake.body
    for (var i = 0; i < snake_body.length - 1; i++) {
      coord.push([snake_body[i].x, snake_body[i].y])
    }
  }
  console.log(coord)
  return coord
}

function is_obstacle(future_pos, obstacles_coord) {
  for (let elem of obstacles_coord) {
    if (future_pos[0] == elem[0] && future_pos[1] == elem[1]) return true
  }
  return false
}

function is_legal_move(req, obstacles_coord, move) {
  var x_head = req.body.you.body[0].x
  var y_head = req.body.you.body[0].y
  var x_max = req.body.board.width - 1
  var y_max = req.body.board.height - 1
  var reversed_orientation = get_snake_reverse_orientation(req)

  // Make sure it doesn't eat itself, bump into walls, and collide with obstacles
  return !((reversed_orientation == move) ||
      (move == "up" && (y_head - 1 < 0 || is_obstacle([x_head, y_head - 1], obstacles_coord))) ||
      (move == "left" && (x_head - 1 < 0 || is_obstacle([x_head - 1, y_head], obstacles_coord))) ||
      (move == "down" && (y_head + 1 > y_max || is_obstacle([x_head, y_head + 1], obstacles_coord))) ||
      (move == "right" && (x_head + 1 > x_max || is_obstacle([x_head + 1, y_head], obstacles_coord))))
}

function get_best_move(req, obstacles_coord) {
  var move_rankings = shuffle_array(["up", "left", "down", "right"])
  move_rankings = move_rankings.map((move, index) => [move, index])
  move_rankings = move_rankings.filter(move => is_legal_move(req, obstacles_coord, move[0]))
  if (move_rankings.length == 0) return "up" // Doomed anyways
  


  move_rankings.sort((a, b) => a[1] - b[1])
  return move_rankings[0][0] // Best move
}

// Handle POST request to '/move'
app.post('/move', (req, res) => {
  // NOTE: Do something here to generate your move

  // Response data
  const data = {
    move: "up", // coordinate (0,0) is at the upper left corner
  }

  var obstacles_coord = get_obstacles_coord(req)

  data.move = get_best_move(req, obstacles_coord)

  return res.json(data)
})

app.post('/end', (request, response) => {
  // NOTE: Any cleanup when a game is complete.
  return response.json({})
})

app.post('/ping', (request, response) => {
  // Used for checking if this snake is still alive.
  return response.json({});
})

// --- SNAKE LOGIC GOES ABOVE THIS LINE ---

app.use('*', fallbackHandler)
app.use(notFoundHandler)
app.use(genericErrorHandler)

app.listen(app.get('port'), () => {
  console.log('Server listening on port %s', app.get('port'))
})
