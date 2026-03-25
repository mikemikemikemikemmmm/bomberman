import React from "react"
import ReactDom from "react-dom/client"
import UIApp from "./ui/app"
import { Game } from "./game/root"
import { wsEmitter } from "./websocket"
import {  UI_DOM_ID } from "./config"
export class App {
    private userId!: number
    constructor() {
        this.init()
    }
    async init() {
        // await this.initWebsocket()
        // this.initUI()
        this.initGame()
    }
    async initWebsocket() {
        try {
            wsEmitter.init()
            this.userId = await wsEmitter.waitForUserId()
            console.log('✅ 連線成功，userId:', this.userId)
        } catch (error) {
            alert("初始化錯誤")
        }
    }
    initUI() {
        const self = this
        const root = document.getElementById(UI_DOM_ID) as HTMLDivElement
        ReactDom.createRoot(root).render(
            <React.StrictMode>
                <UIApp userId={self.userId} startPlaying={self.startPlaying} />
            </React.StrictMode>
        )
    }
    initGame() {
        new Game(this.endPlaying)
    }
    startPlaying() {

    }
    endPlaying(){

    }
}