import { _decorator, AudioSource, Component, director, instantiate, Label, Mask, Node, Prefab, resources, Sprite, SpriteFrame, tween, UIOpacity, UITransform, v3, Vec3 } from 'cc';
import { PuzzleSprite } from '../res/puzzle/script/PuzzleSprite';
import { events } from './base/BaseEnums';
import { Global } from './base/Global';
import { PuzzleSceneMgr } from './PuzzleSceneMgr';
import { MiniGameSdk } from './utils/MiniGameSdk';
import { XinUtil } from './utils/XinUtil';
const { ccclass, property } = _decorator;

export class PuzzleMgrDef {
    imgName: string;                // 图片名称
    existNum: number;               // 已存在的碎片数量 
    nowNum: number;                 // 当前获得的碎片
    rows: number;                   // 行数
    columns: number;                // 列数
}


@ccclass('PuzzleMgr')
export class PuzzleMgr extends Component {

    @property(Prefab)
    puzzlePrefab: Prefab = null;
    @property(Prefab)
    puzzleScenePrefab: Prefab = null;
    @property(Node)
    puzzleParent: Node = null;
    @property(Node)
    puzzleEnd: Node = null;
    @property(Node)
    pieceParent: Node = null;
    @property(Node)
    progressBar: Node = null;
    @property(Node)
    btnStart: Node = null;

    @property(PuzzleMgrDef)
    param: PuzzleMgrDef = null;

    /***************** 变量 ******************/
    m_sizeExpand = 0.6;     // 0.6是材质的Size Expand，需要保存一致

    m_pieceList = [];       // 碎片列表
    m_touchFlag = false;    // 触摸进行中标志
    m_touchEnd = true;      // 触摸结束标志，防止重复触发
    m_touchStartTime = null;


    start() {
        // 初始化已收集的拼图
        this.initPuzzle();
        this.initPiece();

        // 声明触摸时间变量
        this.m_touchFlag = false;
        this.m_touchStartTime = null;
        // 添加按钮触摸监听
        this.btnStart.on(Node.EventType.TOUCH_START, this.touchStart, this);
        this.btnStart.on(Node.EventType.TOUCH_END, this.touchEnd, this);

        console.log(this.puzzleParent.getComponent(UITransform).contentSize);

        /***************** 引导 ******************/
        if (Global.ins.lv <= 3) {
            XinUtil.Cc.getChildByName(this.node, "content/blockBg-001").active = true;
            XinUtil.Cc.getChildByName(this.node, "content/Mask").getComponent(Mask).enabled = true;
        }
    }

    update() {
        //判断是否检测按钮长按状态
        if (this.m_touchFlag) {
            this.touchHold();
        }
    }

    close() {
        this.node.destroy()
    }

    /***************** 按钮事件 ******************/
    // 下一关
    btnNextLv() {
        director.emit(events.VibrateShort);
        if (this.node.active) {
            director.emit(events.NextLv);
            this.close();
        }
    }
    
    // 收藏拼图/露营区
    btnShowFolder(event: Event, showAnim: boolean = false) {
        director.emit(events.VibrateShort);
        if (this.m_pieceList.length > 0) {
            director.emit(events.Tips, "需要先完成拼图");
            return;
        }

        const puzzleSceneNode = instantiate(this.puzzleScenePrefab)
        puzzleSceneNode.parent = this.node.parent

        const content: Node = puzzleSceneNode.getChildByName("content");
        content.scale = Vec3.ZERO;
        tween().target(content)
            .to(0.3, { scale: Vec3.ONE }, { easing: "quadOut" })
            .start();

        const puzzleSceneMgr = puzzleSceneNode.getComponent("PuzzleSceneMgr") as PuzzleSceneMgr;
        puzzleSceneMgr.showAnim = showAnim;
    }

    // 分享
    btnShare() {
        director.emit(events.VibrateShort);
        MiniGameSdk.shareAppMessage();
    }

    /***************** 拼图碎片逻辑 ******************/
    touchStart() {
        if (Global.ins.lv <= 3) {
            XinUtil.Cc.getChildByName(this.node, "content/blockBg-001").active = false;
            XinUtil.Cc.getChildByName(this.node, "content/Mask").getComponent(Mask).enabled = false;
        }
        if(!this.m_touchEnd){
            return;
        }
        //触摸开始 
        this.m_touchFlag = true;
        this.m_touchEnd = false;
        //记录下触摸开始时间
        this.m_touchStartTime = new Date();
        console.log("touchStart", this.m_touchStartTime);
    }

    touchEnd() {
        console.log("touchEnd", this.m_touchStartTime);
        this.m_touchFlag = false;
        let touchHoldTime = new Date();
        if (this.m_touchStartTime != null) {
            let milliseconds = touchHoldTime.getTime() - this.m_touchStartTime.getTime();
            // 单击事务逻辑
            if (milliseconds <= 300) {
                this.m_touchEnd = true;
                this.joinPuzzle();
            }
        }
    }


    //长按检测函数
    touchHold() {
        if (this.m_touchFlag && this.m_touchStartTime != null) {
            //判断按钮的按压时长
            let touchHoldTime = new Date();
            let milliseconds = touchHoldTime.getTime() - this.m_touchStartTime.getTime();
            if (milliseconds > 300) {
                this.m_touchFlag = false;
                console.log("long click");
                this.joinPuzzle(true);
            }
        }
    }

    // 触发拼图动作
    joinPuzzle(longClick: boolean = false) {
        const btnLabel = this.btnStart.getChildByName("Label").getComponent(Label);
       
        if (this.m_pieceList.length < 1) {
            if (btnLabel.string == "继续游戏") {
                if(!this.m_touchEnd){
                    // FIX：2025年1月6日22:22:43 拼图场景下，长按继续按钮后导致无法触发下一关
                    this.m_touchEnd = true;
                    this.m_touchFlag = false;
                    return;
                }
                console.log("继续游戏");
                this.btnNextLv();
            } else {
                btnLabel.string = "继续游戏"
                console.log("完成拼图");
                // 完成拼图
                if (this.param.existNum >= (this.param.rows * this.param.columns)) {
                    this.puzzleParent.removeAllChildren()
                    this.puzzleParent.getComponent(UIOpacity).opacity = 255;

                    const node = this.puzzleParent.parent.parent;
                  
                    /***************** 完成拼图，执行动画效果 ******************/
                    const thiz = this;
                    function end(){
                        thiz.puzzleEnd.active = true;
                        thiz.m_touchEnd = true;
                        const puzzleEndUi =  thiz.puzzleEnd.getComponent(UIOpacity);
                        tween().target(puzzleEndUi)
                            .to(0.5, { opacity: 255 }, { easing: "quadOut" })
                            .start();

                        const puzzleBgLight =  XinUtil.Cc.getChildByName(thiz.node, "content/Puzzle/PuzzleBgLight");
                        puzzleBgLight.active = true;
                        tween().target(puzzleBgLight.getComponent(UIOpacity))
                            .to(0.5, { opacity: 255 }, { easing: "quadOut" })
                            .start();

                        // 调整顺序
                        node.setSiblingIndex(999);
                    }

                    // 完成拼图，拼图往前移动
                    tween().target(node)
                        .delay(0.2)
                        .to(1, { scale: v3(1.1, 1.1, 0), position: v3(0, 50, 0) }, { easing: "quadOut" })
                        .call(end)
                        .start();
                }else{
                    this.m_touchEnd = true;
                }
            }
            return;
        }
        this.m_touchStartTime = null;
       
        if (!longClick) {
            // 短按触发
            this.movePiece(this.m_pieceList.pop());
        } else {
            // 长按触发
            this.movePiece(this.m_pieceList.pop());
            this.scheduleOnce(function () {
                this.joinPuzzle(true);
            }, 0.08);
            return;
        }
    }

    /***************** 拼图函数 ******************/

    /**
     * 将元素移动到指定位置，并启动动画。
     *
     * @param duration 动画持续时间，单位为秒。
     * @param target 目标位置对象，包含位置信息。
     * @param options 动画选项对象，可包含缓动函数等。
     */
    movePiece(item: any) {
        const node:Node = item[0];
        node.parent = this.puzzleParent;
        node.setPosition(v3(node.getPosition().x, node.getPosition().y - 450, 0));
        tween().target(node)
            .to(0.2, { position: v3(item[1].x, item[1].y) }, { easing: "quadOut" })
            .start();

        this.param.existNum++;
        this.initProgressBar();

        // 选牌震动
        director.emit(events.VibrateShort);
    }

    /**
     * 初始化进度条
     */
    initProgressBar() {
        const fill = this.progressBar.getChildByName("bg").getChildByName("fill");
        let fillRange = parseFloat((this.param.existNum / (this.param.rows * this.param.columns)).toFixed(4));
        fill.getComponent(Sprite).fillRange = fillRange;

        let nowRange = (fillRange * 100).toFixed(2);
        nowRange = nowRange.endsWith('.00') ? nowRange.slice(0, -3) : nowRange;
        this.progressBar.getChildByName("Label").getComponent(Label).string = "完成度：" + String(nowRange) + "%"
    }

    /**
     * 初始化已收集的拼图
     */
    initPuzzle() {
        for (let i = 1; i <= this.param.existNum; i++) {
            this.init(i);
        }
        this.initProgressBar();
    }

    // 初始化碎片
    initPiece() {
        if (this.param.nowNum < 1) {
            return;
        }
        for (let i = this.param.existNum + this.param.nowNum; i >= this.param.existNum + 1; i--) {
            this.init(i, true);
        }
    }


    /**
     * 初始化碎片
     */
    init(index: number = 1, isPiece: boolean = false) {
        const puzzleNode = instantiate(this.puzzlePrefab)
        puzzleNode.parent = this.puzzleParent;
        const puzzle = puzzleNode.getComponent(PuzzleSprite);

        // 获取材质
        let material = puzzle.getSharedMaterial(0); // 0 表示获取第一个材质，如果有多个材质请使用相应索引

        // 操作材质
        if (material) {
            material.setProperty("rows", this.param.rows)
            material.setProperty("columns", this.param.columns)
        }

        /***************** 设置碎片参数 ******************/
        let pos = this.findPosition(index);
        puzzle.row = pos.row;
        puzzle.column = pos.column;
        puzzle.rowMax = this.param.rows;
        puzzle.columnMax = this.param.columns;

        /***************** 设置碎片图片 ******************/
        // 图片资源的路径
        const imagePath = 'image/' + this.param.imgName + '/spriteFrame';
        // 加载图片资源
        resources.load(imagePath, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                console.error('加载图片资源失败', err);
                return;
            }
            puzzle.spriteFrame = spriteFrame;
            this.puzzleParent.getComponent(Sprite).spriteFrame = spriteFrame;
        });

        /***************** 设置拼图碎片大小 ******************/
        // 1、 获取容器大小
        const puzzleParentUI: UITransform = this.puzzleParent.getComponent(UITransform);
        const uiWidth = puzzleParentUI.contentSize.width;
        const uiHeight = puzzleParentUI.contentSize.height;

        // 2、设置碎片大小
        const puzzleNodeUI: UITransform = puzzleNode.getComponent(UITransform);
        const width = uiWidth / this.m_sizeExpand / this.param.columns;
        const height = uiHeight / this.m_sizeExpand / this.param.rows;
        puzzleNodeUI.setContentSize(width, height);

        // 3、设置碎片位置
        if (isPiece) {
            // 碎片临时位置
            puzzleNode.parent = this.pieceParent;
            const randomNumX = Math.floor(Math.random() * (50 - -50 + 1)) + -50;
            const randomNumY = Math.floor(Math.random() * (50 - 0 + 1));
            let targetX = -width / 2 - randomNumX;
            let targetY = height / 2 + randomNumY;
            puzzleNode.setPosition(v3(targetX, targetY, 0))

            let target = this.getImagePosition(uiWidth, uiHeight, pos);
            this.m_pieceList.push([puzzleNode, target]);
        } else {
            let target = this.getImagePosition(uiWidth, uiHeight, pos);
            puzzleNode.setPosition(v3(target.x, target.y))
        }
    }

    /**
     * 根据给定的位置 x，计算其在一维数组中的行列位置
     *
     * @param index 给定的位置
     * @returns 返回包含行和列的对象
     */
    findPosition(index: number) {
        const row = Math.floor((index - 1) / this.param.columns) + 1;
        const column = (index - 1) % this.param.columns + 1;
        return { row, column };
    }

    /**
     * 获取图片在指定位置上的坐标
     *
     * @param uiWidth 容器的宽度
     * @param uiHeight 容器的高度
     * @param pos 图片的位置，包括行和列信息
     * @returns 返回图片的左上角坐标
     */
    getImagePosition(uiWidth: number, uiHeight: number, pos: { row: number, column: number }) {
        const Width = uiWidth / this.param.columns;
        const height = uiHeight / this.param.rows;
        // 图片的左上角x坐标
        let x = -uiWidth / 2 + Width * ((pos.column - 1) % this.param.columns) - (Width * this.m_sizeExpand / 2) - 1;
        // 图片的左上角y坐标
        let y = uiHeight / 2 - (pos.row - 1) * height + (height * this.m_sizeExpand / 2) + 1;
        return { x, y };
    }
}


