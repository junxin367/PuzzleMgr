import { _decorator, Camera, Component, instantiate, Label, Node, Prefab, tween, Vec3 } from 'cc';
import { Global } from '../../main/script/base/Global';
const { ccclass, property } = _decorator;

@ccclass('GuideMan')
export class GuideMan extends Component {

    @property(Prefab)
    headGuide: Prefab = null;
    @property(Node)
    cameraNode: Node = null;

    // 单例
    public static ins: GuideMan = null;
    m_camera3D = null
    m_headGuide: Node = null

    start() {
        GuideMan.ins = this;
        this.m_camera3D = this.cameraNode.getComponent(Camera) as Camera;
        // this.node.getChildByName("guideTips").active = false;
        // if (Global.ins.lv <= 1) {
        //     this.node.getChildByName("guideTips").active = true;
        // }
    }

    update(deltaTime: number) {

    }


    init(nowNode: Node) {
        if (!nowNode) {
            return;
        }

        let out = new Vec3();
        this.m_camera3D.convertToUINode(nowNode.worldPosition, this.node.parent, out); //这里的this.node是Canvas
        out = out.add(new Vec3(70, -50, 0));

        if (this.m_headGuide == null) [
            this.m_headGuide = instantiate(this.headGuide)
        ]
        this.m_headGuide.active = true;
        this.m_headGuide.parent = this.node
        this.m_headGuide.position = out
    }

    clear() {
        this.m_headGuide.active = false
    }

    clearTips(name: string) {
        const node = this.node?.getChildByName(name);
        if (node) {
            node.active = false;
        }
    }

    // 显示道具提示
    showTips(name: string, text?: string, pox?: Vec3) {
        const node = this.node.getChildByName(name);
        if (node) {
            node.active = true;
            node.scale = Vec3.ZERO;
            if (pox) {
                node.setPosition(pox)
            } else {
                // 默认位置
                node.setPosition(new Vec3(-85, -403, 0))
            }
            if (text) {
                node.getChildByName("Label").getComponent(Label).string = text;
            }
            tween().target(node)
                .to(0.3, { scale: Vec3.ONE }, { easing: "quadOut" })
                .start();
        }
    }
}


