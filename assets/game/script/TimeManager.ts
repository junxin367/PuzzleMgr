import { _decorator, Component, director, Label } from "cc";
import { events } from "../../main/script/base/BaseEnums";
const { ccclass, property } = _decorator;

@ccclass
export default class TimeManager extends Component {

    @property(Label)
    timeLabel: Label                    // 用来显示时间的Label组件

    /***************** 参数 ******************/
    time: number = 5 * 60;              // 计时时间，单位为秒
    timeRunStatus: boolean;             // 计时器是否在运行
    timeInit: number;                   // 初始时间

    static single: TimeManager = null;

    onLoad() {
        // console.log("计时器初始化")
        TimeManager.single = this;
        this.timeRunStatus = false;  // 计时器是否在运行
    }

    init(time: number) {
        // console.log("初始化计时器", time)
        this.timeInit = time;
        this.time = 0;                  // 计时时间，单位为秒
        this.timeRunStatus = false;     // 计时器是否在运行
    }

    startTime() {
        // console.log("开始计时方法")
        this.timeRunStatus = true;
        this.schedule(this.upTime, 1);
    }

    pauseTimer() {
        console.log("暂停计时方法")
        this.timeRunStatus = false;
        this.unschedule(this.upTime);
    }

    stopTimer() {
        this.timeRunStatus = false;
        this.time = 0;
        this.timeLabel.string = "0:00";
        this.unschedule(this.upTime);
    }

    upTime() {
        if (this.timeRunStatus) {
            this.time--;
            this.upTimeLabel();
            if (this.time === 0) {
                this.stopTimer();
                // junes：游戏结束
                console.log("游戏结束")
                // 通关完成，游戏结束
                director.emit(events.Fail, {detail: "timeFail"});
            }
        }
    }

    upTimeLabel() {
        let minutes = Math.floor(this.time / 60);
        let seconds = this.time % 60;
        this.timeLabel.string = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    getTime(){
        return this.time
    }

    /**
     * 重置计时器
     *
     * @param addTime 要增加的时间，单位为秒
     */
    resetTime(addTime: number) {
        this.time = addTime && addTime>0 ? this.time + Number(addTime) : this.timeInit;
        this.upTimeLabel();
    }

}
