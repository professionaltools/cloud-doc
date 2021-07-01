import React, {useState} from "react"
import uuidv4 from "uuid/v4"
import {faPlus, faFileImport} from "@fortawesome/free-solid-svg-icons"
import SimpleMDE from "react-simplemde-editor"
import {flattenArr, objToArr, timestampToString} from "./utils/helper"
import './App.css';
import "bootstrap/dist/css/bootstrap.min.css"
import "easymde/dist/easymde.min.css"
import FileSearch from "./components/FileSearch"
import FileList from "./components/FileList"
import BottomBtn from "./components/BottomBtn"
import TabList from "./components/TabList"
import fileHelper from "./utils/fileHelper"
import Loader from "./components/Loader"
import useIpcRenderer from "./hooks/useIpcRenderer"
// require node.js modules
const {join, basename, extname, dirname} = window.require("path")
const {remote, ipcRenderer} = window.require("electron")
const Store = window.require("electron-store")
const settingsStore = new Store({name: 'Settings'})
const fileStore = new Store({"name": "Files Data"})

const getAutoSync = () => {
  return ['accessKey', 'secretKey', 'bucketName', 'enableAutoSync'].every(key => !!settingsStore.get(key))
}

const saveFilesToStore = (files) => {
  // we do not have to store any info in file system,eg:isNew body, etc
  const fileStoreObj = objToArr(files).reduce((result, file) => {
    const {id, path, title, createdAt, isSynced, updateAt} = file
    result[id] = {
      id,
      path,
      title,
      createdAt,
      isSynced,
      updateAt
    }
    return result
  }, {})
  fileStore.set("files", fileStoreObj)
}

function App() {
  const [files, setFiles] = useState(fileStore.get("files") || {})
  const [activeFileID, setActiveFileID] = useState("")
  const [openedFileIDs, setOpenedFileIDs] = useState([])
  const [unsavedFileIDs, setUnsavedFileIDs] = useState([])
  const [searchFiles, setSearchFiles] = useState([])
  const [isLoading, setLoading] = useState(false)
  const filesArr = objToArr(files)
  const savedLocation = settingsStore.get('savedFileLocation') || remote.app.getPath("documents")
  console.log("userData", remote.app.getPath("userData"), savedLocation, remote.app.getPath("documents"))
  // const activeFile = files.find(file => file.id === activeFileID)
  const activeFile = files[activeFileID]
  // const opendFiles = openedFileIDs.map(openID => {
  //   return files.find(file => file.id === openID)
  // })
  const opendFiles = openedFileIDs.map(openID => {
    return files[openID]
  })
  // const fileListArr = searchFiles.length > 0 ? searchFiles : files
  const fileListArr = searchFiles.length > 0 ? searchFiles : filesArr

  const fileSearch = value => {
    // const newFiles = files.filter(file => file.title.includes(value))
    const newFiles = filesArr.filter(file => file.title.includes(value))
    setSearchFiles(newFiles)
  }
  const fileClick = (fileID) => {
    //set current active file
    setActiveFileID(fileID)
    const currentFile = files[fileID]
    const {id, title, path, isLoaded} = currentFile
    if (!isLoaded) {
      if (getAutoSync()) {
        ipcRenderer.send("download-file", {
          key: `${title}.md`,
          path, id
        })
      } else {
        fileHelper.readFile(currentFile.path).then((value) => {
          const newFile = {
            ...files[fileID],
            body: value,
            isLoaded: true,
          }
          setFiles({
            ...files,
            [fileID]: newFile
          })
        })
      }
    }
    console.log("openedFileIDs", openedFileIDs)
    // add new fileID to openedFiles
    if (!openedFileIDs.includes(fileID)) {
      setOpenedFileIDs([
        ...openedFileIDs,
        fileID
      ])
    }
  }
  const deleteFile = (fileID) => {
    // const newFiles = files.filter(file => file.id !== fileID)
    // setFiles(newFiles)
    const {[fileID]: value, ...afterDelete} = files
    if (files[fileID].isNew) {
      setFiles(afterDelete)
    } else {
      fileHelper.deleteFile(files[fileID].path).then(() => {
        setFiles(afterDelete)
        closeTab(fileID)
        saveFilesToStore(files)
      })
    }
  }
  const updateFileName = (fileID, title, isNew) => {
    // const newFiles = files.map(file => {
    //   if (file.id === fileID) {
    //     file.title = title
    //     file.isNew = false
    //   }
    //   return file
    // })
    // setFiles(newFiles)

    const newPath = isNew ? join(savedLocation, `${title}.md`) : join(dirname(files[fileID].path), `${title}.md`)
    const modifiedFile = {...files[fileID], title, isNew: false, path: newPath}
    const newFiles = {
      ...files, [fileID]: modifiedFile
    }
    if (isNew) { // 新增的
      fileHelper.writeFile(newPath, files[fileID].body).then(() => {
        setFiles(newFiles)
        saveFilesToStore(newFiles)
      })
    } else { // 更新的
      const oldPath = files[fileID].path
      fileHelper.renameFile(oldPath, newPath).then(() => {
        setFiles(newFiles)
        saveFilesToStore(newFiles)
      })
    }
  }
  const tabClick = (fileID) => {
    setActiveFileID(fileID)
  }
  const closeTab = (fileID) => {
    const tasWithout = openedFileIDs.filter(id => id !== fileID)
    setOpenedFileIDs(tasWithout)
    if (tasWithout.length > 0) {
      if (fileID === activeFileID) setActiveFileID(tasWithout[tasWithout.length - 1])
    } else {
      setActiveFileID("")
    }
  }
  const fileChange = (id, value) => {
    // const newFiles = files.map(file => {
    //   if (file.id === id) file.body = value
    //   return file
    // })
    // setFiles(newFiles)

    if (files[id].body !== value) {
      const newFile = {...files[id], body: value}
      setFiles({...files, [id]: newFile})
      if (!unsavedFileIDs.includes(id)) {
        setUnsavedFileIDs([
          ...unsavedFileIDs,
          id
        ])
      }
    }
  }
  const createNewFile = () => {
    const newID = uuidv4()
    // const newFiles = [
    //   ...files,
    //   {
    //     id: newID,
    //     title: "",
    //     boty: "## 请输入 Markdown",
    //     createdAt: +new Date(),
    //     isNew: true,
    //   }
    // ]
    // setFiles(newFiles)
    const newFile = {
      id: newID,
      title: "",
      body: "## 请输入 Markdown",
      createdAt: +new Date(),
      isNew: true,
    }
    setFiles({...files, [newID]: newFile})
  }
  const saveCurrentFile = () => {
    const {path, body, title} = activeFile
    fileHelper.writeFile(path, body).then(() => {
      setUnsavedFileIDs(unsavedFileIDs.filter(id => id !== activeFile.id))
      if (getAutoSync()) {
        ipcRenderer.send("upload-file", {
          key: `${title}.md`,
          path
        })
      }
    })
  }
  const importFiles = () => {
    remote.dialog.showOpenDialog({
      title: "选择导入的 Markdown 文件",
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Markdown Files",
          extensions: ["md"]
        }
      ]
    }, (paths) => {
      // ["/Users/dongrudong/Documents/first post.md", "/Users/dongrudong/Documents/hell1.md"]
      console.log(paths)
      if (Array.isArray(paths)) {
        // 过滤掉已经有的文件
        const fileterdPaths = paths.filter(path => {
          const alreadyAdded = Object.values(files).find(file => {
            return file.path === path
          })
          return !alreadyAdded
        })
        //扩展数组 [{id:xxx,path:xxx}]
        const importFilesArr = fileterdPaths.map(path => {
          return {
            id: uuidv4(),
            title: basename(path, extname(path)),
            path,
            createdAt: +new Date(),
          }
        })
        // 获取flatterArr结构的数组
        const newFiles = {
          ...files,
          ...flattenArr(importFilesArr)
        }
        setFiles(newFiles)
        saveFilesToStore(newFiles)
        if (importFilesArr.length > 0) {
          remote.dialog.showMessageBox({
            type: "info",
            title: `成功导入了${importFilesArr.length}个文件`,
            message: `成功导入了${importFilesArr.length}个文件`,
          })
        }
      }
    })
  }
  const activeFileUploaded = () => {
    console.log("activeFileUploaded")
    const {id} = activeFile
    const modifiedFile = {
      ...files[id],
      isSynced: true,
      updateAt: +new Date()
    }
    const newFiles = {
      ...files,
      [id]: modifiedFile
    }
    setFiles(newFiles)
    saveFilesToStore(newFiles)
  }
  const activeFileDownload = (event, msg) => {
    console.log("event", msg)
    const currentFile = files[msg.id]
    const {id, path} = currentFile
    fileHelper.readFile(path).then((value) => {
      const newFile = {
        ...files[id],
        body: value,
        isLoaded: true,
      }
      setFiles({
        ...files,
        [id]: newFile
      })
    })
  }
  const loadingStatus = (event, msg) => {
    console.log(msg)
    setLoading(msg)
  }
  useIpcRenderer({
    "create-new-file": createNewFile,
    'import-file': importFiles,
    "save-edit-file": saveCurrentFile,
    "active-file-uploaded": activeFileUploaded,
    "file-downloaded": activeFileDownload,
    "loading-status": loadingStatus
  })

  return (
    <div className="container-fluid px-0">
      <div className="row no-gutters">
        <div className="col-3 left-panel">
          <FileSearch
            title="我的云文档"
            onFileSearch={fileSearch}
          />
          <FileList
            files={fileListArr}
            onFileClick={fileClick}
            onFileDelete={deleteFile}
            onSaveEdit={updateFileName}
          />
          <div className="row no-gutters button-group">
            <div className="col text-center">
              <BottomBtn
                text="新建"
                icon={faPlus}
                colorClass="btn-primary"
                onBtnClick={createNewFile}
              />
            </div>
            <div className="col text-center">
              <BottomBtn
                text="导入"
                icon={faFileImport}
                colorClass="btn-success"
                onBtnClick={importFiles}
              />
            </div>
          </div>
        </div>
        <div className="col-9 right-panel">
          {
            !activeFile &&
            <div className="start-page">
              选择或者创建新的 Markdown 文档
            </div>
          }
          {
            activeFile &&
            <>
              <TabList
                files={opendFiles}
                activeId={activeFileID}
                unsaveIds={unsavedFileIDs}
                onTabClick={tabClick}
                onCloseTab={closeTab}
              />
              <SimpleMDE
                key={activeFile && activeFile.id}
                value={activeFile && activeFile['body']}
                onChange={(value) => {
                  fileChange(activeFileID, value)
                }}
              />
              {
                activeFile.isSynced &&
                <span className="sync-status">
                    已同步，上次同步{timestampToString(activeFile.updateAt)}
                  </span>
              }
            </>
          }
          {
            isLoading && <Loader/>
          }

        </div>
      </div>
    </div>
  )
}

export default App;
