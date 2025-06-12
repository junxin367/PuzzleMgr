import { _decorator, AudioClip, AudioSource, Camera, Component, director, EventTouch, geometry, Input, input, instantiate, Label, Node, PhysicsSystem, Prefab, Sprite, SpriteFrame, toDegree, toRadian, UITransform, Vec3, view } from "cc";
import { events, SoundStatus } from "../../main/script/base/BaseEnums";
import { Global } from "../../main/script/base/Global";
import { GmConfig, XinConfig } from "../../main/script/config/XinConfig";
import { AdUtil } from "../../main/script/utils/ad/AdUtil";
import { XinCli } from "../../main/script/utils/cli/XinCli";
import { MiniGameSdk } from "../../main/script/utils/MiniGameSdk";
import { WxSdk } from "../../main/script/utils/wx/WxSdk";
import { XinUtil } from "../../main/script/utils/XinUtil";
import { Cubes } from "./Cubes";
const { ccclass, property } = _decorator;

@ccclass("UI")
export class UI extends Component {
    @property(Prefab)
    m_settingModal: Prefab = null;

    @property(Node)
    cameraNode: Node = null;
    @property(Node)
    uiNode: Node = null;
    @property(Node)
    selectNode: Node = null;
    @property(Cubes)
    cubes: Cubes = null;

    @property(AudioClip)
    m_dianJi: AudioClip = null;

    @property(Label)
    daoju_1: Label = null;
    @property(Label)
    daoju_2: Label = null;
    @property(Label)
    daoju_3: Label = null;
    @property(Label)
    daoju_4: Label = null;

    @property(SpriteFrame)
    lock_2: SpriteFrame = null;

    camera0: Camera = null;
    camera1: Camera = null;

    private _verFOV: number = 45;

    /***************** 广告 ******************/
    m_videoAd = AdUtil.videoAd(MiniGameSdk.getVideoAd(), "main_video");
    m_jieSuoShare = XinUtil.Storage.getValue("jieSuoShare", 0)

    // 首页的广告，主要用于关闭
    m_bannerAdByMain = AdUtil.customAd(XinConfig.customAdBanner[2], {});
    m_customAdByMain = AdUtil.customAd(XinConfig.customAd[1], {});

    protected onLoad() {
        this.updateDaoJuNum();
        this.fixCamera();
        this.fixSceneUI();
        input.on(Input.EventType.TOUCH_START, this.pickCube, this);

        // 显示微信转发按钮
        WxSdk.showShareMenu();
        // 当天超过分享解锁次数，换成看视频解锁
        if (this.m_jieSuoShare >= Global.shareNum) {
            let jieSuoNode = this.node.getChildByName("select").children[6];
            jieSuoNode.getChildByName("jieSuo").getComponent(Sprite).spriteFrame = this.lock_2;
        }

        // 设置版本号
        if (WxSdk.isWxEnv()) {
            this.node.getChildByName("versions").getComponent(Label).string = WxSdk.getMiniProgram().version;
            this.scheduleOnce(() => {
                if (this.m_bannerAdByMain) {
                    this.m_bannerAdByMain.hide();
                }
                if (this.m_customAdByMain) {
                    this.m_customAdByMain.hide();
                }
            }, 1);
        }
  
        // 关卡数超过200关，分享解锁格子次数增加1
        if (Global.ins.lv > 200) {
            Global.shareNum += 1;
        }
    }

    protected onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.pickCube, this);
    }

    /***************** 事件 ******************/
    onEnable() {
        director.on(events.ReSetJieSuo, this.reSetJieSuo, this);
        director.on(events.UpdateDaoJuNum, this.updateDaoJuNum, this);
        director.on(events.VibrateShort, this.vibrateShort, this);
    }

    onDisable() {
        director.off(events.ReSetJieSuo, this.reSetJieSuo, this);
        director.off(events.UpdateDaoJuNum, this.updateDaoJuNum, this);
        director.on(events.VibrateShort, this.vibrateShort, this);
    }

    // 重新开始，重置格子
    reSetJieSuo() {
        // 解锁格子数初始化
        XinUtil.Storage.set("jieSuoNum", 0)
        let children = this.node.getChildByName("select")?.children
        if (children) {
            children[children.length - 1].getChildByName("jieSuo").active = true;
            children[children.length - 2].getChildByName("jieSuo").active = true;
        }
    }

    /***************** 功能函数 ******************/
    /**
     * XXX：选择并拾取立方体
     *
     * @param event 触摸事件
     */
    pickCube(event: EventTouch) {
        // 以下参数可选
        let ray = new geometry.Ray();
        this.camera0.screenPointToRay(event.getLocationX(), event.getLocationY(), ray);
        if (PhysicsSystem.instance.raycastClosest(ray, 0x2, 100, false)) {
            const raycastClosestResult = PhysicsSystem.instance.raycastClosestResult;
            let node = raycastClosestResult.collider.node;

            // 金色道具
            if (node.name == "golden") {
                console.log("金色道具");
                this.cubes.showGoldenGift(false)
                this.vibrateShort();
                return;
            }

            XinUtil.Tool.throttle("flyToSelect", 100).then(result => {
                if (this.cubes.flyToSelect(node)) {
                    this.cubes.removeFromWorld(node);
                }
            });
            this.vibrateShort();
        }
    }

    /***************** 下面是按钮 ******************/
    //测试按钮
    btnStart() {
        this.cubes.resetLevel();
    }

    // 打开设置
    btnSetting() {
        this.vibrateShort();
        const node = instantiate(this.m_settingModal);
        node.parent = this.node;
    }


    // 洗牌
    btnXiPai() {
        this.vibrateShort();
        XinUtil.Tool.throttle("prop", 500).then(result => {
            if (Global.ins.propsSet.xiPaiNum > 0) {
                if (this.cubes.xiPai()) {
                    XinUtil.Storage.set('xiPaiNum', --Global.ins.propsSet.xiPaiNum)
                    this.updateDaoJuNum()
                } else {
                    director.emit(events.Tips, "洗牌中");
                }
                return
            }

            const thiz = this;
            this.showAd(function () {
                if (thiz.cubes.xiPai()) {
                    thiz.umaLog("洗牌", true);
                    thiz.updateDaoJuNum()
                } else {
                    director.emit(events.Tips, "洗牌中");
                }
            }, function () {
                thiz.umaLog("洗牌", false);
            })
        });
    }

    // 翻牌
    btnFanPai() {
        this.vibrateShort();
        XinUtil.Tool.throttle("prop", 500).then(result => {
            if (Global.ins.propsSet.fanPaiNum > 0) {
                if (this.cubes.fanPai()) {
                    XinUtil.Storage.set('fanPaiNum', --Global.ins.propsSet.fanPaiNum)
                    this.updateDaoJuNum()
                } else {
                    director.emit(events.Tips, "洗牌中");
                }
                return
            }

            const thiz = this;
            this.showAd(function () {
                if (thiz.cubes.fanPai()) {
                    thiz.umaLog("翻牌", true);
                    thiz.updateDaoJuNum()
                } else {
                    director.emit(events.Tips, "洗牌中");
                }
            }, function () {
                thiz.umaLog("翻牌", false);
            })
        });
    }

    // 合牌
    btnHePai() {
        this.vibrateShort();
        XinUtil.Tool.throttle("prop", 500).then(result => {
            if (Global.ins.propsSet.hePaiNum > 0) {
                if (this.cubes.hePai()) {
                    XinUtil.Storage.set('hePaiNum', --Global.ins.propsSet.hePaiNum)
                    this.updateDaoJuNum()
                } else {
                    director.emit(events.Tips, "洗牌中");
                }
                return
            }

            const thiz = this;
            this.showAd(function () {
                if (thiz.cubes.hePai()) {
                    thiz.umaLog("合牌", true);
                    thiz.updateDaoJuNum()
                } else {
                    director.emit(events.Tips, "洗牌中");
                }
            }, function () {
                thiz.umaLog("合牌", false);
            })
        });
    }

    // 退牌
    btnTuiPai() {
        this.vibrateShort();
        XinUtil.Tool.throttle("prop", 500).then(result => {
            if (Global.ins.propsSet.tuiPaiNum > 0) {
                if (this.cubes.tuiPai()) {
                    XinUtil.Storage.set('tuiPaiNum', --Global.ins.propsSet.tuiPaiNum)
                    this.updateDaoJuNum()
                } else {
                    director.emit(events.Tips, "当前槽位没有牌");
                }
                return
            }

            const thiz = this;
            this.showAd(function () {
                if (thiz.cubes.tuiPai()) {
                    thiz.umaLog("退牌", true);
                    thiz.updateDaoJuNum()
                } else {
                    director.emit(events.Tips, "当前槽位没有牌");
                    XinUtil.Storage.set('tuiPaiNum', ++Global.ins.propsSet.tuiPaiNum)
                    thiz.updateDaoJuNum()
                }
            }, function () {
                thiz.umaLog("退牌", false);
            })
        });
    }

    // 解锁格子
    btnJieSuo(event: Event, customEventData: string) {
        this.vibrateShort();
        // 是否分享触发
        const isShare = customEventData === "share" && this.m_jieSuoShare < Global.shareNum;

        // 已经解锁的数量
        let jieSuoNum = Number(XinUtil.Storage.getValue("jieSuoNum", 0));
        // 当前解锁数少于2个就允许执行
        if (jieSuoNum < Global.shareNum) {
            const thiz = this;
            let node = this.node.getChildByName("select").children[6 + jieSuoNum];

            const callback = function () {
                XinUtil.Storage.set("jieSuoNum", ++jieSuoNum)
                node.getChildByName("jieSuo").active = false

                if (isShare) {
                    XinUtil.Storage.set("jieSuoShare", ++thiz.m_jieSuoShare, XinUtil.Time.getDateSeconds())
                } else {
                    thiz.umaLog("解锁格子", true);
                }
            }

            if (isShare) {
                const showHint = function () {
                    director.emit(events.Tips, "请分享到群聊");
                }
                MiniGameSdk.shareAppMessage(GmConfig.getRandomShare().title, GmConfig.getRandomShare().imgUrl, callback, showHint);
            } else {
                this.showAd(callback, function () {
                    thiz.umaLog("解锁格子", false);
                })
            }

            return
        }
    }


    /**
     * 记录关卡玩家使用道具或获得奖励的行为
     *
     * @param itemName 道具名称
     * @param isAward 是否为获得奖励，默认为 false
     */
    umaLog(itemName: string, isAward: boolean = false) {
        // XXX -- 关卡玩家数据 ad
        let lvUserData = Global.ins.lvAdData;
        lvUserData.ad = (lvUserData.ad || 0) + 1;

        if (WxSdk.isWxEnv()) {
            const isNewUser = XinUtil.Storage.get("isNewUser");
            let event = isNewUser ? "new_user_tools" : "tools";
            // 在关卡中使用道具
            wx.uma?.stage.onRunning({
                stageId: Global.ins.lv,
                stageName: Global.ins.lv + "关",
                event: event,
                params: {
                    abUser: XinUtil.Tool.getHashAB(Global.ins.od),
                    itemName: itemName,
                    isAward: isAward + "",
                    query: wx.getLaunchOptionsSync().query,
                    adId: wx.getLaunchOptionsSync().query?.adId,
                    wxScene: WxSdk.getEnterOptionsSyncByName(),
                    scene: director.getScene().name
                }
            })
        }
    }


    /**
     * 点击音效跟震动
     *
     * @remarks
     * 当全局声音效果为开启状态时，会播放点击音效
     * 在微信环境下，会执行短震动操作
     */
    vibrateShort() {
        if (Global.ins.sound == SoundStatus.on) {
            let audio = this.node.getComponent(AudioSource);
            audio.playOneShot(this.m_dianJi, 1);
        }

        // 选牌震动
        MiniGameSdk.vibrateShort();
    }

    // 显示广告
    showAd(callback: Function, quitCallback?: Function) {
        if (MiniGameSdk.isEnv()) {
            director.emit(events.Music, {
                name: 'music',
                value: SoundStatus.off,
                onStatus: true
            });

            director.emit(events.Timer, 'pause');
            const adCallback = (res: any) => {
                console.log("res.isEnded", res, res?.isEnded);
                if (res && res?.isEnded || res === undefined) {
                    callback();
                } else {
                    if (quitCallback) {
                        quitCallback();
                    }
                    director.emit(events.Tips, "播放中途退出，不下发游戏奖励哦");
                }

                director.emit(events.Music, {
                    name: 'music',
                    value: SoundStatus.on,
                    onStatus: true
                });
                director.emit(events.Timer, 'start');
            }

            this.m_videoAd.showAd(adCallback, true)
        } else {
            director.emit(events.Timer, 'start');
            callback();
        }
    }

    // 更新导数据数量显示
    updateDaoJuNum() {
        this.daoju_1.string = Global.ins.propsSet.xiPaiNum + ""
        this.daoju_2.string = Global.ins.propsSet.fanPaiNum + ""
        this.daoju_3.string = Global.ins.propsSet.hePaiNum + ""
        this.daoju_4.string = Global.ins.propsSet.tuiPaiNum + ""
    }


    /***************** ui场景适配 ******************/
    //垂直fov 转 水平fov
    verticalFOVToHorizontal(verFOV: number, aspect: number) {
        // 垂直fov的弧度
        let verFovRadian = toRadian(verFOV);
        // 视野高度的一半
        let camHalfHeight = Math.tan(verFovRadian / 2);
        // 水平视野的弧度
        let horFOVRadian = Math.atan(camHalfHeight * aspect) * 2;
        // 水平视野的角度
        return toDegree(horFOVRadian);
    }

    //水平fov 转 垂直fov
    horizontalFOVToVertical(horFOV: number, aspect: number) {
        // 水平fov的弧度
        let horFOVRadian = toRadian(horFOV);
        // 视野宽度的一半
        let camHalfWidth = Math.tan(horFOVRadian / 2);
        // 垂直视野的弧度
        let verFOVRadian = Math.atan(camHalfWidth / aspect) * 2;
        // 垂直视野的角度
        return toDegree(verFOVRadian);
    }

    fixCamera() {

        this._verFOV = 45;
        let size = view.getVisibleSize();
        let aspect = (size.width * 1.0) / size.height;

        //相机默认使用水平FOV，长宽>1：2 进行FOV适配转换
        this.camera0 = this.cameraNode.getChildByName("Camera0").getComponent(Camera);
        this.camera1 = this.cameraNode.getChildByName("Camera1").getComponent(Camera);

        if (aspect > 0.5) {
            //宽屏，长宽>1：2 进行适配转换
            let horFOVRadian = this.verticalFOVToHorizontal(this._verFOV, aspect);
            this.camera1.fov = this.camera0.fov = horFOVRadian;
        } else {
            //默认情况计算对应的verFOV
            this._verFOV = this.horizontalFOVToVertical(this._verFOV * 0.5, aspect);
        }

        this.camera0.camera.update(true);
        this.camera1.camera.update(true);
    }

    /**
     * 修正场景UI
     *
     * @returns 无返回值
     */
    fixSceneUI() {

        let uiTop = this.uiNode.getChildByName('top');
        let uiBottom = this.uiNode.getChildByName('bottom');
        let uiSelect = this.uiNode.getChildByName('select');
        // let uiRemainNum = this.uiNode.getChildByName('remainNum');

        //3d场景宽度
        let worldLeft = this.camera0.convertToUINode(new Vec3(12, 0, 0), this.uiNode);

        //修正顶部宽度,比3D场景稍宽
        let uiTrans = uiTop.getComponent(UITransform);
        let scale = worldLeft.x * 1.8 / uiTrans.width;
        uiTop.setScale(scale, scale, scale); //外扩大一点
        // uiTrans.width = worldLeft.x*2.2; 

        //修正底部宽度,比3D场景稍宽
        uiTrans = uiBottom.getComponent(UITransform);
        scale = worldLeft.x * 1.8 / uiTrans.width;
        uiBottom.setScale(scale, scale, scale);//外扩大一点
        //uiTrans.width = worldLeft.x*2.2; 

        //修正Select的大小
        uiTrans = uiSelect.getComponent(UITransform);
        scale = worldLeft.x * 1.8 / uiTrans.width;
        uiSelect.setScale(scale, scale, scale);

        // uiTrans = uiRemainNum.getComponent(UITransform);
        // uiRemainNum.setPosition(-uiTrans.width / 2 - 20, uiSelect.getPosition().y + 65, 0)

        //调整3D背景大小
        let bg = this.cameraNode.getChildByName('BackGround');
        let length = this.camera0.node.position.length();
        scale = 2 * Math.tan(toRadian(this._verFOV / 2));
        bg.setScale(scale * length, scale * length, 1);

        //调整3D底面板位置
        let size = view.getVisibleSize();
        scale = -uiSelect.position.y / size.height;
        let offset = this.camera0.node.parent.position.z;
        this.selectNode.setPosition(0, 0, scale * bg.scale.y + offset);
    }



}
