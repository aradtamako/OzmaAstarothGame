const contextCreationConfig = {
  alpha: false,
  depth: false,
  antialias: true,
  premultipliedAlpha: true,
  stencil: true,
  preserveDrawingBuffer: false,
  failIfMajorPerformanceCaveat: false,
  powerPreference: 'default'
}
const gameCanvas = document.getElementById('game')
const gameContext = gameCanvas.getContext('webgl', contextCreationConfig)
const PortalFrameCount = 25
const AstarothFrameCount = 8
const Width = 700
const Height = 350
const DummyObjectPosition = { x: Width / 2, y: 330 }
const DummyObjectName = 'DummyObjectName'
let AstarothMoveSpeed = 1000
let AstarothPauseDelay = 1000
const PortalPositions = [
  { index: 0, name: 'left', x: 50, y: 300 },
  { index: 1, name: 'middle', x: 330, y: 80 },
  { index: 2, name: 'right', x: 650, y: 300 }
]

let routes = []
let lastRoute = null
let answer = 0

Object.defineProperty(Array.prototype, 'first', { value () { return this.find(x => true) } })

const config = {
  type: Phaser.WEBGL,
  canvas: gameCanvas,
  context: gameContext,
  width: Width,
  height: Height,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    },
  },
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  scene: { preload: preload, create: create, update: update }
}
const game = new Phaser.Game(config)

function preload () {
  this.load.image('map', 'img/map.png')

  for (let i = 0; i < PortalFrameCount; i++) {
    this.load.image(`portal${i}`, `img/portal/${i}.png`)
  }

  for (let i = 0; i < AstarothFrameCount; i++) {
    this.load.image(`astaroth${i}`, `img/astaroth/${i}.png`)
  }

  this.load.plugin('rexgrayscalepipelineplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexgrayscalepipelineplugin.min.js', true)
}

const shuffle = ([...array]) => {
  for (let i = 0; i < array.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array
}

function initializeRoutes () {
  const routePatterns = [
    [{ in: 0, out: 1 },{ in: 1, out: 2 },{ in: 2, out: 0 }],
    [{ in: 1, out: 0 },{ in: 2, out: 1 },{ in: 0, out: 2 }]
  ]
  routes = shuffle(routePatterns[Math.floor(Math.random() * routePatterns.length)])
  const lastIn = Math.floor(Math.random() * 2)
  lastRoute = { in: lastIn, out: null }
  answer = routes.find(x => x['in'] === lastIn)['out']
}

function spawnAstaroth (_this, x = 350, y = 250) {
  if (!_this.astaroth?.active) {
    // Spawn
    _this.astaroth = _this.physics.add.sprite(x, y, 'astaroth0').setScale(0.8).setBounce(1).play('astaroth')

    // Add overlap
    _this.physics.add.overlap(_this.astaroth, _this.portals, onOverlap, null, _this)
  }
}

function moveAstaroth (type, _this) {
  const direction = routes.first()[type]
  if (type === 'in') {
    _this.astaroth.flipX = (direction === 0)
    _this.physics.moveTo(_this.astaroth, PortalPositions[direction].x, PortalPositions[direction].y, AstarothMoveSpeed)
  } else {
    _this.astaroth.flipX = (direction === 2)
    _this.physics.moveTo(_this.astaroth, DummyObjectPosition.x, DummyObjectPosition.y, AstarothMoveSpeed)
  }
}

function onOverlap (a, g) {
  const diffX = a.x - g.x
  const diffY = a.y - g.y
  if (g.name !== this.ignorePortalName && ((diffX < 0 && diffX >= -50) || (diffY < 0 && diffY >= -50))) {
    if (g.name === DummyObjectName) {
      g.destroy()
      this.astaroth.setVelocity(0, 0)
    } else {
      a.destroy()
    }

    this.time.addEvent({
      callback: () => {
        let route = routes.first()
        if (route['in'] !== null) {
          route['in'] = null
          if (route['out'] !== null) {
            this.ignorePortalName = this.portals.getChildren()[route['out']].name

            // Set dummy object
            const obj = this.portals.create(DummyObjectPosition.x, DummyObjectPosition.y)
            obj.setScale(0.2, 0.2).refreshBody()
            obj.setVisible(false)
            obj.name = DummyObjectName

            const portalPosition = PortalPositions[route['out']]
            spawnAstaroth(this, portalPosition.x, portalPosition.y)
            moveAstaroth('out', this)
          } else {
            this.selectText.setVisible(true)
            for (const x of this.portalButtons) {
              x.setVisible(true)
            }
          }
        } else if (route['out'] !== null) {
          route['out'] = null
          routes.splice(0, 1)
          this.ignorePortalName = null

          if (routes.length > 0) {
            spawnAstaroth(this)
            moveAstaroth('in', this)
          } else {
            this.plugins.get('rexgrayscalepipelineplugin').add(this.map)
            routes.push(lastRoute)
            moveAstaroth('in', this)
          }
        }
      },
      callbackScope: this,
      delay: AstarothPauseDelay,
      loop: false
    })
  }
}

function changeVisible (items, visible) {
  for (const x of items) {
    x.setVisible(visible)
  }
}

function checkAnswer (_this, portalIndex) {
  alert((portalIndex === answer) ? 'Correct' : 'Incorrect')
  changeVisible([_this.selectText, ..._this.portalButtons], false)
  _this.plugins.get('rexgrayscalepipelineplugin').remove(_this.map)
  changeVisible([_this.easyButton, _this.mediumButton, _this.hardButton], true)
  spawnAstaroth(_this)
}

function onStartButtonClicked (_this, astarothMoveSpeed, astarothPauseDelay) {
  initializeRoutes()
  spawnAstaroth(_this)
  AstarothMoveSpeed = astarothMoveSpeed
  AstarothPauseDelay = astarothPauseDelay

  moveAstaroth('in', _this)
  changeVisible([_this.easyButton, _this.mediumButton, _this.hardButton], false)
}

function create () {
  this.map = this.add.image(700 / 2, 350 / 2, 'map')

  const portalFrames = Array.from(Array(PortalFrameCount - 1).keys()).map(x => { return { key: `portal${x}` } })
  this.anims.create({
    key: 'portal',
    frames: portalFrames,
    frameRate: 10,
    repeat: -1
  })

  const astarothFrames = Array.from(Array(AstarothFrameCount - 1).keys()).map(x => { return { key: `astaroth${x}` } })
  this.anims.create({
    key: 'astaroth',
    frames: astarothFrames,
    frameRate: 5,
    repeat: -1
  })

  this.portals = this.physics.add.staticGroup()
  for (const portalPosition of PortalPositions) {
    const portal = this.portals.create(portalPosition.x, portalPosition.y, 'portal0').setScale(0.6, 0.6).refreshBody().play('portal')
    portal.name = portalPosition.name
  }

  // https://ourcade.co/tools/phaser3-text-styler/
  this.selectText = this.add.text(70, 170, 'Select safe portal', {
    fontFamiliy: 'Amiri', fontSize: '50px', color: '#0808088A', stroke: '#00BFFF', strokeThickness: 3,
    shadow: { blur: 20, stroke: true }
  })
  this.selectText.setVisible(false)

  this.portalButtons = []
  for (const portalPosition of PortalPositions) {
    const portalButton = this.add.sprite(portalPosition.x, portalPosition.y, 'portal0').setScale(0.6, 0.6).play('portal')
    portalButton.setVisible(false)
    portalButton.setInteractive()
    portalButton.on('pointerdown', () => { checkAnswer(this, portalPosition.index) })

    this.portalButtons.push(portalButton)
  }

  // Start button
  // https://ourcade.co/tools/phaser3-text-styler/
  this.easyButton = this.add.text(120, 300, 'Easy', {
    fontFamiliy: 'Amiri', fontSize: '40px', color: '#0808088A', stroke: '#00BFFF', strokeThickness: 3,
    shadow: { blur: 20, stroke: true }
  })
  this.mediumButton = this.add.text(270, 300, 'Medium', {
    fontFamiliy: 'Amiri', fontSize: '40px', color: '#0808088A', stroke: '#00BFFF', strokeThickness: 3,
    shadow: { blur: 20, stroke: true }
  })
  this.hardButton = this.add.text(470, 300, 'Hard', {
    fontFamiliy: 'Amiri', fontSize: '40px', color: '#0808088A', stroke: '#00BFFF', strokeThickness: 3,
    shadow: { blur: 20, stroke: true }
  })

  spawnAstaroth(this)
  this.easyButton.setInteractive().on('pointerdown', () => { onStartButtonClicked(this, 100, 1000) })
  this.mediumButton.setInteractive().on('pointerdown', () => { onStartButtonClicked(this, 1000, 1000) })
  this.hardButton.setInteractive().on('pointerdown', () => { onStartButtonClicked(this, 2000, 1) })
}

function update () {
}