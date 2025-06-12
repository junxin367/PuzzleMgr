import { _decorator, Animation, AudioClip, AudioSource, Component, director, instantiate, Label, Node, Prefab, tween, Vec3 } from 'cc';
import { events, SoundStatus } from './base/BaseEnums';
import { Global } from './base/Global';
import { Tips } from './base/Tips';
import { XinConfig } from './config/XinConfig';
import { AdUtil } from './utils/ad/AdUtil';
import { XinCli } from './utils/cli/XinCli';
import { DySdk } from './utils/dy/DySdk';
import { MiniGameSdk } from './utils/MiniGameSdk';
import { WxSdk } from './utils/wx/WxSdk';
import { XinUtil } from './utils/XinUtil';
import { XinPowerSin } from './XinPowerSin';
const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends Component {
    
    @property(Prefab)
    m_tipsPrefab: Prefab = null;
    @property(Prefab)
    m_settingPrefab: Prefab = null;
    @property(Prefab)
    m_powerPrefab: Prefab = null;
    @property(Prefab)
    m_giftPrefab: Prefab = null;
    @property(Prefab)
    m_puzzleScenePrefab: Prefab = null;

    @property(Node)
    m_gameClub: Node = null;
    @property(Node)
    m_rankNode: Node = null;

    @property(Label)
    m_lvLabel: Label = null;
    @property(Label)
    m_lvLabel_001: Label = null;
    @property(Label)
    m_countDown: Label = null;      // 倒计时

    @property(AudioClip)
    m_dianJi: AudioClip = null;

    @property(Prefab)
    m_getPropPop: Prefab = null;

    @property(Label)
    m_goldLabel: Label = null;
    
    @property(Prefab)
    m_drawNode: Prefab = null;

    @property(Prefab)
    m_shopNode: Prefab = null;
    
    /***************** 抖音 ******************/
    @property(Node)
    m_DyScene: Node = null;   // 抖音侧边栏
    @property(Node)
    m_DyLayout: Node = null;  // 抖音按钮

    //***************** 对象/变量 ******************/
    m_clubButton: any = null;
    m_giftNode: Node = null;
    m_isGetGift = XinUtil.Storage.getValue('_gift', false);
    
    /***************** 广告 ******************/
    m_sysInfo = WxSdk.getSystemInfo();
    // 插屏广告
    m_interstitialAd = AdUtil.interstitialAd(MiniGameSdk.getInterstitialAd(1));
    // banner广告
    m_bannerAd = AdUtil.customAd(XinConfig.customAdBanner[2], {
        left: (this.m_sysInfo?.screenWidth - 300) / 2,
        top: this.m_sysInfo?.screenHeight - (300 / 3),
        width: 300
    });
    // 格子广告
    m_customAd = AdUtil.customAd(XinConfig.customAd[1], {
        left: this.m_sysInfo?.screenWidth - 80,
        top: this.m_sysInfo?.statusBarHeight + 10,
        width: 60
    });


    async start() {
        // 显示微信转发按钮
        WxSdk.showShareMenu();
        // 抖音提审需求
        DySdk.onShow((res: any) => {
            if (res.location == "sidebar_card") {
                this.btnShowGift();
            }
        });
        if(DySdk.isDyEnv()){
            this.m_DyLayout.active = true;
            this.m_DyLayout.getChildByName("btnShortcut").active = !XinUtil.Storage.get('_collect');
        }
        
        let lv = Global.ins.lv;
        console.log("lv", lv);

        if (WxSdk.isWxEnv()) {
            // 测试环境标记
            XinUtil.Storage.set("isDebug", wx.getLaunchOptionsSync()?.query?.isDebug === "true");
            console.log("isDebug", wx.getLaunchOptionsSync()?.query?.isDebug, wx.getLaunchOptionsSync()?.query);

            if (lv < 200) {
                // 非测试人员才显示广告
                const thiz = this;
                MiniGameSdk.checkedUser().then((checkedUser: any) => {
                    if (!checkedUser && Global.ins.lv > 1) {
                        console.log("显示广告", Global.ins.lv)
                        thiz.m_interstitialAd.show().catch((err: any) => {
                            console.error('插屏广告显示失败', err)
                        })
                        thiz.m_interstitialAd.onClose((res: any) => {
                            console.log('插屏 广告关闭')
                        })

                        thiz.m_bannerAd.show();
                    } else {
                        console.log("rdgztest_ 不显示广告")
                    }
                });
            }
        }
     
        if (lv == 1 && XinUtil.Storage.get("guide_2") != true) {
            let scene = "Game";
            if (WxSdk.isWxEnv() && XinUtil.Str.isNotNull(wx.getLaunchOptionsSync()?.query?.scene)) {
                scene = wx.getLaunchOptionsSync()?.query?.scene;
            }
            if (scene === undefined) {
                scene = "Game";
            }
            // 未有历史数据直接进入游戏
            director.loadScene(scene);
            if (MiniGameSdk.isEnv()) {
                // 设置广告过来的用户标志
                XinUtil.Storage.set("weixinadinfo", wx.getLaunchOptionsSync()?.query?.weixinadinfo != undefined)
            }
            // 设置为新用户
            XinUtil.Storage.set("isNewUser", true, XinUtil.Time.getDateSeconds())
        } else {
            this.init();
        }

        this.m_lvLabel.string = "第" + lv + "关";
        this.m_lvLabel_001.string = "第" + Global.ins.lv_001 + "关";
    }

    init() {
        if (MiniGameSdk .isEnv()) {
            /***************** 游戏圈 ******************/
            if(!DySdk.isDyEnv()){
                let style = XinUtil.Cc.getClubPos(this.m_gameClub);
                this.m_clubButton = wx.createGameClubButton({
                    type: 'image',
                    image: 'gameClub.png',
                    style: style
                })
            } else {
                this.m_gameClub.active = false;
                this.m_clubButton = (() => {
                    const defaultFunctions: {
                        show: () => void;
                        hide: () => void;
                    } = {
                        show: () => { },
                        hide: () => { }
                    };
                    return defaultFunctions;
                })();
            }

            const showAd = wx.getLaunchOptionsSync().query.showAd;
            XinUtil.Storage.set('showAd', showAd, 24 * 3600);

            const thiz = this;
            // 非测试人员才显示广告
            MiniGameSdk.checkedUser().then((checkedUser: any) => {
                if (!checkedUser && Global.ins.lv > 1) {
                    thiz.m_customAd.show();
                }
            });

        }

        // 碰碰碰玩法是否显示广告标
        XinUtil.Cc.getChildByName(this.node, "Btn/btnStart-001/btn/ad").active = Global.ins.lv_001 < 1;
        // 更新金币数量
        this.updateGoldNum();

        /***************** 每日第一次登录显示福利弹窗 ******************/
        const isShowGift = XinUtil.Storage.get("isShowGift");
        if (!isShowGift) {
            this.btnShowGift();
            XinUtil.Storage.set("isShowGift", "true", 24 * 3600);
        }

        /***************** 每日福利按钮动效 ******************/
        if (!this.m_isGetGift) {
            if (this.m_giftNode == null) {
                this.m_giftNode = XinUtil.Cc.getChildByName(this.node, "Btn/right/btnGift/icon-gift");
                // 获取动画控制器组件    
                let anim: Animation = this.m_giftNode.getComponent(Animation)
                anim.play();

                this.m_giftNode.parent.getChildByName("tips-red").active = true;
            }
            this.schedule(function () {
                if (!this.m_isGetGift) {
                    // 获取动画控制器组件    
                    let anim: Animation = this.m_giftNode.getComponent(Animation)
                    anim.play();
                }
            }, 7);
        }
    }

    /***************** 事件 ******************/
    onEnable() {
        director.on(events.Tips, this.tips, this);
        director.on(events.ShowClubBtn, this.showGameClubButton, this);
        director.on(events.VibrateShort, this.vibrateShort, this);
        director.on(events.RemoveGift, this.removeGift, this);
        director.on(events.UpdateGoldNum, this.updateGoldNum, this);
    }

    onDisable() {
        director.off(events.Tips, this.tips, this);
        director.off(events.ShowClubBtn, this.showGameClubButton, this);
        director.off(events.VibrateShort, this.vibrateShort, this);
        director.off(events.RemoveGift, this.removeGift, this);
        director.off(events.UpdateGoldNum, this.updateGoldNum, this);
    }

    // 提示
    tips(event: any) {
        Tips.msg(event, this.node, this.m_tipsPrefab);
    }

    // 创建游戏社区按钮
    showGameClubButton() {
        if (this.m_clubButton) {
            this.m_clubButton.show();
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

    /**
     * 移除每日福利动画效果
     */
    removeGift() {
        if (this.m_giftNode != null) {
            this.m_giftNode = XinUtil.Cc.getChildByName(this.node, "Btn/right/btnGift/icon-gift");
            let anim: Animation = this.m_giftNode.getComponent(Animation)
            // 监听动画完成事件
            anim.on('finished', function () {
                // 动画播放完成后，停止动画
                this.m_giftNode.parent.getChildByName("tips-red").active = false;
                this.m_isGetGift = XinUtil.Storage.getValue('_gift', false);
                anim.stop();
            }, this);
        }
    }

    updateGoldNum(){
        if (Global.ins.userData.goldNum != undefined) {
            this.m_goldLabel.string = Global.ins.userData.goldNum + "";
        }
    }

    /***************** 按钮 ******************/
    // 开始游戏
    btnStart() {
        director.emit(events.VibrateShort);
        if (XinPowerSin.ins.changePower(false)) {
            this.m_bannerAd.hide();
            this.m_customAd.hide();
            // 加载场景
            director.loadScene("Game");
            if (this.m_clubButton) {
                this.m_clubButton.hide();
            }
        } else {
            this.scheduleOnce(function () {
                this.btnShowPower();
            }, 1);
        }
    }

    btnStartGame() {
        const thiz = this;
        this.m_bannerAd.hide();
        this.m_customAd.hide();
        function startGame(){
            director.emit(events.VibrateShort);
            if (XinPowerSin.ins.changePower(false)) {
                thiz.m_bannerAd.hide();
                thiz.m_customAd.hide();
                // 加载场景
                director.loadScene("Game-001");
                if (thiz.m_clubButton) {
                    thiz.m_clubButton.hide();
                }
            } else {
                thiz.scheduleOnce(function () {
                    thiz.btnShowPower();
                }, 1);
            }
        }

        if (Global.ins.lv_001 < 1) {
            const videoAd = AdUtil.videoAd(MiniGameSdk.getVideoAd(1), "Game-001");
            const adCallback = (res: any) => {
                if (res && res.isEnded || res === undefined) {
                    thiz.umaLog("解锁碰碰碰", true);
                } else {
                    thiz.umaLog("解锁碰碰碰", false);
                }

                Global.ins.lv_001 = 1;
                startGame();

                director.emit(events.Music, {
                    name: 'music',
                    value: SoundStatus.on,
                    onStatus: true
                });
            }
            videoAd.showAd(adCallback, true)
            return;
        }

        startGame();
    }

    umaLog(itemName: string, isAward: boolean = false) {
        if (WxSdk.isWxEnv()) {
            const isNewUser = XinUtil.Storage.get("isNewUser");
            let event = isNewUser ? "new_user_award" : "award";
            // 用户获得任务奖励
            wx.uma?.trackEvent("_task." + event, {
                abUser: XinUtil.Tool.getHashAB(Global.ins.od),
                itemName: itemName,
                isAward: isAward + "",
                query: wx.getLaunchOptionsSync().query,
                adId: wx.getLaunchOptionsSync().query?.adId,
                wxScene: WxSdk.getEnterOptionsSyncByName(),
                scene: director.getScene().name
            })
        }
    }

    // 打开设置
    btnSetting() {
        director.emit(events.VibrateShort);
        const node = instantiate(this.m_settingPrefab);
        node.parent = this.node;
        if (this.m_clubButton) {
            this.m_clubButton.hide();
        }

        const content: Node = node.getChildByName("content");
        content.scale = Vec3.ZERO;
        tween().target(content)
            .to(0.3, { scale: Vec3.ONE }, { easing: "quadOut" })
            .start();
    }

    // 看广告增加体力
    btnShowPower() {
        director.emit(events.VibrateShort);
        const node = instantiate(this.m_powerPrefab);
        node.parent = this.node;
        if (this.m_clubButton) {
            this.m_clubButton.hide();
        }

        const content: Node = node.getChildByName("content");
        content.scale = Vec3.ZERO;
        tween().target(content)
            .to(0.3, { scale: Vec3.ONE }, { easing: "quadOut" })
            .start();
    }

    // 分享
    btnShare() {
        director.emit(events.VibrateShort);
        MiniGameSdk.shareAppMessage();
    }

    // 显示排行榜
    btnOpenRank() {
        if (DySdk.isDyEnv()) {
            DySdk.getImRankList();
        } else {
            director.emit(events.VibrateShort);
            this.m_rankNode.active = true;
            // 优先显式全国排行榜
            if (this.m_clubButton) {
                this.m_clubButton.hide();
            }
        }
    }

    // 收藏拼图/露营区
    btnShowFolder() {
        director.emit(events.VibrateShort);
        const puzzleSceneNode = instantiate(this.m_puzzleScenePrefab)
        puzzleSceneNode.parent = this.node

        const content: Node = puzzleSceneNode.getChildByName("content");
        content.scale = Vec3.ZERO;
        tween().target(content)
            .to(0.3, { scale: Vec3.ONE }, { easing: "quadOut" })
            .start();
    }


    // 每日福利
    btnShowGift() {
        director.emit(events.VibrateShort);
        const node = instantiate(this.m_giftPrefab);
        node.parent = this.node;
        if (this.m_clubButton) {
            this.m_clubButton.hide();
        }

        const content: Node = node.getChildByName("content");
        content.scale = Vec3.ZERO;
        tween().target(content)
            .to(0.3, { scale: Vec3.ONE }, { easing: "quadOut" })
            .start();
    }

    // 抽奖
    btnDraw(){
        director.emit(events.VibrateShort);
        if(WxSdk.isWxEnv()){
            // 日志上报
            wx.uma?.trackEvent("_log.rests", {
                stageId: Global.ins.lv,
                stageName: Global.ins.lv + '关',
                eventName: "主页-打开抽奖",
                wxScene: WxSdk.getEnterOptionsSyncByName(),
                scene: director.getScene().name
            })
        }

        if (Global.ins.lv < 5) {
            director.emit(events.Tips, "还需通过" + (5 - Global.ins.lv) + "关后才可开启抽奖！");
            return;
        }

        const node = instantiate(this.m_drawNode);
        node.parent = this.node;
        if (this.m_clubButton) {
            this.m_clubButton.hide();
        }

        const content: Node = node.getChildByName("content");
        content.scale = Vec3.ZERO;
        tween().target(content)
            .to(0.3, { scale: Vec3.ONE }, { easing: "quadOut" })
            .start();
    }

    // gm 功能
    m_resetLvIndex = 0;
    btnResetLv() {
        if (this.m_resetLvIndex > 7) {
            XinUtil.Storage.removeAll()
        
            this.scheduleOnce(function () {
                XinUtil.Storage.set("powerNum", 10)
                Global.ins.userData = { sceneId:1, puzzleId: 1, existNum: 0 , goldNum: 2000}
                this.updateGoldNum();
                Global.ins.lv = 0;
            }, 0.5);
            director.emit(events.Tips, "重置关卡成功！🚁🚁🚁");
        }
        this.m_resetLvIndex++;
        this.scheduleOnce(function () {
            this.m_resetLvIndex = 0;
        }, 2);
    }

    // 商店
    btnShop(){
        director.emit(events.VibrateShort);
        if(WxSdk.isWxEnv()){
            // 日志上报
            wx.uma?.trackEvent("_log.rests", {
                stageId: Global.ins.lv,
                stageName: Global.ins.lv + '关',
                eventName: "主页-打开商店",
                wxScene: WxSdk.getEnterOptionsSyncByName(),
                scene: director.getScene().name
            })
        }

        if (Global.ins.lv < 5) {
            director.emit(events.Tips, "还需通过" + (5 - Global.ins.lv) + "关才可解锁！");
            return;
        }
       
        const node = instantiate(this.m_shopNode);
        node.parent = this.node;
        if (this.m_clubButton) {
            this.m_clubButton.hide();
        }

        const content: Node = node.getChildByName("content");
        content.scale = Vec3.ZERO;
        tween().target(content)
            .to(0.3, { scale: Vec3.ONE }, { easing: "quadOut" })
            .start();
    }
    
    /***************** 抖音按钮 ******************/
    // 添加桌面快捷方式
    onBtnDyShortcut(){
        DySdk.addShortcut(() => {
            if(XinUtil.Storage.get('_collect')){
                return
            }
            XinUtil.Storage.set('_collect', true);
            console.log("领取成功");
            
            const propNode = instantiate(this.m_getPropPop);
            propNode.setSiblingIndex(999);
            propNode.active = true;
            propNode.setPosition(0, 0, 0);
            propNode.parent = this.node;
            
            // 关闭入口
            this.m_DyLayout.getChildByName("btnShortcut").active = false;

            // 道具设置
            const yiChu = XinUtil.Cc.getChildByName(propNode, "content/Node/prop-yichu");
            yiChu.active = false;
            const xiPai = XinUtil.Cc.getChildByName(propNode, "content/Node/prop-xipai");
            xiPai.active = true;
            const btnNode = XinUtil.Cc.getChildByName(propNode, "content/Node/Btn");
            btnNode.active = true;
            const label = XinUtil.Cc.getChildByName(propNode, "content/Node/Label");
            label.getComponent(Label).string = "洗牌道具 +1"
            const tipsLabel = XinUtil.Cc.getChildByName(propNode, "content/Node/Tips/Label");
            tipsLabel.getComponent(Label).string = "洗牌后消除更容易哦~"

            XinUtil.Storage.set('xiPaiNum', ++Global.ins.propsSet.xiPaiNum)
        });
    }
   
    // 侧边栏
    onBtnDyToScene() {
        DySdk.navigateToScene(() => {
            this.m_DyScene.active = false;
        });
    }

    onOffBtnDyScene(){
        this.m_DyScene.active = !this.m_DyScene.active;
    }

}


