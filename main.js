const {app, BrowserWindow, Menu, ipcMain, dialog} = require("electron")
const path = require("path")
const Store = require('electron-store')
const QiniuManager = require("./src/utils/QiniuManager")
const menuTemplate = require("./src/menuTemplate")
const AppWindow = require("./src/AppWindow")
const settingsStore = new Store({name: 'Settings'})
const fileStore = new Store({name: "Files Data"})
let mainWindow = null
let settingsWindow = null
console.log(process.env.NODE_ENV)
function getEvn() {
  console.log(process.env.NODE_ENV)

  return process.env.NODE_ENV
}

const createManager = () => {
  const accessKey = settingsStore.get('accessKey')
  const secretKey = settingsStore.get('secretKey')
  const bucketName = settingsStore.get('bucketName')
  return new QiniuManager(accessKey, secretKey, bucketName)
}

function createWindow() {
  const mainWindowConfig = {
    width: 1024,
    height: 680,
  }
  const urlLocation = getEvn() === "development" ? "http://localhost:3000" : `file://${path.join(__dirname,"./index.html")}`
  // const urlLocation = `file://${path.join(__dirname,"./build/index.html")}`
  mainWindow = new AppWindow(mainWindowConfig, urlLocation)
  if (getEvn() === "development") mainWindow.webContents.openDevTools()
  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

app.on("ready", () => {
  createWindow()

  // 菜单
  let menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)
  // ipcMain

  //打开设置
  ipcMain.on("open-settings-window", () => {
    console.log("open-settings-window")
    const settingsWindowConfig = {
      width: 500,
      height: 400,
      parent: mainWindow
    }
    const settingsFileLocation = `file://${path.join(__dirname, "./settings/index.html")}`
    settingsWindow = new AppWindow(settingsWindowConfig, settingsFileLocation)
    settingsWindow.webContents.openDevTools()
    settingsWindow.on("closed", () => {
      console.log("settingsWindow")
      settingsWindow = null
    })
  })
  // 设置完七牛云信息之后进行同步，动态改变菜单
  ipcMain.on("config-is-saved", () => {
    // 注意 mac的菜单和window的不同点
    let qiniuMenu = process.platform === "darwin" ? menu.items[3] : menu.items[2]
    const switchItems = (toggle) => {
      [1, 2, 3].forEach(number => {
        qiniuMenu.submenu.items[number].enabled = toggle
      })
    }
    const qiniuIsConfiged = ['accessKey', 'secretKey', 'bucketName'].every(key => !!settingsStore.get(key))
    switchItems(qiniuIsConfiged)
  })
  // 自动同步单个文件到七牛云
  ipcMain.on("upload-file", (event, data) => {
    const manager = createManager()
    manager.uploadFile(data.key, data.path).then(data => {
      console.log("上传成功", data)
      // mainWindow.webContents.send("active-file-uploaded")
      event.reply("active-file-uploaded")
    }).catch(() => {
      dialog.showErrorBox("同步失败", "请检查七牛云参数是否正确")
    })
  })
  //自动下载文件到本地
  ipcMain.on("download-file", (event, data) => {
    const manager = createManager()
    const filesObj = fileStore.get("files")
    const {key, path, id} = data
    manager.getStat(data.key).then(res => {
      const serverUpdatedTime = Math.round(res.putTime / 10000)
      console.log(serverUpdatedTime)
      const localUpdatedTime = filesObj[id].updateAt
      console.log(localUpdatedTime)
      if (serverUpdatedTime > localUpdatedTime || localUpdatedTime) { // 需要进行更新
        manager.downloadFile(key, path).then(() => {
          console.log("resolve")
          event.reply("file-downloaded", {status: "download-success", id})
        }).catch(()=>{
          console.log("reject")
          event.reply("file-downloaded", {status: "no-file", id})
        })
      } else {
        event.reply("file-downloaded", {status: "no-new-file", id})
      }
    }).catch(err => {
      console.log(err)
      event.reply("file-downloaded", {status: "no-file",id})
    })
  })
  // 全部同步到云端
  ipcMain.on("upload-all-to-qiniu",()=>{
    mainWindow.webContents.send("loading-status",true)
    setTimeout(()=>{
      mainWindow.webContents.send("loading-status",false)
    },3000)
  })
})

app.on("activate", function () {
  console.log("BrowserWindow.getAllWindows()", BrowserWindow.getAllWindows())
  if (BrowserWindow.getAllWindows().length === 0 && !mainWindow) {
    createWindow()
  }
})
app.on("window-all-closed", function () {
  console.log("window-all-closed", process.platform)
  if (process.platform !== "darwin") { // 非mac时，关闭整个应用
    app.quit()
  }
})
