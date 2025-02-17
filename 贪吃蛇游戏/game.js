class SnakeGame {
    constructor(canvasId) {
        // 初始化游戏配置
        this.config = {
            GRID_SIZE: 20,
            CELL_SIZE: 20,
            SPEEDS: {
                easy: 150,
                medium: 100,
                hard: 70
            },
            COLOR_SCHEME: {
                head: {
                    fill: '#2E7D32',  // 更深的绿色
                    stroke: '#1B5E20',
                    gradient: ['#4CAF50', '#2E7D32']  // 添加渐变效果
                },
                body: {
                    fill: '#43A047',
                    stroke: '#2E7D32',
                    gradient: ['#66BB6A', '#43A047']
                },
                food: {
                    fill: '#E53935',
                    stroke: '#C62828',
                    glow: '#FFCDD2'
                },
                background: '#FFFFFF',  // 更纯净的白色背景
                grid: 'rgba(0,0,0,0.03)',  // 更淡的网格线
                pattern: '#F5F5F5'  // 更淡的图案颜色
            },
            FPS: 60,  // 目标帧率
            FRAME_TIME: 1000 / 60,  // 每帧时间
        };

        // 初始化画布
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.config.GRID_SIZE * this.config.CELL_SIZE;
        this.canvas.height = this.config.GRID_SIZE * this.config.CELL_SIZE;

        // 初始化游戏状态
        this.state = {
            snake: [{x: 10, y: 10}],
            direction: 'right',
            nextDirection: 'right',
            food: null,
            score: 0,
            gameSpeed: this.config.SPEEDS.easy
        };

        this.isRunning = false;
        this.isPaused = false;
        this.gameLoop = null;

        // 添加时间控制相关属性
        this.lastFrameTime = 0;
        this.lastUpdateTime = 0;
        this.accumulator = 0;

        // 绑定事件
        this.bindControls();
        this.bindUI();
        
        // 生成第一个食物
        this.generateFood();
    }

    bindControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.isRunning || this.isPaused) return;

            const key = e.key.toLowerCase();
            const directionMap = {
                'arrowup': 'up',
                'arrowdown': 'down',
                'arrowleft': 'left',
                'arrowright': 'right',
                'w': 'up',
                's': 'down',
                'a': 'left',
                'd': 'right'
            };

            const newDirection = directionMap[key];
            if (newDirection && this.isValidDirection(newDirection)) {
                e.preventDefault();
                this.state.nextDirection = newDirection;
            }
        });
    }

    bindUI() {
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.state.gameSpeed = this.config.SPEEDS[e.target.value];
            if (this.isRunning) {
                this.restart();
            }
        });
    }

    isValidDirection(newDirection) {
        const opposites = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };
        
        return opposites[newDirection] !== this.state.direction;
    }

    update() {
        if (!this.isRunning || this.isPaused) return;

        const head = {...this.state.snake[0]};
        
        this.state.direction = this.state.nextDirection;
        
        switch(this.state.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // 移除穿墙逻辑，恢复边界碰撞检测
        if (this.checkCollision(head)) {
            this.gameOver();
            return;
        }

        this.state.snake.unshift(head);
        
        if (head.x === this.state.food.x && head.y === this.state.food.y) {
            this.eatFood();
        } else {
            this.state.snake.pop();
        }
    }

    checkCollision(position) {
        // 1. 首先检查边界碰撞（更快的运算）
        if (position.x < 0 || position.x >= this.config.GRID_SIZE || 
            position.y < 0 || position.y >= this.config.GRID_SIZE) {
            return true;
        }
        
        // 2. 然后检查自身碰撞
        // 只检查蛇身（从第二个节点开始）
        for (let i = 1; i < this.state.snake.length; i++) {
            const segment = this.state.snake[i];
            if (segment.x === position.x && segment.y === position.y) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 生成食物的位置
     * 该函数确保食物出现在网格中随机且不与蛇身体重叠的位置
     */
    generateFood() {
        let position;
        // 循环直到找到一个不与蛇身体重叠的位置
        do {
            position = {
                x: Math.floor(Math.random() * this.config.GRID_SIZE),
                y: Math.floor(Math.random() * this.config.GRID_SIZE)
            };
        } while (this.state.snake.some(segment => 
            segment.x === position.x && segment.y === position.y
        ));
        
        // 更新食物的位置
        this.state.food = position;
    }

    eatFood() {
        this.state.score += 10;
        document.getElementById('score').textContent = this.state.score;
        this.generateFood();
    }

    render() {
        // 使用离屏渲染
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = this.canvas.width;
        offscreenCanvas.height = this.canvas.height;
        const offscreenCtx = offscreenCanvas.getContext('2d');

        // 将渲染上下文临时替换为离屏画布
        const mainCtx = this.ctx;
        this.ctx = offscreenCtx;

        // 清空画布
        this.ctx.fillStyle = this.config.COLOR_SCHEME.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制所有元素
        this.drawBackground();
        this.drawGrid();
        this.drawFood();
        this.drawSnake();

        // 恢复主渲染上下文
        this.ctx = mainCtx;

        // 将离屏画布内容一次性绘制到主画布
        this.ctx.drawImage(offscreenCanvas, 0, 0);
    }

    drawBackground() {
        // 缓存背景图案
        if (!this.backgroundPattern) {
            const patternCanvas = this.createPatternCanvas();
            this.backgroundPattern = this.ctx.createPattern(patternCanvas, 'repeat');
        }
        
        this.ctx.fillStyle = this.backgroundPattern;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    createPatternCanvas() {
        const patternCanvas = document.createElement('canvas');
        const patternCtx = patternCanvas.getContext('2d');
        const size = this.config.CELL_SIZE;
        
        patternCanvas.width = size * 2;
        patternCanvas.height = size * 2;
        
        // 填充基础颜色
        patternCtx.fillStyle = this.config.COLOR_SCHEME.background;
        patternCtx.fillRect(0, 0, size * 2, size * 2);
        
        // 绘制图案
        patternCtx.fillStyle = this.config.COLOR_SCHEME.pattern;
        patternCtx.fillRect(0, 0, size, size);
        patternCtx.fillRect(size, size, size, size);
        
        return patternCanvas;
    }

    drawGrid() {
        // 缓存网格
        if (!this.gridCanvas) {
            this.gridCanvas = document.createElement('canvas');
            this.gridCanvas.width = this.canvas.width;
            this.gridCanvas.height = this.canvas.height;
            const gridCtx = this.gridCanvas.getContext('2d');
            
            // 绘制主网格
            gridCtx.strokeStyle = this.config.COLOR_SCHEME.grid;
            gridCtx.lineWidth = 0.5;
            
            for (let i = 0; i <= this.config.GRID_SIZE; i++) {
                const pos = i * this.config.CELL_SIZE;
                
                gridCtx.beginPath();
                gridCtx.moveTo(pos, 0);
                gridCtx.lineTo(pos, this.canvas.height);
                gridCtx.stroke();
                
                gridCtx.beginPath();
                gridCtx.moveTo(0, pos);
                gridCtx.lineTo(this.canvas.width, pos);
                gridCtx.stroke();
            }

            // 添加网格装饰点
            gridCtx.fillStyle = 'rgba(0,0,0,0.05)';
            for (let x = 0; x <= this.config.GRID_SIZE; x++) {
                for (let y = 0; y <= this.config.GRID_SIZE; y++) {
                    gridCtx.beginPath();
                    gridCtx.arc(
                        x * this.config.CELL_SIZE, 
                        y * this.config.CELL_SIZE, 
                        1, 0, Math.PI * 2
                    );
                    gridCtx.fill();
                }
            }
        }
        
        this.ctx.drawImage(this.gridCanvas, 0, 0);
    }

    drawSnake() {
        // 先绘制身体
        this.state.snake.slice(1).forEach(segment => {
            const x = segment.x * this.config.CELL_SIZE;
            const y = segment.y * this.config.CELL_SIZE;
            this.drawSnakeSegment(x, y, this.config.COLOR_SCHEME.body);
        });

        // 最后绘制头部
        const head = this.state.snake[0];
        const headX = head.x * this.config.CELL_SIZE;
        const headY = head.y * this.config.CELL_SIZE;
        this.drawSnakeSegment(headX, headY, this.config.COLOR_SCHEME.head);
        this.drawSnakeEyes(headX, headY);
    }

    drawSnakeSegment(x, y, colors) {
        const size = this.config.CELL_SIZE - 2;
        const radius = size / 3;  // 更圆润的边角
        
        // 创建渐变
        const gradient = this.ctx.createLinearGradient(x, y, x + size, y + size);
        gradient.addColorStop(0, colors.gradient[0]);
        gradient.addColorStop(1, colors.gradient[1]);

        // 添加阴影效果
        this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
        this.ctx.shadowBlur = 6;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 2;

        // 绘制主体
        this.ctx.fillStyle = gradient;
        this.ctx.strokeStyle = colors.stroke;
        this.ctx.lineWidth = 1.5;

        this.ctx.beginPath();
        this.ctx.roundRect(x + 1, y + 1, size, size, radius);
        this.ctx.fill();
        this.ctx.stroke();

        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // 添加光泽效果
        const shine = this.ctx.createLinearGradient(x + 2, y + 2, x + size/2, y + size/2);
        shine.addColorStop(0, 'rgba(255,255,255,0.4)');
        shine.addColorStop(1, 'rgba(255,255,255,0)');
        
        this.ctx.fillStyle = shine;
        this.ctx.beginPath();
        this.ctx.roundRect(x + 3, y + 3, size/2, size/2, radius/2);
        this.ctx.fill();
    }

    drawSnakeEyes(x, y) {
        const size = this.config.CELL_SIZE - 2;
        const eyeSize = 3.5;  // 稍微小一点的眼睛
        const eyeOffset = 6;
        
        // 根据方向确定眼睛位置
        let leftEye, rightEye;
        switch(this.state.direction) {
            case 'right':
                leftEye = {x: x + size - eyeOffset, y: y + eyeOffset};
                rightEye = {x: x + size - eyeOffset, y: y + size - eyeOffset};
                break;
            case 'left':
                leftEye = {x: x + eyeOffset, y: y + eyeOffset};
                rightEye = {x: x + eyeOffset, y: y + size - eyeOffset};
                break;
            case 'up':
                leftEye = {x: x + eyeOffset, y: y + eyeOffset};
                rightEye = {x: x + size - eyeOffset, y: y + eyeOffset};
                break;
            case 'down':
                leftEye = {x: x + eyeOffset, y: y + size - eyeOffset};
                rightEye = {x: x + size - eyeOffset, y: y + size - eyeOffset};
                break;
        }

        // 绘制眼睛外圈
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(leftEye.x, leftEye.y, eyeSize, 0, Math.PI * 2);
        this.ctx.arc(rightEye.x, rightEye.y, eyeSize, 0, Math.PI * 2);
        this.ctx.fill();

        // 添加眼睛高光
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(leftEye.x - 1, leftEye.y - 1, eyeSize/2, 0, Math.PI * 2);
        this.ctx.arc(rightEye.x - 1, rightEye.y - 1, eyeSize/2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawFood() {
        const x = this.state.food.x * this.config.CELL_SIZE;
        const y = this.state.food.y * this.config.CELL_SIZE;
        const size = this.config.CELL_SIZE - 2;

        // 添加光晕效果
        this.ctx.shadowColor = this.config.COLOR_SCHEME.food.glow;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // 绘制食物主体
        this.ctx.fillStyle = this.config.COLOR_SCHEME.food.fill;
        this.ctx.strokeStyle = this.config.COLOR_SCHEME.food.stroke;
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.arc(x + size/2 + 1, y + size/2 + 1, size/2 - 1, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;

        // 添加高光效果
        this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
        this.ctx.beginPath();
        this.ctx.arc(x + size/3 + 1, y + size/3 + 1, size/4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    start() {
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        
        this.lastFrameTime = performance.now();
        this.lastUpdateTime = this.lastFrameTime;
        this.accumulator = 0;
        
        this.gameLoop = requestAnimationFrame(this.loop.bind(this));
    }

    loop(currentTime) {
        if (!this.isRunning || this.isPaused) {
            this.lastFrameTime = currentTime;
            this.gameLoop = requestAnimationFrame(this.loop.bind(this));
            return;
        }

        // 计算时间增量
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        this.accumulator += deltaTime;

        // 固定时间步长更新
        const updateStep = this.state.gameSpeed;
        while (this.accumulator >= updateStep) {
            this.update();
            this.accumulator -= updateStep;
        }

        // 渲染
        this.render();

        // 继续循环
        this.gameLoop = requestAnimationFrame(this.loop.bind(this));
    }

    startGame() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            this.start();
            document.getElementById('startBtn').textContent = '重新开始';
        } else {
            this.restart();
        }
    }

    restart() {
        cancelAnimationFrame(this.gameLoop);
        this.state.snake = [{x: 10, y: 10}];
        this.state.direction = 'right';
        this.state.nextDirection = 'right';
        this.state.score = 0;
        document.getElementById('score').textContent = '0';
        this.generateFood();
        this.start();
    }

    togglePause() {
        if (!this.isRunning) return;
        
        if (this.isPaused) {
            this.isPaused = false;
            this.lastFrameTime = performance.now();
            document.getElementById('pauseBtn').textContent = '暂停';
        } else {
            this.isPaused = true;
            document.getElementById('pauseBtn').textContent = '继续';
        }
    }

    gameOver() {
        this.isRunning = false;
        cancelAnimationFrame(this.gameLoop);
        alert(`游戏结束！得分：${this.state.score}`);
        document.getElementById('startBtn').textContent = '开始游戏';
    }
} 